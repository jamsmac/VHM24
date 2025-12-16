#!/bin/bash

# ============================================================================
# Test Supabase Connection Readiness
# ============================================================================
# This script tests if Supabase database is ready for connections
# ============================================================================

echo "🧪 Testing Supabase Database Readiness..."
echo "=========================================="
echo ""

# Test 1: DNS Resolution
echo "1. Testing DNS resolution..."
if nslookup db.ototfemhbodparmdgjpe.supabase.co >/dev/null 2>&1; then
  echo "✅ DNS resolution: OK"
else
  echo "❌ DNS resolution: FAILED"
  echo "   Supabase project may be paused or deleted"
  exit 1
fi

# Test 2: REST API
echo ""
echo "2. Testing REST API..."
if curl -s -f "https://ototfemhbodparmdgjpe.supabase.co/rest/v1/" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90b3RmZW1oYm9kcGFybWRnanBlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MzM5MTQsImV4cCI6MjA4MDAwOTkxNH0.HM0eMwq-ahAp7LfvG7xH3-PROrVvkvX0yMNyd1dDNJk" \
  >/dev/null 2>&1; then
  echo "✅ REST API: OK"
else
  echo "❌ REST API: FAILED"
  exit 1
fi

# Test 3: Database Connection
echo ""
echo "3. Testing database connection..."
export DATABASE_URL="postgresql://postgres:ucfbBVjbXhhKSrLi@db.ototfemhbodparmdgjpe.supabase.co:5432/postgres?sslmode=require"

node -e "
const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

client.connect()
  .then(() => {
    console.log('✅ Database connection: OK');
    return client.query('SELECT version()');
  })
  .then(result => {
    console.log('📊 PostgreSQL version:', result.rows[0].version.split(',')[0]);
    return client.end();
  })
  .catch(error => {
    console.error('❌ Database connection: FAILED');
    console.error('   Error:', error.message);
    client.end();
    process.exit(1);
  });
"

if [ $? -eq 0 ]; then
  echo ""
  echo "🎉 Supabase is ready! You can now run:"
  echo "   cd backend && ./scripts/setup-connections.sh"
else
  echo ""
  echo "❌ Database connection failed."
  echo "💡 Check Supabase Dashboard: https://supabase.com/dashboard/project/ototfemhbodparmdgjpe"
  echo "   Make sure the project is not paused."
fi
