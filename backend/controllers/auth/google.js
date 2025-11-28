// controllers/auth/google.js
const jwt = require('jsonwebtoken');
const prisma = require('../../config/database');
const authConfig = require('../../config/auth');
const { encrypt } = require('../../utils/encryption');
const { sendVerificationCode: sendEmailCode } = require('../../utils/email');
const { sendVerificationCode: sendSMSCode } = require('../../utils/sms');

/**
 * Handle Google OAuth callback
 */
exports.handleGoogleCallback = async (req, res) => {
  try {
    // This code would be called after a successful Google OAuth authentication
    // In a real implementation, this would be handled by the passport strategy
    const { email, name, picture } = req.user;
    
    // Find existing user
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    // Check if user exists but with a different authentication method
    if (existingUser && existingUser.preferredAuthMethod !== 'google') {
      // Check if account linking is allowed
      if (!existingUser.allowAccountLinking) {
        return res.status(400).json({
          error: "This email is already registered with a different authentication method",
          accountLinkingDisabled: true
        });
      }
      
      // Update user to link Google account
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          image: picture || existingUser.image,
          accounts: {
            create: {
              provider: 'google',
              providerAccountId: email,
              type: 'oauth'
            }
          }
        }
      });
    }
    
    // If user doesn't exist, create a new account
    if (!existingUser) {
      await prisma.user.create({
        data: {
          email,
          name,
          image: picture,
          preferredAuthMethod: 'google',
          accounts: {
            create: {
              provider: 'google',
              providerAccountId: email,
              type: 'oauth'
            }
          }
        }
      });
    }
    
    // Get the updated user
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    // Check if 2FA is enabled for this user
    if (user.twoFAEnabled) {
      // Generate 2FA code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const encryptedCode = encrypt(code);
      
      // Update user with code
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFASecret: encryptedCode }
      });
      
      // Send 2FA code via preferred method
      if (user.twoFAMethod === 'sms' && user.phoneNumber) {
        await sendSMSCode(user.phoneNumber, code);
      } else {
        // Default to email
        await sendEmailCode(user.email, code, user.name);
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
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        twoFAEnabled: user.twoFAEnabled,
        twoFAVerified: false
      },
      authConfig.jwt.secret,
      { expiresIn: authConfig.jwt.expiresIn }
    );
    
    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        twoFAEnabled: user.twoFAEnabled,
        twoFAVerified: false,
        isNewUser: user.createdAt > new Date(Date.now() - 60 * 1000) // Created within the last minute
      }
    });
  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};