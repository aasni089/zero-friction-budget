const { z } = require('zod');
const logger = require('../config/logger');
const prisma = require('../config/database'); // Use shared singleton instance

// ============================================================================
// DEFAULT CATEGORIES
// ============================================================================

const DEFAULT_CATEGORIES = [
  { name: 'Groceries', icon: '🛒', color: '#10b981' },
  { name: 'Utilities', icon: '⚡', color: '#f59e0b' },
  { name: 'Entertainment', icon: '🎬', color: '#8b5cf6' },
  { name: 'Transportation', icon: '🚗', color: '#3b82f6' },
  { name: 'Healthcare', icon: '🏥', color: '#ef4444' },
  { name: 'Housing', icon: '🏠', color: '#6366f1' },
  { name: 'Dining', icon: '🍽️', color: '#ec4899' },
  { name: 'Other', icon: '📦', color: '#6b7280' },
];

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createCategorySchema = z.object({
  householdId: z.string().cuid('Invalid household ID'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  icon: z.string().max(10).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional().nullable(),
  parentId: z.string().cuid().optional().nullable(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  icon: z.string().max(10).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional().nullable(),
  parentId: z.string().cuid().optional().nullable(),
});

const seedCategoriesSchema = z.object({
  householdId: z.string().cuid('Invalid household ID'),
});

// ============================================================================
// CONTROLLERS
// ============================================================================

/**
 * @route   GET /categories
 * @desc    List categories for a household
 * @access  Private (household members)
 */
exports.listCategories = async (req, res) => {
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

    // Get categories with counts
    const categories = await prisma.category.findMany({
      where: { householdId },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
        _count: {
          select: {
            expenses: true,
            budgets: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Format response with usage counts
    const formattedCategories = categories.map((category) => ({
      id: category.id,
      householdId: category.householdId,
      name: category.name,
      icon: category.icon,
      color: category.color,
      parentId: category.parentId,
      parent: category.parent,
      children: category.children,
      expenseCount: category._count.expenses,
      budgetCount: category._count.budgets,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    }));

    res.json({
      success: true,
      data: {
        categories: formattedCategories,
        total: formattedCategories.length,
      },
    });
  } catch (error) {
    logger.error('Error listing categories:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to list categories',
      },
    });
  }
};

/**
 * @route   POST /categories
 * @desc    Create category
 * @access  Private (OWNER/ADMIN only)
 */
exports.createCategory = async (req, res) => {
  try {
    const validatedData = createCategorySchema.parse(req.body);
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

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. You are not a member of this household.',
        },
      });
    }

    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. Admin or Owner role required.',
        },
      });
    }

    // If parentId is provided, verify it exists and belongs to the same household
    if (validatedData.parentId) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: validatedData.parentId },
      });

      if (!parentCategory) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Parent category not found',
          },
        });
      }

      if (parentCategory.householdId !== validatedData.householdId) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Parent category must belong to the same household',
          },
        });
      }
    }

    // Create category
    const category = await prisma.category.create({
      data: {
        name: validatedData.name,
        icon: validatedData.icon || null,
        color: validatedData.color || null,
        householdId: validatedData.householdId,
        parentId: validatedData.parentId || null,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
      },
    });

    logger.info(`Category created: ${category.id} in household ${validatedData.householdId}`);

    res.status(201).json({
      success: true,
      data: category,
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

    logger.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to create category',
      },
    });
  }
};

/**
 * @route   PATCH /categories/:id
 * @desc    Update category
 * @access  Private (OWNER/ADMIN only)
 */
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateCategorySchema.parse(req.body);
    const userId = req.user.id;

    // Get category
    const category = await prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Category not found',
        },
      });
    }

    // Verify user is OWNER or ADMIN of the household
    const membership = await prisma.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId: category.householdId,
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

    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. Admin or Owner role required.',
        },
      });
    }

    // If parentId is provided, verify it exists and belongs to the same household
    if (validatedData.parentId !== undefined) {
      if (validatedData.parentId === id) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'A category cannot be its own parent',
          },
        });
      }

      if (validatedData.parentId) {
        const parentCategory = await prisma.category.findUnique({
          where: { id: validatedData.parentId },
        });

        if (!parentCategory) {
          return res.status(404).json({
            success: false,
            error: {
              message: 'Parent category not found',
            },
          });
        }

        if (parentCategory.householdId !== category.householdId) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Parent category must belong to the same household',
            },
          });
        }
      }
    }

    // Prepare update data
    const updateData = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.icon !== undefined) updateData.icon = validatedData.icon;
    if (validatedData.color !== undefined) updateData.color = validatedData.color;
    if (validatedData.parentId !== undefined) updateData.parentId = validatedData.parentId;

    // Update category
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
          },
        },
        _count: {
          select: {
            expenses: true,
            budgets: true,
          },
        },
      },
    });

    logger.info(`Category updated: ${id}`);

    res.json({
      success: true,
      data: updatedCategory,
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

    logger.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update category',
      },
    });
  }
};

/**
 * @route   DELETE /categories/:id
 * @desc    Delete category
 * @access  Private (OWNER/ADMIN only)
 */
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { force } = req.query; // force=true will set budgets/expenses to null
    const userId = req.user.id;

    // Get category with counts
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            expenses: true,
            budgets: true,
            children: true,
          },
        },
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Category not found',
        },
      });
    }

    // Verify user is OWNER or ADMIN of the household
    const membership = await prisma.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId: category.householdId,
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

    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. Admin or Owner role required.',
        },
      });
    }

    // Check if category has children
    if (category._count.children > 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Cannot delete category with ${category._count.children} child categories. Delete or reassign child categories first.`,
          details: {
            childrenCount: category._count.children,
          },
        },
      });
    }

    // Check if category is being used
    const hasUsage = category._count.expenses > 0 || category._count.budgets > 0;

    if (hasUsage && force !== 'true') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Category is being used by expenses or budgets. Use force=true to delete anyway (will set references to null).',
          details: {
            expenseCount: category._count.expenses,
            budgetCount: category._count.budgets,
          },
        },
      });
    }

    // Delete category (cascade will handle setting references to null)
    await prisma.category.delete({
      where: { id },
    });

    logger.info(`Category deleted: ${id} (force=${force})`);

    res.json({
      success: true,
      data: {
        message: 'Category deleted successfully',
        affectedExpenses: category._count.expenses,
        affectedBudgets: category._count.budgets,
      },
    });
  } catch (error) {
    logger.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete category',
      },
    });
  }
};

/**
 * @route   GET /categories/default
 * @desc    Get default category templates
 * @access  Private (authenticated users)
 */
exports.getDefaultCategories = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        categories: DEFAULT_CATEGORIES,
        count: DEFAULT_CATEGORIES.length,
      },
    });
  } catch (error) {
    logger.error('Error getting default categories:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get default categories',
      },
    });
  }
};

/**
 * @route   GET /categories/:id/analytics
 * @desc    Get spending analytics for a category
 * @access  Private (household members)
 */
exports.getCategoryAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    // Get category
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        household: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Category not found',
        },
      });
    }

    // Verify user is a member of the household
    const membership = await prisma.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId: category.householdId,
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

    // Parse date range (default to last 6 months)
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(end.getMonth() - 6));

    // Get all expenses for this category within date range
    const expenses = await prisma.expense.findMany({
      where: {
        categoryId: id,
        householdId: category.householdId,
        date: {
          gte: start,
          lte: end,
        },
        type: 'EXPENSE', // Only count expenses, not income
      },
      orderBy: {
        date: 'asc',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Calculate totals
    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const expenseCount = expenses.length;

    // Group by month for monthly breakdown
    const monthlyBreakdown = {};
    expenses.forEach((expense) => {
      const monthKey = `${expense.date.getFullYear()}-${String(expense.date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyBreakdown[monthKey]) {
        monthlyBreakdown[monthKey] = {
          month: monthKey,
          total: 0,
          count: 0,
          expenses: [],
        };
      }

      monthlyBreakdown[monthKey].total += expense.amount;
      monthlyBreakdown[monthKey].count += 1;
      monthlyBreakdown[monthKey].expenses.push({
        id: expense.id,
        amount: expense.amount,
        description: expense.description,
        date: expense.date,
        user: expense.user,
      });
    });

    // Convert to array and sort by month
    const monthlyData = Object.values(monthlyBreakdown).sort((a, b) =>
      a.month.localeCompare(b.month)
    );

    // Calculate averages
    const monthsWithData = monthlyData.filter(m => m.count > 0).length;
    const averagePerMonth = monthsWithData > 0 ? totalSpent / monthsWithData : 0;
    const averagePerExpense = expenseCount > 0 ? totalSpent / expenseCount : 0;

    // Get top spenders
    const userTotals = {};
    expenses.forEach((expense) => {
      if (!userTotals[expense.userId]) {
        userTotals[expense.userId] = {
          userId: expense.userId,
          userName: expense.user.name || 'Unknown',
          total: 0,
          count: 0,
        };
      }
      userTotals[expense.userId].total += expense.amount;
      userTotals[expense.userId].count += 1;
    });

    const topSpenders = Object.values(userTotals)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Calculate trend (compare first half vs second half of period)
    const midpoint = new Date((start.getTime() + end.getTime()) / 2);
    const firstHalfExpenses = expenses.filter(e => e.date < midpoint);
    const secondHalfExpenses = expenses.filter(e => e.date >= midpoint);

    const firstHalfTotal = firstHalfExpenses.reduce((sum, e) => sum + e.amount, 0);
    const secondHalfTotal = secondHalfExpenses.reduce((sum, e) => sum + e.amount, 0);

    let trend = 'stable';
    if (firstHalfTotal > 0) {
      const percentChange = ((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100;
      if (percentChange > 10) trend = 'increasing';
      else if (percentChange < -10) trend = 'decreasing';
    }

    logger.info(`Category analytics retrieved: ${id}`);

    res.json({
      success: true,
      data: {
        category: {
          id: category.id,
          name: category.name,
          icon: category.icon,
          color: category.color,
          household: category.household,
        },
        period: {
          startDate: start,
          endDate: end,
        },
        summary: {
          totalSpent,
          expenseCount,
          averagePerMonth: Math.round(averagePerMonth * 100) / 100,
          averagePerExpense: Math.round(averagePerExpense * 100) / 100,
          trend,
        },
        monthlyBreakdown: monthlyData,
        topSpenders,
      },
    });
  } catch (error) {
    logger.error('Error getting category analytics:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get category analytics',
      },
    });
  }
};

/**
 * @route   POST /categories/seed
 * @desc    Seed default categories for a household
 * @access  Private (OWNER/ADMIN only)
 */
exports.seedCategories = async (req, res) => {
  try {
    const validatedData = seedCategoriesSchema.parse(req.body);
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

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. You are not a member of this household.',
        },
      });
    }

    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. Admin or Owner role required.',
        },
      });
    }

    // Check if categories already exist
    const existingCategories = await prisma.category.findMany({
      where: {
        householdId: validatedData.householdId,
      },
    });

    if (existingCategories.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Household already has ${existingCategories.length} categories. Cannot seed default categories.`,
          details: {
            existingCount: existingCategories.length,
          },
        },
      });
    }

    // Create all default categories in a transaction
    const categories = await prisma.$transaction(
      DEFAULT_CATEGORIES.map((defaultCategory) =>
        prisma.category.create({
          data: {
            name: defaultCategory.name,
            icon: defaultCategory.icon,
            color: defaultCategory.color,
            householdId: validatedData.householdId,
          },
        })
      )
    );

    logger.info(`Seeded ${categories.length} default categories for household ${validatedData.householdId}`);

    res.status(201).json({
      success: true,
      data: {
        categories,
        count: categories.length,
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

    logger.error('Error seeding categories:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to seed categories',
      },
    });
  }
};
