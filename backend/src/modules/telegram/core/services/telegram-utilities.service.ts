import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Context } from 'telegraf';
import { TelegramUser, TelegramLanguage } from '../../shared/entities/telegram-user.entity';
import { TelegramMessageLog, TelegramMessageType } from '../../shared/entities/telegram-message-log.entity';
import { TelegramUIService } from './telegram-ui.service';
import { TelegramAdminCallbackService } from './telegram-admin-callback.service';
import { TelegramMessageOptions } from '../../shared/types/telegram.types';

interface BotContext extends Context {
  telegramUser?: TelegramUser;
}

/**
 * TelegramUtilitiesService
 *
 * Handles utility operations for the Telegram bot:
 * - User language updates
 * - Notification preference toggles
 * - Message logging
 * - Text message handling
 *
 * Extracted from TelegramBotService to reduce its size and responsibility.
 */
@Injectable()
export class TelegramUtilitiesService {
  private readonly logger = new Logger(TelegramUtilitiesService.name);

  constructor(
    @InjectRepository(TelegramUser)
    private readonly telegramUserRepository: Repository<TelegramUser>,
    @InjectRepository(TelegramMessageLog)
    private readonly telegramMessageLogRepository: Repository<TelegramMessageLog>,
    private readonly uiService: TelegramUIService,
    private readonly adminCallbackService: TelegramAdminCallbackService,
  ) {}

  /**
   * Update user's language preference
   */
  async updateUserLanguage(ctx: BotContext, language: TelegramLanguage): Promise<void> {
    if (ctx.telegramUser) {
      ctx.telegramUser.language = language;
      await this.telegramUserRepository.save(ctx.telegramUser);
    }
  }

  /**
   * Toggle a notification preference for the user
   */
  async toggleNotification(ctx: BotContext, notificationType: string): Promise<void> {
    if (!ctx.telegramUser) return;

    // Get current preferences or empty object
    const currentPrefs = ctx.telegramUser.notification_preferences || {};
    // Toggle the specific notification type
    const updatedPrefs = {
      ...currentPrefs,
      [notificationType]: !currentPrefs[notificationType as keyof typeof currentPrefs],
    };
    ctx.telegramUser.notification_preferences = updatedPrefs;

    await this.telegramUserRepository.save(ctx.telegramUser);

    const lang = ctx.telegramUser.language;
    await ctx.answerCbQuery(this.uiService.t(lang, 'settings_updated'));

    await ctx.editMessageText(
      this.uiService.t(lang, 'notification_settings'),
      this.uiService.getNotificationSettingsKeyboard(lang, ctx.telegramUser),
    );
  }

  /**
   * Log a message to the database
   */
  async logMessage(
    ctx: BotContext,
    type: TelegramMessageType,
    command?: string,
  ): Promise<void> {
    try {
      const log = this.telegramMessageLogRepository.create({
        telegram_user_id: ctx.telegramUser?.id || null,
        chat_id: ctx.chat?.id?.toString() || null,
        message_type: type,
        command: command || null,
        message_text: ctx.message && 'text' in ctx.message ? ctx.message.text : '',
      });

      await this.telegramMessageLogRepository.save(log);
    } catch (error) {
      this.logger.error('Failed to log message', error);
    }
  }

  /**
   * Handle text messages for rejection reasons and other inputs
   */
  async handleTextMessage(
    ctx: BotContext,
    sendMessage: (chatId: string, message: string, keyboard?: TelegramMessageOptions) => Promise<void>,
  ): Promise<void> {
    if (!ctx.telegramUser?.is_verified) {
      return; // Ignore messages from unverified users
    }

    const messageText = ctx.message && 'text' in ctx.message ? ctx.message.text : '';

    try {
      // Check if admin is waiting for rejection reason
      const handled = await this.adminCallbackService.handleRejectUserInput(
        ctx,
        messageText,
        sendMessage,
      );

      if (handled) {
        return;
      }

      // Other text message handling can be added here
    } catch (error: any) {
      this.logger.error('Error handling text message:', error);
      const lang = ctx.telegramUser.language;
      await ctx.reply(
        lang === TelegramLanguage.RU ? `❌ Ошибка: ${error.message}` : `❌ Error: ${error.message}`,
      );
    }
  }
}
