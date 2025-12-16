#!/bin/bash

# Railway Environment Variables Setup
# Run this script to set all required environment variables in Railway

echo "🚀 Setting Railway environment variables..."

# Database
railway variables set DATABASE_URL="postgresql://postgres:HYWL7SSfgNFUdRsa@db.ivndncmwohshbvpjbxcx.supabase.co:5432/postgres"

# Supabase
railway variables set SUPABASE_URL="https://ivndncmwohshbvpjbxcx.supabase.co"
railway variables set SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2bmRuY213b2hzaGJ2cGpieGN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0NDcxNzMsImV4cCI6MjA0ODAyMzE3M30.EGJQsT34_TdClA7CIdCKPRBJPpPRq5-nQzptQKBF0P0"
railway variables set SUPABASE_PUBLISHABLE_KEY="sb_publishable_OK2HGa4KXUEFL-Y5T-IIOg_lzGXYvm6"
railway variables set SUPABASE_SECRET_KEY="sb_secret_RLSXF1V4bpe8ynDxAmdejA_3FulcqIu"

# Telegram Bot
railway variables set TELEGRAM_BOT_TOKEN="8201265622:AAG3NMF7J2RP49nc4y6rnEG2A-0iaAnW4dA"
railway variables set TELEGRAM_ADMIN_CHAT_ID="42283329"
railway variables set TELEGRAM_ADMIN_USERNAME="@Jamshiddin"

# Security
railway variables set JWT_SECRET="xK9mP3nQ8rT5vW2yA6bC4dF7gH1jL0zX"
railway variables set JWT_ACCESS_TOKEN_EXPIRES_IN="15m"
railway variables set JWT_REFRESH_TOKEN_EXPIRES_IN="7d"
railway variables set BCRYPT_SALT_ROUNDS="12"

# Super Admin
railway variables set SUPER_ADMIN_TELEGRAM_ID="42283329"
railway variables set SUPER_ADMIN_USERNAME="Jamshiddin"
railway variables set SUPER_ADMIN_EMAIL="admin@vendhub.com"
railway variables set SUPER_ADMIN_PASSWORD="VendHub2024!"

# Environment
railway variables set NODE_ENV="production"
railway variables set API_PREFIX="api"
railway variables set API_VERSION="v1"

# Frontend URL (for CORS)
railway variables set FRONTEND_URL="https://faithful-illumination-production.up.railway.app"

# Features
railway variables set ENABLE_SCHEDULED_TASKS="true"
railway variables set ENABLE_PROMETHEUS="true"

echo "✅ Environment variables set successfully!"