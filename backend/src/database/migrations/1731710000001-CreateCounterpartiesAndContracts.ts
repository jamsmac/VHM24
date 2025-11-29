import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create Counterparties and Contracts tables
 *
 * Phase 2: Implements counterparty management for Uzbekistan market
 * - Counterparties with UZ tax identifiers (INN 9 digits, MFO 5 digits)
 * - Contracts with multiple commission types
 * - Commission calculation history
 * - Updates locations table to link with counterparties
 */
export class CreateCounterpartiesAndContracts1731710000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create counterparties table
    await queryRunner.query(`
      CREATE TABLE "counterparties" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "short_name" varchar(50),
        "type" varchar(20) NOT NULL CHECK ("type" IN ('client', 'supplier', 'partner', 'location_owner')),

        -- Uzbekistan tax identifiers
        "inn" varchar(9) NOT NULL UNIQUE,
        "oked" varchar(20),

        -- Banking details
        "mfo" varchar(5),
        "bank_account" varchar(50),
        "bank_name" varchar(255),

        -- Addresses
        "legal_address" text,
        "actual_address" text,

        -- Contact information
        "contact_person" varchar(100),
        "phone" varchar(20),
        "email" varchar(100),

        -- Director information
        "director_name" varchar(255),
        "director_position" varchar(255),

        -- VAT
        "is_vat_payer" boolean DEFAULT true,
        "vat_rate" decimal(5, 2) DEFAULT 15.00,

        -- Payment terms
        "payment_term_days" int,
        "credit_limit" decimal(15, 2),

        -- Status
        "is_active" boolean DEFAULT true,
        "notes" text,

        -- Timestamps
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        "deleted_at" timestamp
      )
    `);

    // Add CHECK constraints for Uzbekistan specifics
    await queryRunner.query(`
      ALTER TABLE "counterparties"
      ADD CONSTRAINT "CHK_counterparties_inn_format"
      CHECK (LENGTH("inn") = 9 AND "inn" ~ '^[0-9]+$')
    `);

    await queryRunner.query(`
      ALTER TABLE "counterparties"
      ADD CONSTRAINT "CHK_counterparties_mfo_format"
      CHECK ("mfo" IS NULL OR (LENGTH("mfo") = 5 AND "mfo" ~ '^[0-9]+$'))
    `);

    await queryRunner.query(`
      ALTER TABLE "counterparties"
      ADD CONSTRAINT "CHK_counterparties_vat_rate"
      CHECK ("vat_rate" >= 0 AND "vat_rate" <= 100)
    `);

    await queryRunner.query(`
      ALTER TABLE "counterparties"
      ADD CONSTRAINT "CHK_counterparties_credit_limit"
      CHECK ("credit_limit" IS NULL OR "credit_limit" >= 0)
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_counterparties_inn" ON "counterparties" ("inn")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_counterparties_type" ON "counterparties" ("type")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_counterparties_is_active" ON "counterparties" ("is_active")
    `);

    // 2. Create contracts table
    await queryRunner.query(`
      CREATE TABLE "contracts" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "contract_number" varchar(50) NOT NULL UNIQUE,
        "start_date" date NOT NULL,
        "end_date" date,
        "status" varchar(20) NOT NULL DEFAULT 'draft' CHECK ("status" IN ('draft', 'active', 'suspended', 'expired', 'terminated')),

        -- Counterparty relation
        "counterparty_id" uuid NOT NULL,

        -- Commission configuration
        "commission_type" varchar(20) NOT NULL DEFAULT 'percentage' CHECK ("commission_type" IN ('percentage', 'fixed', 'tiered', 'hybrid')),
        "commission_rate" decimal(5, 2),
        "commission_fixed_amount" decimal(15, 2),
        "commission_fixed_period" varchar(20) CHECK ("commission_fixed_period" IN ('daily', 'weekly', 'monthly', 'quarterly')),
        "commission_tiers" jsonb,
        "commission_hybrid_fixed" decimal(15, 2),
        "commission_hybrid_rate" decimal(5, 2),

        -- Currency (always UZS)
        "currency" varchar(3) DEFAULT 'UZS',

        -- Payment terms
        "payment_term_days" int DEFAULT 30,
        "payment_type" varchar(20) DEFAULT 'postpayment' CHECK ("payment_type" IN ('prepayment', 'postpayment', 'on_delivery')),

        -- Additional conditions
        "minimum_monthly_revenue" decimal(15, 2),
        "penalty_rate" decimal(5, 2),
        "special_conditions" text,
        "notes" text,

        -- File attachment
        "contract_file_id" uuid,

        -- Timestamps
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        "deleted_at" timestamp,

        CONSTRAINT "FK_contracts_counterparty" FOREIGN KEY ("counterparty_id")
          REFERENCES "counterparties" ("id") ON DELETE RESTRICT
      )
    `);

    // Add CHECK constraints for contracts
    await queryRunner.query(`
      ALTER TABLE "contracts"
      ADD CONSTRAINT "CHK_contracts_dates"
      CHECK ("end_date" IS NULL OR "end_date" >= "start_date")
    `);

    await queryRunner.query(`
      ALTER TABLE "contracts"
      ADD CONSTRAINT "CHK_contracts_commission_rate"
      CHECK ("commission_rate" IS NULL OR ("commission_rate" >= 0 AND "commission_rate" <= 100))
    `);

    await queryRunner.query(`
      ALTER TABLE "contracts"
      ADD CONSTRAINT "CHK_contracts_penalty_rate"
      CHECK ("penalty_rate" IS NULL OR ("penalty_rate" >= 0 AND "penalty_rate" <= 100))
    `);

    await queryRunner.query(`
      ALTER TABLE "contracts"
      ADD CONSTRAINT "CHK_contracts_payment_term_days"
      CHECK ("payment_term_days" > 0)
    `);

    // Create indexes for contracts
    await queryRunner.query(`
      CREATE INDEX "IDX_contracts_counterparty_id" ON "contracts" ("counterparty_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_contracts_status" ON "contracts" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_contracts_contract_number" ON "contracts" ("contract_number")
    `);

    // 3. Create commission_calculations table
    await queryRunner.query(`
      CREATE TABLE "commission_calculations" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "contract_id" uuid NOT NULL,

        -- Calculation period
        "period_start" date NOT NULL,
        "period_end" date NOT NULL,

        -- Revenue data
        "total_revenue" decimal(15, 2) NOT NULL,
        "transaction_count" int DEFAULT 0,

        -- Commission calculation
        "commission_amount" decimal(15, 2) NOT NULL,
        "commission_type" varchar(20) NOT NULL,
        "calculation_details" jsonb,

        -- Payment status
        "payment_status" varchar(20) DEFAULT 'pending' CHECK ("payment_status" IN ('pending', 'paid', 'overdue', 'cancelled')),
        "payment_due_date" date,
        "payment_date" date,
        "payment_transaction_id" uuid,

        -- Additional info
        "notes" text,
        "calculated_by_user_id" uuid,

        -- Timestamps
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        "deleted_at" timestamp,

        CONSTRAINT "FK_commission_calculations_contract" FOREIGN KEY ("contract_id")
          REFERENCES "contracts" ("id") ON DELETE CASCADE
      )
    `);

    // Add CHECK constraints
    await queryRunner.query(`
      ALTER TABLE "commission_calculations"
      ADD CONSTRAINT "CHK_commission_calculations_period"
      CHECK ("period_end" >= "period_start")
    `);

    await queryRunner.query(`
      ALTER TABLE "commission_calculations"
      ADD CONSTRAINT "CHK_commission_calculations_revenue"
      CHECK ("total_revenue" >= 0)
    `);

    await queryRunner.query(`
      ALTER TABLE "commission_calculations"
      ADD CONSTRAINT "CHK_commission_calculations_amount"
      CHECK ("commission_amount" >= 0)
    `);

    // Create indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_commission_calculations_contract_id" ON "commission_calculations" ("contract_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_commission_calculations_period" ON "commission_calculations" ("period_start", "period_end")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_commission_calculations_payment_status" ON "commission_calculations" ("payment_status")
    `);

    // 4. Update locations table
    // Rename contractor_id to counterparty_id and add foreign key
    await queryRunner.query(`
      ALTER TABLE "locations"
      RENAME COLUMN "contractor_id" TO "counterparty_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "locations"
      ADD CONSTRAINT "FK_locations_counterparty" FOREIGN KEY ("counterparty_id")
        REFERENCES "counterparties" ("id") ON DELETE SET NULL
    `);

    // Update monthly_rent precision for UZS
    await queryRunner.query(`
      ALTER TABLE "locations"
      ALTER COLUMN "monthly_rent" TYPE decimal(15, 2)
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_locations_counterparty_id" ON "locations" ("counterparty_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys and indexes from locations
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_locations_counterparty_id"`);
    await queryRunner.query(
      `ALTER TABLE "locations" DROP CONSTRAINT IF EXISTS "FK_locations_counterparty"`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" RENAME COLUMN "counterparty_id" TO "contractor_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "locations" ALTER COLUMN "monthly_rent" TYPE decimal(10, 2)`,
    );

    // Drop commission_calculations table
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_commission_calculations_payment_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_commission_calculations_period"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_commission_calculations_contract_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "commission_calculations"`);

    // Drop contracts table
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_contracts_contract_number"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_contracts_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_contracts_counterparty_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "contracts"`);

    // Drop counterparties table
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_counterparties_is_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_counterparties_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_counterparties_inn"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "counterparties"`);
  }
}
