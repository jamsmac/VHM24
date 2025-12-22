// Register ts-paths before imports
import 'tsconfig-paths/register';

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Logger } from '@nestjs/common';
import { seedDictionaries } from './dictionaries.seed';
import { seedRBAC } from './rbac.seed';

// Load environment variables
config();

const logger = new Logger('RunSeed');

/**
 * Get database configuration from environment variables
 * NO DEFAULT CREDENTIALS - all must be explicitly provided for security
 */
const getDatabaseConfig = () => {
  // Prefer DATABASE_URL if available
  if (process.env.DATABASE_URL) {
    return {
      type: 'postgres' as const,
      url: process.env.DATABASE_URL,
      ssl:
        process.env.DATABASE_SSL === 'true' || process.env.DATABASE_SSL === '1'
          ? { rejectUnauthorized: false }
          : false,
    };
  }

  // Check for required individual variables - NO DEFAULTS
  const requiredVars = ['DATABASE_HOST', 'DATABASE_USER', 'DATABASE_PASSWORD', 'DATABASE_NAME'];
  const missingVars = requiredVars.filter((v) => !process.env[v]);

  if (missingVars.length > 0) {
    logger.error('❌ Missing required database configuration!');
    logger.error(`   Missing: ${missingVars.join(', ')}`);
    logger.error('');
    logger.error('Provide either:');
    logger.error('  - DATABASE_URL (connection string)');
    logger.error('  - Or all of: DATABASE_HOST, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME');
    process.exit(1);
  }

  return {
    type: 'postgres' as const,
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    ssl:
      process.env.DATABASE_SSL === 'true' || process.env.DATABASE_SSL === '1'
        ? { rejectUnauthorized: false }
        : false,
  };
};

const AppDataSource = new DataSource({
  ...getDatabaseConfig(),
  entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
  synchronize: false,
});

async function runSeeds() {
  logger.log('🌱 Запуск seeding процесса...\n');

  try {
    // Initialize connection
    await AppDataSource.initialize();
    logger.log('✅ Подключение к БД установлено\n');

    // Run seeds
    await seedRBAC(AppDataSource);
    await seedDictionaries(AppDataSource);

    logger.log('\n🎉 Seeding успешно завершен!');
  } catch (error) {
    logger.error('❌ Ошибка при seeding:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

runSeeds();
