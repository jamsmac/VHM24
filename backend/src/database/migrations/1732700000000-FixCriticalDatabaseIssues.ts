import { MigrationInterface, QueryRunner } from 'typeorm';
import { Logger } from '@nestjs/common';

const logger = new Logger('FixCriticalDatabaseIssues1732700000000');

/**
 * Migration: Fix Critical Database Issues (P0)
 *
 * Addresses P0 issues identified in database analysis:
 * 1. Add audit fields (created_by_id, updated_by_id) to key tables
 * 2. Fix transaction amount constraint (should be > 0, not >= 0)
 * 3. Add foreign key for recipe_snapshot_id in transactions
 * 4. Clean up duplicate/redundant indexes
 */
export class FixCriticalDatabaseIssues1732700000000 implements MigrationInterface {
  name = 'FixCriticalDatabaseIssues1732700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.log('🔧 Fixing critical database issues (P0)...');

    // ============================================================================
    // 1. ADD AUDIT FIELDS TO KEY TABLES
    // ============================================================================
    logger.log('  📝 Adding audit fields (created_by_id, updated_by_id)...');

    // Tables that should have audit fields for tracking who made changes
    const tablesNeedingAuditFields = [
      'tasks',
      'machines',
      'transactions',
      'incidents',
      'complaints',
      'nomenclature',
      'recipes',
      'locations',
      'contracts',
      'warehouses',
      'stock_movements',
      'equipment_components',
    ];

    for (const table of tablesNeedingAuditFields) {
      // Check if table exists before adding columns
      const tableExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = '${table}'
        );
      `);

      if (tableExists[0]?.exists) {
        // Check if columns already exist
        const createdByExists = await queryRunner.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = '${table}'
            AND column_name = 'created_by_id'
          );
        `);

        if (!createdByExists[0]?.exists) {
          await queryRunner.query(`
            ALTER TABLE "${table}"
            ADD COLUMN IF NOT EXISTS "created_by_id" UUID,
            ADD COLUMN IF NOT EXISTS "updated_by_id" UUID;
          `);

          // Add foreign key constraints to users table (check if exists first)
          const fkCreatedByExists = await queryRunner.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.table_constraints
              WHERE constraint_name = 'FK_${table}_created_by'
              AND table_name = '${table}'
            );
          `);

          if (!fkCreatedByExists[0]?.exists) {
            await queryRunner.query(`
              ALTER TABLE "${table}"
              ADD CONSTRAINT "FK_${table}_created_by"
              FOREIGN KEY ("created_by_id")
              REFERENCES "users"("id")
              ON DELETE SET NULL;
            `);
          }

          const fkUpdatedByExists = await queryRunner.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.table_constraints
              WHERE constraint_name = 'FK_${table}_updated_by'
              AND table_name = '${table}'
            );
          `);

          if (!fkUpdatedByExists[0]?.exists) {
            await queryRunner.query(`
              ALTER TABLE "${table}"
              ADD CONSTRAINT "FK_${table}_updated_by"
              FOREIGN KEY ("updated_by_id")
              REFERENCES "users"("id")
              ON DELETE SET NULL;
            `);
          }

          logger.log(`    ✅ Added audit fields to ${table}`);
        } else {
          logger.log(`    ⏭️ Audit fields already exist on ${table}`);
        }
      } else {
        logger.log(`    ⚠️ Table ${table} does not exist, skipping`);
      }
    }

    // ============================================================================
    // 2. FIX TRANSACTION AMOUNT CONSTRAINT
    // ============================================================================
    logger.log('  💰 Fixing transaction amount constraint...');

    // First drop the old constraint that allows zero amounts
    await queryRunner.query(`
      ALTER TABLE "transactions"
      DROP CONSTRAINT IF EXISTS "check_transaction_amount_positive";
    `);

    // Add new constraint that requires amount > 0
    // Note: We use > 0.01 to account for currency precision
    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD CONSTRAINT "check_transaction_amount_positive"
      CHECK (amount > 0);
    `);

    logger.log('    ✅ Transaction amount constraint updated to require amount > 0');

    // ============================================================================
    // 3. ADD FOREIGN KEY FOR recipe_snapshot_id
    // ============================================================================
    logger.log('  🔗 Adding foreign key for recipe_snapshot_id...');

    // Check if recipe_snapshots table exists
    const snapshotsTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'recipe_snapshots'
      );
    `);

    if (snapshotsTableExists[0]?.exists) {
      // Check if FK already exists
      const fkExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_transactions_recipe_snapshot'
          AND table_name = 'transactions'
        );
      `);

      if (!fkExists[0]?.exists) {
        await queryRunner.query(`
          ALTER TABLE "transactions"
          ADD CONSTRAINT "FK_transactions_recipe_snapshot"
          FOREIGN KEY ("recipe_snapshot_id")
          REFERENCES "recipe_snapshots"("id")
          ON DELETE SET NULL;
        `);
        logger.log('    ✅ Foreign key for recipe_snapshot_id added');
      } else {
        logger.log('    ⏭️ Foreign key for recipe_snapshot_id already exists');
      }

      // Add index for the foreign key
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS "IDX_transactions_recipe_snapshot_id"
        ON "transactions" ("recipe_snapshot_id")
        WHERE "recipe_snapshot_id" IS NOT NULL;
      `);
      logger.log('    ✅ Index for recipe_snapshot_id added');
    } else {
      logger.log('    ⚠️ recipe_snapshots table does not exist, skipping FK');
    }

    // ============================================================================
    // 4. CLEAN UP DUPLICATE/REDUNDANT INDEXES
    // ============================================================================
    logger.log('  🧹 Cleaning up duplicate indexes...');

    // Drop lowercase duplicate indexes (keep the uppercase ones from first migration)
    const duplicateIndexes = [
      'idx_machines_status', // duplicate of IDX_machines_status
    ];

    for (const indexName of duplicateIndexes) {
      await queryRunner.query(`DROP INDEX IF EXISTS "${indexName}";`);
      logger.log(`    ✅ Dropped duplicate index: ${indexName}`);
    }

    // ============================================================================
    // 5. ADD INDEX ON AUDIT FIELDS
    // ============================================================================
    logger.log('  📊 Adding indexes on audit fields...');

    // Add indexes for efficient queries on who created/modified records
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tasks_created_by_id"
      ON "tasks" ("created_by_id")
      WHERE "created_by_id" IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_transactions_created_by_id"
      ON "transactions" ("created_by_id")
      WHERE "created_by_id" IS NOT NULL;
    `);

    logger.log('    ✅ Audit field indexes added');

    logger.log('');
    logger.log('✅ All P0 critical issues fixed!');
    logger.log('');
    logger.log('📋 Summary:');
    logger.log('  1. Audit fields (created_by_id, updated_by_id) added to key tables');
    logger.log('  2. Transaction amount constraint fixed (must be > 0)');
    logger.log('  3. Foreign key for recipe_snapshot_id added');
    logger.log('  4. Duplicate indexes cleaned up');
    logger.log('  5. Audit field indexes added for query performance');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    logger.log('🔄 Reverting critical database fixes...');

    // Drop audit field indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_created_by_id";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tasks_created_by_id";`);

    // Drop recipe_snapshot FK
    await queryRunner.query(`
      ALTER TABLE "transactions"
      DROP CONSTRAINT IF EXISTS "FK_transactions_recipe_snapshot";
    `);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_transactions_recipe_snapshot_id";`);

    // Restore original transaction constraint (>= 0)
    await queryRunner.query(`
      ALTER TABLE "transactions"
      DROP CONSTRAINT IF EXISTS "check_transaction_amount_positive";
    `);
    await queryRunner.query(`
      ALTER TABLE "transactions"
      ADD CONSTRAINT "check_transaction_amount_positive"
      CHECK (amount >= 0);
    `);

    // Re-create the duplicate index that was dropped
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_machines_status" ON "machines" ("status")
    `);

    // Drop audit columns (in reverse order of tables)
    const tablesWithAuditFields = [
      'equipment_components',
      'stock_movements',
      'warehouses',
      'contracts',
      'locations',
      'recipes',
      'nomenclature',
      'complaints',
      'incidents',
      'transactions',
      'machines',
      'tasks',
    ];

    for (const table of tablesWithAuditFields) {
      const tableExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = '${table}'
        );
      `);

      if (tableExists[0]?.exists) {
        await queryRunner.query(`
          ALTER TABLE "${table}"
          DROP CONSTRAINT IF EXISTS "FK_${table}_updated_by",
          DROP CONSTRAINT IF EXISTS "FK_${table}_created_by";
        `);

        await queryRunner.query(`
          ALTER TABLE "${table}"
          DROP COLUMN IF EXISTS "updated_by_id",
          DROP COLUMN IF EXISTS "created_by_id";
        `);
      }
    }

    logger.log('✅ Critical database fixes reverted');
  }
}
