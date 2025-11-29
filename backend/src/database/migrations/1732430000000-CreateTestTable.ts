import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateTestTable1732430000000 implements MigrationInterface {
  name = 'CreateTestTable1732430000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create test_table
    await queryRunner.createTable(
      new Table({
        name: 'test_table',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
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

    // Create index on name for faster lookups
    await queryRunner.createIndex(
      'test_table',
      new TableIndex({
        name: 'IDX_test_table_name',
        columnNames: ['name'],
      }),
    );

    // Create index on created_at for time-based queries
    await queryRunner.createIndex(
      'test_table',
      new TableIndex({
        name: 'IDX_test_table_created_at',
        columnNames: ['created_at'],
      }),
    );

    // Add table comment
    await queryRunner.query(`
      COMMENT ON TABLE test_table IS 'Test table for demonstration purposes';
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN test_table.name IS 'Name field for testing';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.dropIndex('test_table', 'IDX_test_table_created_at');
    await queryRunner.dropIndex('test_table', 'IDX_test_table_name');

    // Drop table
    await queryRunner.dropTable('test_table', true);
  }
}
