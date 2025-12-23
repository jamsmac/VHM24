import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateFcmTokensTable1735400000000 implements MigrationInterface {
  name = 'CreateFcmTokensTable1735400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'fcm_tokens',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
          },
          {
            name: 'token',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'device_type',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'device_name',
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
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'NOW()',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'NOW()',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'fcm_tokens',
      new TableIndex({
        name: 'idx_fcm_tokens_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'fcm_tokens',
      new TableIndex({
        name: 'idx_fcm_tokens_token',
        columnNames: ['token'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('fcm_tokens');
  }
}
