#!/bin/sh
set -e

echo "=== VendHub Backend Startup ==="
echo "=== Timestamp: $(date -u) ==="

# EMERGENCY FIX: Add organization_id columns directly via SQL before migrations
# This ensures columns exist even if TypeORM migrations fail
echo "=== EMERGENCY: Adding organization_id columns directly ==="

node -e "
const { Client } = require('pg');

async function ensureOrganizationColumns() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected to database');

    // Create organizations table
    await client.query(\`
      CREATE TABLE IF NOT EXISTS organizations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        deleted_at TIMESTAMPTZ,
        name varchar(255) NOT NULL,
        slug varchar(100) NOT NULL UNIQUE,
        type varchar(50) DEFAULT 'franchise',
        parent_id uuid,
        settings jsonb DEFAULT '{}',
        is_active boolean DEFAULT true,
        phone varchar(50),
        email varchar(255),
        address text
      )
    \`);
    console.log('Organizations table ensured');

    // Insert default HQ
    await client.query(\`
      INSERT INTO organizations (name, slug, type, is_active)
      SELECT 'VendHub Headquarters', 'vendhub-hq', 'headquarters', true
      WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE slug = 'vendhub-hq')
    \`);

    // Add organization_id to machines
    const machineCheck = await client.query(\`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'machines' AND column_name = 'organization_id'
    \`);
    if (machineCheck.rows.length === 0) {
      await client.query('ALTER TABLE machines ADD COLUMN organization_id uuid');
      console.log('Added organization_id to machines');
    } else {
      console.log('machines.organization_id already exists');
    }

    // Add organization_id to users
    const userCheck = await client.query(\`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'organization_id'
    \`);
    if (userCheck.rows.length === 0) {
      await client.query('ALTER TABLE users ADD COLUMN organization_id uuid');
      console.log('Added organization_id to users');
    } else {
      console.log('users.organization_id already exists');
    }

    // Add organization_id to transactions
    const txCheck = await client.query(\`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'transactions' AND column_name = 'organization_id'
    \`);
    if (txCheck.rows.length === 0) {
      await client.query('ALTER TABLE transactions ADD COLUMN organization_id uuid');
      console.log('Added organization_id to transactions');
    } else {
      console.log('transactions.organization_id already exists');
    }

    // Link all to HQ
    const hq = await client.query(\"SELECT id FROM organizations WHERE slug = 'vendhub-hq'\");
    if (hq.rows.length > 0) {
      const hqId = hq.rows[0].id;
      await client.query('UPDATE machines SET organization_id = \$1 WHERE organization_id IS NULL', [hqId]);
      await client.query('UPDATE users SET organization_id = \$1 WHERE organization_id IS NULL', [hqId]);
      await client.query('UPDATE transactions SET organization_id = \$1 WHERE organization_id IS NULL', [hqId]);
      console.log('Linked entities to HQ:', hqId);
    }

    console.log('=== Organization columns ensured successfully ===');
  } catch (err) {
    console.error('Error ensuring organization columns:', err.message);
  } finally {
    await client.end();
  }
}

ensureOrganizationColumns();
" || echo "Emergency column fix failed, continuing..."

echo "=== Emergency fix completed ==="

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
