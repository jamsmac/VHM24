import { Injectable, Logger } from '@nestjs/common';
import { Context, Markup } from 'telegraf';
import { TelegramUser, TelegramLanguage } from '../../shared/entities/telegram-user.entity';
import { TelegramMessageType } from '../../shared/entities/telegram-message-log.entity';
import { TasksService } from '../../../tasks/tasks.service';
import { UsersService } from '../../../users/users.service';
import { MachinesService } from '../../../machines/machines.service';
import { MachineStatus } from '../../../machines/entities/machine.entity';
import { IncidentsService } from '../../../incidents/incidents.service';
import { IncidentStatus } from '../../../incidents/entities/incident.entity';
import { TransactionsService } from '../../../transactions/transactions.service';
import { InventoryService } from '../../../inventory/inventory.service';
import { TaskStatus, TaskType } from '../../../tasks/entities/task.entity';
import { startOfDay, endOfDay } from 'date-fns';
import {
  TelegramTaskInfo,
  TelegramMachineInfo,
  TelegramAlertInfo,
  TelegramStatsInfo,
  TelegramKeyboardRow,
} from '../../shared/types/telegram.types';

interface BotContext extends Context {
  telegramUser?: TelegramUser;
}

/**
 * Helpers interface for dependency injection
 */
interface DataCommandsHelpers {
  t: (lang: TelegramLanguage, key: string, ...args: string[]) => string;
  logMessage: (ctx: BotContext, type: TelegramMessageType, command?: string) => Promise<void>;
  formatMachinesMessage: (machines: TelegramMachineInfo[], lang: TelegramLanguage) => string;
  formatAlertsMessage: (alerts: TelegramAlertInfo[], lang: TelegramLanguage) => string;
  formatStatsMessage: (stats: TelegramStatsInfo, lang: TelegramLanguage) => string;
  formatTasksMessage: (tasks: TelegramTaskInfo[], lang: TelegramLanguage) => string;
  getMachinesKeyboard: (machines: TelegramMachineInfo[], lang: TelegramLanguage) => any;
  getAlertsKeyboard: (alerts: TelegramAlertInfo[], lang: TelegramLanguage) => any;
  getTasksKeyboard: (tasks: TelegramTaskInfo[], lang: TelegramLanguage) => any;
}

/**
 * TelegramDataCommandsService
 *
 * Handles data display commands via Telegram:
 * - Machines list command
 * - Alerts command
 * - Statistics command
 * - Tasks list command
 *
 * These commands fetch data from various services and display it to users.
 *
 * @module TelegramCoreModule
 */
@Injectable()
export class TelegramDataCommandsService {
  private readonly logger = new Logger(TelegramDataCommandsService.name);
  private helpers: DataCommandsHelpers | null = null;

  constructor(
    private readonly tasksService: TasksService,
    private readonly usersService: UsersService,
    private readonly machinesService: MachinesService,
    private readonly incidentsService: IncidentsService,
    private readonly transactionsService: TransactionsService,
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * Set helper methods from TelegramBotService
   */
  setHelpers(helpers: DataCommandsHelpers): void {
    this.helpers = helpers;
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

  /**
   * Log message helper shortcut
   */
  private async logMessage(ctx: BotContext, type: TelegramMessageType, command?: string): Promise<void> {
    if (this.helpers) {
      await this.helpers.logMessage(ctx, type, command);
    }
  }

  /**
   * Handler for /machines command - shows list of machines
   */
  async handleMachinesCommand(ctx: BotContext): Promise<void> {
    await this.logMessage(ctx, TelegramMessageType.COMMAND, '/machines');

    if (!ctx.telegramUser?.is_verified) {
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
      await ctx.reply(this.t(lang, 'not_verified'));
      return;
    }

    const lang = ctx.telegramUser.language;

    // Show loading indicator
    await ctx.replyWithChatAction('typing');

    // Fetch actual machines from database
    const machines = await this.machinesService.findAllSimple();
    const formattedMachines = machines.map((machine, index) => ({
      id: index + 1, // Use sequential ID for display
      name: machine.machine_number,
      status: machine.status === 'active' ? 'online' : machine.status,
      location: machine.location?.name || machine.location?.address || 'Unknown',
    }));

    if (!this.helpers) {
      await ctx.reply('Service not initialized');
      return;
    }

    const message = this.helpers.formatMachinesMessage(formattedMachines, lang);
    const keyboard = this.helpers.getMachinesKeyboard(formattedMachines, lang);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
    } else {
      await ctx.reply(message, { ...keyboard, parse_mode: 'HTML' });
    }
  }

  /**
   * Handler for /alerts command - shows active alerts
   */
  async handleAlertsCommand(ctx: BotContext): Promise<void> {
    await this.logMessage(ctx, TelegramMessageType.COMMAND, '/alerts');

    if (!ctx.telegramUser?.is_verified) {
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
      await ctx.reply(this.t(lang, 'not_verified'));
      return;
    }

    const lang = ctx.telegramUser.language;

    // Fetch actual alerts from database
    const alerts: Array<{ id: number; type: string; machine: string; time: string }> = [];
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

    if (!this.helpers) {
      await ctx.reply('Service not initialized');
      return;
    }

    const message = this.helpers.formatAlertsMessage(alerts, lang);
    const keyboard = this.helpers.getAlertsKeyboard(alerts, lang);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
    } else {
      await ctx.reply(message, { ...keyboard, parse_mode: 'HTML' });
    }
  }

  /**
   * Handler for /stats command - shows statistics
   */
  async handleStatsCommand(ctx: BotContext): Promise<void> {
    await this.logMessage(ctx, TelegramMessageType.COMMAND, '/stats');

    if (!ctx.telegramUser?.is_verified) {
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
      await ctx.reply(this.t(lang, 'not_verified'));
      return;
    }

    const lang = ctx.telegramUser.language;

    // Show loading indicator
    await ctx.replyWithChatAction('typing');

    // Fetch actual stats from database
    const today = new Date();
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);

    // Get all machines and count by status
    const allMachines = await this.machinesService.findAllSimple();
    const total_machines = allMachines.length;
    const online = allMachines.filter((m) => m.status === MachineStatus.ACTIVE).length;
    const offline = allMachines.filter(
      (m) =>
        m.status === MachineStatus.OFFLINE ||
        m.status === MachineStatus.ERROR ||
        m.status === MachineStatus.MAINTENANCE,
    ).length;

    // Get today's transactions
    const todayTransactions = await this.transactionsService.findAll(
      undefined,
      undefined,
      undefined,
      todayStart.toISOString(),
      todayEnd.toISOString(),
    );
    const today_sales = todayTransactions.length;
    const today_revenue = todayTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // Get pending tasks
    const allTasks = await this.tasksService.findAll(undefined);
    const pending_tasks = allTasks.filter(
      (t) => t.status === TaskStatus.PENDING || t.status === TaskStatus.ASSIGNED,
    ).length;

    const stats = {
      total_machines,
      online,
      offline,
      today_sales,
      today_revenue: Math.round(today_revenue),
      pending_tasks,
    };

    if (!this.helpers) {
      await ctx.reply('Service not initialized');
      return;
    }

    const message = this.helpers.formatStatsMessage(stats, lang);
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(this.t(lang, 'refresh'), 'menu_stats')],
      [Markup.button.callback(this.t(lang, 'back'), 'back_to_menu')],
    ]);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
    } else {
      await ctx.reply(message, { ...keyboard, parse_mode: 'HTML' });
    }
  }

  /**
   * Handler for /tasks command - shows list of operator's tasks
   */
  async handleTasksCommand(ctx: BotContext): Promise<void> {
    await this.logMessage(ctx, TelegramMessageType.COMMAND, '/tasks');

    if (!ctx.telegramUser?.is_verified) {
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
      await ctx.reply(this.t(lang, 'not_verified'));
      return;
    }

    const lang = ctx.telegramUser.language;

    // Show loading indicator
    await ctx.replyWithChatAction('typing');

    // Get user by telegram_id
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

      // Fetch tasks assigned to this operator
      const tasks = await this.tasksService.findAll(
        undefined, // status
        undefined, // type
        undefined, // machine
        user.id, // assigned_to_user_id
      );

      // Filter active tasks (pending, assigned, in_progress)
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

      if (!this.helpers) {
        await ctx.reply('Service not initialized');
        return;
      }

      // Format message
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
}
