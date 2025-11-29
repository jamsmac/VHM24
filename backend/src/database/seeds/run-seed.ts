// Register ts-paths before imports
import 'tsconfig-paths/register';

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { seedDictionaries } from './dictionaries.seed';
import { seedRBAC } from './rbac.seed';

// Load environment variables
config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER || 'vendhub',
  password: process.env.DATABASE_PASSWORD || 'vendhub_password_dev',
  database: process.env.DATABASE_NAME || 'vendhub',
  entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
  synchronize: false,
});

async function runSeeds() {
  console.log('🌱 Запуск seeding процесса...\n');

  try {
    // Initialize connection
    await AppDataSource.initialize();
    console.log('✅ Подключение к БД установлено\n');

    // Run seeds
    await seedRBAC(AppDataSource);
    await seedDictionaries(AppDataSource);

    console.log('\n🎉 Seeding успешно завершен!');
  } catch (error) {
    console.error('❌ Ошибка при seeding:', error);
    process.exit(1);
  } finally {
    await AppDataSource.destroy();
  }
}

runSeeds();
