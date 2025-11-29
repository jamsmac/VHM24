import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add missing indexes for query performance optimization
 *
 * These indexes were identified during P1 database query performance audit.
 * They improve performance of:
 * - Network summary report aggregations
 * - Date-range movement queries
 * - Comment retrieval ordered by date
 */
export class AddQueryPerformanceIndexes1732600000000 implements MigrationInterface {
  name = 'AddQueryPerformanceIndexes1732600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Index for transactions aggregation queries (network summary reports)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_machine_type_date
      ON transactions (machine_id, transaction_type, transaction_date)
    `);

    // Index for inventory movements date-range queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_movements_opdate_type
      ON inventory_movements (operation_date, movement_type)
    `);

    // Index for task comments retrieval ordered by date
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_task_comments_task_created
      ON task_comments (task_id, created_at)
    `);

    // Index for notifications by recipient and status (commonly queried)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient_status
      ON notifications (recipient_id, status, created_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_transactions_machine_type_date`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inventory_movements_opdate_type`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_task_comments_task_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_notifications_recipient_status`);
  }
}
