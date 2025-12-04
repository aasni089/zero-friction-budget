# Multi-stage build for production-optimized backend
# Stage 1: Builder - Install all dependencies and generate Prisma client
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies (required for native modules like bcrypt)
RUN apk add --no-cache python3 make g++

# Copy package files first for better layer caching
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies for Prisma generation)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy application source code
COPY . .

# Stage 2: Production - Create minimal production image
FROM node:20-alpine AS production

# Install only curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy Prisma schema and generated client from builder
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy application source code
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

# Expose application port
EXPOSE 5000

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# Start the application (using node directly, not npm)
CMD ["node", "server.js"]
