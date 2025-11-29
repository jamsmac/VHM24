# ============================================================================
# VendHub Manager - Production-Ready Multi-Stage Dockerfile
# ============================================================================

# ----------------------------------------------------------------------------
# Stage 1: Dependencies
# ----------------------------------------------------------------------------
FROM node:18-alpine AS dependencies

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
# Using npm install with legacy-peer-deps for better compatibility
RUN npm install --legacy-peer-deps

# ----------------------------------------------------------------------------
# Stage 2: Build
# ----------------------------------------------------------------------------
FROM node:18-alpine AS build

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies with legacy peer deps for compatibility
RUN npm prune --production --legacy-peer-deps

# ----------------------------------------------------------------------------
# Stage 3: Production
# ----------------------------------------------------------------------------
FROM node:18-alpine AS production

# Set environment to production
ENV NODE_ENV=production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy package files
COPY --chown=nestjs:nodejs package*.json ./

# Copy production dependencies
COPY --chown=nestjs:nodejs --from=build /app/node_modules ./node_modules

# Copy built application
COPY --chown=nestjs:nodejs --from=build /app/dist ./dist

# Create necessary directories with proper permissions
RUN mkdir -p /app/uploads /app/temp/voice && \
    chown -R nestjs:nodejs /app/uploads /app/temp

# Switch to non-root user
USER nestjs

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health/live', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/main"]
