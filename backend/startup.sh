#!/bin/sh
set -e

echo "=== VendHub Backend Startup ==="

# Run database migrations (use compiled migrations in dist/)
echo "Running database migrations..."
./node_modules/.bin/typeorm migration:run -d typeorm-migrations-only.config.js || echo "Migrations may have already been applied or failed"

# Run seeds if INITIAL_ADMIN_PASSWORD is set (first-time setup)
if [ -n "$INITIAL_ADMIN_PASSWORD" ]; then
  echo "Running initial seeds..."
  node dist/database/seeds/run-seed.js || echo "Seeds may have already been applied"
  echo "Creating SuperAdmin..."
  node dist/database/seeds/init-super-admin.js || echo "SuperAdmin may already exist"
fi

echo "Starting application..."
exec node dist/main
