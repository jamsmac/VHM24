import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Final Add Organization Columns
 *
 * This migration has a very late timestamp (1750000000000 = ~2025-12-13)
 * to ensure it runs AFTER all other migrations, guaranteeing the
 * organization_id columns exist.
 *
 * Uses fully idempotent SQL that won't fail even if columns already exist.
 */
export class FinalAddOrganizationColumns1750000000000 implements MigrationInterface {
  name = 'FinalAddOrganizationColumns1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('========================================');
    console.log('=== FinalAddOrganizationColumns START ===');
    console.log('========================================');

    // Step 1: Ensure organizations table exists
    console.log('Step 1: Creating organizations table if not exists...');
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
    console.log('Step 1: Done');

    // Step 2: Add unique constraint if not exists
    console.log('Step 2: Adding unique constraint...');
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'UQ_organizations_slug'
        ) THEN
          ALTER TABLE "organizations" ADD CONSTRAINT "UQ_organizations_slug" UNIQUE ("slug");
        END IF;
      END $$
    `);
    console.log('Step 2: Done');

    // Step 3: Create indexes
    console.log('Step 3: Creating indexes...');
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_organizations_slug" ON "organizations"("slug")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_organizations_type" ON "organizations"("type")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_organizations_is_active" ON "organizations"("is_active")`);
    console.log('Step 3: Done');

    // Step 4: Create default HQ organization
    console.log('Step 4: Creating default HQ organization...');
    await queryRunner.query(`
      INSERT INTO "organizations" ("name", "slug", "type", "is_active", "settings")
      SELECT 'VendHub Headquarters', 'vendhub-hq', 'headquarters', true,
             '{"timezone": "Asia/Tashkent", "currency": "UZS", "language": "ru"}'::jsonb
      WHERE NOT EXISTS (SELECT 1 FROM "organizations" WHERE slug = 'vendhub-hq')
    `);
    console.log('Step 4: Done');

    // Step 5: Add organization_id to machines table
    console.log('Step 5: Adding organization_id to machines...');
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'machines' AND column_name = 'organization_id'
        ) THEN
          ALTER TABLE "machines" ADD COLUMN "organization_id" uuid;
          RAISE NOTICE 'Added organization_id to machines';
        ELSE
          RAISE NOTICE 'machines.organization_id already exists';
        END IF;
      END $$
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_machines_organization_id" ON "machines"("organization_id")`);
    console.log('Step 5: Done');

    // Step 6: Add FK constraint for machines
    console.log('Step 6: Adding FK constraint for machines...');
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_machines_organization'
        ) THEN
          ALTER TABLE "machines" ADD CONSTRAINT "FK_machines_organization"
          FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL;
        END IF;
      END $$
    `);
    console.log('Step 6: Done');

    // Step 7: Add organization_id to users table
    console.log('Step 7: Adding organization_id to users...');
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'organization_id'
        ) THEN
          ALTER TABLE "users" ADD COLUMN "organization_id" uuid;
          RAISE NOTICE 'Added organization_id to users';
        ELSE
          RAISE NOTICE 'users.organization_id already exists';
        END IF;
      END $$
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_users_organization_id" ON "users"("organization_id")`);
    console.log('Step 7: Done');

    // Step 8: Add FK constraint for users
    console.log('Step 8: Adding FK constraint for users...');
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_users_organization'
        ) THEN
          ALTER TABLE "users" ADD CONSTRAINT "FK_users_organization"
          FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL;
        END IF;
      END $$
    `);
    console.log('Step 8: Done');

    // Step 9: Add organization_id to transactions table
    console.log('Step 9: Adding organization_id to transactions...');
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'transactions' AND column_name = 'organization_id'
        ) THEN
          ALTER TABLE "transactions" ADD COLUMN "organization_id" uuid;
          RAISE NOTICE 'Added organization_id to transactions';
        ELSE
          RAISE NOTICE 'transactions.organization_id already exists';
        END IF;
      END $$
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_transactions_organization_id" ON "transactions"("organization_id")`);
    console.log('Step 9: Done');

    // Step 10: Add FK constraint for transactions
    console.log('Step 10: Adding FK constraint for transactions...');
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_transactions_organization'
        ) THEN
          ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_organization"
          FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL;
        END IF;
      END $$
    `);
    console.log('Step 10: Done');

    // Step 11: Link all entities to HQ
    console.log('Step 11: Linking entities to HQ...');
    const hqResult = await queryRunner.query(`SELECT id FROM "organizations" WHERE slug = 'vendhub-hq' LIMIT 1`);
    if (hqResult && hqResult.length > 0) {
      const hqId = hqResult[0].id;
      console.log(`HQ ID: ${hqId}`);

      await queryRunner.query(`UPDATE "machines" SET "organization_id" = $1 WHERE "organization_id" IS NULL`, [hqId]);
      await queryRunner.query(`UPDATE "users" SET "organization_id" = $1 WHERE "organization_id" IS NULL`, [hqId]);
      await queryRunner.query(`UPDATE "transactions" SET "organization_id" = $1 WHERE "organization_id" IS NULL`, [hqId]);
      console.log('Step 11: All entities linked to HQ');
    } else {
      console.log('Step 11: Warning - HQ organization not found, skipping linking');
    }

    console.log('==========================================');
    console.log('=== FinalAddOrganizationColumns COMPLETE ===');
    console.log('==========================================');
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    console.log('FinalAddOrganizationColumns down - skipping (data preservation)');
  }
}
