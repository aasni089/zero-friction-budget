const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');
const logger = require('../config/logger');
const { broadcastBudgetUpdated } = require('../services/realtime');

const prisma = new PrismaClient();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createBudgetSchema = z.object({
  householdId: z.string().cuid('Invalid household ID'),
  name: z.string().min(1, 'Budget name is required').max(100),
  amount: z.number().positive('Amount must be positive'),
  period: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM']),
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()).optional().nullable(),
  categoryId: z.string().cuid().optional().nullable(),
});

const updateBudgetSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  amount: z.number().positive().optional(),
  period: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM']).optional(),
  startDate: z.string().datetime().or(z.date()).optional(),
  endDate: z.string().datetime().or(z.date()).optional().nullable(),
  categoryId: z.string().cuid().optional().nullable(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate end date based on period if not provided
 */
function calculateEndDate(startDate, period) {
  const start = new Date(startDate);
  const end = new Date(start);

  switch (period) {
    case 'WEEKLY':
      end.setDate(start.getDate() + 7);
      break;
    case 'BIWEEKLY':
      end.setDate(start.getDate() + 14);
      break;
    case 'MONTHLY':
      end.setMonth(start.getMonth() + 1);
      break;
    case 'QUARTERLY':
      end.setMonth(start.getMonth() + 3);
      break;
    case 'YEARLY':
      end.setFullYear(start.getFullYear() + 1);
      break;
    default:
      // For CUSTOM, end date must be provided
      return null;
  }

  return end;
}

/**
 * Calculate budget progress (spent amount)
 */
async function calculateBudgetProgress(budgetId) {
  const budget = await prisma.budget.findUnique({
    where: { id: budgetId },
    include: {
      expenses: {
        where: {
          type: 'EXPENSE',
        },
      },
    },
  });

  if (!budget) {
    return null;
  }

  const totalSpent = budget.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const remaining = budget.amount - totalSpent;
  const percentage = (totalSpent / budget.amount) * 100;

  let status = 'on_track';
  if (percentage >= 90) {
    status = 'over_budget';
  } else if (percentage >= 70) {
    status = 'warning';
  }

  return {
    totalSpent,
    remaining,
    percentage: Math.round(percentage * 100) / 100,
    status,
  };
}

// ============================================================================
// CONTROLLERS
// ============================================================================

/**
 * @route   POST /budgets
 * @desc    Create budget
 * @access  Private (OWNER or ADMIN of household)
 */
exports.createBudget = async (req, res) => {
  try {
    const validatedData = createBudgetSchema.parse(req.body);
    const userId = req.user.id;

    // Verify user is OWNER or ADMIN of the household
    const membership = await prisma.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId: validatedData.householdId,
          userId,
        },
      },
    });

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. Owner or Admin role required to create budgets.',
        },
      });
    }

    // Calculate end date if not provided and period is not CUSTOM
    let endDate = validatedData.endDate;
    if (!endDate && validatedData.period !== 'CUSTOM') {
      endDate = calculateEndDate(validatedData.startDate, validatedData.period);
    } else if (!endDate && validatedData.period === 'CUSTOM') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'End date is required for CUSTOM period budgets.',
        },
      });
    }

    // Create budget
    const budget = await prisma.budget.create({
      data: {
        name: validatedData.name,
        amount: validatedData.amount,
        period: validatedData.period,
        startDate: new Date(validatedData.startDate),
        endDate: endDate ? new Date(endDate) : null,
        householdId: validatedData.householdId,
        categoryId: validatedData.categoryId || null,
      },
      include: {
        category: true,
        household: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    logger.info(`Budget created: ${budget.id} by user ${userId}`);

    // Broadcast real-time event
    await broadcastBudgetUpdated(budget.householdId, budget, 'created');

    res.status(201).json({
      success: true,
      data: budget,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: error.errors,
        },
      });
    }

    logger.error('Error creating budget:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to create budget',
      },
    });
  }
};

/**
 * @route   GET /budgets
 * @desc    List household budgets with progress
 * @access  Private (household members)
 */
exports.listBudgets = async (req, res) => {
  try {
    const userId = req.user.id;
    const { householdId, period } = req.query;

    // Build where clause
    const where = {};

    if (householdId) {
      // Verify user is a member of this household
      const membership = await prisma.householdMember.findUnique({
        where: {
          householdId_userId: {
            householdId,
            userId,
          },
        },
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied. You are not a member of this household.',
          },
        });
      }

      where.householdId = householdId;
    } else {
      // Get all households the user is a member of
      const memberships = await prisma.householdMember.findMany({
        where: { userId },
        select: { householdId: true },
      });

      where.householdId = {
        in: memberships.map(m => m.householdId),
      };
    }

    if (period) {
      where.period = period;
    }

    // Get budgets
    const budgets = await prisma.budget.findMany({
      where,
      include: {
        category: true,
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                icon: true,
                color: true,
              },
            },
          },
        },
        household: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            expenses: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    // Calculate progress for each budget
    const budgetsWithProgress = await Promise.all(
      budgets.map(async (budget) => {
        const progress = await calculateBudgetProgress(budget.id);
        return {
          ...budget,
          progress,
        };
      })
    );

    res.json({
      success: true,
      data: budgetsWithProgress,
    });
  } catch (error) {
    logger.error('Error listing budgets:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to list budgets',
      },
    });
  }
};

/**
 * @route   GET /budgets/:id
 * @desc    Get budget details with progress
 * @access  Private (household members)
 */
exports.getBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const budget = await prisma.budget.findUnique({
      where: { id },
      include: {
        category: true,
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                icon: true,
                color: true,
              },
            },
          },
        },
        household: {
          select: {
            id: true,
            name: true,
          },
        },
        expenses: {
          where: {
            type: 'EXPENSE',
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
            category: true,
          },
          orderBy: {
            date: 'desc',
          },
        },
      },
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Budget not found',
        },
      });
    }

    // Verify user is a member of the household
    const membership = await prisma.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId: budget.householdId,
          userId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. You are not a member of this household.',
        },
      });
    }

    // Calculate progress
    const progress = await calculateBudgetProgress(budget.id);

    res.json({
      success: true,
      data: {
        ...budget,
        progress,
      },
    });
  } catch (error) {
    logger.error('Error getting budget:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get budget details',
      },
    });
  }
};

/**
 * @route   PATCH /budgets/:id
 * @desc    Update budget
 * @access  Private (OWNER or ADMIN)
 */
exports.updateBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateBudgetSchema.parse(req.body);
    const userId = req.user.id;

    // Get budget and verify access
    const budget = await prisma.budget.findUnique({
      where: { id },
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Budget not found',
        },
      });
    }

    // Verify user is OWNER or ADMIN
    const membership = await prisma.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId: budget.householdId,
          userId,
        },
      },
    });

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. Owner or Admin role required.',
        },
      });
    }

    // Prepare update data
    const updateData = {};
    if (validatedData.name) updateData.name = validatedData.name;
    if (validatedData.amount) updateData.amount = validatedData.amount;
    if (validatedData.period) updateData.period = validatedData.period;
    if (validatedData.startDate) updateData.startDate = new Date(validatedData.startDate);
    if (validatedData.endDate !== undefined) {
      updateData.endDate = validatedData.endDate ? new Date(validatedData.endDate) : null;
    }
    if (validatedData.categoryId !== undefined) {
      updateData.categoryId = validatedData.categoryId;
    }

    // Handle categories array (line items) if provided
    if (req.body.categories !== undefined) {
      // Delete all existing budget categories
      await prisma.budgetCategory.deleteMany({
        where: { budgetId: id },
      });

      // Create new budget categories if any provided
      if (Array.isArray(req.body.categories) && req.body.categories.length > 0) {
        await prisma.budgetCategory.createMany({
          data: req.body.categories.map(cat => ({
            budgetId: id,
            categoryId: cat.categoryId,
            allocatedAmount: cat.allocatedAmount,
          })),
        });
      }
    }

    // Update budget
    const updatedBudget = await prisma.budget.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                icon: true,
                color: true,
              },
            },
          },
        },
        household: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    logger.info(`Budget updated: ${id} by user ${userId}`);

    // Broadcast real-time event
    await broadcastBudgetUpdated(updatedBudget.householdId, updatedBudget, 'updated');

    res.json({
      success: true,
      data: updatedBudget,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          details: error.errors,
        },
      });
    }

    logger.error('Error updating budget:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update budget',
      },
    });
  }
};

/**
 * @route   DELETE /budgets/:id
 * @desc    Delete budget (unlinks expenses)
 * @access  Private (OWNER or ADMIN)
 */
exports.deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get budget and verify access
    const budget = await prisma.budget.findUnique({
      where: { id },
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Budget not found',
        },
      });
    }

    // Verify user is OWNER or ADMIN
    const membership = await prisma.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId: budget.householdId,
          userId,
        },
      },
    });

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. Owner or Admin role required.',
        },
      });
    }

    // Store householdId before deletion for real-time broadcast
    const householdId = budget.householdId;

    // Unlink expenses (set budgetId to null) - handled by Prisma onDelete: SetNull
    // Delete budget
    await prisma.budget.delete({
      where: { id },
    });

    logger.info(`Budget deleted: ${id} by user ${userId}`);

    // Broadcast real-time event
    await broadcastBudgetUpdated(householdId, { id }, 'deleted');

    res.json({
      success: true,
      data: {
        message: 'Budget deleted successfully',
      },
    });
  } catch (error) {
    logger.error('Error deleting budget:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete budget',
      },
    });
  }
};

/**
 * @route   GET /budgets/:id/progress
 * @desc    Get budget usage/progress with category breakdown
 * @access  Private (household members)
 */
exports.getBudgetProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const budget = await prisma.budget.findUnique({
      where: { id },
      include: {
        expenses: {
          where: {
            type: 'EXPENSE',
          },
          include: {
            category: true,
          },
        },
        category: true,
      },
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Budget not found',
        },
      });
    }

    // Verify user is a member of the household
    const membership = await prisma.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId: budget.householdId,
          userId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. You are not a member of this household.',
        },
      });
    }

    // Calculate progress
    const progress = await calculateBudgetProgress(budget.id);

    // Group by category
    const categoryBreakdown = {};
    budget.expenses.forEach((expense) => {
      const categoryName = expense.category?.name || 'Uncategorized';
      if (!categoryBreakdown[categoryName]) {
        categoryBreakdown[categoryName] = {
          total: 0,
          count: 0,
          percentage: 0,
        };
      }
      categoryBreakdown[categoryName].total += expense.amount;
      categoryBreakdown[categoryName].count += 1;
    });

    // Calculate percentages
    Object.keys(categoryBreakdown).forEach((category) => {
      categoryBreakdown[category].percentage =
        Math.round((categoryBreakdown[category].total / progress.totalSpent) * 10000) / 100;
    });

    // Calculate daily spending trend
    const now = new Date();
    const startDate = new Date(budget.startDate);
    const endDate = budget.endDate ? new Date(budget.endDate) : now;
    const daysElapsed = Math.max(1, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)));
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const dailyBudget = budget.amount / totalDays;
    const dailySpent = progress.totalSpent / daysElapsed;
    const projectedTotal = dailySpent * totalDays;

    res.json({
      success: true,
      data: {
        budget: {
          id: budget.id,
          name: budget.name,
          amount: budget.amount,
          period: budget.period,
          startDate: budget.startDate,
          endDate: budget.endDate,
        },
        progress,
        categoryBreakdown,
        trend: {
          daysElapsed,
          totalDays,
          dailyBudget: Math.round(dailyBudget * 100) / 100,
          dailySpent: Math.round(dailySpent * 100) / 100,
          projectedTotal: Math.round(projectedTotal * 100) / 100,
        },
      },
    });
  } catch (error) {
    logger.error('Error getting budget progress:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get budget progress',
      },
    });
  }
};

/**
 * @route   POST /budgets/:id/rollover
 * @desc    Create new budget for next period (copy settings)
 * @access  Private (OWNER or ADMIN)
 */
exports.rolloverBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get budget and verify access
    const budget = await prisma.budget.findUnique({
      where: { id },
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Budget not found',
        },
      });
    }

    // Verify user is OWNER or ADMIN
    const membership = await prisma.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId: budget.householdId,
          userId,
        },
      },
    });

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. Owner or Admin role required.',
        },
      });
    }

    // Calculate new dates
    const newStartDate = budget.endDate ? new Date(budget.endDate) : new Date();
    const newEndDate = calculateEndDate(newStartDate, budget.period);

    // Create new budget
    const newBudget = await prisma.budget.create({
      data: {
        name: budget.name,
        amount: budget.amount,
        period: budget.period,
        startDate: newStartDate,
        endDate: newEndDate,
        householdId: budget.householdId,
        categoryId: budget.categoryId,
      },
      include: {
        category: true,
        household: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    logger.info(`Budget rolled over: ${id} -> ${newBudget.id} by user ${userId}`);

    res.status(201).json({
      success: true,
      data: newBudget,
    });
  } catch (error) {
    logger.error('Error rolling over budget:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to rollover budget',
      },
    });
  }
};
