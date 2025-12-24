#!/bin/sh
set -e

echo "=== VendHub Backend Startup ==="
echo "=== Timestamp: $(date -u) ==="

# Run database migrations (use compiled migrations in dist/)
echo "Running database migrations..."
echo "Checking migration files..."
ls -la dist/database/migrations/ 2>&1 | head -30 || echo "No migration files found in dist/"
echo ""
echo "=== Checking specific migrations ==="
ls -la dist/database/migrations/ 2>&1 | grep -E "1735" || echo "No 1735xxx migrations found"
echo ""
echo "=== Executing migrations (with verbose output) ==="
MIGRATION_LOGGING=true ./node_modules/.bin/typeorm migration:run -d typeorm-migrations-only.config.js 2>&1 && echo "=== Migrations completed successfully ===" || echo "=== Migration execution failed or already applied ==="
echo "=== Migration execution done ==="

# Run seeds if INITIAL_ADMIN_PASSWORD is set (first-time setup)
if [ -n "$INITIAL_ADMIN_PASSWORD" ]; then
  echo "Running initial seeds..."
  node dist/database/seeds/run-seed.js || echo "Seeds may have already been applied"
  echo "Creating SuperAdmin..."
  node dist/database/seeds/init-super-admin.js || echo "SuperAdmin may already exist"
fi

echo "Starting application..."
exec node dist/main
