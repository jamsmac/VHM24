import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateTelegramBotAnalytics1734700000000 implements MigrationInterface {
  name = 'CreateTelegramBotAnalytics1734700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type for event types
    await queryRunner.query(`
      CREATE TYPE "telegram_analytics_event_type_enum" AS ENUM (
        'quick_action',
        'command',
        'callback',
        'voice_command',
        'qr_scan',
        'location_share'
      )
    `);

    // Create telegram_bot_analytics table
    await queryRunner.createTable(
      new Table({
        name: 'telegram_bot_analytics',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'telegram_user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'event_type',
            type: 'telegram_analytics_event_type_enum',
            default: "'quick_action'",
          },
          {
            name: 'action_name',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'action_category',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'response_time_ms',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'success',
            type: 'boolean',
            default: true,
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
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['telegram_user_id'],
            referencedTableName: 'telegram_users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true,
    );

    // Create indexes for efficient querying
    await queryRunner.createIndex(
      'telegram_bot_analytics',
      new TableIndex({
        name: 'IDX_telegram_analytics_event_type_created',
        columnNames: ['event_type', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'telegram_bot_analytics',
      new TableIndex({
        name: 'IDX_telegram_analytics_action_name_created',
        columnNames: ['action_name', 'created_at'],
      }),
    );

    await queryRunner.createIndex(
      'telegram_bot_analytics',
      new TableIndex({
        name: 'IDX_telegram_analytics_user_created',
        columnNames: ['telegram_user_id', 'created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex(
      'telegram_bot_analytics',
      'IDX_telegram_analytics_user_created',
    );
    await queryRunner.dropIndex(
      'telegram_bot_analytics',
      'IDX_telegram_analytics_action_name_created',
    );
    await queryRunner.dropIndex(
      'telegram_bot_analytics',
      'IDX_telegram_analytics_event_type_created',
    );

    // Drop table
    await queryRunner.dropTable('telegram_bot_analytics');

    // Drop enum type
    await queryRunner.query('DROP TYPE "telegram_analytics_event_type_enum"');
  }
}
