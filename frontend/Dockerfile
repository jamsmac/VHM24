# ============================================================================
# VendHub Manager Frontend - Production Dockerfile
# ============================================================================
# Build context: repository root (Railway monorepo)

FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy only frontend package files
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules

# Copy only frontend source
COPY frontend/ .

# Optional build-time args to override .env.production if provided
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_APP_NAME

# Only set ENV if ARG is provided (non-empty), otherwise use .env.production
RUN if [ -n "$NEXT_PUBLIC_API_URL" ]; then \
      echo "NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL" >> .env.production; \
    fi && \
    if [ -n "$NEXT_PUBLIC_WS_URL" ]; then \
      echo "NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL" >> .env.production; \
    fi && \
    if [ -n "$NEXT_PUBLIC_APP_NAME" ]; then \
      echo "NEXT_PUBLIC_APP_NAME=$NEXT_PUBLIC_APP_NAME" >> .env.production; \
    fi

RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
# PORT is set by Railway at runtime - do not hardcode here

# Health check for container orchestration
# Note: Railway has its own health check mechanism, but this provides local container health
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3000}/ || exit 1

# Use dumb-init to properly handle signals
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
