// middleware/rate-limit.js
const { RateLimiterMemory } = require('rate-limiter-flexible');

/**
 * In-memory store for rate limiting
 * For production, consider using RateLimiterRedis or similar
 */

// General API rate limiter (100 requests per 15 minutes)
const apiLimiterOptions = {
  points: 100, // Number of points
  duration: 15 * 60, // Per 15 minutes
  blockDuration: 10 * 60, // Block for 10 minutes if exceeded
};
const apiRateLimiter = new RateLimiterMemory(apiLimiterOptions);

// Authentication-related routes rate limiter (more strict)
const authLimiterOptions = {
  points: 10, // Number of points
  duration: 60 * 60, // Per hour
  blockDuration: 60 * 60, // Block for an hour if exceeded
};
const authRateLimiter = new RateLimiterMemory(authLimiterOptions);

// Search routes rate limiter
const searchLimiterOptions = {
  points: 30, // Number of points
  duration: 60, // Per minute
  blockDuration: 5 * 60, // Block for 5 minutes if exceeded
};
const searchRateLimiter = new RateLimiterMemory(searchLimiterOptions);

// Upload routes rate limiter
const uploadLimiterOptions = {
  points: 20, // Number of points
  duration: 60 * 60, // Per hour
  blockDuration: 30 * 60, // Block for 30 minutes if exceeded
};
const uploadRateLimiter = new RateLimiterMemory(uploadLimiterOptions);

/**
 * Get appropriate rate limiter based on route
 */
const getRateLimiter = (req) => {
  const path = req.path.toLowerCase();
  
  if (path.includes('/auth') || path.includes('/login') || path.includes('/signup')) {
    return authRateLimiter;
  }
  
  if (path.includes('/search')) {
    return searchRateLimiter;
  }
  
  if (path.includes('/upload')) {
    return uploadRateLimiter;
  }
  
  return apiRateLimiter;
};

/**
 * Get client identifier for rate limiting
 * Uses IP or X-Forwarded-For header if behind a proxy
 */
const getClientIdentifier = (req) => {
  // If user is authenticated, use their ID (allows higher limits for logged-in users)
  if (req.user?.id) {
    return `user_${req.user.id}`;
  }
  
  // Get client IP
  const clientIp = 
    req.headers['x-forwarded-for']?.split(',')[0] || 
    req.socket.remoteAddress || 
    '0.0.0.0';
  
  return clientIp;
};

/**
 * General rate limiting middleware
 */
exports.rateLimit = async (req, res, next) => {
  // Skip rate limiting for certain paths
  const bypassPaths = [
    '/api/webhooks/',
    '/health',
    '/api/internal/'
  ];
  
  if (bypassPaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  
  // Get appropriate rate limiter and client identifier
  const rateLimiter = getRateLimiter(req);
  const clientId = getClientIdentifier(req);
  
  try {
    // Execute rate limiting
    const rateLimiterRes = await rateLimiter.consume(clientId);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', rateLimiter.points);
    res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString());
    
    // Continue to next middleware
    next();
  } catch (rejRes) {
    // Too many requests - set appropriate headers and return 429 response
    if (rejRes.msBeforeNext) {
      res.setHeader('Retry-After', Math.ceil(rejRes.msBeforeNext / 1000));
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rejRes.msBeforeNext).toISOString());
    }
    
    res.status(429).json({
      error: 'Too many requests, please try again later',
      retryAfter: Math.ceil((rejRes.msBeforeNext || 60000) / 1000)
    });
  }
};

/**
 * Authentication-specific rate limiting middleware
 */
exports.authLimiter = async (req, res, next) => {
  const clientId = getClientIdentifier(req);
  
  try {
    // Execute rate limiting
    const rateLimiterRes = await authRateLimiter.consume(clientId);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', authRateLimiter.points);
    res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString());
    
    // Continue to next middleware
    next();
  } catch (rejRes) {
    // Too many requests - set appropriate headers and return 429 response
    if (rejRes.msBeforeNext) {
      res.setHeader('Retry-After', Math.ceil(rejRes.msBeforeNext / 1000));
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rejRes.msBeforeNext).toISOString());
    }
    
    res.status(429).json({
      error: 'Too many authentication attempts, please try again later',
      retryAfter: Math.ceil((rejRes.msBeforeNext || 60000) / 1000)
    });
  }
};

/**
 * Search-specific rate limiting middleware
 */
exports.searchLimiter = async (req, res, next) => {
  const clientId = getClientIdentifier(req);
  
  try {
    // Execute rate limiting
    const rateLimiterRes = await searchRateLimiter.consume(clientId);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', searchRateLimiter.points);
    res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString());
    
    // Continue to next middleware
    next();
  } catch (rejRes) {
    // Too many requests - set appropriate headers and return 429 response
    if (rejRes.msBeforeNext) {
      res.setHeader('Retry-After', Math.ceil(rejRes.msBeforeNext / 1000));
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rejRes.msBeforeNext).toISOString());
    }
    
    res.status(429).json({
      error: 'Too many search requests, please try again later',
      retryAfter: Math.ceil((rejRes.msBeforeNext || 60000) / 1000)
    });
  }
};

/**
 * Upload-specific rate limiting middleware
 */
exports.uploadLimiter = async (req, res, next) => {
  const clientId = getClientIdentifier(req);
  
  try {
    // Execute rate limiting
    const rateLimiterRes = await uploadRateLimiter.consume(clientId);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', uploadRateLimiter.points);
    res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString());
    
    // Continue to next middleware
    next();
  } catch (rejRes) {
    // Too many requests - set appropriate headers and return 429 response
    if (rejRes.msBeforeNext) {
      res.setHeader('Retry-After', Math.ceil(rejRes.msBeforeNext / 1000));
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rejRes.msBeforeNext).toISOString());
    }
    
    res.status(429).json({
      error: 'Too many upload requests, please try again later',
      retryAfter: Math.ceil((rejRes.msBeforeNext || 60000) / 1000)
    });
  }
};

// Export all limiters
module.exports = {
  rateLimit: exports.rateLimit,
  apiLimiter: exports.rateLimit,
  authLimiter: exports.authLimiter,
  searchLimiter: exports.searchLimiter,
  uploadLimiter: exports.uploadLimiter
};