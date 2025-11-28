// middleware/csrf-protect.js
const crypto = require('crypto');

/**
 * CSRF Protection Middleware
 * 
 * Implements CSRF protection using double-submit cookie pattern:
 * 1. A secure, HTTP-only cookie with a CSRF token is set
 * 2. The same token must be included in requests as a header (X-CSRF-Token)
 * 3. For non-GET/HEAD requests, the middleware validates the token
 */

// Token generation
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Token verification - compare token from cookie with token from header
const verifyToken = (cookieToken, headerToken) => {
  if (!cookieToken || !headerToken) {
    return false;
  }
  
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(cookieToken, 'hex'),
    Buffer.from(headerToken, 'hex')
  );
};

/**
 * Middleware to set CSRF token cookie if not present
 */
exports.setCsrfCookie = (req, res, next) => {
  // Skip for paths that don't need CSRF protection
  const bypassPaths = [
    '/api/webhooks/',
    '/health',
    '/api/public/'
  ];
  
  if (bypassPaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  
  // Check if CSRF cookie exists
  const csrfCookie = req.cookies?.['csrf_token'];
  
  // If no cookie, generate token and set cookie
  if (!csrfCookie) {
    const csrfToken = generateToken();
    
    // Set the token as a secure, HTTP-only cookie
    res.cookie('csrf_token', csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    // Store token for potential exposure to client
    res.locals.csrfToken = csrfToken;
  } else {
    // Store existing token
    res.locals.csrfToken = csrfCookie;
  }
  
  next();
};

/**
 * Middleware to validate CSRF token
 */
exports.validateCsrfToken = (req, res, next) => {
  // Skip for GET, HEAD, OPTIONS requests (safe methods)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip for paths that don't need CSRF protection
  const bypassPaths = [
    '/api/webhooks/',
    '/health',
    '/api/public/'
  ];
  
  if (bypassPaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  
  // Get the CSRF token from cookie and header
  const cookieToken = req.cookies?.['csrf_token'];
  const headerToken = req.headers['x-csrf-token'];
  
  // Verify token
  if (!cookieToken || !headerToken || !verifyToken(cookieToken, headerToken)) {
    console.warn('CSRF validation failed', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      hasHeaderToken: !!headerToken,
      hasCookieToken: !!cookieToken
    });
    
    return res.status(403).json({
      error: 'CSRF validation failed. Invalid or missing CSRF token.'
    });
  }
  
  next();
};

/**
 * Middleware to expose CSRF token in a response header
 * This allows the frontend to get the token for use in subsequent requests
 */
exports.exposeCsrfToken = (req, res, next) => {
  // If token exists in locals (set by setCsrfCookie), add it to response headers
  if (res.locals.csrfToken) {
    res.setHeader('X-CSRF-Token', res.locals.csrfToken);
  }
  
  next();
};

/**
 * Combined CSRF protection middleware
 */
exports.csrfProtect = [
  exports.setCsrfCookie,
  exports.validateCsrfToken,
  exports.exposeCsrfToken
];

/**
 * Single function for easier import
 */
module.exports = (req, res, next) => {
  exports.setCsrfCookie(req, res, () => {
    exports.validateCsrfToken(req, res, () => {
      exports.exposeCsrfToken(req, res, next);
    });
  });
};