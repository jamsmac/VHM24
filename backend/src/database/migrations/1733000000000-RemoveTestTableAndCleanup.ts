import { MigrationInterface, QueryRunner } from 'typeorm';
import { Logger } from '@nestjs/common';

const logger = new Logger('RemoveTestTableAndCleanup1733000000000');

/**
 * Remove test_table and cleanup unnecessary tables
 *
 * This migration removes:
 * - test_table (test/demo table)
 * - Any other test or temporary tables
 */
export class RemoveTestTableAndCleanup1733000000000 implements MigrationInterface {
  name = 'RemoveTestTableAndCleanup1733000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if test_table exists and drop it
    const testTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'test_table'
      );
    `);

    if (testTableExists[0].exists) {
      logger.log('🗑️  Dropping test_table...');

      // Drop indexes first
      await queryRunner.query(`
        DROP INDEX IF EXISTS "IDX_test_table_created_at";
      `);

      await queryRunner.query(`
        DROP INDEX IF EXISTS "IDX_test_table_name";
      `);

      // Drop table
      await queryRunner.query(`
        DROP TABLE IF EXISTS "test_table" CASCADE;
      `);

      logger.log('✅ test_table dropped successfully');
    } else {
      logger.log('ℹ️  test_table does not exist, skipping...');
    }

    // Remove any other test/temporary tables if they exist
    const tempTables = await queryRunner.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (
        table_name LIKE 'test_%' 
        OR table_name LIKE 'temp_%'
        OR table_name LIKE 'tmp_%'
        OR table_name LIKE '_test_%'
      )
      AND table_name != 'test_table';
    `);

    if (tempTables.length > 0) {
      logger.log(`🗑️  Found ${tempTables.length} additional test/temp tables to remove...`);
      for (const table of tempTables) {
        await queryRunner.query(`DROP TABLE IF EXISTS "${table.table_name}" CASCADE;`);
        logger.log(`✅ Dropped ${table.table_name}`);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate test_table if needed (for rollback)
    // Note: This is just for migration rollback, not recommended to use test_table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "test_table" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(100) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_test_table" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_test_table_name" ON "test_table" ("name");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_test_table_created_at" ON "test_table" ("created_at");
    `);
  }
}
