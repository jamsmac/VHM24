import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const logger = new Logger('InitOwner');

/**
 * Initialize Owner User
 *
 * Creates the initial owner account with Telegram integration
 */
export async function initOwner(dataSource: DataSource) {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Check if owner already exists
    const existingOwner = await queryRunner.query(
      `SELECT id FROM users WHERE telegram_user_id = $1 OR email = $2`,
      ['42283329', 'admin@vendhub.com'],
    );

    if (existingOwner.length > 0) {
      logger.log('✅ Owner already exists');
      await queryRunner.commitTransaction();
      return;
    }

    // Create owner user
    const userId = uuidv4();
    const initialPassword = process.env.INITIAL_ADMIN_PASSWORD;
    if (!initialPassword) {
      throw new Error(
        'INITIAL_ADMIN_PASSWORD environment variable is required for seeding. ' +
          'Set it in .env file and change it immediately after first login.',
      );
    }
    const passwordHash = await bcrypt.hash(initialPassword, 12);

    await queryRunner.query(
      `INSERT INTO users (
        id,
        email,
        password_hash,
        full_name,
        phone,
        telegram_user_id,
        telegram_username,
        role,
        status,
        is_2fa_enabled,
        requires_password_change,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
      [
        userId,
        'admin@vendhub.com',
        passwordHash,
        'Jamshiddin Admin',
        '+998901234567',
        '42283329',
        'Jamshiddin',
        'Owner',
        'active',
        false,
        false,
      ],
    );

    logger.log('✅ Owner created successfully!');
    logger.log('📧 Email: admin@vendhub.com');
    logger.log('🔑 Password: [set via INITIAL_ADMIN_PASSWORD env var]');
    logger.log('🤖 Telegram: @Jamshiddin (ID: 42283329)');
    logger.warn('⚠️  SECURITY: Change the password immediately after first login!');

    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    logger.error('❌ Failed to create owner:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

// Run if executed directly
if (require.main === module) {
  const { DataSource } = require('typeorm');
  const { config } = require('dotenv');

  config();

  // Support both DATABASE_URL and individual variables
  const getDatabaseConfig = () => {
    if (process.env.DATABASE_URL) {
      return {
        type: 'postgres',
        url: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
      };
    }
    return {
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      username: process.env.DATABASE_USER || 'vendhub',
      password: process.env.DATABASE_PASSWORD || 'vendhub_password_dev',
      database: process.env.DATABASE_NAME || 'vendhub',
    };
  };

  const AppDataSource = new DataSource({
    ...getDatabaseConfig(),
    entities: [],
    synchronize: false,
  });

  AppDataSource.initialize()
    .then(async () => {
      await initOwner(AppDataSource);
      await AppDataSource.destroy();
      process.exit(0);
    })
    .catch((error: unknown) => {
      logger.error('Error:', error);
      process.exit(1);
    });
}
