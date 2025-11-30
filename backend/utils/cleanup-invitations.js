const { PrismaClient } = require('@prisma/client');
const logger = require('../config/logger');

const prisma = new PrismaClient();

/**
 * Clean up expired and unused invitation tokens
 * Deletes invitations where:
 * - expiresAt is in the past
 * - usedAt is null (not yet used)
 */
async function cleanupExpiredInvitations() {
  try {
    const result = await prisma.invitation.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
        usedAt: null,
      },
    });

    if (result.count > 0) {
      logger.info(`Cleaned up ${result.count} expired invitation(s)`);
    }

    return result.count;
  } catch (error) {
    logger.error('Error cleaning up expired invitations:', error);
    throw error;
  }
}

module.exports = {
  cleanupExpiredInvitations,
};
