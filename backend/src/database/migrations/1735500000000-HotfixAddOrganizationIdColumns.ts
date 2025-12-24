import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hotfix Migration: Add organization_id columns if they don't exist
 *
 * This migration handles cases where the original AddOrganizationsTable
 * migration may have partially failed or not run correctly.
 */
export class HotfixAddOrganizationIdColumns1735500000000 implements MigrationInterface {
  name = 'HotfixAddOrganizationIdColumns1735500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if organizations table exists, create if not
    const organizationsExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'organizations'
      )
    `);

    if (!organizationsExists[0].exists) {
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

      // Add unique constraint if it doesn't exist
      await queryRunner.query(`
        DO $$ BEGIN
          ALTER TABLE "organizations" ADD CONSTRAINT "UQ_organizations_slug" UNIQUE ("slug");
        EXCEPTION
          WHEN duplicate_table THEN NULL;
          WHEN duplicate_object THEN NULL;
        END $$
      `);

      // Add self-reference foreign key
      await queryRunner.query(`
        DO $$ BEGIN
          ALTER TABLE "organizations" ADD CONSTRAINT "FK_organizations_parent"
          FOREIGN KEY ("parent_id") REFERENCES "organizations"("id") ON DELETE SET NULL;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$
      `);

      // Create indexes
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_organizations_slug" ON "organizations"("slug")`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_organizations_parent_id" ON "organizations"("parent_id")`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_organizations_type" ON "organizations"("type")`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_organizations_is_active" ON "organizations"("is_active")`);

      // Create default headquarters
      await queryRunner.query(`
        INSERT INTO "organizations" ("name", "slug", "type", "is_active", "settings")
        SELECT 'VendHub Headquarters', 'vendhub-hq', 'headquarters', true, '{"timezone": "Asia/Tashkent", "currency": "UZS", "language": "ru"}'
        WHERE NOT EXISTS (SELECT 1 FROM "organizations" WHERE slug = 'vendhub-hq')
      `);
    }

    // Add organization_id to machines if not exists
    const machineOrgExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'machines'
        AND column_name = 'organization_id'
      )
    `);

    if (!machineOrgExists[0].exists) {
      console.log('Adding organization_id to machines table...');
      await queryRunner.query(`ALTER TABLE "machines" ADD COLUMN "organization_id" uuid`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_machines_organization_id" ON "machines"("organization_id")`);
      await queryRunner.query(`
        DO $$ BEGIN
          ALTER TABLE "machines" ADD CONSTRAINT "FK_machines_organization"
          FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$
      `);

      // Link existing machines to headquarters
      await queryRunner.query(`
        UPDATE "machines"
        SET "organization_id" = (SELECT id FROM organizations WHERE slug = 'vendhub-hq' LIMIT 1)
        WHERE "organization_id" IS NULL
      `);
    } else {
      console.log('machines.organization_id already exists, skipping...');
    }

    // Add organization_id to users if not exists
    const userOrgExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'users'
        AND column_name = 'organization_id'
      )
    `);

    if (!userOrgExists[0].exists) {
      console.log('Adding organization_id to users table...');
      await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "organization_id" uuid`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_users_organization_id" ON "users"("organization_id")`);
      await queryRunner.query(`
        DO $$ BEGIN
          ALTER TABLE "users" ADD CONSTRAINT "FK_users_organization"
          FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$
      `);

      // Link existing users to headquarters
      await queryRunner.query(`
        UPDATE "users"
        SET "organization_id" = (SELECT id FROM organizations WHERE slug = 'vendhub-hq' LIMIT 1)
        WHERE "organization_id" IS NULL
      `);
    } else {
      console.log('users.organization_id already exists, skipping...');
    }

    // Add organization_id to transactions if not exists
    const transactionOrgExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'transactions'
        AND column_name = 'organization_id'
      )
    `);

    if (!transactionOrgExists[0].exists) {
      console.log('Adding organization_id to transactions table...');
      await queryRunner.query(`ALTER TABLE "transactions" ADD COLUMN "organization_id" uuid`);
      await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_transactions_organization_id" ON "transactions"("organization_id")`);
      await queryRunner.query(`
        DO $$ BEGIN
          ALTER TABLE "transactions" ADD CONSTRAINT "FK_transactions_organization"
          FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$
      `);

      // Link existing transactions to headquarters
      await queryRunner.query(`
        UPDATE "transactions"
        SET "organization_id" = (SELECT id FROM organizations WHERE slug = 'vendhub-hq' LIMIT 1)
        WHERE "organization_id" IS NULL
      `);
    } else {
      console.log('transactions.organization_id already exists, skipping...');
    }

    console.log('Hotfix migration completed successfully!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // This is a hotfix, down migration is not implemented
    // Use the original AddOrganizationsTable migration's down() if needed
    console.log('Hotfix down migration - no action taken');
  }
}
