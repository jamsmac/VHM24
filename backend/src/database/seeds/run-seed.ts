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

// Support both DATABASE_URL and individual variables
const getDatabaseConfig = () => {
  if (process.env.DATABASE_URL) {
    return {
      type: 'postgres' as const,
      url: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    };
  }
  return {
    type: 'postgres' as const,
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USER || 'vendhub',
    password: process.env.DATABASE_PASSWORD || 'vendhub_password_dev',
    database: process.env.DATABASE_NAME || 'vendhub',
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
