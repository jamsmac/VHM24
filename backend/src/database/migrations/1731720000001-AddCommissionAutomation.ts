import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 3: Commission Automation & Integration
 *
 * Adds support for linking machines and transactions to contracts,
 * enabling automated commission calculation based on actual revenue.
 *
 * Changes:
 * 1. Add contract_id to machines table (nullable FK)
 * 2. Add contract_id to transactions table (nullable FK)
 * 3. Add indexes for performance
 */
export class AddCommissionAutomation1731720000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // =========================================
    // 1. Add contract_id to machines table
    // =========================================

    await queryRunner.query(`
      ALTER TABLE "machines"
      ADD COLUMN "contract_id" uuid NULL
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "machines"."contract_id" IS
      'Optional link to contract for commission calculation. If set, all sales from this machine are attributed to this contract.'
    `);

    // Add FK constraint
    await queryRunner.query(`
      ALTER TABLE "machines"
      ADD CONSTRAINT "FK_machines_contract_id"
      FOREIGN KEY ("contract_id")
      REFERENCES "contracts"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE
    `);

    // Add index for machines by contract
    await queryRunner.query(`
      CREATE INDEX "IDX_machines_contract_id"
      ON "machines"("contract_id")
      WHERE "contract_id" IS NOT NULL
    `);

    // =========================================
    // 2. Add contract_id and sale_date to transactions table
    // =========================================

    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD COLUMN "contract_id" uuid NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD COLUMN "sale_date" timestamp with time zone NULL
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "transactions"."contract_id" IS
      'Link to contract for commission calculation. Auto-populated from machine.contract_id on creation. Used for revenue aggregation.'
    `);

    await queryRunner.query(`
      COMMENT ON COLUMN "transactions"."sale_date" IS
      'Actual sale date/time from vending machine or import (for SALE transactions). Used for revenue aggregation and reporting.'
    `);

    // Backfill sale_date from transaction_date for existing SALE transactions
    await queryRunner.query(`
      UPDATE "transactions"
      SET "sale_date" = "transaction_date"
      WHERE "transaction_type" = 'sale'
        AND "sale_date" IS NULL
    `);

    // Add FK constraint
    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD CONSTRAINT "FK_transactions_contract_id"
      FOREIGN KEY ("contract_id")
      REFERENCES "contracts"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE
    `);

    // Add composite index for efficient revenue aggregation
    await queryRunner.query(`
      CREATE INDEX "IDX_transactions_contract_sale_date"
      ON "transactions"("contract_id", "sale_date")
      WHERE "contract_id" IS NOT NULL AND "transaction_type" = 'sale'
    `);

    // Add index on sale_date for date range queries
    await queryRunner.query(`
      CREATE INDEX "IDX_transactions_sale_date"
      ON "transactions"("sale_date")
      WHERE "transaction_type" = 'sale'
    `);

    // =========================================
    // 3. Add indexes to commission_calculations
    // =========================================

    // Index for pending payments dashboard
    await queryRunner.query(`
      CREATE INDEX "IDX_commission_calculations_payment_status"
      ON "commission_calculations"("payment_status")
    `);

    // Index for overdue payment detection
    await queryRunner.query(`
      CREATE INDEX "IDX_commission_calculations_overdue"
      ON "commission_calculations"("payment_status", "payment_due_date")
      WHERE "payment_status" IN ('pending', 'overdue')
    `);

    // Index for contract commission history
    await queryRunner.query(`
      CREATE INDEX "IDX_commission_calculations_contract_period"
      ON "commission_calculations"("contract_id", "period_start", "period_end")
    `);

    // =========================================
    // 4. Add helpful views (optional but useful)
    // =========================================

    // View for pending commission dashboard
    await queryRunner.query(`
      CREATE OR REPLACE VIEW "v_pending_commissions" AS
      SELECT
        cc.id,
        cc.contract_id,
        c.contract_number,
        cp.name AS counterparty_name,
        cc.period_start,
        cc.period_end,
        cc.total_revenue,
        cc.commission_amount,
        cc.payment_status,
        cc.payment_due_date,
        CASE
          WHEN cc.payment_due_date < CURRENT_DATE THEN
            EXTRACT(DAY FROM CURRENT_DATE - cc.payment_due_date)
          ELSE 0
        END AS days_overdue,
        cc.created_at
      FROM commission_calculations cc
      JOIN contracts c ON cc.contract_id = c.id
      JOIN counterparties cp ON c.counterparty_id = cp.id
      WHERE cc.payment_status IN ('pending', 'overdue')
      ORDER BY cc.payment_due_date ASC NULLS LAST
    `);

    await queryRunner.query(`
      COMMENT ON VIEW "v_pending_commissions" IS
      'Dashboard view for pending and overdue commission payments with counterparty details'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // =========================================
    // Drop views
    // =========================================
    await queryRunner.query(`DROP VIEW IF EXISTS "v_pending_commissions"`);

    // =========================================
    // Drop commission_calculations indexes
    // =========================================
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_commission_calculations_contract_period"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_commission_calculations_overdue"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_commission_calculations_payment_status"`);

    // =========================================
    // Drop transactions indexes and column
    // =========================================
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_sale_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_contract_sale_date"`);
    await queryRunner.query(
      `ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "FK_transactions_contract_id"`,
    );
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN IF EXISTS "sale_date"`);
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN IF EXISTS "contract_id"`);

    // =========================================
    // Drop machines indexes and column
    // =========================================
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_machines_contract_id"`);
    await queryRunner.query(
      `ALTER TABLE "machines" DROP CONSTRAINT IF EXISTS "FK_machines_contract_id"`,
    );
    await queryRunner.query(`ALTER TABLE "machines" DROP COLUMN IF EXISTS "contract_id"`);
  }
}
