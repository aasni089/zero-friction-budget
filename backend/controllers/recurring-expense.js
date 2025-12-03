const { z } = require('zod');
const logger = require('../config/logger');
const prisma = require('../config/database');

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createRecurringExpenseSchema = z.object({
  householdId: z.string().cuid('Invalid household ID'),
  amount: z.number().positive('Amount must be positive'),
  frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
  description: z.string().max(255).optional().nullable(),
  categoryId: z.string().cuid().optional().nullable(),
  dayOfWeek: z.number().int().min(0).max(6).optional().nullable(), // 0=Sunday, 6=Saturday
  dayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
  monthOfYear: z.number().int().min(1).max(12).optional().nullable(),
  startDate: z.string().datetime('Invalid start date'),
  endDate: z.string().datetime('Invalid end date').optional().nullable(),
}).refine((data) => {
  // WEEKLY and BIWEEKLY require dayOfWeek
  if ((data.frequency === 'WEEKLY' || data.frequency === 'BIWEEKLY') && data.dayOfWeek === null && data.dayOfWeek === undefined) {
    return false;
  }
  // MONTHLY requires dayOfMonth
  if (data.frequency === 'MONTHLY' && (data.dayOfMonth === null || data.dayOfMonth === undefined)) {
    return false;
  }
  // YEARLY requires both dayOfMonth and monthOfYear
  if (data.frequency === 'YEARLY' && (data.dayOfMonth === null || data.dayOfMonth === undefined || data.monthOfYear === null || data.monthOfYear === undefined)) {
    return false;
  }
  return true;
}, {
  message: 'Missing required day specification for frequency type',
});

const updateRecurringExpenseSchema = z.object({
  amount: z.number().positive().optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
  description: z.string().max(255).optional().nullable(),
  categoryId: z.string().cuid().optional().nullable(),
  dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
  dayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
  monthOfYear: z.number().int().min(1).max(12).optional().nullable(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate the next run date based on frequency
 */
function calculateNextRun(currentDate, frequency, dayOfWeek, dayOfMonth, monthOfYear) {
  const next = new Date(currentDate);

  switch (frequency) {
    case 'DAILY':
      next.setDate(next.getDate() + 1);
      break;

    case 'WEEKLY':
      // Find next occurrence of dayOfWeek
      const daysUntilTarget = (dayOfWeek - next.getDay() + 7) % 7;
      next.setDate(next.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));
      break;

    case 'BIWEEKLY':
      // Add 14 days from current date
      next.setDate(next.getDate() + 14);
      break;

    case 'MONTHLY':
      // Move to next month, same day (with fallback for invalid dates)
      next.setMonth(next.getMonth() + 1);
      next.setDate(Math.min(dayOfMonth, getDaysInMonth(next.getFullYear(), next.getMonth())));
      break;

    case 'QUARTERLY':
      // Add 3 months
      next.setMonth(next.getMonth() + 3);
      break;

    case 'YEARLY':
      // Move to next year, same month and day
      next.setFullYear(next.getFullYear() + 1);
      next.setMonth(monthOfYear - 1); // monthOfYear is 1-indexed
      next.setDate(Math.min(dayOfMonth, getDaysInMonth(next.getFullYear(), monthOfYear - 1)));
      break;

    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }

  return next;
}

/**
 * Get number of days in a month (handles leap years)
 */
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Calculate initial nextRun based on startDate and frequency settings
 */
function calculateInitialNextRun(startDate, frequency, dayOfWeek, dayOfMonth, monthOfYear) {
  const start = new Date(startDate);
  const now = new Date();

  // If start date is in the future, that's the next run
  if (start > now) {
    return start;
  }

  // If start date is in the past, calculate the next run from now
  let nextRun = new Date(now);

  switch (frequency) {
    case 'DAILY':
      // Next occurrence is tomorrow
      nextRun.setDate(nextRun.getDate() + 1);
      break;

    case 'WEEKLY':
      // Find next occurrence of dayOfWeek
      const daysUntilTarget = (dayOfWeek - nextRun.getDay() + 7) % 7;
      nextRun.setDate(nextRun.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));
      break;

    case 'BIWEEKLY':
      // Calculate 14-day intervals from startDate
      const daysSinceStart = Math.floor((now - start) / (1000 * 60 * 60 * 24));
      const intervals = Math.floor(daysSinceStart / 14);
      nextRun = new Date(start);
      nextRun.setDate(nextRun.getDate() + (intervals + 1) * 14);
      break;

    case 'MONTHLY':
      // Find next occurrence of dayOfMonth
      nextRun.setDate(Math.min(dayOfMonth, getDaysInMonth(nextRun.getFullYear(), nextRun.getMonth())));
      if (nextRun <= now) {
        nextRun.setMonth(nextRun.getMonth() + 1);
        nextRun.setDate(Math.min(dayOfMonth, getDaysInMonth(nextRun.getFullYear(), nextRun.getMonth())));
      }
      break;

    case 'QUARTERLY':
      // Calculate 3-month intervals from startDate
      const monthsSinceStart = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      const quarters = Math.floor(monthsSinceStart / 3);
      nextRun = new Date(start);
      nextRun.setMonth(start.getMonth() + (quarters + 1) * 3);
      break;

    case 'YEARLY':
      // Find next occurrence of monthOfYear and dayOfMonth
      nextRun.setMonth(monthOfYear - 1);
      nextRun.setDate(Math.min(dayOfMonth, getDaysInMonth(nextRun.getFullYear(), monthOfYear - 1)));
      if (nextRun <= now) {
        nextRun.setFullYear(nextRun.getFullYear() + 1);
        nextRun.setDate(Math.min(dayOfMonth, getDaysInMonth(nextRun.getFullYear(), monthOfYear - 1)));
      }
      break;

    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }

  return nextRun;
}

// ============================================================================
// CONTROLLERS
// ============================================================================

/**
 * @route   GET /recurring-expenses
 * @desc    List recurring expenses for a household
 * @access  Private (household members)
 */
exports.listRecurringExpenses = async (req, res) => {
  try {
    const userId = req.user.id;
    const { householdId } = req.query;

    if (!householdId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'householdId query parameter is required',
        },
      });
    }

    // Verify user is a member of the household
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

    // Get recurring expenses
    const recurringExpenses = await prisma.recurringExpense.findMany({
      where: { householdId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
        user: {
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
        nextRun: 'asc',
      },
    });

    res.json({
      success: true,
      data: {
        recurringExpenses,
        total: recurringExpenses.length,
      },
    });
  } catch (error) {
    logger.error('Error listing recurring expenses:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to list recurring expenses',
      },
    });
  }
};

/**
 * @route   GET /recurring-expenses/:id
 * @desc    Get recurring expense by ID
 * @access  Private (household members)
 */
exports.getRecurringExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const recurringExpense = await prisma.recurringExpense.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        expenses: {
          orderBy: {
            date: 'desc',
          },
          take: 10, // Last 10 generated expenses
          select: {
            id: true,
            amount: true,
            date: true,
            description: true,
          },
        },
      },
    });

    if (!recurringExpense) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Recurring expense not found',
        },
      });
    }

    // Verify user is a member of the household
    const membership = await prisma.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId: recurringExpense.householdId,
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

    res.json({
      success: true,
      data: recurringExpense,
    });
  } catch (error) {
    logger.error('Error getting recurring expense:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get recurring expense',
      },
    });
  }
};

/**
 * @route   POST /recurring-expenses
 * @desc    Create recurring expense
 * @access  Private (household members)
 */
exports.createRecurringExpense = async (req, res) => {
  try {
    const validatedData = createRecurringExpenseSchema.parse(req.body);
    const userId = req.user.id;

    // Verify user is a member of the household
    const membership = await prisma.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId: validatedData.householdId,
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

    // If categoryId is provided, verify it belongs to the household
    if (validatedData.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: validatedData.categoryId },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Category not found',
          },
        });
      }

      if (category.householdId !== validatedData.householdId) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Category must belong to the same household',
          },
        });
      }
    }

    // Calculate initial nextRun
    const nextRun = calculateInitialNextRun(
      validatedData.startDate,
      validatedData.frequency,
      validatedData.dayOfWeek,
      validatedData.dayOfMonth,
      validatedData.monthOfYear
    );

    // Create recurring expense
    const recurringExpense = await prisma.recurringExpense.create({
      data: {
        householdId: validatedData.householdId,
        userId,
        amount: validatedData.amount,
        frequency: validatedData.frequency,
        description: validatedData.description || null,
        categoryId: validatedData.categoryId || null,
        dayOfWeek: validatedData.dayOfWeek ?? null,
        dayOfMonth: validatedData.dayOfMonth ?? null,
        monthOfYear: validatedData.monthOfYear ?? null,
        startDate: new Date(validatedData.startDate),
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        nextRun,
        isActive: true,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    logger.info(`Recurring expense created: ${recurringExpense.id} for household ${validatedData.householdId}`);

    res.status(201).json({
      success: true,
      data: recurringExpense,
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

    logger.error('Error creating recurring expense:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to create recurring expense',
      },
    });
  }
};

/**
 * @route   PATCH /recurring-expenses/:id
 * @desc    Update recurring expense
 * @access  Private (household members - creator or admin/owner)
 */
exports.updateRecurringExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateRecurringExpenseSchema.parse(req.body);
    const userId = req.user.id;

    // Get recurring expense
    const recurringExpense = await prisma.recurringExpense.findUnique({
      where: { id },
    });

    if (!recurringExpense) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Recurring expense not found',
        },
      });
    }

    // Verify user is a member of the household
    const membership = await prisma.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId: recurringExpense.householdId,
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

    // Only creator, admin, or owner can update
    if (recurringExpense.userId !== userId && membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. You can only update your own recurring expenses, or be an admin/owner.',
        },
      });
    }

    // If categoryId is provided, verify it belongs to the household
    if (validatedData.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: validatedData.categoryId },
      });

      if (!category) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Category not found',
          },
        });
      }

      if (category.householdId !== recurringExpense.householdId) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Category must belong to the same household',
          },
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (validatedData.amount !== undefined) updateData.amount = validatedData.amount;
    if (validatedData.frequency !== undefined) updateData.frequency = validatedData.frequency;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.categoryId !== undefined) updateData.categoryId = validatedData.categoryId;
    if (validatedData.dayOfWeek !== undefined) updateData.dayOfWeek = validatedData.dayOfWeek;
    if (validatedData.dayOfMonth !== undefined) updateData.dayOfMonth = validatedData.dayOfMonth;
    if (validatedData.monthOfYear !== undefined) updateData.monthOfYear = validatedData.monthOfYear;
    if (validatedData.startDate !== undefined) updateData.startDate = new Date(validatedData.startDate);
    if (validatedData.endDate !== undefined) updateData.endDate = validatedData.endDate ? new Date(validatedData.endDate) : null;
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;

    // If frequency or day settings changed, recalculate nextRun
    if (validatedData.frequency || validatedData.dayOfWeek !== undefined || validatedData.dayOfMonth !== undefined || validatedData.monthOfYear !== undefined) {
      const frequency = validatedData.frequency || recurringExpense.frequency;
      const dayOfWeek = validatedData.dayOfWeek ?? recurringExpense.dayOfWeek;
      const dayOfMonth = validatedData.dayOfMonth ?? recurringExpense.dayOfMonth;
      const monthOfYear = validatedData.monthOfYear ?? recurringExpense.monthOfYear;
      const startDate = validatedData.startDate || recurringExpense.startDate;

      updateData.nextRun = calculateInitialNextRun(startDate, frequency, dayOfWeek, dayOfMonth, monthOfYear);
    }

    // Update recurring expense
    const updated = await prisma.recurringExpense.update({
      where: { id },
      data: updateData,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    logger.info(`Recurring expense updated: ${id}`);

    res.json({
      success: true,
      data: updated,
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

    logger.error('Error updating recurring expense:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update recurring expense',
      },
    });
  }
};

/**
 * @route   DELETE /recurring-expenses/:id
 * @desc    Delete recurring expense
 * @access  Private (creator or admin/owner)
 */
exports.deleteRecurringExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get recurring expense
    const recurringExpense = await prisma.recurringExpense.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            expenses: true,
          },
        },
      },
    });

    if (!recurringExpense) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Recurring expense not found',
        },
      });
    }

    // Verify user is a member of the household
    const membership = await prisma.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId: recurringExpense.householdId,
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

    // Only creator, admin, or owner can delete
    if (recurringExpense.userId !== userId && membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. You can only delete your own recurring expenses, or be an admin/owner.',
        },
      });
    }

    // Delete recurring expense (won't delete generated expenses due to onDelete: SetNull)
    await prisma.recurringExpense.delete({
      where: { id },
    });

    logger.info(`Recurring expense deleted: ${id}`);

    res.json({
      success: true,
      data: {
        message: 'Recurring expense deleted successfully',
        generatedExpensesCount: recurringExpense._count.expenses,
      },
    });
  } catch (error) {
    logger.error('Error deleting recurring expense:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete recurring expense',
      },
    });
  }
};

/**
 * @route   POST /recurring-expenses/:id/pause
 * @desc    Pause/resume recurring expense
 * @access  Private (creator or admin/owner)
 */
exports.toggleRecurringExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get recurring expense
    const recurringExpense = await prisma.recurringExpense.findUnique({
      where: { id },
    });

    if (!recurringExpense) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Recurring expense not found',
        },
      });
    }

    // Verify user is a member of the household
    const membership = await prisma.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId: recurringExpense.householdId,
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

    // Only creator, admin, or owner can pause/resume
    if (recurringExpense.userId !== userId && membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. You can only pause/resume your own recurring expenses, or be an admin/owner.',
        },
      });
    }

    // Toggle isActive
    const updated = await prisma.recurringExpense.update({
      where: { id },
      data: {
        isActive: !recurringExpense.isActive,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    logger.info(`Recurring expense ${updated.isActive ? 'resumed' : 'paused'}: ${id}`);

    res.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error('Error toggling recurring expense:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to toggle recurring expense',
      },
    });
  }
};

/**
 * @route   POST /recurring-expenses/generate
 * @desc    Generate expenses from recurring expenses (on-demand)
 * @access  Private (authenticated users - runs for all households they belong to)
 */
exports.generateRecurringExpenses = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    // Get all households user belongs to
    const memberships = await prisma.householdMember.findMany({
      where: { userId },
      select: { householdId: true },
    });

    const householdIds = memberships.map(m => m.householdId);

    // Get all active recurring expenses that are due
    const dueRecurringExpenses = await prisma.recurringExpense.findMany({
      where: {
        householdId: { in: householdIds },
        isActive: true,
        nextRun: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
      },
      include: {
        category: true,
      },
    });

    const generatedExpenses = [];
    const errors = [];

    // Process each recurring expense
    for (const recurring of dueRecurringExpenses) {
      try {
        // Create expense
        const expense = await prisma.expense.create({
          data: {
            userId: recurring.userId,
            householdId: recurring.householdId,
            categoryId: recurring.categoryId,
            amount: recurring.amount,
            description: recurring.description,
            date: recurring.nextRun,
            type: 'EXPENSE',
            isRecurring: true,
            recurringId: recurring.id,
          },
        });

        generatedExpenses.push(expense);

        // Calculate next run
        const nextRun = calculateNextRun(
          recurring.nextRun,
          recurring.frequency,
          recurring.dayOfWeek,
          recurring.dayOfMonth,
          recurring.monthOfYear
        );

        // Update recurring expense
        await prisma.recurringExpense.update({
          where: { id: recurring.id },
          data: {
            lastRun: recurring.nextRun,
            nextRun,
          },
        });

        logger.info(`Generated expense ${expense.id} from recurring expense ${recurring.id}`);
      } catch (error) {
        logger.error(`Failed to generate expense from recurring ${recurring.id}:`, error);
        errors.push({
          recurringExpenseId: recurring.id,
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      data: {
        generated: generatedExpenses.length,
        expenses: generatedExpenses,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    logger.error('Error generating recurring expenses:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to generate recurring expenses',
      },
    });
  }
};

module.exports = exports;
