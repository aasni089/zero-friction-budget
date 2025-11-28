// config/auth.js

/**
 * Authentication Configuration
 * Contains settings for authentication and authorization
 */

module.exports = {
    // JWT configuration
    jwt: {
      secret: process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key',
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      algorithm: 'HS256'
    },
    
    // Google OAuth configuration
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: `${process.env.API_BASE_URL}/auth/google/callback`
    },
    
    // Email configuration for magic links
    email: {
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
      port: parseInt(process.env.EMAIL_SERVER_PORT || '587', 10),
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD
      }
    },
    
    // Two-factor authentication
    twoFactor: {
      enabled: process.env.ENABLE_2FA !== 'false',
      trustedDeviceDuration: parseInt(process.env.TRUSTED_DEVICE_DURATION || '2592000', 10), // 30 days in seconds
    },
    
    // Passwords
    password: {
      minLength: 8,
      requireSpecialChar: true,
      requireNumber: true,
      requireUppercase: true,
      requireLowercase: true
    },
    
    // Session configuration
    session: {
      maxAge: parseInt(process.env.SESSION_MAX_AGE || '3600', 10), // 1 hour in seconds
      updateAge: parseInt(process.env.SESSION_UPDATE_AGE || '1800', 10), // 30 minutes in seconds
    },
    
    // Cookies
    cookies: {
      prefix: process.env.COOKIE_PREFIX || 'proptech',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    },
    
    // Rate limiting for authentication requests
    rateLimit: {
      loginAttempts: parseInt(process.env.LOGIN_RATE_LIMIT || '5', 10), // 5 attempts
      window: parseInt(process.env.LOGIN_RATE_WINDOW || '300', 10), // 5 minutes in seconds
      blockDuration: parseInt(process.env.LOGIN_BLOCK_DURATION || '900', 10) // 15 minutes in seconds
    }
  };