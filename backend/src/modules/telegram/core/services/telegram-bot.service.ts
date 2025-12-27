import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Telegraf, Context, Markup } from 'telegraf';
import { TelegramUser, TelegramLanguage } from '../../shared/entities/telegram-user.entity';
import { TelegramSettings } from '../../shared/entities/telegram-settings.entity';
import { TelegramMessageLog, TelegramMessageType } from '../../shared/entities/telegram-message-log.entity';
import { TelegramSessionService, UserSession, ConversationState } from '../../infrastructure/services/telegram-session.service';
import { TelegramVoiceService } from '../../media/services/telegram-voice.service';
import { TelegramCommandHandlerService } from './telegram-command-handler.service';
import { TelegramCallbackHandlerService } from './telegram-callback-handler.service';
import { TelegramTaskCallbackService } from './telegram-task-callback.service';
import { TelegramAdminCallbackService } from './telegram-admin-callback.service';
import { TelegramSprint3Service } from './telegram-sprint3.service';
import { TasksService } from '../../../tasks/tasks.service';
import { FilesService } from '../../../files/files.service';
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

/**
 * Task execution state for step-by-step guidance
 * Stored in task.metadata.telegram_execution_state
 */
interface TaskExecutionState {
  current_step: number; // Current checklist step index (0-based)
  checklist_progress: Record<
    number,
    {
      completed: boolean;
      completed_at?: string;
      notes?: string;
    }
  >;
  photos_uploaded: {
    before: boolean;
    after: boolean;
  };
  started_at: string;
  last_interaction_at: string;
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
    private readonly voiceService: TelegramVoiceService,
    private readonly commandHandlerService: TelegramCommandHandlerService,
    private readonly callbackHandlerService: TelegramCallbackHandlerService,
    private readonly taskCallbackService: TelegramTaskCallbackService,
    private readonly adminCallbackService: TelegramAdminCallbackService,
    private readonly sprint3Service: TelegramSprint3Service,
    private readonly tasksService: TasksService,
    private readonly filesService: FilesService,
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
        handleMachinesCommand: this.handleMachinesCommand.bind(this),
        handleAlertsCommand: this.handleAlertsCommand.bind(this),
        handleStatsCommand: this.handleStatsCommand.bind(this),
        handleTasksCommand: this.handleTasksCommand.bind(this),
        toggleNotification: this.toggleNotification.bind(this),
      });

      // Initialize Sprint 3 service with helper methods
      this.sprint3Service.setHelpers({
        t: this.t.bind(this),
        logMessage: this.logMessage.bind(this),
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

    // Start task command
    this.bot.command('start_task', async (ctx) => {
      await this.handleStartTaskCommand(ctx);
    });

    // Complete task command
    this.bot.command('complete_task', async (ctx) => {
      await this.handleCompleteTaskCommand(ctx);
    });

    // Photo handler for task photos
    this.bot.on('photo', async (ctx) => {
      await this.handlePhotoUpload(ctx);
    });

    // Voice message handler for voice commands
    this.bot.on('voice', async (ctx) => {
      await this.handleVoiceMessage(ctx);
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

  private async handleMachinesCommand(ctx: BotContext): Promise<void> {
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

    const message = this.formatMachinesMessage(formattedMachines, lang);
    const keyboard = this.getMachinesKeyboard(formattedMachines, lang);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
    } else {
      await ctx.reply(message, { ...keyboard, parse_mode: 'HTML' });
    }
  }

  private async handleAlertsCommand(ctx: BotContext): Promise<void> {
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

    const message = this.formatAlertsMessage(alerts, lang);
    const keyboard = this.getAlertsKeyboard(alerts, lang);

    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
    } else {
      await ctx.reply(message, { ...keyboard, parse_mode: 'HTML' });
    }
  }

  private async handleStatsCommand(ctx: BotContext): Promise<void> {
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

    const message = this.formatStatsMessage(stats, lang);
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

  // ============================================================================
  // TASKS HANDLERS (Обработчики команд для задач)
  // ============================================================================

  /**
   * Handler for /tasks command - shows list of operator's tasks
   */
  private async handleTasksCommand(ctx: BotContext): Promise<void> {
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

      // Format message
      const message = this.formatTasksMessage(activeTasks, lang);
      const keyboard = this.getTasksKeyboard(activeTasks, lang);

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

  /**
   * Handler for /start_task command - starts task execution
   */
  private async handleStartTaskCommand(ctx: BotContext): Promise<void> {
    await this.logMessage(ctx, TelegramMessageType.COMMAND, '/start_task');

    if (!ctx.telegramUser?.is_verified) {
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
      await ctx.reply(this.t(lang, 'not_verified'));
      return;
    }

    const lang = ctx.telegramUser.language;

    // Parse task ID from command
    const match =
      ctx.message && 'text' in ctx.message ? ctx.message.text.match(/\/start_task\s+(\S+)/) : null;

    if (!match) {
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? '❌ Использование: /start_task <ID задачи>\n\nПример: /start_task abc123'
          : '❌ Usage: /start_task <task ID>\n\nExample: /start_task abc123',
      );
      return;
    }

    const taskId = match[1];

    try {
      const user = await this.usersService.findByTelegramId(ctx.telegramUser.telegram_id);

      if (!user) {
        await ctx.reply(
          lang === TelegramLanguage.RU ? '❌ Пользователь не найден' : '❌ User not found',
        );
        return;
      }

      // Start the task
      const task = await this.tasksService.startTask(taskId, user.id);

      // Initialize execution state
      const state = this.initializeExecutionState(task);
      await this.taskCallbackService.updateExecutionState(task.id, state);

      // Show task info
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `🎉 <b>Задача начата!</b>\n\n` +
              `📋 ${task.type_code}\n` +
              `🎯 Аппарат: <b>${task.machine?.machine_number || 'N/A'}</b>\n` +
              `📍 Локация: ${task.machine?.location?.name || 'N/A'}\n\n` +
              (task.checklist && task.checklist.length > 0
                ? `✅ Чек-лист: <b>${task.checklist.length} шагов</b>\n\n` +
                  `⏩ Сейчас покажу первый шаг...`
                : `📸 Загрузите фото ДО начала работы`)
          : `🎉 <b>Task started!</b>\n\n` +
              `📋 ${task.type_code}\n` +
              `🎯 Machine: <b>${task.machine?.machine_number || 'N/A'}</b>\n` +
              `📍 Location: ${task.machine?.location?.name || 'N/A'}\n\n` +
              (task.checklist && task.checklist.length > 0
                ? `✅ Checklist: <b>${task.checklist.length} steps</b>\n\n` +
                  `⏩ Showing first step...`
                : `📸 Upload BEFORE photo`),
        { parse_mode: 'HTML' },
      );

      // Show first step if checklist exists
      if (task.checklist && task.checklist.length > 0) {
        await this.taskCallbackService.showCurrentStep(ctx, task, state, lang);
      }
    } catch (error) {
      this.logger.error('Error starting task:', error);

      // User-friendly error message
      const errorMessage =
        lang === TelegramLanguage.RU
          ? `😕 Не удалось начать задачу\n\n` +
            `<b>Возможные причины:</b>\n` +
            `• Задача уже выполнена\n` +
            `• Задача назначена другому оператору\n` +
            `• Неверный ID задачи\n\n` +
            `<b>💡 Попробуйте:</b>\n` +
            `1️⃣ Проверьте список задач: /tasks\n` +
            `2️⃣ Используйте кнопку "▶️ Начать" вместо команды\n\n` +
            `❓ Не помогло? Напишите /help`
          : `😕 Could not start task\n\n` +
            `<b>Possible reasons:</b>\n` +
            `• Task already completed\n` +
            `• Task assigned to another operator\n` +
            `• Invalid task ID\n\n` +
            `<b>💡 Try this:</b>\n` +
            `1️⃣ Check task list: /tasks\n` +
            `2️⃣ Use "▶️ Start" button instead\n\n` +
            `❓ Still stuck? Type /help`;

      await ctx.reply(errorMessage, { parse_mode: 'HTML' });
    }
  }

  /**
   * Handler for /complete_task command - completes task
   */
  private async handleCompleteTaskCommand(ctx: BotContext): Promise<void> {
    await this.logMessage(ctx, TelegramMessageType.COMMAND, '/complete_task');

    if (!ctx.telegramUser?.is_verified) {
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
      await ctx.reply(this.t(lang, 'not_verified'));
      return;
    }

    const lang = ctx.telegramUser.language;

    // Parse task ID from command
    const match =
      ctx.message && 'text' in ctx.message
        ? ctx.message.text.match(/\/complete_task\s+(\S+)/)
        : null;

    if (!match) {
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? '❌ Использование: /complete_task <ID задачи>\n\nПример: /complete_task abc123'
          : '❌ Usage: /complete_task <task ID>\n\nExample: /complete_task abc123',
      );
      return;
    }

    const taskId = match[1];

    try {
      const user = await this.usersService.findByTelegramId(ctx.telegramUser.telegram_id);

      if (!user) {
        await ctx.reply(
          lang === TelegramLanguage.RU ? '❌ Пользователь не найден' : '❌ User not found',
        );
        return;
      }

      // Complete the task
      const task = await this.tasksService.completeTask(taskId, user.id, {
        skip_photos: false, // Require photos
      });

      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `🎉🎊 <b>Отличная работа!</b> 🎊🎉\n\n` +
              `✅ Задача завершена: <b>${task.type_code}</b>\n\n` +
              `🎯 Аппарат: ${task.machine?.machine_number || 'N/A'}\n` +
              `📅 Выполнено: ${new Date().toLocaleString('ru-RU')}\n\n` +
              `💪 Так держать!`
          : `🎉🎊 <b>Great job!</b> 🎊🎉\n\n` +
              `✅ Task completed: <b>${task.type_code}</b>\n\n` +
              `🎯 Machine: ${task.machine?.machine_number || 'N/A'}\n` +
              `📅 Completed: ${new Date().toLocaleString('en-US')}\n\n` +
              `💪 Keep it up!`,
        { parse_mode: 'HTML' },
      );
    } catch (error) {
      this.logger.error('Error completing task:', error);

      // User-friendly error message with recovery steps
      const errorMessage =
        lang === TelegramLanguage.RU
          ? `😕 Не удалось завершить задачу\n\n` +
            `<b>Что могло пойти не так:</b>\n` +
            `• Задача не запущена (используйте /start_task сначала)\n` +
            `• Фото ДО не загружено\n` +
            `• Фото ПОСЛЕ не загружено\n` +
            `• Не все шаги чек-листа завершены\n\n` +
            `<b>💡 Что делать:</b>\n` +
            `1️⃣ Проверьте, что задача запущена\n` +
            `2️⃣ Загрузите все необходимые фото\n` +
            `3️⃣ Завершите чек-лист\n` +
            `4️⃣ Попробуйте снова: /complete_task <ID>\n\n` +
            `❓ Нужна помощь? Напишите /help`
          : `😕 Could not complete task\n\n` +
            `<b>Possible issues:</b>\n` +
            `• Task not started (use /start_task first)\n` +
            `• BEFORE photo missing\n` +
            `• AFTER photo missing\n` +
            `• Checklist not fully completed\n\n` +
            `<b>💡 What to do:</b>\n` +
            `1️⃣ Check task is started\n` +
            `2️⃣ Upload all required photos\n` +
            `3️⃣ Complete checklist\n` +
            `4️⃣ Try again: /complete_task <ID>\n\n` +
            `❓ Need help? Type /help`;

      await ctx.reply(errorMessage, { parse_mode: 'HTML' });
    }
  }

  /**
   * Validate photo before upload
   * Checks MIME type, file size, and task ownership
   *
   * @param buffer - Photo buffer
   * @param mimeType - MIME type of the photo
   * @param fileSize - Size of the file in bytes
   * @param userId - User ID uploading the photo
   * @param taskId - Task ID the photo is for
   * @throws Error if validation fails
   */
  private async validatePhotoUpload(
    buffer: Buffer,
    mimeType: string,
    fileSize: number,
    userId: string,
    taskId: string,
  ): Promise<void> {
    // Validate MIME type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(mimeType)) {
      throw new Error(`Invalid file type: ${mimeType}. Allowed: JPEG, PNG, WebP`);
    }

    // Validate file size (max 5MB)
    const MAX_FILE_SIZE = 5_000_000; // 5MB
    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File too large: ${(fileSize / 1_000_000).toFixed(2)}MB (max 5MB)`);
    }

    // Verify task exists and user is assigned to it
    try {
      const task = await this.tasksService.findOne(taskId);

      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      // Check if user is assigned to the task
      if (task.assigned_to_user_id !== userId) {
        throw new Error('You are not assigned to this task');
      }

      // Check task status - only allow photo uploads for tasks in progress
      const validStatuses = [TaskStatus.PENDING, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS];
      if (!validStatuses.includes(task.status)) {
        throw new Error(`Cannot upload photos to task with status: ${task.status}`);
      }
    } catch (error) {
      // Re-throw any errors with validation context
      throw error;
    }
  }

  /**
   * Handler for photo uploads - associates photos with tasks
   * 🎯 NOW USES CONVERSATION STATE - NO CAPTION NEEDED!
   */
  private async handlePhotoUpload(ctx: BotContext): Promise<void> {
    await this.logMessage(ctx, TelegramMessageType.MESSAGE, 'photo');

    if (!ctx.telegramUser?.is_verified) {
      return; // Ignore photos from unverified users
    }

    const lang = ctx.telegramUser.language;

    try {
      const user = await this.usersService.findByTelegramId(ctx.telegramUser.telegram_id);

      if (!user) {
        return;
      }

      // 🎯 CHECK CONVERSATION STATE instead of parsing caption!
      const session = ctx.session;

      if (!session) {
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '❌ Сессия не найдена. Начните задачу заново.'
            : '❌ Session not found. Start task again.',
        );
        return;
      }

      // Check if user is in photo upload state
      const isAwaitingBefore = session.state === ConversationState.AWAITING_PHOTO_BEFORE;
      const isAwaitingAfter = session.state === ConversationState.AWAITING_PHOTO_AFTER;

      if (!isAwaitingBefore && !isAwaitingAfter) {
        // User sent photo but we're not expecting one
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '🤔 Сейчас фото не ожидается.\n\n' + '💡 Сначала начните задачу: /tasks'
            : '🤔 Not expecting a photo right now.\n\n' + '💡 Start a task first: /tasks',
        );
        return;
      }

      // Get task ID from session context
      const taskId = session.context.activeTaskId;

      if (!taskId) {
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '❌ Задача не найдена в сессии. Начните заново.'
            : '❌ Task not found in session. Start again.',
        );
        await this.sessionService.clearActiveTask(user.id);
        return;
      }

      // Get photo file
      const photo =
        ctx.message && 'photo' in ctx.message
          ? ctx.message.photo[ctx.message.photo.length - 1]
          : null;

      if (!photo) {
        await ctx.reply(lang === TelegramLanguage.RU ? '❌ Фото не найдено' : '❌ Photo not found');
        return;
      }

      // Show upload progress
      await ctx.replyWithChatAction('upload_photo');

      // Download photo from Telegram
      const fileLink = await ctx.telegram.getFileLink(photo.file_id);
      const response = await fetch(fileLink.href);
      const buffer = Buffer.from(await response.arrayBuffer());

      // Determine category based on state
      const category = isAwaitingBefore ? 'task_photo_before' : 'task_photo_after';

      await this.filesService.uploadFile(
        {
          buffer,
          originalname: `telegram_${Date.now()}.jpg`,
          mimetype: 'image/jpeg',
          size: buffer.length,
        } as Express.Multer.File,
        'task',
        taskId,
        category,
        user.id,
      );

      // 🎯 UPDATE CONVERSATION STATE based on which photo was uploaded
      if (isAwaitingBefore) {
        // BEFORE photo uploaded → Now request AFTER photo
        await this.sessionService.requestPhoto(user.id, taskId, 'after');

        await ctx.reply(
          lang === TelegramLanguage.RU
            ? `✅ <b>Фото ДО загружено успешно!</b>\n\n` +
                `📸 Теперь выполните работу и отправьте фото ПОСЛЕ\n` +
                `<i>(просто отправьте фото, подпись не нужна)</i>`
            : `✅ <b>BEFORE photo uploaded successfully!</b>\n\n` +
                `📸 Now complete the work and send AFTER photo\n` +
                `<i>(just send photo, no caption needed)</i>`,
          { parse_mode: 'HTML' },
        );
      } else if (isAwaitingAfter) {
        // AFTER photo uploaded → Clear active task, back to IDLE
        await this.sessionService.clearActiveTask(user.id);

        await ctx.reply(
          lang === TelegramLanguage.RU
            ? `🎉 <b>Оба фото загружены!</b>\n\n` +
                `✅ Фото ДО: ✓\n` +
                `✅ Фото ПОСЛЕ: ✓\n\n` +
                `💡 Теперь можете завершить задачу:\n` +
                `/complete_task ${taskId.substring(0, 8)}...\n\n` +
                `Или выберите другую задачу: /tasks`
            : `🎉 <b>Both photos uploaded!</b>\n\n` +
                `✅ BEFORE photo: ✓\n` +
                `✅ AFTER photo: ✓\n\n` +
                `💡 You can now complete the task:\n` +
                `/complete_task ${taskId.substring(0, 8)}...\n\n` +
                `Or choose another task: /tasks`,
          { parse_mode: 'HTML' },
        );
      }

      // Update task execution state metadata
      try {
        const task = await this.tasksService.findOne(taskId);
        const state = this.taskCallbackService.getExecutionState(task);

        if (state) {
          if (isAwaitingBefore) {
            state.photos_uploaded.before = true;
          } else if (isAwaitingAfter) {
            state.photos_uploaded.after = true;
          }

          await this.taskCallbackService.updateExecutionState(taskId, state);
        }
      } catch (error) {
        this.logger.warn(`Failed to update execution state after photo upload: ${error.message}`);
        // Don't fail the photo upload if state update fails
      }
    } catch (error) {
      this.logger.error('Error uploading photo:', error);
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `❌ Ошибка при загрузке фото: ${error.message}`
          : `❌ Error uploading photo: ${error.message}`,
      );
    }
  }

  /**
   * Handler for voice messages - transcribe and execute commands
   * 🎤 Uses OpenAI Whisper for speech-to-text in Russian/English/Uzbek
   */
  private async handleVoiceMessage(ctx: BotContext): Promise<void> {
    await this.logMessage(ctx, TelegramMessageType.MESSAGE, 'voice');

    if (!ctx.telegramUser?.is_verified) {
      return; // Ignore voice from unverified users
    }

    const lang = ctx.telegramUser.language;

    // Check if voice service is available
    if (!this.voiceService.isAvailable()) {
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? '🎤 Голосовые команды временно недоступны.\n\n' +
              '💡 Используйте текстовые команды или кнопки меню.'
          : '🎤 Voice commands temporarily unavailable.\n\n' +
              '💡 Please use text commands or menu buttons.',
      );
      return;
    }

    try {
      // Show typing indicator
      await ctx.replyWithChatAction('typing');

      // Get voice file
      const voice = ctx.message && 'voice' in ctx.message ? ctx.message.voice : null;

      if (!voice) {
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '❌ Голосовое сообщение не найдено'
            : '❌ Voice message not found',
        );
        return;
      }

      // Inform user we're processing
      const processingMsg = await ctx.reply(
        lang === TelegramLanguage.RU
          ? '🎤 Слушаю... Распознаю речь...'
          : '🎤 Listening... Transcribing...',
      );

      // Download voice file from Telegram
      const fileLink = await ctx.telegram.getFileLink(voice.file_id);
      const response = await fetch(fileLink.href);
      const buffer = Buffer.from(await response.arrayBuffer());

      // Transcribe voice to text
      const languageCode = lang === TelegramLanguage.RU ? 'ru' : 'en';
      const transcribedText = await this.voiceService.transcribeVoice(buffer, languageCode);

      this.logger.log(
        `Voice transcribed from user ${ctx.telegramUser.telegram_id}: "${transcribedText}"`,
      );

      // Delete processing message
      await ctx.telegram.deleteMessage(ctx.chat!.id, processingMsg.message_id);

      // Parse command from transcribed text
      const command = this.voiceService.parseCommand(transcribedText);

      // Show what we understood
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `🎧 Вы сказали: <i>"${transcribedText}"</i>\n\n${this.voiceService.getVoiceCommandResponse(command, 'ru')}`
          : `🎧 You said: <i>"${transcribedText}"</i>\n\n${this.voiceService.getVoiceCommandResponse(command, 'en')}`,
        { parse_mode: 'HTML' },
      );

      // Execute command based on intent
      switch (command.intent) {
        case 'tasks':
          await this.handleTasksCommand(ctx);
          break;

        case 'machines':
          await this.handleMachinesCommand(ctx);
          break;

        case 'stats':
          await this.handleStatsCommand(ctx);
          break;

        case 'help':
          await ctx.reply(this.t(lang, 'help'), { parse_mode: 'HTML' });
          break;

        case 'start_task':
          // If task number was detected, try to start it
          if (command.parameters?.taskNumber) {
            await this.handleTasksCommand(ctx); // Show tasks, user will select from list
          } else {
            await this.handleTasksCommand(ctx);
          }
          break;

        case 'complete_task':
          await this.handleTasksCommand(ctx); // Show tasks, user will complete from list
          break;

        case 'unknown':
          // Already responded with help text via getVoiceCommandResponse
          break;
      }
    } catch (error) {
      this.logger.error('Error processing voice message:', error);

      await ctx.reply(
        lang === TelegramLanguage.RU
          ? '😕 Не удалось распознать голосовое сообщение\n\n' +
              '<b>Что могло пойти не так:</b>\n' +
              '• Плохое качество записи\n' +
              '• Фоновый шум\n' +
              '• Слишком короткая запись\n\n' +
              '<b>💡 Попробуйте:</b>\n' +
              '1️⃣ Записать в тихом месте\n' +
              '2️⃣ Говорить четко и громко\n' +
              '3️⃣ Использовать текстовые команды: /help\n\n' +
              `<i>Ошибка: ${error.message}</i>`
          : '😕 Failed to process voice message\n\n' +
              '<b>What could go wrong:</b>\n' +
              '• Poor recording quality\n' +
              '• Background noise\n' +
              '• Recording too short\n\n' +
              '<b>💡 Try:</b>\n' +
              '1️⃣ Record in quiet place\n' +
              '2️⃣ Speak clearly and loudly\n' +
              '3️⃣ Use text commands: /help\n\n' +
              `<i>Error: ${error.message}</i>`,
        { parse_mode: 'HTML' },
      );
    }
  }

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

  // ============================================================================
  // TASK STATE MACHINE METHODS - Step-by-step execution
  // ============================================================================

  /**
   * Initialize execution state for a task
   */
  private initializeExecutionState(task: TelegramTaskInfo): TaskExecutionState {
    const checklistLength = task.checklist?.length || 0;
    const progress: Record<number, { completed: boolean; completed_at?: string; notes?: string }> =
      {};

    for (let i = 0; i < checklistLength; i++) {
      progress[i] = {
        completed: false,
      };
    }

    return {
      current_step: 0,
      checklist_progress: progress,
      photos_uploaded: {
        before: task.has_photo_before || false,
        after: task.has_photo_after || false,
      },
      started_at: new Date().toISOString(),
      last_interaction_at: new Date().toISOString(),
    };
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
