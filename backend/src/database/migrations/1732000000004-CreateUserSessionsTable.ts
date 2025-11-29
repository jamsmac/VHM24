import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration: Create user_sessions table
 *
 * REQ-AUTH-54: Session Tracking
 * REQ-AUTH-55: Refresh Token Rotation
 * REQ-AUTH-61: Session Limits
 *
 * Creates table for tracking user sessions with:
 * - Refresh token storage (hashed)
 * - Device information (IP, user agent, device type, OS, browser)
 * - Session status tracking (active, expired, revoked)
 * - Last activity tracking
 * - Session metadata
 */
export class CreateUserSessionsTable1732000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create user_sessions table
    await queryRunner.createTable(
      new Table({
        name: 'user_sessions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'refresh_token_hash',
            type: 'text',
          },
          {
            name: 'ip_address',
            type: 'inet',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'device_type',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'device_name',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'os',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'browser',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'last_used_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'expires_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'revoked_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'revoked_reason',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
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
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'user_sessions',
      new TableIndex({
        name: 'IDX_user_sessions_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'user_sessions',
      new TableIndex({
        name: 'IDX_user_sessions_refresh_token_hash',
        columnNames: ['refresh_token_hash'],
      }),
    );

    await queryRunner.createIndex(
      'user_sessions',
      new TableIndex({
        name: 'IDX_user_sessions_is_active',
        columnNames: ['is_active'],
      }),
    );

    await queryRunner.createIndex(
      'user_sessions',
      new TableIndex({
        name: 'IDX_user_sessions_last_used_at',
        columnNames: ['last_used_at'],
      }),
    );

    await queryRunner.createIndex(
      'user_sessions',
      new TableIndex({
        name: 'IDX_user_sessions_expires_at',
        columnNames: ['expires_at'],
      }),
    );

    // Create foreign key to users table
    await queryRunner.createForeignKey(
      'user_sessions',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_user_sessions_user',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.dropForeignKey('user_sessions', 'FK_user_sessions_user');

    // Drop indexes
    await queryRunner.dropIndex('user_sessions', 'IDX_user_sessions_expires_at');
    await queryRunner.dropIndex('user_sessions', 'IDX_user_sessions_last_used_at');
    await queryRunner.dropIndex('user_sessions', 'IDX_user_sessions_is_active');
    await queryRunner.dropIndex('user_sessions', 'IDX_user_sessions_refresh_token_hash');
    await queryRunner.dropIndex('user_sessions', 'IDX_user_sessions_user_id');

    // Drop table
    await queryRunner.dropTable('user_sessions');
  }
}
