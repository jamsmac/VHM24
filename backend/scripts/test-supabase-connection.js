const { Client } = require('pg');

const client = new Client({
  host: process.env.DATABASE_HOST || 'db.ototfemhbodparmdgjpe.supabase.co',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'ucfbBVjbXhhKSrLi',
  database: process.env.DATABASE_NAME || 'postgres',
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 10000,
});

async function testConnection() {
  try {
    console.log('🔄 Connecting to Supabase...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    const result = await client.query('SELECT version()');
    console.log('📊 PostgreSQL version:', result.rows[0].version.split(',')[0]);
    
    const tablesResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE';
    `);
    console.log('📋 Tables in database:', tablesResult.rows[0].count);
    
    await client.end();
    console.log('✅ Connection test completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    await client.end();
    process.exit(1);
  }
}

testConnection();
