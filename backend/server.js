// server.js
require('dotenv').config();
const express = require('express');
const swagger = require('./docs/swagger');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const compression = require('compression');
const jwt = require('jsonwebtoken');

// Logger
const logger = require('./config/logger');

// Import middleware
const { apiLimiter, authLimiter } = require('./middleware/rate-limit');
const { authenticateToken } = require('./middleware/auth');
const { handleUploadErrors } = require('./middleware/upload');

// Clean up jobs
const { cleanupRevokedTokens } = require('./utils/cleanup');
const { cleanupExpiredInvitations } = require('./utils/cleanup-invitations');

// Import routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const uploadRoutes = require('./routes/upload');
const householdRoutes = require('./routes/households');
const budgetRoutes = require('./routes/budgets');
const expenseRoutes = require('./routes/expenses');
const categoryRoutes = require('./routes/categories');
const dashboardRoutes = require('./routes/dashboard');

// Passport
const passport = require('passport');
const configurePassport = require('./config/passport');
const session = require('express-session');
const cookieParser = require('cookie-parser');

// Import auth configuration
const authConfig = require('./config/auth');


// Get allowed origins from environment variables
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim());

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // IMPORTANT: This allows cookies to be sent and received
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600 // Cache preflight request for 10 minutes
};


// Create Express app
const app = express();

// Basic middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
})); // Set security headers
app.use(cookieParser());
app.use(cors(corsOptions));
// Middleware to set CORS for all responses
app.use((req, res, next) => {
  // Log CORS headers for debugging
  if (process.env.NODE_ENV === 'development') {
    logger.debug('CORS Headers:', {
      origin: req.headers.origin,
      'access-control-allow-origin': res.getHeader('Access-Control-Allow-Origin'),
      'access-control-allow-credentials': res.getHeader('Access-Control-Allow-Credentials')
    });
  }
  
  // Make sure credentials are allowed for all responses
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});
app.use(compression()); // Compress responses
app.use(express.json({ limit: '1mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '1mb' })); // Parse URL-encoded bodies


// Session configuration for Passport
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());
configurePassport();

// Serve static files from the public directory
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Apply rate limiting conditionally based on environment
if (process.env.NODE_ENV === 'production') {
  // Global rate limiting
  app.use(apiLimiter);

  // Specific limiter for auth routes
  app.use('/auth', authLimiter);

  logger.info('✅ Rate limiting enabled in production mode');
} else {
  logger.info('⚠️ Rate limiting disabled in development mode');
}

// API routes
app.get('/auth/callback', (req, res) => {
  const token = req.query.token;
  
  if (!token) {
    return res.status(400).send(`
      <html>
        <head><title>Authentication Error</title></head>
        <body>
          <h1>Authentication Error</h1>
          <p>No token provided.</p>
          <script>
            setTimeout(() => {
              window.location.href = '/login';
            }, 2000);
          </script>
        </body>
      </html>
    `);
  }
  
  // Return an HTML page that stores the token in localStorage and redirects to the app
  res.send(`
    <html>
      <head><title>Authentication Successful</title></head>
      <body>
        <h1>Authentication Successful</h1>
        <p>You are being redirected...</p>
        <script>
          // Store the token in localStorage
          localStorage.setItem('authToken', '${token}');
          
          // Redirect to the app
          window.location.href = '/dashboard';
        </script>
      </body>
    </html>
  `);
});

// Google OAuth routes
app.get('/auth/google', passport.authenticate('google', { 
  scope: ['profile', 'email'] 
}));

app.get('/auth/callback/google', 
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/auth/login?error=Google%20authentication%20failed` 
  }),
  (req, res) => {
    // Generate JWT token
    const token = jwt.sign(
      { id: req.user.id, email: req.user.email },
      authConfig.jwt.secret,
      { expiresIn: authConfig.jwt.expiresIn }
    );
    
    // Redirect to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

// Serve Swagger docs
app.use('/api-docs', swagger.serve, swagger.setup);

// Route to export Swagger documentation as JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swagger.exportJson());
});

app.use('/auth', authRoutes);
app.use('/profile', profileRoutes);
app.use('/upload', uploadRoutes);

// Budget-tracker routes (Phase 2)
app.use('/households', householdRoutes);
app.use('/budgets', budgetRoutes);
app.use('/expenses', expenseRoutes);
app.use('/categories', categoryRoutes);
app.use('/dashboard', dashboardRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// File upload error handling
app.use(handleUploadErrors);

// Global error handling middleware
app.use((err, req, res, next) => {
  logger.error('Global error handler:', err);
  
  // Check if headers have already been sent
  if (res.headersSent) {
    return next(err);
  }
  
  // Development error handler - includes stack trace
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.status || 500).json({
      error: err.message,
      stack: err.stack
    });
  }
  
  // Production error handler - no stack traces leaked to user
  return res.status(err.status || 500).json({
    error: 'An unexpected error occurred'
  });
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found - The requested resource does not exist' });
});

// Optional: Export Swagger JSON to a file when the server starts
const exportSwaggerJson = () => {
  const outputPath = path.join(__dirname, 'swagger-docs.json');
  fs.writeFileSync(outputPath, swagger.exportJson());
  logger.info(`Swagger JSON exported to ${outputPath}`);
};

// List all registered routes before starting the server
const getAllRoutes = (app) => {
  const routes = [];
  const extractRoutes = (layer, parentPath = "") => {
    if (layer.route) {
      // If it's a route, extract method and path
      const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
      const fullPath = `${parentPath}${layer.route.path}`;
      routes.push({ methods, path: fullPath });
    } else if (layer.name === "router" && layer.handle.stack) {
      // If it's a router, recursively extract routes
      // Extract the path fragment from the regexp source
      let path = layer.regexp.source
        .replace("^\\/", "")
        .replace("\\/?(?=\\/|$)", "");
      
      // Ensure clean path formatting
      if (path && !path.startsWith('/')) {
        path = `/${path}`;
      }
      
      // Build the new parent path, ensuring there's a slash between segments
      const newParentPath = parentPath + (path || "");
      
      // Process subrouter's routes
      layer.handle.stack.forEach((subLayer) => {
        extractRoutes(subLayer, newParentPath);
      });
    }
  };

  app._router.stack.forEach(layer => extractRoutes(layer));

  // Sort routes by path for easier reading
  routes.sort((a, b) => a.path.localeCompare(b.path));

  logger.info("\n📌 **All Available Routes:**");
  logger.info(JSON.stringify(routes, null, 2));
  
  return routes;
};

// Call this function **after** all routes are defined
setTimeout(() => getAllRoutes(app), 1000);

// Run cleanup job every hour
const startCleanupJob = () => {
  setInterval(async () => {
    try {
      await cleanupRevokedTokens();
      await cleanupExpiredInvitations();
    } catch (error) {
      logger.error('Error running cleanup job:', error);
    }
  }, 60 * 60 * 1000); // 1 hour in milliseconds
};

// Start the server
const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, HOST, () => {
  logger.info(`Server running on ${HOST}:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  // exportSwaggerJson(); // Export Swagger JSON on startup
});

// Set the server timeout to 5 minutes
server.timeout = 300000; // 5 minutes in milliseconds

// Gracefully handle shutdown
const shutdown = (signal) => {
  logger.info(`\nReceived ${signal}, shutting down gracefully...`);
  server.close(() => {
    logger.info('Closed server connections.');
    process.exit(0);
  });

  // If not closed within 5 seconds, force exit
  setTimeout(() => {
    logger.error('Forcing shutdown due to timeout...');
    process.exit(1);
  }, 5000);
};

// Handle termination signals
process.on('SIGINT', shutdown);  // CTRL + C
process.on('SIGTERM', shutdown); // Docker/PM2/Deployment shutdown signal

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});