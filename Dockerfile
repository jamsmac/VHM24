# Root Dockerfile for Railway deployment
# Railway uses the repository root as the build context
# This file delegates to the frontend Dockerfile
FROM node:20-alpine AS base

# Copy the entire frontend directory (Railway copies from repo root)
COPY frontend /app

WORKDIR /app

# Run the frontend build process
RUN apk add --no-cache libc6-compat
RUN npm install --legacy-peer-deps
RUN npm run build

# Create a runtime image
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV production

# Copy built artifacts
COPY --from=base /app/public ./public
COPY --from=base /app/.next ./.next
COPY --from=base /app/node_modules ./node_modules

EXPOSE 3000

CMD ["npm", "start"]
