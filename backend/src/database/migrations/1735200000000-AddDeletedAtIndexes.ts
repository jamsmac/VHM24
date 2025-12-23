import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add partial indexes on deleted_at columns for high-traffic tables
 * This optimizes soft delete queries by only indexing active (non-deleted) records
 */
export class AddDeletedAtIndexes1735200000000 implements MigrationInterface {
  name = 'AddDeletedAtIndexes1735200000000';

  // Tables with high query frequency that benefit from deleted_at indexes
  private readonly tables = [
    'machines',
    'tasks',
    'users',
    'transactions',
    'incidents',
    'complaints',
    'nomenclature',
    'locations',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    console.log('Adding partial indexes on deleted_at columns...');

    for (const table of this.tables) {
      // Check if table exists
      const tableExists = await queryRunner.hasTable(table);
      if (!tableExists) {
        console.log(`Table ${table} does not exist, skipping`);
        continue;
      }

      // Check if index already exists
      const indexName = `idx_${table}_not_deleted`;
      const indexExists = await queryRunner.query(`
        SELECT 1 FROM pg_indexes
        WHERE tablename = '${table}' AND indexname = '${indexName}'
      `);

      if (indexExists.length > 0) {
        console.log(`Index ${indexName} already exists, skipping`);
        continue;
      }

      // Create partial index for active (non-deleted) records
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS ${indexName}
        ON ${table} (id)
        WHERE deleted_at IS NULL
      `);

      console.log(`Created index ${indexName}`);
    }

    console.log('Deleted_at indexes created successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    console.log('Removing deleted_at indexes...');

    for (const table of this.tables) {
      const indexName = `idx_${table}_not_deleted`;
      await queryRunner.query(`
        DROP INDEX IF EXISTS ${indexName}
      `);
      console.log(`Dropped index ${indexName}`);
    }

    console.log('Deleted_at indexes removed');
  }
}
