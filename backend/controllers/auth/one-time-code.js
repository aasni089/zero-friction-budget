// controllers/auth/one-time-code.js
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../../config/database');
const authConfig = require('../../config/auth');
const { encrypt, decrypt } = require('../../utils/encryption');
const { sendLoginCode, sendVerificationCode, sendWelcomeEmail } = require('../../utils/email');
const { sendVerificationCode: sendSMSCode } = require('../../utils/sms');

/**
 * Request a one-time login code for authentication
 * Also handles registration if name is provided
 */
exports.requestLoginCode = async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    
    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email }
    });
    
    // Determine if this is a registration attempt (name provided and user doesn't exist)
    const isRegistration = !user && !!name;
    
    // If it's a registration attempt, create a new user
    if (isRegistration) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          preferredAuthMethod: 'email',
          preferredLoginMethod: 'email'
        }
      });
      
      // Send welcome email asynchronously with a delay of 2 minutes
      setTimeout(() => {
        sendWelcomeEmail(email, name).catch(err => {
          console.error('Error sending welcome email:', err);
        });
      }, 2 * 60 * 1000);
    }
    
    // If user doesn't exist and it's not a registration attempt, don't reveal this
    if (!user) {
      return res.status(200).json({ 
        success: true,
        message: "If an account with this email exists, a login code has been sent"
      });
    }
    
    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const encryptedCode = encrypt(code);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    // Store the code with the user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginCode: encryptedCode,
        loginCodeExpiresAt: expiresAt
      }
    });
    
    // Determine user's preferred communication method
    const notificationMethod = user.preferredLoginMethod || 'email';
    
    // Send the login code via the preferred method
    if (notificationMethod === 'sms' && user.phoneNumber) {
      await sendSMSCode(user.phoneNumber, code);
    } else {
      // Default to email
      await sendLoginCode(email, code, user.name || '');
    }
    
    return res.status(200).json({
      success: true,
      isRegistration,
      message: isRegistration 
        ? "Account created successfully. Please verify with the code sent to your email." 
        : "If an account with this email exists, a login code has been sent",
      // Include method only in development for easier testing
      ...(process.env.NODE_ENV === 'development' && {
        method: notificationMethod,
        email: email
      })
    });
  } catch (error) {
    console.error('Error requesting login code:', error);
    return res.status(500).json({ error: 'Failed to send login code' });
  }
};

// controllers/auth/one-time-code.js - Update verifyLoginCode function

/**
 * Verify one-time login code and authenticate user
 */
exports.verifyLoginCode = async (req, res) => {
  try {
    const { email, code, trustDevice } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ error: "Email and code are required" });
    }
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return res.status(400).json({ error: "Invalid email or code" });
    }
    
    // Check if user has a login code and it's not expired
    if (!user.loginCode || !user.loginCodeExpiresAt) {
      return res.status(400).json({ error: "No login code has been requested or it has expired" });
    }
    
    if (user.loginCodeExpiresAt < new Date()) {
      return res.status(400).json({ error: "Login code has expired. Please request a new one" });
    }
    
    // Track verification attempts
    const currentAttempts = user.loginCodeVerificationAttempts || 0;
    const MAX_LOGIN_ATTEMPTS = 3;
    
    // Verify the code
    const decryptedCode = decrypt(user.loginCode);
    if (decryptedCode !== code) {
      // Increment attempt count
      const newAttemptCount = currentAttempts + 1;
      
      if (newAttemptCount >= MAX_LOGIN_ATTEMPTS) {
        // Max attempts reached, clear login code
        await prisma.user.update({
          where: { id: user.id },
          data: { 
            loginCode: null,
            loginCodeExpiresAt: null,
            loginCodeVerificationAttempts: 0
          }
        });
        
        return res.status(400).json({ 
          error: 'Maximum verification attempts reached. Please request a new code.',
          maxAttemptsReached: true 
        });
      }
      
      // Update attempts count
      await prisma.user.update({
        where: { id: user.id },
        data: { loginCodeVerificationAttempts: newAttemptCount }
      });
      
      return res.status(400).json({ 
        error: `Invalid verification code. You have ${MAX_LOGIN_ATTEMPTS - newAttemptCount} attempts remaining.`,
        attemptsRemaining: MAX_LOGIN_ATTEMPTS - newAttemptCount
      });
    }
    
    // Execute everything in a transaction to ensure consistent state
    await prisma.$transaction(async (tx) => {
      // Clear the login code and reset attempts
      await tx.user.update({
        where: { id: user.id },
        data: { 
          loginCode: null,
          loginCodeExpiresAt: null,
          loginCodeVerificationAttempts: 0,
          emailVerified: user.emailVerified || new Date() // Mark email as verified if not already
        }
      });
    });
    
    // Check if this is the first login after registration
    const isFirstLogin = !user.emailVerified;
    
    // Check if 2FA is enabled for this user
    if (user.twoFAEnabled) {
      // Check if this device is already trusted for this user
      let isTrusted = false;
      const deviceToken = req.cookies?.trusted_device;
      
      if (deviceToken) {
        // Check if device token exists and is valid
        const { isTrustedDevice } = require('../../services/user');
        isTrusted = await isTrustedDevice(user.id, deviceToken);
        
        // Log debugging information
        console.log(`Checking if device is trusted for user ${user.id}: ${isTrusted ? 'Yes' : 'No'}`);
        console.log(`Device token: ${deviceToken.substring(0, 10)}...`);
      }
      
      // If the device is not already trusted, send 2FA code
      if (!isTrusted) {
        // Generate 2FA code
        const twoFACode = Math.floor(100000 + Math.random() * 900000).toString();
        const encryptedTwoFACode = encrypt(twoFACode);
        
        // Update user with 2FA code and reset attempts counter
        await prisma.user.update({
          where: { id: user.id },
          data: { 
            twoFASecret: encryptedTwoFACode,
            twoFAVerificationAttempts: 0 
          }
        });
        
        // Send verification code via preferred method
        if (user.twoFAMethod === 'sms' && user.phoneNumber) {
          await sendSMSCode(user.phoneNumber, twoFACode);
        } else {
          // Default to email
          await sendVerificationCode(user.email, twoFACode, user.name);
        }
        
        // Generate temporary token for 2FA
        const tempToken = jwt.sign(
          { 
            id: user.id, 
            email: user.email,
            requiresTwoFactor: true
          },
          authConfig.jwt.secret,
          { expiresIn: '5m' } // Short expiration for 2FA
        );
        
        return res.status(200).json({
          message: '2FA verification required',
          tempToken,
          requiresTwoFactor: true,
          twoFAMethod: user.twoFAMethod || 'email'
        });
      }
      
      // If device is already trusted, we mark the 2FA as verified for this session
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFAVerified: true }
      });
      
      console.log(`Device is trusted. Setting twoFAVerified=true for user ${user.id}`);
    }
    
    // Generate JWT token for direct authentication
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        twoFAEnabled: user.twoFAEnabled,
        twoFAVerified: user.twoFAEnabled ? true : false  // Mark as verified if trusted device or 2FA not enabled
      },
      authConfig.jwt.secret,
      { expiresIn: authConfig.jwt.expiresIn }
    );
    
    // Construct the response
    const response = {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        twoFAEnabled: user.twoFAEnabled,
        twoFAVerified: user.twoFAEnabled ? true : false,
        isNewUser: isFirstLogin
      }
    };
    
    // IMPORTANT: We're not setting any new cookies here, so the existing trusted_device 
    // cookie will remain as is, preserving the trusted device status across login
    
    // Log the fact that we're preserving cookies
    if (req.cookies?.trusted_device) {
      console.log(`Preserving existing trusted_device cookie for user ${user.id}`);
    }
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error verifying login code:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Resend login code
 */
exports.resendLoginCode = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      // Security best practice: don't reveal whether a user exists
      return res.status(200).json({ 
        success: true,
        message: "If an account with this email exists, a new login code has been sent"
      });
    }
    
    // Generate a new code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const encryptedCode = encrypt(code);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    // Update user with new code
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginCode: encryptedCode,
        loginCodeExpiresAt: expiresAt
      }
    });
    
    // Determine user's preferred communication method
    const notificationMethod = user.preferredLoginMethod || 'email';
    
    // Send the login code via the preferred method
    if (notificationMethod === 'sms' && user.phoneNumber) {
      await sendSMSCode(user.phoneNumber, code);
    } else {
      // Default to email
      await sendLoginCode(email, code, user.name || '');
    }
    
    return res.status(200).json({
      success: true,
      message: "If an account with this email exists, a new login code has been sent",
      // Include method only in development for easier testing
      ...(process.env.NODE_ENV === 'development' && {
        method: notificationMethod,
        email: email
      })
    });
  } catch (error) {
    console.error('Error resending login code:', error);
    return res.status(500).json({ error: 'Failed to resend login code' });
  }
};

/**
 * Invalidate login code when user cancels login
 */
exports.invalidateLoginCode = async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      // Find user
      const user = await prisma.user.findUnique({
        where: { email }
      });
      
      if (!user) {
        // Security best practice: don't reveal whether a user exists
        return res.status(200).json({ 
          success: true,
          message: "Login code invalidated successfully"
        });
      }
      
      // Clear the login code data
      await prisma.user.update({
        where: { id: user.id },
        data: {
          loginCode: null,
          loginCodeExpiresAt: null
        }
      });
      
      return res.status(200).json({
        success: true,
        message: "Login code invalidated successfully"
      });
    } catch (error) {
      console.error('Error invalidating login code:', error);
      return res.status(500).json({ error: 'Failed to invalidate login code' });
    }
  };