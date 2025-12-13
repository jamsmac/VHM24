import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add Performance Indexes for Reconciliation
 *
 * Adds additional indexes optimized for common reconciliation queries:
 * - Date range queries
 * - Source filtering
 * - Aggregation queries
 */
export class AddReconciliationPerformanceIndexes1733000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // MATERIAL REQUESTS INDEXES
    // ========================================

    // Index for pending requests (commonly queried)
    await queryRunner.query(`
      CREATE INDEX idx_material_requests_pending
      ON material_requests(created_at DESC)
      WHERE status = 'new' AND deleted_at IS NULL;
    `);

    // Index for user's own requests
    await queryRunner.query(`
      CREATE INDEX idx_material_requests_user_status
      ON material_requests(created_by_user_id, status, created_at DESC)
      WHERE deleted_at IS NULL;
    `);

    // Index for date range queries
    await queryRunner.query(`
      CREATE INDEX idx_material_requests_date_range
      ON material_requests(created_at, status)
      WHERE deleted_at IS NULL;
    `);

    // ========================================
    // MATERIALS INDEXES
    // ========================================

    // Full-text search index for materials
    await queryRunner.query(`
      CREATE INDEX idx_materials_search
      ON materials USING gin(to_tsvector('russian', name || ' ' || COALESCE(description, '')));
    `);

    // Index for category + active filtering
    await queryRunner.query(`
      CREATE INDEX idx_materials_category_active
      ON materials(category, sort_order, name)
      WHERE is_active = true AND deleted_at IS NULL;
    `);

    // ========================================
    // RECONCILIATION INDEXES
    // ========================================

    // Index for completed runs statistics
    await queryRunner.query(`
      CREATE INDEX idx_reconciliation_runs_completed
      ON reconciliation_runs(completed_at DESC)
      WHERE status = 'completed' AND deleted_at IS NULL;
    `);

    // Index for unresolved mismatches (priority view)
    await queryRunner.query(`
      CREATE INDEX idx_reconciliation_mismatches_unresolved
      ON reconciliation_mismatches(run_id, match_score, order_time)
      WHERE is_resolved = false AND deleted_at IS NULL;
    `);

    // Index for mismatch aggregation by type
    await queryRunner.query(`
      CREATE INDEX idx_reconciliation_mismatches_type_amount
      ON reconciliation_mismatches(run_id, mismatch_type, discrepancy_amount)
      WHERE deleted_at IS NULL;
    `);

    // ========================================
    // SUPPLIERS INDEXES
    // ========================================

    // Full-text search for suppliers
    await queryRunner.query(`
      CREATE INDEX idx_suppliers_search
      ON suppliers USING gin(to_tsvector('russian', name || ' ' || COALESCE(notes, '')));
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop supplier indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_suppliers_search;`);

    // Drop reconciliation indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reconciliation_mismatches_type_amount;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reconciliation_mismatches_unresolved;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_reconciliation_runs_completed;`);

    // Drop materials indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_materials_category_active;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_materials_search;`);

    // Drop material requests indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_material_requests_date_range;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_material_requests_user_status;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_material_requests_pending;`);
  }
}
