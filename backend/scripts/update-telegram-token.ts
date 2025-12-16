/**
 * Script to update Telegram bot token in the database
 * Run with: npx ts-node scripts/update-telegram-token.ts
 */

import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const BOT_TOKEN = process.env.NEW_TELEGRAM_BOT_TOKEN || '8201265622:AAG3NMF7J2RP49nc4y6rnEG2A-0iaAnW4dA';

async function updateTelegramToken() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    await dataSource.initialize();
    console.log('Connected to database');

    // Check if settings exist
    const existing = await dataSource.query(
      `SELECT * FROM telegram_settings WHERE setting_key = 'default'`
    );

    if (existing.length === 0) {
      // Create new settings
      await dataSource.query(`
        INSERT INTO telegram_settings (setting_key, bot_token, is_active, send_notifications, default_notification_preferences)
        VALUES ('default', $1, true, true, '{"machine_offline":true,"machine_online":true,"low_stock":true,"task_assigned":true,"task_completed":true}')
      `, [BOT_TOKEN]);
      console.log('Created new Telegram settings with token');
    } else {
      // Update existing settings
      await dataSource.query(`
        UPDATE telegram_settings
        SET bot_token = $1, is_active = true, updated_at = NOW()
        WHERE setting_key = 'default'
      `, [BOT_TOKEN]);
      console.log('Updated Telegram bot token');
    }

    // Verify the update
    const updated = await dataSource.query(
      `SELECT setting_key, is_active, bot_token IS NOT NULL as has_token FROM telegram_settings WHERE setting_key = 'default'`
    );
    console.log('Current settings:', updated[0]);

    await dataSource.destroy();
    console.log('Done! Restart the backend service for changes to take effect.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateTelegramToken();
