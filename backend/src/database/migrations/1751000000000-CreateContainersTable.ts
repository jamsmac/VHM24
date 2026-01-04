import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration: Create Containers Table
 *
 * Creates the containers table for storing hopper/bunker information
 * in vending machines. Containers hold ingredients like coffee beans,
 * sugar, milk powder, etc.
 *
 * Part of VH24 Integration - Phase 4.1.1
 * @see COMPREHENSIVE_DEVELOPMENT_PLAN.md Section 4.1.1
 */
export class CreateContainersTable1751000000000 implements MigrationInterface {
  name = 'CreateContainersTable1751000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create container status enum
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'container_status_enum') THEN
          CREATE TYPE container_status_enum AS ENUM ('active', 'empty', 'maintenance');
        END IF;
      END $$;
    `);

    // Create containers table
    await queryRunner.createTable(
      new Table({
        name: 'containers',
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
            name: 'nomenclature_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'slot_number',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'capacity',
            type: 'decimal',
            precision: 10,
            scale: 3,
            isNullable: false,
          },
          {
            name: 'current_quantity',
            type: 'decimal',
            precision: 10,
            scale: 3,
            default: 0,
          },
          {
            name: 'unit',
            type: 'varchar',
            length: '20',
            default: "'g'",
          },
          {
            name: 'min_level',
            type: 'decimal',
            precision: 10,
            scale: 3,
            isNullable: true,
          },
          {
            name: 'last_refill_date',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'container_status_enum',
            default: "'active'",
          },
          {
            name: 'metadata',
            type: 'jsonb',
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

    // Create unique constraint for machine_id + slot_number
    await queryRunner.query(`
      ALTER TABLE containers
      ADD CONSTRAINT uq_containers_machine_slot
      UNIQUE (machine_id, slot_number);
    `);

    // Create indexes
    await queryRunner.createIndex(
      'containers',
      new TableIndex({
        name: 'idx_containers_machine_id',
        columnNames: ['machine_id'],
      }),
    );

    await queryRunner.createIndex(
      'containers',
      new TableIndex({
        name: 'idx_containers_nomenclature_id',
        columnNames: ['nomenclature_id'],
      }),
    );

    await queryRunner.createIndex(
      'containers',
      new TableIndex({
        name: 'idx_containers_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'containers',
      new TableIndex({
        name: 'idx_containers_deleted_at',
        columnNames: ['deleted_at'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'containers',
      new TableForeignKey({
        name: 'fk_containers_machine',
        columnNames: ['machine_id'],
        referencedTableName: 'machines',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'containers',
      new TableForeignKey({
        name: 'fk_containers_nomenclature',
        columnNames: ['nomenclature_id'],
        referencedTableName: 'nomenclature',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey('containers', 'fk_containers_nomenclature');
    await queryRunner.dropForeignKey('containers', 'fk_containers_machine');

    // Drop indexes
    await queryRunner.dropIndex('containers', 'idx_containers_deleted_at');
    await queryRunner.dropIndex('containers', 'idx_containers_status');
    await queryRunner.dropIndex('containers', 'idx_containers_nomenclature_id');
    await queryRunner.dropIndex('containers', 'idx_containers_machine_id');

    // Drop unique constraint
    await queryRunner.query(`
      ALTER TABLE containers
      DROP CONSTRAINT IF EXISTS uq_containers_machine_slot;
    `);

    // Drop table
    await queryRunner.dropTable('containers', true);

    // Drop enum type
    await queryRunner.query(`
      DROP TYPE IF EXISTS container_status_enum;
    `);
  }
}
