// controllers/auth/two-factor.js
const prisma = require('../../config/database');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const authConfig = require('../../config/auth');
const { encrypt, decrypt } = require('../../utils/encryption');
const { sendVerificationCode: sendSMSCode } = require('../../utils/sms');
const { sendVerificationCode: sendEmailCode } = require('../../utils/email');

const MAX_VERIFICATION_ATTEMPTS = 3;

/**
 * Verify 2FA code
 */
exports.verify2FA = async (req, res) => {
  try {
    const { code, trustDevice } = req.body;
    const userId = req.user.id;

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user || !user.twoFASecret) {
      return res.status(400).json({ error: 'Invalid verification code. Please try again.' });
    }

    // Verify the code
    const decryptedCode = decrypt(user.twoFASecret);
    
    // Check if code is correct
    if (decryptedCode !== code) {
      // Increment attempt count
      const currentAttempts = user.verificationAttempts || 0;
      const newAttemptCount = currentAttempts + 1;
      const MAX_VERIFICATION_ATTEMPTS = 3;
      
      if (newAttemptCount >= MAX_VERIFICATION_ATTEMPTS) {
        // Max attempts reached, reset everything
        await prisma.user.update({
          where: { id: user.id },
          data: {
            twoFASecret: null,
            twoFAVerified: false,
            twoFAPending: false,
            verificationAttempts: 0
          }
        });
        
        return res.status(400).json({ 
          error: 'Maximum verification attempts reached. Please try again later.',
          maxAttemptsReached: true 
        });
      }
      
      // Update attempts count
      await prisma.user.update({
        where: { id: user.id },
        data: { verificationAttempts: newAttemptCount }
      });
      
      return res.status(400).json({ 
        error: `Invalid verification code. You have ${MAX_VERIFICATION_ATTEMPTS - newAttemptCount} attempts remaining.`,
        attemptsRemaining: MAX_VERIFICATION_ATTEMPTS - newAttemptCount
      });
    }

    // Begin transaction for updating user and potentially creating trusted device
    const results = await prisma.$transaction(async (tx) => {
      // Determine if this is part of setup flow (twoFAPending) or login flow
      const isSetupFlow = user.twoFAPending;
      
      // Update user to be verified
      await tx.user.update({
        where: { id: user.id },
        data: {
          twoFAVerified: true,
          twoFASecret: null,
          twoFAEnabled: isSetupFlow ? true : user.twoFAEnabled, // Only enable if in setup flow
          twoFAPending: false,  // Clear pending status
          verificationAttempts: 0 // Reset attempts
        }
      });

      // If trust device is requested, create a record
      let deviceToken = null;
      let deviceExpiresAt = null;
      
      if (trustDevice) {
        deviceToken = `${uuidv4()}-${Date.now()}`;
        deviceExpiresAt = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)); // 30 days
        
        await tx.trustedDevice.create({
          data: {
            userId: user.id,
            token: deviceToken,
            userAgent: req.headers['user-agent'] || 'Unknown',
            expiresAt: deviceExpiresAt
          }
        });
        
        // Log for debugging
        console.log(`Created trusted device for user ${user.id}. Token: ${deviceToken}, expires: ${deviceExpiresAt}`);
      }

      return { 
        deviceToken, 
        deviceExpiresAt,
        twoFAEnabled: isSetupFlow ? true : user.twoFAEnabled 
      };
    });

    // Generate new JWT with verified 2FA status
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        twoFAEnabled: results.twoFAEnabled,
        twoFAVerified: true
      },
      authConfig.jwt.secret,
      { expiresIn: authConfig.jwt.expiresIn }
    );

    const response = {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        twoFAVerified: true,
        twoFAEnabled: results.twoFAEnabled
      }
    };

    // Add device token to response if created
    if (results.deviceToken) {
      response.deviceToken = results.deviceToken;
      
      // Set cookie with the trusted device token
      res.cookie('trusted_device', deviceToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/', // Ensure cookie is available for all paths
        // Don't set domain unless you're using a custom domain
        // If using localhost, don't set domain at all
        ...(process.env.NODE_ENV === 'production' && { 
          domain: process.env.COOKIE_DOMAIN || undefined 
        })
      });

      // Add CORS header for the response to ensure browser accepts the cookie
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      
      // Add verbose debug logging to track cookie setting
      console.log(`Setting trusted_device cookie: ${deviceToken}`);
      console.log(`Cookie settings: ${JSON.stringify({
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: '30 days',
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? (process.env.COOKIE_DOMAIN || 'undefined') : 'undefined'
      })}`);
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error in verify2FA:', error);
    return res.status(500).json({ error: 'Failed to verify 2FA code' });
  }
};

/**
 * Configure 2FA options
 */
exports.configure2FA = async (req, res) => {
  try {
    const { enabled, method, phoneNumber } = req.body;
    const userId = req.user.id;
    
    // Input validation
    if (enabled === true && method === 'sms' && !phoneNumber) {
      return res.status(400).json({ 
        error: "Phone number required for SMS 2FA",
        field: "phoneNumber"
      });
    }
    
    // Update user preferences
    const updateData = {};
    
    // Add phone number if provided
    if (phoneNumber) {
      updateData.phoneNumber = phoneNumber;
    }
    
    if (enabled) {
      // Set method but don't enable 2FA yet, mark as pending
      updateData.twoFAMethod = method;
      updateData.twoFAPending = true;
      updateData.twoFAEnabled = false; // Ensure it's explicitly set to false until verified
      updateData.verificationAttempts = 0; // Reset attempts counter
      
      // Generate verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      updateData.twoFASecret = encrypt(verificationCode);
      
      // Retrieve user to get name for email
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true }
      });
      
      // Send verification code via configured method
      if (method === 'sms' && phoneNumber) {
        // Send via SMS
        await sendSMSCode(phoneNumber, verificationCode);
      } else {
        // Send via Email
        await sendEmailCode(user.email, verificationCode, user.name);
      }
      
      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          twoFAEnabled: true,
          twoFAPending: true,
          twoFAMethod: true,
          phoneNumber: true
        }
      });
      
      return res.status(200).json({
        success: true,
        user: updatedUser,
        requiresVerification: true,
        method: method
      });
    } else {
      // If disabling 2FA, clear all related fields
      updateData.twoFAEnabled = false;
      updateData.twoFASecret = null;
      updateData.twoFAVerified = false;
      updateData.twoFAPending = false;
      updateData.verificationAttempts = 0;
      
      // Delete trusted devices
      await prisma.trustedDevice.deleteMany({
        where: { userId }
      });
      
      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          twoFAEnabled: false,
          twoFAMethod: true,
          phoneNumber: true
        }
      });
      
      return res.status(200).json({
        success: true,
        user: updatedUser,
        requiresVerification: false
      });
    }
  } catch (error) {
    console.error('Error configuring 2FA:', error);
    return res.status(500).json({ error: 'Failed to configure 2FA' });
  }
};

/**
 * Cancel 2FA setup process
 */
exports.cancel2FASetup = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Reset 2FA setup state
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFAPending: false,
        twoFASecret: null,
        verificationAttempts: 0
      }
    });
    
    return res.status(200).json({
      success: true,
      message: "2FA setup cancelled successfully"
    });
  } catch (error) {
    console.error('Error cancelling 2FA setup:', error);
    return res.status(500).json({ error: 'Failed to cancel 2FA setup' });
  }
};

/**
 * Resend 2FA verification code
 */
exports.resend2FACode = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Generate new 2FA code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const encryptedCode = encrypt(code);
    
    // Update user with new code and reset attempts
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        twoFASecret: encryptedCode,
        verificationAttempts: 0
      }
    });
    
    // Send code via preferred method
    let sendMethod = 'email'; // Default
    
    if (user.twoFAMethod === 'sms' && user.phoneNumber) {
      await sendSMSCode(user.phoneNumber, code);
      sendMethod = 'sms';
    } else {
      await sendEmailCode(user.email, code, user.name);
    }
    
    return res.status(200).json({
      success: true,
      message: `Verification code sent via ${sendMethod === 'sms' ? 'SMS' : 'email'}`,
      method: sendMethod
    });
  } catch (error) {
    console.error('Error resending 2FA code:', error);
    return res.status(500).json({ error: 'Failed to resend verification code' });
  }
};

/**
 * Handle verification for login flow
 */
exports.verifyLoginWith2FA = async (req, res) => {
  try {
    const { code, trustDevice, tempToken } = req.body;
    
    if (!tempToken) {
      return res.status(400).json({ error: 'Missing temporary authentication token' });
    }
    
    // Decode the temporary token to get the user ID
    const jwt = require('jsonwebtoken');
    let decodedToken;
    
    try {
      decodedToken = jwt.verify(tempToken, authConfig.jwt.secret);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    const userId = decodedToken.id;
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user || !user.twoFASecret) {
      return res.status(400).json({ error: 'Invalid verification code. Please try again.' });
    }
    
    // Verify the code
    const decryptedCode = decrypt(user.twoFASecret);
    
    if (decryptedCode !== code) {
      // Increment attempt count
      const currentAttempts = user.verificationAttempts || 0;
      const newAttemptCount = currentAttempts + 1;
      const MAX_VERIFICATION_ATTEMPTS = 3;
      
      if (newAttemptCount >= MAX_VERIFICATION_ATTEMPTS) {
        // Max attempts reached, reset the secret to prevent further attempts
        await prisma.user.update({
          where: { id: user.id },
          data: {
            twoFASecret: null,
            verificationAttempts: 0
          }
        });
        
        return res.status(400).json({ 
          error: 'Maximum verification attempts reached. Please try logging in again.',
          maxAttemptsReached: true 
        });
      }
      
      // Update attempts count
      await prisma.user.update({
        where: { id: user.id },
        data: { verificationAttempts: newAttemptCount }
      });
      
      return res.status(400).json({ 
        error: `Invalid verification code. You have ${MAX_VERIFICATION_ATTEMPTS - newAttemptCount} attempts remaining.`,
        attemptsRemaining: MAX_VERIFICATION_ATTEMPTS - newAttemptCount
      });
    }
    
    // Code is correct, begin transaction
    const results = await prisma.$transaction(async (tx) => {
      // Update user verification status
      await tx.user.update({
        where: { id: user.id },
        data: {
          twoFAVerified: true,
          twoFASecret: null,
          verificationAttempts: 0
        }
      });
      
      // If trust device is requested, create a record
      let deviceToken = null;
      if (trustDevice) {
        // Create trusted device for 2FA
        const { createTrustedDevice } = require('../../services/user');
        const deviceResult = await createTrustedDevice(user.id, req.headers['user-agent'], 30);
        deviceToken = deviceResult.token;
      }
      
      return { deviceToken };
    });
    
    // Generate new JWT with verified 2FA status
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        twoFAEnabled: true,
        twoFAVerified: true
      },
      authConfig.jwt.secret,
      { expiresIn: authConfig.jwt.expiresIn }
    );
    
    const response = {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        twoFAVerified: true,
        twoFAEnabled: true
      }
    };
    
    // Add device token to response if created
    if (results.deviceToken) {
      // Set cookie with the trusted device token - Add domain and path explicitly
      res.cookie('trusted_device', results.deviceToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/', // Ensure cookie is available for all paths
        // Don't set domain unless you're using a custom domain
        // If using localhost, don't set domain at all
        ...(process.env.NODE_ENV === 'production' && { 
          domain: process.env.COOKIE_DOMAIN || undefined 
        })
      });

      // Add CORS header for the response to ensure browser accepts the cookie
      res.setHeader('Access-Control-Allow-Credentials', 'true');

      // Add verbose debug logging to track cookie setting
      console.log(`Setting trusted_device cookie: ${results.deviceToken}`);
      console.log(`Cookie settings: ${JSON.stringify({
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: '30 days',
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? (process.env.COOKIE_DOMAIN || 'undefined') : 'undefined'
      })}`);
    }
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error in verifyLoginWith2FA:', error);
    return res.status(500).json({ error: 'Failed to verify 2FA code' });
  }
};