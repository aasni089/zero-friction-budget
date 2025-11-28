// controllers/auth/magic-link.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../../config/database');
const authConfig = require('../../config/auth');
const { sendMagicLink } = require('../../utils/email');
const { encrypt } = require('../../utils/encryption');

/**
 * Request a magic link for login or registration
 */
exports.requestMagicLink = async (req, res) => {
    try {
      const { email, name } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }
      
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      
      // Generate a secure token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      
      // Store the token with additional metadata if it's a new user with a name
      const metadata = (!existingUser && name) ? { name } : {};
      
      await prisma.verificationToken.create({
        data: {
          identifier: email,
          token,
          expires: expiresAt,
          metadata // Store the name in metadata
        }
      });
      
      // Send the magic link email
      const emailResult = await sendMagicLink(
        email, 
        token, 
        existingUser?.name || name || ''
      );
      
      if (!emailResult.success) {
        throw new Error('Failed to send magic link email');
      }
      
      // User doesn't exist and name is provided - this is likely a registration
      const isRegistration = !existingUser && name;
      
      return res.status(200).json({
        success: true,
        isRegistration,
        message: "Magic link sent to your email",
        email: email
      });
    } catch (error) {
      console.error('Error requesting magic link:', error);
      return res.status(500).json({ error: 'Failed to send magic link' });
    }
  };

/**
 * Verify magic link token and authenticate user
 */
exports.verifyMagicLink = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    // Execute everything in a single transaction to avoid race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Find the token inside the transaction
      const verificationToken = await tx.verificationToken.findUnique({
        where: { token }
      });
      
      // Handle token not found
      if (!verificationToken) {
        throw new Error("Invalid or expired token");
      }
      
      // Check if token is expired
      if (new Date() > verificationToken.expires) {
        // Delete the expired token
        await tx.verificationToken.deleteMany({
          where: { token }
        });
        throw new Error("Token has expired");
      }
      
      // Extract data from the token
      const email = verificationToken.identifier;
      const providedName = verificationToken.metadata?.name;
      
      // Delete the token since it's valid and we'll use it
      await tx.verificationToken.deleteMany({
        where: { token }
      });
      
      // Find user by email
      const user = await tx.user.findUnique({
        where: { email }
      });
      
      let finalUser = user;
      let jwtToken;
      let requiresTwoFactor = false;
      let twoFAMethod = null;
      let tempToken = null;
      
      // If user doesn't exist, create a new account
      if (!user) {
        const userName = providedName || email.split('@')[0].replace(/[^a-zA-Z0-9]/g, ' ')
                        .replace(/\b\w/g, c => c.toUpperCase());
        
        finalUser = await tx.user.create({
          data: {
            email,
            name: userName,
            preferredAuthMethod: "magic_link",
            emailVerified: new Date(),
          }
        });
      } else if (!user.emailVerified) {
        // If existing user but email not verified, update it
        finalUser = await tx.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() }
        });
      }
      
      // Check if 2FA is enabled for this user
      if (finalUser.twoFAEnabled) {
        // Generate 2FA code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const encryptedCode = encrypt(code);
        
        // Update user with code
        await tx.user.update({
          where: { id: finalUser.id },
          data: { twoFASecret: encryptedCode }
        });
        
        requiresTwoFactor = true;
        twoFAMethod = finalUser.twoFAMethod || 'email';
        
        // Generate temporary token for 2FA
        tempToken = jwt.sign(
          { 
            id: finalUser.id, 
            email: finalUser.email,
            requiresTwoFactor: true
          },
          authConfig.jwt.secret,
          { expiresIn: '5m' } // Short expiration for 2FA
        );
        
        // Return necessary info for 2FA
        return {
          user: finalUser,
          requiresTwoFactor,
          twoFAMethod,
          tempToken,
          isNewUser: !user,
          code
        };
      } else {
        // Generate JWT token for direct authentication
        jwtToken = jwt.sign(
          { 
            id: finalUser.id, 
            email: finalUser.email,
            twoFAEnabled: finalUser.twoFAEnabled,
            twoFAVerified: false
          },
          authConfig.jwt.secret,
          { expiresIn: authConfig.jwt.expiresIn }
        );
        
        // Return necessary info for regular auth
        return {
          user: finalUser,
          jwtToken,
          isNewUser: !user
        };
      }
    });
    
    // Handle 2FA if needed
    if (result.requiresTwoFactor) {
      // Send the 2FA code asynchronously
      const handleSendVerificationCode = async () => {
        try {
          const user = result.user;
          const code = decrypt(user.twoFASecret);
          
          if (result.twoFAMethod === 'sms' && user.phoneNumber) {
            const { sendVerificationCode } = require('../../utils/sms');
            await sendVerificationCode(user.phoneNumber, code);
          } else {
            const { sendVerificationCode } = require('../../utils/email');
            await sendVerificationCode(user.email, code, user.name);
          }
        } catch (err) {
          console.error('Error sending verification code:', err);
        }
      };
      
      // Execute asynchronously - don't wait for completion
      handleSendVerificationCode();
      
      return res.status(200).json({
        message: '2FA verification required',
        tempToken: result.tempToken,
        requiresTwoFactor: true,
        twoFAMethod: result.twoFAMethod
      });
    }
    
    // Regular auth response
    return res.status(200).json({
      token: result.jwtToken,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        twoFAEnabled: result.user.twoFAEnabled,
        twoFAVerified: false,
        isNewUser: result.isNewUser
      }
    });
    
  } catch (error) {
    // Specific error handling for token issues
    if (error.message === "Invalid or expired token" || error.message === "Token has expired") {
      return res.status(400).json({ error: error.message });
    }
    
    console.error('Error verifying magic link:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};