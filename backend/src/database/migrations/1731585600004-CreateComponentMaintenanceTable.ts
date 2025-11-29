import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateComponentMaintenanceTable1731585600004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create maintenance_type enum
    await queryRunner.query(`
      CREATE TYPE maintenance_type_enum AS ENUM (
        'cleaning',
        'inspection',
        'repair',
        'replacement',
        'calibration',
        'software_update',
        'preventive',
        'other'
      );
    `);

    // Create component_maintenance table
    await queryRunner.createTable(
      new Table({
        name: 'component_maintenance',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'component_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'maintenance_type',
            type: 'maintenance_type_enum',
            isNullable: false,
          },
          {
            name: 'performed_by_user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'performed_at',
            type: 'timestamp with time zone',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'spare_parts_used',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'labor_cost',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'parts_cost',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'total_cost',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'duration_minutes',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'result',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'is_successful',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'next_maintenance_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'photo_urls',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'document_urls',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'task_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'now()',
            isNullable: false,
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
      'component_maintenance',
      new TableIndex({
        name: 'IDX_component_maintenance_component_id',
        columnNames: ['component_id'],
      }),
    );

    await queryRunner.createIndex(
      'component_maintenance',
      new TableIndex({
        name: 'IDX_component_maintenance_performed_at',
        columnNames: ['performed_at'],
      }),
    );

    await queryRunner.createIndex(
      'component_maintenance',
      new TableIndex({
        name: 'IDX_component_maintenance_type',
        columnNames: ['maintenance_type'],
      }),
    );

    // Create foreign key to equipment_components table
    await queryRunner.createForeignKey(
      'component_maintenance',
      new TableForeignKey({
        name: 'FK_component_maintenance_component',
        columnNames: ['component_id'],
        referencedTableName: 'equipment_components',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create foreign key to users table
    await queryRunner.createForeignKey(
      'component_maintenance',
      new TableForeignKey({
        name: 'FK_component_maintenance_user',
        columnNames: ['performed_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey('component_maintenance', 'FK_component_maintenance_user');
    await queryRunner.dropForeignKey('component_maintenance', 'FK_component_maintenance_component');

    // Drop indexes
    await queryRunner.dropIndex('component_maintenance', 'IDX_component_maintenance_type');
    await queryRunner.dropIndex('component_maintenance', 'IDX_component_maintenance_performed_at');
    await queryRunner.dropIndex('component_maintenance', 'IDX_component_maintenance_component_id');

    // Drop table
    await queryRunner.dropTable('component_maintenance');

    // Drop enum
    await queryRunner.query('DROP TYPE maintenance_type_enum');
  }
}
