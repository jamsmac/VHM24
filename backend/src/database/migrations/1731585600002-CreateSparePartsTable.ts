import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateSparePartsTable1731585600002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create spare_parts table
    await queryRunner.createTable(
      new Table({
        name: 'spare_parts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'part_number',
            type: 'varchar',
            length: '100',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'component_type',
            type: 'equipment_component_type_enum',
            isNullable: false,
          },
          {
            name: 'manufacturer',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'model_compatibility',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'quantity_in_stock',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'min_stock_level',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'max_stock_level',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'unit',
            type: 'varchar',
            length: '50',
            default: "'pcs'",
            isNullable: false,
          },
          {
            name: 'unit_price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
            isNullable: false,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '10',
            default: "'UZS'",
            isNullable: false,
          },
          {
            name: 'supplier_name',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'supplier_part_number',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'supplier_contact',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'lead_time_days',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'storage_location',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'shelf_number',
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
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'image_urls',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'discontinued_date',
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
      'spare_parts',
      new TableIndex({
        name: 'IDX_spare_parts_part_number',
        columnNames: ['part_number'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'spare_parts',
      new TableIndex({
        name: 'IDX_spare_parts_component_type',
        columnNames: ['component_type'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('spare_parts', 'IDX_spare_parts_component_type');
    await queryRunner.dropIndex('spare_parts', 'IDX_spare_parts_part_number');

    // Drop table
    await queryRunner.dropTable('spare_parts');
  }
}
