import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration: Create Ingredient Batches Table
 *
 * Creates the ingredient_batches table for FIFO (First-In-First-Out)
 * inventory tracking of ingredients. Each batch represents a specific
 * receipt/purchase of ingredients with tracking of quantity, expiry dates,
 * and supplier information.
 *
 * Part of VH24 Integration - Phase 4.1.3
 * @see COMPREHENSIVE_DEVELOPMENT_PLAN.md Section 4.1.3
 */
export class CreateIngredientBatchesTable1751100000000 implements MigrationInterface {
  name = 'CreateIngredientBatchesTable1751100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ingredient batch status enum
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ingredient_batch_status_enum') THEN
          CREATE TYPE ingredient_batch_status_enum AS ENUM ('in_stock', 'depleted', 'expired', 'returned');
        END IF;
      END $$;
    `);

    // Create ingredient_batches table
    await queryRunner.createTable(
      new Table({
        name: 'ingredient_batches',
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
            name: 'batch_number',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'quantity',
            type: 'decimal',
            precision: 10,
            scale: 3,
            isNullable: false,
          },
          {
            name: 'remaining_quantity',
            type: 'decimal',
            precision: 10,
            scale: 3,
            isNullable: false,
          },
          {
            name: 'purchase_price',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'supplier_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'manufacture_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'expiry_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'received_date',
            type: 'date',
            default: 'CURRENT_DATE',
          },
          {
            name: 'status',
            type: 'ingredient_batch_status_enum',
            default: "'in_stock'",
          },
          {
            name: 'unit',
            type: 'varchar',
            length: '20',
            isNullable: false,
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
          {
            name: 'created_by_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'updated_by_id',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create unique constraint for nomenclature_id + batch_number
    await queryRunner.query(`
      ALTER TABLE ingredient_batches
      ADD CONSTRAINT uq_ingredient_batches_nomenclature_batch
      UNIQUE (nomenclature_id, batch_number);
    `);

    // Create indexes
    await queryRunner.createIndex(
      'ingredient_batches',
      new TableIndex({
        name: 'idx_ingredient_batches_nomenclature_id',
        columnNames: ['nomenclature_id'],
      }),
    );

    await queryRunner.createIndex(
      'ingredient_batches',
      new TableIndex({
        name: 'idx_ingredient_batches_supplier_id',
        columnNames: ['supplier_id'],
      }),
    );

    await queryRunner.createIndex(
      'ingredient_batches',
      new TableIndex({
        name: 'idx_ingredient_batches_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'ingredient_batches',
      new TableIndex({
        name: 'idx_ingredient_batches_expiry_date',
        columnNames: ['expiry_date'],
      }),
    );

    await queryRunner.createIndex(
      'ingredient_batches',
      new TableIndex({
        name: 'idx_ingredient_batches_received_date',
        columnNames: ['received_date'],
      }),
    );

    await queryRunner.createIndex(
      'ingredient_batches',
      new TableIndex({
        name: 'idx_ingredient_batches_deleted_at',
        columnNames: ['deleted_at'],
      }),
    );

    // Composite index for FIFO queries (nomenclature + status + received_date)
    await queryRunner.createIndex(
      'ingredient_batches',
      new TableIndex({
        name: 'idx_ingredient_batches_fifo',
        columnNames: ['nomenclature_id', 'status', 'received_date'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'ingredient_batches',
      new TableForeignKey({
        name: 'fk_ingredient_batches_nomenclature',
        columnNames: ['nomenclature_id'],
        referencedTableName: 'nomenclature',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'ingredient_batches',
      new TableForeignKey({
        name: 'fk_ingredient_batches_supplier',
        columnNames: ['supplier_id'],
        referencedTableName: 'counterparties',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Add check constraint for remaining_quantity <= quantity
    await queryRunner.query(`
      ALTER TABLE ingredient_batches
      ADD CONSTRAINT chk_ingredient_batches_remaining_quantity
      CHECK (remaining_quantity <= quantity);
    `);

    // Add check constraint for remaining_quantity >= 0
    await queryRunner.query(`
      ALTER TABLE ingredient_batches
      ADD CONSTRAINT chk_ingredient_batches_remaining_quantity_positive
      CHECK (remaining_quantity >= 0);
    `);

    // Add check constraint for quantity > 0
    await queryRunner.query(`
      ALTER TABLE ingredient_batches
      ADD CONSTRAINT chk_ingredient_batches_quantity_positive
      CHECK (quantity > 0);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop check constraints
    await queryRunner.query(`
      ALTER TABLE ingredient_batches
      DROP CONSTRAINT IF EXISTS chk_ingredient_batches_quantity_positive;
    `);

    await queryRunner.query(`
      ALTER TABLE ingredient_batches
      DROP CONSTRAINT IF EXISTS chk_ingredient_batches_remaining_quantity_positive;
    `);

    await queryRunner.query(`
      ALTER TABLE ingredient_batches
      DROP CONSTRAINT IF EXISTS chk_ingredient_batches_remaining_quantity;
    `);

    // Drop foreign keys
    await queryRunner.dropForeignKey('ingredient_batches', 'fk_ingredient_batches_supplier');
    await queryRunner.dropForeignKey('ingredient_batches', 'fk_ingredient_batches_nomenclature');

    // Drop indexes
    await queryRunner.dropIndex('ingredient_batches', 'idx_ingredient_batches_fifo');
    await queryRunner.dropIndex('ingredient_batches', 'idx_ingredient_batches_deleted_at');
    await queryRunner.dropIndex('ingredient_batches', 'idx_ingredient_batches_received_date');
    await queryRunner.dropIndex('ingredient_batches', 'idx_ingredient_batches_expiry_date');
    await queryRunner.dropIndex('ingredient_batches', 'idx_ingredient_batches_status');
    await queryRunner.dropIndex('ingredient_batches', 'idx_ingredient_batches_supplier_id');
    await queryRunner.dropIndex('ingredient_batches', 'idx_ingredient_batches_nomenclature_id');

    // Drop unique constraint
    await queryRunner.query(`
      ALTER TABLE ingredient_batches
      DROP CONSTRAINT IF EXISTS uq_ingredient_batches_nomenclature_batch;
    `);

    // Drop table
    await queryRunner.dropTable('ingredient_batches', true);

    // Drop enum type
    await queryRunner.query(`
      DROP TYPE IF EXISTS ingredient_batch_status_enum;
    `);
  }
}
