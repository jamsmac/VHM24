const { Client } = require('pg');

// Supabase connection URL - Direct connection (IPv6 format)
const connectionString = 'postgresql://postgres.[project-ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';
// For now, let's use the project URL to test the API connection
const projectUrl = 'https://ivndncmwohshbvpjbxcx.supabase.co';

async function testConnection() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔄 Connecting to Supabase database...');
    await client.connect();

    const result = await client.query('SELECT current_database(), version()');
    console.log('✅ Successfully connected to Supabase!');
    console.log('📊 Database info:');
    console.log('  - Database:', result.rows[0].current_database);
    console.log('  - Version:', result.rows[0].version.split(',')[0]);

    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
      LIMIT 10
    `);

    console.log('\n📋 Existing tables:');
    if (tablesResult.rows.length === 0) {
      console.log('  No tables found - need to run migrations');
    } else {
      tablesResult.rows.forEach(row => {
        console.log('  -', row.table_name);
      });
    }

    await client.end();
    console.log('\n✅ Database connection test completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    process.exit(1);
  }
}

testConnection();