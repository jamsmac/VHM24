import { MigrationInterface, QueryRunner } from 'typeorm';
import { Logger } from '@nestjs/common';

const logger = new Logger('CleanupDatabaseStructure1733000000001');

/**
 * Cleanup Database Structure
 *
 * This migration:
 * - Removes test_table if exists
 * - Removes any temporary/test tables
 * - Ensures all necessary tables are properly structured
 */
export class CleanupDatabaseStructure1733000000001 implements MigrationInterface {
  name = 'CleanupDatabaseStructure1733000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.log('🧹 Starting database cleanup...');

    // 1. Remove test_table
    const testTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'test_table'
      );
    `);

    if (testTableExists[0].exists) {
      logger.log('🗑️  Removing test_table...');

      // Drop indexes
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_test_table_created_at";`);
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_test_table_name";`);

      // Drop table
      await queryRunner.query(`DROP TABLE IF EXISTS "test_table" CASCADE;`);
      logger.log('✅ test_table removed');
    }

    // 2. Remove any other test/temp tables
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
      logger.log(`🗑️  Removing ${tempTables.length} temporary tables...`);
      for (const table of tempTables) {
        await queryRunner.query(`DROP TABLE IF EXISTS "${table.table_name}" CASCADE;`);
        logger.log(`✅ Removed ${table.table_name}`);
      }
    }

    // 3. Ensure migrations table exists (if not, it will be created by TypeORM)
    const migrationsTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      );
    `);

    if (!migrationsTableExists[0].exists) {
      logger.log('ℹ️  migrations table will be created by TypeORM');
    }

    logger.log('✅ Database cleanup completed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: Recreate test_table if needed
    // Note: This is only for migration rollback purposes
    logger.log('⚠️  Rolling back cleanup (recreating test_table)...');
    
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
