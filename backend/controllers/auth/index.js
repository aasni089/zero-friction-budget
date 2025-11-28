// controllers/auth/index.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../../config/database');
const authConfig = require('../../config/auth');
const { sendVerificationCode, sendLoginCode } = require('../../utils/sms');
const { encrypt, decrypt } = require('../../utils/encryption');

/**
 * User registration
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: "User already exists with this email address." 
      });
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword
      }
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      authConfig.secret,
      { expiresIn: authConfig.tokenExpiry }
    );

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
      }
    });
  } catch (error) {
    console.error('Error in register:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
};

/**
 * User login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        trustedDevices: {
          where: {
            expiresAt: { gt: new Date() }
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    if (user.password && password) {
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    } else if (!user.password && password) {
      return res.status(401).json({ error: 'This account uses another authentication method' });
    }

    // Reset 2FA verification for new session
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFAVerified: false }
    });

    // Check if 2FA is enabled and generate code
    if (user.twoFAEnabled) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const encryptedCode = encrypt(code);

      await prisma.user.update({
        where: { id: user.id },
        data: { twoFASecret: encryptedCode }
      });

      // Send verification code
      if (user.phoneNumber) {
        await sendVerificationCode(user.phoneNumber, code);
      } else {
        // In dev environment, log the code
        console.log(`2FA Code for ${user.email}: ${code}`);
      }

      // Generate temporary token for 2FA
      const tempToken = jwt.sign(
        { 
          id: user.id, 
          email: user.email,
          requiresTwoFactor: true
        },
        authConfig.secret,
        { expiresIn: '5m' } // Short expiration for 2FA
      );

      return res.status(200).json({
        message: '2FA verification required',
        tempToken,
        requiresTwoFactor: true
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        twoFAEnabled: user.twoFAEnabled,
        twoFAVerified: user.twoFAVerified
      },
      authConfig.secret,
      { expiresIn: authConfig.tokenExpiry }
    );

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        twoFAEnabled: user.twoFAEnabled,
        twoFAVerified: user.twoFAVerified
      }
    });
  } catch (error) {
    console.error('Error in login:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
};

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

    if (!user || !user.twoFASecret || decrypt(user.twoFASecret) !== code) {
      // Increment attempt count logic would go here
      return res.status(400).json({ error: 'Invalid verification code. Please try again.' });
    }

    // Begin transaction for updating user and potentially creating trusted device
    const results = await prisma.$transaction(async (tx) => {
      // Update user to be verified
      await tx.user.update({
        where: { id: user.id },
        data: {
          twoFAVerified: true,
          twoFASecret: null
        }
      });

      // If trust device is requested, create a record
      let deviceToken = null;
      if (trustDevice) {
        deviceToken = `${uuidv4()}-${Date.now()}`;
        const expiresAt = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)); // 30 days
        
        await tx.trustedDevice.create({
          data: {
            userId: user.id,
            token: deviceToken,
            userAgent: req.headers['user-agent'] || 'Unknown',
            expiresAt
          }
        });
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
      authConfig.secret,
      { expiresIn: authConfig.tokenExpiry }
    );

    const response = {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        twoFAVerified: true
      }
    };

    // Add device token to response if created
    if (results.deviceToken) {
      response.deviceToken = results.deviceToken;
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error in verify2FA:', error);
    return res.status(500).json({ error: 'Failed to verify 2FA code' });
  }
};

/**
 * Enable 2FA for a user
 */
exports.enable2FA = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const userId = req.user.id;
    
    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Update user with phone number and verification code
    await prisma.user.update({
      where: { id: userId },
      data: {
        phoneNumber,
        twoFASecret: encrypt(verificationCode),
        twoFAEnabled: true
      }
    });

    // Send verification code
    const smsResponse = await sendSMS(
      phoneNumber, 
      `Your verification code is: ${verificationCode}`
    );

    if (!smsResponse.success) {
      throw new Error(smsResponse.error || 'Failed to send SMS');
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error enabling 2FA:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : "Failed to enable 2FA" 
    });
  }
};

/**
 * Disable 2FA for a user
 */
exports.disable2FA = async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFAEnabled: false,
        twoFAVerified: false,
        twoFASecret: null
      }
    });

    // Also delete any trusted devices
    await prisma.trustedDevice.deleteMany({
      where: { userId }
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error disabling 2FA:', error);
    return res.status(500).json({ error: "Failed to disable 2FA" });
  }
};

/**
 * Get 2FA status for a user
 */
exports.get2FAStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFAEnabled: true,
        phoneNumber: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({
      enabled: user.twoFAEnabled,
      phoneNumber: user.phoneNumber
    });
  } catch (error) {
    console.error('Error fetching 2FA status:', error);
    return res.status(500).json({ error: "Failed to fetch 2FA status" });
  }
};

/**
 * Check if a device is trusted
 */
exports.checkTrustedDevice = async (req, res) => {
  try {
    const { userId, deviceToken } = req.query;

    if (!userId || !deviceToken) {
      return res.status(400).json({ 
        valid: false, 
        error: "Missing parameters" 
      });
    }

    const deviceRecord = await prisma.trustedDevice.findUnique({
      where: { token: deviceToken }
    });

    if (
      deviceRecord &&
      deviceRecord.expiresAt > new Date() &&
      deviceRecord.userId === userId
    ) {
      // Update the user record so that twoFAVerified is set to true
      await prisma.user.update({
        where: { id: userId },
        data: { twoFAVerified: true }
      });
      
      return res.status(200).json({ valid: true });
    }

    return res.status(200).json({ valid: false });
  } catch (error) {
    console.error('Error in trusted-device-check:', error);
    return res.status(500).json({ 
      valid: false, 
      error: error.message 
    });
  }
};

/**
 * Log out a user
 */
exports.logout = async (req, res) => {
  try {
    const userId = req.user.id;
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(400).json({ error: "No token provided" });
    }
    
    // Decode the token to get its expiration time (without verification)
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return res.status(400).json({ error: "Invalid token" });
    }
    
    // Convert exp (seconds since epoch) to Date
    const expiresAt = new Date(decoded.exp * 1000);
    
    // Add to revoked tokens list
    await prisma.revokedToken.create({
      data: {
        token,
        userId,
        expiresAt
      }
    });
    
    // Update user's 2FA status
    await prisma.user.update({
      where: { id: userId },
      data: { twoFAVerified: false }
    });
    
    // Clear session token cookie
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error logging out:', error);
    return res.status(500).json({ error: 'Failed to log out' });
  }
};

/**
 * Get account status for a user
 */
exports.getAccountStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const userAccounts = await prisma.account.findMany({
      where: {
        userId,
        provider: "google"
      }
    });

    return res.status(200).json({
      hasGoogle: userAccounts.length > 0
    });
  } catch (error) {
    console.error('Error fetching account status:', error);
    return res.status(500).json({ error: "Failed to fetch account status" });
  }
};

/**
 * Unlink a Google account
 */
exports.unlinkGoogle = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const googleAccount = await prisma.account.findFirst({
      where: {
        userId,
        provider: "google"
      }
    });

    if (!googleAccount) {
      return res.status(404).json({ error: "No Google account found to unlink" });
    }

    await prisma.account.delete({
      where: { id: googleAccount.id }
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error unlinking Google account:', error);
    return res.status(500).json({ error: error.message });
  }
};

/**
 * Check if a user exists
 */
exports.checkUser = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(200).json({ 
        exists: false,
        message: "No account found with this email address. Please sign up first." 
      });
    }

    return res.status(200).json({ 
      exists: true,
      canProceed: true 
    });
  } catch (error) {
    console.error('Error checking user:', error);
    return res.status(500).json({ message: 'An error occurred while checking the account.' });
  }
};

/**
 * Create a new user
 */
exports.createUser = async (req, res) => {
  try {
    const { name, email, phoneNumber, address, city, province, postalCode } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      await prisma.user.update({
        where: { email },
        data: { 
          name,
          phoneNumber,
          address,
          city,
          province,
          postalCode
        }
      });
      return res.status(200).json({ success: true });
    }

    await prisma.user.create({
      data: {
        email,
        name,
        phoneNumber,
        address,
        city,
        province,
        postalCode
      }
    });

    return res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ error: 'Failed to create user' });
  }
};

/**
 * Google OAuth callback handling
 */
exports.googleCallback = async (req, res) => {
  try {
    // This would typically be handled by a passport strategy or OAuth library
    // Here we're just providing the structure for how it would be integrated
    const { code } = req.query;
    
    // Exchange code for tokens using OAuth library
    // const { tokens, userData } = await exchangeGoogleCode(code);
    
    // For demonstration - you would get this from the OAuth exchange
    const userData = {
      email: req.body.email,
      name: req.body.name,
      picture: req.body.picture
    };
    
    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email: userData.email }
    });
    
    // If user doesn't exist, create them
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          image: userData.picture
        }
      });
      
      // Create account record for Google
      await prisma.account.create({
        data: {
          userId: user.id,
          provider: 'google',
          providerAccountId: userData.email,
          // Additional fields like tokens would be stored here
        }
      });
    } 
    // If user exists but no Google account linked, create the account
    else {
      const existingAccount = await prisma.account.findFirst({
        where: {
          userId: user.id,
          provider: 'google'
        }
      });
      
      if (!existingAccount) {
        await prisma.account.create({
          data: {
            userId: user.id,
            provider: 'google',
            providerAccountId: userData.email,
            // Additional fields like tokens would be stored here
          }
        });
      }
    }
    
    // Reset 2FA verification
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFAVerified: false }
    });
    
    // Check if 2FA is enabled
    if (user.twoFAEnabled) {
      // Generate and send 2FA code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const encryptedCode = encrypt(code);
      
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFASecret: encryptedCode }
      });
      
      if (user.phoneNumber) {
        await sendVerificationCode(user.phoneNumber, code);
      } else {
        console.log(`2FA Code for ${user.email}: ${code}`);
      }
      
      // Generate temporary token
      const tempToken = jwt.sign(
        { 
          id: user.id, 
          email: user.email,
          requiresTwoFactor: true
        },
        authConfig.secret,
        { expiresIn: '5m' }
      );
      
      return res.status(200).json({
        message: '2FA verification required',
        tempToken,
        requiresTwoFactor: true
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        twoFAEnabled: user.twoFAEnabled,
        twoFAVerified: false
      },
      authConfig.secret,
      { expiresIn: authConfig.tokenExpiry }
    );
    
    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        twoFAEnabled: user.twoFAEnabled,
        twoFAVerified: false
      }
    });
  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};