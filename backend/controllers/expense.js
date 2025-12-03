const { z } = require('zod');
const logger = require('../config/logger');
const {
  broadcastExpenseCreated,
  broadcastExpenseUpdated,
  broadcastExpenseDeleted,
} = require('../services/realtime');
const prisma = require('../config/database'); // Use shared singleton instance

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createExpenseSchema = z.object({
  householdId: z.string().cuid('Invalid household ID'),
  amount: z.number().positive('Amount must be positive'),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).default('EXPENSE'),
  description: z.string().min(1).max(500).optional().nullable(),
  date: z.string().datetime().or(z.date()).optional(),
  budgetId: z.string().cuid().optional().nullable(),
  categoryId: z.string().cuid().optional().nullable(),
  isRecurring: z.boolean().default(false),
  recurringId: z.string().cuid().optional().nullable(),
  attachments: z.array(z.string().url()).default([]),
  tags: z.array(z.string()).default([]),
});

const updateExpenseSchema = z.object({
  amount: z.number().positive().optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).optional(),
  description: z.string().min(1).max(500).optional().nullable(),
  date: z.string().datetime().or(z.date()).optional(),
  budgetId: z.string().cuid().optional().nullable(),
  categoryId: z.string().cuid().optional().nullable(),
  isRecurring: z.boolean().optional(),
  recurringId: z.string().cuid().optional().nullable(),
  attachments: z.array(z.string().url()).optional(),
  tags: z.array(z.string()).optional(),
});

const bulkCreateExpenseSchema = z.object({
  expenses: z.array(createExpenseSchema).min(1).max(100),
});

// ============================================================================
// CONTROLLERS
// ============================================================================

/**
 * @route   POST /expenses
 * @desc    Create expense
 * @access  Private (household members)
 */
exports.createExpense = async (req, res) => {
  try {
    const validatedData = createExpenseSchema.parse(req.body);
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

    // Create expense
    const expense = await prisma.expense.create({
      data: {
        amount: validatedData.amount,
        type: validatedData.type,
        description: validatedData.description || null,
        date: validatedData.date ? new Date(validatedData.date) : new Date(),
        userId,
        householdId: validatedData.householdId,
        budgetId: validatedData.budgetId || null,
        categoryId: validatedData.categoryId || null,
        isRecurring: validatedData.isRecurring,
        recurringId: validatedData.recurringId || null,
        attachments: validatedData.attachments,
        tags: validatedData.tags,
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
        budget: {
          select: {
            id: true,
            name: true,
            amount: true,
          },
        },
      },
    });

    logger.info(`Expense created: ${expense.id} by user ${userId}`);

    // Broadcast real-time event
    await broadcastExpenseCreated(expense.householdId, expense);

    res.status(201).json({
      success: true,
      data: expense,
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

    logger.error('Error creating expense:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to create expense',
      },
    });
  }
};

/**
 * @route   GET /expenses
 * @desc    List expenses with filters
 * @access  Private (household members)
 */
exports.listExpenses = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      householdId,
      budgetId,
      categoryId,
      type,
      startDate,
      endDate,
      minAmount,
      maxAmount,
      tags,
      limit = '50',
      offset = '0',
    } = req.query;

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
        in: memberships.map((m) => m.householdId),
      };
    }

    // Apply filters
    if (budgetId) where.budgetId = budgetId;
    if (categoryId) where.categoryId = categoryId;
    if (type) where.type = type;

    // Date range filter
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    // Amount range filter
    if (minAmount || maxAmount) {
      where.amount = {};
      if (minAmount) where.amount.gte = parseFloat(minAmount);
      if (maxAmount) where.amount.lte = parseFloat(maxAmount);
    }

    // Tags filter (array contains)
    if (tags) {
      const tagArray = tags.split(',').map((t) => t.trim());
      where.tags = {
        hasSome: tagArray,
      };
    }

    // Get expenses with pagination
    const expenses = await prisma.expense.findMany({
      where,
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
        budget: {
          select: {
            id: true,
            name: true,
            amount: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    // Get total count for pagination
    const total = await prisma.expense.count({ where });

    res.json({
      success: true,
      data: {
        expenses,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: parseInt(offset) + expenses.length < total,
        },
      },
    });
  } catch (error) {
    logger.error('Error listing expenses:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to list expenses',
      },
    });
  }
};

/**
 * @route   GET /expenses/:id
 * @desc    Get expense by ID
 * @access  Private (household members)
 */
exports.getExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const expense = await prisma.expense.findUnique({
      where: { id },
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
        budget: {
          select: {
            id: true,
            name: true,
            amount: true,
            period: true,
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

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Expense not found',
        },
      });
    }

    // Verify user is a member of the household
    const membership = await prisma.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId: expense.householdId,
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
      data: expense,
    });
  } catch (error) {
    logger.error('Error getting expense:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get expense details',
      },
    });
  }
};

/**
 * @route   PATCH /expenses/:id
 * @desc    Update expense
 * @access  Private (creator OR OWNER/ADMIN)
 */
exports.updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateExpenseSchema.parse(req.body);

    // The canModifyExpense middleware has already verified permissions
    // and attached req.expense and req.membership
    const expense = req.expense;

    // Prepare update data
    const updateData = {};
    if (validatedData.amount !== undefined) updateData.amount = validatedData.amount;
    if (validatedData.type !== undefined) updateData.type = validatedData.type;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.date !== undefined) updateData.date = new Date(validatedData.date);
    if (validatedData.budgetId !== undefined) updateData.budgetId = validatedData.budgetId;
    if (validatedData.categoryId !== undefined) updateData.categoryId = validatedData.categoryId;
    if (validatedData.isRecurring !== undefined) updateData.isRecurring = validatedData.isRecurring;
    if (validatedData.recurringId !== undefined) updateData.recurringId = validatedData.recurringId;
    if (validatedData.attachments !== undefined) updateData.attachments = validatedData.attachments;
    if (validatedData.tags !== undefined) updateData.tags = validatedData.tags;

    // Update expense
    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: updateData,
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
        budget: {
          select: {
            id: true,
            name: true,
            amount: true,
          },
        },
      },
    });

    logger.info(`Expense updated: ${id} by user ${req.user.id}`);

    // Broadcast real-time event
    await broadcastExpenseUpdated(updatedExpense.householdId, updatedExpense);

    res.json({
      success: true,
      data: updatedExpense,
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

    logger.error('Error updating expense:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update expense',
      },
    });
  }
};

/**
 * @route   DELETE /expenses/:id
 * @desc    Delete expense
 * @access  Private (creator OR OWNER/ADMIN)
 */
exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    // The canModifyExpense middleware has already verified permissions
    const expense = req.expense;

    // Delete expense
    await prisma.expense.delete({
      where: { id },
    });

    logger.info(`Expense deleted: ${id} by user ${req.user.id}`);

    // Broadcast real-time event
    await broadcastExpenseDeleted(expense.householdId, id);

    res.json({
      success: true,
      data: {
        message: 'Expense deleted successfully',
      },
    });
  } catch (error) {
    logger.error('Error deleting expense:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete expense',
      },
    });
  }
};

/**
 * @route   POST /expenses/bulk
 * @desc    Bulk create expenses
 * @access  Private (household members)
 */
exports.bulkCreateExpenses = async (req, res) => {
  try {
    const validatedData = bulkCreateExpenseSchema.parse(req.body);
    const userId = req.user.id;

    // Verify user has access to all households
    const householdIds = [...new Set(validatedData.expenses.map((e) => e.householdId))];

    for (const householdId of householdIds) {
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
            message: `Access denied. You are not a member of household ${householdId}.`,
          },
        });
      }
    }

    // Create expenses in a transaction
    const expenses = await prisma.$transaction(
      validatedData.expenses.map((expenseData) =>
        prisma.expense.create({
          data: {
            amount: expenseData.amount,
            type: expenseData.type,
            description: expenseData.description || null,
            date: expenseData.date ? new Date(expenseData.date) : new Date(),
            userId,
            householdId: expenseData.householdId,
            budgetId: expenseData.budgetId || null,
            categoryId: expenseData.categoryId || null,
            isRecurring: expenseData.isRecurring,
            recurringId: expenseData.recurringId || null,
            attachments: expenseData.attachments,
            tags: expenseData.tags,
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
            budget: {
              select: {
                id: true,
                name: true,
                amount: true,
              },
            },
          },
        })
      )
    );

    logger.info(`Bulk created ${expenses.length} expenses by user ${userId}`);

    // Broadcast real-time events for each created expense
    for (const expense of expenses) {
      await broadcastExpenseCreated(expense.householdId, expense);
    }

    res.status(201).json({
      success: true,
      data: {
        expenses,
        count: expenses.length,
      },
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

    logger.error('Error bulk creating expenses:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to bulk create expenses',
      },
    });
  }
};

/**
 * @route   GET /expenses/summary
 * @desc    Get expense summary with aggregations
 * @access  Private (household members)
 */
exports.getExpenseSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      householdId,
      startDate,
      endDate,
      groupBy = 'category', // category, type, month, budget
    } = req.query;

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
        in: memberships.map((m) => m.householdId),
      };
    }

    // Date range filter
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    // Get all expenses for aggregation
    const expenses = await prisma.expense.findMany({
      where,
      include: {
        category: true,
        budget: true,
      },
    });

    // Calculate totals
    const totalIncome = expenses
      .filter((e) => e.type === 'INCOME')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalExpenses = expenses
      .filter((e) => e.type === 'EXPENSE')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalTransfers = expenses
      .filter((e) => e.type === 'TRANSFER')
      .reduce((sum, e) => sum + e.amount, 0);

    const netAmount = totalIncome - totalExpenses;

    // Group by category/type/month/budget
    let groupedData = {};

    if (groupBy === 'category') {
      expenses.forEach((expense) => {
        const key = expense.category?.name || 'Uncategorized';
        if (!groupedData[key]) {
          groupedData[key] = {
            total: 0,
            count: 0,
            categoryId: expense.categoryId,
          };
        }
        groupedData[key].total += expense.amount;
        groupedData[key].count += 1;
      });
    } else if (groupBy === 'type') {
      expenses.forEach((expense) => {
        const key = expense.type;
        if (!groupedData[key]) {
          groupedData[key] = {
            total: 0,
            count: 0,
          };
        }
        groupedData[key].total += expense.amount;
        groupedData[key].count += 1;
      });
    } else if (groupBy === 'month') {
      expenses.forEach((expense) => {
        const date = new Date(expense.date);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!groupedData[key]) {
          groupedData[key] = {
            total: 0,
            count: 0,
            income: 0,
            expenses: 0,
          };
        }
        groupedData[key].total += expense.amount;
        groupedData[key].count += 1;
        if (expense.type === 'INCOME') groupedData[key].income += expense.amount;
        if (expense.type === 'EXPENSE') groupedData[key].expenses += expense.amount;
      });
    } else if (groupBy === 'budget') {
      expenses.forEach((expense) => {
        const key = expense.budget?.name || 'No Budget';
        if (!groupedData[key]) {
          groupedData[key] = {
            total: 0,
            count: 0,
            budgetId: expense.budgetId,
            budgetAmount: expense.budget?.amount || 0,
          };
        }
        groupedData[key].total += expense.amount;
        groupedData[key].count += 1;
      });
    }

    res.json({
      success: true,
      data: {
        summary: {
          totalIncome,
          totalExpenses,
          totalTransfers,
          netAmount,
          transactionCount: expenses.length,
        },
        groupedBy: groupBy,
        groups: groupedData,
      },
    });
  } catch (error) {
    logger.error('Error getting expense summary:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get expense summary',
      },
    });
  }
};
