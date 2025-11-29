import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add Performance Indexes
 *
 * Adds database indexes to improve query performance for frequently filtered/sorted columns
 */
export class AddPerformanceIndexes1732400000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1732400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tasks table indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_tasks_status" ON "tasks" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_tasks_type_code" ON "tasks" ("type_code")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_tasks_machine_id" ON "tasks" ("machine_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_tasks_assigned_to_user_id" ON "tasks" ("assigned_to_user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_tasks_scheduled_date" ON "tasks" ("scheduled_date")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_tasks_priority" ON "tasks" ("priority")
    `);

    // Composite index for common query pattern: status + scheduled_date
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_tasks_status_scheduled_date" ON "tasks" ("status", "scheduled_date")
    `);

    // Composite index for machine tasks: machine_id + status
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_tasks_machine_id_status" ON "tasks" ("machine_id", "status")
    `);

    // Transactions table indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_transactions_machine_id" ON "transactions" ("machine_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_transactions_transaction_type" ON "transactions" ("transaction_type")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_transactions_created_at" ON "transactions" ("created_at")
    `);

    // Composite index for sales analytics: machine_id + created_at
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_transactions_machine_created" ON "transactions" ("machine_id", "created_at")
    `);

    // Equipment components indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_equipment_components_status" ON "equipment_components" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_equipment_components_location_type" ON "equipment_components" ("current_location_type")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_equipment_components_machine_id" ON "equipment_components" ("machine_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_equipment_components_component_type" ON "equipment_components" ("component_type")
    `);

    // Composite index: machine_id + status (for finding active components in machine)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_equipment_components_machine_status" ON "equipment_components" ("machine_id", "status")
    `);

    // Inventory indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_machine_inventory_machine_id" ON "machine_inventory" ("machine_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_machine_inventory_nomenclature_id" ON "machine_inventory" ("nomenclature_id")
    `);

    // Composite index for inventory lookups
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_machine_inventory_machine_nomenclature" ON "machine_inventory" ("machine_id", "nomenclature_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_operator_inventory_user_id" ON "operator_inventory" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_operator_inventory_nomenclature_id" ON "operator_inventory" ("nomenclature_id")
    `);

    // Incidents indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_incidents_machine_id" ON "incidents" ("machine_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_incidents_status" ON "incidents" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_incidents_incident_type" ON "incidents" ("incident_type")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_incidents_priority" ON "incidents" ("priority")
    `);

    // Machines indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_machines_location_id" ON "machines" ("location_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_machines_status" ON "machines" ("status")
    `);

    // Notifications indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON "notifications" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_notifications_is_read" ON "notifications" ("is_read")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_notifications_created_at" ON "notifications" ("created_at")
    `);

    // Composite index for unread notifications
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_notifications_user_unread" ON "notifications" ("user_id", "is_read", "created_at")
    `);

    // Files indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_files_entity_type_entity_id" ON "files" ("entity_type", "entity_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_files_category" ON "files" ("category")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all indexes in reverse order
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_files_category"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_files_entity_type_entity_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notifications_user_unread"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notifications_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notifications_is_read"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notifications_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_machines_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_machines_location_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_incidents_priority"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_incidents_incident_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_incidents_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_incidents_machine_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_operator_inventory_nomenclature_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_operator_inventory_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_machine_inventory_machine_nomenclature"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_machine_inventory_nomenclature_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_machine_inventory_machine_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_equipment_components_machine_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_equipment_components_component_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_equipment_components_machine_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_equipment_components_location_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_equipment_components_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_transactions_machine_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_transactions_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_transactions_transaction_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_transactions_machine_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_machine_id_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_status_scheduled_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_priority"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_scheduled_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_assigned_to_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_machine_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_type_code"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_status"`);
  }
}
