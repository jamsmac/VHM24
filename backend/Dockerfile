# ============================================================================
# VendHub Manager Backend - Production Dockerfile
# ============================================================================
# Build context: repository root (Railway monorepo)

# ----------------------------------------------------------------------------
# Stage 1: Dependencies
# ----------------------------------------------------------------------------
FROM node:20-alpine AS dependencies

WORKDIR /app

# Copy only backend package files
COPY backend/package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm install --legacy-peer-deps

# ----------------------------------------------------------------------------
# Stage 2: Build
# ----------------------------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy only backend source code
COPY backend/ .

# Build the application using nest CLI directly
RUN ./node_modules/.bin/nest build

# Remove dev dependencies
RUN npm prune --production --legacy-peer-deps

# ----------------------------------------------------------------------------
# Stage 3: Production
# ----------------------------------------------------------------------------
FROM node:20-alpine AS production

# Set environment to production
ENV NODE_ENV=production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy package files
COPY --chown=nestjs:nodejs backend/package*.json ./

# Copy production dependencies
COPY --chown=nestjs:nodejs --from=build /app/node_modules ./node_modules

# Copy built application
COPY --chown=nestjs:nodejs --from=build /app/dist ./dist

# Copy startup script
COPY --chown=nestjs:nodejs --from=build /app/startup.sh ./startup.sh
RUN chmod +x ./startup.sh

# Copy TypeORM config for migrations
COPY --chown=nestjs:nodejs --from=build /app/typeorm-migrations-only.config.js ./typeorm-migrations-only.config.js

# Create necessary directories with proper permissions
RUN mkdir -p /app/uploads /app/temp/voice && \
    chown -R nestjs:nodejs /app/uploads /app/temp

# Switch to non-root user
USER nestjs

# Expose application port (Railway assigns PORT dynamically)
EXPOSE 3000

# Health check using PORT environment variable
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "const port = process.env.PORT || 3000; require('http').get('http://localhost:' + port + '/health/live', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application via startup script
CMD ["./startup.sh"]
