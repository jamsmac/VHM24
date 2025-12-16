import { MigrationInterface, QueryRunner } from 'typeorm';
import { Logger } from '@nestjs/common';

const logger = new Logger('AddPerformanceIndexes1731750000000');

/**
 * Migration: Add Performance Optimization Indexes
 *
 * Adds database indexes for frequently queried fields to improve
 * performance of dashboards, reports, and analytics queries.
 *
 * Key optimizations:
 * - Transaction queries (date range, machine_id, amount)
 * - Task queries (status, assigned_to, due_date, machine_id)
 * - Incident queries (status, priority, machine_id, dates)
 * - Complaint queries (status, machine_id, dates, rating)
 * - Machine inventory queries (quantity, low_stock_threshold)
 * - Operator rating queries (operator_id, period dates, overall_score)
 */
export class AddPerformanceIndexes1731750000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1731750000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================================
    // TRANSACTIONS TABLE - Financial queries optimization
    // ============================================================================

    // Compound index for date range queries with machine_id (dashboard revenue queries)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_transactions_date_machine"
       ON "transactions" ("transaction_date", "machine_id")`,
    );

    // Index for amount-based filtering and sorting
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_transactions_amount"
       ON "transactions" ("amount")`,
    );

    // Compound index for payment method analysis
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_transactions_payment_date"
       ON "transactions" ("payment_method", "transaction_date")`,
    );

    // ============================================================================
    // TASKS TABLE - Task management optimization
    // ============================================================================

    // Compound index for operator task queries (status + assigned_to)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tasks_status_assigned"
       ON "tasks" ("status", "assigned_to_user_id")`,
    );

    // Compound index for due date queries with status
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tasks_due_date_status"
       ON "tasks" ("due_date", "status")`,
    );

    // Index for completed_at date queries (performance tracking)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tasks_completed_at"
       ON "tasks" ("completed_at") WHERE "completed_at" IS NOT NULL`,
    );

    // Compound index for machine task history
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tasks_machine_type_status"
       ON "tasks" ("machine_id", "type", "status")`,
    );

    // Index for task priority filtering
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_tasks_priority_status"
       ON "tasks" ("priority", "status")`,
    );

    // ============================================================================
    // INCIDENTS TABLE - Incident tracking optimization
    // ============================================================================

    // Compound index for incident status queries with machine
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_incidents_status_machine"
       ON "incidents" ("status", "machine_id")`,
    );

    // Compound index for priority-based queries
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_incidents_priority_status"
       ON "incidents" ("priority", "status")`,
    );

    // Index for resolved_at date queries (resolution tracking)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_incidents_resolved_at"
       ON "incidents" ("resolved_at") WHERE "resolved_at" IS NOT NULL`,
    );

    // Compound index for incident type analysis
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_incidents_type_reported"
       ON "incidents" ("incident_type", "reported_at")`,
    );

    // ============================================================================
    // COMPLAINTS TABLE - Complaint tracking optimization
    // ============================================================================

    // Compound index for complaint status queries with machine
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_complaints_status_machine"
       ON "complaints" ("status", "machine_id")`,
    );

    // Index for rating-based NPS calculations
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_complaints_rating_submitted"
       ON "complaints" ("rating", "submitted_at") WHERE "rating" IS NOT NULL`,
    );

    // Index for resolved_at date queries
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_complaints_resolved_at"
       ON "complaints" ("resolved_at") WHERE "resolved_at" IS NOT NULL`,
    );

    // Compound index for complaint type analysis
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_complaints_type_submitted"
       ON "complaints" ("complaint_type", "submitted_at")`,
    );

    // ============================================================================
    // MACHINE_INVENTORY TABLE - Inventory optimization
    // ============================================================================

    // Compound index for low stock detection
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_machine_inventory_stock_check"
       ON "machine_inventory" ("quantity", "low_stock_threshold")`,
    );

    // Compound index for machine inventory queries
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_machine_inventory_machine_product"
       ON "machine_inventory" ("machine_id", "nomenclature_id")`,
    );

    // ============================================================================
    // WAREHOUSE_INVENTORY TABLE - Warehouse optimization
    // ============================================================================

    // Compound index for warehouse inventory queries
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_warehouse_inventory_warehouse_product"
       ON "warehouse_inventory" ("warehouse_id", "nomenclature_id")`,
    );

    // Index for expiry date queries
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_warehouse_inventory_expiry"
       ON "warehouse_inventory" ("expiry_date") WHERE "expiry_date" IS NOT NULL`,
    );

    // Compound index for batch tracking
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_warehouse_inventory_batch_expiry"
       ON "warehouse_inventory" ("batch_number", "expiry_date")`,
    );

    // ============================================================================
    // OPERATOR_RATINGS TABLE - Performance tracking optimization
    // ============================================================================

    // Compound index for operator rating queries
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_operator_ratings_operator_period"
       ON "operator_ratings" ("operator_id", "period_end" DESC)`,
    );

    // Index for ranking queries
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_operator_ratings_score_rank"
       ON "operator_ratings" ("overall_score" DESC, "rank")`,
    );

    // Index for rating grade filtering
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_operator_ratings_grade_period"
       ON "operator_ratings" ("rating_grade", "period_end" DESC)`,
    );

    // ============================================================================
    // MACHINES TABLE - Machine queries optimization
    // ============================================================================

    // Compound index for location-based queries
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_machines_location_status"
       ON "machines" ("location_id", "status")`,
    );

    // Index for status filtering
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_machines_status"
       ON "machines" ("status")`,
    );

    // ============================================================================
    // FINANCIAL_OPERATIONS TABLE - Financial tracking optimization
    // ============================================================================

    // Compound index for date and type queries
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_financial_operations_date_type"
       ON "financial_operations" ("operation_date", "operation_type")`,
    );

    // Index for amount-based queries
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_financial_operations_amount"
       ON "financial_operations" ("amount")`,
    );

    logger.log('✅ Performance optimization indexes created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all indexes in reverse order
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_financial_operations_amount"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_financial_operations_date_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_machines_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_machines_location_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_operator_ratings_grade_period"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_operator_ratings_score_rank"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_operator_ratings_operator_period"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_warehouse_inventory_batch_expiry"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_warehouse_inventory_expiry"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_warehouse_inventory_warehouse_product"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_machine_inventory_machine_product"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_machine_inventory_stock_check"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_complaints_type_submitted"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_complaints_resolved_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_complaints_rating_submitted"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_complaints_status_machine"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_incidents_type_reported"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_incidents_resolved_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_incidents_priority_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_incidents_status_machine"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tasks_priority_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tasks_machine_type_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tasks_completed_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tasks_due_date_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tasks_status_assigned"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_payment_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_amount"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_date_machine"`);

    logger.log('✅ Performance optimization indexes removed successfully');
  }
}
