#!/bin/bash

# ============================================================================
# Railway Setup Script for VHM24
# ============================================================================
# This script helps configure Railway deployment with Supabase database
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Railway Token
RAILWAY_TOKEN="8d4d83d1-df06-48f1-9ed8-5bf24cc82b4a"

# Supabase Database Password
SUPABASE_PASSWORD="ucfbBVjbXhhKSrLi"
SUPABASE_HOST="db.ivndncmwohshbvpjbxcx.supabase.co"
SUPABASE_DB="postgres"
SUPABASE_USER="postgres"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   Railway & Supabase Setup for VHM24${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${YELLOW}Railway CLI not found. Installing...${NC}"
    npm install -g @railway/cli
    echo -e "${GREEN}✓ Railway CLI installed${NC}"
else
    echo -e "${GREEN}✓ Railway CLI is installed${NC}"
fi

# Login to Railway
echo -e "${YELLOW}Logging in to Railway...${NC}"
export RAILWAY_TOKEN="$RAILWAY_TOKEN"
railway login --browserless || railway login

echo -e "${GREEN}✓ Logged in to Railway${NC}"
echo ""

# Link project
echo -e "${YELLOW}Linking Railway project...${NC}"
cd "$(dirname "$0")/../backend" || exit 1

if [ ! -f ".railway" ]; then
    echo -e "${YELLOW}Please select your Railway project:${NC}"
    railway link
else
    echo -e "${GREEN}✓ Project already linked${NC}"
fi

echo ""

# Generate JWT secrets
echo -e "${YELLOW}Generating JWT secrets...${NC}"
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

echo -e "${GREEN}✓ JWT secrets generated${NC}"
echo ""

# Set Railway variables
echo -e "${YELLOW}Setting Railway environment variables...${NC}"

# Database (Supabase)
railway variables set DATABASE_HOST="$SUPABASE_HOST"
railway variables set DATABASE_PORT=5432
railway variables set DATABASE_USER="$SUPABASE_USER"
railway variables set DATABASE_PASSWORD="$SUPABASE_PASSWORD"
railway variables set DATABASE_NAME="$SUPABASE_DB"
railway variables set DATABASE_SSL=true

# Full DATABASE_URL
DATABASE_URL="postgresql://${SUPABASE_USER}:${SUPABASE_PASSWORD}@${SUPABASE_HOST}:5432/${SUPABASE_DB}"
railway variables set DATABASE_URL="$DATABASE_URL"

# JWT
railway variables set JWT_SECRET="$JWT_SECRET"
railway variables set JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET"
railway variables set JWT_ACCESS_EXPIRATION=15m
railway variables set JWT_REFRESH_EXPIRATION=7d

# Environment
railway variables set NODE_ENV=production
railway variables set PORT=3000

# Super Admin Telegram
railway variables set TELEGRAM_ADMIN_ID=42283329
railway variables set TELEGRAM_ADMIN_USERNAME=Jamshiddin
railway variables set SUPER_ADMIN_TELEGRAM_ID=42283329
railway variables set SUPER_ADMIN_USERNAME=Jamshiddin

# Redis (if using Railway Redis - will be auto-set)
# railway variables set REDIS_HOST=...
# railway variables set REDIS_PASSWORD=...

echo -e "${GREEN}✓ Environment variables set${NC}"
echo ""

# Display summary
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   Setup Summary${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "${GREEN}✓ Railway CLI installed and logged in${NC}"
echo -e "${GREEN}✓ Project linked${NC}"
echo -e "${GREEN}✓ Environment variables configured${NC}"
echo ""
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Add remaining variables in Railway Dashboard:"
echo "   - S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY"
echo "   - TELEGRAM_BOT_TOKEN (if using)"
echo "   - FRONTEND_URL"
echo "   - REDIS credentials (if using external Redis)"
echo ""
echo "2. Run migrations:"
echo "   railway run npm run migration:run"
echo ""
echo "3. Create Super Admin user:"
echo "   railway run npm run create-superadmin -- \\"
echo "     --email admin@vendhub.com \\"
echo "     --password YourSecurePassword123! \\"
echo "     --name \"Jamshiddin\" \\"
echo "     --telegram-id 42283329 \\"
echo "     --telegram-username Jamshiddin"
echo ""
echo "4. Deploy:"
echo "   railway up"
echo ""
echo -e "${BLUE}============================================${NC}"
