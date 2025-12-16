require('dotenv').config();
const { DataSource } = require('typeorm');

// Load .env.production if exists, otherwise .env
require('dotenv').config({ path: '.env.production' });
require('dotenv').config(); // Fallback to .env

module.exports = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  // SSL configuration for Supabase
  ssl: process.env.DATABASE_SSL === 'true' || process.env.DATABASE_SSL === '1' 
    ? { rejectUnauthorized: false }
    : false,
  entities: [], // No entities needed for migrations
  migrations: ['dist/database/migrations/*.js'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development' || process.env.MIGRATION_LOGGING === 'true',
});
