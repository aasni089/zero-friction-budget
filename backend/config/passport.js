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
            where: { email },
            include: {
              accounts: true
            }
          });

          let isNewUser = false;

          if (!user) {
            // Create new user
            user = await prisma.user.create({
              data: {
                email,
                name: profile.displayName || profile.name?.givenName || email.split('@')[0],
                image: profile.photos?.[0]?.value,
                emailVerified: true,
                accounts: {
                  create: {
                    provider: 'google',
                    providerAccountId: profile.id,
                    accessToken,
                    refreshToken,
                    expiresAt: new Date(Date.now() + 3600000) // 1 hour from now
                  }
                }
              },
              include: {
                accounts: true
              }
            });
            isNewUser = true;
          } else {
            // User exists, check if Google account is linked
            const googleAccount = user.accounts?.find(acc => acc.provider === 'google');

            if (!googleAccount) {
              // Link Google account to existing user
              await prisma.account.create({
                data: {
                  userId: user.id,
                  provider: 'google',
                  providerAccountId: profile.id,
                  accessToken,
                  refreshToken,
                  expiresAt: new Date(Date.now() + 3600000)
                }
              });
            } else {
              // Update existing Google account tokens
              await prisma.account.update({
                where: { id: googleAccount.id },
                data: {
                  accessToken,
                  refreshToken,
                  expiresAt: new Date(Date.now() + 3600000)
                }
              });
            }

            // Update user image if not set
            if (!user.image && profile.photos?.[0]?.value) {
              user = await prisma.user.update({
                where: { id: user.id },
                data: { image: profile.photos[0].value }
              });
            }
          }

          // Fetch the updated user
          const updatedUser = await prisma.user.findUnique({
            where: { id: user.id }
          });

          // Mark as new user if applicable
          if (isNewUser) {
            updatedUser.isNewUser = true;
          }
          
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
                verificationAttempts: 0  // Reset attempts counter
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