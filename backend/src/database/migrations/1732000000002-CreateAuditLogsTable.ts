import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateAuditLogsTable1732000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create audit_logs table
    await queryRunner.createTable(
      new Table({
        name: 'audit_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'event_type',
            type: 'enum',
            enum: [
              'login_success',
              'login_failed',
              'logout',
              'token_refresh',
              'password_changed',
              'password_reset_requested',
              'password_reset_completed',
              '2fa_enabled',
              '2fa_disabled',
              '2fa_verified',
              '2fa_failed',
              'account_created',
              'account_updated',
              'account_blocked',
              'account_unblocked',
              'account_deleted',
              'role_assigned',
              'role_removed',
              'permission_changed',
              'access_request_created',
              'access_request_approved',
              'access_request_rejected',
              'brute_force_detected',
              'ip_blocked',
              'suspicious_activity',
              'session_created',
              'session_terminated',
              'session_expired',
            ],
          },
          {
            name: 'severity',
            type: 'enum',
            enum: ['info', 'warning', 'error', 'critical'],
            default: "'info'",
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'target_user_id',
            type: 'uuid',
            isNullable: true,
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
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            default: "'{}'",
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
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_event_type',
        columnNames: ['event_type'],
      }),
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_created_at',
        columnNames: ['created_at'],
      }),
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_severity',
        columnNames: ['severity'],
      }),
    );

    await queryRunner.createIndex(
      'audit_logs',
      new TableIndex({
        name: 'IDX_audit_logs_ip_address',
        columnNames: ['ip_address'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'audit_logs',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        name: 'FK_audit_logs_user',
      }),
    );

    await queryRunner.createForeignKey(
      'audit_logs',
      new TableForeignKey({
        columnNames: ['target_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        name: 'FK_audit_logs_target_user',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey('audit_logs', 'FK_audit_logs_target_user');
    await queryRunner.dropForeignKey('audit_logs', 'FK_audit_logs_user');

    // Drop indexes
    await queryRunner.dropIndex('audit_logs', 'IDX_audit_logs_ip_address');
    await queryRunner.dropIndex('audit_logs', 'IDX_audit_logs_severity');
    await queryRunner.dropIndex('audit_logs', 'IDX_audit_logs_created_at');
    await queryRunner.dropIndex('audit_logs', 'IDX_audit_logs_user_id');
    await queryRunner.dropIndex('audit_logs', 'IDX_audit_logs_event_type');

    // Drop table
    await queryRunner.dropTable('audit_logs');
  }
}
