import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramSettings } from '../entities/telegram-settings.entity';
import { UpdateTelegramSettingsDto } from '../dto/update-telegram-settings.dto';

@Injectable()
export class TelegramSettingsService {
  constructor(
    @InjectRepository(TelegramSettings)
    private telegramSettingsRepository: Repository<TelegramSettings>,
  ) {}

  async getSettings(): Promise<TelegramSettings> {
    let settings = await this.telegramSettingsRepository.findOne({
      where: { setting_key: 'default' },
    });

    if (!settings) {
      // Create default settings if they don't exist
      settings = this.telegramSettingsRepository.create({
        setting_key: 'default',
        bot_token: '',
        is_active: false,
        send_notifications: true,
        default_notification_preferences: {
          machine_offline: true,
          machine_online: true,
          low_stock: true,
          sales_milestone: true,
          maintenance_due: true,
          equipment_needs_maintenance: true,
          equipment_low_stock: true,
          equipment_washing_due: true,
          payment_failed: true,
          task_assigned: true,
          task_completed: true,
          custom: true,
        },
      });
      await this.telegramSettingsRepository.save(settings);
    }

    return settings;
  }

  async updateSettings(dto: UpdateTelegramSettingsDto): Promise<TelegramSettings> {
    const settings = await this.getSettings();

    if (dto.bot_token !== undefined) {
      settings.bot_token = dto.bot_token;
    }

    if (dto.bot_username !== undefined) {
      settings.bot_username = dto.bot_username;
    }

    if (dto.mode !== undefined) {
      settings.mode = dto.mode;
    }

    if (dto.webhook_url !== undefined) {
      settings.webhook_url = dto.webhook_url;
    }

    if (dto.is_active !== undefined) {
      settings.is_active = dto.is_active;
    }

    if (dto.send_notifications !== undefined) {
      settings.send_notifications = dto.send_notifications;
    }

    if (dto.default_notification_preferences !== undefined) {
      settings.default_notification_preferences = {
        ...settings.default_notification_preferences,
        ...dto.default_notification_preferences,
      };
    }

    return this.telegramSettingsRepository.save(settings);
  }

  async getBotInfo(): Promise<{
    is_configured: boolean;
    is_active: boolean;
    bot_username: string | null;
    send_notifications: boolean;
  }> {
    const settings = await this.getSettings();

    return {
      is_configured: !!settings.bot_token,
      is_active: settings.is_active,
      bot_username: settings.bot_username,
      send_notifications: settings.send_notifications,
    };
  }
}
