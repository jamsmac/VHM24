// Test Supabase API connection
const https = require('https');

const SUPABASE_URL = 'https://ivndncmwohshbvpjbxcx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2bmRuY213b2hzaGJ2cGpieGN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzI0NDcxNzMsImV4cCI6MjA0ODAyMzE3M30.EGJQsT34_TdClA7CIdCKPRBJPpPRq5-nQzptQKBF0P0';

console.log('🔄 Testing Supabase API connection...\n');

// Test REST API
const options = {
  hostname: 'ivndncmwohshbvpjbxcx.supabase.co',
  path: '/rest/v1/',
  method: 'GET',
  headers: {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
  }
};

const req = https.request(options, (res) => {
  console.log('✅ Supabase API Response:');
  console.log('  Status:', res.statusCode);
  console.log('  Headers:', res.headers['content-type']);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\n📊 API Info:');
    console.log('  - Project URL: ' + SUPABASE_URL);
    console.log('  - API is accessible: YES');
    console.log('  - Auth key is valid: ' + (res.statusCode === 200 ? 'YES' : 'MAYBE'));

    console.log('\n🔗 Database Connection String:');
    console.log('  For TypeORM/pg use one of these formats:\n');
    console.log('  Option 1 - Direct (IPv4):');
    console.log('  postgresql://postgres:HYWL7SSfgNFUdRsa@db.ivndncmwohshbvpjbxcx.supabase.co:5432/postgres\n');
    console.log('  Option 2 - Pooler (recommended for serverless):');
    console.log('  postgresql://postgres.ivndncmwohshbvpjbxcx:HYWL7SSfgNFUdRsa@aws-0-eu-central-1.pooler.supabase.com:6543/postgres\n');
    console.log('  Option 3 - Session mode (for migrations):');
    console.log('  postgresql://postgres.ivndncmwohshbvpjbxcx:HYWL7SSfgNFUdRsa@aws-0-eu-central-1.pooler.supabase.com:5432/postgres\n');

    console.log('⚠️  Note: The exact format depends on your Supabase project region.');
    console.log('     Check your Supabase dashboard for the correct connection string.');
  });
});

req.on('error', (error) => {
  console.error('❌ Failed to connect to Supabase API:', error.message);
});

req.end();