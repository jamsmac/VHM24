import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Context, Markup } from 'telegraf';
import { TelegramUser, TelegramLanguage } from '../../shared/entities/telegram-user.entity';
import { TelegramMessageLog, TelegramMessageType } from '../../shared/entities/telegram-message-log.entity';
import { TelegramSessionService, ConversationState, UserSession } from '../../infrastructure/services/telegram-session.service';
import { TelegramManagerToolsService } from '../../managers/services/telegram-manager-tools.service';
import { UsersService } from '../../../users/users.service';
import { UserRole } from '../../../users/entities/user.entity';
import { MachinesService } from '../../../machines/machines.service';
import { InventoryService } from '../../../inventory/inventory.service';
import { TasksService } from '../../../tasks/tasks.service';
import { TaskStatus, TaskType } from '../../../tasks/entities/task.entity';
import { startOfDay, endOfDay } from 'date-fns';

interface BotContext extends Context {
  telegramUser?: TelegramUser;
  session?: UserSession;
}

interface Sprint3Helpers {
  t: (lang: TelegramLanguage, key: string) => string;
  logMessage: (
    ctx: BotContext,
    type: TelegramMessageType,
    content?: string,
  ) => Promise<void>;
}

/**
 * Service for handling Sprint 3 Telegram bot functionality
 *
 * This service handles:
 * - /incident command - create incidents via bot
 * - /stock command - check machine inventory
 * - /staff command - team status for managers
 * - /report command - daily photo report
 *
 * @module TelegramCoreModule
 */
@Injectable()
export class TelegramSprint3Service {
  private readonly logger = new Logger(TelegramSprint3Service.name);
  private helpers: Sprint3Helpers | null = null;

  constructor(
    @InjectRepository(TelegramUser)
    private readonly telegramUserRepository: Repository<TelegramUser>,
    @InjectRepository(TelegramMessageLog)
    private readonly telegramMessageLogRepository: Repository<TelegramMessageLog>,
    private readonly sessionService: TelegramSessionService,
    private readonly usersService: UsersService,
    private readonly machinesService: MachinesService,
    private readonly inventoryService: InventoryService,
    private readonly tasksService: TasksService,
    private readonly managerToolsService: TelegramManagerToolsService,
  ) {}

  /**
   * Set helper methods from TelegramBotService
   */
  setHelpers(helpers: Sprint3Helpers): void {
    this.helpers = helpers;
  }

  /**
   * Get translation helper
   */
  private t(lang: TelegramLanguage, key: string): string {
    if (this.helpers) {
      return this.helpers.t(lang, key);
    }
    return key;
  }

  /**
   * Log message to database
   */
  private async logMessage(
    ctx: BotContext,
    type: TelegramMessageType,
    content?: string,
  ): Promise<void> {
    if (this.helpers) {
      await this.helpers.logMessage(ctx, type, content);
    }
  }

  // ============================================================================
  // CALLBACK HANDLERS
  // ============================================================================

  /**
   * Handle stock machine selection callback
   */
  async handleStockMachineCallback(ctx: BotContext, machineId: string): Promise<void> {
    await ctx.answerCbQuery();
    const lang = ctx.telegramUser?.language || TelegramLanguage.RU;

    try {
      await this.sendMachineStockInfo(ctx, machineId, lang);
    } catch (error: any) {
      this.logger.error('Error in stock_machine callback:', error);
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `❌ Ошибка: ${error.message}`
          : `❌ Error: ${error.message}`,
      );
    }
  }

  /**
   * Handle staff refresh callback
   */
  async handleStaffRefreshCallback(ctx: BotContext): Promise<void> {
    await ctx.answerCbQuery();
    await this.handleStaffCommand(ctx);
  }

  /**
   * Handle staff analytics callback
   */
  async handleStaffAnalyticsCallback(ctx: BotContext): Promise<void> {
    await ctx.answerCbQuery();
    const lang = ctx.telegramUser?.language || TelegramLanguage.RU;

    try {
      const user = await this.usersService.findByTelegramId(ctx.telegramUser!.telegram_id);
      if (!user) return;

      const analytics = await this.managerToolsService.getTeamAnalytics(user.id);
      const message = this.managerToolsService.formatAnalyticsMessage(analytics, lang);

      await ctx.reply(message, { parse_mode: 'HTML' });
    } catch (error: any) {
      this.logger.error('Error in staff_analytics callback:', error);
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `❌ Ошибка: ${error.message}`
          : `❌ Error: ${error.message}`,
      );
    }
  }

  /**
   * Handle incident type selection callback
   */
  async handleIncidentTypeCallback(ctx: BotContext, incidentType: string): Promise<void> {
    await ctx.answerCbQuery();
    const lang = ctx.telegramUser?.language || TelegramLanguage.RU;

    try {
      // Save incident type to session using tempData
      if (ctx.session) {
        ctx.session.context = {
          ...ctx.session.context,
          tempData: {
            ...ctx.session.context.tempData,
            incidentType,
          },
        };
        ctx.session.state = ConversationState.INCIDENT_MACHINE_SELECTION;
      }

      // Show machine selection
      const machines = await this.machinesService.findAllSimple();
      const buttons = machines.slice(0, 10).map((m) => [
        Markup.button.callback(
          `${m.machine_number} - ${m.location?.name || 'N/A'}`,
          `incident_machine:${m.id}`,
        ),
      ]);
      buttons.push([
        Markup.button.callback(
          lang === TelegramLanguage.RU ? '❌ Отмена' : '❌ Cancel',
          'incident_cancel',
        ),
      ]);

      await ctx.editMessageText(
        lang === TelegramLanguage.RU
          ? `⚠️ <b>Создание инцидента</b>\n\n` +
            `Тип: <b>${this.getIncidentTypeLabel(incidentType, lang)}</b>\n\n` +
            `Выберите аппарат:`
          : `⚠️ <b>Create Incident</b>\n\n` +
            `Type: <b>${this.getIncidentTypeLabel(incidentType, lang)}</b>\n\n` +
            `Select machine:`,
        {
          ...Markup.inlineKeyboard(buttons),
          parse_mode: 'HTML',
        },
      );
    } catch (error: any) {
      this.logger.error('Error in incident_type callback:', error);
    }
  }

  /**
   * Handle incident machine selection callback
   */
  async handleIncidentMachineCallback(ctx: BotContext, machineId: string): Promise<void> {
    await ctx.answerCbQuery();
    const lang = ctx.telegramUser?.language || TelegramLanguage.RU;

    try {
      const tempData = ctx.session?.context?.tempData;
      if (!tempData?.incidentType) {
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '❌ Сначала выберите тип инцидента: /incident'
            : '❌ First select incident type: /incident',
        );
        return;
      }

      // Save machine ID to session using tempData
      ctx.session!.context.tempData = {
        ...tempData,
        machineId,
      };
      ctx.session!.state = ConversationState.INCIDENT_DESCRIPTION_INPUT;

      await ctx.editMessageText(
        lang === TelegramLanguage.RU
          ? `⚠️ <b>Создание инцидента</b>\n\n` +
            `Тип: <b>${this.getIncidentTypeLabel(tempData.incidentType, lang)}</b>\n\n` +
            `📝 Опишите проблему (отправьте текстовое сообщение):`
          : `⚠️ <b>Create Incident</b>\n\n` +
            `Type: <b>${this.getIncidentTypeLabel(tempData.incidentType, lang)}</b>\n\n` +
            `📝 Describe the problem (send a text message):`,
        { parse_mode: 'HTML' },
      );
    } catch (error: any) {
      this.logger.error('Error in incident_machine callback:', error);
    }
  }

  /**
   * Handle cancel incident creation callback
   */
  async handleIncidentCancelCallback(ctx: BotContext): Promise<void> {
    await ctx.answerCbQuery();
    const lang = ctx.telegramUser?.language || TelegramLanguage.RU;

    if (ctx.session) {
      ctx.session.state = ConversationState.IDLE;
      ctx.session.context = {};
    }

    await ctx.editMessageText(
      lang === TelegramLanguage.RU
        ? '❌ Создание инцидента отменено'
        : '❌ Incident creation cancelled',
    );
  }

  // ============================================================================
  // COMMAND HANDLERS
  // ============================================================================

  /**
   * Handler for /incident command - create incident via Telegram
   */
  async handleIncidentCommand(ctx: BotContext): Promise<void> {
    await this.logMessage(ctx, TelegramMessageType.COMMAND, '/incident');

    if (!ctx.telegramUser?.is_verified) {
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
      await ctx.reply(this.t(lang, 'not_verified'));
      return;
    }

    const lang = ctx.telegramUser.language;

    try {
      const user = await this.usersService.findByTelegramId(ctx.telegramUser.telegram_id);
      if (!user) {
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '❌ Пользователь не найден'
            : '❌ User not found',
        );
        return;
      }

      // Get machines for selection
      const machines = await this.machinesService.findAllSimple();

      if (machines.length === 0) {
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '❌ Нет доступных аппаратов'
            : '❌ No machines available',
        );
        return;
      }

      // Show incident type selection
      const message =
        lang === TelegramLanguage.RU
          ? `⚠️ <b>Создание инцидента</b>\n\n` +
            `Выберите тип инцидента:`
          : `⚠️ <b>Create Incident</b>\n\n` +
            `Select incident type:`;

      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('🔴 Поломка', 'incident_type:breakdown'),
          Markup.button.callback('⚫ Офлайн', 'incident_type:offline'),
        ],
        [
          Markup.button.callback('📦 Нет товара', 'incident_type:out_of_stock'),
          Markup.button.callback('💧 Утечка', 'incident_type:leak'),
        ],
        [
          Markup.button.callback('🚨 Вандализм', 'incident_type:vandalism'),
          Markup.button.callback('📋 Другое', 'incident_type:other'),
        ],
        [
          Markup.button.callback(
            lang === TelegramLanguage.RU ? '❌ Отмена' : '❌ Cancel',
            'incident_cancel',
          ),
        ],
      ]);

      await ctx.reply(message, { ...keyboard, parse_mode: 'HTML' });

      // Save state for next step
      if (ctx.session) {
        ctx.session.state = ConversationState.INCIDENT_TYPE_SELECTION;
        ctx.session.context = {
          ...ctx.session.context,
          tempData: { userId: user.id },
        };
      }
    } catch (error: any) {
      this.logger.error('Error in incident command:', error);
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `❌ Ошибка: ${error.message}`
          : `❌ Error: ${error.message}`,
      );
    }
  }

  /**
   * Handler for /stock command - check machine inventory
   */
  async handleStockCommand(ctx: BotContext): Promise<void> {
    await this.logMessage(ctx, TelegramMessageType.COMMAND, '/stock');

    if (!ctx.telegramUser?.is_verified) {
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
      await ctx.reply(this.t(lang, 'not_verified'));
      return;
    }

    const lang = ctx.telegramUser.language;

    try {
      // Parse machine number from command argument
      const messageText = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
      const match = messageText.match(/\/stock\s+(\S+)/);
      const machineNumber = match ? match[1] : null;

      if (!machineNumber) {
        // Show machine selection if no machine specified
        const machines = await this.machinesService.findAllSimple();

        if (machines.length === 0) {
          await ctx.reply(
            lang === TelegramLanguage.RU
              ? '❌ Нет доступных аппаратов'
              : '❌ No machines available',
          );
          return;
        }

        const message =
          lang === TelegramLanguage.RU
            ? `📦 <b>Остатки на аппарате</b>\n\n` +
              `Использование: <code>/stock [номер_машины]</code>\n\n` +
              `Выберите аппарат из списка:`
            : `📦 <b>Machine Inventory</b>\n\n` +
              `Usage: <code>/stock [machine_number]</code>\n\n` +
              `Select machine from list:`;

        // Create buttons for first 10 machines
        const buttons = machines.slice(0, 10).map((m) => [
          Markup.button.callback(
            `${m.machine_number} - ${m.location?.name || 'N/A'}`,
            `stock_machine:${m.id}`,
          ),
        ]);

        await ctx.reply(message, {
          ...Markup.inlineKeyboard(buttons),
          parse_mode: 'HTML',
        });
        return;
      }

      // Find machine by number
      const machines = await this.machinesService.findAllSimple();
      const machine = machines.find(
        (m) => m.machine_number.toLowerCase() === machineNumber.toLowerCase(),
      );

      if (!machine) {
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? `❌ Аппарат "${machineNumber}" не найден`
            : `❌ Machine "${machineNumber}" not found`,
        );
        return;
      }

      // Get inventory for this machine
      await this.sendMachineStockInfo(ctx, machine.id, lang);
    } catch (error: any) {
      this.logger.error('Error in stock command:', error);
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `❌ Ошибка: ${error.message}`
          : `❌ Error: ${error.message}`,
      );
    }
  }

  /**
   * Send machine stock information
   */
  async sendMachineStockInfo(
    ctx: BotContext,
    machineId: string,
    lang: TelegramLanguage,
  ): Promise<void> {
    const machine = await this.machinesService.findOne(machineId);

    if (!machine) {
      await ctx.reply(
        lang === TelegramLanguage.RU ? '❌ Аппарат не найден' : '❌ Machine not found',
      );
      return;
    }

    // Get inventory items for this machine
    const inventoryItems = await this.inventoryService.getMachineInventory(machineId);

    let message =
      lang === TelegramLanguage.RU
        ? `📦 <b>Остатки: ${machine.machine_number}</b>\n` +
          `📍 ${machine.location?.name || 'N/A'}\n\n`
        : `📦 <b>Stock: ${machine.machine_number}</b>\n` +
          `📍 ${machine.location?.name || 'N/A'}\n\n`;

    if (inventoryItems.length === 0) {
      message +=
        lang === TelegramLanguage.RU
          ? '📭 Нет данных об остатках'
          : '📭 No inventory data available';
    } else {
      for (const item of inventoryItems.slice(0, 15)) {
        const maxQty = item.max_capacity || 100;
        const percentage = Math.round((Number(item.current_quantity) / maxQty) * 100);
        const statusEmoji =
          percentage <= 20 ? '🔴' : percentage <= 50 ? '🟡' : '🟢';

        const itemName = item.nomenclature?.name || item.nomenclature_id;
        message +=
          `${statusEmoji} <b>${itemName}</b>\n` +
          `   ${item.current_quantity}/${item.max_capacity || '?'} (${percentage}%)\n`;
      }

      if (inventoryItems.length > 15) {
        message +=
          lang === TelegramLanguage.RU
            ? `\n<i>...и ещё ${inventoryItems.length - 15} позиций</i>`
            : `\n<i>...and ${inventoryItems.length - 15} more items</i>`;
      }
    }

    // Get low stock alerts for this machine
    const lowStockItems = inventoryItems.filter(
      (item) =>
        Number(item.min_stock_level) > 0 &&
        Number(item.current_quantity) <= Number(item.min_stock_level),
    );

    if (lowStockItems.length > 0) {
      message +=
        lang === TelegramLanguage.RU
          ? `\n\n⚠️ <b>Требуется пополнение:</b> ${lowStockItems.length} позиций`
          : `\n\n⚠️ <b>Refill needed:</b> ${lowStockItems.length} items`;
    }

    await ctx.reply(message, {
      parse_mode: 'HTML',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(
            lang === TelegramLanguage.RU ? '🔄 Обновить' : '🔄 Refresh',
            `stock_machine:${machineId}`,
          ),
        ],
      ]),
    });
  }

  /**
   * Handler for /staff command - team status for managers
   */
  async handleStaffCommand(ctx: BotContext): Promise<void> {
    await this.logMessage(ctx, TelegramMessageType.COMMAND, '/staff');

    if (!ctx.telegramUser?.is_verified) {
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
      await ctx.reply(this.t(lang, 'not_verified'));
      return;
    }

    const lang = ctx.telegramUser.language;

    try {
      const user = await this.usersService.findByTelegramId(ctx.telegramUser.telegram_id);

      if (!user) {
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '❌ Пользователь не найден'
            : '❌ User not found',
        );
        return;
      }

      // Check if user is manager/admin
      const managerRoles = [UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER];
      if (!managerRoles.includes(user.role)) {
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '🔒 Эта команда доступна только для менеджеров и администраторов'
            : '🔒 This command is only available for managers and admins',
        );
        return;
      }

      // Show loading
      await ctx.replyWithChatAction('typing');

      // Get team status using manager tools service
      const operatorsStatus = await this.managerToolsService.getActiveOperatorsStatus(user.id);

      if (operatorsStatus.length === 0) {
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '📭 Нет активных операторов'
            : '📭 No active operators',
        );
        return;
      }

      // Format message
      const message = this.managerToolsService.formatOperatorsStatusMessage(
        operatorsStatus,
        lang,
      );

      // Add action buttons
      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback(
            lang === TelegramLanguage.RU ? '🔄 Обновить' : '🔄 Refresh',
            'staff_refresh',
          ),
          Markup.button.callback(
            lang === TelegramLanguage.RU ? '📊 Аналитика' : '📊 Analytics',
            'staff_analytics',
          ),
        ],
      ]);

      await ctx.reply(message, { ...keyboard, parse_mode: 'HTML' });
    } catch (error: any) {
      this.logger.error('Error in staff command:', error);
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `❌ Ошибка: ${error.message}`
          : `❌ Error: ${error.message}`,
      );
    }
  }

  /**
   * Handler for /report command - daily photo report
   */
  async handleReportCommand(ctx: BotContext): Promise<void> {
    await this.logMessage(ctx, TelegramMessageType.COMMAND, '/report');

    if (!ctx.telegramUser?.is_verified) {
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
      await ctx.reply(this.t(lang, 'not_verified'));
      return;
    }

    const lang = ctx.telegramUser.language;

    try {
      const user = await this.usersService.findByTelegramId(ctx.telegramUser.telegram_id);

      if (!user) {
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '❌ Пользователь не найден'
            : '❌ User not found',
        );
        return;
      }

      // Get today's completed tasks for this operator
      const today = new Date();
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);

      const tasks = await this.tasksService.findAll(
        TaskStatus.COMPLETED,
        undefined,
        undefined,
        user.id,
      );

      const todayTasks = tasks.filter(
        (t) =>
          t.completed_at &&
          new Date(t.completed_at) >= todayStart &&
          new Date(t.completed_at) <= todayEnd,
      );

      // Format report
      let message =
        lang === TelegramLanguage.RU
          ? `📋 <b>Отчёт за сегодня</b>\n` +
            `📅 ${today.toLocaleDateString('ru-RU')}\n\n` +
            `👤 ${user.full_name}\n\n`
          : `📋 <b>Today's Report</b>\n` +
            `📅 ${today.toLocaleDateString('en-US')}\n\n` +
            `👤 ${user.full_name}\n\n`;

      if (todayTasks.length === 0) {
        message +=
          lang === TelegramLanguage.RU
            ? '📭 Сегодня нет выполненных задач'
            : '📭 No completed tasks today';
      } else {
        message +=
          lang === TelegramLanguage.RU
            ? `✅ <b>Выполнено задач:</b> ${todayTasks.length}\n\n`
            : `✅ <b>Completed tasks:</b> ${todayTasks.length}\n\n`;

        // Group by type
        const byType: Record<string, number> = {};
        for (const task of todayTasks) {
          byType[task.type_code] = (byType[task.type_code] || 0) + 1;
        }

        for (const [type, count] of Object.entries(byType)) {
          const emoji = this.getTaskTypeEmoji(type as TaskType);
          message += `${emoji} ${this.getTaskTypeLabel(type as TaskType, lang)}: ${count}\n`;
        }

        // Add photos info
        const tasksWithPhotos = todayTasks.filter(
          (t) => t.has_photo_before || t.has_photo_after,
        );
        message +=
          lang === TelegramLanguage.RU
            ? `\n📸 Фото отчётов: ${tasksWithPhotos.length}/${todayTasks.length}`
            : `\n📸 Photo reports: ${tasksWithPhotos.length}/${todayTasks.length}`;
      }

      // Get pending tasks
      const pendingTasks = await this.tasksService.findAll(
        undefined,
        undefined,
        undefined,
        user.id,
      );
      const activeTasks = pendingTasks.filter(
        (t) =>
          t.status === TaskStatus.PENDING ||
          t.status === TaskStatus.ASSIGNED ||
          t.status === TaskStatus.IN_PROGRESS,
      );

      if (activeTasks.length > 0) {
        message +=
          lang === TelegramLanguage.RU
            ? `\n\n⏳ <b>Осталось задач:</b> ${activeTasks.length}`
            : `\n\n⏳ <b>Remaining tasks:</b> ${activeTasks.length}`;
      }

      await ctx.reply(message, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(
              lang === TelegramLanguage.RU ? '📋 Мои задачи' : '📋 My tasks',
              'refresh_tasks',
            ),
          ],
        ]),
      });
    } catch (error: any) {
      this.logger.error('Error in report command:', error);
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `❌ Ошибка: ${error.message}`
          : `❌ Error: ${error.message}`,
      );
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get task type emoji
   */
  getTaskTypeEmoji(type: TaskType): string {
    const emojis: Record<TaskType, string> = {
      [TaskType.REFILL]: '📦',
      [TaskType.COLLECTION]: '💰',
      [TaskType.CLEANING]: '🧹',
      [TaskType.REPAIR]: '🔧',
      [TaskType.INSTALL]: '🔌',
      [TaskType.REMOVAL]: '📤',
      [TaskType.AUDIT]: '📊',
      [TaskType.INSPECTION]: '🔍',
      [TaskType.REPLACE_HOPPER]: '🥤',
      [TaskType.REPLACE_GRINDER]: '⚙️',
      [TaskType.REPLACE_BREW_UNIT]: '☕',
      [TaskType.REPLACE_MIXER]: '🔄',
    };
    return emojis[type] || '📌';
  }

  /**
   * Get task type label
   */
  getTaskTypeLabel(type: TaskType, lang: TelegramLanguage): string {
    const labels: Record<TaskType, { ru: string; en: string }> = {
      [TaskType.REFILL]: { ru: 'Пополнение', en: 'Refill' },
      [TaskType.COLLECTION]: { ru: 'Инкассация', en: 'Collection' },
      [TaskType.CLEANING]: { ru: 'Чистка', en: 'Cleaning' },
      [TaskType.REPAIR]: { ru: 'Ремонт', en: 'Repair' },
      [TaskType.INSTALL]: { ru: 'Установка', en: 'Installation' },
      [TaskType.REMOVAL]: { ru: 'Демонтаж', en: 'Removal' },
      [TaskType.AUDIT]: { ru: 'Аудит', en: 'Audit' },
      [TaskType.INSPECTION]: { ru: 'Проверка', en: 'Inspection' },
      [TaskType.REPLACE_HOPPER]: { ru: 'Замена хоппера', en: 'Hopper replacement' },
      [TaskType.REPLACE_GRINDER]: { ru: 'Замена кофемолки', en: 'Grinder replacement' },
      [TaskType.REPLACE_BREW_UNIT]: { ru: 'Замена заварника', en: 'Brew unit replacement' },
      [TaskType.REPLACE_MIXER]: { ru: 'Замена миксера', en: 'Mixer replacement' },
    };
    return labels[type]?.[lang === TelegramLanguage.RU ? 'ru' : 'en'] || type;
  }

  /**
   * Get incident type label
   */
  getIncidentTypeLabel(type: string, lang: TelegramLanguage): string {
    const labels: Record<string, { ru: string; en: string }> = {
      breakdown: { ru: 'Поломка', en: 'Breakdown' },
      offline: { ru: 'Офлайн', en: 'Offline' },
      out_of_stock: { ru: 'Нет товара', en: 'Out of stock' },
      leak: { ru: 'Утечка', en: 'Leak' },
      vandalism: { ru: 'Вандализм', en: 'Vandalism' },
      other: { ru: 'Другое', en: 'Other' },
    };
    return labels[type]?.[lang === TelegramLanguage.RU ? 'ru' : 'en'] || type;
  }
}
