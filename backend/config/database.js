// config/database.js
const { PrismaClient } = require('@prisma/client');

/**
 * Database client configuration
 * Creates a singleton instance of PrismaClient for Supabase PostgreSQL
 * Connection string is configured via DATABASE_URL in .env
 *
 * IMPORTANT: Uses global singleton pattern to prevent multiple instances
 * in development with hot-reloading (which causes connection pool exhaustion)
 */

// Configure log levels based on environment
const logLevels = process.env.NODE_ENV === 'development'
  ? ['query', 'info', 'warn', 'error']
  : ['warn', 'error'];

// Singleton pattern: Reuse existing client in development to prevent connection exhaustion
let prisma;

if (process.env.NODE_ENV === 'production') {
  // In production, create a new client
  prisma = new PrismaClient({
    log: logLevels,
    errorFormat: 'minimal'
  });
} else {
  // In development, reuse the client across hot reloads
  if (!global.prisma) {
    global.prisma = new PrismaClient({
      log: logLevels,
      errorFormat: 'pretty'
    });
  }
  prisma = global.prisma;
}

// Set up event listeners for connection issues
prisma.$on('query', (e) => {
  if (process.env.DEBUG_SQL === 'true') {
    console.log('Query: ' + e.query);
    console.log('Params: ' + e.params);
    console.log('Duration: ' + e.duration + 'ms');
  }
});

// Connect to database and handle connection errors
prisma.$connect()
  .then(() => {
    console.log('Database connected successfully');
  })
  .catch((error) => {
    console.error('Database connection error:', error);
    
    // Don't exit process in development to allow for reconnection
    if (process.env.NODE_ENV !== 'development') {
      process.exit(1);
    }
  });

// Handle process termination to close database connections
const handleShutdown = async () => {
  console.log('Closing database connections...');
  await prisma.$disconnect();
  console.log('Database connections closed');
};

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

// Export the Prisma client instance
module.exports = prisma;