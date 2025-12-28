import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';
import { Logger } from '@nestjs/common';

const logger = new Logger('AddTaskRejection1731680000001');

export class AddTaskRejection1731680000001 implements MigrationInterface {
  name = 'AddTaskRejection1731680000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check for TypeORM-generated enum name first
    const enumExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'tasks_status_enum'
      );
    `);

    if (enumExists[0]?.exists) {
      await queryRunner.query(`
        ALTER TYPE tasks_status_enum ADD VALUE IF NOT EXISTS 'rejected';
      `);
      logger.log('Added rejected to tasks_status_enum');
    } else {
      // Check for legacy enum name
      const legacyEnumExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'task_status'
        );
      `);

      if (legacyEnumExists[0]?.exists) {
        await queryRunner.query(`
          ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'rejected';
        `);
        logger.log('Added rejected to legacy task_status enum');
      } else {
        logger.log(
          'Task status enum does not exist yet. Skipping - rejected is already in entity.',
        );
      }
    }

    // Add rejection tracking fields to tasks table
    await queryRunner.addColumn(
      'tasks',
      new TableColumn({
        name: 'rejected_by_user_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'tasks',
      new TableColumn({
        name: 'rejected_at',
        type: 'timestamp with time zone',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'tasks',
      new TableColumn({
        name: 'rejection_reason',
        type: 'text',
        isNullable: true,
      }),
    );

    // Add foreign key constraint for rejected_by_user_id
    await queryRunner.query(`
      ALTER TABLE tasks
      ADD CONSTRAINT fk_tasks_rejected_by_user
      FOREIGN KEY (rejected_by_user_id)
      REFERENCES users(id)
      ON DELETE SET NULL;
    `);

    // Add index for better query performance
    await queryRunner.query(`
      CREATE INDEX idx_tasks_rejected_by_user_id ON tasks(rejected_by_user_id) WHERE rejected_by_user_id IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tasks_rejected_by_user_id;`);

    // Drop foreign key constraint
    await queryRunner.query(
      `ALTER TABLE tasks DROP CONSTRAINT IF EXISTS fk_tasks_rejected_by_user;`,
    );

    // Drop columns
    await queryRunner.dropColumn('tasks', 'rejection_reason');
    await queryRunner.dropColumn('tasks', 'rejected_at');
    await queryRunner.dropColumn('tasks', 'rejected_by_user_id');

    // Note: We cannot remove enum values in PostgreSQL easily,
    // so we leave the 'rejected' value in task_status enum
    // This is safe and won't cause issues
  }
}
