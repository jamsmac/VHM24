#!/bin/bash

# ============================================================================
# Apply Database Migrations
# ============================================================================
# This script applies all pending migrations to Supabase
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   Applying Database Migrations${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

cd "$(dirname "$0")/.."

# Load environment variables
if [ -f .env.production ]; then
  export $(cat .env.production | grep -v '^#' | xargs)
  echo -e "${GREEN}✓ Loaded .env.production${NC}"
elif [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
  echo -e "${GREEN}✓ Loaded .env${NC}"
else
  echo -e "${YELLOW}⚠ No .env file found, using environment variables${NC}"
fi

# Check required variables
if [ -z "$DATABASE_HOST" ] || [ -z "$DATABASE_PASSWORD" ]; then
  echo -e "${RED}❌ Missing required database variables${NC}"
  echo "Please set DATABASE_HOST, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME"
  exit 1
fi

echo -e "${YELLOW}Database: ${DATABASE_HOST}:${DATABASE_PORT:-5432}/${DATABASE_NAME:-postgres}${NC}"
echo ""

# Compile migrations
echo -e "${YELLOW}Step 1: Compiling migrations...${NC}"
npm run migration:compile

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Migration compilation failed${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Migrations compiled${NC}"
echo ""

# Run migrations
echo -e "${YELLOW}Step 2: Applying migrations...${NC}"
npm run migration:run

if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✅ Migrations applied successfully!${NC}"
else
  echo ""
  echo -e "${RED}❌ Migration failed${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}============================================${NC}"







