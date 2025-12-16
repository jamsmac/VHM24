#!/usr/bin/env ts-node

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User, UserRole, UserStatus } from '../../modules/users/entities/user.entity';
import { Role } from '../../modules/rbac/entities/role.entity';
import * as readline from 'readline';

// Load environment variables
config();

const logger = new Logger('CreateSuperAdmin');

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

interface CreateSuperAdminInput {
  email: string;
  password: string;
  full_name: string;
  telegram_user_id?: string;
  telegram_username?: string;
}

/**
 * Create SuperAdmin user
 *
 * REQ-AUTH-04: Bootstrap first SuperAdmin
 *
 * This script creates the first SuperAdmin user in the system.
 * It should ONLY be run when the system is first set up.
 *
 * Usage:
 *   npm run create-superadmin
 *
 * Or with arguments:
 *   npm run create-superadmin -- --email admin@vendhub.ru --password SecurePass123! --name "Admin User"
 *
 * Or with Telegram:
 *   npm run create-superadmin -- --email admin@vendhub.ru --password SecurePass123! --name "Admin User" --telegram-id 42283329 --telegram-username Jamshiddin
 */

function parseArguments(): Partial<CreateSuperAdminInput> | null {
  const args = process.argv.slice(2);
  const input: Partial<CreateSuperAdminInput> = {};

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

async function promptForInput(): Promise<CreateSuperAdminInput> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const input: Partial<CreateSuperAdminInput> = {};

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
                  resolve(input as CreateSuperAdminInput);
                },
              );
            },
          );
        });
      });
    });
  });
}

async function createSuperAdmin(input: CreateSuperAdminInput): Promise<void> {
  logger.log('\n🚀 Создание SuperAdmin пользователя...\n');

  try {
    // Initialize connection
    await AppDataSource.initialize();
    logger.log('✅ Подключение к БД установлено');

    const userRepository = AppDataSource.getRepository(User);
    const roleRepository = AppDataSource.getRepository(Role);

    // Check if SuperAdmin role exists
    const superAdminRole = await roleRepository.findOne({
      where: { name: 'SuperAdmin' },
    });

    if (!superAdminRole) {
      logger.error('❌ Роль SuperAdmin не найдена в БД!');
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
    const password_hash = await bcrypt.hash(input.password, 10);

    // Create user
    const user = userRepository.create({
      email: input.email,
      password_hash,
      full_name: input.full_name,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      telegram_user_id: input.telegram_user_id || null,
      telegram_username: input.telegram_username || null,
      requires_password_change: false, // SuperAdmin doesn't need to change password
      is_2fa_enabled: false,
      roles: [superAdminRole],
    });

    await userRepository.save(user);

    logger.log('\n✅ SuperAdmin успешно создан!');
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
    logger.log('\n✨ SuperAdmin может:');
    logger.log('   - Управлять всеми пользователями');
    logger.log('   - Назначать любые роли (включая Admin)');
    logger.log('   - Просматривать audit logs');
    logger.log('   - Полный доступ ко всем функциям системы');
    logger.log('\n');
  } catch (error) {
    logger.error('❌ Ошибка при создании SuperAdmin:', error);
    throw error;
  } finally {
    await AppDataSource.destroy();
  }
}

async function main() {
  logger.log('═══════════════════════════════════════════════════════════');
  logger.log('   VendHub Manager - Create SuperAdmin User');
  logger.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Parse command line arguments
    const argsInput = parseArguments();

    let input: CreateSuperAdminInput;

    if (argsInput && argsInput.email && argsInput.password && argsInput.full_name) {
      // Use provided arguments
      input = argsInput as CreateSuperAdminInput;
      logger.log('📝 Используются параметры из командной строки\n');
    } else {
      // Prompt for input
      logger.log('📝 Введите данные SuperAdmin пользователя:\n');
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

    // Create SuperAdmin
    await createSuperAdmin(input);

    process.exit(0);
  } catch (error) {
    logger.error('❌ Критическая ошибка:', error);
    process.exit(1);
  }
}

main();
