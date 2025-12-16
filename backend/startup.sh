#!/bin/sh
set -e

echo "=== VendHub Backend Startup ==="

# Run seeds if INITIAL_ADMIN_PASSWORD is set (first-time setup)
if [ -n "$INITIAL_ADMIN_PASSWORD" ]; then
  echo "Running initial seeds..."
  node dist/database/seeds/run-seed.js || echo "Seeds may have already been applied"
  echo "Creating SuperAdmin..."
  node dist/database/seeds/init-super-admin.js || echo "SuperAdmin may already exist"
fi

echo "Starting application..."
exec node dist/main
