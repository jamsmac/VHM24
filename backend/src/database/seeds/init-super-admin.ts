import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

/**
 * Initialize Super Admin User
 *
 * Creates the initial super admin account with Telegram integration
 */
export async function initSuperAdmin(dataSource: DataSource) {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Check if super admin already exists
    const existingAdmin = await queryRunner.query(
      `SELECT id FROM users WHERE telegram_id = $1 OR email = $2`,
      ['42283329', 'admin@vendhub.com'],
    );

    if (existingAdmin.length > 0) {
      console.log('✅ Super Admin already exists');
      await queryRunner.commitTransaction();
      return;
    }

    // Create super admin user
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash('VendHub2024!', 12);

    await queryRunner.query(
      `INSERT INTO users (
        id,
        email,
        password_hash,
        first_name,
        last_name,
        phone,
        telegram_id,
        telegram_username,
        role,
        is_active,
        is_verified,
        is_two_fa_enabled,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())`,
      [
        userId,
        'admin@vendhub.com',
        passwordHash,
        'Jamshiddin',
        'Admin',
        '+998901234567',
        '42283329',
        'Jamshiddin',
        'SUPER_ADMIN',
        true,
        true,
        false,
      ],
    );

    console.log('✅ Super Admin created successfully!');
    console.log('📧 Email: admin@vendhub.com');
    console.log('🔑 Password: VendHub2024!');
    console.log('🤖 Telegram: @Jamshiddin (ID: 42283329)');
    console.log('⚠️  Please change the password after first login!');

    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Failed to create super admin:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

// Run if executed directly
if (require.main === module) {
  const AppDataSource = require('../config/typeorm.config').AppDataSource;

  AppDataSource.initialize()
    .then(async () => {
      await initSuperAdmin(AppDataSource);
      await AppDataSource.destroy();
    })
    .catch((error: any) => {
      console.error('Error:', error);
      process.exit(1);
    });
}
