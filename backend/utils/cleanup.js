// utils/cleanup.js
const prisma = require('../config/database');

/**
 * Remove expired revoked tokens from the database
 */
exports.cleanupRevokedTokens = async () => {
  try {
    const result = await prisma.revokedToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });
    
    console.log(`Cleaned up ${result.count} expired revoked tokens`);
    return result.count;
  } catch (error) {
    console.error('Error cleaning up revoked tokens:', error);
    throw error;
  }
};