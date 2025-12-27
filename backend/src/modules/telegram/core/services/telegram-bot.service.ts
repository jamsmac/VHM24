import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Telegraf, Context, Markup } from 'telegraf';
import { TelegramUser, TelegramLanguage } from '../../shared/entities/telegram-user.entity';
import { TelegramSettings } from '../../shared/entities/telegram-settings.entity';
import { TelegramMessageLog, TelegramMessageType } from '../../shared/entities/telegram-message-log.entity';
import { TelegramSessionService, UserSession, ConversationState } from '../../infrastructure/services/telegram-session.service';
import { TelegramCommandHandlerService } from './telegram-command-handler.service';
import { TelegramCallbackHandlerService } from './telegram-callback-handler.service';
import { TelegramTaskCallbackService } from './telegram-task-callback.service';
import { TelegramAdminCallbackService } from './telegram-admin-callback.service';
import { TelegramSprint3Service } from './telegram-sprint3.service';
import { TelegramTaskOperationsService } from './telegram-task-operations.service';
import { TelegramDataCommandsService } from './telegram-data-commands.service';
import { TasksService } from '../../../tasks/tasks.service';
import { UsersService } from '../../../users/users.service';
import { UserRole } from '../../../users/entities/user.entity';
import { MachinesService } from '../../../machines/machines.service';
import { MachineStatus } from '../../../machines/entities/machine.entity';
import { IncidentsService } from '../../../incidents/incidents.service';
import { IncidentStatus } from '../../../incidents/entities/incident.entity';
import { TransactionsService } from '../../../transactions/transactions.service';
import { InventoryService } from '../../../inventory/inventory.service';
import { AccessRequestsService } from '../../../access-requests/access-requests.service';
import { TaskStatus, TaskType } from '../../../tasks/entities/task.entity';
import { TelegramManagerToolsService } from '../../managers/services/telegram-manager-tools.service';
import { startOfDay, endOfDay } from 'date-fns';
import {
  TelegramTaskInfo,
  TelegramMachineInfo,
  TelegramAlertInfo,
  TelegramStatsInfo,
  TelegramPendingUserInfo,
  TelegramMessageOptions,
  TelegramKeyboardRow,
  TranslationValue,
} from '../../shared/types/telegram.types';

interface BotContext extends Context {
  telegramUser?: TelegramUser;
  session?: UserSession;
}

@Injectable()
export class TelegramBotService implements OnModuleInit {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot: Telegraf<BotContext> | null = null;
  private isInitialized = false;

  constructor(
    @InjectRepository(TelegramUser)
    private telegramUserRepository: Repository<TelegramUser>,
    @InjectRepository(TelegramSettings)
    private telegramSettingsRepository: Repository<TelegramSettings>,
    @InjectRepository(TelegramMessageLog)
    private telegramMessageLogRepository: Repository<TelegramMessageLog>,
    private readonly sessionService: TelegramSessionService,
    private readonly commandHandlerService: TelegramCommandHandlerService,
    private readonly callbackHandlerService: TelegramCallbackHandlerService,
    private readonly taskCallbackService: TelegramTaskCallbackService,
    private readonly adminCallbackService: TelegramAdminCallbackService,
    private readonly sprint3Service: TelegramSprint3Service,
    private readonly taskOperationsService: TelegramTaskOperationsService,
    private readonly dataCommandsService: TelegramDataCommandsService,
    private readonly tasksService: TasksService,
    private readonly usersService: UsersService,
    private readonly machinesService: MachinesService,
    private readonly incidentsService: IncidentsService,
    private readonly transactionsService: TransactionsService,
    private readonly inventoryService: InventoryService,
    private readonly accessRequestsService: AccessRequestsService,
    private readonly managerToolsService: TelegramManagerToolsService,
  ) {}

  async onModuleInit() {
    try {
      await this.initializeBot();
    } catch (error) {
      this.logger.error('Failed to initialize Telegram bot', error);
    }
  }

  async initializeBot(): Promise<void> {
    try {
      const settings = await this.telegramSettingsRepository.findOne({
        where: { setting_key: 'default' },
      });

      if (!settings || !settings.bot_token || !settings.is_active) {
        this.logger.warn('Telegram bot not configured or inactive');
        return;
      }

      this.bot = new Telegraf<BotContext>(settings.bot_token);

      // Middleware to load user data and session
      this.bot.use(async (ctx, next) => {
        if (ctx.from) {
          // Load telegram user
          const telegramUser = await this.telegramUserRepository.findOne({
            where: { telegram_id: ctx.from.id.toString() },
          });
          ctx.telegramUser = telegramUser ?? undefined;

          // Load or create session
          if (telegramUser && telegramUser.is_verified) {
            let session = await this.sessionService.getSession(telegramUser.user_id);

            if (!session) {
              // Create new session
              await this.sessionService.saveSession(telegramUser.user_id, {
                userId: telegramUser.user_id,
                chatId: ctx.chat?.id.toString() || '',
                telegramId: ctx.from.id.toString(),
                state: ConversationState.IDLE,
                context: {},
              });

              session = await this.sessionService.getSession(telegramUser.user_id);
            }

            ctx.session = session ?? undefined;
          }
        }
        await next();

        // Save session after handler completes
        if (ctx.session && ctx.telegramUser) {
          await this.sessionService.saveSession(ctx.telegramUser.user_id, ctx.session);
        }
      });

      // Initialize command handler with helper methods
      this.commandHandlerService.setHelpers({
        t: this.t.bind(this),
        getMainMenuKeyboard: this.getMainMenuKeyboard.bind(this),
        getVerificationKeyboard: this.getVerificationKeyboard.bind(this),
        formatTasksMessage: this.formatTasksMessage.bind(this),
        formatMachinesMessage: this.formatMachinesMessage.bind(this),
        formatAlertsMessage: this.formatAlertsMessage.bind(this),
        formatStatsMessage: this.formatStatsMessage.bind(this),
        getTasksKeyboard: this.getTasksKeyboard.bind(this),
        getMachinesKeyboard: this.getMachinesKeyboard.bind(this),
        getAlertsKeyboard: this.getAlertsKeyboard.bind(this),
        notifyAdminAboutNewUser: (userId: string, telegramFrom: { id: number; first_name?: string; last_name?: string; username?: string }) =>
          this.adminCallbackService.notifyAdminAboutNewUser(userId, telegramFrom, this.sendMessage.bind(this)),
      });

      // Initialize callback handler with helper methods
      this.callbackHandlerService.setHelpers({
        t: this.t.bind(this),
        getMainMenuKeyboard: this.getMainMenuKeyboard.bind(this),
        getSettingsKeyboard: this.getSettingsKeyboard.bind(this),
        getNotificationSettingsKeyboard: this.getNotificationSettingsKeyboard.bind(this),
        handleMachinesCommand: (ctx) => this.dataCommandsService.handleMachinesCommand(ctx),
        handleAlertsCommand: (ctx) => this.dataCommandsService.handleAlertsCommand(ctx),
        handleStatsCommand: (ctx) => this.dataCommandsService.handleStatsCommand(ctx),
        handleTasksCommand: (ctx) => this.dataCommandsService.handleTasksCommand(ctx),
        toggleNotification: this.toggleNotification.bind(this),
      });

      // Initialize Sprint 3 service with helper methods
      this.sprint3Service.setHelpers({
        t: this.t.bind(this),
        logMessage: this.logMessage.bind(this),
      });

      // Initialize Task Operations service with helper methods
      this.taskOperationsService.setHelpers({
        t: this.t.bind(this),
        logMessage: this.logMessage.bind(this),
        handleTasksCommand: (ctx) => this.dataCommandsService.handleTasksCommand(ctx),
        handleMachinesCommand: (ctx) => this.dataCommandsService.handleMachinesCommand(ctx),
        handleStatsCommand: (ctx) => this.dataCommandsService.handleStatsCommand(ctx),
      });

      // Initialize Data Commands service with helper methods
      this.dataCommandsService.setHelpers({
        t: this.t.bind(this),
        logMessage: this.logMessage.bind(this),
        formatMachinesMessage: this.formatMachinesMessage.bind(this),
        formatAlertsMessage: this.formatAlertsMessage.bind(this),
        formatStatsMessage: this.formatStatsMessage.bind(this),
        formatTasksMessage: this.formatTasksMessage.bind(this),
        getMachinesKeyboard: this.getMachinesKeyboard.bind(this),
        getAlertsKeyboard: this.getAlertsKeyboard.bind(this),
        getTasksKeyboard: this.getTasksKeyboard.bind(this),
      });

      this.setupCommands();
      this.setupCallbacks();
      await this.setupBotMenu();

      await this.bot.launch();
      this.isInitialized = true;
      this.logger.log('Telegram bot initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize bot', error);
      throw error;
    }
  }

  /**
   * Setup persistent menu with bot commands
   */
  private async setupBotMenu(): Promise<void> {
    if (!this.bot) return;

    try {
      // Set up menu for Russian language
      await this.bot.telegram.setMyCommands(
        [
          { command: 'start', description: '🏠 Главное меню' },
          { command: 'tasks', description: '📋 Мои задачи' },
          { command: 'machines', description: '🖥 Аппараты' },
          { command: 'stock', description: '📦 Остатки на машине' },
          { command: 'incident', description: '⚠️ Создать инцидент' },
          { command: 'stats', description: '📊 Статистика' },
          { command: 'alerts', description: '🔔 Уведомления' },
          { command: 'staff', description: '👥 Статус сотрудников' },
          { command: 'language', description: '🌐 Сменить язык' },
          { command: 'help', description: '❓ Справка' },
        ],
        { language_code: 'ru' },
      );

      // Set up menu for English language
      await this.bot.telegram.setMyCommands(
        [
          { command: 'start', description: '🏠 Main menu' },
          { command: 'tasks', description: '📋 My tasks' },
          { command: 'machines', description: '🖥 Machines' },
          { command: 'stock', description: '📦 Machine inventory' },
          { command: 'incident', description: '⚠️ Report incident' },
          { command: 'stats', description: '📊 Statistics' },
          { command: 'alerts', description: '🔔 Alerts' },
          { command: 'staff', description: '👥 Staff status' },
          { command: 'language', description: '🌐 Change language' },
          { command: 'help', description: '❓ Help' },
        ],
        { language_code: 'en' },
      );

      this.logger.log('Bot menu commands set successfully');
    } catch (error) {
      this.logger.error('Failed to set bot menu commands', error);
    }
  }

  private setupCommands(): void {
    if (!this.bot) return;

    // ============================================================================
    // DELEGATED COMMANDS (handled by TelegramCommandHandlerService)
    // ============================================================================

    // Start command - welcome and access request
    this.bot.command('start', async (ctx) => {
      await this.commandHandlerService.handleStartCommand(ctx);
    });

    // Main menu command
    this.bot.command('menu', async (ctx) => {
      await this.commandHandlerService.handleMenuCommand(ctx);
    });

    // Machines command
    this.bot.command('machines', async (ctx) => {
      await this.commandHandlerService.handleMachinesCommand(ctx);
    });

    // Alerts command
    this.bot.command('alerts', async (ctx) => {
      await this.commandHandlerService.handleAlertsCommand(ctx);
    });

    // Stats command
    this.bot.command('stats', async (ctx) => {
      await this.commandHandlerService.handleStatsCommand(ctx);
    });

    // Help command
    this.bot.command('help', async (ctx) => {
      await this.commandHandlerService.handleHelpCommand(ctx);
    });

    // Language command
    this.bot.command('language', async (ctx) => {
      await this.commandHandlerService.handleLanguageCommand(ctx);
    });

    // ============================================================================
    // SUPER ADMIN COMMANDS (Команды для супер администратора)
    // ============================================================================

    // Pending users command (super admin only)
    this.bot.command('pending_users', async (ctx) => {
      await this.adminCallbackService.handlePendingUsersCommand(
        ctx,
        this.logMessage.bind(this),
      );
    });

    // ============================================================================
    // TASKS COMMANDS (Команды для работы с задачами)
    // ============================================================================

    // Tasks list command
    this.bot.command('tasks', async (ctx) => {
      await this.commandHandlerService.handleTasksCommand(ctx);
    });

    // Start task command (delegated to TelegramTaskOperationsService)
    this.bot.command('start_task', async (ctx) => {
      await this.taskOperationsService.handleStartTaskCommand(ctx);
    });

    // Complete task command (delegated to TelegramTaskOperationsService)
    this.bot.command('complete_task', async (ctx) => {
      await this.taskOperationsService.handleCompleteTaskCommand(ctx);
    });

    // Photo handler for task photos (delegated to TelegramTaskOperationsService)
    this.bot.on('photo', async (ctx) => {
      await this.taskOperationsService.handlePhotoUpload(ctx);
    });

    // Voice message handler for voice commands (delegated to TelegramTaskOperationsService)
    this.bot.on('voice', async (ctx) => {
      await this.taskOperationsService.handleVoiceMessage(ctx);
    });

    // ============================================================================
    // SPRINT 3: NEW COMMANDS (delegated to TelegramSprint3Service)
    // ============================================================================

    // Incident command - create incident via bot
    this.bot.command('incident', async (ctx) => {
      await this.sprint3Service.handleIncidentCommand(ctx);
    });

    // Stock command - check machine inventory
    this.bot.command('stock', async (ctx) => {
      await this.sprint3Service.handleStockCommand(ctx);
    });

    // Staff command - team status for managers
    this.bot.command('staff', async (ctx) => {
      await this.sprint3Service.handleStaffCommand(ctx);
    });

    // Report command - daily photo report
    this.bot.command('report', async (ctx) => {
      await this.sprint3Service.handleReportCommand(ctx);
    });
  }

  private setupCallbacks(): void {
    if (!this.bot) return;

    // ============================================================================
    // DELEGATED CALLBACKS (handled by TelegramCallbackHandlerService)
    // ============================================================================

    // Language selection callbacks
    this.bot.action('lang_ru', async (ctx) => {
      await this.callbackHandlerService.handleLanguageRu(ctx);
    });

    this.bot.action('lang_en', async (ctx) => {
      await this.callbackHandlerService.handleLanguageEn(ctx);
    });

    // Main menu callbacks
    this.bot.action('menu_machines', async (ctx) => {
      await this.callbackHandlerService.handleMenuMachines(ctx);
    });

    this.bot.action('menu_alerts', async (ctx) => {
      await this.callbackHandlerService.handleMenuAlerts(ctx);
    });

    this.bot.action('menu_stats', async (ctx) => {
      await this.callbackHandlerService.handleMenuStats(ctx);
    });

    this.bot.action('menu_settings', async (ctx) => {
      await this.callbackHandlerService.handleMenuSettings(ctx);
    });

    this.bot.action('back_to_menu', async (ctx) => {
      await this.callbackHandlerService.handleBackToMenu(ctx);
    });

    // Settings callbacks
    this.bot.action('settings_notifications', async (ctx) => {
      await this.callbackHandlerService.handleSettingsNotifications(ctx);
    });

    this.bot.action('settings_language', async (ctx) => {
      await this.callbackHandlerService.handleSettingsLanguage(ctx);
    });

    // Notification toggle callbacks
    const notificationTypes = [
      'machine_offline',
      'machine_online',
      'low_stock',
      'maintenance_due',
      'equipment_needs_maintenance',
      'task_assigned',
    ];

    notificationTypes.forEach((type) => {
      this.bot!.action(`toggle_${type}`, async (ctx) => {
        await this.callbackHandlerService.handleNotificationToggle(ctx, type);
      });
    });

    // Task callbacks
    this.bot.action('refresh_tasks', async (ctx) => {
      await this.callbackHandlerService.handleRefreshTasks(ctx);
    });

    // ============================================================================
    // TASK STEP CALLBACKS (delegated to TelegramTaskCallbackService)
    // ============================================================================

    // Task start callback (from inline button)
    this.bot.action(/task_start_(.+)/, async (ctx) => {
      const taskId = ctx.match[1];
      await this.taskCallbackService.handleTaskStart(ctx, taskId);
    });

    // Handle "Done" button - mark step as completed
    this.bot.action(/^step_done_(.+)_(\d+)$/, async (ctx) => {
      const taskId = ctx.match[1];
      const stepIndex = parseInt(ctx.match[2], 10);
      await this.taskCallbackService.handleStepDone(ctx, taskId, stepIndex);
    });

    // Handle "Skip" button - skip current step
    this.bot.action(/^step_skip_(.+)_(\d+)$/, async (ctx) => {
      const taskId = ctx.match[1];
      const stepIndex = parseInt(ctx.match[2], 10);
      await this.taskCallbackService.handleStepSkip(ctx, taskId, stepIndex);
    });

    // Handle "Back" button - go to previous step
    this.bot.action(/^step_back_(.+)$/, async (ctx) => {
      const taskId = ctx.match[1];
      await this.taskCallbackService.handleStepBack(ctx, taskId);
    });

    // ============================================================================
    // SUPER ADMIN APPROVAL CALLBACKS (delegated to TelegramAdminCallbackService)
    // ============================================================================

    // Expand user details to show role selection
    this.bot.action(/^expand_user_(.+)$/, async (ctx) => {
      const userId = ctx.match[1];
      await this.adminCallbackService.handleExpandUser(ctx, userId);
    });

    // Role selection for user approval
    this.bot.action(/^approve_user_(.+)_role_(.+)$/, async (ctx) => {
      const userId = ctx.match[1];
      const role = ctx.match[2] as UserRole;
      await this.adminCallbackService.handleApproveUser(
        ctx,
        userId,
        role,
        this.sendMessage.bind(this),
      );
    });

    // Reject user action
    this.bot.action(/^reject_user_(.+)$/, async (ctx) => {
      const userId = ctx.match[1];
      await this.adminCallbackService.handleRejectUser(ctx, userId);
    });

    // Refresh pending users list
    this.bot.action('refresh_pending_users', async (ctx) => {
      await this.adminCallbackService.handleRefreshPendingUsers(ctx);
    });

    // ============================================================================
    // SPRINT 3: CALLBACK HANDLERS (delegated to TelegramSprint3Service)
    // ============================================================================

    // Stock machine selection callback
    this.bot.action(/^stock_machine:(.+)$/, async (ctx) => {
      const machineId = ctx.match[1];
      await this.sprint3Service.handleStockMachineCallback(ctx, machineId);
    });

    // Staff refresh callback
    this.bot.action('staff_refresh', async (ctx) => {
      await this.sprint3Service.handleStaffRefreshCallback(ctx);
    });

    // Staff analytics callback
    this.bot.action('staff_analytics', async (ctx) => {
      await this.sprint3Service.handleStaffAnalyticsCallback(ctx);
    });

    // Incident type selection callback
    this.bot.action(/^incident_type:(.+)$/, async (ctx) => {
      const incidentType = ctx.match[1];
      await this.sprint3Service.handleIncidentTypeCallback(ctx, incidentType);
    });

    // Incident machine selection callback
    this.bot.action(/^incident_machine:(.+)$/, async (ctx) => {
      const machineId = ctx.match[1];
      await this.sprint3Service.handleIncidentMachineCallback(ctx, machineId);
    });

    // Cancel incident creation
    this.bot.action('incident_cancel', async (ctx) => {
      await this.sprint3Service.handleIncidentCancelCallback(ctx);
    });
  }

  // Note: handleMachinesCommand, handleAlertsCommand, handleStatsCommand, handleTasksCommand
  // moved to TelegramDataCommandsService

  /**
   * Handle text messages for rejection reasons and other inputs
   */
  private async handleTextMessage(ctx: BotContext): Promise<void> {
    if (!ctx.telegramUser?.is_verified) {
      return; // Ignore messages from unverified users
    }

    const messageText = ctx.message && 'text' in ctx.message ? ctx.message.text : '';

    try {
      // Check if admin is waiting for rejection reason (delegated to TelegramAdminCallbackService)
      const handled = await this.adminCallbackService.handleRejectUserInput(
        ctx,
        messageText,
        this.sendMessage.bind(this),
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

  // Helper methods for keyboards
  private getMainMenuKeyboard(lang: TelegramLanguage) {
    return Markup.inlineKeyboard([
      [
        Markup.button.callback(`🖥 ${this.t(lang, 'machines')}`, 'menu_machines'),
        Markup.button.callback(`🔔 ${this.t(lang, 'alerts')}`, 'menu_alerts'),
      ],
      [
        Markup.button.callback(`📊 ${this.t(lang, 'stats')}`, 'menu_stats'),
        Markup.button.callback(`⚙️ ${this.t(lang, 'settings')}`, 'menu_settings'),
      ],
    ]);
  }

  private getVerificationKeyboard(lang: TelegramLanguage) {
    return Markup.inlineKeyboard([
      [
        Markup.button.url(
          this.t(lang, 'open_web_app'),
          process.env.FRONTEND_URL || 'https://vendhub.com',
        ),
      ],
    ]);
  }

  private getSettingsKeyboard(lang: TelegramLanguage) {
    return Markup.inlineKeyboard([
      [Markup.button.callback(`🔔 ${this.t(lang, 'notifications')}`, 'settings_notifications')],
      [Markup.button.callback(`🌐 ${this.t(lang, 'language')}`, 'settings_language')],
      [Markup.button.callback(this.t(lang, 'back'), 'back_to_menu')],
    ]);
  }

  private getNotificationSettingsKeyboard(lang: TelegramLanguage, user: TelegramUser) {
    const prefs = user.notification_preferences || {};

    return Markup.inlineKeyboard([
      [
        Markup.button.callback(
          `${prefs.machine_offline ? '✅' : '⬜'} ${this.t(lang, 'notif_machine_offline')}`,
          'toggle_machine_offline',
        ),
      ],
      [
        Markup.button.callback(
          `${prefs.low_stock ? '✅' : '⬜'} ${this.t(lang, 'notif_low_stock')}`,
          'toggle_low_stock',
        ),
      ],
      [
        Markup.button.callback(
          `${prefs.maintenance_due ? '✅' : '⬜'} ${this.t(lang, 'notif_maintenance_due')}`,
          'toggle_maintenance_due',
        ),
      ],
      [
        Markup.button.callback(
          `${prefs.task_assigned ? '✅' : '⬜'} ${this.t(lang, 'notif_task_assigned')}`,
          'toggle_task_assigned',
        ),
      ],
      [Markup.button.callback(this.t(lang, 'back'), 'menu_settings')],
    ]);
  }

  private getMachinesKeyboard(machines: TelegramMachineInfo[], lang: TelegramLanguage) {
    const buttons = machines
      .slice(0, 5)
      .map((machine) => [
        Markup.button.callback(
          `${machine.status === 'online' ? '🟢' : '🔴'} ${machine.name}`,
          `view_machine_${machine.id}`,
        ),
      ]);

    buttons.push([Markup.button.callback(this.t(lang, 'back'), 'back_to_menu')]);

    return Markup.inlineKeyboard(buttons);
  }

  private getAlertsKeyboard(alerts: TelegramAlertInfo[], lang: TelegramLanguage) {
    const buttons = alerts
      .slice(0, 5)
      .map((alert) => [
        Markup.button.callback(`✓ ${this.t(lang, 'acknowledge')}`, `ack_alert_${alert.id}`),
      ]);

    buttons.push([Markup.button.callback(this.t(lang, 'back'), 'back_to_menu')]);

    return Markup.inlineKeyboard(buttons);
  }

  // Helper methods for message formatting
  private formatTasksMessage(tasks: TelegramTaskInfo[], lang: TelegramLanguage): string {
    const header = `<b>📋 ${lang === TelegramLanguage.RU ? 'Мои задачи' : 'My Tasks'}</b>\n\n`;

    const tasksList = tasks
      .map((task, index) => {
        const statusIcon =
          (
            {
              [TaskStatus.PENDING]: '⏳',
              [TaskStatus.ASSIGNED]: '📌',
              [TaskStatus.IN_PROGRESS]: '🔄',
            } as Record<string, string>
          )[task.status] || '❓';

        const typeIcon =
          (
            {
              [TaskType.REFILL]: '📦',
              [TaskType.COLLECTION]: '💰',
              [TaskType.INSPECTION]: '👁',
              [TaskType.REPAIR]: '🔧',
            } as Record<string, string>
          )[task.type_code] || '📋';

        const typeLabel =
          (
            {
              [TaskType.REFILL]: lang === TelegramLanguage.RU ? 'Пополнение' : 'Refill',
              [TaskType.COLLECTION]: lang === TelegramLanguage.RU ? 'Инкассация' : 'Collection',
              [TaskType.INSPECTION]: lang === TelegramLanguage.RU ? 'Проверка' : 'Inspection',
              [TaskType.REPAIR]: lang === TelegramLanguage.RU ? 'Ремонт' : 'Repair',
            } as Record<string, string>
          )[task.type_code] || task.type_code;

        const machineInfo = task.machine
          ? `${task.machine.machine_number} • ${task.machine.location?.name || 'N/A'}`
          : 'N/A';

        const dateStr = task.scheduled_date
          ? new Date(task.scheduled_date).toLocaleDateString(
              lang === TelegramLanguage.RU ? 'ru-RU' : 'en-US',
              { day: 'numeric', month: 'short' },
            )
          : 'N/A';

        return (
          `${index + 1}. ${statusIcon} ${typeIcon} <b>${typeLabel}</b>\n` +
          `   🎯 ${machineInfo}\n` +
          `   📅 ${dateStr}`
        );
      })
      .join('\n\n');

    const footer =
      lang === TelegramLanguage.RU
        ? `\n\n<i>💡 Нажмите кнопку ниже чтобы начать задачу</i>`
        : `\n\n<i>💡 Tap a button below to start a task</i>`;

    return header + tasksList + footer;
  }

  private getTasksKeyboard(tasks: TelegramTaskInfo[], lang: TelegramLanguage) {
    const buttons: TelegramKeyboardRow[] = [];

    // Add buttons for up to 8 tasks (Telegram limit for inline keyboard)
    tasks.slice(0, 8).forEach((task, index) => {
      const typeIcon =
        (
          {
            [TaskType.REFILL]: '📦',
            [TaskType.COLLECTION]: '💰',
            [TaskType.REPAIR]: '🔧',
            [TaskType.INSPECTION]: '👁',
          } as Record<string, string>
        )[task.type_code] || '📋';

      const statusIcon =
        (
          {
            [TaskStatus.PENDING]: '⏳',
            [TaskStatus.ASSIGNED]: '📌',
            [TaskStatus.IN_PROGRESS]: '🔄',
          } as Record<string, string>
        )[task.status] || '';

      const buttonText =
        task.status === TaskStatus.IN_PROGRESS
          ? lang === TelegramLanguage.RU
            ? `${statusIcon} Продолжить`
            : `${statusIcon} Continue`
          : lang === TelegramLanguage.RU
            ? `▶️ Начать`
            : `▶️ Start`;

      const machineLabel = task.machine?.machine_number || `#${index + 1}`;

      buttons.push([
        Markup.button.callback(
          `${typeIcon} ${machineLabel} - ${buttonText}`,
          `task_start_${task.id}`,
        ),
      ]);
    });

    // Add refresh and navigation buttons
    const navButtons = [];

    if (tasks.length > 8) {
      navButtons.push(
        Markup.button.callback(
          lang === TelegramLanguage.RU
            ? `📋 Все задачи (${tasks.length})`
            : `📋 All tasks (${tasks.length})`,
          'tasks_show_all',
        ),
      );
    }

    navButtons.push(
      Markup.button.callback(
        lang === TelegramLanguage.RU ? '🔄 Обновить' : '🔄 Refresh',
        'refresh_tasks',
      ),
    );

    buttons.push(navButtons);

    return Markup.inlineKeyboard(buttons);
  }

  private formatMachinesMessage(machines: TelegramMachineInfo[], lang: TelegramLanguage): string {
    const header = `<b>🖥 ${this.t(lang, 'machines')}</b>\n\n`;

    const machinesList = machines
      .map((m) => {
        const statusIcon = m.status === 'online' ? '🟢' : '🔴';
        const statusText = m.status === 'online' ? this.t(lang, 'online') : this.t(lang, 'offline');

        return (
          `${statusIcon} <b>${m.name}</b>\n` + `   📍 ${m.location}\n` + `   Status: ${statusText}`
        );
      })
      .join('\n\n');

    return header + machinesList;
  }

  private formatAlertsMessage(alerts: TelegramAlertInfo[], lang: TelegramLanguage): string {
    if (alerts.length === 0) {
      return `<b>🔔 ${this.t(lang, 'alerts')}</b>\n\n${this.t(lang, 'no_alerts')} ✓`;
    }

    const header = `<b>🔔 ${this.t(lang, 'alerts')}</b>\n\n`;

    const alertsList = alerts
      .map((a) => {
        const typeIcon = a.type === 'offline' ? '🔴' : '⚠️';
        const typeText = this.t(lang, `alert_${a.type}`);

        return (
          `${typeIcon} <b>${typeText}</b>\n` + `   Machine: ${a.machine}\n` + `   Time: ${a.time}`
        );
      })
      .join('\n\n');

    return header + alertsList;
  }

  private formatStatsMessage(stats: TelegramStatsInfo, lang: TelegramLanguage): string {
    return (
      `<b>📊 ${this.t(lang, 'statistics')}</b>\n\n` +
      `🖥 ${this.t(lang, 'total_machines')}: ${stats.total_machines}\n` +
      `🟢 ${this.t(lang, 'online')}: ${stats.online}\n` +
      `🔴 ${this.t(lang, 'offline')}: ${stats.offline}\n\n` +
      `💰 ${this.t(lang, 'today_revenue')}: ₽${stats.today_revenue.toLocaleString()}\n` +
      `☕ ${this.t(lang, 'today_sales')}: ${stats.today_sales}\n\n` +
      `📋 ${this.t(lang, 'pending_tasks')}: ${stats.pending_tasks}`
    );
  }

  // Utility methods
  private async updateUserLanguage(ctx: BotContext, language: TelegramLanguage): Promise<void> {
    if (ctx.telegramUser) {
      ctx.telegramUser.language = language;
      await this.telegramUserRepository.save(ctx.telegramUser);
    }
  }

  private async toggleNotification(ctx: BotContext, notificationType: string): Promise<void> {
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
    await ctx.answerCbQuery(this.t(lang, 'settings_updated'));

    await ctx.editMessageText(
      this.t(lang, 'notification_settings'),
      this.getNotificationSettingsKeyboard(lang, ctx.telegramUser),
    );
  }

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
      this.logger.error('Failed to log message', error);
    }
  }

  // Translation helper
  private t(lang: TelegramLanguage, key: string, ...args: string[]): string {
    const translations = {
      ru: {
        welcome_back: (name: string) => `Привет снова, ${name}! 👋\n\nЧто вы хотите сделать?`,
        welcome_new: (name: string) =>
          `Добро пожаловать, ${name}! 👋\n\n` +
          `Для использования бота необходимо связать ваш Telegram аккаунт.\n\n` +
          `Откройте веб-приложение VendHub и следуйте инструкциям для получения кода верификации.`,
        not_verified: '🔒 Пожалуйста, сначала свяжите ваш аккаунт через веб-приложение.',
        access_request_created: (name: string) =>
          `Здравствуйте, ${name}! 👋\n\n` +
          `✅ Ваша заявка на доступ отправлена администратору.\n\n` +
          `Как только ваша заявка будет одобрена, вы получите уведомление и сможете начать работу с системой.\n\n` +
          `⏳ Пожалуйста, подождите...`,
        access_request_pending:
          `⏳ Ваша заявка на доступ ожидает одобрения администратором.\n\n` +
          `Пожалуйста, дождитесь уведомления.\n\n` +
          `Обычно это занимает от нескольких минут до нескольких часов.`,
        access_request_error:
          `❌ Произошла ошибка при создании заявки.\n\n` +
          `Пожалуйста, попробуйте позже или свяжитесь с администратором.`,
        main_menu: '📱 <b>Главное меню</b>\n\nВыберите действие:',
        machines: 'Машины',
        alerts: 'Уведомления',
        stats: 'Статистика',
        settings: 'Настройки',
        open_web_app: '🌐 Открыть VendHub',
        settings_menu: '⚙️ <b>Настройки</b>\n\nВыберите раздел:',
        notifications: 'Уведомления',
        language: 'Язык',
        back: '« Назад',
        notification_settings:
          '🔔 <b>Настройки уведомлений</b>\n\nВключите или отключите типы уведомлений:',
        notif_machine_offline: 'Машина оффлайн',
        notif_low_stock: 'Низкий запас',
        notif_maintenance_due: 'Требуется обслуживание',
        notif_task_assigned: 'Новая задача',
        settings_updated: '✓ Настройки обновлены',
        online: 'Онлайн',
        offline: 'Оффлайн',
        no_alerts: 'Нет активных уведомлений',
        alert_offline: 'Машина оффлайн',
        alert_low_stock: 'Низкий запас',
        acknowledge: 'Подтвердить',
        statistics: 'Статистика',
        total_machines: 'Всего машин',
        today_revenue: 'Выручка сегодня',
        today_sales: 'Продаж сегодня',
        pending_tasks: 'Задач в работе',
        refresh: '🔄 Обновить',
        help:
          '<b>📖 Справка</b>\n\n' +
          '<b>Команды:</b>\n' +
          '/menu - Главное меню\n' +
          '/machines - Список машин\n' +
          '/alerts - Активные уведомления\n' +
          '/stats - Статистика\n' +
          '/language - Изменить язык\n' +
          '/help - Справка',
      },
      en: {
        welcome_back: (name: string) => `Welcome back, ${name}! 👋\n\nWhat would you like to do?`,
        welcome_new: (name: string) =>
          `Welcome, ${name}! 👋\n\n` +
          `To use this bot, you need to link your Telegram account.\n\n` +
          `Open the VendHub web app and follow the instructions to get your verification code.`,
        not_verified: '🔒 Please link your account via the web app first.',
        access_request_created: (name: string) =>
          `Hello, ${name}! 👋\n\n` +
          `✅ Your access request has been sent to the administrator.\n\n` +
          `Once your request is approved, you will receive a notification and can start working with the system.\n\n` +
          `⏳ Please wait...`,
        access_request_pending:
          `⏳ Your access request is pending administrator approval.\n\n` +
          `Please wait for notification.\n\n` +
          `This usually takes from a few minutes to several hours.`,
        access_request_error:
          `❌ An error occurred while creating the request.\n\n` +
          `Please try again later or contact the administrator.`,
        main_menu: '📱 <b>Main Menu</b>\n\nChoose an action:',
        machines: 'Machines',
        alerts: 'Alerts',
        stats: 'Statistics',
        settings: 'Settings',
        open_web_app: '🌐 Open VendHub',
        settings_menu: '⚙️ <b>Settings</b>\n\nChoose a section:',
        notifications: 'Notifications',
        language: 'Language',
        back: '« Back',
        notification_settings:
          '🔔 <b>Notification Settings</b>\n\nEnable or disable notification types:',
        notif_machine_offline: 'Machine offline',
        notif_low_stock: 'Low stock',
        notif_maintenance_due: 'Maintenance due',
        notif_task_assigned: 'New task',
        settings_updated: '✓ Settings updated',
        online: 'Online',
        offline: 'Offline',
        no_alerts: 'No active alerts',
        alert_offline: 'Machine offline',
        alert_low_stock: 'Low stock',
        acknowledge: 'Acknowledge',
        statistics: 'Statistics',
        total_machines: 'Total machines',
        today_revenue: 'Today revenue',
        today_sales: 'Today sales',
        pending_tasks: 'Pending tasks',
        refresh: '🔄 Refresh',
        help:
          '<b>📖 Help</b>\n\n' +
          '<b>Commands:</b>\n' +
          '/menu - Main menu\n' +
          '/machines - Machine list\n' +
          '/alerts - Active alerts\n' +
          '/stats - Statistics\n' +
          '/language - Change language\n' +
          '/help - Help',
      },
    };

    // Fallback to 'ru' if language not found (e.g., 'uz' not implemented yet)
    const langKey = (lang in translations ? lang : TelegramLanguage.RU) as 'ru' | 'en';
    const translationMap = translations[langKey] as Record<string, TranslationValue>;
    const translation = translationMap[key];

    if (typeof translation === 'function') {
      return translation(...args);
    }

    return translation || key;
  }

  // Public methods for external use
  async sendMessage(
    chatId: string,
    message: string,
    keyboard?: TelegramMessageOptions,
  ): Promise<void> {
    if (!this.bot) {
      throw new Error('Bot not initialized');
    }

    try {
      await this.bot.telegram.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        ...keyboard,
      });
    } catch (error) {
      this.logger.error(`Failed to send message to ${chatId}`, error);
      throw error;
    }
  }

  async sendNotification(
    userId: string,
    message: string,
    keyboard?: TelegramMessageOptions,
  ): Promise<void> {
    const telegramUser = await this.telegramUserRepository.findOne({
      where: { user_id: userId, is_verified: true },
    });

    if (!telegramUser) {
      this.logger.warn(`No verified Telegram user found for user ${userId}`);
      return;
    }

    await this.sendMessage(telegramUser.chat_id, message, keyboard);
  }

  isReady(): boolean {
    return this.isInitialized && this.bot !== null;
  }

  async stopBot(): Promise<void> {
    if (this.bot) {
      await this.bot.stop();
      this.bot = null;
      this.isInitialized = false;
      this.logger.log('Telegram bot stopped');
    }
  }
}
