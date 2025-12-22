#!/bin/bash

# ============================================================================
# Fix Railway Database Variables
# ============================================================================
# This script ensures DATABASE_URL is set and DATABASE_PUBLIC_URL is removed
# to avoid egress fees
# ============================================================================

set -e

echo "🔧 Fixing Railway Database Variables..."
echo "========================================"
echo ""

# Check if railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI is not installed"
    echo "Install it: npm i -g @railway/cli"
    exit 1
fi

echo "📋 Current database-related variables:"
echo "--------------------------------------"
railway variables | grep -i database || echo "No database variables found"
echo ""

# Check if DATABASE_URL exists
if railway variables get DATABASE_URL &> /dev/null; then
    echo "✅ DATABASE_URL is set"
    DATABASE_URL_VALUE=$(railway variables get DATABASE_URL)
    
    # Check if it's using public proxy
    if echo "$DATABASE_URL_VALUE" | grep -q "proxy.railway.app\|RAILWAY_TCP_PROXY_DOMAIN"; then
        echo "⚠️  WARNING: DATABASE_URL appears to use public proxy!"
        echo "   This will incur egress fees."
        echo "   Value: ${DATABASE_URL_VALUE:0:50}..."
        echo ""
        echo "💡 Solution: Railway should auto-create DATABASE_URL with private endpoint."
        echo "   If you see this, contact Railway support or check your Postgres service."
    else
        echo "✅ DATABASE_URL uses private endpoint (good!)"
    fi
else
    echo "❌ DATABASE_URL is not set!"
    echo "   Railway should auto-create this for Postgres service."
    echo "   Check your Postgres service in Railway Dashboard."
    exit 1
fi

echo ""

# Check if DATABASE_PUBLIC_URL exists
if railway variables get DATABASE_PUBLIC_URL &> /dev/null; then
    echo "⚠️  DATABASE_PUBLIC_URL is set (this will incur egress fees)"
    read -p "   Do you want to remove it? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        railway variables delete DATABASE_PUBLIC_URL
        echo "✅ DATABASE_PUBLIC_URL removed"
    else
        echo "⚠️  DATABASE_PUBLIC_URL kept (you will be charged for egress)"
    fi
else
    echo "✅ DATABASE_PUBLIC_URL is not set (good!)"
fi

echo ""
echo "✅ Database variables check complete!"
echo ""
echo "📝 Summary:"
echo "   - Use DATABASE_URL for application (private, free)"
echo "   - Remove DATABASE_PUBLIC_URL if not needed (public, paid)"
echo "   - Your code already uses DATABASE_URL correctly"


