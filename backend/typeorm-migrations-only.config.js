require('dotenv').config();
const { DataSource } = require('typeorm');

module.exports = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  entities: [], // No entities needed for migrations
  migrations: ['dist/database/migrations/*.js'],
  synchronize: false,
  logging: true,
});
