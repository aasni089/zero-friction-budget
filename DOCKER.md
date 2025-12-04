# Docker Deployment Guide

This document provides comprehensive instructions for containerizing and deploying the Zero Friction Budget application using Docker.

## Overview

The application consists of three main services:
- **Backend**: Express.js API with Prisma ORM (Node.js)
- **Frontend**: Next.js 14 application with TypeScript
- **Nginx**: Reverse proxy (production only)

## Architecture

### Multi-Stage Builds

Both backend and frontend use optimized multi-stage Docker builds:

**Backend** (`backend/Dockerfile`):
- Stage 1 (builder): Install all dependencies and generate Prisma client
- Stage 2 (production): Minimal production image with only runtime dependencies
- Image size: ~356MB
- Runs as non-root user: `nodejs` (uid 1001)
- Health check: `http://localhost:5000/health`

**Frontend** (`frontend/Dockerfile`):
- Stage 1 (deps): Install dependencies
- Stage 2 (builder): Build Next.js with standalone output
- Stage 3 (runner): Minimal production image
- Image size: ~217MB
- Runs as non-root user: `nextjs` (uid 1001)
- Health check: `http://localhost:3000`

## Local Development

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Environment files configured (`.env` for backend, `.env.local` for frontend)

### Starting Services

```bash
# Build and start both services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Development Configuration

The `docker-compose.yml` is optimized for local development:
- Hot-reload enabled via volume mounts
- Both services run `npm run dev`
- Health checks with service dependencies
- Custom network for inter-service communication

**Note**: For development, services run as root user to avoid permission issues with mounted volumes.

## Production Deployment

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- Domain name configured
- SSL certificates (via Certbot) or use HTTP initially

### Configuration

1. **Environment Variables**:
   - Create `backend/.env.production` with production settings
   - Create `frontend/.env.production` with production settings
   - Set `GITHUB_REPOSITORY_OWNER` in `docker-compose.prod.yml`

2. **Build and Push Images**:
   ```bash
   # Build backend
   docker build -t ghcr.io/YOUR_USERNAME/budget-tracker-backend:latest ./backend
   docker push ghcr.io/YOUR_USERNAME/budget-tracker-backend:latest

   # Build frontend
   docker build -t ghcr.io/YOUR_USERNAME/budget-tracker-frontend:latest ./frontend
   docker push ghcr.io/YOUR_USERNAME/budget-tracker-frontend:latest
   ```

3. **Deploy with Nginx**:
   ```bash
   # Start all services
   docker-compose -f docker-compose.prod.yml up -d

   # View logs
   docker-compose -f docker-compose.prod.yml logs -f
   ```

### SSL Configuration

The nginx configuration includes SSL support via Let's Encrypt:

1. **Initial Setup** (HTTP only):
   - Deploy with the current `nginx.conf` (SSL sections commented out)
   - Verify services are accessible via HTTP

2. **Obtain SSL Certificates**:
   ```bash
   # Run certbot manually first time
   docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
     --webroot --webroot-path=/var/www/certbot \
     -d your-domain.com
   ```

3. **Enable SSL**:
   - Uncomment the HTTPS server block in `nginx.conf`
   - Update `your-domain.com` with your actual domain
   - Restart nginx: `docker-compose -f docker-compose.prod.yml restart nginx`

### Resource Limits

Production services have resource limits configured:
- **Backend**: 1 CPU, 1GB RAM (512MB reserved)
- **Frontend**: 1 CPU, 1GB RAM (512MB reserved)
- **Nginx**: 0.5 CPU, 256MB RAM (128MB reserved)

Adjust these in `docker-compose.prod.yml` based on your server capacity.

## Security Features

### Container Security

1. **Non-root Users**:
   - Backend runs as `nodejs` user (uid 1001)
   - Frontend runs as `nextjs` user (uid 1001)
   - Prevents privilege escalation attacks

2. **Multi-stage Builds**:
   - Build tools and dev dependencies excluded from production images
   - Smaller attack surface
   - Reduced image size

3. **Health Checks**:
   - Automatic container restart on failure
   - Service dependency management
   - Monitoring integration ready

### Network Security

1. **Nginx Reverse Proxy**:
   - Single entry point for all traffic
   - Rate limiting configured (10 req/s for API, 5 req/min for auth)
   - SSL/TLS termination
   - Security headers (HSTS, X-Frame-Options, CSP, etc.)

2. **Internal Network**:
   - Backend and frontend not directly exposed
   - Communication through Docker network only

## Monitoring & Logs

### Log Management

All services use JSON file logging with rotation:
```bash
# View real-time logs
docker-compose -f docker-compose.prod.yml logs -f [service]

# View last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 [service]
```

Log rotation settings:
- Backend/Frontend: 50MB max size, 5 files retained
- Nginx: 10MB max size, 3 files retained

### Health Monitoring

Health check endpoints:
- Backend: `http://localhost:5000/health`
- Frontend: `http://localhost:3000` (or `/api/health` if available)

Health check configuration:
- Interval: 30 seconds
- Timeout: 10 seconds
- Start period: 40 seconds
- Retries: 3

## Troubleshooting

### Common Issues

1. **Build Fails - "npm ci" error**:
   - Ensure `package-lock.json` is not in `.dockerignore`
   - Run `npm install` locally to regenerate lock file

2. **Permission Denied on Volume Mounts**:
   - For development, `docker-compose.yml` uses `user: root` to avoid this
   - For production, no volume mounts are used

3. **Health Check Failing**:
   - Verify backend `/health` endpoint exists and returns 200
   - Check container logs: `docker logs <container_name>`
   - Increase `start_period` if app takes longer to start

4. **Frontend Build Fails**:
   - Ensure `output: "standalone"` is set in `next.config.ts`
   - Check for build errors in the Docker build output

5. **Nginx Can't Connect to Services**:
   - Verify all services are on the same Docker network
   - Check service names match nginx upstream configuration

### Image Size Issues

Current image sizes:
- Backend: ~356MB (includes Node.js, Prisma, bcrypt with native deps)
- Frontend: ~217MB (includes Node.js and Next.js standalone output)

To reduce sizes further:
- Use Alpine-based images (already implemented)
- Remove unnecessary dependencies from `package.json`
- Consider using `pnpm` instead of `npm` for smaller `node_modules`

## Best Practices

### Development

1. **Always use docker-compose** instead of raw docker commands
2. **Rebuild after dependency changes**: `docker-compose build`
3. **Clean up regularly**: `docker system prune -a`
4. **Use volume mounts** for hot-reload during development

### Production

1. **Use specific image tags** instead of `latest`
2. **Scan images for vulnerabilities**: `docker scan <image>`
3. **Keep images updated** with security patches
4. **Monitor resource usage**: `docker stats`
5. **Backup volumes** before updates
6. **Test in staging** before production deployment

## CI/CD Integration

The Docker setup is designed for GitHub Actions CI/CD:
- Images pushed to GitHub Container Registry (GHCR)
- Automatic builds on push to main
- Version tagging with git SHA and semver
- Health check validation before deployment

See Phase 6B for CI/CD pipeline configuration.

## Next Steps

After completing Docker containerization (Task 6.1):
- [ ] Task 6.2: Set up GitHub Actions CI/CD
- [ ] Task 6.3: Configure automated testing
- [ ] Task 6.4: Set up monitoring and alerting
- [ ] Task 6.5: Implement production deployment pipeline

## References

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Next.js Docker Deployment](https://nextjs.org/docs/deployment#docker-image)
- [Prisma in Docker](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [Nginx Reverse Proxy](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)
