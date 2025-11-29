#!/bin/sh

echo "🚀 Starting VendHub Manager Production..."
echo "========================================"

# Set default PORT if not provided by Railway
export PORT=${PORT:-3000}

# Check environment
echo "NODE_ENV: ${NODE_ENV:-production}"
echo "PORT: $PORT"
echo "Database URL configured: ${DATABASE_URL:+YES}"
echo "Redis URL configured: ${REDIS_URL:+YES}"
echo "Telegram Bot configured: ${TELEGRAM_BOT_TOKEN:+YES}"

# Set Redis to optional localhost if not configured
if [ -z "$REDIS_URL" ]; then
  echo "⚠️  Redis not configured, using localhost fallback"
  export REDIS_URL="redis://localhost:6379"
fi

# Start the application directly without migrations
echo ""
echo "🎯 Starting NestJS application on port $PORT..."
exec node dist/main