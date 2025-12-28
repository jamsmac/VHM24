import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Markup } from 'telegraf';
import { TelegramLanguage } from '../../shared/entities/telegram-user.entity';
import { TelegramMessageLog, TelegramMessageType } from '../../shared/entities/telegram-message-log.entity';
import { TasksService } from '../../../tasks/tasks.service';
import { UsersService } from '../../../users/users.service';
import { MachinesService } from '../../../machines/machines.service';
import { IncidentsService } from '../../../incidents/incidents.service';
import { TransactionsService } from '../../../transactions/transactions.service';
import { InventoryService } from '../../../inventory/inventory.service';
import { TaskStatus } from '../../../tasks/entities/task.entity';
import { IncidentStatus } from '../../../incidents/entities/incident.entity';
import { startOfDay, endOfDay } from 'date-fns';
import {
  BotContext,
  TelegramTaskInfo,
  TelegramMachineInfo,
  TelegramAlertInfo,
  TelegramStatsInfo,
} from '../../shared/types/telegram.types';

/**
 * Interface for bot helper methods passed from TelegramBotService
 */
export interface BotHelpers {
  t: (lang: TelegramLanguage, key: string, ...args: string[]) => string;
  getMainMenuKeyboard: (lang: TelegramLanguage) => ReturnType<typeof Markup.inlineKeyboard>;
  getVerificationKeyboard: (lang: TelegramLanguage) => ReturnType<typeof Markup.inlineKeyboard>;
  formatTasksMessage: (tasks: TelegramTaskInfo[], lang: TelegramLanguage) => string;
  formatMachinesMessage: (machines: TelegramMachineInfo[], lang: TelegramLanguage) => string;
  formatAlertsMessage: (alerts: TelegramAlertInfo[], lang: TelegramLanguage) => string;
  formatStatsMessage: (stats: TelegramStatsInfo, lang: TelegramLanguage) => string;
  getTasksKeyboard: (tasks: TelegramTaskInfo[], lang: TelegramLanguage) => ReturnType<typeof Markup.inlineKeyboard>;
  getMachinesKeyboard: (machines: TelegramMachineInfo[], lang: TelegramLanguage) => ReturnType<typeof Markup.inlineKeyboard>;
  getAlertsKeyboard: (alerts: TelegramAlertInfo[], lang: TelegramLanguage) => ReturnType<typeof Markup.inlineKeyboard>;
  notifyAdminAboutNewUser: (userId: string, from: NonNullable<BotContext['from']>) => Promise<void>;
}

/**
 * TelegramCommandHandlerService
 *
 * Handles all Telegram bot commands (/start, /tasks, /machines, etc.)
 * Extracted from TelegramBotService to improve maintainability.
 *
 * @module TelegramCoreModule
 */
@Injectable()
export class TelegramCommandHandlerService {
  private readonly logger = new Logger(TelegramCommandHandlerService.name);
  private helpers: BotHelpers | null = null;

  constructor(
    @InjectRepository(TelegramMessageLog)
    private telegramMessageLogRepository: Repository<TelegramMessageLog>,
    private readonly tasksService: TasksService,
    private readonly usersService: UsersService,
    private readonly machinesService: MachinesService,
    private readonly incidentsService: IncidentsService,
    private readonly transactionsService: TransactionsService,
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * Initialize with helper methods from TelegramBotService
   */
  setHelpers(helpers: BotHelpers): void {
    this.helpers = helpers;
  }

  /**
   * Log a message to the database for analytics
   */
  private async logMessage(
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
      this.logger.warn('Failed to log message', error);
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
  // START COMMAND
  // ============================================================================

  /**
   * Handle /start command - welcome and access request
   */
  async handleStartCommand(ctx: BotContext): Promise<void> {
    if (!this.helpers) {
      this.logger.error('Helpers not initialized');
      return;
    }

    const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
    await this.logMessage(ctx, TelegramMessageType.COMMAND, '/start');

    // Case 1: User is verified - show main menu
    if (ctx.telegramUser?.is_verified) {
      await ctx.reply(
        this.t(lang, 'welcome_back', ctx.from?.first_name || 'User'),
        this.helpers.getMainMenuKeyboard(lang),
      );
      return;
    }

    // Case 2: User exists but not verified - inform about pending request
    if (ctx.telegramUser && !ctx.telegramUser.is_verified) {
      await ctx.reply(
        this.t(lang, 'access_request_pending'),
        this.helpers.getVerificationKeyboard(lang),
      );
      return;
    }

    // Case 3: New user - create pending user and notify admin
    if (!ctx.telegramUser && ctx.from) {
      try {
        const pendingUser = await this.usersService.createPendingFromTelegram({
          telegram_id: ctx.from.id.toString(),
          telegram_username: ctx.from.username,
          telegram_first_name: ctx.from.first_name,
          telegram_last_name: ctx.from.last_name,
        });

        this.logger.log(
          `Pending user created for Telegram user ${ctx.from.id} (@${ctx.from.username})`,
        );

        await ctx.reply(
          this.t(lang, 'access_request_created', ctx.from.first_name || 'User'),
          this.helpers.getVerificationKeyboard(lang),
        );

        await this.helpers.notifyAdminAboutNewUser(pendingUser.id, ctx.from);
      } catch (error: unknown) {
        this.logger.error('Failed to create pending user', error);
        const errorMessage = error instanceof Error ? error.message : '';
        if (errorMessage.includes('уже существует') || errorMessage.includes('already exists')) {
          await ctx.reply(
            this.t(lang, 'access_request_pending'),
            this.helpers.getVerificationKeyboard(lang),
          );
        } else {
          await ctx.reply(
            this.t(lang, 'access_request_error'),
            this.helpers.getVerificationKeyboard(lang),
          );
        }
      }
      return;
    }

    // Fallback
    await ctx.reply(
      this.t(lang, 'welcome_new', ctx.from?.first_name || 'User'),
      this.helpers.getVerificationKeyboard(lang),
    );
  }

  // ============================================================================
  // MENU COMMAND
  // ============================================================================

  /**
   * Handle /menu command - show main menu
   */
  async handleMenuCommand(ctx: BotContext): Promise<void> {
    if (!this.helpers) return;

    await this.logMessage(ctx, TelegramMessageType.COMMAND, '/menu');

    if (!ctx.telegramUser?.is_verified) {
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
      await ctx.reply(
        this.t(lang, 'not_verified'),
        this.helpers.getVerificationKeyboard(lang),
      );
      return;
    }

    const lang = ctx.telegramUser.language;
    await ctx.reply(this.t(lang, 'main_menu'), this.helpers.getMainMenuKeyboard(lang));
  }

  // ============================================================================
  // MACHINES COMMAND
  // ============================================================================

  /**
   * Handle /machines command - show machine list
   */
  async handleMachinesCommand(ctx: BotContext): Promise<void> {
    if (!this.helpers) return;

    await this.logMessage(ctx, TelegramMessageType.COMMAND, '/machines');

    if (!ctx.telegramUser?.is_verified) {
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
      await ctx.reply(this.t(lang, 'not_verified'));
      return;
    }

    const lang = ctx.telegramUser.language;
    await ctx.replyWithChatAction('typing');

    const machines = await this.machinesService.findAllSimple();
    const formattedMachines: TelegramMachineInfo[] = machines.map((machine, index) => ({
      id: index + 1,
      name: machine.machine_number,
      status: machine.status === 'active' ? 'online' : machine.status,
      location: machine.location?.name || machine.location?.address || 'Unknown',
    }));

    const message = this.helpers.formatMachinesMessage(formattedMachines, lang);
    const keyboard = this.helpers.getMachinesKeyboard(formattedMachines, lang);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
    } else {
      await ctx.reply(message, { ...keyboard, parse_mode: 'HTML' });
    }
  }

  // ============================================================================
  // ALERTS COMMAND
  // ============================================================================

  /**
   * Handle /alerts command - show active alerts
   */
  async handleAlertsCommand(ctx: BotContext): Promise<void> {
    if (!this.helpers) return;

    await this.logMessage(ctx, TelegramMessageType.COMMAND, '/alerts');

    if (!ctx.telegramUser?.is_verified) {
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
      await ctx.reply(this.t(lang, 'not_verified'));
      return;
    }

    const lang = ctx.telegramUser.language;
    const alerts: TelegramAlertInfo[] = [];
    let alertId = 1;

    // Get active incidents
    const incidents = await this.incidentsService.findAll(IncidentStatus.OPEN, undefined);
    for (const incident of incidents.slice(0, 5)) {
      const timeDiff = Date.now() - incident.reported_at.getTime();
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      alerts.push({
        id: alertId++,
        type: incident.incident_type || 'incident',
        machine: incident.machine?.machine_number || 'Unknown',
        time: hours > 0 ? `${hours}h ${minutes}m ago` : `${minutes}m ago`,
      });
    }

    // Get low stock machines
    const lowStockItems = await this.inventoryService.getMachinesLowStock();
    const machineMap = new Map<string, { machine: string; count: number }>();

    for (const item of lowStockItems.slice(0, 5)) {
      const machineId = item.machine_id;
      if (!machineMap.has(machineId)) {
        const machine = await this.machinesService.findOne(machineId);
        machineMap.set(machineId, {
          machine: machine?.machine_number || 'Unknown',
          count: 1,
        });
      } else {
        machineMap.get(machineId)!.count++;
      }
    }

    for (const value of machineMap.values()) {
      alerts.push({
        id: alertId++,
        type: 'low_stock',
        machine: value.machine,
        time: `${value.count} item(s)`,
      });
    }

    const message = this.helpers.formatAlertsMessage(alerts, lang);
    const keyboard = this.helpers.getAlertsKeyboard(alerts, lang);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
    } else {
      await ctx.reply(message, { ...keyboard, parse_mode: 'HTML' });
    }
  }

  // ============================================================================
  // STATS COMMAND
  // ============================================================================

  /**
   * Handle /stats command - show statistics
   */
  async handleStatsCommand(ctx: BotContext): Promise<void> {
    if (!this.helpers) return;

    await this.logMessage(ctx, TelegramMessageType.COMMAND, '/stats');

    if (!ctx.telegramUser?.is_verified) {
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
      await ctx.reply(this.t(lang, 'not_verified'));
      return;
    }

    const lang = ctx.telegramUser.language;
    await ctx.replyWithChatAction('typing');

    // Fetch actual stats from database
    const machines = await this.machinesService.findAllSimple();
    const totalMachines = machines.length;
    const onlineMachines = machines.filter((m) => m.status === 'active').length;
    const offlineMachines = machines.filter(
      (m) => m.status === 'offline' || m.status === 'disabled',
    ).length;

    // Get today's transactions
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    let todayRevenue = 0;
    let todaySales = 0;

    try {
      const transactions = await this.transactionsService.findAll(
        undefined,
        undefined,
        undefined,
        todayStart.toISOString(),
        todayEnd.toISOString(),
      );
      todayRevenue = transactions.reduce((sum: number, t) => sum + Number(t.amount || 0), 0);
      todaySales = transactions.length;
    } catch (error) {
      this.logger.warn('Could not fetch today transactions', error);
    }

    // Get pending tasks count
    let pendingTasks = 0;
    try {
      const tasks = await this.tasksService.findAll(TaskStatus.PENDING, undefined, undefined);
      pendingTasks = tasks.length;
    } catch (error) {
      this.logger.warn('Could not fetch pending tasks', error);
    }

    const stats: TelegramStatsInfo = {
      total_machines: totalMachines,
      online: onlineMachines,
      offline: offlineMachines,
      today_revenue: todayRevenue,
      today_sales: todaySales,
      pending_tasks: pendingTasks,
    };

    const message = this.helpers.formatStatsMessage(stats, lang);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, {
        ...this.helpers.getMainMenuKeyboard(lang),
        parse_mode: 'HTML',
      });
    } else {
      await ctx.reply(message, {
        ...this.helpers.getMainMenuKeyboard(lang),
        parse_mode: 'HTML',
      });
    }
  }

  // ============================================================================
  // TASKS COMMAND
  // ============================================================================

  /**
   * Handle /tasks command - show operator's task list
   */
  async handleTasksCommand(ctx: BotContext): Promise<void> {
    if (!this.helpers) return;

    await this.logMessage(ctx, TelegramMessageType.COMMAND, '/tasks');

    if (!ctx.telegramUser?.is_verified) {
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
      await ctx.reply(this.t(lang, 'not_verified'));
      return;
    }

    const lang = ctx.telegramUser.language;
    await ctx.replyWithChatAction('typing');

    try {
      const user = await this.usersService.findByTelegramId(ctx.telegramUser.telegram_id);

      if (!user) {
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '❌ Пользователь не найден. Обратитесь к администратору.'
            : '❌ User not found. Contact administrator.',
        );
        return;
      }

      const tasks = await this.tasksService.findAll(
        undefined,
        undefined,
        undefined,
        user.id,
      );

      const activeTasks = tasks.filter(
        (t) =>
          t.status === TaskStatus.PENDING ||
          t.status === TaskStatus.ASSIGNED ||
          t.status === TaskStatus.IN_PROGRESS,
      );

      if (activeTasks.length === 0) {
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '✅ У вас нет активных задач'
            : '✅ You have no active tasks',
        );
        return;
      }

      const message = this.helpers.formatTasksMessage(activeTasks, lang);
      const keyboard = this.helpers.getTasksKeyboard(activeTasks, lang);

      await ctx.reply(message, { ...keyboard, parse_mode: 'HTML' });
    } catch (error) {
      this.logger.error('Error fetching tasks:', error);

      const errorMessage =
        lang === TelegramLanguage.RU
          ? `😕 Не удалось загрузить список задач\n\n` +
            `<b>💡 Попробуйте:</b>\n` +
            `1️⃣ Обновить список: /tasks\n` +
            `2️⃣ Проверить интернет-соединение\n` +
            `3️⃣ Подождать минуту и попробовать снова\n\n` +
            `❓ Проблема не решается? Напишите администратору`
          : `😕 Could not load task list\n\n` +
            `<b>💡 Try this:</b>\n` +
            `1️⃣ Refresh list: /tasks\n` +
            `2️⃣ Check internet connection\n` +
            `3️⃣ Wait a minute and try again\n\n` +
            `❓ Still having issues? Contact administrator`;

      await ctx.reply(errorMessage, { parse_mode: 'HTML' });
    }
  }

  // ============================================================================
  // HELP COMMAND
  // ============================================================================

  /**
   * Handle /help command - show help information
   */
  async handleHelpCommand(ctx: BotContext): Promise<void> {
    const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
    await ctx.reply(this.t(lang, 'help'), { parse_mode: 'HTML' });
  }

  // ============================================================================
  // LANGUAGE COMMAND
  // ============================================================================

  /**
   * Handle /language command - show language selection
   */
  async handleLanguageCommand(ctx: BotContext): Promise<void> {
    await ctx.reply(
      'Choose your language / Выберите язык:',
      Markup.inlineKeyboard([
        [
          Markup.button.callback('🇷🇺 Русский', 'lang_ru'),
          Markup.button.callback('🇬🇧 English', 'lang_en'),
        ],
      ]),
    );
  }
}
