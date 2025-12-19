import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateClientTables1734500001000 implements MigrationInterface {
  name = 'CreateClientTables1734500001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "client_order_status_enum" AS ENUM (
          'created', 'pending_payment', 'paid', 'preparing', 'ready', 'completed', 'cancelled', 'refunded'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "payment_provider_enum" AS ENUM ('click', 'payme', 'uzum', 'wallet', 'cash');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "client_payment_status_enum" AS ENUM ('pending', 'success', 'failed', 'refunded');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "loyalty_transaction_reason_enum" AS ENUM (
          'order_earned', 'order_redeemed', 'referral_bonus', 'promo_bonus', 'manual_adjustment', 'expiration'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "wallet_transaction_type_enum" AS ENUM (
          'top_up', 'purchase', 'refund', 'manual_adjustment', 'bonus'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create client_users table
    await queryRunner.query(`
      CREATE TABLE "client_users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "telegram_username" character varying(100),
        "telegram_id" character varying(50) NOT NULL,
        "full_name" character varying(200),
        "phone" character varying(20),
        "email" character varying(255),
        "is_verified" boolean NOT NULL DEFAULT false,
        "language" character varying(10) NOT NULL DEFAULT 'ru',
        "referral_code" character varying(20),
        "referred_by_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_client_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_client_users_telegram_id" UNIQUE ("telegram_id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_client_users_telegram_id" ON "client_users" ("telegram_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_client_users_phone" ON "client_users" ("phone")`);
    await queryRunner.query(`CREATE INDEX "IDX_client_users_email" ON "client_users" ("email")`);
    await queryRunner.query(`CREATE INDEX "IDX_client_users_referral_code" ON "client_users" ("referral_code")`);

    // Self-referencing FK for referrals
    await queryRunner.query(`
      ALTER TABLE "client_users"
      ADD CONSTRAINT "FK_client_users_referred_by"
      FOREIGN KEY ("referred_by_id") REFERENCES "client_users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Create client_orders table
    await queryRunner.query(`
      CREATE TABLE "client_orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "client_user_id" uuid NOT NULL,
        "machine_id" uuid NOT NULL,
        "location_id" uuid,
        "status" "client_order_status_enum" NOT NULL DEFAULT 'created',
        "items" jsonb NOT NULL DEFAULT '[]',
        "total_amount" decimal(12,2) NOT NULL,
        "discount_amount" decimal(12,2) NOT NULL DEFAULT 0,
        "final_amount" decimal(12,2) NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'UZS',
        "points_earned" integer NOT NULL DEFAULT 0,
        "points_redeemed" integer NOT NULL DEFAULT 0,
        "payment_provider" "payment_provider_enum" NOT NULL,
        "payment_tx_id" character varying(255),
        "promo_code" character varying(50),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "paid_at" TIMESTAMP WITH TIME ZONE,
        "completed_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_client_orders" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_client_orders_client_user_id" ON "client_orders" ("client_user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_client_orders_machine_id" ON "client_orders" ("machine_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_client_orders_status" ON "client_orders" ("status")`);
    await queryRunner.query(`CREATE INDEX "IDX_client_orders_created_at" ON "client_orders" ("created_at")`);

    await queryRunner.query(`
      ALTER TABLE "client_orders"
      ADD CONSTRAINT "FK_client_orders_client_user"
      FOREIGN KEY ("client_user_id") REFERENCES "client_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "client_orders"
      ADD CONSTRAINT "FK_client_orders_machine"
      FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "client_orders"
      ADD CONSTRAINT "FK_client_orders_location"
      FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Create client_payments table
    await queryRunner.query(`
      CREATE TABLE "client_payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "client_user_id" uuid NOT NULL,
        "provider" "payment_provider_enum" NOT NULL,
        "provider_tx_id" character varying(255),
        "amount" decimal(12,2) NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'UZS',
        "status" "client_payment_status_enum" NOT NULL DEFAULT 'pending',
        "raw_payload" jsonb,
        "error_message" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "processed_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_client_payments" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_client_payments_client_user_id" ON "client_payments" ("client_user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_client_payments_provider" ON "client_payments" ("provider")`);
    await queryRunner.query(`CREATE INDEX "IDX_client_payments_provider_tx_id" ON "client_payments" ("provider_tx_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_client_payments_status" ON "client_payments" ("status")`);

    await queryRunner.query(`
      ALTER TABLE "client_payments"
      ADD CONSTRAINT "FK_client_payments_client_user"
      FOREIGN KEY ("client_user_id") REFERENCES "client_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Create client_loyalty_accounts table
    await queryRunner.query(`
      CREATE TABLE "client_loyalty_accounts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "client_user_id" uuid NOT NULL,
        "points_balance" integer NOT NULL DEFAULT 0,
        "lifetime_points" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_client_loyalty_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_client_loyalty_accounts_client_user_id" UNIQUE ("client_user_id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_client_loyalty_accounts_client_user_id" ON "client_loyalty_accounts" ("client_user_id")`);

    await queryRunner.query(`
      ALTER TABLE "client_loyalty_accounts"
      ADD CONSTRAINT "FK_client_loyalty_accounts_client_user"
      FOREIGN KEY ("client_user_id") REFERENCES "client_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Create client_loyalty_ledger table
    await queryRunner.query(`
      CREATE TABLE "client_loyalty_ledger" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "client_user_id" uuid NOT NULL,
        "delta" integer NOT NULL,
        "reason" "loyalty_transaction_reason_enum" NOT NULL,
        "description" text,
        "order_id" uuid,
        "balance_after" integer NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_client_loyalty_ledger" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_client_loyalty_ledger_client_user_id" ON "client_loyalty_ledger" ("client_user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_client_loyalty_ledger_order_id" ON "client_loyalty_ledger" ("order_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_client_loyalty_ledger_created_at" ON "client_loyalty_ledger" ("created_at")`);

    await queryRunner.query(`
      ALTER TABLE "client_loyalty_ledger"
      ADD CONSTRAINT "FK_client_loyalty_ledger_client_user"
      FOREIGN KEY ("client_user_id") REFERENCES "client_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "client_loyalty_ledger"
      ADD CONSTRAINT "FK_client_loyalty_ledger_order"
      FOREIGN KEY ("order_id") REFERENCES "client_orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Create client_wallets table (Phase 2 - tables now, endpoints later)
    await queryRunner.query(`
      CREATE TABLE "client_wallets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "client_user_id" uuid NOT NULL,
        "balance" decimal(12,2) NOT NULL DEFAULT 0,
        "currency" character varying(3) NOT NULL DEFAULT 'UZS',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_client_wallets" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_client_wallets_client_user_id" UNIQUE ("client_user_id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_client_wallets_client_user_id" ON "client_wallets" ("client_user_id")`);

    await queryRunner.query(`
      ALTER TABLE "client_wallets"
      ADD CONSTRAINT "FK_client_wallets_client_user"
      FOREIGN KEY ("client_user_id") REFERENCES "client_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // Create client_wallet_ledger table (Phase 2)
    await queryRunner.query(`
      CREATE TABLE "client_wallet_ledger" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "client_user_id" uuid NOT NULL,
        "transaction_type" "wallet_transaction_type_enum" NOT NULL,
        "amount" decimal(12,2) NOT NULL,
        "currency" character varying(3) NOT NULL DEFAULT 'UZS',
        "description" text,
        "order_id" uuid,
        "payment_id" uuid,
        "balance_after" decimal(12,2) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_client_wallet_ledger" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_client_wallet_ledger_client_user_id" ON "client_wallet_ledger" ("client_user_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_client_wallet_ledger_order_id" ON "client_wallet_ledger" ("order_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_client_wallet_ledger_payment_id" ON "client_wallet_ledger" ("payment_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_client_wallet_ledger_created_at" ON "client_wallet_ledger" ("created_at")`);

    await queryRunner.query(`
      ALTER TABLE "client_wallet_ledger"
      ADD CONSTRAINT "FK_client_wallet_ledger_client_user"
      FOREIGN KEY ("client_user_id") REFERENCES "client_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "client_wallet_ledger"
      ADD CONSTRAINT "FK_client_wallet_ledger_order"
      FOREIGN KEY ("order_id") REFERENCES "client_orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "client_wallet_ledger"
      ADD CONSTRAINT "FK_client_wallet_ledger_payment"
      FOREIGN KEY ("payment_id") REFERENCES "client_payments"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop client_wallet_ledger
    await queryRunner.query(`ALTER TABLE "client_wallet_ledger" DROP CONSTRAINT IF EXISTS "FK_client_wallet_ledger_payment"`);
    await queryRunner.query(`ALTER TABLE "client_wallet_ledger" DROP CONSTRAINT IF EXISTS "FK_client_wallet_ledger_order"`);
    await queryRunner.query(`ALTER TABLE "client_wallet_ledger" DROP CONSTRAINT IF EXISTS "FK_client_wallet_ledger_client_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_client_wallet_ledger_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_client_wallet_ledger_payment_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_client_wallet_ledger_order_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_client_wallet_ledger_client_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "client_wallet_ledger"`);

    // Drop client_wallets
    await queryRunner.query(`ALTER TABLE "client_wallets" DROP CONSTRAINT IF EXISTS "FK_client_wallets_client_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_client_wallets_client_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "client_wallets"`);

    // Drop client_loyalty_ledger
    await queryRunner.query(`ALTER TABLE "client_loyalty_ledger" DROP CONSTRAINT IF EXISTS "FK_client_loyalty_ledger_order"`);
    await queryRunner.query(`ALTER TABLE "client_loyalty_ledger" DROP CONSTRAINT IF EXISTS "FK_client_loyalty_ledger_client_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_client_loyalty_ledger_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_client_loyalty_ledger_order_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_client_loyalty_ledger_client_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "client_loyalty_ledger"`);

    // Drop client_loyalty_accounts
    await queryRunner.query(`ALTER TABLE "client_loyalty_accounts" DROP CONSTRAINT IF EXISTS "FK_client_loyalty_accounts_client_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_client_loyalty_accounts_client_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "client_loyalty_accounts"`);

    // Drop client_payments
    await queryRunner.query(`ALTER TABLE "client_payments" DROP CONSTRAINT IF EXISTS "FK_client_payments_client_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_client_payments_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_client_payments_provider_tx_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_client_payments_provider"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_client_payments_client_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "client_payments"`);

    // Drop client_orders
    await queryRunner.query(`ALTER TABLE "client_orders" DROP CONSTRAINT IF EXISTS "FK_client_orders_location"`);
    await queryRunner.query(`ALTER TABLE "client_orders" DROP CONSTRAINT IF EXISTS "FK_client_orders_machine"`);
    await queryRunner.query(`ALTER TABLE "client_orders" DROP CONSTRAINT IF EXISTS "FK_client_orders_client_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_client_orders_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_client_orders_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_client_orders_machine_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_client_orders_client_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "client_orders"`);

    // Drop client_users
    await queryRunner.query(`ALTER TABLE "client_users" DROP CONSTRAINT IF EXISTS "FK_client_users_referred_by"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_client_users_referral_code"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_client_users_email"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_client_users_phone"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_client_users_telegram_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "client_users"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE IF EXISTS "wallet_transaction_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "loyalty_transaction_reason_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "client_payment_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_provider_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "client_order_status_enum"`);
  }
}
