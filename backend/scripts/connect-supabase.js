const { Client } = require('pg');

// Supabase connection string
const connectionString = 'postgresql://postgres:ucfbBVjbXhhKSrLi@db.ivndncmwohshbvpjbxcx.supabase.co:5432/postgres';

const client = new Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000,
});

async function connectAndAnalyze() {
  try {
    console.log('🔄 Connecting to Supabase...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Get all tables
    const tablesResult = await client.query(`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    const tables = tablesResult.rows;
    
    console.log(`📊 Found ${tables.length} tables:\n`);
    tables.forEach((table, index) => {
      console.log(`${(index + 1).toString().padStart(3, ' ')}. ${table.table_name.padEnd(40, ' ')} (${table.column_count} columns)`);
    });

    // Check for test_table
    const testTable = tables.find(t => t.table_name === 'test_table');
    if (testTable) {
      console.log('\n⚠️  WARNING: test_table found - should be deleted');
    }

    // Check migrations table
    const migrationsTable = tables.find(t => t.table_name === 'migrations');
    if (migrationsTable) {
      const migrationsResult = await client.query(`
        SELECT name, timestamp 
        FROM migrations 
        ORDER BY timestamp DESC 
        LIMIT 10;
      `);
      
      if (migrationsResult.rows.length > 0) {
        console.log('\n📋 Last 10 migrations:');
        migrationsResult.rows.forEach(migration => {
          const date = new Date(parseInt(migration.timestamp));
          console.log(`  - ${migration.name} (${date.toISOString()})`);
        });
      }
    } else {
      console.log('\n⚠️  migrations table not found');
    }

    // Check for foreign key constraints
    const fkResult = await client.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name
      LIMIT 20;
    `);

    if (fkResult.rows.length > 0) {
      console.log('\n🔗 Sample Foreign Keys (first 20):');
      fkResult.rows.forEach(fk => {
        console.log(`  ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    }

    await client.end();
    console.log('\n✅ Analysis complete');
    return tables;
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('   Code:', error.code);
    }
    await client.end();
    process.exit(1);
  }
}

connectAndAnalyze();
