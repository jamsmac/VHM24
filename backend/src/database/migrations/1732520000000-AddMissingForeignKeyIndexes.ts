import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add Missing Foreign Key Indexes
 *
 * Ensures all foreign key columns have corresponding indexes for:
 * - Optimal JOIN query performance
 * - Prevention of lock escalation during parent table updates/deletes
 * - Efficient CASCADE operations
 * - Reduced deadlock risk in concurrent transactions
 *
 * Best Practice: Every FK column should have an index on the child table
 *
 * Performance Impact:
 * - Significantly improves JOIN query performance (10-100x faster)
 * - Prevents full table scans when joining tables
 * - Reduces lock contention during concurrent updates
 *
 * NOTE: This migration only creates indexes for columns that actually exist
 * in the current entity definitions. Columns like created_by_id, updated_by_id
 * are NOT part of the BaseEntity (which only has id, created_at, updated_at, deleted_at).
 */
export class AddMissingForeignKeyIndexes1732520000000 implements MigrationInterface {
  name = 'AddMissingForeignKeyIndexes1732520000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('🔍 Adding missing foreign key indexes...');
    console.log('');

    // ============================================================================
    // USERS MODULE
    // ============================================================================
    console.log('📦 Users module indexes...');

    // NOTE: BaseEntity does NOT have created_by_id/updated_by_id columns
    // It only has: id, created_at, updated_at, deleted_at

    // User Sessions
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
      ON user_sessions (user_id);
    `);

    console.log('  ✅ User sessions indexes created');

    // ============================================================================
    // MACHINES MODULE
    // ============================================================================
    console.log('');
    console.log('🎰 Machines module indexes...');

    // Machines - location_id exists
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_machines_location_id
      ON machines (location_id);
    `);

    // NOTE: Machine entity has 'model' as VARCHAR field, not model_id FK
    // NOTE: Machine entity does NOT have created_by_id/updated_by_id

    console.log('  ✅ Machines indexes created');

    // Machine Inventory - machine_id and nomenclature_id exist
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_machine_inventory_machine_id
      ON machine_inventory (machine_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_machine_inventory_nomenclature_id
      ON machine_inventory (nomenclature_id);
    `);

    // NOTE: MachineInventory does NOT have created_by_id/updated_by_id

    console.log('  ✅ Machine inventory indexes created');

    // ============================================================================
    // TASKS MODULE
    // ============================================================================
    console.log('');
    console.log('📋 Tasks module indexes...');

    // Tasks - these columns actually exist in Task entity
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_machine_id
      ON tasks (machine_id);
    `);

    // NOTE: Task entity uses assigned_to_user_id, not assigned_to_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_user_id
      ON tasks (assigned_to_user_id);
    `);

    // NOTE: Task entity uses created_by_user_id, not created_by_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_created_by_user_id
      ON tasks (created_by_user_id);
    `);

    // Task entity has rejected_by_user_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_rejected_by_user_id
      ON tasks (rejected_by_user_id);
    `);

    // NOTE: Task entity does NOT have: route_id, completed_by_id, updated_by_id

    console.log('  ✅ Tasks indexes created');

    // Task Items - task_id and nomenclature_id exist
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_task_items_task_id
      ON task_items (task_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_task_items_nomenclature_id
      ON task_items (nomenclature_id);
    `);

    console.log('  ✅ Task items indexes created');

    // ============================================================================
    // INVENTORY MODULE
    // ============================================================================
    console.log('');
    console.log('📦 Inventory module indexes...');

    // Warehouse Inventory - only nomenclature_id exists
    // NOTE: WarehouseInventory is a single warehouse concept, no warehouse_id FK
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_warehouse_inventory_nomenclature_id
      ON warehouse_inventory (nomenclature_id);
    `);

    console.log('  ✅ Warehouse inventory indexes created');

    // Operator Inventory - operator_id and nomenclature_id exist
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_operator_inventory_operator_id
      ON operator_inventory (operator_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_operator_inventory_nomenclature_id
      ON operator_inventory (nomenclature_id);
    `);

    console.log('  ✅ Operator inventory indexes created');

    // Stock Movements - actual columns in entity
    // NOTE: StockMovement uses warehouse_id, destination_warehouse_id, product_id
    // NOT: from_warehouse_id, to_warehouse_id, nomenclature_id, machine_id, task_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_movements_warehouse_id
      ON stock_movements (warehouse_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_movements_destination_warehouse_id
      ON stock_movements (destination_warehouse_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id
      ON stock_movements (product_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_movements_batch_id
      ON stock_movements (batch_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_movements_performed_by_id
      ON stock_movements (performed_by_id);
    `);

    console.log('  ✅ Stock movements indexes created');

    // ============================================================================
    // TRANSACTIONS MODULE
    // ============================================================================
    console.log('');
    console.log('💰 Transactions module indexes...');

    // Transactions - actual columns that exist
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_machine_id
      ON transactions (machine_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id
      ON transactions (user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_contract_id
      ON transactions (contract_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_counterparty_id
      ON transactions (counterparty_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_recipe_id
      ON transactions (recipe_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_collection_task_id
      ON transactions (collection_task_id);
    `);

    // NOTE: Transaction does NOT have: task_id, nomenclature_id, created_by_id

    console.log('  ✅ Transactions indexes created');

    // ============================================================================
    // INCIDENTS MODULE
    // ============================================================================
    console.log('');
    console.log('🚨 Incidents module indexes...');

    // Incidents - actual columns that exist
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_incidents_machine_id
      ON incidents (machine_id);
    `);

    // NOTE: Incident entity uses reported_by_user_id, not reported_by_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_incidents_reported_by_user_id
      ON incidents (reported_by_user_id);
    `);

    // NOTE: Incident entity uses assigned_to_user_id, not assigned_to_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_incidents_assigned_to_user_id
      ON incidents (assigned_to_user_id);
    `);

    // Incident has repair_task_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_incidents_repair_task_id
      ON incidents (repair_task_id);
    `);

    // NOTE: Incident does NOT have: resolved_by_id, created_by_id, updated_by_id

    console.log('  ✅ Incidents indexes created');

    // ============================================================================
    // COMPLAINTS MODULE
    // ============================================================================
    console.log('');
    console.log('📝 Complaints module indexes...');

    // Complaints - actual columns that exist
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_complaints_machine_id
      ON complaints (machine_id);
    `);

    // NOTE: Complaint entity uses handled_by_user_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_complaints_handled_by_user_id
      ON complaints (handled_by_user_id);
    `);

    // NOTE: Complaint does NOT have: customer_id (has customer_name/phone/email as text)
    // NOTE: Complaint does NOT have: assigned_to_id, resolved_by_id, created_by_id, updated_by_id

    console.log('  ✅ Complaints indexes created');

    // ============================================================================
    // NOMENCLATURE MODULE
    // ============================================================================
    console.log('');
    console.log('🏷️  Nomenclature module indexes...');

    // NOTE: Nomenclature uses category_code and unit_of_measure_code (VARCHAR)
    // NOT category_id or unit_of_measure_id FKs

    // Nomenclature has default_supplier_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_nomenclature_default_supplier_id
      ON nomenclature (default_supplier_id);
    `);

    console.log('  ✅ Nomenclature indexes created');

    // ============================================================================
    // RECIPES MODULE
    // ============================================================================
    console.log('');
    console.log('📖 Recipes module indexes...');

    // Recipe Ingredients - if they exist
    // Will check existence before creating
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recipe_ingredients') THEN
          CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id
          ON recipe_ingredients (recipe_id);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recipe_ingredients') THEN
          CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_ingredient_id
          ON recipe_ingredients (ingredient_id);
        END IF;
      END $$;
    `);

    console.log('  ✅ Recipe ingredients indexes created (if table exists)');

    // ============================================================================
    // FILES MODULE
    // ============================================================================
    console.log('');
    console.log('📁 Files module indexes...');

    // Files - actual columns
    // NOTE: File entity uses uploaded_by_user_id, not uploaded_by_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_files_uploaded_by_user_id
      ON files (uploaded_by_user_id);
    `);

    // Polymorphic indexes for entity_type + entity_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_files_entity
      ON files (entity_type, entity_id);
    `);

    console.log('  ✅ Files indexes created');

    // ============================================================================
    // NOTIFICATIONS MODULE
    // ============================================================================
    console.log('');
    console.log('🔔 Notifications module indexes...');

    // Notifications - actual columns
    // NOTE: Notification entity uses recipient_id, not user_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id
      ON notifications (recipient_id);
    `);

    console.log('  ✅ Notifications indexes created');

    // Web Push Subscriptions
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'web_push_subscriptions') THEN
          CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_user_id
          ON web_push_subscriptions (user_id);
        END IF;
      END $$;
    `);

    console.log('  ✅ Web push subscriptions indexes created (if table exists)');

    // ============================================================================
    // LOCATIONS MODULE
    // ============================================================================
    console.log('');
    console.log('📍 Locations module indexes...');

    // Location has counterparty_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_locations_counterparty_id
      ON locations (counterparty_id);
    `);

    // NOTE: Location does NOT have: parent_id, created_by_id, updated_by_id

    console.log('  ✅ Locations indexes created');

    // ============================================================================
    // ROUTES MODULE
    // ============================================================================
    console.log('');
    console.log('🗺️  Routes module indexes...');

    // Routes - has driver_id
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_routes_driver_id
      ON routes (driver_id);
    `);

    // NOTE: Route does NOT have: created_by_id, updated_by_id

    console.log('  ✅ Routes indexes created');

    // Route Stops - check existence
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'route_stops') THEN
          CREATE INDEX IF NOT EXISTS idx_route_stops_route_id
          ON route_stops (route_id);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'route_stops')
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'route_stops' AND column_name = 'location_id') THEN
          CREATE INDEX IF NOT EXISTS idx_route_stops_location_id
          ON route_stops (location_id);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'route_stops')
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'route_stops' AND column_name = 'machine_id') THEN
          CREATE INDEX IF NOT EXISTS idx_route_stops_machine_id
          ON route_stops (machine_id);
        END IF;
      END $$;
    `);

    console.log('  ✅ Route stops indexes created (if table exists)');

    // ============================================================================
    // EQUIPMENT MODULE
    // ============================================================================
    console.log('');
    console.log('🔧 Equipment module indexes...');

    // Equipment Components - check existence
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_components')
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment_components' AND column_name = 'machine_id') THEN
          CREATE INDEX IF NOT EXISTS idx_equipment_components_machine_id
          ON equipment_components (machine_id);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_components')
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment_components' AND column_name = 'component_type_id') THEN
          CREATE INDEX IF NOT EXISTS idx_equipment_components_component_type_id
          ON equipment_components (component_type_id);
        END IF;
      END $$;
    `);

    console.log('  ✅ Equipment components indexes created (if columns exist)');

    // ============================================================================
    // WAREHOUSES MODULE
    // ============================================================================
    console.log('');
    console.log('🏭 Warehouses module indexes...');

    // Warehouses - check existence of columns
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'warehouses')
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warehouses' AND column_name = 'location_id') THEN
          CREATE INDEX IF NOT EXISTS idx_warehouses_location_id
          ON warehouses (location_id);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'warehouses')
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'warehouses' AND column_name = 'manager_id') THEN
          CREATE INDEX IF NOT EXISTS idx_warehouses_manager_id
          ON warehouses (manager_id);
        END IF;
      END $$;
    `);

    console.log('  ✅ Warehouses indexes created (if columns exist)');

    // ============================================================================
    // CONTRACTS MODULE
    // ============================================================================
    console.log('');
    console.log('📄 Contracts module indexes...');

    // Contracts - check existence
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contracts')
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'location_id') THEN
          CREATE INDEX IF NOT EXISTS idx_contracts_location_id
          ON contracts (location_id);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contracts')
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'counterparty_id') THEN
          CREATE INDEX IF NOT EXISTS idx_contracts_counterparty_id
          ON contracts (counterparty_id);
        END IF;
      END $$;
    `);

    console.log('  ✅ Contracts indexes created (if columns exist)');

    // ============================================================================
    // AUDIT MODULE
    // ============================================================================
    console.log('');
    console.log('🔍 Audit module indexes...');

    // Audit Logs - check existence
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs')
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'user_id') THEN
          CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
          ON audit_logs (user_id);
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs')
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'entity_type') THEN
          CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
          ON audit_logs (entity_type, entity_id);
        END IF;
      END $$;
    `);

    console.log('  ✅ Audit logs indexes created (if columns exist)');

    // ============================================================================
    // COMPOSITE INDEXES (For Common Query Patterns)
    // ============================================================================
    console.log('');
    console.log('🔗 Creating composite indexes for common query patterns...');

    // Tasks: Query by status + assigned_to_user_id (corrected column name)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_status_assigned
      ON tasks (status, assigned_to_user_id);
    `);

    // Tasks: Query by machine + status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_machine_status
      ON tasks (machine_id, status);
    `);

    // Transactions: Query by machine + date
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_machine_date
      ON transactions (machine_id, transaction_date);
    `);

    // Incidents: Query by machine + status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_incidents_machine_status
      ON incidents (machine_id, status);
    `);

    // Notifications: Query by recipient + status (corrected column name)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient_status
      ON notifications (recipient_id, status);
    `);

    // Stock Movements: Query by date + type
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_movements_date_type
      ON stock_movements (movement_date, movement_type);
    `);

    console.log('  ✅ Composite indexes created');

    console.log('');
    console.log('✅ All foreign key indexes added successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log('  - Foreign key indexes created for existing columns only');
    console.log('  - Composite indexes: 6 indexes');
    console.log('  - Expected performance improvement: 10-100x on JOINs');
    console.log('');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('🗑️  Removing foreign key indexes...');

    // Drop all indexes created in up()
    // Using DROP INDEX IF EXISTS for safety

    // Composite indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_movements_date_type;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notifications_recipient_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_incidents_machine_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_transactions_machine_date;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tasks_machine_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tasks_status_assigned;`);

    // Audit logs
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_logs_entity;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_audit_logs_user_id;`);

    // Contracts
    await queryRunner.query(`DROP INDEX IF EXISTS idx_contracts_counterparty_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_contracts_location_id;`);

    // Warehouses
    await queryRunner.query(`DROP INDEX IF EXISTS idx_warehouses_manager_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_warehouses_location_id;`);

    // Equipment
    await queryRunner.query(`DROP INDEX IF EXISTS idx_equipment_components_component_type_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_equipment_components_machine_id;`);

    // Routes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_route_stops_machine_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_route_stops_location_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_route_stops_route_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_routes_driver_id;`);

    // Locations
    await queryRunner.query(`DROP INDEX IF EXISTS idx_locations_counterparty_id;`);

    // Notifications
    await queryRunner.query(`DROP INDEX IF EXISTS idx_web_push_subscriptions_user_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notifications_recipient_id;`);

    // Files
    await queryRunner.query(`DROP INDEX IF EXISTS idx_files_entity;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_files_uploaded_by_user_id;`);

    // Recipes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_recipe_ingredients_ingredient_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_recipe_ingredients_recipe_id;`);

    // Nomenclature
    await queryRunner.query(`DROP INDEX IF EXISTS idx_nomenclature_default_supplier_id;`);

    // Complaints
    await queryRunner.query(`DROP INDEX IF EXISTS idx_complaints_handled_by_user_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_complaints_machine_id;`);

    // Incidents
    await queryRunner.query(`DROP INDEX IF EXISTS idx_incidents_repair_task_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_incidents_assigned_to_user_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_incidents_reported_by_user_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_incidents_machine_id;`);

    // Transactions
    await queryRunner.query(`DROP INDEX IF EXISTS idx_transactions_collection_task_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_transactions_recipe_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_transactions_counterparty_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_transactions_contract_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_transactions_user_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_transactions_machine_id;`);

    // Stock Movements
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_movements_performed_by_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_movements_batch_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_movements_product_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_movements_destination_warehouse_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_stock_movements_warehouse_id;`);

    // Inventory
    await queryRunner.query(`DROP INDEX IF EXISTS idx_operator_inventory_nomenclature_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_operator_inventory_operator_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_warehouse_inventory_nomenclature_id;`);

    // Tasks
    await queryRunner.query(`DROP INDEX IF EXISTS idx_task_items_nomenclature_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_task_items_task_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tasks_rejected_by_user_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tasks_created_by_user_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tasks_assigned_to_user_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tasks_machine_id;`);

    // Machines
    await queryRunner.query(`DROP INDEX IF EXISTS idx_machine_inventory_nomenclature_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_machine_inventory_machine_id;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_machines_location_id;`);

    // Users
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_sessions_user_id;`);

    console.log('✅ Foreign key indexes removed');
  }
}
