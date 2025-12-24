import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Emergency Migration: Ensure organization_id columns exist
 *
 * This migration uses raw SQL to add columns without checking
 * existing migration records. It handles the case where previous
 * migrations may have been recorded but not fully executed.
 */
export class EnsureOrganizationColumns1735555555555 implements MigrationInterface {
  name = 'EnsureOrganizationColumns1735555555555';

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('=== EnsureOrganizationColumns Migration Starting ===');

    // Step 1: Create organizations table if it doesn't exist
    console.log('Step 1: Checking organizations table...');
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
    console.log('Organizations table ensured');

    // Step 2: Add constraints and indexes (ignore errors if they exist)
    console.log('Step 2: Adding constraints and indexes...');
    try {
      await queryRunner.query(`ALTER TABLE "organizations" ADD CONSTRAINT "UQ_organizations_slug" UNIQUE ("slug")`);
    } catch (e) {
      console.log('Slug constraint already exists or error:', (e as Error).message);
    }

    try {
      await queryRunner.query(`ALTER TABLE "organizations" ADD CONSTRAINT "FK_organizations_parent" FOREIGN KEY ("parent_id") REFERENCES "organizations"("id") ON DELETE SET NULL`);
    } catch (e) {
      console.log('Parent FK already exists or error:', (e as Error).message);
    }

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_organizations_slug" ON "organizations"("slug")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_organizations_parent_id" ON "organizations"("parent_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_organizations_type" ON "organizations"("type")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_organizations_is_active" ON "organizations"("is_active")`);

    // Step 3: Create default headquarters if it doesn't exist
    console.log('Step 3: Creating default headquarters...');
    await queryRunner.query(`
      INSERT INTO "organizations" ("name", "slug", "type", "is_active", "settings")
      SELECT 'VendHub Headquarters', 'vendhub-hq', 'headquarters', true, '{"timezone": "Asia/Tashkent", "currency": "UZS", "language": "ru"}'
      WHERE NOT EXISTS (SELECT 1 FROM "organizations" WHERE slug = 'vendhub-hq')
    `);

    // Step 4: Add organization_id to machines
    console.log('Step 4: Adding organization_id to machines...');
    try {
      await queryRunner.query(`ALTER TABLE "machines" ADD COLUMN "organization_id" uuid`);
      console.log('Added organization_id to machines');
    } catch (e) {
      console.log('machines.organization_id might already exist:', (e as Error).message);
    }

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_machines_organization_id" ON "machines"("organization_id")`);

    try {
      await queryRunner.query(`ALTER TABLE "machines" ADD CONSTRAINT "FK_machines_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL`);
    } catch (e) {
      console.log('machines FK might already exist:', (e as Error).message);
    }

    // Step 5: Add organization_id to users
    console.log('Step 5: Adding organization_id to users...');
    try {
      await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "organization_id" uuid`);
      console.log('Added organization_id to users');
    } catch (e) {
      console.log('users.organization_id might already exist:', (e as Error).message);
    }

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_users_organization_id" ON "users"("organization_id")`);

    try {
      await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_users_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL`);
    } catch (e) {
      console.log('users FK might already exist:', (e as Error).message);
    }

    // Step 6: Add organization_id to transactions
    console.log('Step 6: Adding organization_id to transactions...');
    try {
      await queryRunner.query(`ALTER TABLE "transactions" ADD COLUMN "organization_id" uuid`);
      console.log('Added organization_id to transactions');
    } catch (e) {
      console.log('transactions.organization_id might already exist:', (e as Error).message);
    }

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_transactions_organization_id" ON "transactions"("organization_id")`);

    try {
      await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL`);
    } catch (e) {
      console.log('transactions FK might already exist:', (e as Error).message);
    }

    // Step 7: Link all entities to headquarters
    console.log('Step 7: Linking entities to headquarters...');
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

    console.log('=== EnsureOrganizationColumns Migration COMPLETED SUCCESSFULLY ===');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('EnsureOrganizationColumns down() - Rolling back...');

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
    console.log('EnsureOrganizationColumns down() completed');
  }
}
