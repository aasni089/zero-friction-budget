const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');
const logger = require('../config/logger');
const { sendEmail } = require('../utils/email');
const crypto = require('crypto');

const prisma = new PrismaClient();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createHouseholdSchema = z.object({
  name: z.string().min(1, 'Household name is required').max(100),
});

const updateHouseholdSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email('Valid email is required'),
  role: z.enum(['MEMBER', 'ADMIN']).default('MEMBER'),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
});

const joinHouseholdSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Seed default categories for a household
 */
async function seedDefaultCategories(householdId) {
  const defaultCategories = [
    { name: 'Groceries', icon: '🛒', color: '#10b981' },
    { name: 'Utilities', icon: '⚡', color: '#f59e0b' },
    { name: 'Entertainment', icon: '🎬', color: '#8b5cf6' },
    { name: 'Transportation', icon: '🚗', color: '#3b82f6' },
    { name: 'Healthcare', icon: '🏥', color: '#ef4444' },
    { name: 'Housing', icon: '🏠', color: '#6366f1' },
    { name: 'Dining', icon: '🍽️', color: '#ec4899' },
    { name: 'Other', icon: '📦', color: '#6b7280' },
  ];

  await prisma.category.createMany({
    data: defaultCategories.map(cat => ({
      ...cat,
      householdId,
    })),
  });
}

/**
 * Generate invitation token
 */
function generateInvitationToken() {
  return crypto.randomBytes(32).toString('hex');
}

// ============================================================================
// CONTROLLERS
// ============================================================================

/**
 * @route   POST /households
 * @desc    Create new household
 * @access  Private (authenticated users)
 */
exports.createHousehold = async (req, res) => {
  try {
    // Validate input
    const validatedData = createHouseholdSchema.parse(req.body);
    const userId = req.user.id;

    // Create household with owner as member
    const household = await prisma.household.create({
      data: {
        name: validatedData.name,
        ownerId: userId,
        members: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
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

    // Seed default categories
    await seedDefaultCategories(household.id);

    logger.info(`Household created: ${household.id} by user ${userId}`);

    res.status(201).json({
      success: true,
      data: household,
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

    logger.error('Error creating household:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to create household',
      },
    });
  }
};

/**
 * @route   GET /households
 * @desc    List user's households
 * @access  Private
 */
exports.listHouseholds = async (req, res) => {
  try {
    const userId = req.user.id;

    const households = await prisma.household.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
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
        _count: {
          select: {
            members: true,
            budgets: true,
            expenses: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Add user's role to each household
    const householdsWithRole = households.map(household => {
      const membership = household.members.find(m => m.userId === userId);
      return {
        ...household,
        userRole: membership?.role,
      };
    });

    res.json({
      success: true,
      data: householdsWithRole,
    });
  } catch (error) {
    logger.error('Error listing households:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to list households',
      },
    });
  }
};

/**
 * @route   GET /households/:id
 * @desc    Get household details
 * @access  Private (household members only)
 */
exports.getHousehold = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const household = await prisma.household.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
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
          orderBy: {
            joinedAt: 'asc',
          },
        },
        _count: {
          select: {
            budgets: true,
            expenses: true,
            categories: true,
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

    // Check if user is a member
    const isMember = household.members.some(m => m.userId === userId);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied. You are not a member of this household.',
        },
      });
    }

    // Add user's role
    const membership = household.members.find(m => m.userId === userId);
    const householdWithRole = {
      ...household,
      userRole: membership?.role,
    };

    res.json({
      success: true,
      data: householdWithRole,
    });
  } catch (error) {
    logger.error('Error getting household:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get household details',
      },
    });
  }
};

/**
 * @route   PATCH /households/:id
 * @desc    Update household settings
 * @access  Private (OWNER or ADMIN)
 */
exports.updateHousehold = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateHouseholdSchema.parse(req.body);

    // Authorization check is handled by middleware
    // Update household
    const household = await prisma.household.update({
      where: { id },
      data: validatedData,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
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

    logger.info(`Household updated: ${id} by user ${req.user.id}`);

    res.json({
      success: true,
      data: household,
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

    logger.error('Error updating household:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update household',
      },
    });
  }
};

/**
 * @route   DELETE /households/:id
 * @desc    Delete household (cascade deletes members, budgets, expenses, categories)
 * @access  Private (OWNER only)
 */
exports.deleteHousehold = async (req, res) => {
  try {
    const { id } = req.params;

    // Authorization check (OWNER) is handled by middleware
    // Delete household (cascade will handle related records)
    await prisma.household.delete({
      where: { id },
    });

    logger.info(`Household deleted: ${id} by user ${req.user.id}`);

    res.json({
      success: true,
      data: {
        message: 'Household deleted successfully',
      },
    });
  } catch (error) {
    logger.error('Error deleting household:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete household',
      },
    });
  }
};

/**
 * @route   POST /households/:id/invite
 * @desc    Invite member via email
 * @access  Private (OWNER or ADMIN)
 */
exports.inviteMember = async (req, res) => {
  try {
    const { id: householdId } = req.params;
    const validatedData = inviteMemberSchema.parse(req.body);

    // Get household details
    const household = await prisma.household.findUnique({
      where: { id: householdId },
      include: {
        owner: true,
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

    // Check if user is already a member
    const existingMember = await prisma.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId,
          userId: await getUserIdByEmail(validatedData.email),
        },
      },
    });

    if (existingMember) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'User is already a member of this household',
        },
      });
    }

    // Generate invitation token and store in database
    const token = generateInvitationToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    // Create invitation record
    await prisma.invitation.create({
      data: {
        token,
        householdId,
        email: validatedData.email,
        role: validatedData.role,
        expiresAt,
      },
    });

    const inviteLink = `${process.env.FRONTEND_URL}/households/join?token=${token}`;

    // Send invitation email
    await sendEmail({
      to: validatedData.email,
      subject: `You've been invited to join ${household.name}`,
      html: `
        <h2>Household Invitation</h2>
        <p>You've been invited to join <strong>${household.name}</strong> by ${req.user.name || req.user.email}.</p>
        <p>Click the link below to accept the invitation:</p>
        <a href="${inviteLink}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">
          Accept Invitation
        </a>
        <p style="margin-top: 20px; color: #666;">Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${inviteLink}</p>
      `,
    });

    logger.info(`Invitation sent for household ${householdId} to ${validatedData.email}`);

    res.json({
      success: true,
      data: {
        message: 'Invitation sent successfully',
        email: validatedData.email,
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

    logger.error('Error inviting member:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to send invitation',
      },
    });
  }
};

/**
 * Helper to get user ID by email (create user if doesn't exist)
 */
async function getUserIdByEmail(email) {
  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    // Create placeholder user (they'll complete signup when they accept invitation)
    user = await prisma.user.create({
      data: {
        email,
        emailVerified: null,
      },
    });
  }

  return user.id;
}

/**
 * @route   POST /households/:id/join
 * @desc    Accept invitation and join household
 * @access  Private
 */
exports.joinHousehold = async (req, res) => {
  try {
    const { id: householdId } = req.params;
    const validatedData = joinHouseholdSchema.parse(req.body);
    const { token } = validatedData;
    const userId = req.user.id;

    // Validate invitation token
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        household: true,
      },
    });

    if (!invitation) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid invitation token',
        },
      });
    }

    // Check if token has expired
    if (invitation.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invitation token has expired',
        },
      });
    }

    // Check if token has already been used
    if (invitation.usedAt) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invitation token has already been used',
        },
      });
    }

    // Verify household ID matches
    if (invitation.householdId !== householdId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid invitation token for this household',
        },
      });
    }

    // Validate email matches (if user has email)
    if (req.user.email && invitation.email !== req.user.email) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Email does not match invitation',
        },
      });
    }

    // Check if user is already a member
    const existingMember = await prisma.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId,
          userId,
        },
      },
    });

    if (existingMember) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'You are already a member of this household',
        },
      });
    }

    // Create household member and mark invitation as used
    const member = await prisma.householdMember.create({
      data: {
        householdId,
        userId,
        role: invitation.role,
      },
      include: {
        household: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Mark invitation as used
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        usedAt: new Date(),
      },
    });

    logger.info(`User ${userId} joined household ${householdId} via invitation ${invitation.id}`);

    res.json({
      success: true,
      data: member,
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

    logger.error('Error joining household:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to join household',
      },
    });
  }
};

/**
 * @route   DELETE /households/:id/members/:userId
 * @desc    Remove member from household
 * @access  Private (OWNER or ADMIN, cannot remove self or OWNER)
 */
exports.removeMember = async (req, res) => {
  try {
    const { id: householdId, userId: targetUserId } = req.params;
    const currentUserId = req.user.id;

    // Get household and target member
    const household = await prisma.household.findUnique({
      where: { id: householdId },
    });

    const targetMember = await prisma.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId,
          userId: targetUserId,
        },
      },
    });

    if (!targetMember) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Member not found',
        },
      });
    }

    // Cannot remove OWNER
    if (targetMember.role === 'OWNER') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Cannot remove the household owner',
        },
      });
    }

    // Cannot remove self (use leave endpoint instead)
    if (targetUserId === currentUserId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Use the leave endpoint to remove yourself',
        },
      });
    }

    // Delete member
    await prisma.householdMember.delete({
      where: {
        householdId_userId: {
          householdId,
          userId: targetUserId,
        },
      },
    });

    logger.info(`User ${targetUserId} removed from household ${householdId} by ${currentUserId}`);

    res.json({
      success: true,
      data: {
        message: 'Member removed successfully',
      },
    });
  } catch (error) {
    logger.error('Error removing member:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to remove member',
      },
    });
  }
};

/**
 * @route   PATCH /households/:id/members/:userId/role
 * @desc    Update member role
 * @access  Private (OWNER only, cannot change OWNER role)
 */
exports.updateMemberRole = async (req, res) => {
  try {
    const { id: householdId, userId: targetUserId } = req.params;
    const validatedData = updateMemberRoleSchema.parse(req.body);

    // Get target member
    const targetMember = await prisma.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId,
          userId: targetUserId,
        },
      },
    });

    if (!targetMember) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Member not found',
        },
      });
    }

    // Cannot change OWNER role
    if (targetMember.role === 'OWNER') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Cannot change the owner role',
        },
      });
    }

    // Update role
    const updatedMember = await prisma.householdMember.update({
      where: {
        householdId_userId: {
          householdId,
          userId: targetUserId,
        },
      },
      data: {
        role: validatedData.role,
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
      },
    });

    logger.info(`Member ${targetUserId} role updated to ${validatedData.role} in household ${householdId}`);

    res.json({
      success: true,
      data: updatedMember,
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

    logger.error('Error updating member role:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update member role',
      },
    });
  }
};

/**
 * @route   POST /households/:id/leave
 * @desc    Leave household
 * @access  Private (OWNER cannot leave without deleting or transferring ownership)
 */
exports.leaveHousehold = async (req, res) => {
  try {
    const { id: householdId } = req.params;
    const userId = req.user.id;

    // Get member
    const member = await prisma.householdMember.findUnique({
      where: {
        householdId_userId: {
          householdId,
          userId,
        },
      },
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'You are not a member of this household',
        },
      });
    }

    // OWNER cannot leave
    if (member.role === 'OWNER') {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Owner cannot leave the household. Delete the household or transfer ownership first.',
        },
      });
    }

    // Delete member
    await prisma.householdMember.delete({
      where: {
        householdId_userId: {
          householdId,
          userId,
        },
      },
    });

    logger.info(`User ${userId} left household ${householdId}`);

    res.json({
      success: true,
      data: {
        message: 'Successfully left household',
      },
    });
  } catch (error) {
    logger.error('Error leaving household:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to leave household',
      },
    });
  }
};
