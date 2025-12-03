const { z } = require('zod');
const logger = require('../config/logger');
const NodeCache = require('node-cache');
const prisma = require('../config/database'); // Use shared singleton instance

// Initialize cache with 5 minute TTL and check period of 60 seconds
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const monthlyQuerySchema = z.object({
  householdId: z.string().cuid('Invalid household ID'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format').optional(),
  budgetId: z.string().cuid('Invalid budget ID').optional(),
});

const budgetHealthQuerySchema = z.object({
  householdId: z.string().cuid('Invalid household ID'),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get start and end dates for a given month
 */
function getMonthRange(monthString) {
  let year, month;

  if (monthString) {
    [year, month] = monthString.split('-').map(Number);
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  return { startDate, endDate, year, month };
}

/**
 * Calculate daily breakdown for the month
 */
function calculateDailyBreakdown(expenses, startDate, endDate) {
  const dailyTotals = {};

  // Initialize all days in the month
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateKey = current.toISOString().split('T')[0];
    dailyTotals[dateKey] = 0;
    current.setDate(current.getDate() + 1);
  }

  // Add expenses to their respective days
  expenses.forEach(expense => {
    if (expense.type === 'EXPENSE') {
      const dateKey = new Date(expense.date).toISOString().split('T')[0];
      if (dailyTotals.hasOwnProperty(dateKey)) {
        dailyTotals[dateKey] += expense.amount;
      }
    }
  });

  // Convert to array format
  return Object.entries(dailyTotals).map(([date, total]) => ({
    date,
    total: Math.round(total * 100) / 100,
  }));
}

/**
 * Calculate week-over-week comparison
 */
function calculateWeekOverWeek(dailyBreakdown) {
  const weeks = [];
  let currentWeek = [];
  let weekTotal = 0;

  dailyBreakdown.forEach((day, index) => {
    currentWeek.push(day);
    weekTotal += day.total;

    // Every 7 days or last day, create a week summary
    if ((index + 1) % 7 === 0 || index === dailyBreakdown.length - 1) {
      weeks.push({
        weekNumber: weeks.length + 1,
        total: Math.round(weekTotal * 100) / 100,
        days: currentWeek.length,
      });
      currentWeek = [];
      weekTotal = 0;
    }
  });

  return weeks;
}

/**
 * Project end-of-month spending
 */
function projectEndOfMonth(totalSpent, daysElapsed, totalDaysInMonth) {
  if (daysElapsed === 0) return 0;
  const dailyAverage = totalSpent / daysElapsed;
  return Math.round(dailyAverage * totalDaysInMonth * 100) / 100;
}

// ============================================================================
// CONTROLLERS
// ============================================================================

/**
 * @route   GET /dashboard/monthly
 * @desc    Get monthly summary with trends, category breakdown, and member contributions
 * @access  Private (household members)
 */
exports.getMonthlySummary = async (req, res) => {
  try {
    const validatedData = monthlyQuerySchema.parse(req.query);
    const userId = req.user.id;
    const { householdId, month, budgetId } = validatedData;

    // Create cache key
    const cacheKey = `monthly:${householdId}:${month || 'current'}:${budgetId || 'primary'}`;

    // Check cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      logger.debug(`Cache hit for ${cacheKey}`);
      return res.json({
        success: true,
        data: cachedData,
      });
    }

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

    // Get month range
    const { startDate, endDate, year, month: monthNum } = getMonthRange(month);
    const now = new Date();
    const daysElapsed = Math.min(
      Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)),
      endDate.getDate()
    );
    const totalDaysInMonth = endDate.getDate();

    // Get all expenses for the month
    const expenses = await prisma.expense.findMany({
      where: {
        householdId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        category: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Determine which budget to use
    let selectedBudget = null;

    if (budgetId) {
      // Use the explicitly requested budget
      selectedBudget = await prisma.budget.findUnique({
        where: { id: budgetId },
        include: {
          categories: {
            include: {
              category: true
            }
          }
        }
      });

      // Verify budget belongs to this household
      if (selectedBudget && selectedBudget.householdId !== householdId) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied. Budget does not belong to this household.',
          },
        });
      }
    } else {
      // Get household to find primary budget
      const household = await prisma.household.findUnique({
        where: { id: householdId },
        select: { primaryBudgetId: true }
      });

      // Use primary budget if it exists
      if (household?.primaryBudgetId) {
        selectedBudget = await prisma.budget.findUnique({
          where: { id: household.primaryBudgetId },
          include: {
            categories: {
              include: {
                category: true
              }
            }
          }
        });
      }
    }

    // Filter expenses to only those assigned to selected budget (if a budget exists)
    const budgetExpenses = selectedBudget
      ? expenses.filter(e => e.budgetId === selectedBudget.id)
      : expenses; // If no budget, show all expenses

    // Calculate summary totals (only from primary budget expenses)
    const totalExpenses = budgetExpenses
      .filter(e => e.type === 'EXPENSE')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalIncome = budgetExpenses
      .filter(e => e.type === 'INCOME')
      .reduce((sum, e) => sum + e.amount, 0);

    const net = totalIncome - totalExpenses;

    const totalBudgetAmount = selectedBudget ? selectedBudget.amount : 0;
    const budgetRemaining = totalBudgetAmount - totalExpenses;
    const budgetUsagePercentage = totalBudgetAmount > 0
      ? Math.round((totalExpenses / totalBudgetAmount) * 10000) / 100
      : 0;

    // Category breakdown (only from primary budget expenses)
    const categoryMap = {};
    budgetExpenses
      .filter(e => e.type === 'EXPENSE')
      .forEach(expense => {
        const categoryName = expense.category?.name || 'Uncategorized';
        const categoryId = expense.category?.id || 'uncategorized';

        if (!categoryMap[categoryId]) {
          categoryMap[categoryId] = {
            id: categoryId,
            name: categoryName,
            total: 0,
            count: 0,
            percentage: 0,
            budgetAmount: null,
          };
        }

        categoryMap[categoryId].total += expense.amount;
        categoryMap[categoryId].count += 1;
      });

    // Add budget amounts to categories from selected budget's categories
    if (selectedBudget && selectedBudget.categories) {
      selectedBudget.categories.forEach(budgetCategory => {
        if (budgetCategory.categoryId && categoryMap[budgetCategory.categoryId]) {
          categoryMap[budgetCategory.categoryId].budgetAmount = budgetCategory.allocatedAmount;
        }
      });
    }

    // Calculate percentages
    Object.values(categoryMap).forEach(category => {
      category.percentage = totalExpenses > 0
        ? Math.round((category.total / totalExpenses) * 10000) / 100
        : 0;
      category.total = Math.round(category.total * 100) / 100;
    });

    // Get top 5 categories by spending
    const topCategories = Object.values(categoryMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Member contributions (only from primary budget expenses)
    const memberMap = {};
    budgetExpenses
      .filter(e => e.type === 'EXPENSE')
      .forEach(expense => {
        const userId = expense.user.id;

        if (!memberMap[userId]) {
          memberMap[userId] = {
            userId,
            name: expense.user.name,
            email: expense.user.email,
            total: 0,
            percentage: 0,
          };
        }

        memberMap[userId].total += expense.amount;
      });

    // Calculate member percentages
    Object.values(memberMap).forEach(member => {
      member.percentage = totalExpenses > 0
        ? Math.round((member.total / totalExpenses) * 10000) / 100
        : 0;
      member.total = Math.round(member.total * 100) / 100;
    });

    const memberContributions = Object.values(memberMap);

    // Spending trends (only from primary budget expenses)
    const dailyBreakdown = calculateDailyBreakdown(budgetExpenses, startDate, endDate);
    const weekOverWeek = calculateWeekOverWeek(dailyBreakdown);
    const projectedSpending = projectEndOfMonth(totalExpenses, daysElapsed, totalDaysInMonth);

    const responseData = {
      selectedBudget: selectedBudget ? {
        id: selectedBudget.id,
        name: selectedBudget.name,
        amount: selectedBudget.amount,
        period: selectedBudget.period,
      } : null,
      period: {
        month: monthNum,
        year,
        startDate,
        endDate,
        daysElapsed,
        totalDays: totalDaysInMonth,
      },
      summary: {
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalIncome: Math.round(totalIncome * 100) / 100,
        net: Math.round(net * 100) / 100,
        totalBudgetAmount: Math.round(totalBudgetAmount * 100) / 100,
        budgetSpent: Math.round(totalExpenses * 100) / 100,
        budgetRemaining: Math.round(budgetRemaining * 100) / 100,
        budgetUsagePercentage,
        totalTransactions: budgetExpenses.filter(e => e.type === 'EXPENSE').length,
      },
      categoryBreakdown: {
        all: Object.values(categoryMap),
        top5: topCategories,
      },
      memberContributions,
      trends: {
        dailyBreakdown,
        weekOverWeek,
        projectedSpending,
      },
    };

    // Cache the result
    cache.set(cacheKey, responseData);
    logger.debug(`Cached data for ${cacheKey}`);

    res.json({
      success: true,
      data: responseData,
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

    logger.error('Error getting monthly summary:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get monthly summary',
      },
    });
  }
};

/**
 * @route   GET /dashboard/household/:id
 * @desc    Get household overview with stats and recent activity
 * @access  Private (household members)
 */
exports.getHouseholdOverview = async (req, res) => {
  try {
    const householdId = req.params.id;
    const userId = req.user.id;

    // Create cache key
    const cacheKey = `household:${householdId}:overview`;

    // Check cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      logger.debug(`Cache hit for ${cacheKey}`);
      return res.json({
        success: true,
        data: cachedData,
      });
    }

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

    // Get household with members
    const household = await prisma.household.findUnique({
      where: { id: householdId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (!household) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Household not found',
        },
      });
    }

    // Get counts
    const [budgetCount, expenseCount, categoryCount] = await Promise.all([
      prisma.budget.count({ where: { householdId } }),
      prisma.expense.count({ where: { householdId } }),
      prisma.category.count({ where: { householdId } }),
    ]);

    // Get recent activity (last 10 expenses)
    const recentExpenses = await prisma.expense.findMany({
      where: { householdId },
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
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: 10,
    });

    // Get current month summary
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const currentMonthExpenses = await prisma.expense.findMany({
      where: {
        householdId,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    const currentMonthTotalExpenses = currentMonthExpenses
      .filter(e => e.type === 'EXPENSE')
      .reduce((sum, e) => sum + e.amount, 0);

    const currentMonthTotalIncome = currentMonthExpenses
      .filter(e => e.type === 'INCOME')
      .reduce((sum, e) => sum + e.amount, 0);

    const responseData = {
      household: {
        id: household.id,
        name: household.name,
        memberCount: household.members.length,
        members: household.members.map(m => ({
          userId: m.user.id,
          name: m.user.name,
          email: m.user.email,
          image: m.user.image,
          role: m.role,
        })),
      },
      stats: {
        totalBudgets: budgetCount,
        totalExpenses: expenseCount,
        totalCategories: categoryCount,
      },
      recentActivity: recentExpenses,
      currentMonthSummary: {
        totalExpenses: Math.round(currentMonthTotalExpenses * 100) / 100,
        totalIncome: Math.round(currentMonthTotalIncome * 100) / 100,
        net: Math.round((currentMonthTotalIncome - currentMonthTotalExpenses) * 100) / 100,
      },
    };

    // Cache the result
    cache.set(cacheKey, responseData);
    logger.debug(`Cached data for ${cacheKey}`);

    res.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    logger.error('Error getting household overview:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get household overview',
      },
    });
  }
};

/**
 * @route   GET /dashboard/budget-health
 * @desc    Get budget health indicators for all active budgets
 * @access  Private (household members)
 */
exports.getBudgetHealth = async (req, res) => {
  try {
    const validatedData = budgetHealthQuerySchema.parse(req.query);
    const userId = req.user.id;
    const { householdId } = validatedData;

    // Create cache key
    const cacheKey = `budget-health:${householdId}`;

    // Check cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      logger.debug(`Cache hit for ${cacheKey}`);
      return res.json({
        success: true,
        data: cachedData,
      });
    }

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

    // Get all active budgets (ongoing or future)
    const now = new Date();
    const budgets = await prisma.budget.findMany({
      where: {
        householdId,
        OR: [
          {
            endDate: {
              gte: now,
            },
          },
          {
            endDate: null,
          },
        ],
      },
      include: {
        category: true,
        expenses: {
          where: {
            type: 'EXPENSE',
          },
        },
      },
      orderBy: {
        startDate: 'asc',
      },
    });

    // Calculate health for each budget
    const budgetHealthData = budgets.map(budget => {
      const totalSpent = budget.expenses.reduce((sum, e) => sum + e.amount, 0);
      const percentage = (totalSpent / budget.amount) * 100;

      // Determine health status
      let healthStatus = 'ON_TRACK';
      if (percentage >= 100) {
        healthStatus = 'OVER_BUDGET';
      } else if (percentage >= 90) {
        healthStatus = 'OVER_BUDGET';
      } else if (percentage >= 70) {
        healthStatus = 'WARNING';
      }

      // Calculate days remaining
      const endDate = budget.endDate ? new Date(budget.endDate) : null;
      const daysRemaining = endDate
        ? Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)))
        : null;

      // Calculate projected spending
      const startDate = new Date(budget.startDate);
      const daysElapsed = Math.max(1, Math.ceil((now - startDate) / (1000 * 60 * 60 * 24)));
      const totalDays = endDate
        ? Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
        : null;

      const dailyAverage = totalSpent / daysElapsed;
      const projectedSpending = totalDays
        ? Math.round(dailyAverage * totalDays * 100) / 100
        : null;

      return {
        id: budget.id,
        name: budget.name,
        amount: budget.amount,
        period: budget.period,
        startDate: budget.startDate,
        endDate: budget.endDate,
        category: budget.category ? {
          id: budget.category.id,
          name: budget.category.name,
        } : null,
        spent: Math.round(totalSpent * 100) / 100,
        remaining: Math.round((budget.amount - totalSpent) * 100) / 100,
        percentage: Math.round(percentage * 100) / 100,
        healthStatus,
        daysRemaining,
        projectedSpending,
      };
    });

    // Group by health status
    const grouped = {
      ON_TRACK: budgetHealthData.filter(b => b.healthStatus === 'ON_TRACK'),
      WARNING: budgetHealthData.filter(b => b.healthStatus === 'WARNING'),
      OVER_BUDGET: budgetHealthData.filter(b => b.healthStatus === 'OVER_BUDGET'),
    };

    const responseData = {
      budgets: budgetHealthData,
      summary: {
        total: budgetHealthData.length,
        onTrack: grouped.ON_TRACK.length,
        warning: grouped.WARNING.length,
        overBudget: grouped.OVER_BUDGET.length,
      },
      grouped,
    };

    // Cache the result
    cache.set(cacheKey, responseData);
    logger.debug(`Cached data for ${cacheKey}`);

    res.json({
      success: true,
      data: responseData,
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

    logger.error('Error getting budget health:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get budget health data',
      },
    });
  }
};
