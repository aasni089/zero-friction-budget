// routes/auth.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const prisma = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rate-limit');

// Import controllers
const oneTimeCodeController = require('../controllers/auth/one-time-code');
const twoFactorController = require('../controllers/auth/two-factor');
const profileController = require('../controllers/auth/profile');

/**
 * @swagger

/**
 * @swagger
 * /api/auth/login-code:
 *   post:
 *     summary: Request a one-time login code or register a new user
 *     description: |
 *       Sends a one-time login code to the user's email/phone.
 *       If a name is provided and the user doesn't exist, registers a new user.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               name:
 *                 type: string
 *                 description: User's name (include for registration)
 *     responses:
 *       200:
 *         description: Login code requested successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "If an account with this email exists, a login code has been sent"
 *                 isRegistration:
 *                   type: boolean
 *                   description: Indicates if a new account was created
 *       400:
 *         description: Bad request - missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Email is required"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to send login code"
 */
router.post('/login-code', oneTimeCodeController.requestLoginCode);

/**
 * @swagger
 * /api/auth/verify-login-code:
 *   post:
 *     summary: Verify one-time login code and authenticate user
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               code:
 *                 type: string
 *                 description: One-time login code received via email or SMS
 *               trustDevice:
 *                 type: boolean
 *                 description: Whether to trust this device for future logins
 *                 default: false
 *     responses:
 *       200:
 *         description: Authentication successful or 2FA required
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       description: JWT authentication token
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         twoFAEnabled:
 *                           type: boolean
 *                         twoFAVerified:
 *                           type: boolean
 *                         isNewUser:
 *                           type: boolean
 *                           description: Indicates if this is the user's first login
 *                     deviceToken:
 *                       type: string
 *                       description: Token for trusted device (optional)
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "2FA verification required"
 *                     tempToken:
 *                       type: string
 *                       description: Temporary token for 2FA verification
 *                     requiresTwoFactor:
 *                       type: boolean
 *                       example: true
 *                     twoFAMethod:
 *                       type: string
 *                       enum: [email, sms]
 *       400:
 *         description: Invalid input or expired code
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid email or code"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Authentication failed"
 */
router.post('/verify-login-code', oneTimeCodeController.verifyLoginCode);

/**
 * @swagger
 * /api/auth/resend-login-code:
 *   post:
 *     summary: Resend one-time login code
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *     responses:
 *       200:
 *         description: Login code resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "If an account with this email exists, a new login code has been sent"
 *       400:
 *         description: Bad request - missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Email is required"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to resend login code"
 */
router.post('/resend-login-code', oneTimeCodeController.resendLoginCode);

/**
 * @swagger
 * /api/auth/invalidate-login-code:
 *   post:
 *     summary: Invalidate a login code when the user cancels login
 *     description: |
 *       Clears any pending login code for the specified email.
 *       This should be called when a user cancels a login attempt.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *     responses:
 *       200:
 *         description: Login code invalidated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Login code invalidated successfully"
 *       400:
 *         description: Bad request - missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Email is required"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to invalidate login code"
 */
router.post('/invalidate-login-code', oneTimeCodeController.invalidateLoginCode);

/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Initiate Google OAuth authentication
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirects to Google authentication
 */
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'],
  prompt: 'select_account' // Force account selection even if already logged in
}));

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     summary: Handle Google OAuth callback
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: OAuth code from Google
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: State parameter for CSRF protection
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     success:
 *                       type: boolean
 *                     token:
 *                       type: string
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         image:
 *                           type: string
 *                         isNewUser:
 *                           type: boolean
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                     tempToken:
 *                       type: string
 *                     requiresTwoFactor:
 *                       type: boolean
 *                     twoFAMethod:
 *                       type: string
 *       302:
 *         description: Redirect with authentication data
 *       500:
 *         description: Authentication failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get('/google/callback', 
  passport.authenticate('google', { 
    session: false,
    failureRedirect: '/login?error=GoogleAuthFailed' 
  }),
  async (req, res) => {
    try {
      // At this point, req.user contains the authenticated user from Passport
      const user = req.user;
      const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
      
      // Check if the passport strategy already identified this as a trusted device
      if (user.trustedDevice) {
        console.log('Trusted device already verified in passport strategy');
        
        // Update the user to mark 2FA as verified for this session
        await prisma.user.update({
          where: { id: user.id },
          data: { twoFAVerified: true }
        });
        
        // Generate a token with 2FA marked as verified
        const jwt = require('jsonwebtoken');
        const authConfig = require('../config/auth');
        
        const token = jwt.sign(
          { 
            id: user.id, 
            email: user.email,
            twoFAEnabled: true,
            twoFAVerified: true // Mark as verified since device is trusted
          },
          authConfig.jwt.secret,
          { expiresIn: authConfig.jwt.expiresIn }
        );
        
        // Track if this is a new user for onboarding purposes
        const isNewUser = user.isNewUser || 
          (user.createdAt && user.createdAt > new Date(Date.now() - 60 * 1000));
        
        // For API clients
        if (req.headers.accept?.includes('application/json')) {
          return res.json({
            success: true,
            token,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              image: user.image,
              isNewUser,
              twoFAVerified: true
            }
          });
        }
        
        // For browser clients, redirect to the frontend with token
        const redirectParams = new URLSearchParams({
          token: token,
          provider: 'google'
        });
        
        if (isNewUser) {
          redirectParams.append('isNewUser', 'true');
        }
        
        return res.redirect(`${frontendURL}/auth/callback?${redirectParams.toString()}`);
      }
      
      // Handle 2FA if enabled or explicitly required by the passport strategy
      if (user.twoFAEnabled || user.requiresTwoFactor) {
        // Generate temporary token for 2FA
        const jwt = require('jsonwebtoken');
        const authConfig = require('../config/auth');
        
        const tempToken = jwt.sign(
          { 
            id: user.id, 
            email: user.email,
            requiresTwoFactor: true
          },
          authConfig.jwt.secret,
          { expiresIn: '5m' }
        );
        
        // For API clients
        if (req.headers.accept?.includes('application/json')) {
          return res.json({
            message: '2FA verification required',
            tempToken,
            requiresTwoFactor: true,
            twoFAMethod: user.twoFAMethod || 'email'
          });
        }
        
        // For browser clients, redirect to auth callback with verify flag
        return res.redirect(
          `${frontendURL}/auth/callback?token=${tempToken}&verify=true&provider=google`
        );
      }
      
      // Generate JWT token for successful authentication
      const jwt = require('jsonwebtoken');
      const authConfig = require('../config/auth');
      
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
      
      // Track if this is a new user for onboarding purposes
      const isNewUser = user.isNewUser || 
        (user.createdAt && user.createdAt > new Date(Date.now() - 60 * 1000));
      
      // For API clients
      if (req.headers.accept?.includes('application/json')) {
        return res.json({
          success: true,
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            isNewUser
          }
        });
      }
      
      // For browser clients, redirect to the auth callback page
      const redirectParams = new URLSearchParams({
        token: token,
        provider: 'google'
      });
      
      if (isNewUser) {
        redirectParams.append('isNewUser', 'true');
      }
      
      return res.redirect(`${frontendURL}/auth/callback?${redirectParams.toString()}`);
    } catch (error) {
      console.error('Error handling Google callback:', error);
      
      // For API clients
      if (req.headers.accept?.includes('application/json')) {
        return res.status(500).json({ error: 'Authentication failed' });
      }
      
      // For browser clients
      const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendURL}/login?error=AuthError&message=${encodeURIComponent(error.message || 'Authentication failed')}`);
    }
  }
);


/**
 * @swagger
 * /api/auth/verify-2fa:
 *   post:
 *     summary: Verify two-factor authentication code
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *               trustDevice:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 2FA verification successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     twoFAVerified:
 *                       type: boolean
 *                 deviceToken:
 *                   type: string
 *                   description: Only included if trustDevice is true
 *       400:
 *         description: Invalid verification code
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Failed to verify 2FA code
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post('/verify-2fa', authenticateToken, twoFactorController.verify2FA);

/**
 * @swagger
 * /api/auth/2fa/configure:
 *   post:
 *     summary: Configure two-factor authentication settings
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - enabled
 *               - method
 *             properties:
 *               enabled:
 *                 type: boolean
 *               method:
 *                 type: string
 *                 enum: [email, sms]
 *               phoneNumber:
 *                 type: string
 *                 description: Required when method is 'sms'
 *     responses:
 *       200:
 *         description: 2FA configuration updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     twoFAEnabled:
 *                       type: boolean
 *                     twoFAMethod:
 *                       type: string
 *                     phoneNumber:
 *                       type: string
 *                 requiresVerification:
 *                   type: boolean
 *                 method:
 *                   type: string
 *       400:
 *         description: Invalid configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 field:
 *                   type: string
 *       500:
 *         description: Failed to configure 2FA
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post('/2fa/configure', authenticateToken, twoFactorController.configure2FA);

/**
 * @swagger
 * /api/auth/2fa/resend-code:
 *   post:
 *     summary: Resend two-factor authentication code
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Verification code resent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 method:
 *                   type: string
 *                   enum: [email, sms]
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Failed to resend verification code
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post('/2fa/resend-code', authenticateToken, twoFactorController.resend2FACode);

/**
 * @swagger
 * /api/auth/verify-login-2fa:
 *   post:
 *     summary: Verify 2FA during login flow
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - tempToken
 *             properties:
 *               code:
 *                 type: string
 *               tempToken:
 *                 type: string
 *               trustDevice:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 2FA verification successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     twoFAVerified:
 *                       type: boolean
 *                     twoFAEnabled:
 *                       type: boolean
 *                 deviceToken:
 *                   type: string
 *                   description: Only included if trustDevice is true
 *       400:
 *         description: Invalid verification code
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 attemptsRemaining:
 *                   type: number
 *                 maxAttemptsReached:
 *                   type: boolean
 *       401:
 *         description: Invalid token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Failed to verify 2FA code
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post('/verify-login-2fa', twoFactorController.verifyLoginWith2FA);

/**
 * @swagger
 * /api/auth/2fa/cancel-setup:
 *   post:
 *     summary: Cancel the 2FA setup process
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA setup cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Failed to cancel 2FA setup
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post('/2fa/cancel-setup', authenticateToken, twoFactorController.cancel2FASetup);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     image:
 *                       type: string
 *                     phoneNumber:
 *                       type: string
 *                     preferredAuthMethod:
 *                       type: string
 *                     allowAccountLinking:
 *                       type: boolean
 *                     twoFA:
 *                       type: object
 *                       properties:
 *                         enabled:
 *                           type: boolean
 *                         method:
 *                           type: string
 *                     authProviders:
 *                       type: array
 *                       items:
 *                         type: string
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Failed to fetch profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get('/profile', authenticateToken, profileController.getProfile);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Log out user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       400:
 *         description: No token provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Failed to log out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post('/logout', authenticateToken, profileController.logout);

/**
 * @swagger
 * /api/auth/account-settings:
 *   patch:
 *     summary: Update account settings
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               preferredAuthMethod:
 *                 type: string
 *                 enum: [one_time_code, google]
 *               phoneNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Account settings updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     phoneNumber:
 *                       type: string
 *                     preferredAuthMethod:
 *                       type: string
 *                     allowAccountLinking:
 *                       type: boolean
 *       400:
 *         description: Invalid auth method
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 field:
 *                   type: string
 *       500:
 *         description: Failed to update account settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.patch('/account-settings', authenticateToken, profileController.updateAccountSettings);

/**
 * @swagger
 * /api/auth/notification-preferences:
 *   patch:
 *     summary: Update notification preferences
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               preferredLoginMethod:
 *                 type: string
 *                 enum: [email, sms]
 *                 description: Preferred method for receiving login codes
 *               twoFAMethod:
 *                 type: string
 *                 enum: [email, sms]
 *                 description: Preferred method for receiving 2FA codes
 *               phoneNumber:
 *                 type: string
 *                 description: Phone number for SMS notifications (required for SMS methods)
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     phoneNumber:
 *                       type: string
 *                     preferredLoginMethod:
 *                       type: string
 *                     twoFAMethod:
 *                       type: string
 *       400:
 *         description: Bad request - invalid input
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Phone number is required for SMS notifications"
 *                 field:
 *                   type: string
 *                   example: "phoneNumber"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to update notification preferences"
 */
router.patch('/notification-preferences', authenticateToken, profileController.updateNotificationPreferences);

/**
 * @swagger
 * /api/auth/linking-preferences:
 *   patch:
 *     summary: Update account linking preferences
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - allowAccountLinking
 *             properties:
 *               allowAccountLinking:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Account linking preferences updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 allowAccountLinking:
 *                   type: boolean
 *       400:
 *         description: Missing parameter
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Failed to update account linking preferences
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.patch('/linking-preferences', authenticateToken, profileController.updateLinkingPreferences);

module.exports = router;