// middleware/api-security.js

/**
 * API Security Middleware
 * 
 * Implements several security measures:
 * 1. Trusted Origin Verification - Checks if the request is coming from an allowed origin
 * 2. API Key Validation - Validates API keys for non-browser clients
 * 3. DOS Protection - Blocks requests with suspicious patterns
 */

// List of allowed origins
const ALLOWED_ORIGINS = [
    // localhost origins for development
    'http://localhost:3000',
    'http://localhost:4000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4000',
    
    // Add your production domains here
    process.env.FRONTEND_URL,
    process.env.DASHBOARD_URL
  ].filter(Boolean); // Remove any undefined values
  
  // Check for trusted origins
  const isTrustedOrigin = (origin) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return true;
    
    return ALLOWED_ORIGINS.some(allowed => {
      // Exact match
      if (allowed === origin) return true;
      
      // Wildcard subdomain match (e.g. *.example.com)
      if (allowed.startsWith('*.')) {
        const domain = allowed.substring(2);
        return origin.endsWith(domain) && origin.includes('.');
      }
      
      return false;
    });
  };
  
  // Validate API key (for non-browser clients)
  const isValidApiKey = (apiKey) => {
    if (!apiKey) return false;
    
    // Get API keys from environment variables
    const validApiKeys = (process.env.API_KEYS || '').split(',').filter(Boolean);
    
    return validApiKeys.includes(apiKey);
  };
  
  // Check for suspicious request patterns
  const isSuspiciousRequest = (req) => {
    // Check for missing or suspicious User-Agent
    const userAgent = req.headers['user-agent'] || '';
    if (!userAgent || userAgent.length < 5) {
      return true;
    }
    
    // Check for suspicious Headers combinations
    const acceptHeader = req.headers['accept'] || '';
    const contentType = req.headers['content-type'] || '';
    
    // Detect some common bot patterns or request forgeries
    if (
      (contentType.includes('application/json') && acceptHeader === '') ||
      (userAgent.includes('curl') && req.headers['origin']) || // curl requests shouldn't have an origin
      (userAgent.includes('python') && req.headers['origin'])  // python requests shouldn't have an origin
    ) {
      return true;
    }
    
    return false;
  };
  
  /**
   * Main API security middleware function
   */
  const secureAPI = (req, res, next) => {
    // Skip security checks for certain paths
    const bypassPaths = [
      '/api/webhooks/', // Skip for webhook endpoints
      '/health',        // Skip for health checks
      '/api/public/'    // Skip for public API endpoints
    ];
    
    // Check if the path should bypass security
    const shouldBypass = bypassPaths.some(path => req.path.startsWith(path));
    if (shouldBypass) {
      return next();
    }
    
    // 1. Check origin (for browser requests)
    const origin = req.headers.origin;
    if (origin && !isTrustedOrigin(origin)) {
      console.warn(`Blocked request from untrusted origin: ${origin}`);
      return res.status(403).json({ error: 'Access denied: Untrusted origin' });
    }
    
    // 2. Check API key for non-browser clients (when origin is missing)
    if (!origin) {
      const apiKey = req.headers['x-api-key'];
      if (!isValidApiKey(apiKey)) {
        console.warn('Blocked request with invalid API key');
        return res.status(403).json({ error: 'Access denied: Invalid API key' });
      }
    }
    
    // 3. Check for suspicious patterns
    if (isSuspiciousRequest(req)) {
      console.warn('Blocked suspicious request', {
        ip: req.ip,
        path: req.path,
        userAgent: req.headers['user-agent']
      });
      return res.status(403).json({ error: 'Access denied: Suspicious request pattern' });
    }
    
    // 4. Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Frame-Options', 'DENY');
    
    // All checks passed, proceed to the next middleware
    next();
  };
  
  module.exports = secureAPI;