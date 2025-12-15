const { Client } = require('pg');

const client = new Client({
  host: 'db.ivndncmwohshbvpjbxcx.supabase.co',
  port: 5432,
  user: 'postgres',
  password: 'ucfbBVjbXhhKSrLi',
  database: 'postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

async function analyzeDatabase() {
  try {
    await client.connect();
    console.log('✅ Connected to Supabase database\n');

    // Get all tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tables = tablesResult.rows.map(row => row.table_name);
    
    console.log(`📊 Found ${tables.length} tables:\n`);
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table}`);
    });

    // Check for test_table
    if (tables.includes('test_table')) {
      console.log('\n⚠️  WARNING: test_table found - should be deleted');
    }

    // Get migration status
    const migrationsResult = await client.query(`
      SELECT * FROM migrations 
      ORDER BY timestamp DESC 
      LIMIT 10;
    `).catch(() => {
      console.log('\n⚠️  migrations table not found');
      return { rows: [] };
    });

    if (migrationsResult.rows.length > 0) {
      console.log('\n📋 Last 10 migrations:');
      migrationsResult.rows.forEach(migration => {
        console.log(`  - ${migration.name} (${new Date(parseInt(migration.timestamp)).toISOString()})`);
      });
    }

    await client.end();
    return tables;
  } catch (error) {
    console.error('❌ Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

analyzeDatabase();
