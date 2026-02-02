#!/bin/sh
set -e

echo "=== VendHub Backend Startup ==="

# Ensure organization_id columns exist (idempotent, silent on success)
node -e "
const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query(\`CREATE TABLE IF NOT EXISTS organizations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(), deleted_at TIMESTAMPTZ,
      name varchar(255) NOT NULL, slug varchar(100) NOT NULL UNIQUE, type varchar(50) DEFAULT 'franchise',
      parent_id uuid, settings jsonb DEFAULT '{}', is_active boolean DEFAULT true,
      phone varchar(50), email varchar(255), address text
    )\`);
    await client.query(\`INSERT INTO organizations (name, slug, type, is_active)
      SELECT 'VendHub Headquarters', 'vendhub-hq', 'headquarters', true
      WHERE NOT EXISTS (SELECT 1 FROM organizations WHERE slug = 'vendhub-hq')\`);
    for (const table of ['machines', 'users', 'transactions']) {
      const r = await client.query(\`SELECT 1 FROM information_schema.columns WHERE table_name='\${table}' AND column_name='organization_id'\`);
      if (r.rows.length === 0) await client.query(\`ALTER TABLE \${table} ADD COLUMN organization_id uuid\`);
    }
    const hq = await client.query(\"SELECT id FROM organizations WHERE slug='vendhub-hq'\");
    if (hq.rows.length > 0) {
      const id = hq.rows[0].id;
      for (const table of ['machines', 'users', 'transactions']) {
        await client.query(\`UPDATE \${table} SET organization_id='\${id}' WHERE organization_id IS NULL\`);
      }
    }
  } catch (err) { console.error('Organization setup error:', err.message); }
  finally { await client.end(); }
}
run();
" 2>/dev/null || true

# Run database migrations (quiet mode in production)
echo "Running migrations..."
./node_modules/.bin/typeorm migration:run -d typeorm-migrations-only.config.js 2>&1 && echo "Migrations OK" || echo "Migrations: already applied or failed"

# Run seeds if INITIAL_ADMIN_PASSWORD is set (first-time setup)
if [ -n "$INITIAL_ADMIN_PASSWORD" ]; then
  echo "Running initial seeds..."
  node dist/database/seeds/run-seed.js || echo "Seeds may have already been applied"
  echo "Creating SuperAdmin..."
  node dist/database/seeds/init-super-admin.js || echo "SuperAdmin may already exist"
fi

echo "Starting application..."
exec node dist/main
