import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateInventoryAdjustments1732410000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create inventory_adjustments table
    await queryRunner.createTable(
      new Table({
        name: 'inventory_adjustments',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'nomenclature_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'level_type',
            type: 'enum',
            enum: ['WAREHOUSE', 'OPERATOR', 'MACHINE'],
            isNullable: false,
          },
          {
            name: 'level_ref_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'actual_count_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'old_quantity',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'new_quantity',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'adjustment_quantity',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: false,
          },
          {
            name: 'reason',
            type: 'enum',
            enum: [
              'inventory_difference',
              'damage',
              'theft',
              'expiry',
              'return',
              'correction',
              'other',
            ],
            isNullable: false,
          },
          {
            name: 'comment',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'approved', 'rejected', 'applied', 'cancelled'],
            default: "'pending'",
            isNullable: false,
          },
          {
            name: 'requires_approval',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'created_by_user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'approved_by_user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'approved_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'applied_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'inventory_adjustments',
      new TableIndex({
        name: 'IDX_inventory_adjustments_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'inventory_adjustments',
      new TableIndex({
        name: 'IDX_inventory_adjustments_nomenclature_id',
        columnNames: ['nomenclature_id'],
      }),
    );

    await queryRunner.createIndex(
      'inventory_adjustments',
      new TableIndex({
        name: 'IDX_inventory_adjustments_level',
        columnNames: ['level_type', 'level_ref_id'],
      }),
    );

    await queryRunner.createIndex(
      'inventory_adjustments',
      new TableIndex({
        name: 'IDX_inventory_adjustments_created_by',
        columnNames: ['created_by_user_id'],
      }),
    );

    await queryRunner.createIndex(
      'inventory_adjustments',
      new TableIndex({
        name: 'IDX_inventory_adjustments_approved_by',
        columnNames: ['approved_by_user_id'],
      }),
    );

    // Add foreign keys
    await queryRunner.createForeignKey(
      'inventory_adjustments',
      new TableForeignKey({
        columnNames: ['nomenclature_id'],
        referencedTableName: 'nomenclature',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'inventory_adjustments',
      new TableForeignKey({
        columnNames: ['actual_count_id'],
        referencedTableName: 'inventory_actual_counts',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'inventory_adjustments',
      new TableForeignKey({
        columnNames: ['created_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'inventory_adjustments',
      new TableForeignKey({
        columnNames: ['approved_by_user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('inventory_adjustments');
    if (table) {
      // Drop foreign keys
      const foreignKeys = table.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('inventory_adjustments', foreignKey);
      }

      // Drop indexes
      await queryRunner.dropIndex('inventory_adjustments', 'IDX_inventory_adjustments_status');
      await queryRunner.dropIndex(
        'inventory_adjustments',
        'IDX_inventory_adjustments_nomenclature_id',
      );
      await queryRunner.dropIndex('inventory_adjustments', 'IDX_inventory_adjustments_level');
      await queryRunner.dropIndex('inventory_adjustments', 'IDX_inventory_adjustments_created_by');
      await queryRunner.dropIndex('inventory_adjustments', 'IDX_inventory_adjustments_approved_by');
    }

    // Drop table
    await queryRunner.dropTable('inventory_adjustments', true);
  }
}
