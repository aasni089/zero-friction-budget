// middleware/auth.js
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { isTrustedDevice } = require('../services/user');

/**
 * Authenticate token middleware
 * Verifies the JWT token in the Authorization header
 */
exports.authenticateToken = async (req, res, next) => {
  try {
    // Get auth header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Extract token from "Bearer token"
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Check if token is in the revoked tokens list
    const revokedToken = await prisma.revokedToken.findUnique({
      where: { token }
    });
    
    if (revokedToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET);
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        twoFAEnabled: true,
        twoFAVerified: true,
        trustedDevices: {
          where: {
            expiresAt: { gt: new Date() }
          }
        }
      }
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Check if we need to verify trusted device status
    if (user.twoFAEnabled && !user.twoFAVerified) {
      // Get the trusted device cookie
      const deviceToken = req.cookies?.trusted_device;
      
      if (deviceToken) {
        // Check if this specific device token exists and is valid
        const trustedDevice = user.trustedDevices.find(device => 
          device.token === deviceToken && device.expiresAt > new Date()
        );
        
        if (trustedDevice) {
          console.log(`Trusted device found for user ${user.id}. Bypassing 2FA.`);
          // Update user's 2FA verification status in DB for the current session
          await prisma.user.update({
            where: { id: user.id },
            data: { twoFAVerified: true }
          });
          
          // Update the decoded token information
          user.twoFAVerified = true;
        } else {
          console.log(`No valid trusted device found for token ${deviceToken}`);
        }
      } else {
        console.log(`No trusted_device cookie found for user ${user.id}`);
      }
    }
    
    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      twoFAEnabled: user.twoFAEnabled,
      twoFAVerified: user.twoFAVerified
    };
    
    // Proceed to next middleware
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    return res.status(403).json({ error: 'Forbidden' });
  }
};

// middleware/auth.js - Improved require2FA middleware

/**
 * Require two-factor authentication middleware
 * Ensures user has completed 2FA verification if it's enabled
 */
exports.require2FA = async (req, res, next) => {
  try {
    // If user doesn't have 2FA enabled, continue
    if (!req.user.twoFAEnabled) {
      return next();
    }
    
    // If 2FA is already verified, continue
    if (req.user.twoFAVerified) {
      return next();
    }
    
    // Log all cookies for debugging
    console.log(`Checking 2FA for user ${req.user.id}. Cookies:`, req.cookies);
    
    // Check for trusted device cookie
    const deviceToken = req.cookies?.trusted_device;
    
    if (deviceToken) {
      try {
        // Get all trusted devices for this user
        const trustedDevices = await prisma.trustedDevice.findMany({
          where: {
            userId: req.user.id,
            expiresAt: { gt: new Date() }
          }
        });
        
        console.log(`Found ${trustedDevices.length} trusted devices for user ${req.user.id}`);
        
        // Check if this specific device token exists
        const trustedDevice = trustedDevices.find(device => device.token === deviceToken);
        
        if (trustedDevice) {
          console.log(`Trusted device verified for user ${req.user.id} with token ${deviceToken.substring(0, 10)}...`);
          
          // Update user's 2FA verification status
          await prisma.user.update({
            where: { id: req.user.id },
            data: { twoFAVerified: true }
          });
          
          // Update req.user
          req.user.twoFAVerified = true;
          
          // Continue
          return next();
        } else {
          console.log(`Invalid trusted device token for user ${req.user.id}: ${deviceToken.substring(0, 10)}...`);
        }
      } catch (error) {
        console.error('Error checking trusted device:', error);
      }
    } else {
      console.log(`No trusted_device cookie found for user ${req.user.id}`);
    }
    
    // 2FA required but not verified
    return res.status(403).json({
      error: '2FA verification required',
      twoFARequired: true
    });
  } catch (error) {
    console.error('Error in require2FA middleware:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Admin authorization middleware
 * Ensures the user has admin privileges
 */
exports.requireAdmin = async (req, res, next) => {
  try {
    // Check if user exists and has admin role
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true }
    });
    
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Proceed to next middleware
    next();
  } catch (error) {
    console.error('Admin authorization error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Resource owner middleware
 * Ensures the authenticated user owns the requested resource
 * 
 * @param {Function} getOwnerId Function that returns the owner ID of the resource
 */
exports.resourceOwner = (getOwnerId) => {
  return async (req, res, next) => {
    try {
      // Get owner ID of the resource
      const ownerId = await getOwnerId(req);
      
      // Check if user is the owner
      if (req.user.id !== ownerId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      // Proceed to next middleware
      next();
    } catch (error) {
      console.error('Resource owner check error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Optional authentication middleware
 * Attaches user info to the request if a token is provided, but doesn't require it
 */
exports.optionalAuth = async (req, res, next) => {
  // Get auth header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract token from "Bearer token"
  
  // If no token, continue without authentication
  if (!token) {
    return next();
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET);
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        twoFAEnabled: true,
        twoFAVerified: true
      }
    });
    
    if (user) {
      // Attach user info to request
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        twoFAEnabled: user.twoFAEnabled,
        twoFAVerified: user.twoFAVerified
      };
    }
  } catch (error) {
    // Don't return error for invalid token in optional auth
    console.error('Optional auth error:', error);
  }
  
  // Continue to next middleware
  next();
};