import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Markup } from 'telegraf';
import { TelegramUser, TelegramLanguage } from '../../shared/entities/telegram-user.entity';
import { TelegramMessageLog, TelegramMessageType } from '../../shared/entities/telegram-message-log.entity';
import { BotContext } from '../../shared/types/telegram.types';

/**
 * Interface for callback helper methods passed from TelegramBotService
 */
export interface CallbackHelpers {
  t: (lang: TelegramLanguage, key: string, ...args: string[]) => string;
  getMainMenuKeyboard: (lang: TelegramLanguage) => ReturnType<typeof Markup.inlineKeyboard>;
  getSettingsKeyboard: (lang: TelegramLanguage) => ReturnType<typeof Markup.inlineKeyboard>;
  getNotificationSettingsKeyboard: (
    lang: TelegramLanguage,
    user: TelegramUser,
  ) => ReturnType<typeof Markup.inlineKeyboard>;
  handleMachinesCommand: (ctx: BotContext) => Promise<void>;
  handleAlertsCommand: (ctx: BotContext) => Promise<void>;
  handleStatsCommand: (ctx: BotContext) => Promise<void>;
  handleTasksCommand: (ctx: BotContext) => Promise<void>;
  toggleNotification: (ctx: BotContext, type: string) => Promise<void>;
}

/**
 * TelegramCallbackHandlerService
 *
 * Handles Telegram inline keyboard callback queries.
 * Extracted from TelegramBotService to improve maintainability.
 *
 * Handles:
 * - Language selection (lang_ru, lang_en)
 * - Menu navigation (menu_machines, menu_alerts, menu_stats, menu_settings, back_to_menu)
 * - Settings (settings_notifications, settings_language)
 * - Task refresh (refresh_tasks)
 *
 * @module TelegramCoreModule
 */
@Injectable()
export class TelegramCallbackHandlerService {
  private readonly logger = new Logger(TelegramCallbackHandlerService.name);
  private helpers: CallbackHelpers | null = null;

  constructor(
    @InjectRepository(TelegramUser)
    private telegramUserRepository: Repository<TelegramUser>,
    @InjectRepository(TelegramMessageLog)
    private telegramMessageLogRepository: Repository<TelegramMessageLog>,
  ) {}

  /**
   * Initialize with helper methods from TelegramBotService
   */
  setHelpers(helpers: CallbackHelpers): void {
    this.helpers = helpers;
  }

  /**
   * Log a callback to the database for analytics
   */
  private async logCallback(ctx: BotContext, callbackData: string): Promise<void> {
    try {
      const log = this.telegramMessageLogRepository.create({
        telegram_user_id: ctx.telegramUser?.id || null,
        chat_id: ctx.chat?.id?.toString() || null,
        message_type: TelegramMessageType.CALLBACK,
        command: callbackData,
        message_text: `Callback: ${callbackData}`,
      });
      await this.telegramMessageLogRepository.save(log);
    } catch (error) {
      this.logger.warn('Failed to log callback', error);
    }
  }

  /**
   * Translation helper shortcut
   */
  private t(lang: TelegramLanguage, key: string, ...args: string[]): string {
    if (!this.helpers) {
      return key;
    }
    return this.helpers.t(lang, key, ...args);
  }

  // ============================================================================
  // LANGUAGE CALLBACKS
  // ============================================================================

  /**
   * Handle language change to Russian
   */
  async handleLanguageRu(ctx: BotContext): Promise<void> {
    if (!this.helpers) return;

    await this.logCallback(ctx, 'lang_ru');
    await this.updateUserLanguage(ctx, TelegramLanguage.RU);
    await ctx.answerCbQuery('Язык изменен на русский ✓');
    await ctx.editMessageText(
      'Язык изменен на русский 🇷🇺',
      this.helpers.getMainMenuKeyboard(TelegramLanguage.RU),
    );
  }

  /**
   * Handle language change to English
   */
  async handleLanguageEn(ctx: BotContext): Promise<void> {
    if (!this.helpers) return;

    await this.logCallback(ctx, 'lang_en');
    await this.updateUserLanguage(ctx, TelegramLanguage.EN);
    await ctx.answerCbQuery('Language changed to English ✓');
    await ctx.editMessageText(
      'Language changed to English 🇬🇧',
      this.helpers.getMainMenuKeyboard(TelegramLanguage.EN),
    );
  }

  /**
   * Update user language preference in database
   */
  private async updateUserLanguage(ctx: BotContext, language: TelegramLanguage): Promise<void> {
    if (ctx.telegramUser) {
      ctx.telegramUser.language = language;
      await this.telegramUserRepository.save(ctx.telegramUser);
    }
  }

  // ============================================================================
  // MENU NAVIGATION CALLBACKS
  // ============================================================================

  /**
   * Handle menu_machines callback - show machines list
   */
  async handleMenuMachines(ctx: BotContext): Promise<void> {
    if (!this.helpers) return;

    await this.logCallback(ctx, 'menu_machines');
    await ctx.answerCbQuery();
    await this.helpers.handleMachinesCommand(ctx);
  }

  /**
   * Handle menu_alerts callback - show alerts
   */
  async handleMenuAlerts(ctx: BotContext): Promise<void> {
    if (!this.helpers) return;

    await this.logCallback(ctx, 'menu_alerts');
    await ctx.answerCbQuery();
    await this.helpers.handleAlertsCommand(ctx);
  }

  /**
   * Handle menu_stats callback - show statistics
   */
  async handleMenuStats(ctx: BotContext): Promise<void> {
    if (!this.helpers) return;

    await this.logCallback(ctx, 'menu_stats');
    await ctx.answerCbQuery();
    await this.helpers.handleStatsCommand(ctx);
  }

  /**
   * Handle menu_settings callback - show settings menu
   */
  async handleMenuSettings(ctx: BotContext): Promise<void> {
    if (!this.helpers) return;

    await this.logCallback(ctx, 'menu_settings');
    await ctx.answerCbQuery();
    const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
    await ctx.editMessageText(
      this.t(lang, 'settings_menu'),
      this.helpers.getSettingsKeyboard(lang),
    );
  }

  /**
   * Handle back_to_menu callback - return to main menu
   */
  async handleBackToMenu(ctx: BotContext): Promise<void> {
    if (!this.helpers) return;

    await this.logCallback(ctx, 'back_to_menu');
    await ctx.answerCbQuery();
    const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
    await ctx.editMessageText(
      this.t(lang, 'main_menu'),
      this.helpers.getMainMenuKeyboard(lang),
    );
  }

  // ============================================================================
  // SETTINGS CALLBACKS
  // ============================================================================

  /**
   * Handle settings_notifications callback - show notification settings
   */
  async handleSettingsNotifications(ctx: BotContext): Promise<void> {
    if (!this.helpers) return;

    await this.logCallback(ctx, 'settings_notifications');
    await ctx.answerCbQuery();
    const lang = ctx.telegramUser?.language || TelegramLanguage.RU;

    if (!ctx.telegramUser) {
      await ctx.reply(this.t(lang, 'not_verified'));
      return;
    }

    await ctx.editMessageText(
      this.t(lang, 'notification_settings'),
      this.helpers.getNotificationSettingsKeyboard(lang, ctx.telegramUser),
    );
  }

  /**
   * Handle settings_language callback - show language selection
   */
  async handleSettingsLanguage(ctx: BotContext): Promise<void> {
    await this.logCallback(ctx, 'settings_language');
    await ctx.answerCbQuery();
    await ctx.editMessageText(
      'Choose your language / Выберите язык:',
      Markup.inlineKeyboard([
        [
          Markup.button.callback('🇷🇺 Русский', 'lang_ru'),
          Markup.button.callback('🇬🇧 English', 'lang_en'),
        ],
        [Markup.button.callback('« Back / Назад', 'back_to_menu')],
      ]),
    );
  }

  /**
   * Handle notification toggle callback
   */
  async handleNotificationToggle(ctx: BotContext, notificationType: string): Promise<void> {
    if (!this.helpers) return;

    await this.logCallback(ctx, `toggle_${notificationType}`);
    await this.helpers.toggleNotification(ctx, notificationType);
  }

  // ============================================================================
  // TASK CALLBACKS
  // ============================================================================

  /**
   * Handle refresh_tasks callback - refresh task list
   */
  async handleRefreshTasks(ctx: BotContext): Promise<void> {
    if (!this.helpers) return;

    await this.logCallback(ctx, 'refresh_tasks');
    await ctx.answerCbQuery();
    await this.helpers.handleTasksCommand(ctx);
  }
}
