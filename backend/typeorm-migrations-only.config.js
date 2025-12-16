require('dotenv').config();
const { DataSource } = require('typeorm');

// Load .env.production if exists, otherwise .env
require('dotenv').config({ path: '.env.production' });
require('dotenv').config(); // Fallback to .env

// Support both DATABASE_URL and individual variables
const getDatabaseConfig = () => {
  if (process.env.DATABASE_URL) {
    return {
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' || process.env.DATABASE_SSL === '1'
        ? { rejectUnauthorized: false }
        : false,
    };
  }
  return {
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    ssl: process.env.DATABASE_SSL === 'true' || process.env.DATABASE_SSL === '1'
      ? { rejectUnauthorized: false }
      : false,
  };
};

module.exports = new DataSource({
  ...getDatabaseConfig(),
  entities: [], // No entities needed for migrations
  migrations: ['dist/database/migrations/*.js'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development' || process.env.MIGRATION_LOGGING === 'true',
});
