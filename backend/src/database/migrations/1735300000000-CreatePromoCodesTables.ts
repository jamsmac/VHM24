import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Promo Codes System
 *
 * This migration creates:
 * 1. promo_codes table - stores promo code definitions
 * 2. promo_code_redemptions table - tracks usage history
 * 3. Necessary indexes for performance
 */
export class CreatePromoCodesTables1735300000000 implements MigrationInterface {
  name = 'CreatePromoCodesTables1735300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create promo_codes table
    await queryRunner.query(`
      CREATE TABLE "promo_codes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "code" varchar(50) NOT NULL,
        "type" varchar(20) NOT NULL,
        "value" decimal(12,2) NOT NULL,

        "valid_from" TIMESTAMP WITH TIME ZONE NOT NULL,
        "valid_until" TIMESTAMP WITH TIME ZONE,
        "status" varchar(20) NOT NULL DEFAULT 'draft',

        "max_uses" integer,
        "max_uses_per_user" integer DEFAULT 1,
        "current_uses" integer NOT NULL DEFAULT 0,

        "minimum_order_amount" decimal(12,2),
        "maximum_discount" decimal(12,2),
        "applicable_products" jsonb,
        "applicable_locations" jsonb,
        "applicable_machines" jsonb,

        "name" varchar(100),
        "description" text,
        "organization_id" uuid,
        "created_by_id" uuid,

        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,

        CONSTRAINT "PK_promo_codes" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_promo_codes_code" UNIQUE ("code"),
        CONSTRAINT "FK_promo_codes_organization" FOREIGN KEY ("organization_id")
          REFERENCES "organizations"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_promo_codes_created_by" FOREIGN KEY ("created_by_id")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // 2. Create indexes on promo_codes
    await queryRunner.query(`
      CREATE INDEX "IDX_promo_codes_code" ON "promo_codes"("code")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_promo_codes_status" ON "promo_codes"("status")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_promo_codes_type" ON "promo_codes"("type")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_promo_codes_valid_from" ON "promo_codes"("valid_from")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_promo_codes_valid_until" ON "promo_codes"("valid_until")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_promo_codes_organization_id" ON "promo_codes"("organization_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_promo_codes_deleted_at" ON "promo_codes"("deleted_at")
    `);

    // 3. Create promo_code_redemptions table
    await queryRunner.query(`
      CREATE TABLE "promo_code_redemptions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "promo_code_id" uuid NOT NULL,
        "client_user_id" uuid NOT NULL,
        "order_id" uuid,
        "discount_applied" decimal(12,2) NOT NULL,
        "loyalty_bonus_awarded" integer DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

        CONSTRAINT "PK_promo_code_redemptions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_redemptions_promo_code" FOREIGN KEY ("promo_code_id")
          REFERENCES "promo_codes"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_redemptions_client_user" FOREIGN KEY ("client_user_id")
          REFERENCES "client_users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_redemptions_order" FOREIGN KEY ("order_id")
          REFERENCES "client_orders"("id") ON DELETE SET NULL
      )
    `);

    // 4. Create indexes on promo_code_redemptions
    await queryRunner.query(`
      CREATE INDEX "IDX_redemptions_promo_code_id" ON "promo_code_redemptions"("promo_code_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_redemptions_client_user_id" ON "promo_code_redemptions"("client_user_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_redemptions_order_id" ON "promo_code_redemptions"("order_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_redemptions_created_at" ON "promo_code_redemptions"("created_at")
    `);

    // 5. Add promo_code_id to client_orders if it doesn't exist
    await queryRunner.query(`
      ALTER TABLE "client_orders"
      ADD COLUMN IF NOT EXISTS "promo_code_id" uuid,
      ADD COLUMN IF NOT EXISTS "discount_amount" decimal(12,2) DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "client_orders"
      ADD CONSTRAINT "FK_client_orders_promo_code"
      FOREIGN KEY ("promo_code_id") REFERENCES "promo_codes"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_client_orders_promo_code_id" ON "client_orders"("promo_code_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove promo_code_id from client_orders
    await queryRunner.query(`
      ALTER TABLE "client_orders" DROP CONSTRAINT IF EXISTS "FK_client_orders_promo_code"
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_client_orders_promo_code_id"`);
    await queryRunner.query(`ALTER TABLE "client_orders" DROP COLUMN IF EXISTS "promo_code_id"`);
    await queryRunner.query(`ALTER TABLE "client_orders" DROP COLUMN IF EXISTS "discount_amount"`);

    // Drop redemptions indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_redemptions_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_redemptions_order_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_redemptions_client_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_redemptions_promo_code_id"`);

    // Drop redemptions table
    await queryRunner.query(`DROP TABLE IF EXISTS "promo_code_redemptions"`);

    // Drop promo_codes indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_promo_codes_deleted_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_promo_codes_organization_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_promo_codes_valid_until"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_promo_codes_valid_from"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_promo_codes_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_promo_codes_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_promo_codes_code"`);

    // Drop promo_codes table
    await queryRunner.query(`DROP TABLE IF EXISTS "promo_codes"`);
  }
}
