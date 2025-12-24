import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Force Add Organization Columns
 *
 * This migration directly adds columns using IF NOT EXISTS to ensure they're created.
 * No complex checks - just direct SQL with error handling.
 */
export class ForceAddOrganizationColumns1735600000000 implements MigrationInterface {
  name = 'ForceAddOrganizationColumns1735600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('=== ForceAddOrganizationColumns Starting ===');

    // Create organizations table if not exists
    console.log('Creating organizations table...');
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organizations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "created_by_id" uuid,
        "updated_by_id" uuid,
        "name" varchar(255) NOT NULL,
        "slug" varchar(100) NOT NULL,
        "type" varchar(50) NOT NULL DEFAULT 'franchise',
        "parent_id" uuid,
        "settings" jsonb NOT NULL DEFAULT '{}',
        "is_active" boolean NOT NULL DEFAULT true,
        "phone" varchar(50),
        "email" varchar(255),
        "address" text,
        "logo_url" varchar(500),
        "tax_id" varchar(50),
        "contract_start_date" date,
        "contract_end_date" date,
        "commission_rate" decimal(5,2),
        CONSTRAINT "PK_organizations" PRIMARY KEY ("id")
      )
    `);

    // Add columns using DO $$ blocks with proper exception handling
    console.log('Adding organization_id columns...');

    // Machines
    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TABLE "machines" ADD COLUMN "organization_id" uuid;
        RAISE NOTICE 'Added organization_id to machines';
      EXCEPTION
        WHEN duplicate_column THEN
          RAISE NOTICE 'machines.organization_id already exists';
      END $$;
    `);

    // Users
    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TABLE "users" ADD COLUMN "organization_id" uuid;
        RAISE NOTICE 'Added organization_id to users';
      EXCEPTION
        WHEN duplicate_column THEN
          RAISE NOTICE 'users.organization_id already exists';
      END $$;
    `);

    // Transactions
    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TABLE "transactions" ADD COLUMN "organization_id" uuid;
        RAISE NOTICE 'Added organization_id to transactions';
      EXCEPTION
        WHEN duplicate_column THEN
          RAISE NOTICE 'transactions.organization_id already exists';
      END $$;
    `);

    // Create indexes
    console.log('Creating indexes...');
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_machines_organization_id" ON "machines"("organization_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_users_organization_id" ON "users"("organization_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_transactions_organization_id" ON "transactions"("organization_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_organizations_slug" ON "organizations"("slug")`);

    // Add foreign keys with exception handling
    console.log('Adding foreign keys...');
    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TABLE "machines" ADD CONSTRAINT "FK_machines_organization"
          FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TABLE "users" ADD CONSTRAINT "FK_users_organization"
          FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_organization"
          FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // Insert default organization
    console.log('Creating default organization...');
    await queryRunner.query(`
      INSERT INTO "organizations" ("name", "slug", "type", "is_active", "settings")
      SELECT 'VendHub Headquarters', 'vendhub-hq', 'headquarters', true, '{"timezone": "Asia/Tashkent", "currency": "UZS", "language": "ru"}'
      WHERE NOT EXISTS (SELECT 1 FROM "organizations" WHERE slug = 'vendhub-hq')
    `);

    // Link entities to default organization
    console.log('Linking entities to HQ...');
    await queryRunner.query(`
      UPDATE "machines" SET "organization_id" = (SELECT id FROM "organizations" WHERE slug = 'vendhub-hq' LIMIT 1)
      WHERE "organization_id" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "users" SET "organization_id" = (SELECT id FROM "organizations" WHERE slug = 'vendhub-hq' LIMIT 1)
      WHERE "organization_id" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "transactions" SET "organization_id" = (SELECT id FROM "organizations" WHERE slug = 'vendhub-hq' LIMIT 1)
      WHERE "organization_id" IS NULL
    `);

    console.log('=== ForceAddOrganizationColumns COMPLETED ===');
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    console.log('ForceAddOrganizationColumns down - skipping');
  }
}
