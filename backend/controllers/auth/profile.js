// controllers/auth/profile.js
const prisma = require('../../config/database');
const jwt = require('jsonwebtoken');

/**
 * Get user profile
 */
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        phoneNumber: true,
        preferredAuthMethod: true,
        preferredLoginMethod: true,
        allowAccountLinking: true,
        twoFAEnabled: true,
        twoFAMethod: true,
        accounts: {
          select: {
            provider: true
          }
        }
      }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Format auth providers
    const authProviders = user.accounts.map(account => account.provider);
    const hasMagicLink = user.preferredAuthMethod === 'magic_link';
    
    if (hasMagicLink) {
      authProviders.push('magic_link');
    }
    
    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        phoneNumber: user.phoneNumber,
        preferredAuthMethod: user.preferredAuthMethod,
        preferredLoginMethod: user.preferredLoginMethod,
        allowAccountLinking: user.allowAccountLinking,
        twoFA: {
          enabled: user.twoFAEnabled,
          method: user.twoFAMethod
        },
        authProviders
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

/**
 * Update account settings
 */
exports.updateAccountSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, preferredAuthMethod, phoneNumber } = req.body;
    
    // Validate inputs
    if (preferredAuthMethod && !['magic_link', 'google', 'email'].includes(preferredAuthMethod)) {
      return res.status(400).json({ 
        error: 'Invalid auth method',
        field: 'preferredAuthMethod'
      });
    }
    
    // Check if user has the requested auth method enabled
    if (preferredAuthMethod) {
      if (preferredAuthMethod === 'google') {
        const googleAccount = await prisma.account.findFirst({
          where: {
            userId,
            provider: 'google'
          }
        });
        
        if (!googleAccount) {
          return res.status(400).json({
            error: 'Google account not linked to this user',
            field: 'preferredAuthMethod'
          });
        }
      }
    }
    
    // Update user
    const updateData = {};
    if (name) updateData.name = name;
    if (preferredAuthMethod) updateData.preferredAuthMethod = preferredAuthMethod;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        preferredAuthMethod: true,
        preferredLoginMethod: true,
        allowAccountLinking: true
      }
    });
    
    return res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error updating account settings:', error);
    return res.status(500).json({ error: 'Failed to update account settings' });
  }
};

/**
 * Update notification preferences
 */
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const { preferredLoginMethod, twoFAMethod, phoneNumber } = req.body;
    
    // Validate inputs
    if (preferredLoginMethod && !['email', 'sms'].includes(preferredLoginMethod)) {
      return res.status(400).json({ 
        error: 'Invalid login method',
        field: 'preferredLoginMethod'
      });
    }
    
    if (twoFAMethod && !['email', 'sms'].includes(twoFAMethod)) {
      return res.status(400).json({ 
        error: 'Invalid 2FA method',
        field: 'twoFAMethod'
      });
    }
    
    // If SMS is preferred for either login or 2FA, make sure phone number is provided
    if ((preferredLoginMethod === 'sms' || twoFAMethod === 'sms') && !phoneNumber) {
      return res.status(400).json({
        error: 'Phone number is required for SMS notifications',
        field: 'phoneNumber'
      });
    }
    
    // Update user
    const updateData = {};
    if (preferredLoginMethod) updateData.preferredLoginMethod = preferredLoginMethod;
    if (twoFAMethod) updateData.twoFAMethod = twoFAMethod;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    
    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        preferredLoginMethod: true,
        twoFAMethod: true
      }
    });
    
    return res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return res.status(500).json({ error: 'Failed to update notification preferences' });
  }
};

/**
 * Update account linking preferences
 */
exports.updateLinkingPreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const { allowAccountLinking } = req.body;
    
    if (allowAccountLinking === undefined) {
      return res.status(400).json({ error: 'Missing allowAccountLinking parameter' });
    }
    
    const user = await prisma.user.update({
      where: { id: userId },
      data: { allowAccountLinking },
      select: {
        id: true,
        allowAccountLinking: true
      }
    });
    
    return res.status(200).json({
      success: true,
      allowAccountLinking: user.allowAccountLinking
    });
  } catch (error) {
    console.error('Error updating linking preferences:', error);
    return res.status(500).json({ error: 'Failed to update account linking preferences' });
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