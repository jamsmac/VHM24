import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIntelligentImportTables1731850000000 implements MigrationInterface {
  name = 'CreateIntelligentImportTables1731850000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create import_templates table
    await queryRunner.query(`
      CREATE TABLE "import_templates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "name" character varying(200) NOT NULL,
        "domain" character varying(50) NOT NULL,
        "column_mapping" jsonb NOT NULL,
        "validation_overrides" jsonb,
        "use_count" integer NOT NULL DEFAULT 0,
        "last_used_at" TIMESTAMP WITH TIME ZONE,
        "active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_import_templates" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_import_templates_domain" ON "import_templates" ("domain")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_import_templates_active" ON "import_templates" ("active")
    `);

    // Create schema_definitions table
    await queryRunner.query(`
      CREATE TABLE "schema_definitions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "domain" character varying(50) NOT NULL,
        "table_name" character varying(100) NOT NULL,
        "field_definitions" jsonb NOT NULL,
        "relationships" jsonb,
        "version" character varying(20) NOT NULL DEFAULT 'v1.0',
        "active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_schema_definitions" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_schema_definitions_domain_table" ON "schema_definitions" ("domain", "table_name")
    `);

    // Create validation_rules table
    await queryRunner.query(`
      CREATE TABLE "validation_rules" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "domain" character varying(50) NOT NULL,
        "rule_name" character varying(100) NOT NULL,
        "rule_type" character varying(50) NOT NULL,
        "rule_definition" jsonb NOT NULL,
        "severity" character varying(20) NOT NULL DEFAULT 'error',
        "active" boolean NOT NULL DEFAULT true,
        "priority" integer NOT NULL DEFAULT 1,
        CONSTRAINT "PK_validation_rules" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_validation_rules_domain_active" ON "validation_rules" ("domain", "active")
    `);

    // Create import_sessions table
    await queryRunner.query(`
      CREATE TABLE "import_sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "domain" character varying(50) NOT NULL,
        "status" character varying(50) NOT NULL DEFAULT 'pending',
        "template_id" uuid,
        "file_metadata" jsonb,
        "classification_result" jsonb,
        "validation_report" jsonb,
        "action_plan" jsonb,
        "approval_status" character varying(20) NOT NULL DEFAULT 'pending',
        "approved_by_user_id" uuid,
        "approved_at" TIMESTAMP WITH TIME ZONE,
        "execution_result" jsonb,
        "uploaded_by_user_id" uuid NOT NULL,
        "started_at" TIMESTAMP WITH TIME ZONE,
        "completed_at" TIMESTAMP WITH TIME ZONE,
        "message" text,
        "file_id" uuid,
        CONSTRAINT "PK_import_sessions" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_import_sessions_domain" ON "import_sessions" ("domain")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_import_sessions_status" ON "import_sessions" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_import_sessions_uploaded_by" ON "import_sessions" ("uploaded_by_user_id")
    `);

    // Add foreign keys for import_sessions
    await queryRunner.query(`
      ALTER TABLE "import_sessions"
      ADD CONSTRAINT "FK_import_sessions_template"
      FOREIGN KEY ("template_id") REFERENCES "import_templates"("id")
      ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "import_sessions"
      ADD CONSTRAINT "FK_import_sessions_uploaded_by"
      FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id")
      ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      ALTER TABLE "import_sessions"
      ADD CONSTRAINT "FK_import_sessions_approved_by"
      FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL
    `);

    // Create import_audit_logs table
    await queryRunner.query(`
      CREATE TABLE "import_audit_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "session_id" uuid NOT NULL,
        "action_type" character varying(20) NOT NULL,
        "table_name" character varying(100) NOT NULL,
        "record_id" uuid,
        "before_state" jsonb,
        "after_state" jsonb,
        "executed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "executed_by_user_id" uuid NOT NULL,
        "metadata" jsonb,
        CONSTRAINT "PK_import_audit_logs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_import_audit_logs_session" ON "import_audit_logs" ("session_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_import_audit_logs_table_record" ON "import_audit_logs" ("table_name", "record_id")
    `);

    // Add foreign keys for import_audit_logs
    await queryRunner.query(`
      ALTER TABLE "import_audit_logs"
      ADD CONSTRAINT "FK_import_audit_logs_session"
      FOREIGN KEY ("session_id") REFERENCES "import_sessions"("id")
      ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "import_audit_logs"
      ADD CONSTRAINT "FK_import_audit_logs_executed_by"
      FOREIGN KEY ("executed_by_user_id") REFERENCES "users"("id")
      ON DELETE RESTRICT
    `);

    // Create comments for documentation
    await queryRunner.query(`
      COMMENT ON TABLE "import_templates" IS 'Learned column mappings and configurations for import reuse'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE "schema_definitions" IS 'Registry of table schemas for different domains'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE "validation_rules" IS 'Business logic rules for data validation'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE "import_sessions" IS 'Tracks intelligent import sessions from upload to completion'
    `);

    await queryRunner.query(`
      COMMENT ON TABLE "import_audit_logs" IS 'Tracks all changes made by import system with before/after states'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    await queryRunner.query(`
      ALTER TABLE "import_audit_logs" DROP CONSTRAINT "FK_import_audit_logs_executed_by"
    `);
    await queryRunner.query(`
      ALTER TABLE "import_audit_logs" DROP CONSTRAINT "FK_import_audit_logs_session"
    `);
    await queryRunner.query(`
      ALTER TABLE "import_sessions" DROP CONSTRAINT "FK_import_sessions_approved_by"
    `);
    await queryRunner.query(`
      ALTER TABLE "import_sessions" DROP CONSTRAINT "FK_import_sessions_uploaded_by"
    `);
    await queryRunner.query(`
      ALTER TABLE "import_sessions" DROP CONSTRAINT "FK_import_sessions_template"
    `);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_import_audit_logs_table_record"`);
    await queryRunner.query(`DROP INDEX "IDX_import_audit_logs_session"`);
    await queryRunner.query(`DROP INDEX "IDX_import_sessions_uploaded_by"`);
    await queryRunner.query(`DROP INDEX "IDX_import_sessions_status"`);
    await queryRunner.query(`DROP INDEX "IDX_import_sessions_domain"`);
    await queryRunner.query(`DROP INDEX "IDX_validation_rules_domain_active"`);
    await queryRunner.query(`DROP INDEX "IDX_schema_definitions_domain_table"`);
    await queryRunner.query(`DROP INDEX "IDX_import_templates_active"`);
    await queryRunner.query(`DROP INDEX "IDX_import_templates_domain"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "import_audit_logs"`);
    await queryRunner.query(`DROP TABLE "import_sessions"`);
    await queryRunner.query(`DROP TABLE "validation_rules"`);
    await queryRunner.query(`DROP TABLE "schema_definitions"`);
    await queryRunner.query(`DROP TABLE "import_templates"`);
  }
}
