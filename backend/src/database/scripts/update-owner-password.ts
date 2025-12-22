import { DataSource } from 'typeorm';
import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { config } from 'dotenv';

// Load environment variables
config();

const logger = new Logger('UpdateOwnerPassword');

/**
 * Generate a secure random password
 * @param length Password length (default 16)
 * @returns Generated password meeting complexity requirements
 */
function generateSecurePassword(length = 16): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const special = '!@#$%^&*';

  // Ensure at least one of each required character type
  let password = '';
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  password += special[crypto.randomInt(special.length)];

  // Fill the rest with random characters from all sets
  const allChars = uppercase + lowercase + numbers + special;
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(allChars.length)];
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => crypto.randomInt(3) - 1)
    .join('');
}

/**
 * Validate password meets security requirements
 */
function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one digit');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Update Owner User Password
 *
 * Updates the password for the owner user.
 *
 * Usage:
 *   PASSWORD="YourSecurePassword123!" npm run update-owner-password
 *
 * Or generate a random secure password:
 *   GENERATE_PASSWORD=true npm run update-owner-password
 *
 * Required environment variables:
 *   - PASSWORD: New password (or use GENERATE_PASSWORD=true)
 *   - DATABASE_URL or DATABASE_HOST/DATABASE_USER/DATABASE_PASSWORD/DATABASE_NAME
 *
 * Security:
 *   - Password is NOT logged to console
 *   - Only password hint (first 2 chars + ***) is shown
 *   - Use GENERATE_PASSWORD=true for secure random password
 */
async function updateOwnerPassword() {
  logger.log('🔐 Updating Owner user password...');

  // Check for password source
  let newPassword: string;
  const generatePassword = process.env.GENERATE_PASSWORD === 'true';

  if (generatePassword) {
    newPassword = generateSecurePassword(16);
    logger.log('   Generated secure random password');
  } else if (process.env.PASSWORD) {
    newPassword = process.env.PASSWORD;
    logger.log('   Using password from PASSWORD environment variable');
  } else {
    logger.error('❌ PASSWORD environment variable is required!');
    logger.error('');
    logger.error('Usage:');
    logger.error('  PASSWORD="YourSecurePassword123!" npm run update-owner-password');
    logger.error('');
    logger.error('Or generate a random password:');
    logger.error('  GENERATE_PASSWORD=true npm run update-owner-password');
    process.exit(1);
  }

  // Validate password
  const validation = validatePassword(newPassword);
  if (!validation.valid) {
    logger.error('❌ Password does not meet security requirements:');
    validation.errors.forEach((err) => logger.error(`   - ${err}`));
    process.exit(1);
  }

  try {
    // Require database configuration - no defaults
    const getDatabaseConfig = () => {
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

      // Check required individual variables
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

    await AppDataSource.initialize();
    logger.log('✅ Database connection established');

    // Find owner user
    const userResult = await AppDataSource.query(
      `
      SELECT id, email, full_name, role
      FROM users
      WHERE email = 'admin@vendhub.com'
         OR role IN ('Owner', 'SuperAdmin')
      ORDER BY created_at DESC
      LIMIT 1
    `,
    );

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
    await AppDataSource.query(
      `
      UPDATE users
      SET password_hash = $1,
          updated_at = NOW()
      WHERE id = $2
    `,
      [passwordHash, user.id],
    );

    logger.log('✅ Password updated successfully!');
    logger.log('');
    logger.log('📋 Updated credentials:');
    logger.log(`   Email:    ${user.email}`);
    logger.log(`   Role:     ${user.role}`);

    // Show password securely
    if (generatePassword) {
      // For generated passwords, show the full password once (user needs to save it)
      logger.log('');
      logger.log('🔑 GENERATED PASSWORD (save this now, it will not be shown again):');
      logger.log(`   ${newPassword}`);
      logger.log('');
      logger.warn('⚠️  Store this password securely! It cannot be recovered.');
    } else {
      // For user-provided passwords, only show hint
      const passwordHint = newPassword.substring(0, 2) + '***' + newPassword.slice(-2);
      logger.log(`   Password: ${passwordHint} (hint only)`);
    }

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
