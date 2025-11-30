const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');

const prisma = new PrismaClient();

/**
 * Middleware to check if user is a member of the household
 * Attaches household and membership to req.household and req.membership
 */
exports.requireHouseholdMember = async (req, res, next) => {
  try {
    const householdId = req.params.id;
    const userId = req.user.id;

    if (!householdId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Household ID is required',
        },
      });
    }

    // Get household with user's membership
    const household = await prisma.household.findUnique({
      where: { id: householdId },
      include: {
        members: {
          where: {
            userId,
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

    const membership = household.members[0];

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. You are not a member of this household.',
        },
      });
    }

    // Attach household and membership to request
    req.household = household;
    req.membership = membership;

    next();
  } catch (error) {
    logger.error('Error in requireHouseholdMember middleware:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to verify household membership',
      },
    });
  }
};

/**
 * Middleware to check if user is OWNER or ADMIN of the household
 * Requires requireHouseholdMember to be called first
 */
exports.requireAdmin = (req, res, next) => {
  const role = req.membership?.role;

  if (!role || (role !== 'OWNER' && role !== 'ADMIN')) {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Access denied. Admin or Owner role required.',
      },
    });
  }

  next();
};

/**
 * Middleware to check if user is OWNER of the household
 * Requires requireHouseholdMember to be called first
 */
exports.requireOwner = (req, res, next) => {
  const role = req.membership?.role;

  if (!role || role !== 'OWNER') {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Access denied. Owner role required.',
      },
    });
  }

  next();
};

/**
 * Middleware to check if user can modify an expense
 * User must be the creator OR an OWNER/ADMIN of the household
 */
exports.canModifyExpense = async (req, res, next) => {
  try {
    const expenseId = req.params.id;
    const userId = req.user.id;

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        household: {
          include: {
            members: {
              where: {
                userId,
              },
            },
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

    const membership = expense.household.members[0];

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. You are not a member of this household.',
        },
      });
    }

    // User can modify if they're the creator OR if they're OWNER/ADMIN
    const isCreator = expense.userId === userId;
    const isAdmin = membership.role === 'OWNER' || membership.role === 'ADMIN';

    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. You can only modify your own expenses unless you are an admin.',
        },
      });
    }

    req.expense = expense;
    req.membership = membership;

    next();
  } catch (error) {
    logger.error('Error in canModifyExpense middleware:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to verify expense permissions',
      },
    });
  }
};

/**
 * Middleware to verify user has access to a household via query parameter
 * Used for list endpoints that filter by householdId
 */
exports.verifyHouseholdAccess = async (req, res, next) => {
  try {
    const householdId = req.query.householdId;
    const userId = req.user.id;

    if (!householdId) {
      // If no householdId is provided, we'll let the controller handle it
      // (e.g., list all households the user is a member of)
      return next();
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

    req.membership = membership;
    next();
  } catch (error) {
    logger.error('Error in verifyHouseholdAccess middleware:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to verify household access',
      },
    });
  }
};
