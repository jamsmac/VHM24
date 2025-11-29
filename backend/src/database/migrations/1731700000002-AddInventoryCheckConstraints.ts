import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add CHECK constraints for inventory quantities
 *
 * Prevents negative inventory quantities at database level
 * This is a critical safety measure to ensure data integrity
 *
 * Tables affected:
 * - warehouse_inventory
 * - operator_inventory
 * - machine_inventory
 */
export class AddInventoryCheckConstraints1731700000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Warehouse inventory - prevent negative quantities
    await queryRunner.query(`
      ALTER TABLE "warehouse_inventory"
      ADD CONSTRAINT "CHK_warehouse_inventory_quantity_positive"
      CHECK ("current_quantity" >= 0)
    `);

    await queryRunner.query(`
      ALTER TABLE "warehouse_inventory"
      ADD CONSTRAINT "CHK_warehouse_inventory_reserved_positive"
      CHECK ("reserved_quantity" IS NULL OR "reserved_quantity" >= 0)
    `);

    await queryRunner.query(`
      ALTER TABLE "warehouse_inventory"
      ADD CONSTRAINT "CHK_warehouse_inventory_levels_positive"
      CHECK ("min_stock_level" >= 0 AND "max_stock_level" >= 0)
    `);

    await queryRunner.query(`
      ALTER TABLE "warehouse_inventory"
      ADD CONSTRAINT "CHK_warehouse_inventory_levels_logical"
      CHECK ("max_stock_level" >= "min_stock_level")
    `);

    // Operator inventory - prevent negative quantities
    await queryRunner.query(`
      ALTER TABLE "operator_inventory"
      ADD CONSTRAINT "CHK_operator_inventory_quantity_positive"
      CHECK ("current_quantity" >= 0)
    `);

    // Machine inventory - prevent negative quantities
    await queryRunner.query(`
      ALTER TABLE "machine_inventory"
      ADD CONSTRAINT "CHK_machine_inventory_quantity_positive"
      CHECK ("current_quantity" >= 0)
    `);

    await queryRunner.query(`
      ALTER TABLE "machine_inventory"
      ADD CONSTRAINT "CHK_machine_inventory_levels_positive"
      CHECK ("min_stock_level" IS NULL OR "min_stock_level" >= 0)
    `);

    await queryRunner.query(`
      ALTER TABLE "machine_inventory"
      ADD CONSTRAINT "CHK_machine_inventory_capacity_positive"
      CHECK ("capacity" IS NULL OR "capacity" > 0)
    `);

    // Spare parts inventory - prevent negative quantities
    await queryRunner.query(`
      ALTER TABLE "spare_parts"
      ADD CONSTRAINT "CHK_spare_parts_quantity_positive"
      CHECK ("quantity_in_stock" >= 0)
    `);

    await queryRunner.query(`
      ALTER TABLE "spare_parts"
      ADD CONSTRAINT "CHK_spare_parts_levels_positive"
      CHECK ("min_stock_level" >= 0 AND "max_stock_level" >= 0)
    `);

    await queryRunner.query(`
      ALTER TABLE "spare_parts"
      ADD CONSTRAINT "CHK_spare_parts_levels_logical"
      CHECK ("max_stock_level" >= "min_stock_level")
    `);

    await queryRunner.query(`
      ALTER TABLE "spare_parts"
      ADD CONSTRAINT "CHK_spare_parts_price_positive"
      CHECK ("unit_price" >= 0)
    `);

    // Nomenclature - prevent negative prices
    await queryRunner.query(`
      ALTER TABLE "nomenclature"
      ADD CONSTRAINT "CHK_nomenclature_purchase_price_positive"
      CHECK ("purchase_price" IS NULL OR "purchase_price" >= 0)
    `);

    await queryRunner.query(`
      ALTER TABLE "nomenclature"
      ADD CONSTRAINT "CHK_nomenclature_selling_price_positive"
      CHECK ("selling_price" IS NULL OR "selling_price" >= 0)
    `);

    await queryRunner.query(`
      ALTER TABLE "nomenclature"
      ADD CONSTRAINT "CHK_nomenclature_stock_levels_positive"
      CHECK ("min_stock_level" >= 0 AND "max_stock_level" >= 0)
    `);

    await queryRunner.query(`
      ALTER TABLE "nomenclature"
      ADD CONSTRAINT "CHK_nomenclature_stock_levels_logical"
      CHECK ("max_stock_level" >= "min_stock_level")
    `);

    // Transactions - prevent negative amounts (except refunds)
    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD CONSTRAINT "CHK_transactions_amount_reasonable"
      CHECK ("amount" >= -999999999999.99 AND "amount" <= 999999999999.99)
    `);

    // Recipes - prevent negative costs
    await queryRunner.query(`
      ALTER TABLE "recipes"
      ADD CONSTRAINT "CHK_recipes_cost_positive"
      CHECK ("total_cost" IS NULL OR "total_cost" >= 0)
    `);

    // Recipe ingredients - prevent negative quantities
    await queryRunner.query(`
      ALTER TABLE "recipe_ingredients"
      ADD CONSTRAINT "CHK_recipe_ingredients_quantity_positive"
      CHECK ("quantity" > 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all CHECK constraints

    // Warehouse inventory
    await queryRunner.query(`
      ALTER TABLE "warehouse_inventory" DROP CONSTRAINT IF EXISTS "CHK_warehouse_inventory_quantity_positive"
    `);
    await queryRunner.query(`
      ALTER TABLE "warehouse_inventory" DROP CONSTRAINT IF EXISTS "CHK_warehouse_inventory_reserved_positive"
    `);
    await queryRunner.query(`
      ALTER TABLE "warehouse_inventory" DROP CONSTRAINT IF EXISTS "CHK_warehouse_inventory_levels_positive"
    `);
    await queryRunner.query(`
      ALTER TABLE "warehouse_inventory" DROP CONSTRAINT IF EXISTS "CHK_warehouse_inventory_levels_logical"
    `);

    // Operator inventory
    await queryRunner.query(`
      ALTER TABLE "operator_inventory" DROP CONSTRAINT IF EXISTS "CHK_operator_inventory_quantity_positive"
    `);

    // Machine inventory
    await queryRunner.query(`
      ALTER TABLE "machine_inventory" DROP CONSTRAINT IF EXISTS "CHK_machine_inventory_quantity_positive"
    `);
    await queryRunner.query(`
      ALTER TABLE "machine_inventory" DROP CONSTRAINT IF EXISTS "CHK_machine_inventory_levels_positive"
    `);
    await queryRunner.query(`
      ALTER TABLE "machine_inventory" DROP CONSTRAINT IF EXISTS "CHK_machine_inventory_capacity_positive"
    `);

    // Spare parts
    await queryRunner.query(`
      ALTER TABLE "spare_parts" DROP CONSTRAINT IF EXISTS "CHK_spare_parts_quantity_positive"
    `);
    await queryRunner.query(`
      ALTER TABLE "spare_parts" DROP CONSTRAINT IF EXISTS "CHK_spare_parts_levels_positive"
    `);
    await queryRunner.query(`
      ALTER TABLE "spare_parts" DROP CONSTRAINT IF EXISTS "CHK_spare_parts_levels_logical"
    `);
    await queryRunner.query(`
      ALTER TABLE "spare_parts" DROP CONSTRAINT IF EXISTS "CHK_spare_parts_price_positive"
    `);

    // Nomenclature
    await queryRunner.query(`
      ALTER TABLE "nomenclature" DROP CONSTRAINT IF EXISTS "CHK_nomenclature_purchase_price_positive"
    `);
    await queryRunner.query(`
      ALTER TABLE "nomenclature" DROP CONSTRAINT IF EXISTS "CHK_nomenclature_selling_price_positive"
    `);
    await queryRunner.query(`
      ALTER TABLE "nomenclature" DROP CONSTRAINT IF EXISTS "CHK_nomenclature_stock_levels_positive"
    `);
    await queryRunner.query(`
      ALTER TABLE "nomenclature" DROP CONSTRAINT IF EXISTS "CHK_nomenclature_stock_levels_logical"
    `);

    // Transactions
    await queryRunner.query(`
      ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "CHK_transactions_amount_reasonable"
    `);

    // Recipes
    await queryRunner.query(`
      ALTER TABLE "recipes" DROP CONSTRAINT IF EXISTS "CHK_recipes_cost_positive"
    `);

    // Recipe ingredients
    await queryRunner.query(`
      ALTER TABLE "recipe_ingredients" DROP CONSTRAINT IF EXISTS "CHK_recipe_ingredients_quantity_positive"
    `);
  }
}
