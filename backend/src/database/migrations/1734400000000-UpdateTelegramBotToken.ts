import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTelegramBotToken1734400000000 implements MigrationInterface {
  name = 'UpdateTelegramBotToken1734400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // SECURITY: Token must be provided via environment variable
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      console.log('TELEGRAM_BOT_TOKEN not set, skipping migration');
      return;
    }

    // Check if telegram_settings table exists
    const tableExists = await queryRunner.hasTable('telegram_settings');
    if (!tableExists) {
      console.log('telegram_settings table does not exist, skipping migration');
      return;
    }

    // Check if default settings exist
    const existing = await queryRunner.query(
      `SELECT id FROM telegram_settings WHERE setting_key = 'default'`
    );

    if (existing.length === 0) {
      // Create new settings
      await queryRunner.query(`
        INSERT INTO telegram_settings (setting_key, bot_token, is_active, send_notifications, default_notification_preferences, created_at, updated_at)
        VALUES (
          'default',
          $1,
          true,
          true,
          '{"machine_offline":true,"machine_online":true,"low_stock":true,"task_assigned":true,"task_completed":true,"maintenance_due":true,"equipment_needs_maintenance":true,"custom":true}',
          NOW(),
          NOW()
        )
      `, [botToken]);
      console.log('Created new Telegram settings with bot token');
    } else {
      // Update existing settings
      await queryRunner.query(`
        UPDATE telegram_settings
        SET bot_token = $1, is_active = true, updated_at = NOW()
        WHERE setting_key = 'default'
      `, [botToken]);
      console.log('Updated Telegram bot token');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Don't remove the token on down - just deactivate
    await queryRunner.query(`
      UPDATE telegram_settings
      SET is_active = false, updated_at = NOW()
      WHERE setting_key = 'default'
    `);
  }
}
