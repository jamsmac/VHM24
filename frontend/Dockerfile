# ============================================================================
# VendHub Manager Frontend - Production Dockerfile
# ============================================================================
# Build context: repository root (Railway uses full repo)

FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Cache buster - change this value to invalidate Docker cache
ARG CACHE_BUST=2025-12-22-v2

# Copy frontend package files (from repo root context)
# Note: Using --legacy-peer-deps to resolve @storybook/addon-vitest peer dependency conflict
# Note: Skipping package-lock.json to avoid "Invalid Version" error
COPY frontend/package.json ./
RUN npm install --legacy-peer-deps

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules

# Copy frontend source
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
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
