import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateEquipmentComponentsTable1731585600001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create component_type enum
    await queryRunner.query(`
      CREATE TYPE equipment_component_type_enum AS ENUM (
        'hopper',
        'grinder',
        'brewer',
        'mixer',
        'cooling_unit',
        'payment_terminal',
        'dispenser',
        'pump',
        'water_filter',
        'coin_acceptor',
        'bill_acceptor',
        'display',
        'other'
      );
    `);

    // Create component_status enum
    await queryRunner.query(`
      CREATE TYPE equipment_component_status_enum AS ENUM (
        'active',
        'needs_maintenance',
        'needs_replacement',
        'replaced',
        'broken'
      );
    `);

    // Create equipment_components table
    await queryRunner.createTable(
      new Table({
        name: 'equipment_components',
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
            isNullable: false,
          },
          {
            name: 'component_type',
            type: 'equipment_component_type_enum',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'model',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'serial_number',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'manufacturer',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'equipment_component_status_enum',
            default: "'active'",
            isNullable: false,
          },
          {
            name: 'installation_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'last_maintenance_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'next_maintenance_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'maintenance_interval_days',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'working_hours',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'expected_lifetime_hours',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'replacement_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'replaced_by_component_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'replaces_component_id',
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
            name: 'warranty_expiration_date',
            type: 'date',
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
      'equipment_components',
      new TableIndex({
        name: 'IDX_equipment_components_machine_id',
        columnNames: ['machine_id'],
      }),
    );

    await queryRunner.createIndex(
      'equipment_components',
      new TableIndex({
        name: 'IDX_equipment_components_component_type',
        columnNames: ['component_type'],
      }),
    );

    await queryRunner.createIndex(
      'equipment_components',
      new TableIndex({
        name: 'IDX_equipment_components_status',
        columnNames: ['status'],
      }),
    );

    // Create foreign key to machines table
    await queryRunner.createForeignKey(
      'equipment_components',
      new TableForeignKey({
        name: 'FK_equipment_components_machine',
        columnNames: ['machine_id'],
        referencedTableName: 'machines',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.dropForeignKey('equipment_components', 'FK_equipment_components_machine');

    // Drop indexes
    await queryRunner.dropIndex('equipment_components', 'IDX_equipment_components_status');
    await queryRunner.dropIndex('equipment_components', 'IDX_equipment_components_component_type');
    await queryRunner.dropIndex('equipment_components', 'IDX_equipment_components_machine_id');

    // Drop table
    await queryRunner.dropTable('equipment_components');

    // Drop enums
    await queryRunner.query('DROP TYPE equipment_component_status_enum');
    await queryRunner.query('DROP TYPE equipment_component_type_enum');
  }
}
