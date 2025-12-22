#!/usr/bin/env ts-node

import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User, UserRole, UserStatus } from '../../modules/users/entities/user.entity';
import { Role } from '../../modules/rbac/entities/role.entity';
import * as readline from 'readline';

// Load environment variables
config();

const logger = new Logger('CreateOwner');

/**
 * Get database configuration from environment variables
 * NO DEFAULT CREDENTIALS - all must be explicitly provided
 */
function getDatabaseConfig(): DataSourceOptions {
  // Prefer DATABASE_URL if available
  if (process.env.DATABASE_URL) {
    return {
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
      synchronize: false,
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
    logger.error('');
    logger.error('Example:');
    logger.error('  DATABASE_URL="postgresql://user:pass@host:5432/db" npm run create-owner');
    process.exit(1);
  }

  return {
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
    synchronize: false,
    ssl:
      process.env.DATABASE_SSL === 'true' || process.env.DATABASE_SSL === '1'
        ? { rejectUnauthorized: false }
        : false,
  };
}

// Initialize DataSource lazily to allow validation first
let AppDataSource: DataSource;

interface CreateOwnerInput {
  email: string;
  password: string;
  full_name: string;
  telegram_user_id?: string;
  telegram_username?: string;
}

/**
 * Create Owner user
 *
 * REQ-AUTH-04: Bootstrap first Owner
 *
 * This script creates the first Owner user in the system.
 * It should ONLY be run when the system is first set up.
 *
 * Usage:
 *   npm run create-owner
 *
 * Or with arguments:
 *   npm run create-owner -- --email admin@vendhub.ru --password SecurePass123! --name "Admin User"
 *
 * Or with Telegram:
 *   npm run create-owner -- --email admin@vendhub.ru --password SecurePass123! --name "Admin User" --telegram-id 42283329 --telegram-username Jamshiddin
 */

function parseArguments(): Partial<CreateOwnerInput> | null {
  const args = process.argv.slice(2);
  const input: Partial<CreateOwnerInput> = {};

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--email':
        input.email = args[++i];
        break;
      case '--password':
        input.password = args[++i];
        break;
      case '--name':
        input.full_name = args[++i];
        break;
      case '--telegram-id':
        input.telegram_user_id = args[++i];
        break;
      case '--telegram-username':
        input.telegram_username = args[++i];
        break;
    }
  }

  return Object.keys(input).length > 0 ? input : null;
}

async function promptForInput(): Promise<CreateOwnerInput> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const input: Partial<CreateOwnerInput> = {};

    rl.question('Email: ', (email) => {
      input.email = email;

      rl.question('Password: ', (password) => {
        input.password = password;

        rl.question('Full Name: ', (full_name) => {
          input.full_name = full_name;

          rl.question(
            'Telegram User ID (опционально, Enter для пропуска): ',
            (telegram_user_id) => {
              if (telegram_user_id.trim()) {
                input.telegram_user_id = telegram_user_id.trim();
              }

              rl.question(
                'Telegram Username (опционально, Enter для пропуска): ',
                (telegram_username) => {
                  if (telegram_username.trim()) {
                    input.telegram_username = telegram_username.trim();
                  }

                  rl.close();
                  resolve(input as CreateOwnerInput);
                },
              );
            },
          );
        });
      });
    });
  });
}

async function createOwner(input: CreateOwnerInput): Promise<void> {
  logger.log('\n🚀 Создание Owner пользователя...\n');

  try {
    // Initialize connection with validated config
    AppDataSource = new DataSource(getDatabaseConfig());
    await AppDataSource.initialize();
    logger.log('✅ Подключение к БД установлено');

    const userRepository = AppDataSource.getRepository(User);
    const roleRepository = AppDataSource.getRepository(Role);

    // Check if Owner role exists
    const ownerRole = await roleRepository.findOne({
      where: { name: 'Owner' },
    });

    if (!ownerRole) {
      logger.error('❌ Роль Owner не найдена в БД!');
      logger.warn('⚠️  Сначала запустите: npm run seed');
      process.exit(1);
    }

    // Check if email already exists
    const existingUser = await userRepository.findOne({
      where: { email: input.email },
    });

    if (existingUser) {
      logger.error(`❌ Пользователь с email ${input.email} уже существует!`);
      process.exit(1);
    }

    // Check if Telegram ID already exists (if provided)
    if (input.telegram_user_id) {
      const existingTelegram = await userRepository.findOne({
        where: { telegram_user_id: input.telegram_user_id },
      });

      if (existingTelegram) {
        logger.error(`❌ Пользователь с Telegram ID ${input.telegram_user_id} уже существует!`);
        process.exit(1);
      }
    }

    // Hash password
    const password_hash = await bcrypt.hash(input.password, 12);

    // Create user
    const user = userRepository.create({
      email: input.email,
      password_hash,
      full_name: input.full_name,
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
      telegram_user_id: input.telegram_user_id || null,
      telegram_username: input.telegram_username || null,
      requires_password_change: false, // Owner doesn't need to change password
      is_2fa_enabled: false,
      roles: [ownerRole],
    });

    await userRepository.save(user);

    logger.log('\n✅ Owner успешно создан!');
    logger.log('\n📋 Данные пользователя:');
    logger.log(`   Email:             ${user.email}`);
    logger.log(`   Full Name:         ${user.full_name}`);
    logger.log(`   Role:              ${user.role}`);
    logger.log(`   Status:            ${user.status}`);
    if (user.telegram_user_id) {
      logger.log(`   Telegram ID:       ${user.telegram_user_id}`);
    }
    if (user.telegram_username) {
      logger.log(`   Telegram Username: @${user.telegram_username}`);
    }
    logger.log(`   User ID:           ${user.id}`);
    logger.log('\n🔐 Вход в систему:');
    logger.log(`   URL:      ${process.env.FRONTEND_URL || 'http://localhost:3001'}/login`);
    logger.log(`   Email:    ${user.email}`);
    logger.log(`   Password: [указанный при создании]`);
    logger.log('\n✨ Owner может:');
    logger.log('   - Управлять всеми пользователями');
    logger.log('   - Назначать любые роли (включая Admin)');
    logger.log('   - Просматривать audit logs');
    logger.log('   - Полный доступ ко всем функциям системы');
    logger.log('\n');
  } catch (error) {
    logger.error('❌ Ошибка при создании Owner:', error);
    throw error;
  } finally {
    await AppDataSource.destroy();
  }
}

async function main() {
  logger.log('═══════════════════════════════════════════════════════════');
  logger.log('   VendHub Manager - Create Owner User');
  logger.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Parse command line arguments
    const argsInput = parseArguments();

    let input: CreateOwnerInput;

    if (argsInput && argsInput.email && argsInput.password && argsInput.full_name) {
      // Use provided arguments
      input = argsInput as CreateOwnerInput;
      logger.log('📝 Используются параметры из командной строки\n');
    } else {
      // Prompt for input
      logger.log('📝 Введите данные Owner пользователя:\n');
      input = await promptForInput();
    }

    // Validate input
    if (!input.email || !input.email.includes('@')) {
      logger.error('❌ Некорректный email');
      process.exit(1);
    }

    if (!input.password || input.password.length < 8) {
      logger.error('❌ Пароль должен быть минимум 8 символов');
      process.exit(1);
    }

    if (!input.full_name || input.full_name.trim().length < 2) {
      logger.error('❌ Имя должно быть минимум 2 символа');
      process.exit(1);
    }

    // Create Owner
    await createOwner(input);

    process.exit(0);
  } catch (error) {
    logger.error('❌ Критическая ошибка:', error);
    process.exit(1);
  }
}

main();
