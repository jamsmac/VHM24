import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEquipmentNotificationTypes1731585600005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add equipment notification types to notification_type enum
    // Check if enum exists, if not create it, otherwise alter it
    const enumExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'notification_type_enum'
      );
    `);

    if (enumExists[0].exists) {
      // Alter existing enum
      await queryRunner.query(`
        ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'component_needs_maintenance';
      `);
      await queryRunner.query(`
        ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'component_nearing_lifetime';
      `);
      await queryRunner.query(`
        ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'spare_part_low_stock';
      `);
      await queryRunner.query(`
        ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'washing_overdue';
      `);
      await queryRunner.query(`
        ALTER TYPE notification_type_enum ADD VALUE IF NOT EXISTS 'washing_upcoming';
      `);
    } else {
      // Create enum with all types including equipment types
      await queryRunner.query(`
        CREATE TYPE notification_type_enum AS ENUM (
          'task_assigned',
          'task_completed',
          'task_overdue',
          'low_stock_warehouse',
          'low_stock_machine',
          'machine_error',
          'incident_created',
          'complaint_received',
          'daily_report',
          'system_alert',
          'component_needs_maintenance',
          'component_nearing_lifetime',
          'spare_part_low_stock',
          'washing_overdue',
          'washing_upcoming'
        );
      `);
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Note: PostgreSQL doesn't support removing enum values directly
    // You would need to recreate the enum without these values
    // For simplicity in development, we'll leave it as is
    // In production, you'd need to:
    // 1. Create a new enum without the equipment types
    // 2. Alter the table to use the new enum
    // 3. Drop the old enum
    // 4. Rename the new enum

    console.log(
      'Rollback note: Equipment notification types remain in enum. Manual cleanup required if needed.',
    );
  }
}
