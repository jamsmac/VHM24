import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Replace RUB currency with UZS (Uzbekistan Sum)
 *
 * This migration:
 * 1. Adds currency column to nomenclature and transactions tables
 * 2. Updates existing RUB values to UZS in all tables
 * 3. Changes default currency from RUB to UZS
 *
 * CRITICAL: VendHub operates in Uzbekistan market
 * All financial operations must be in UZS currency
 */
export class ReplaceRubWithUzs1731700000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add currency column to nomenclature
    await queryRunner.query(`
      ALTER TABLE "nomenclature"
      ADD COLUMN IF NOT EXISTS "currency" varchar(3) DEFAULT 'UZS'
    `);

    // 2. Add currency column to transactions
    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD COLUMN IF NOT EXISTS "currency" varchar(3) DEFAULT 'UZS'
    `);

    // 3. Update existing RUB values to UZS in all tables

    // Invoices
    await queryRunner.query(`
      UPDATE "invoices"
      SET "currency" = 'UZS'
      WHERE "currency" = 'RUB' OR "currency" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "invoices"
      ALTER COLUMN "currency" SET DEFAULT 'UZS'
    `);

    // Payments
    await queryRunner.query(`
      UPDATE "payments"
      SET "currency" = 'UZS'
      WHERE "currency" = 'RUB' OR "currency" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "payments"
      ALTER COLUMN "currency" SET DEFAULT 'UZS'
    `);

    // Spare Parts
    await queryRunner.query(`
      UPDATE "spare_parts"
      SET "currency" = 'UZS'
      WHERE "currency" = 'RUB' OR "currency" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "spare_parts"
      ALTER COLUMN "currency" SET DEFAULT 'UZS'
    `);

    // Nomenclature - set all existing records to UZS
    await queryRunner.query(`
      UPDATE "nomenclature"
      SET "currency" = 'UZS'
      WHERE "currency" IS NULL OR "currency" = ''
    `);

    // Transactions - set all existing records to UZS
    await queryRunner.query(`
      UPDATE "transactions"
      SET "currency" = 'UZS'
      WHERE "currency" IS NULL OR "currency" = ''
    `);

    // 4. Add NOT NULL constraint after setting defaults
    await queryRunner.query(`
      ALTER TABLE "nomenclature"
      ALTER COLUMN "currency" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "transactions"
      ALTER COLUMN "currency" SET NOT NULL
    `);

    // 5. Add check constraints for valid currencies
    await queryRunner.query(`
      ALTER TABLE "nomenclature"
      ADD CONSTRAINT "CHK_nomenclature_currency"
      CHECK ("currency" IN ('UZS', 'USD', 'EUR'))
    `);

    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD CONSTRAINT "CHK_transactions_currency"
      CHECK ("currency" IN ('UZS', 'USD', 'EUR'))
    `);

    await queryRunner.query(`
      ALTER TABLE "invoices"
      ADD CONSTRAINT "CHK_invoices_currency"
      CHECK ("currency" IN ('UZS', 'USD', 'EUR'))
    `);

    await queryRunner.query(`
      ALTER TABLE "payments"
      ADD CONSTRAINT "CHK_payments_currency"
      CHECK ("currency" IN ('UZS', 'USD', 'EUR'))
    `);

    // 6. Update precision for UZS (larger amounts)
    // UZS has higher denominations: 1 USD ≈ 12,500 UZS
    // Need to support amounts up to 999,999,999,999.99 UZS

    await queryRunner.query(`
      ALTER TABLE "transactions"
      ALTER COLUMN "amount" TYPE decimal(15, 2)
    `);

    await queryRunner.query(`
      ALTER TABLE "invoices"
      ALTER COLUMN "amount" TYPE decimal(15, 2)
    `);

    await queryRunner.query(`
      ALTER TABLE "payments"
      ALTER COLUMN "amount" TYPE decimal(15, 2)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: Change UZS back to RUB

    // Remove check constraints
    await queryRunner.query(`
      ALTER TABLE "nomenclature" DROP CONSTRAINT IF EXISTS "CHK_nomenclature_currency"
    `);

    await queryRunner.query(`
      ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "CHK_transactions_currency"
    `);

    await queryRunner.query(`
      ALTER TABLE "invoices" DROP CONSTRAINT IF EXISTS "CHK_invoices_currency"
    `);

    await queryRunner.query(`
      ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "CHK_payments_currency"
    `);

    // Restore RUB
    await queryRunner.query(`
      UPDATE "nomenclature" SET "currency" = 'RUB' WHERE "currency" = 'UZS'
    `);

    await queryRunner.query(`
      UPDATE "transactions" SET "currency" = 'RUB' WHERE "currency" = 'UZS'
    `);

    await queryRunner.query(`
      UPDATE "invoices" SET "currency" = 'RUB' WHERE "currency" = 'UZS'
    `);

    await queryRunner.query(`
      UPDATE "payments" SET "currency" = 'RUB' WHERE "currency" = 'UZS'
    `);

    await queryRunner.query(`
      UPDATE "spare_parts" SET "currency" = 'RUB' WHERE "currency" = 'UZS'
    `);

    // Restore defaults
    await queryRunner.query(`
      ALTER TABLE "invoices" ALTER COLUMN "currency" SET DEFAULT 'RUB'
    `);

    await queryRunner.query(`
      ALTER TABLE "payments" ALTER COLUMN "currency" SET DEFAULT 'RUB'
    `);

    await queryRunner.query(`
      ALTER TABLE "spare_parts" ALTER COLUMN "currency" SET DEFAULT 'RUB'
    `);

    // Drop added columns
    await queryRunner.query(`
      ALTER TABLE "nomenclature" DROP COLUMN IF EXISTS "currency"
    `);

    await queryRunner.query(`
      ALTER TABLE "transactions" DROP COLUMN IF EXISTS "currency"
    `);

    // Restore precision
    await queryRunner.query(`
      ALTER TABLE "transactions" ALTER COLUMN "amount" TYPE decimal(10, 2)
    `);

    await queryRunner.query(`
      ALTER TABLE "invoices" ALTER COLUMN "amount" TYPE decimal(10, 2)
    `);

    await queryRunner.query(`
      ALTER TABLE "payments" ALTER COLUMN "amount" TYPE decimal(10, 2)
    `);
  }
}
