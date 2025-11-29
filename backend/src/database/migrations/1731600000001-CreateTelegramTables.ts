import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateTelegramTables1731600000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums (IF NOT EXISTS)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE telegram_user_status_enum AS ENUM ('active', 'blocked', 'inactive');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE telegram_language_enum AS ENUM ('ru', 'en');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE telegram_bot_mode_enum AS ENUM ('polling', 'webhook');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE telegram_message_type_enum AS ENUM ('command', 'notification', 'callback', 'message', 'error');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE telegram_message_status_enum AS ENUM ('sent', 'delivered', 'failed', 'read');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create telegram_users table
    await queryRunner.createTable(
      new Table({
        name: 'telegram_users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'telegram_id',
            type: 'bigint',
            isUnique: true,
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'chat_id',
            type: 'bigint',
          },
          {
            name: 'username',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'first_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'last_name',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'language',
            type: 'telegram_language_enum',
            default: "'ru'",
          },
          {
            name: 'status',
            type: 'telegram_user_status_enum',
            default: "'active'",
          },
          {
            name: 'notification_preferences',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'last_interaction_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'verification_code',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'is_verified',
            type: 'boolean',
            default: false,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create telegram_settings table
    await queryRunner.createTable(
      new Table({
        name: 'telegram_settings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'setting_key',
            type: 'varchar',
            length: '255',
            isUnique: true,
          },
          {
            name: 'bot_token',
            type: 'text',
          },
          {
            name: 'bot_username',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'mode',
            type: 'telegram_bot_mode_enum',
            default: "'polling'",
          },
          {
            name: 'webhook_url',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'send_notifications',
            type: 'boolean',
            default: true,
          },
          {
            name: 'default_notification_preferences',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'metadata',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create telegram_message_logs table
    await queryRunner.createTable(
      new Table({
        name: 'telegram_message_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'telegram_user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'chat_id',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'message_type',
            type: 'telegram_message_type_enum',
          },
          {
            name: 'command',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'message_text',
            type: 'text',
          },
          {
            name: 'telegram_message_id',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'telegram_message_status_enum',
            default: "'sent'",
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create foreign keys (with IF NOT EXISTS check)
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_8cc5abda61af748c5d19155ce20'
        ) THEN
          ALTER TABLE "telegram_users" ADD CONSTRAINT "FK_8cc5abda61af748c5d19155ce20"
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_telegram_message_logs_telegram_user'
        ) THEN
          ALTER TABLE "telegram_message_logs" ADD CONSTRAINT "FK_telegram_message_logs_telegram_user"
            FOREIGN KEY ("telegram_user_id") REFERENCES "telegram_users"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Create indexes (IF NOT EXISTS)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_telegram_users_user_id" ON "telegram_users" ("user_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_telegram_users_telegram_id" ON "telegram_users" ("telegram_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_telegram_users_verification_code" ON "telegram_users" ("verification_code");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_telegram_message_logs_telegram_user_id" ON "telegram_message_logs" ("telegram_user_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_telegram_message_logs_chat_id" ON "telegram_message_logs" ("chat_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_telegram_message_logs_created_at" ON "telegram_message_logs" ("created_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('telegram_message_logs', 'idx_telegram_message_logs_created_at');
    await queryRunner.dropIndex('telegram_message_logs', 'idx_telegram_message_logs_chat_id');
    await queryRunner.dropIndex(
      'telegram_message_logs',
      'idx_telegram_message_logs_telegram_user_id',
    );
    await queryRunner.dropIndex('telegram_users', 'idx_telegram_users_verification_code');
    await queryRunner.dropIndex('telegram_users', 'idx_telegram_users_telegram_id');
    await queryRunner.dropIndex('telegram_users', 'idx_telegram_users_user_id');

    // Drop foreign keys
    const telegramMessageLogsTable = await queryRunner.getTable('telegram_message_logs');
    const telegramMessageLogsForeignKey = telegramMessageLogsTable!.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('telegram_user_id') !== -1,
    );
    if (telegramMessageLogsForeignKey) {
      await queryRunner.dropForeignKey('telegram_message_logs', telegramMessageLogsForeignKey);
    }

    const telegramUsersTable = await queryRunner.getTable('telegram_users');
    const telegramUsersForeignKey = telegramUsersTable!.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('user_id') !== -1,
    );
    if (telegramUsersForeignKey) {
      await queryRunner.dropForeignKey('telegram_users', telegramUsersForeignKey);
    }

    // Drop tables
    await queryRunner.dropTable('telegram_message_logs');
    await queryRunner.dropTable('telegram_settings');
    await queryRunner.dropTable('telegram_users');

    // Drop enums
    await queryRunner.query(`DROP TYPE telegram_message_status_enum`);
    await queryRunner.query(`DROP TYPE telegram_message_type_enum`);
    await queryRunner.query(`DROP TYPE telegram_bot_mode_enum`);
    await queryRunner.query(`DROP TYPE telegram_language_enum`);
    await queryRunner.query(`DROP TYPE telegram_user_status_enum`);
  }
}
