import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create Reconciliation Module Tables
 *
 * Creates tables for:
 * - reconciliation_runs: Прогоны сверки платежей
 * - reconciliation_mismatches: Найденные несовпадения
 */
export class CreateReconciliationTables1733000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ========================================
    // ENUMS
    // ========================================

    // Reconciliation status enum
    await queryRunner.query(`
      CREATE TYPE reconciliation_status AS ENUM (
        'pending',
        'processing',
        'completed',
        'failed',
        'cancelled'
      );
    `);

    // Reconciliation source enum
    await queryRunner.query(`
      CREATE TYPE reconciliation_source AS ENUM (
        'hw',
        'sales_report',
        'fiscal',
        'payme',
        'click',
        'uzum'
      );
    `);

    // Mismatch type enum
    await queryRunner.query(`
      CREATE TYPE mismatch_type AS ENUM (
        'order_not_found',
        'payment_not_found',
        'amount_mismatch',
        'time_mismatch',
        'duplicate',
        'partial_match'
      );
    `);

    // ========================================
    // RECONCILIATION RUNS TABLE
    // ========================================

    await queryRunner.query(`
      CREATE TABLE reconciliation_runs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        status reconciliation_status NOT NULL DEFAULT 'pending',

        -- Period
        date_from DATE NOT NULL,
        date_to DATE NOT NULL,

        -- Sources (stored as text array of enum values)
        sources TEXT[] NOT NULL,

        -- Filters
        machine_ids TEXT[],

        -- Tolerance settings
        time_tolerance INTEGER DEFAULT 5,
        amount_tolerance INTEGER DEFAULT 100,

        -- Timing
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        processing_time_ms INTEGER,

        -- Results
        summary JSONB,
        error_message TEXT,

        -- Creator
        created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,

        -- Metadata
        metadata JSONB,

        -- Timestamps
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // Indexes for reconciliation_runs
    await queryRunner.query(`
      CREATE INDEX idx_reconciliation_runs_status ON reconciliation_runs(status);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_reconciliation_runs_created_by ON reconciliation_runs(created_by_user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_reconciliation_runs_dates ON reconciliation_runs(date_from, date_to);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_reconciliation_runs_created_at ON reconciliation_runs(created_at);
    `);

    // ========================================
    // RECONCILIATION MISMATCHES TABLE
    // ========================================

    await queryRunner.query(`
      CREATE TABLE reconciliation_mismatches (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        run_id UUID NOT NULL REFERENCES reconciliation_runs(id) ON DELETE CASCADE,

        -- Order identification
        order_number VARCHAR(100),
        machine_code VARCHAR(100),
        order_time TIMESTAMP WITH TIME ZONE,
        amount DECIMAL(15, 2),
        payment_method VARCHAR(50),

        -- Mismatch details
        mismatch_type mismatch_type NOT NULL,
        match_score INTEGER DEFAULT 0,
        discrepancy_amount DECIMAL(15, 2),

        -- Source data (JSON with data from each source)
        sources_data JSONB,

        -- Description
        description TEXT,

        -- Resolution
        is_resolved BOOLEAN DEFAULT false,
        resolution_notes TEXT,
        resolved_at TIMESTAMP WITH TIME ZONE,
        resolved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

        -- Timestamps
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // Indexes for reconciliation_mismatches
    await queryRunner.query(`
      CREATE INDEX idx_reconciliation_mismatches_run_id ON reconciliation_mismatches(run_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_reconciliation_mismatches_type ON reconciliation_mismatches(mismatch_type);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_reconciliation_mismatches_machine ON reconciliation_mismatches(machine_code);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_reconciliation_mismatches_order_time ON reconciliation_mismatches(order_time);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_reconciliation_mismatches_resolved ON reconciliation_mismatches(is_resolved);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_reconciliation_mismatches_score ON reconciliation_mismatches(match_score);
    `);

    // Composite index for common queries
    await queryRunner.query(`
      CREATE INDEX idx_reconciliation_mismatches_run_resolved
      ON reconciliation_mismatches(run_id, is_resolved);
    `);

    // ========================================
    // TRIGGERS FOR updated_at
    // ========================================

    // Reconciliation runs trigger
    await queryRunner.query(`
      CREATE TRIGGER update_reconciliation_runs_updated_at
      BEFORE UPDATE ON reconciliation_runs
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);

    // Reconciliation mismatches trigger
    await queryRunner.query(`
      CREATE TRIGGER update_reconciliation_mismatches_updated_at
      BEFORE UPDATE ON reconciliation_mismatches
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_reconciliation_mismatches_updated_at ON reconciliation_mismatches;`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_reconciliation_runs_updated_at ON reconciliation_runs;`,
    );

    // Drop tables in reverse order
    await queryRunner.query(`DROP TABLE IF EXISTS reconciliation_mismatches CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS reconciliation_runs CASCADE;`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS mismatch_type;`);
    await queryRunner.query(`DROP TYPE IF EXISTS reconciliation_source;`);
    await queryRunner.query(`DROP TYPE IF EXISTS reconciliation_status;`);
  }
}
