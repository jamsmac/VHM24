#!/bin/bash

# ==============================================================================
# VendHub Manager - One-Click Launch Script
# ==============================================================================
# This script sets up and launches the VendHub backend with Supabase integration
# ==============================================================================

set -e

echo "🚀 VendHub Manager - Production Launch Script"
echo "=============================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ==============================================================================
# CONFIGURATION
# ==============================================================================

# Supabase Database (READY!)
export DATABASE_URL="postgresql://postgres:HYWL7SSfgNFUdRsa@db.ivndncmwohshbvpjbxcx.supabase.co:5432/postgres"

# Telegram Bot Configuration (READY!)
export TELEGRAM_BOT_TOKEN="8201265622:AAG3NMF7J2RP49nc4y6rnEG2A-0iaAnW4dA"
export TELEGRAM_ADMIN_ID="42283329"
export TELEGRAM_ADMIN_USERNAME="Jamshiddin"

# JWT Secret (Auto-generated if not set)
export JWT_SECRET=${JWT_SECRET:-$(openssl rand -base64 32)}

# ==============================================================================
# FUNCTIONS
# ==============================================================================

check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}❌ $1 is not installed${NC}"
        echo "Please install $1 to continue"
        exit 1
    fi
    echo -e "${GREEN}✓ $1 found${NC}"
}

wait_for_db() {
    echo -e "${YELLOW}⏳ Waiting for database connection...${NC}"
    for i in {1..30}; do
        if npm run typeorm query "SELECT 1" &> /dev/null; then
            echo -e "${GREEN}✓ Database connected${NC}"
            return 0
        fi
        echo -n "."
        sleep 1
    done
    echo -e "${RED}❌ Failed to connect to database${NC}"
    return 1
}

# ==============================================================================
# MAIN SCRIPT
# ==============================================================================

echo ""
echo "1️⃣  Checking prerequisites..."
echo "------------------------------"
check_command node
check_command npm

echo ""
echo "2️⃣  Installing dependencies..."
echo "------------------------------"
npm install --legacy-peer-deps

echo ""
echo "3️⃣  Setting up environment..."
echo "------------------------------"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOF
# Auto-generated environment configuration
NODE_ENV=production
PORT=3000

# Supabase Database
DATABASE_URL=$DATABASE_URL

# Telegram Bot
TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN
TELEGRAM_ADMIN_CHAT_ID=$TELEGRAM_ADMIN_ID
TELEGRAM_ADMIN_USERNAME=@$TELEGRAM_ADMIN_USERNAME
TELEGRAM_WEBHOOK_URL=https://api.vendhub.com/telegram/webhook

# Security
JWT_SECRET=$JWT_SECRET
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12

# Super Admin
SUPER_ADMIN_TELEGRAM_ID=$TELEGRAM_ADMIN_ID
SUPER_ADMIN_USERNAME=$TELEGRAM_ADMIN_USERNAME
SUPER_ADMIN_EMAIL=admin@vendhub.com
SUPER_ADMIN_PASSWORD=VendHub2024!

# API Configuration
API_PREFIX=api
API_VERSION=v1
CORS_ORIGIN=http://localhost:3001,http://localhost:3000
CORS_CREDENTIALS=true

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# Features
ENABLE_SCHEDULED_TASKS=true
ENABLE_PROMETHEUS=true

# Logging
LOG_LEVEL=info
EOF
    echo -e "${GREEN}✓ .env file created${NC}"
else
    echo -e "${YELLOW}⚠️  Using existing .env file${NC}"
fi

echo ""
echo "4️⃣  Building application..."
echo "------------------------------"
npm run build

echo ""
echo "5️⃣  Running database migrations..."
echo "------------------------------"
if wait_for_db; then
    npm run migration:run
    echo -e "${GREEN}✓ Migrations completed${NC}"
else
    echo -e "${RED}❌ Could not run migrations - database connection failed${NC}"
    echo "Please check your database configuration and try again"
    exit 1
fi

echo ""
echo "6️⃣  Initializing Super Admin..."
echo "------------------------------"
npm run seed:superadmin || echo -e "${YELLOW}⚠️  Super admin might already exist${NC}"

echo ""
echo "7️⃣  Starting VendHub Manager..."
echo "------------------------------"
echo -e "${GREEN}
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🎉 VendHub Manager is ready!                              ║
║                                                              ║
║   Backend API:    http://localhost:3000                     ║
║   Swagger Docs:   http://localhost:3000/api/docs            ║
║   Health Check:   http://localhost:3000/monitoring/health   ║
║   Metrics:        http://localhost:3000/monitoring/metrics  ║
║                                                              ║
║   Database:       Supabase (Connected)                      ║
║   Telegram Bot:   @vendhub_bot (Active)                     ║
║   Super Admin:    @$TELEGRAM_ADMIN_USERNAME (ID: $TELEGRAM_ADMIN_ID)          ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
${NC}"

echo ""
echo "Starting server..."
echo "-----------------"

# Start the application
npm run start:prod