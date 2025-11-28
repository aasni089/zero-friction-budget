// services/user.js
const prisma = require('../config/database');
const bcrypt = require('bcrypt');
const { encrypt, decrypt } = require('../utils/encryption');
const { sendVerificationCode } = require('../utils/sms');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a new user
 */
exports.createUser = async (userData) => {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (existingUser) {
      // Update existing user
      return await prisma.user.update({
        where: { email: userData.email },
        data: {
          name: userData.name,
          phoneNumber: userData.phoneNumber,
          address: userData.address,
          city: userData.city,
          province: userData.province,
          postalCode: userData.postalCode
        }
      });
    }

    // Hash password if provided
    let hashedPassword = null;
    if (userData.password) {
      hashedPassword = await bcrypt.hash(userData.password, 10);
    }

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        phoneNumber: userData.phoneNumber,
        address: userData.address,
        city: userData.city,
        province: userData.province,
        postalCode: userData.postalCode
      }
    });

    return newUser;
  } catch (error) {
    console.error('Error creating user:', error);
    throw new Error('Failed to create user');
  }
};

/**
 * Find a user by email
 */
exports.findUserByEmail = async (email) => {
  try {
    return await prisma.user.findUnique({
      where: { email }
    });
  } catch (error) {
    console.error('Error finding user by email:', error);
    throw new Error('Failed to find user');
  }
};

/**
 * Find a user by ID
 */
exports.findUserById = async (id) => {
  try {
    return await prisma.user.findUnique({
      where: { id }
    });
  } catch (error) {
    console.error('Error finding user by ID:', error);
    throw new Error('Failed to find user');
  }
};

/**
 * Update a user
 */
exports.updateUser = async (id, userData) => {
  try {
    // Check if password needs to be updated
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    return await prisma.user.update({
      where: { id },
      data: userData
    });
  } catch (error) {
    console.error('Error updating user:', error);
    throw new Error('Failed to update user');
  }
};

/**
 * Delete a user
 */
exports.deleteUser = async (id) => {
  try {
    return await prisma.user.delete({
      where: { id }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new Error('Failed to delete user');
  }
};

/**
 * Verify user password
 */
exports.verifyPassword = async (user, password) => {
  try {
    if (!user.password) {
      return false;
    }
    return await bcrypt.compare(password, user.password);
  } catch (error) {
    console.error('Error verifying password:', error);
    throw new Error('Failed to verify password');
  }
};

/**
 * Enable two-factor authentication
 */
exports.enable2FA = async (userId, phoneNumber) => {
  try {
    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: {
        phoneNumber,
        twoFASecret: encrypt(verificationCode),
        twoFAEnabled: true
      }
    });

    // Send verification code
    const smsResponse = await sendVerificationCode(phoneNumber, verificationCode);
    
    if (!smsResponse.success) {
      throw new Error(smsResponse.error || 'Failed to send verification code');
    }

    return { success: true };
  } catch (error) {
    console.error('Error enabling 2FA:', error);
    throw new Error('Failed to enable 2FA');
  }
};

/**
 * Verify two-factor authentication code
 */
exports.verify2FACode = async (userId, code) => {
  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.twoFASecret) {
      return false;
    }

    // Compare code
    const decryptedCode = decrypt(user.twoFASecret);
    return decryptedCode === code;
  } catch (error) {
    console.error('Error verifying 2FA code:', error);
    throw new Error('Failed to verify 2FA code');
  }
};

/**
 * Mark 2FA as verified
 */
exports.setTwoFAVerified = async (userId, verified = true) => {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFAVerified: verified,
        twoFASecret: null // Clear the secret after verification
      }
    });
    return { success: true };
  } catch (error) {
    console.error('Error setting 2FA verified:', error);
    throw new Error('Failed to set 2FA verified');
  }
};

/**
 * Create a trusted device for a user
 * 
 * @param {string} userId - The user ID
 * @param {string} userAgent - The user agent string
 * @param {number} expiresInDays - Number of days until the device trust expires
 * @returns {Promise<{token: string, expiresAt: Date}>} - The trusted device token and expiration date
 */
exports.createTrustedDevice = async (userId, userAgent, expiresInDays = 30) => {
  try {
    // Generate a unique token
    const token = `${uuidv4()}-${Date.now()}`;
    
    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    
    // Create trusted device record
    const trustedDevice = await prisma.trustedDevice.create({
      data: {
        userId,
        token,
        userAgent: userAgent || 'Unknown',
        expiresAt
      }
    });
    
    console.log(`Created trusted device for user ${userId}: ${token}`);
    
    return {
      token,
      expiresAt: trustedDevice.expiresAt
    };
  } catch (error) {
    console.error('Error creating trusted device:', error);
    throw error;
  }
};


/**
 * Get all trusted devices for a user
 * 
 * @param {string} userId - The user ID
 * @returns {Promise<Array>} - Array of trusted devices
 */
exports.getTrustedDevices = async (userId) => {
  try {
    return await prisma.trustedDevice.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  } catch (error) {
    console.error('Error getting trusted devices:', error);
    throw error;
  }
};

/**
 * Remove a trusted device
 * 
 * @param {string} userId - The user ID
 * @param {string} deviceToken - The device token to remove
 * @returns {Promise<boolean>} - True if device was removed, false otherwise
 */
exports.removeTrustedDevice = async (userId, deviceToken) => {
  try {
    const result = await prisma.trustedDevice.deleteMany({
      where: {
        userId,
        token: deviceToken
      }
    });
    
    return result.count > 0;
  } catch (error) {
    console.error('Error removing trusted device:', error);
    throw error;
  }
};

/**
 * Check if a device is trusted for a user
 * 
 * @param {string} userId - The user ID
 * @param {string} deviceToken - The device token to check
 * @returns {Promise<boolean>} - True if device is trusted, false otherwise
 */
exports.isTrustedDevice = async (userId, deviceToken) => {
  try {
    if (!userId || !deviceToken) {
      return false;
    }
    
    // Find the trusted device record with valid expiration
    const trustedDevice = await prisma.trustedDevice.findFirst({
      where: {
        userId,
        token: deviceToken,
        expiresAt: { gt: new Date() }
      }
    });
    
    // Return true if device is trusted, false otherwise
    return !!trustedDevice;
  } catch (error) {
    console.error('Error checking trusted device:', error);
    return false;
  }
};

/**
 * Disable two-factor authentication
 */
exports.disable2FA = async (userId) => {
  try {
    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFAEnabled: false,
        twoFAVerified: false,
        twoFASecret: null
      }
    });

    // Delete trusted devices
    await prisma.trustedDevice.deleteMany({
      where: { userId }
    });

    return { success: true };
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    throw new Error('Failed to disable 2FA');
  }
};

/**
 * Get user profile
 */
exports.getUserProfile = async (userId) => {
  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        address: true,
        city: true,
        province: true,
        postalCode: true,
        idType: true,
        idNumber: true,
        idVerified: true,
        idVerifiedAt: true,
        idDocuments: true,
        createdAt: true,
        updatedAt: true
      }
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw new Error('Failed to get user profile');
  }
};

/**
 * Update user profile
 */
exports.updateUserProfile = async (userId, profileData) => {
  try {
    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!currentUser) {
      throw new Error('User not found');
    }

    // If user is verified, don't allow updating ID fields
    let updatedData = { ...profileData };
    if (currentUser.idVerified) {
      delete updatedData.idType;
      delete updatedData.idNumber;
    }

    // Update user
    return await prisma.user.update({
      where: { id: userId },
      data: {
        ...updatedData,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        address: true,
        city: true,
        province: true,
        postalCode: true,
        idType: true,
        idNumber: true,
        idVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw new Error('Failed to update user profile');
  }
};

/**
 * Clear flash message
 */
exports.clearFlashMessage = async (userId) => {
  try {
    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Clear flash message
    const idDocuments = user.idDocuments || {};
    if (idDocuments.flashMessage) {
      delete idDocuments.flashMessage;
      delete idDocuments.flashType;

      await prisma.user.update({
        where: { id: userId },
        data: { idDocuments }
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error clearing flash message:', error);
    throw new Error('Failed to clear flash message');
  }
};