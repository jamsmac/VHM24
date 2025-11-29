import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * REQ-MD-MACH-02: История перемещений аппаратов между локациями
 */
export class CreateMachineLocationHistory1732210000000 implements MigrationInterface {
  name = 'CreateMachineLocationHistory1732210000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'machine_location_history',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'machine_id',
            type: 'uuid',
          },
          {
            name: 'from_location_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'to_location_id',
            type: 'uuid',
          },
          {
            name: 'moved_at',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'moved_by_user_id',
            type: 'uuid',
          },
          {
            name: 'reason',
            type: 'varchar',
            length: '100',
            isNullable: true,
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
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['machine_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'machines',
            onDelete: 'CASCADE',
          },
          {
            columnNames: ['from_location_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'locations',
            onDelete: 'SET NULL',
          },
          {
            columnNames: ['to_location_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'locations',
            onDelete: 'RESTRICT',
          },
          {
            columnNames: ['moved_by_user_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'RESTRICT',
          },
        ],
      }),
      true,
    );

    // Indexes
    await queryRunner.createIndex(
      'machine_location_history',
      new TableIndex({
        name: 'IDX_MACHINE_LOCATION_HISTORY_MACHINE',
        columnNames: ['machine_id'],
      }),
    );

    await queryRunner.createIndex(
      'machine_location_history',
      new TableIndex({
        name: 'IDX_MACHINE_LOCATION_HISTORY_DATE',
        columnNames: ['moved_at'],
      }),
    );

    await queryRunner.createIndex(
      'machine_location_history',
      new TableIndex({
        name: 'IDX_MACHINE_LOCATION_HISTORY_TO_LOCATION',
        columnNames: ['to_location_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'machine_location_history',
      'IDX_MACHINE_LOCATION_HISTORY_TO_LOCATION',
    );
    await queryRunner.dropIndex('machine_location_history', 'IDX_MACHINE_LOCATION_HISTORY_DATE');
    await queryRunner.dropIndex('machine_location_history', 'IDX_MACHINE_LOCATION_HISTORY_MACHINE');
    await queryRunner.dropTable('machine_location_history', true);
  }
}
