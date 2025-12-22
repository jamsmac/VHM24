import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { config } from 'dotenv';

// Load environment variables
config();

const logger = new Logger('UpdateOwnerPassword');

/**
 * Update Owner User Password
 * 
 * Updates the password for the owner user to: VendHub2024!Admin
 * 
 * Usage:
 *   npm run update-owner-password
 * 
 * Or with custom password:
 *   PASSWORD="YourNewPassword123!" npm run update-owner-password
 */
async function updateOwnerPassword() {
  const newPassword = process.env.PASSWORD || 'VendHub2024!Admin';
  
  logger.log('🔐 Updating Owner user password...');
  logger.log(`   New password: ${newPassword}`);

  try {
    // Support both DATABASE_URL and individual variables
    const getDatabaseConfig = () => {
      if (process.env.DATABASE_URL) {
        return {
          type: 'postgres' as const,
          url: process.env.DATABASE_URL,
          ssl: process.env.DATABASE_SSL === 'true' || process.env.DATABASE_SSL === '1'
            ? { rejectUnauthorized: false }
            : false,
        };
      }
      return {
        type: 'postgres' as const,
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432'),
        username: process.env.DATABASE_USER || 'vendhub',
        password: process.env.DATABASE_PASSWORD || 'vendhub_password_dev',
        database: process.env.DATABASE_NAME || 'vendhub',
        ssl: process.env.DATABASE_SSL === 'true' || process.env.DATABASE_SSL === '1'
          ? { rejectUnauthorized: false }
          : false,
      };
    };

    const AppDataSource = new DataSource({
      ...getDatabaseConfig(),
      entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
      synchronize: false,
    });

    await AppDataSource.initialize();
    logger.log('✅ Database connection established');

    // Find owner user
    const userResult = await AppDataSource.query(`
      SELECT id, email, full_name, role
      FROM users
      WHERE email = 'admin@vendhub.com'
         OR role IN ('Owner', 'SuperAdmin')
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (userResult.length === 0) {
      logger.error('❌ Owner user not found!');
      logger.warn('   Create owner user first: npm run create-owner');
      process.exit(1);
    }

    const user = userResult[0];
    logger.log(`   Found user: ${user.email} (${user.full_name})`);

    // Hash new password
    logger.log('   Hashing password...');
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await AppDataSource.query(`
      UPDATE users
      SET password_hash = $1,
          updated_at = NOW()
      WHERE id = $2
    `, [passwordHash, user.id]);

    logger.log('✅ Password updated successfully!');
    logger.log('');
    logger.log('📋 Updated credentials:');
    logger.log(`   Email:    ${user.email}`);
    logger.log(`   Password: ${newPassword}`);
    logger.log(`   Role:     ${user.role}`);
    logger.log('');
    logger.log('🔐 You can now login with these credentials');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Failed to update password:', error);
    process.exit(1);
  }
}

updateOwnerPassword();

