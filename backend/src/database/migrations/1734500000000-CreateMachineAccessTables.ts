import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMachineAccessTables1734500000000 implements MigrationInterface {
  name = 'CreateMachineAccessTables1734500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum for machine access roles
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "machine_access_role_enum" AS ENUM ('owner', 'admin', 'manager', 'operator', 'technician', 'viewer');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create machine_access table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "machine_access" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "machine_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "role" "machine_access_role_enum" NOT NULL DEFAULT 'viewer',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by_id" uuid,
        CONSTRAINT "PK_machine_access" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_machine_access_machine_user" UNIQUE ("machine_id", "user_id")
      )
    `);

    // Create indexes for machine_access
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_machine_access_machine_id" ON "machine_access" ("machine_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_machine_access_user_id" ON "machine_access" ("user_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_machine_access_role" ON "machine_access" ("role")`);

    // Create foreign keys for machine_access
    await queryRunner.query(`
      ALTER TABLE "machine_access"
      ADD CONSTRAINT "FK_machine_access_machine"
      FOREIGN KEY ("machine_id") REFERENCES "machines"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "machine_access"
      ADD CONSTRAINT "FK_machine_access_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "machine_access"
      ADD CONSTRAINT "FK_machine_access_created_by"
      FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Create access_templates table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "access_templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(200) NOT NULL,
        "description" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by_id" uuid,
        CONSTRAINT "PK_access_templates" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "access_templates"
      ADD CONSTRAINT "FK_access_templates_created_by"
      FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Create access_template_rows table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "access_template_rows" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "template_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "role" "machine_access_role_enum" NOT NULL DEFAULT 'viewer',
        CONSTRAINT "PK_access_template_rows" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_access_template_rows_template_user" UNIQUE ("template_id", "user_id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "access_template_rows"
      ADD CONSTRAINT "FK_access_template_rows_template"
      FOREIGN KEY ("template_id") REFERENCES "access_templates"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "access_template_rows"
      ADD CONSTRAINT "FK_access_template_rows_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop access_template_rows
    await queryRunner.query(`ALTER TABLE "access_template_rows" DROP CONSTRAINT IF EXISTS "FK_access_template_rows_user"`);
    await queryRunner.query(`ALTER TABLE "access_template_rows" DROP CONSTRAINT IF EXISTS "FK_access_template_rows_template"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "access_template_rows"`);

    // Drop access_templates
    await queryRunner.query(`ALTER TABLE "access_templates" DROP CONSTRAINT IF EXISTS "FK_access_templates_created_by"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "access_templates"`);

    // Drop machine_access
    await queryRunner.query(`ALTER TABLE "machine_access" DROP CONSTRAINT IF EXISTS "FK_machine_access_created_by"`);
    await queryRunner.query(`ALTER TABLE "machine_access" DROP CONSTRAINT IF EXISTS "FK_machine_access_user"`);
    await queryRunner.query(`ALTER TABLE "machine_access" DROP CONSTRAINT IF EXISTS "FK_machine_access_machine"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_machine_access_role"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_machine_access_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_machine_access_machine_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "machine_access"`);

    // Drop enum
    await queryRunner.query(`DROP TYPE IF EXISTS "machine_access_role_enum"`);
  }
}
