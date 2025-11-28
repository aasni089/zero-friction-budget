const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');
const logger = require('../config/logger');

const prisma = new PrismaClient();

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
