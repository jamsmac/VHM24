import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Pre-Security Add Organizations
 *
 * This migration runs BEFORE CreateSecurityTables1731650000001 to ensure
 * organization_id columns exist before any potential migration failures.
 *
 * Timestamp 1731640000000 is intentionally BEFORE 1731650000001.
 */
export class PreSecurityAddOrganizations1731640000000 implements MigrationInterface {
  name = 'PreSecurityAddOrganizations1731640000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('=== PreSecurityAddOrganizations Starting ===');

    // Step 1: Create organizations table if not exists
    console.log('Step 1: Creating organizations table...');
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

    // Step 2: Add unique constraint on slug
    console.log('Step 2: Adding unique constraint on slug...');
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "organizations" ADD CONSTRAINT "UQ_organizations_slug" UNIQUE ("slug");
      EXCEPTION
        WHEN duplicate_table THEN NULL;
        WHEN duplicate_object THEN NULL;
      END $$
    `);

    // Step 3: Add self-referencing foreign key for parent
    console.log('Step 3: Adding parent FK...');
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "organizations" ADD CONSTRAINT "FK_organizations_parent"
        FOREIGN KEY ("parent_id") REFERENCES "organizations"("id") ON DELETE SET NULL;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$
    `);

    // Step 4: Create indexes
    console.log('Step 4: Creating indexes...');
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_organizations_slug" ON "organizations"("slug")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_organizations_parent_id" ON "organizations"("parent_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_organizations_type" ON "organizations"("type")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_organizations_is_active" ON "organizations"("is_active")`);

    // Step 5: Create default headquarters
    console.log('Step 5: Creating default headquarters...');
    await queryRunner.query(`
      INSERT INTO "organizations" ("name", "slug", "type", "is_active", "settings")
      SELECT 'VendHub Headquarters', 'vendhub-hq', 'headquarters', true, '{"timezone": "Asia/Tashkent", "currency": "UZS", "language": "ru"}'
      WHERE NOT EXISTS (SELECT 1 FROM "organizations" WHERE slug = 'vendhub-hq')
    `);

    // Step 6: Add organization_id to machines
    console.log('Step 6: Adding organization_id to machines...');
    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TABLE "machines" ADD COLUMN "organization_id" uuid;
        RAISE NOTICE 'Added organization_id to machines';
      EXCEPTION
        WHEN duplicate_column THEN
          RAISE NOTICE 'machines.organization_id already exists';
      END $$
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_machines_organization_id" ON "machines"("organization_id")`);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "machines" ADD CONSTRAINT "FK_machines_organization"
        FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$
    `);

    // Step 7: Add organization_id to users
    console.log('Step 7: Adding organization_id to users...');
    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TABLE "users" ADD COLUMN "organization_id" uuid;
        RAISE NOTICE 'Added organization_id to users';
      EXCEPTION
        WHEN duplicate_column THEN
          RAISE NOTICE 'users.organization_id already exists';
      END $$
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_users_organization_id" ON "users"("organization_id")`);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "users" ADD CONSTRAINT "FK_users_organization"
        FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$
    `);

    // Step 8: Add organization_id to transactions
    console.log('Step 8: Adding organization_id to transactions...');
    await queryRunner.query(`
      DO $$
      BEGIN
        ALTER TABLE "transactions" ADD COLUMN "organization_id" uuid;
        RAISE NOTICE 'Added organization_id to transactions';
      EXCEPTION
        WHEN duplicate_column THEN
          RAISE NOTICE 'transactions.organization_id already exists';
      END $$
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_transactions_organization_id" ON "transactions"("organization_id")`);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_organization"
        FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$
    `);

    // Step 9: Link all entities to headquarters
    console.log('Step 9: Linking entities to headquarters...');
    await queryRunner.query(`
      UPDATE "machines"
      SET "organization_id" = (SELECT id FROM "organizations" WHERE slug = 'vendhub-hq' LIMIT 1)
      WHERE "organization_id" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "users"
      SET "organization_id" = (SELECT id FROM "organizations" WHERE slug = 'vendhub-hq' LIMIT 1)
      WHERE "organization_id" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "transactions"
      SET "organization_id" = (SELECT id FROM "organizations" WHERE slug = 'vendhub-hq' LIMIT 1)
      WHERE "organization_id" IS NULL
    `);

    console.log('=== PreSecurityAddOrganizations COMPLETED ===');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('PreSecurityAddOrganizations down - Rolling back...');

    // Drop foreign keys
    await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "FK_transactions_organization"`);
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_organization"`);
    await queryRunner.query(`ALTER TABLE "machines" DROP CONSTRAINT IF EXISTS "FK_machines_organization"`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_organization_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_organization_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_machines_organization_id"`);

    // Drop columns
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN IF EXISTS "organization_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "organization_id"`);
    await queryRunner.query(`ALTER TABLE "machines" DROP COLUMN IF EXISTS "organization_id"`);

    // Note: We don't drop the organizations table as it may contain data
    console.log('PreSecurityAddOrganizations down completed');
  }
}
