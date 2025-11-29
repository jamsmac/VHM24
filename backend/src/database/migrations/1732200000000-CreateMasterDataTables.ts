import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateMasterDataTables1732200000000 implements MigrationInterface {
  name = 'CreateMasterDataTables1732200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create stock_opening_balances table
    await queryRunner.createTable(
      new Table({
        name: 'stock_opening_balances',
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
          },
          {
            name: 'warehouse_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'balance_date',
            type: 'date',
          },
          {
            name: 'quantity',
            type: 'decimal',
            precision: 15,
            scale: 3,
          },
          {
            name: 'unit',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'unit_cost',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'total_cost',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'batch_number',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'expiry_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'location',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'is_applied',
            type: 'boolean',
            default: false,
          },
          {
            name: 'applied_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'applied_by_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'import_source',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'import_session_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['nomenclature_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'nomenclature',
            onDelete: 'RESTRICT',
          },
          {
            columnNames: ['warehouse_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'warehouses',
            onDelete: 'RESTRICT',
          },
          {
            columnNames: ['applied_by_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'SET NULL',
          },
        ],
      }),
      true,
    );

    // Create indexes for stock_opening_balances
    await queryRunner.createIndex(
      'stock_opening_balances',
      new TableIndex({
        name: 'IDX_OPENING_BALANCE_UNIQUE',
        columnNames: ['nomenclature_id', 'warehouse_id', 'balance_date'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'stock_opening_balances',
      new TableIndex({
        name: 'IDX_OPENING_BALANCE_DATE',
        columnNames: ['balance_date'],
      }),
    );
    await queryRunner.createIndex(
      'stock_opening_balances',
      new TableIndex({
        name: 'IDX_OPENING_BALANCE_APPLIED',
        columnNames: ['is_applied'],
      }),
    );

    // Create purchase_history table
    await queryRunner.createTable(
      new Table({
        name: 'purchase_history',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'purchase_date',
            type: 'date',
          },
          {
            name: 'invoice_number',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'supplier_id',
            type: 'uuid',
          },
          {
            name: 'nomenclature_id',
            type: 'uuid',
          },
          {
            name: 'warehouse_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'quantity',
            type: 'decimal',
            precision: 15,
            scale: 3,
          },
          {
            name: 'unit',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'unit_price',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'vat_rate',
            type: 'decimal',
            precision: 5,
            scale: 2,
            default: 15.0,
          },
          {
            name: 'vat_amount',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'total_amount',
            type: 'decimal',
            precision: 15,
            scale: 2,
          },
          {
            name: 'batch_number',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'production_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'expiry_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'received', 'partial', 'cancelled', 'returned'],
            default: "'received'",
          },
          {
            name: 'delivery_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'delivery_note_number',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            default: "'UZS'",
          },
          {
            name: 'exchange_rate',
            type: 'decimal',
            precision: 10,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'payment_method',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'payment_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'created_by_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'import_source',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'import_session_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'notes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'deleted_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            columnNames: ['supplier_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'counterparties',
            onDelete: 'RESTRICT',
          },
          {
            columnNames: ['nomenclature_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'nomenclature',
            onDelete: 'RESTRICT',
          },
          {
            columnNames: ['warehouse_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'warehouses',
            onDelete: 'RESTRICT',
          },
          {
            columnNames: ['created_by_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'SET NULL',
          },
        ],
      }),
      true,
    );

    // Create indexes for purchase_history
    await queryRunner.createIndex(
      'purchase_history',
      new TableIndex({
        name: 'IDX_PURCHASE_DATE',
        columnNames: ['purchase_date'],
      }),
    );
    await queryRunner.createIndex(
      'purchase_history',
      new TableIndex({
        name: 'IDX_PURCHASE_SUPPLIER',
        columnNames: ['supplier_id'],
      }),
    );
    await queryRunner.createIndex(
      'purchase_history',
      new TableIndex({
        name: 'IDX_PURCHASE_NOMENCLATURE',
        columnNames: ['nomenclature_id'],
      }),
    );
    await queryRunner.createIndex(
      'purchase_history',
      new TableIndex({
        name: 'IDX_PURCHASE_INVOICE',
        columnNames: ['invoice_number'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('purchase_history', 'IDX_PURCHASE_INVOICE');
    await queryRunner.dropIndex('purchase_history', 'IDX_PURCHASE_NOMENCLATURE');
    await queryRunner.dropIndex('purchase_history', 'IDX_PURCHASE_SUPPLIER');
    await queryRunner.dropIndex('purchase_history', 'IDX_PURCHASE_DATE');
    await queryRunner.dropIndex('stock_opening_balances', 'IDX_OPENING_BALANCE_APPLIED');
    await queryRunner.dropIndex('stock_opening_balances', 'IDX_OPENING_BALANCE_DATE');
    await queryRunner.dropIndex('stock_opening_balances', 'IDX_OPENING_BALANCE_UNIQUE');

    // Drop tables
    await queryRunner.dropTable('purchase_history', true);
    await queryRunner.dropTable('stock_opening_balances', true);
  }
}
