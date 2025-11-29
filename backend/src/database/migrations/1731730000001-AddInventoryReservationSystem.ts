import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add Inventory Reservation System
 *
 * Adds reservation tracking to simple inventory system (warehouse_inventory, operator_inventory)
 * Creates inventory_reservations table to track stock reservations for tasks
 *
 * This prevents race conditions when multiple tasks try to reserve the same stock
 *
 * Tables affected:
 * - warehouse_inventory (add reserved_quantity column)
 * - operator_inventory (add reserved_quantity column)
 * - inventory_reservations (new table)
 */
export class AddInventoryReservationSystem1731730000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create reservation_status enum if not exists (warehouse module may have created it)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE reservation_status AS ENUM (
          'pending', 'confirmed', 'partially_fulfilled', 'fulfilled', 'cancelled', 'expired'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add reserved_quantity to warehouse_inventory
    await queryRunner.query(`
      ALTER TABLE "warehouse_inventory"
      ADD COLUMN IF NOT EXISTS "reserved_quantity" DECIMAL(10, 3) DEFAULT 0 NOT NULL
    `);

    // Add reserved_quantity to operator_inventory
    await queryRunner.query(`
      ALTER TABLE "operator_inventory"
      ADD COLUMN IF NOT EXISTS "reserved_quantity" DECIMAL(10, 3) DEFAULT 0 NOT NULL
    `);

    // Add CHECK constraint: reserved_quantity must not exceed current_quantity
    await queryRunner.query(`
      ALTER TABLE "warehouse_inventory"
      ADD CONSTRAINT "CHK_warehouse_inventory_reserved_not_exceed_current"
      CHECK ("reserved_quantity" <= "current_quantity")
    `);

    await queryRunner.query(`
      ALTER TABLE "operator_inventory"
      ADD CONSTRAINT "CHK_operator_inventory_reserved_not_exceed_current"
      CHECK ("reserved_quantity" <= "current_quantity")
    `);

    // Create inventory_reservations table
    await queryRunner.query(`
      CREATE TABLE "inventory_reservations" (
        "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "reservation_number" VARCHAR(50) UNIQUE NOT NULL,
        "task_id" UUID NOT NULL,
        "nomenclature_id" UUID NOT NULL REFERENCES "nomenclature"("id") ON DELETE RESTRICT,
        "quantity_reserved" DECIMAL(10, 3) NOT NULL,
        "quantity_fulfilled" DECIMAL(10, 3) DEFAULT 0 NOT NULL,
        "status" reservation_status DEFAULT 'pending' NOT NULL,
        "inventory_level" VARCHAR(20) NOT NULL,
        "reference_id" UUID NOT NULL,
        "reserved_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE,
        "fulfilled_at" TIMESTAMP WITH TIME ZONE,
        "cancelled_at" TIMESTAMP WITH TIME ZONE,
        "notes" TEXT,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "deleted_at" TIMESTAMP WITH TIME ZONE,

        CONSTRAINT "CHK_inventory_reservations_quantity_positive" CHECK ("quantity_reserved" > 0),
        CONSTRAINT "CHK_inventory_reservations_fulfilled_valid" CHECK ("quantity_fulfilled" >= 0 AND "quantity_fulfilled" <= "quantity_reserved"),
        CONSTRAINT "CHK_inventory_reservations_level_valid" CHECK ("inventory_level" IN ('warehouse', 'operator'))
      );
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "idx_inventory_reservations_task_id" ON "inventory_reservations"("task_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_inventory_reservations_nomenclature_id" ON "inventory_reservations"("nomenclature_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_inventory_reservations_status" ON "inventory_reservations"("status");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_inventory_reservations_reference" ON "inventory_reservations"("inventory_level", "reference_id");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_inventory_reservations_expires_at" ON "inventory_reservations"("expires_at") WHERE "status" IN ('pending', 'confirmed');
    `);

    // Add foreign key constraint to tasks table (soft reference, don't cascade delete)
    await queryRunner.query(`
      ALTER TABLE "inventory_reservations"
      ADD CONSTRAINT "FK_inventory_reservations_task_id"
      FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE
    `);

    // Create trigger to auto-update updated_at
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_inventory_reservations_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trigger_inventory_reservations_updated_at
      BEFORE UPDATE ON "inventory_reservations"
      FOR EACH ROW
      EXECUTE FUNCTION update_inventory_reservations_updated_at();
    `);

    // Set default expiration for existing pending reservations (24 hours from now)
    await queryRunner.query(`
      UPDATE "inventory_reservations"
      SET "expires_at" = CURRENT_TIMESTAMP + INTERVAL '24 hours'
      WHERE "status" IN ('pending', 'confirmed') AND "expires_at" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger and function
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_inventory_reservations_updated_at ON "inventory_reservations"
    `);

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS update_inventory_reservations_updated_at()
    `);

    // Drop foreign key constraint
    await queryRunner.query(`
      ALTER TABLE "inventory_reservations" DROP CONSTRAINT IF EXISTS "FK_inventory_reservations_task_id"
    `);

    // Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_inventory_reservations_expires_at"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_inventory_reservations_reference"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_inventory_reservations_status"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_inventory_reservations_nomenclature_id"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_inventory_reservations_task_id"
    `);

    // Drop inventory_reservations table
    await queryRunner.query(`
      DROP TABLE IF EXISTS "inventory_reservations"
    `);

    // Drop CHECK constraints
    await queryRunner.query(`
      ALTER TABLE "operator_inventory" DROP CONSTRAINT IF EXISTS "CHK_operator_inventory_reserved_not_exceed_current"
    `);

    await queryRunner.query(`
      ALTER TABLE "warehouse_inventory" DROP CONSTRAINT IF EXISTS "CHK_warehouse_inventory_reserved_not_exceed_current"
    `);

    // Remove reserved_quantity columns
    await queryRunner.query(`
      ALTER TABLE "operator_inventory" DROP COLUMN IF EXISTS "reserved_quantity"
    `);

    await queryRunner.query(`
      ALTER TABLE "warehouse_inventory" DROP COLUMN IF EXISTS "reserved_quantity"
    `);

    // Note: We don't drop reservation_status enum as it may be used by warehouse module
  }
}
