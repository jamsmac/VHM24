import { MigrationInterface, QueryRunner } from 'typeorm';
import { Logger } from '@nestjs/common';

const logger = new Logger('AddBusinessRuleConstraints1732510000000');

/**
 * Migration: Add Business Rule CHECK Constraints
 *
 * Adds database-level validation constraints to enforce business rules:
 * - Non-negative quantities, prices, amounts
 * - Logical date ranges
 * - Reserved quantities <= current quantities
 * - Product counts <= capacity
 * - Valid percentage ranges
 *
 * These constraints provide an additional layer of data integrity
 * beyond application-level validation.
 */
export class AddBusinessRuleConstraints1732510000000 implements MigrationInterface {
  name = 'AddBusinessRuleConstraints1732510000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.log('🔒 Adding business rule CHECK constraints...');

    // ============================================================================
    // INVENTORY TABLES: Non-negative quantities
    // ============================================================================

    // Warehouse Inventory
    await queryRunner.query(`
      ALTER TABLE warehouse_inventory
      ADD CONSTRAINT IF NOT EXISTS check_warehouse_qty_non_negative
      CHECK (
        current_quantity >= 0 AND
        reserved_quantity >= 0 AND
        min_stock_level >= 0 AND
        (max_stock_level IS NULL OR max_stock_level >= 0)
      );
    `);

    await queryRunner.query(`
      ALTER TABLE warehouse_inventory
      ADD CONSTRAINT IF NOT EXISTS check_warehouse_reserved_valid
      CHECK (reserved_quantity <= current_quantity);
    `);

    logger.log('  ✅ Warehouse inventory constraints added');

    // Operator Inventory
    await queryRunner.query(`
      ALTER TABLE operator_inventory
      ADD CONSTRAINT IF NOT EXISTS check_operator_qty_non_negative
      CHECK (
        current_quantity >= 0 AND
        reserved_quantity >= 0
      );
    `);

    await queryRunner.query(`
      ALTER TABLE operator_inventory
      ADD CONSTRAINT IF NOT EXISTS check_operator_reserved_valid
      CHECK (reserved_quantity <= current_quantity);
    `);

    logger.log('  ✅ Operator inventory constraints added');

    // Machine Inventory
    await queryRunner.query(`
      ALTER TABLE machine_inventory
      ADD CONSTRAINT IF NOT EXISTS check_machine_inv_qty_non_negative
      CHECK (
        current_quantity >= 0 AND
        min_stock_level >= 0 AND
        (max_capacity IS NULL OR max_capacity >= 0)
      );
    `);

    await queryRunner.query(`
      ALTER TABLE machine_inventory
      ADD CONSTRAINT IF NOT EXISTS check_machine_inv_capacity_valid
      CHECK (
        max_capacity IS NULL OR
        current_quantity <= max_capacity
      );
    `);

    logger.log('  ✅ Machine inventory constraints added');

    // ============================================================================
    // NOMENCLATURE: Non-negative prices and valid stock levels
    // ============================================================================
    await queryRunner.query(`
      ALTER TABLE nomenclature
      ADD CONSTRAINT IF NOT EXISTS check_nomenclature_prices_non_negative
      CHECK (
        (purchase_price IS NULL OR purchase_price >= 0) AND
        (selling_price IS NULL OR selling_price >= 0) AND
        (weight IS NULL OR weight >= 0)
      );
    `);

    await queryRunner.query(`
      ALTER TABLE nomenclature
      ADD CONSTRAINT IF NOT EXISTS check_nomenclature_stock_levels_valid
      CHECK (
        min_stock_level >= 0 AND
        max_stock_level >= 0 AND
        max_stock_level >= min_stock_level AND
        (shelf_life_days IS NULL OR shelf_life_days > 0)
      );
    `);

    logger.log('  ✅ Nomenclature constraints added');

    // ============================================================================
    // MACHINES: Capacity and amounts validation
    // ============================================================================
    await queryRunner.query(`
      ALTER TABLE machines
      ADD CONSTRAINT IF NOT EXISTS check_machine_capacity_non_negative
      CHECK (
        max_product_slots >= 0 AND
        current_product_count >= 0 AND
        cash_capacity >= 0 AND
        current_cash_amount >= 0
      );
    `);

    await queryRunner.query(`
      ALTER TABLE machines
      ADD CONSTRAINT IF NOT EXISTS check_machine_product_count_valid
      CHECK (current_product_count <= max_product_slots);
    `);

    await queryRunner.query(`
      ALTER TABLE machines
      ADD CONSTRAINT IF NOT EXISTS check_machine_cash_valid
      CHECK (current_cash_amount <= cash_capacity);
    `);

    await queryRunner.query(`
      ALTER TABLE machines
      ADD CONSTRAINT IF NOT EXISTS check_machine_threshold_valid
      CHECK (
        low_stock_threshold_percent >= 0 AND
        low_stock_threshold_percent <= 100
      );
    `);

    await queryRunner.query(`
      ALTER TABLE machines
      ADD CONSTRAINT IF NOT EXISTS check_machine_stats_non_negative
      CHECK (
        total_sales_count >= 0 AND
        total_revenue >= 0 AND
        (purchase_price IS NULL OR purchase_price >= 0) AND
        accumulated_depreciation >= 0 AND
        (depreciation_years IS NULL OR depreciation_years > 0)
      );
    `);

    await queryRunner.query(`
      ALTER TABLE machines
      ADD CONSTRAINT IF NOT EXISTS check_machine_dates_logical
      CHECK (
        (installation_date IS NULL OR last_maintenance_date IS NULL OR
         last_maintenance_date >= installation_date) AND
        (last_maintenance_date IS NULL OR next_maintenance_date IS NULL OR
         next_maintenance_date >= last_maintenance_date) AND
        (purchase_date IS NULL OR installation_date IS NULL OR
         installation_date >= purchase_date) AND
        (last_depreciation_date IS NULL OR purchase_date IS NULL OR
         last_depreciation_date >= purchase_date) AND
        (disposal_date IS NULL OR installation_date IS NULL OR
         disposal_date >= installation_date)
      );
    `);

    logger.log('  ✅ Machine constraints added');

    // ============================================================================
    // TASKS: Cash amounts and dates validation
    // ============================================================================
    await queryRunner.query(`
      ALTER TABLE tasks
      ADD CONSTRAINT IF NOT EXISTS check_task_cash_amounts_positive
      CHECK (
        (expected_cash_amount IS NULL OR expected_cash_amount >= 0) AND
        (actual_cash_amount IS NULL OR actual_cash_amount >= 0)
      );
    `);

    await queryRunner.query(`
      ALTER TABLE tasks
      ADD CONSTRAINT IF NOT EXISTS check_task_dates_logical
      CHECK (
        (scheduled_date IS NULL OR due_date IS NULL OR due_date >= scheduled_date) AND
        (started_at IS NULL OR completed_at IS NULL OR completed_at >= started_at) AND
        (started_at IS NULL OR scheduled_date IS NULL OR started_at >= scheduled_date) AND
        (rejected_at IS NULL OR started_at IS NULL OR rejected_at >= started_at)
      );
    `);

    logger.log('  ✅ Task constraints added');

    // ============================================================================
    // TRANSACTIONS: Non-negative amounts
    // ============================================================================
    await queryRunner.query(`
      ALTER TABLE transactions
      ADD CONSTRAINT IF NOT EXISTS check_transaction_amount_positive
      CHECK (amount >= 0);
    `);

    logger.log('  ✅ Transaction constraints added');

    // ============================================================================
    // STOCK MOVEMENTS: Non-zero quantities and valid costs
    // ============================================================================
    await queryRunner.query(`
      ALTER TABLE stock_movements
      ADD CONSTRAINT IF NOT EXISTS check_stock_movement_quantity_nonzero
      CHECK (quantity != 0);
    `);

    await queryRunner.query(`
      ALTER TABLE stock_movements
      ADD CONSTRAINT IF NOT EXISTS check_stock_movement_costs_valid
      CHECK (
        (unit_cost IS NULL OR unit_cost >= 0) AND
        (total_cost IS NULL OR total_cost >= 0)
      );
    `);

    logger.log('  ✅ Stock movement constraints added');

    // ============================================================================
    // FILES: Non-negative size and valid dimensions
    // ============================================================================
    await queryRunner.query(`
      ALTER TABLE files
      ADD CONSTRAINT IF NOT EXISTS check_file_size_positive
      CHECK (file_size >= 0);
    `);

    await queryRunner.query(`
      ALTER TABLE files
      ADD CONSTRAINT IF NOT EXISTS check_file_image_dimensions_valid
      CHECK (
        (image_width IS NULL OR image_width > 0) AND
        (image_height IS NULL OR image_height > 0)
      );
    `);

    logger.log('  ✅ File constraints added');

    // ============================================================================
    // INCIDENTS: Valid priority and dates
    // ============================================================================
    await queryRunner.query(`
      ALTER TABLE incidents
      ADD CONSTRAINT IF NOT EXISTS check_incident_dates_logical
      CHECK (
        (resolved_at IS NULL OR reported_at IS NULL OR resolved_at >= reported_at)
      );
    `);

    logger.log('  ✅ Incident constraints added');

    // ============================================================================
    // COMPLAINTS: Valid rating and dates
    // ============================================================================
    await queryRunner.query(`
      ALTER TABLE complaints
      ADD CONSTRAINT IF NOT EXISTS check_complaint_rating_valid
      CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));
    `);

    await queryRunner.query(`
      ALTER TABLE complaints
      ADD CONSTRAINT IF NOT EXISTS check_complaint_dates_logical
      CHECK (
        (resolved_at IS NULL OR submitted_at IS NULL OR resolved_at >= submitted_at)
      );
    `);

    logger.log('  ✅ Complaint constraints added');

    // ============================================================================
    // RECIPES: Valid quantities
    // ============================================================================
    await queryRunner.query(`
      ALTER TABLE recipe_ingredients
      ADD CONSTRAINT IF NOT EXISTS check_recipe_ingredient_quantity_positive
      CHECK (quantity > 0);
    `);

    logger.log('  ✅ Recipe constraints added');

    // ============================================================================
    // LOCATIONS: Valid coordinates
    // ============================================================================
    await queryRunner.query(`
      ALTER TABLE locations
      ADD CONSTRAINT IF NOT EXISTS check_location_coordinates_valid
      CHECK (
        (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)) AND
        (longitude IS NULL OR (longitude >= -180 AND longitude <= 180))
      );
    `);

    logger.log('  ✅ Location constraints added');

    // ============================================================================
    // WAREHOUSE: Non-negative capacity
    // ============================================================================
    await queryRunner.query(`
      ALTER TABLE warehouses
      ADD CONSTRAINT IF NOT EXISTS check_warehouse_capacity_non_negative
      CHECK (
        (total_capacity IS NULL OR total_capacity >= 0) AND
        (used_capacity IS NULL OR used_capacity >= 0)
      );
    `);

    await queryRunner.query(`
      ALTER TABLE warehouses
      ADD CONSTRAINT IF NOT EXISTS check_warehouse_used_within_total
      CHECK (
        total_capacity IS NULL OR
        used_capacity IS NULL OR
        used_capacity <= total_capacity
      );
    `);

    logger.log('  ✅ Warehouse constraints added');

    // ============================================================================
    // EQUIPMENT COMPONENTS: Valid dates
    // ============================================================================
    await queryRunner.query(`
      ALTER TABLE equipment_components
      ADD CONSTRAINT IF NOT EXISTS check_component_dates_logical
      CHECK (
        (installed_at IS NULL OR manufactured_at IS NULL OR
         installed_at >= manufactured_at) AND
        (removed_at IS NULL OR installed_at IS NULL OR
         removed_at >= installed_at) AND
        (next_maintenance_date IS NULL OR installed_at IS NULL OR
         next_maintenance_date >= installed_at)
      );
    `);

    await queryRunner.query(`
      ALTER TABLE equipment_components
      ADD CONSTRAINT IF NOT EXISTS check_component_hours_non_negative
      CHECK (
        (operating_hours IS NULL OR operating_hours >= 0) AND
        (cycles_count IS NULL OR cycles_count >= 0)
      );
    `);

    logger.log('  ✅ Equipment component constraints added');

    // ============================================================================
    // CONTRACTS: Valid dates and amounts
    // ============================================================================
    await queryRunner.query(`
      ALTER TABLE contracts
      ADD CONSTRAINT IF NOT EXISTS check_contract_dates_logical
      CHECK (
        (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
      );
    `);

    await queryRunner.query(`
      ALTER TABLE contracts
      ADD CONSTRAINT IF NOT EXISTS check_contract_amounts_non_negative
      CHECK (
        (monthly_rent IS NULL OR monthly_rent >= 0) AND
        (commission_rate IS NULL OR (commission_rate >= 0 AND commission_rate <= 100)) AND
        (penalty_rate IS NULL OR (penalty_rate >= 0 AND penalty_rate <= 100))
      );
    `);

    logger.log('  ✅ Contract constraints added');

    // ============================================================================
    // USERS: Valid security settings
    // ============================================================================
    await queryRunner.query(`
      ALTER TABLE users
      ADD CONSTRAINT IF NOT EXISTS check_user_failed_attempts_non_negative
      CHECK (failed_login_attempts >= 0);
    `);

    logger.log('  ✅ User constraints added');

    logger.log('');
    logger.log('✅ All business rule CHECK constraints added successfully!');
    logger.log('');
    logger.log('📋 Summary of constraints added:');
    logger.log('  - Inventory: Non-negative quantities, reserved <= current');
    logger.log('  - Prices: Non-negative amounts');
    logger.log('  - Machines: Capacity validation, logical dates');
    logger.log('  - Tasks: Cash amounts, date logic');
    logger.log('  - Files: Positive sizes, valid dimensions');
    logger.log('  - Locations: Valid GPS coordinates');
    logger.log('  - Contracts: Date ranges, valid percentages');
    logger.log('  - And more...');
    logger.log('');
    logger.log('🔒 Database integrity is now enforced at the DB level!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    logger.log('🔓 Removing business rule CHECK constraints...');

    // Drop all constraints in reverse order
    await queryRunner.query(
      `ALTER TABLE users DROP CONSTRAINT IF EXISTS check_user_failed_attempts_non_negative;`,
    );
    await queryRunner.query(
      `ALTER TABLE contracts DROP CONSTRAINT IF EXISTS check_contract_amounts_non_negative;`,
    );
    await queryRunner.query(
      `ALTER TABLE contracts DROP CONSTRAINT IF EXISTS check_contract_dates_logical;`,
    );
    await queryRunner.query(
      `ALTER TABLE equipment_components DROP CONSTRAINT IF EXISTS check_component_hours_non_negative;`,
    );
    await queryRunner.query(
      `ALTER TABLE equipment_components DROP CONSTRAINT IF EXISTS check_component_dates_logical;`,
    );
    await queryRunner.query(
      `ALTER TABLE warehouses DROP CONSTRAINT IF EXISTS check_warehouse_used_within_total;`,
    );
    await queryRunner.query(
      `ALTER TABLE warehouses DROP CONSTRAINT IF EXISTS check_warehouse_capacity_non_negative;`,
    );
    await queryRunner.query(
      `ALTER TABLE locations DROP CONSTRAINT IF EXISTS check_location_coordinates_valid;`,
    );
    await queryRunner.query(
      `ALTER TABLE recipe_ingredients DROP CONSTRAINT IF EXISTS check_recipe_ingredient_quantity_positive;`,
    );
    await queryRunner.query(
      `ALTER TABLE complaints DROP CONSTRAINT IF EXISTS check_complaint_dates_logical;`,
    );
    await queryRunner.query(
      `ALTER TABLE complaints DROP CONSTRAINT IF EXISTS check_complaint_rating_valid;`,
    );
    await queryRunner.query(
      `ALTER TABLE incidents DROP CONSTRAINT IF EXISTS check_incident_dates_logical;`,
    );
    await queryRunner.query(
      `ALTER TABLE files DROP CONSTRAINT IF EXISTS check_file_image_dimensions_valid;`,
    );
    await queryRunner.query(
      `ALTER TABLE files DROP CONSTRAINT IF EXISTS check_file_size_positive;`,
    );
    await queryRunner.query(
      `ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS check_stock_movement_costs_valid;`,
    );
    await queryRunner.query(
      `ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS check_stock_movement_quantity_nonzero;`,
    );
    await queryRunner.query(
      `ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_transaction_amount_positive;`,
    );
    await queryRunner.query(
      `ALTER TABLE tasks DROP CONSTRAINT IF EXISTS check_task_dates_logical;`,
    );
    await queryRunner.query(
      `ALTER TABLE tasks DROP CONSTRAINT IF EXISTS check_task_cash_amounts_positive;`,
    );
    await queryRunner.query(
      `ALTER TABLE machines DROP CONSTRAINT IF EXISTS check_machine_dates_logical;`,
    );
    await queryRunner.query(
      `ALTER TABLE machines DROP CONSTRAINT IF EXISTS check_machine_stats_non_negative;`,
    );
    await queryRunner.query(
      `ALTER TABLE machines DROP CONSTRAINT IF EXISTS check_machine_threshold_valid;`,
    );
    await queryRunner.query(
      `ALTER TABLE machines DROP CONSTRAINT IF EXISTS check_machine_cash_valid;`,
    );
    await queryRunner.query(
      `ALTER TABLE machines DROP CONSTRAINT IF EXISTS check_machine_product_count_valid;`,
    );
    await queryRunner.query(
      `ALTER TABLE machines DROP CONSTRAINT IF EXISTS check_machine_capacity_non_negative;`,
    );
    await queryRunner.query(
      `ALTER TABLE nomenclature DROP CONSTRAINT IF EXISTS check_nomenclature_stock_levels_valid;`,
    );
    await queryRunner.query(
      `ALTER TABLE nomenclature DROP CONSTRAINT IF EXISTS check_nomenclature_prices_non_negative;`,
    );
    await queryRunner.query(
      `ALTER TABLE machine_inventory DROP CONSTRAINT IF EXISTS check_machine_inv_capacity_valid;`,
    );
    await queryRunner.query(
      `ALTER TABLE machine_inventory DROP CONSTRAINT IF EXISTS check_machine_inv_qty_non_negative;`,
    );
    await queryRunner.query(
      `ALTER TABLE operator_inventory DROP CONSTRAINT IF EXISTS check_operator_reserved_valid;`,
    );
    await queryRunner.query(
      `ALTER TABLE operator_inventory DROP CONSTRAINT IF EXISTS check_operator_qty_non_negative;`,
    );
    await queryRunner.query(
      `ALTER TABLE warehouse_inventory DROP CONSTRAINT IF EXISTS check_warehouse_reserved_valid;`,
    );
    await queryRunner.query(
      `ALTER TABLE warehouse_inventory DROP CONSTRAINT IF EXISTS check_warehouse_qty_non_negative;`,
    );

    logger.log('✅ Business rule CHECK constraints removed');
  }
}
