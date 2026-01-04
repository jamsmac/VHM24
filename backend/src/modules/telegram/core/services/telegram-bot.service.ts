import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Telegraf, Context } from 'telegraf';
import { TelegramUser } from '../../shared/entities/telegram-user.entity';
import { TelegramSettings } from '../../shared/entities/telegram-settings.entity';
import { TelegramSessionService, UserSession, ConversationState } from '../../infrastructure/services/telegram-session.service';
import { TelegramCommandHandlerService } from './telegram-command-handler.service';
import { TelegramCallbackHandlerService } from './telegram-callback-handler.service';
import { TelegramTaskCallbackService } from './telegram-task-callback.service';
import { TelegramAdminCallbackService } from './telegram-admin-callback.service';
import { TelegramSprint3Service } from './telegram-sprint3.service';
import { TelegramTaskOperationsService } from './telegram-task-operations.service';
import { TelegramDataCommandsService } from './telegram-data-commands.service';
import { TelegramNlpService } from './telegram-nlp.service';
import { TelegramUIService } from './telegram-ui.service';
import { TelegramUtilitiesService } from './telegram-utilities.service';
import { TelegramLocationService } from '../../media/services/telegram-location.service';
import { TelegramSalesService } from '../../commerce/services/telegram-sales.service';
import { UserRole } from '../../../users/entities/user.entity';
import { TelegramMessageOptions } from '../../shared/types/telegram.types';

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
    private readonly sessionService: TelegramSessionService,
    private readonly commandHandlerService: TelegramCommandHandlerService,
    private readonly callbackHandlerService: TelegramCallbackHandlerService,
    private readonly taskCallbackService: TelegramTaskCallbackService,
    private readonly adminCallbackService: TelegramAdminCallbackService,
    private readonly sprint3Service: TelegramSprint3Service,
    private readonly taskOperationsService: TelegramTaskOperationsService,
    private readonly dataCommandsService: TelegramDataCommandsService,
    private readonly nlpService: TelegramNlpService,
    private readonly uiService: TelegramUIService,
    private readonly utilitiesService: TelegramUtilitiesService,
    private readonly locationService: TelegramLocationService,
    private readonly salesService: TelegramSalesService,
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
        t: this.uiService.t.bind(this.uiService),
        getMainMenuKeyboard: this.uiService.getMainMenuKeyboard.bind(this.uiService),
        getVerificationKeyboard: this.uiService.getVerificationKeyboard.bind(this.uiService),
        formatTasksMessage: this.uiService.formatTasksMessage.bind(this.uiService),
        formatMachinesMessage: this.uiService.formatMachinesMessage.bind(this.uiService),
        formatAlertsMessage: this.uiService.formatAlertsMessage.bind(this.uiService),
        formatStatsMessage: this.uiService.formatStatsMessage.bind(this.uiService),
        getTasksKeyboard: this.uiService.getTasksKeyboard.bind(this.uiService),
        getMachinesKeyboard: this.uiService.getMachinesKeyboard.bind(this.uiService),
        getAlertsKeyboard: this.uiService.getAlertsKeyboard.bind(this.uiService),
        notifyAdminAboutNewUser: (userId: string, telegramFrom: { id: number; first_name?: string; last_name?: string; username?: string }) =>
          this.adminCallbackService.notifyAdminAboutNewUser(userId, telegramFrom, this.sendMessage.bind(this)),
      });

      // Initialize callback handler with helper methods
      this.callbackHandlerService.setHelpers({
        t: this.uiService.t.bind(this.uiService),
        getMainMenuKeyboard: this.uiService.getMainMenuKeyboard.bind(this.uiService),
        getSettingsKeyboard: this.uiService.getSettingsKeyboard.bind(this.uiService),
        getNotificationSettingsKeyboard: this.uiService.getNotificationSettingsKeyboard.bind(this.uiService),
        handleMachinesCommand: (ctx) => this.dataCommandsService.handleMachinesCommand(ctx),
        handleAlertsCommand: (ctx) => this.dataCommandsService.handleAlertsCommand(ctx),
        handleStatsCommand: (ctx) => this.dataCommandsService.handleStatsCommand(ctx),
        handleTasksCommand: (ctx) => this.dataCommandsService.handleTasksCommand(ctx),
        toggleNotification: this.utilitiesService.toggleNotification.bind(this.utilitiesService),
      });

      // Initialize Sprint 3 service with helper methods
      this.sprint3Service.setHelpers({
        t: this.uiService.t.bind(this.uiService),
        logMessage: this.utilitiesService.logMessage.bind(this.utilitiesService),
      });

      // Initialize Task Operations service with helper methods
      this.taskOperationsService.setHelpers({
        t: this.uiService.t.bind(this.uiService),
        logMessage: this.utilitiesService.logMessage.bind(this.utilitiesService),
        handleTasksCommand: (ctx) => this.dataCommandsService.handleTasksCommand(ctx),
        handleMachinesCommand: (ctx) => this.dataCommandsService.handleMachinesCommand(ctx),
        handleStatsCommand: (ctx) => this.dataCommandsService.handleStatsCommand(ctx),
      });

      // Initialize Data Commands service with helper methods
      this.dataCommandsService.setHelpers({
        t: this.uiService.t.bind(this.uiService),
        logMessage: this.utilitiesService.logMessage.bind(this.utilitiesService),
        formatMachinesMessage: this.uiService.formatMachinesMessage.bind(this.uiService),
        formatAlertsMessage: this.uiService.formatAlertsMessage.bind(this.uiService),
        formatStatsMessage: this.uiService.formatStatsMessage.bind(this.uiService),
        formatTasksMessage: this.uiService.formatTasksMessage.bind(this.uiService),
        getMachinesKeyboard: this.uiService.getMachinesKeyboard.bind(this.uiService),
        getAlertsKeyboard: this.uiService.getAlertsKeyboard.bind(this.uiService),
        getTasksKeyboard: this.uiService.getTasksKeyboard.bind(this.uiService),
      });

      // Initialize NLP service with helper methods
      this.nlpService.setHelpers({
        t: this.uiService.t.bind(this.uiService),
        logMessage: this.utilitiesService.logMessage.bind(this.utilitiesService),
      });

      // Initialize Location service with helper methods
      this.locationService.setHelpers({
        t: this.uiService.t.bind(this.uiService),
        logMessage: this.utilitiesService.logMessage.bind(this.utilitiesService),
      });

      // Initialize Sales service with helper methods
      this.salesService.setHelpers({
        t: this.uiService.t.bind(this.uiService),
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
          { command: 'nearby', description: '📍 Ближайшие задачи' },
          { command: 'ask', description: '❓ Задать вопрос' },
          { command: 'sales', description: '💰 Регистрация продажи' },
          { command: 'stock', description: '📦 Остатки на машине' },
          { command: 'incident', description: '⚠️ Создать инцидент' },
          { command: 'stats', description: '📊 Статистика' },
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
          { command: 'nearby', description: '📍 Nearby tasks' },
          { command: 'ask', description: '❓ Ask a question' },
          { command: 'sales', description: '💰 Register sale' },
          { command: 'stock', description: '📦 Machine inventory' },
          { command: 'incident', description: '⚠️ Report incident' },
          { command: 'stats', description: '📊 Statistics' },
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
        this.utilitiesService.logMessage.bind(this.utilitiesService),
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

    // ============================================================================
    // SPRINT 3+: NLP AND LOCATION COMMANDS
    // ============================================================================

    // Ask command - natural language queries
    this.bot.command('ask', async (ctx) => {
      await this.nlpService.handleAskCommand(ctx);
    });

    // Nearby command - find nearby tasks
    this.bot.command('nearby', async (ctx) => {
      await this.locationService.handleNearbyCommand(ctx);
    });

    // Route command - show route to tasks
    this.bot.command('route', async (ctx) => {
      await this.locationService.handleRouteCommand(ctx);
    });

    // Sales command - register sales
    this.bot.command('sales', async (ctx) => {
      await this.salesService.handleSalesCommand(ctx);
    });

    // Location handler
    this.bot.on('location', async (ctx) => {
      await this.locationService.handleLocationMessage(ctx);
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

    // ============================================================================
    // SPRINT 3+: NLP AND LOCATION CALLBACKS
    // ============================================================================

    // Ask help callback
    this.bot.action('ask_help', async (ctx) => {
      await this.nlpService.handleAskHelpCallback(ctx);
    });

    // Start nearest task callback
    this.bot.action(/^start_nearest_(.+)$/, async (ctx) => {
      const taskId = ctx.match[1];
      await this.locationService.handleStartNearestCallback(ctx, taskId);
    });

    // Show route callback
    this.bot.action('show_route', async (ctx) => {
      await this.locationService.handleShowRouteCallback(ctx);
    });

    // ============================================================================
    // SALES CALLBACKS
    // ============================================================================

    // Sales machine selection
    this.bot.action(/^sales_machine_(.+)$/, async (ctx) => {
      const machineId = ctx.match[1];
      await this.salesService.handleMachineSelection(ctx, machineId);
    });

    // Sales payment method selection
    this.bot.action(/^sales_payment_(.+)$/, async (ctx) => {
      const method = ctx.match[1];
      await this.salesService.handlePaymentMethodSelection(ctx, method);
    });

    // Sales confirmation
    this.bot.action('sales_confirm', async (ctx) => {
      await this.salesService.handleSaleConfirmation(ctx);
    });

    // Sales cancel
    this.bot.action('sales_cancel', async (ctx) => {
      await this.salesService.handleCancel(ctx);
    });

    // Sales back navigation
    this.bot.action('sales_back_machine', async (ctx) => {
      await this.salesService.handleBack(ctx, 'machine');
    });

    this.bot.action('sales_back_amount', async (ctx) => {
      await this.salesService.handleBack(ctx, 'amount');
    });

    this.bot.action('sales_back_payment', async (ctx) => {
      await this.salesService.handleBack(ctx, 'payment');
    });
  }

  // Note: handleMachinesCommand, handleAlertsCommand, handleStatsCommand, handleTasksCommand
  // moved to TelegramDataCommandsService
  // Note: Keyboard and formatting methods moved to TelegramUIService
  // Note: Utility methods (updateUserLanguage, toggleNotification, logMessage, handleTextMessage)
  // moved to TelegramUtilitiesService

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
