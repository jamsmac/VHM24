# ============================================================================
# VendHub Manager Backend - Production Dockerfile
# ============================================================================
# Build context: backend/ directory

# ----------------------------------------------------------------------------
# Stage 1: Build
# ----------------------------------------------------------------------------
FROM node:20-alpine AS build

# Cache buster - change this value to force rebuild
ARG CACHEBUST=2024122202

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm cache clean --force && npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application (use npx as fallback for symlink issues)
RUN ./node_modules/.bin/nest build || npx @nestjs/cli build

# Remove dev dependencies after build
RUN npm prune --production --legacy-peer-deps

# ----------------------------------------------------------------------------
# Stage 2: Production
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

# Copy package files and configs directly from context
COPY --chown=nestjs:nodejs package*.json ./
COPY --chown=nestjs:nodejs startup.sh ./startup.sh
COPY --chown=nestjs:nodejs typeorm-migrations-only.config.js ./typeorm-migrations-only.config.js
RUN chmod +x ./startup.sh

# Copy production dependencies from build stage
COPY --chown=nestjs:nodejs --from=build /app/node_modules ./node_modules

# Copy built application from build stage
COPY --chown=nestjs:nodejs --from=build /app/dist ./dist

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
