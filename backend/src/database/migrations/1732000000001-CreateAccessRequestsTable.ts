import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateAccessRequestsTable1732000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create access_requests table
    await queryRunner.createTable(
      new Table({
        name: 'access_requests',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'telegram_id',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'telegram_username',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'telegram_first_name',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'telegram_last_name',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'source',
            type: 'enum',
            enum: ['telegram', 'web', 'manual'],
            default: "'telegram'",
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['new', 'approved', 'rejected'],
            default: "'new'",
          },
          {
            name: 'processed_by_user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'processed_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'rejection_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'notes',
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
      'access_requests',
      new TableIndex({
        name: 'IDX_access_requests_telegram_id',
        columnNames: ['telegram_id'],
      }),
    );

    await queryRunner.createIndex(
      'access_requests',
      new TableIndex({
        name: 'IDX_access_requests_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'access_requests',
      new TableIndex({
        name: 'IDX_access_requests_created_at',
        columnNames: ['created_at'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'access_requests',
      new TableForeignKey({
        columnNames: ['processed_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        name: 'FK_access_requests_processed_by_user',
      }),
    );

    await queryRunner.createForeignKey(
      'access_requests',
      new TableForeignKey({
        columnNames: ['created_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        name: 'FK_access_requests_created_user',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey('access_requests', 'FK_access_requests_created_user');
    await queryRunner.dropForeignKey('access_requests', 'FK_access_requests_processed_by_user');

    // Drop indexes
    await queryRunner.dropIndex('access_requests', 'IDX_access_requests_created_at');
    await queryRunner.dropIndex('access_requests', 'IDX_access_requests_status');
    await queryRunner.dropIndex('access_requests', 'IDX_access_requests_telegram_id');

    // Drop table
    await queryRunner.dropTable('access_requests');
  }
}
