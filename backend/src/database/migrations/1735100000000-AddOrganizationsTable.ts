import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sprint 4: Multi-tenant Franchise System
 *
 * This migration:
 * 1. Creates the organizations table for multi-tenant support
 * 2. Adds organization_id to machines, users, and transactions tables
 * 3. Creates indexes for performance
 * 4. Creates a default "headquarters" organization
 */
export class AddOrganizationsTable1735100000000 implements MigrationInterface {
  name = 'AddOrganizationsTable1735100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create organizations table
    await queryRunner.query(`
      CREATE TABLE "organizations" (
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
        CONSTRAINT "PK_organizations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_organizations_slug" UNIQUE ("slug"),
        CONSTRAINT "FK_organizations_parent" FOREIGN KEY ("parent_id")
          REFERENCES "organizations"("id") ON DELETE SET NULL
      )
    `);

    // 2. Create indexes on organizations
    await queryRunner.query(`
      CREATE INDEX "IDX_organizations_slug" ON "organizations"("slug")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_organizations_parent_id" ON "organizations"("parent_id")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_organizations_type" ON "organizations"("type")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_organizations_is_active" ON "organizations"("is_active")
    `);

    // 3. Add organization_id to machines table
    await queryRunner.query(`
      ALTER TABLE "machines"
      ADD COLUMN "organization_id" uuid
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_machines_organization_id" ON "machines"("organization_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "machines"
      ADD CONSTRAINT "FK_machines_organization"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL
    `);

    // 4. Add organization_id to users table
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "organization_id" uuid
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_users_organization_id" ON "users"("organization_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "FK_users_organization"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL
    `);

    // 5. Add organization_id to transactions table
    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD COLUMN "organization_id" uuid
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_transactions_organization_id" ON "transactions"("organization_id")
    `);
    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD CONSTRAINT "FK_transactions_organization"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL
    `);

    // 6. Create default headquarters organization
    await queryRunner.query(`
      INSERT INTO "organizations" (
        "name",
        "slug",
        "type",
        "is_active",
        "settings"
      ) VALUES (
        'VendHub Headquarters',
        'vendhub-hq',
        'headquarters',
        true,
        '{"timezone": "Asia/Tashkent", "currency": "UZS", "language": "ru"}'
      )
    `);

    // 7. Link existing machines, users, and transactions to headquarters
    await queryRunner.query(`
      UPDATE "machines"
      SET "organization_id" = (SELECT id FROM organizations WHERE slug = 'vendhub-hq')
      WHERE "organization_id" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "users"
      SET "organization_id" = (SELECT id FROM organizations WHERE slug = 'vendhub-hq')
      WHERE "organization_id" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "transactions"
      SET "organization_id" = (SELECT id FROM organizations WHERE slug = 'vendhub-hq')
      WHERE "organization_id" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove foreign keys
    await queryRunner.query(`
      ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "FK_transactions_organization"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_organization"
    `);
    await queryRunner.query(`
      ALTER TABLE "machines" DROP CONSTRAINT IF EXISTS "FK_machines_organization"
    `);

    // Remove indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_organization_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_organization_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_machines_organization_id"`);

    // Remove organization_id columns
    await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN IF EXISTS "organization_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "organization_id"`);
    await queryRunner.query(`ALTER TABLE "machines" DROP COLUMN IF EXISTS "organization_id"`);

    // Remove organizations indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_organizations_is_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_organizations_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_organizations_parent_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_organizations_slug"`);

    // Drop organizations table
    await queryRunner.query(`DROP TABLE IF EXISTS "organizations"`);
  }
}
