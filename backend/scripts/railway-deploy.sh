#!/bin/bash

# ============================================================================
# Deploy to Railway with Migrations
# ============================================================================
# This script deploys to Railway and applies migrations
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   Railway Deployment${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Check Railway CLI
if ! command -v railway &> /dev/null; then
  echo -e "${RED}❌ Railway CLI not found${NC}"
  echo "Install with: npm install -g @railway/cli"
  exit 1
fi

# Check if linked
if [ ! -f ".railway" ]; then
  echo -e "${YELLOW}⚠ Not linked to Railway project${NC}"
  echo "Linking now..."
  railway link
fi

echo -e "${YELLOW}Step 1: Running migrations on Railway...${NC}"
railway run npm run migration:run

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Migrations failed${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✓ Migrations applied${NC}"
echo ""

echo -e "${YELLOW}Step 2: Deploying to Railway...${NC}"
railway up

if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✅ Deployment successful!${NC}"
  echo ""
  echo -e "${YELLOW}Check deployment status:${NC}"
  echo "  railway status"
  echo "  railway logs"
else
  echo ""
  echo -e "${RED}❌ Deployment failed${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}============================================${NC}"

