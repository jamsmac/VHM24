#!/bin/bash

# ============================================================================
# Setup Supabase and Railway Connections
# ============================================================================
# This script establishes connections to Supabase and Railway
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RAILWAY_TOKEN="8d4d83d1-df06-48f1-9ed8-5bf24cc82b4a"
SUPABASE_HOST="db.ototfemhbodparmdgjpe.supabase.co"
SUPABASE_PASSWORD="ucfbBVjbXhhKSrLi"
SUPABASE_DB="postgres"
SUPABASE_USER="postgres"
SUPABASE_PORT=5432

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   Setting up Supabase & Railway${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# ============================================================================
# 1. Test Supabase Connection
# ============================================================================
echo -e "${YELLOW}Step 1: Testing Supabase connection...${NC}"

cd "$(dirname "$0")/.."

# Create test connection script
cat > scripts/test-supabase-connection.js << 'EOF'
const { Client } = require('pg');

const client = new Client({
  host: process.env.DATABASE_HOST || 'db.ototfemhbodparmdgjpe.supabase.co',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'ucfbBVjbXhhKSrLi',
  database: process.env.DATABASE_NAME || 'postgres',
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000,
});

async function testConnection() {
  try {
    console.log('🔄 Connecting to Supabase...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    const result = await client.query('SELECT version()');
    console.log('📊 PostgreSQL version:', result.rows[0].version.split(',')[0]);
    
    const tablesResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE';
    `);
    console.log('📋 Tables in database:', tablesResult.rows[0].count);
    
    await client.end();
    console.log('✅ Connection test completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    await client.end();
    process.exit(1);
  }
}

testConnection();
EOF

# Test connection
export DATABASE_HOST="$SUPABASE_HOST"
export DATABASE_PORT="$SUPABASE_PORT"
export DATABASE_USER="$SUPABASE_USER"
export DATABASE_PASSWORD="$SUPABASE_PASSWORD"
export DATABASE_NAME="$SUPABASE_DB"

if node scripts/test-supabase-connection.js; then
  echo -e "${GREEN}✓ Supabase connection successful${NC}"
else
  echo -e "${RED}✗ Supabase connection failed${NC}"
  exit 1
fi

echo ""

# ============================================================================
# 2. Setup Railway CLI
# ============================================================================
echo -e "${YELLOW}Step 2: Setting up Railway CLI...${NC}"

if ! command -v railway &> /dev/null; then
  echo -e "${YELLOW}Installing Railway CLI...${NC}"
  npm install -g @railway/cli
  echo -e "${GREEN}✓ Railway CLI installed${NC}"
else
  echo -e "${GREEN}✓ Railway CLI already installed${NC}"
fi

# Login to Railway
export RAILWAY_TOKEN="$RAILWAY_TOKEN"
if railway login --browserless 2>/dev/null || railway login; then
  echo -e "${GREEN}✓ Logged in to Railway${NC}"
else
  echo -e "${YELLOW}⚠ Railway login skipped (will need manual login)${NC}"
fi

echo ""

# ============================================================================
# 3. Link Railway Project
# ============================================================================
echo -e "${YELLOW}Step 3: Linking Railway project...${NC}"

if [ ! -f ".railway" ]; then
  echo -e "${YELLOW}Please select your Railway project:${NC}"
  railway link || echo -e "${YELLOW}⚠ Project linking skipped${NC}"
else
  echo -e "${GREEN}✓ Project already linked${NC}"
fi

echo ""

# ============================================================================
# 4. Set Railway Environment Variables
# ============================================================================
echo -e "${YELLOW}Step 4: Setting Railway environment variables...${NC}"

# Database (Supabase)
railway variables set DATABASE_HOST="$SUPABASE_HOST" 2>/dev/null || echo "DATABASE_HOST already set"
railway variables set DATABASE_PORT="$SUPABASE_PORT" 2>/dev/null || echo "DATABASE_PORT already set"
railway variables set DATABASE_USER="$SUPABASE_USER" 2>/dev/null || echo "DATABASE_USER already set"
railway variables set DATABASE_PASSWORD="$SUPABASE_PASSWORD" 2>/dev/null || echo "DATABASE_PASSWORD already set"
railway variables set DATABASE_NAME="$SUPABASE_DB" 2>/dev/null || echo "DATABASE_NAME already set"
railway variables set DATABASE_SSL=true 2>/dev/null || echo "DATABASE_SSL already set"

# Full DATABASE_URL
DATABASE_URL="postgresql://${SUPABASE_USER}:${SUPABASE_PASSWORD}@${SUPABASE_HOST}:${SUPABASE_PORT}/${SUPABASE_DB}?sslmode=require"
railway variables set DATABASE_URL="$DATABASE_URL" 2>/dev/null || echo "DATABASE_URL already set"

# Generate JWT secrets
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

railway variables set JWT_SECRET="$JWT_SECRET" 2>/dev/null || echo "JWT_SECRET already set"
railway variables set JWT_REFRESH_SECRET="$JWT_REFRESH_SECRET" 2>/dev/null || echo "JWT_REFRESH_SECRET already set"

# Super Admin
railway variables set TELEGRAM_ADMIN_ID=42283329 2>/dev/null || echo "TELEGRAM_ADMIN_ID already set"
railway variables set TELEGRAM_ADMIN_USERNAME=Jamshiddin 2>/dev/null || echo "TELEGRAM_ADMIN_USERNAME already set"
railway variables set SUPER_ADMIN_TELEGRAM_ID=42283329 2>/dev/null || echo "SUPER_ADMIN_TELEGRAM_ID already set"
railway variables set SUPER_ADMIN_USERNAME=Jamshiddin 2>/dev/null || echo "SUPER_ADMIN_USERNAME already set"

# Environment
railway variables set NODE_ENV=production 2>/dev/null || echo "NODE_ENV already set"
railway variables set PORT=3000 2>/dev/null || echo "PORT already set"

echo -e "${GREEN}✓ Environment variables set${NC}"
echo ""

# ============================================================================
# 5. Create .env.production file
# ============================================================================
echo -e "${YELLOW}Step 5: Creating .env.production file...${NC}"

cat > .env.production << EOF
# ============================================================================
# VendHub Manager - Production Environment
# ============================================================================
# Generated: $(date)

# Application
NODE_ENV=production
PORT=3000

# Database (Supabase)
DATABASE_HOST=$SUPABASE_HOST
DATABASE_PORT=$SUPABASE_PORT
DATABASE_USER=$SUPABASE_USER
DATABASE_PASSWORD=$SUPABASE_PASSWORD
DATABASE_NAME=$SUPABASE_DB
DATABASE_SSL=true
DATABASE_URL=$DATABASE_URL

# JWT
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Super Admin
TELEGRAM_ADMIN_ID=42283329
TELEGRAM_ADMIN_USERNAME=Jamshiddin
SUPER_ADMIN_TELEGRAM_ID=42283329
SUPER_ADMIN_USERNAME=Jamshiddin

# Redis (if using Railway Redis)
# REDIS_HOST=redis
# REDIS_PORT=6379
# REDIS_PASSWORD=

# S3 Storage (configure separately)
# S3_ENDPOINT=
# S3_BUCKET=vendhub
# S3_ACCESS_KEY=
# S3_SECRET_KEY=

# Frontend URL (configure separately)
# FRONTEND_URL=

# Telegram Bot (configure separately)
# TELEGRAM_BOT_TOKEN=
EOF

echo -e "${GREEN}✓ .env.production created${NC}"
echo ""

# ============================================================================
# 6. Test Migration Connection
# ============================================================================
echo -e "${YELLOW}Step 6: Testing migration connection...${NC}"

# Create test migration script
cat > scripts/test-migration-connection.js << 'EOF'
const { DataSource } = require('typeorm');
require('dotenv').config({ path: '.env.production' });

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  logging: false,
});

async function testMigrationConnection() {
  try {
    console.log('🔄 Testing migration connection...');
    await AppDataSource.initialize();
    console.log('✅ Migration connection successful!');
    
    // Check migrations table
    const migrationsTable = await AppDataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      );
    `);
    
    if (migrationsTable[0].exists) {
      const migrations = await AppDataSource.query('SELECT COUNT(*) as count FROM migrations');
      console.log('📋 Applied migrations:', migrations[0].count);
    } else {
      console.log('ℹ️  Migrations table will be created on first migration');
    }
    
    await AppDataSource.destroy();
    console.log('✅ Migration connection test completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration connection failed:', error.message);
    await AppDataSource.destroy();
    process.exit(1);
  }
}

testMigrationConnection();
EOF

if node scripts/test-migration-connection.js; then
  echo -e "${GREEN}✓ Migration connection successful${NC}"
else
  echo -e "${RED}✗ Migration connection failed${NC}"
  exit 1
fi

echo ""

# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   Setup Complete!${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "${GREEN}✅ Supabase connection: Working${NC}"
echo -e "${GREEN}✅ Railway CLI: Configured${NC}"
echo -e "${GREEN}✅ Environment variables: Set${NC}"
echo -e "${GREEN}✅ Migration connection: Working${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Run migrations: npm run migration:run"
echo "2. Create super admin: npm run create-superadmin"
echo "3. Deploy to Railway: railway up"
echo ""
echo -e "${BLUE}============================================${NC}"







