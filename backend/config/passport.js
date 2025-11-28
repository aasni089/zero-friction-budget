// config/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const prisma = require('./database');
const { encrypt } = require('../utils/encryption');
const { sendVerificationCode: sendEmailCode } = require('../utils/email');
const { sendVerificationCode: sendSMSCode } = require('../utils/sms');

module.exports = function configurePassport() {
  // Serialize user to the session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from the session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id }
      });
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Configure Google Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${process.env.API_BASE_URL}/auth/google/callback`,
        passReqToCallback: true, // This is important to access the request
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          // Extract email from profile
          const email = profile.emails?.[0]?.value;
          
          if (!email) {
            return done(new Error('No email found in Google profile'), null);
          }
          
          // Check if user already exists
          let user = await prisma.user.findUnique({
            where: { email }
          });
          
          // Handle user creation or update (your existing code)
          // ...
  
          // Fetch the updated user
          const updatedUser = await prisma.user.findUnique({
            where: { id: user.id }
          });
          
          // Check if 2FA is enabled for this user
          if (updatedUser.twoFAEnabled) {
            // IMPORTANT: First check if this device is already trusted before generating a code
            const trustedDeviceToken = req.cookies?.trusted_device;
            
            if (trustedDeviceToken) {
              // Check if this device token is valid for this user
              try {
                const trustedDevice = await prisma.trustedDevice.findFirst({
                  where: {
                    userId: updatedUser.id,
                    token: trustedDeviceToken,
                    expiresAt: { gt: new Date() }
                  }
                });
                
                if (trustedDevice) {
                  console.log(`Trusted device found for user ${updatedUser.id}. Bypassing 2FA.`);
                  // Set flag to indicate device is trusted
                  updatedUser.trustedDevice = true;
                  // Return without generating a 2FA code
                  return done(null, updatedUser);
                }
              } catch (err) {
                console.error('Error checking trusted device:', err);
              }
            }
            
            // If we reach here, the device is not trusted, so generate a 2FA code
            // Generate verification code
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            const encryptedCode = encrypt(code);
            
            // Update user with code
            await prisma.user.update({
              where: { id: updatedUser.id },
              data: { 
                twoFASecret: encryptedCode,
                twoFAVerificationAttempts: 0  // Reset attempts counter
              }
            });
            
            // Send verification code via preferred method
            if (updatedUser.twoFAMethod === 'sms' && updatedUser.phoneNumber) {
              await sendSMSCode(updatedUser.phoneNumber, code);
            } else {
              // Default to email
              await sendEmailCode(updatedUser.email, code, updatedUser.name);
            }
            
            // Set flag for 2FA required
            updatedUser.requiresTwoFactor = true;
            updatedUser.twoFAMethod = updatedUser.twoFAMethod || 'email';
          }
          
          return done(null, updatedUser);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
};