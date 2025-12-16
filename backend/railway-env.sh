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

# Security (JWT_SECRET must be 64+ chars)
railway variables set JWT_SECRET="98ab096ca98713163785a07b33001353ecb7bc044617e69fee58c54234aa48ac"
railway variables set JWT_ACCESS_TOKEN_EXPIRES_IN="15m"
railway variables set JWT_REFRESH_TOKEN_EXPIRES_IN="7d"
railway variables set BCRYPT_SALT_ROUNDS="12"
railway variables set ENCRYPTION_KEY="fb5da5d605d1043432db4619aaa3765c"

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

# ============================================================================
# OPTIONAL - Uncomment and configure as needed
# ============================================================================

# Redis (Required for: sessions, job queue, rate limiting)
# Option 1: Add Redis service in Railway and use Railway's internal URL
# railway variables set REDIS_URL="redis://default:password@redis.railway.internal:6379"

# S3/Cloud Storage (Required for file uploads)
# Using Supabase Storage (already have keys above) or configure external S3:
# railway variables set S3_ENDPOINT="https://your-account.r2.cloudflarestorage.com"
# railway variables set S3_BUCKET="vendhub-files"
# railway variables set S3_ACCESS_KEY="your-access-key"
# railway variables set S3_SECRET_KEY="your-secret-key"
# railway variables set S3_REGION="auto"

# Web Push Notifications (generate with: npx web-push generate-vapid-keys)
# railway variables set VAPID_PUBLIC_KEY="your-public-key"
# railway variables set VAPID_PRIVATE_KEY="your-private-key"
# railway variables set VAPID_EMAIL="admin@vendhub.com"

# Email (SMTP - for email notifications)
# railway variables set SMTP_HOST="smtp.gmail.com"
# railway variables set SMTP_PORT="587"
# railway variables set SMTP_USER="your-email@gmail.com"
# railway variables set SMTP_PASSWORD="your-app-password"
# railway variables set SMTP_FROM_EMAIL="noreply@vendhub.com"

# OpenAI (for Telegram voice message transcription)
# railway variables set OPENAI_API_KEY="sk-..."

# Error Monitoring
# railway variables set SENTRY_DSN="https://...@sentry.io/..."

echo "✅ Environment variables set successfully!"
echo ""
echo "⚠️  Don't forget to configure optional services:"
echo "   - Redis (for sessions/queue)"
echo "   - S3/Storage (for file uploads)"
echo "   - Web Push (for browser notifications)"