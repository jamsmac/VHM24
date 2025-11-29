#!/bin/bash

# ============================================================================
# VendHub Manager - Quick Production Deploy with Free Services
# ============================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   VendHub - Quick Cloud Deploy 🚀${NC}"
echo -e "${BLUE}============================================${NC}"

# Your Telegram Bot Token
TELEGRAM_BOT_TOKEN="8201265622:AAG3NMF7J2RP49nc4y6rnEG2A-0iaAnW4dA"

# Step 1: Create GitHub Actions workflow for auto-deploy
echo -e "${YELLOW}Step 1: Setting up GitHub Actions...${NC}"

mkdir -p .github/workflows

cat > .github/workflows/deploy.yml << 'YAML'
name: Deploy VendHub

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install Railway
        run: npm install -g @railway/cli
        
      - name: Deploy Backend to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          cd backend
          railway link
          railway up
          
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy Frontend to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./frontend
YAML

# Step 2: Create Vercel configuration
echo -e "${YELLOW}Step 2: Creating Vercel configuration...${NC}"

cat > frontend/vercel.json << 'JSON'
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_API_URL": "@vendhub_api_url"
  }
}
JSON

# Step 3: Create Railway configuration
echo -e "${YELLOW}Step 3: Creating Railway configuration...${NC}"

cat > backend/railway.json << 'JSON'
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm ci && npm run build"
  },
  "deploy": {
    "startCommand": "npm run migration:run && npm run start:prod",
    "healthcheckPath": "/monitoring/health",
    "restartPolicyType": "ALWAYS"
  },
  "environments": {
    "production": {
      "NODE_ENV": "production"
    }
  }
}
JSON

# Step 4: Create environment template
echo -e "${YELLOW}Step 4: Creating environment configuration...${NC}"

cat > backend/.env.cloud << ENV
# ============================================
# FREE CLOUD SERVICES CONFIGURATION
# ============================================

# Database (Supabase Free - 500MB)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres

# Redis (Upstash Free - 10,000 commands/day)
REDIS_URL=redis://default:[YOUR-PASSWORD]@[YOUR-ENDPOINT].upstash.io:6379

# JWT Secret (Generate: openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-40)

# Telegram Bot
TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_URL=https://vendhub-backend.up.railway.app/telegram/webhook

# File Storage (Cloudflare R2 - 10GB free)
S3_ENDPOINT=https://[YOUR-ACCOUNT-ID].r2.cloudflarestorage.com
S3_ACCESS_KEY=[YOUR-R2-ACCESS-KEY]
S3_SECRET_KEY=[YOUR-R2-SECRET-KEY]
S3_BUCKET=vendhub
S3_REGION=auto

# Frontend URL (Vercel)
FRONTEND_URL=https://vendhub.vercel.app

# Other Settings
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://vendhub.vercel.app
ENABLE_PROMETHEUS=true
ENABLE_SCHEDULED_TASKS=true
ENV

# Step 5: Setup script for cloud services
echo -e "${YELLOW}Step 5: Creating setup script...${NC}"

cat > setup-cloud-services.sh << 'SETUP'
#!/bin/bash

echo "================================================"
echo "   VendHub Cloud Services Setup Guide"
echo "================================================"
echo ""
echo "Follow these steps to set up FREE cloud services:"
echo ""
echo "1. DATABASE - Supabase (FREE)"
echo "   • Go to: https://supabase.com"
echo "   • Create new project"
echo "   • Copy DATABASE_URL from Settings > Database"
echo ""
echo "2. REDIS - Upstash (FREE)"
echo "   • Go to: https://upstash.com"
echo "   • Create Redis database"
echo "   • Copy REDIS_URL from Details page"
echo ""
echo "3. BACKEND - Railway ($5 FREE credit)"
echo "   • Go to: https://railway.app"
echo "   • Connect GitHub repo"
echo "   • Select backend folder"
echo "   • Add PostgreSQL plugin"
echo "   • Add environment variables"
echo ""
echo "4. FRONTEND - Vercel (FREE)"
echo "   • Go to: https://vercel.com"
echo "   • Import GitHub repo"
echo "   • Select frontend folder"
echo "   • Add environment variable:"
echo "     NEXT_PUBLIC_API_URL = https://[your-backend].railway.app"
echo ""
echo "5. STORAGE - Cloudflare R2 (10GB FREE)"
echo "   • Go to: https://dash.cloudflare.com"
echo "   • Create R2 bucket"
echo "   • Generate API credentials"
echo ""
echo "6. TELEGRAM BOT"
echo "   • Your bot token is already configured!"
echo "   • Token: $TELEGRAM_BOT_TOKEN"
echo "   • After deploy, set webhook:"
echo "     curl -X POST https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook \\"
echo "          -d 'url=https://[your-backend].railway.app/telegram/webhook'"
echo ""
SETUP

chmod +x setup-cloud-services.sh

# Step 6: Create quick start script
echo -e "${YELLOW}Step 6: Creating quick start script...${NC}"

cat > start-local.sh << 'START'
#!/bin/bash

# Start local development with Docker
echo "Starting VendHub locally..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Docker is not running. Please start Docker first."
    exit 1
fi

# Start services
docker-compose up -d

# Wait for services
echo "Waiting for services to start..."
sleep 10

# Run migrations
cd backend
npm run migration:run
cd ..

# Open browser
echo "Opening VendHub in browser..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:3001
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open http://localhost:3001
fi

echo "VendHub is running!"
echo "Frontend: http://localhost:3001"
echo "Backend: http://localhost:3000"
echo "API Docs: http://localhost:3000/api/docs"
START

chmod +x start-local.sh

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${BLUE}Quick Start Options:${NC}"
echo ""
echo "1. LOCAL DEVELOPMENT:"
echo "   ./start-local.sh"
echo ""
echo "2. DEPLOY TO CLOUD (FREE):"
echo "   ./setup-cloud-services.sh"
echo ""
echo "3. DEPLOY WITH DOCKER:"
echo "   ./deploy.sh docker"
echo ""
echo -e "${YELLOW}Your Telegram Bot is ready!${NC}"
echo "Token: $TELEGRAM_BOT_TOKEN"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Run: ./setup-cloud-services.sh"
echo "2. Follow the setup guide"
echo "3. Push to GitHub"
echo "4. Services will auto-deploy!"
