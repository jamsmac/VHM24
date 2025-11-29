import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration: Create password_reset_tokens table
 *
 * REQ-AUTH-45: Password Recovery
 *
 * Creates table for password reset tokens with:
 * - UUID token (unique, auto-generated)
 * - User relation
 * - Expiration tracking (1 hour default)
 * - Usage tracking (used_at)
 * - Request metadata (IP, user agent)
 */
export class CreatePasswordResetTokensTable1732000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create password_reset_tokens table
    await queryRunner.createTable(
      new Table({
        name: 'password_reset_tokens',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'token',
            type: 'uuid',
            isUnique: true,
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'expires_at',
            type: 'timestamp with time zone',
          },
          {
            name: 'used_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'request_ip',
            type: 'inet',
            isNullable: true,
          },
          {
            name: 'request_user_agent',
            type: 'text',
            isNullable: true,
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
      'password_reset_tokens',
      new TableIndex({
        name: 'IDX_password_reset_tokens_token',
        columnNames: ['token'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'password_reset_tokens',
      new TableIndex({
        name: 'IDX_password_reset_tokens_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'password_reset_tokens',
      new TableIndex({
        name: 'IDX_password_reset_tokens_expires_at',
        columnNames: ['expires_at'],
      }),
    );

    await queryRunner.createIndex(
      'password_reset_tokens',
      new TableIndex({
        name: 'IDX_password_reset_tokens_created_at',
        columnNames: ['created_at'],
      }),
    );

    // Create foreign key to users table
    await queryRunner.createForeignKey(
      'password_reset_tokens',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        name: 'FK_password_reset_tokens_user',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.dropForeignKey('password_reset_tokens', 'FK_password_reset_tokens_user');

    // Drop indexes
    await queryRunner.dropIndex('password_reset_tokens', 'IDX_password_reset_tokens_created_at');
    await queryRunner.dropIndex('password_reset_tokens', 'IDX_password_reset_tokens_expires_at');
    await queryRunner.dropIndex('password_reset_tokens', 'IDX_password_reset_tokens_user_id');
    await queryRunner.dropIndex('password_reset_tokens', 'IDX_password_reset_tokens_token');

    // Drop table
    await queryRunner.dropTable('password_reset_tokens');
  }
}
