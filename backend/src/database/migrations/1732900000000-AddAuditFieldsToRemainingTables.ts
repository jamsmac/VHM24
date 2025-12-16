import { MigrationInterface, QueryRunner } from 'typeorm';
import { Logger } from '@nestjs/common';

const logger = new Logger('AddAuditFieldsToRemainingTables1732900000000');

/**
 * Migration: Add Audit Fields to Remaining Tables
 *
 * Adds created_by_id and updated_by_id to tables that were missed
 * in the previous migration. These are required by BaseEntity.
 */
export class AddAuditFieldsToRemainingTables1732900000000 implements MigrationInterface {
  name = 'AddAuditFieldsToRemainingTables1732900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    logger.log('🔧 Adding audit fields to remaining tables...');

    // Tables that need audit fields added
    const tablesNeedingAuditFields = [
      'users',
      'dictionaries',
      'telegram_settings',
      'access_requests',
      'user_sessions',
      'audit_logs',
      'security_events',
      'session_logs',
      'two_factor_settings',
      'notifications',
      'notification_preferences',
      'files',
      'routes',
      'route_points',
      'operator_inventory',
      'warehouse_inventory',
      'machine_inventory',
      'counterparties',
      'commission_rates',
      'commission_calculations',
      'daily_sales_summaries',
      'purchase_history',
      'price_history',
      'task_items',
      'task_components',
      'hopper_types',
      'spare_parts',
      'maintenance_records',
      'component_movements',
      'sync_jobs',
      'integration_logs',
      'webhooks',
      'recipe_snapshots',
      'opening_balances',
      'operator_ratings',
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
        // Check if created_by_id column already exists
        const createdByExists = await queryRunner.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = '${table}'
            AND column_name = 'created_by_id'
          );
        `);

        if (!createdByExists[0]?.exists) {
          logger.log(`    Adding audit fields to ${table}...`);
          await queryRunner.query(`
            ALTER TABLE "${table}"
            ADD COLUMN IF NOT EXISTS "created_by_id" uuid NULL,
            ADD COLUMN IF NOT EXISTS "updated_by_id" uuid NULL;
          `);
        } else {
          logger.log(`    Skipping ${table} - audit fields already exist`);
        }
      } else {
        logger.log(`    Skipping ${table} - table does not exist`);
      }
    }

    logger.log('✅ Audit fields added to remaining tables');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    logger.log('🔄 Removing audit fields from tables...');

    const tables = [
      'users',
      'dictionaries',
      'telegram_settings',
      'access_requests',
      'user_sessions',
      'audit_logs',
      'security_events',
      'session_logs',
      'two_factor_settings',
      'notifications',
      'notification_preferences',
      'files',
      'routes',
      'route_points',
      'operator_inventory',
      'warehouse_inventory',
      'machine_inventory',
      'counterparties',
      'commission_rates',
      'commission_calculations',
      'daily_sales_summaries',
      'purchase_history',
      'price_history',
      'task_items',
      'task_components',
      'hopper_types',
      'spare_parts',
      'maintenance_records',
      'component_movements',
      'sync_jobs',
      'integration_logs',
      'webhooks',
      'recipe_snapshots',
      'opening_balances',
      'operator_ratings',
    ];

    for (const table of tables) {
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
          DROP COLUMN IF EXISTS "created_by_id",
          DROP COLUMN IF EXISTS "updated_by_id";
        `);
      }
    }

    logger.log('✅ Audit fields removed');
  }
}
