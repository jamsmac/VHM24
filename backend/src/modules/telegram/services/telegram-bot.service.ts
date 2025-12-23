import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Telegraf, Context, Markup } from 'telegraf';
import { TelegramUser, TelegramLanguage } from '../entities/telegram-user.entity';
import { TelegramSettings } from '../entities/telegram-settings.entity';
import { TelegramMessageLog, TelegramMessageType } from '../entities/telegram-message-log.entity';
import { TelegramSessionService, UserSession, ConversationState } from './telegram-session.service';
import { TelegramVoiceService } from './telegram-voice.service';
import { TasksService } from '../../tasks/tasks.service';
import { FilesService } from '../../files/files.service';
import { UsersService } from '../../users/users.service';
import { UserRole } from '../../users/entities/user.entity';
import { MachinesService } from '../../machines/machines.service';
import { MachineStatus } from '../../machines/entities/machine.entity';
import { IncidentsService } from '../../incidents/incidents.service';
import { IncidentStatus } from '../../incidents/entities/incident.entity';
import { TransactionsService } from '../../transactions/transactions.service';
import { InventoryService } from '../../inventory/inventory.service';
import { AccessRequestsService } from '../../access-requests/access-requests.service';
import { TaskStatus, TaskType } from '../../tasks/entities/task.entity';
import { TelegramManagerToolsService } from './telegram-manager-tools.service';
import { IncidentType, IncidentPriority } from '../../incidents/entities/incident.entity';
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
} from '../types/telegram.types';

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

    // Start command with user-friendly welcome and access request creation
    this.bot.command('start', async (ctx) => {
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;

      await this.logMessage(ctx, TelegramMessageType.COMMAND, '/start');

      // Case 1: User is verified - show main menu
      if (ctx.telegramUser?.is_verified) {
        await ctx.reply(
          this.t(lang, 'welcome_back', ctx.from?.first_name || 'User'),
          this.getMainMenuKeyboard(lang),
        );
        return;
      }

      // Case 2: User exists but not verified - inform about pending request
      if (ctx.telegramUser && !ctx.telegramUser.is_verified) {
        await ctx.reply(this.t(lang, 'access_request_pending'), this.getVerificationKeyboard(lang));
        return;
      }

      // Case 3: New user - create pending user and notify admin
      if (!ctx.telegramUser && ctx.from) {
        try {
          // Create pending user directly (simplified flow)
          const pendingUser = await this.usersService.createPendingFromTelegram({
            telegram_id: ctx.from.id.toString(),
            telegram_username: ctx.from.username,
            telegram_first_name: ctx.from.first_name,
            telegram_last_name: ctx.from.last_name,
          });

          this.logger.log(
            `Pending user created for Telegram user ${ctx.from.id} (@${ctx.from.username})`,
          );

          // Send confirmation to user
          await ctx.reply(
            this.t(lang, 'access_request_created', ctx.from.first_name || 'User'),
            this.getVerificationKeyboard(lang),
          );

          // Notify admin about new pending user
          await this.notifyAdminAboutNewUser(pendingUser.id, ctx.from);
        } catch (error) {
          this.logger.error('Failed to create pending user', error);

          // Check if it's a conflict (user already exists)
          if (error.message?.includes('уже существует') || error.message?.includes('already exists')) {
            await ctx.reply(
              this.t(lang, 'access_request_pending'),
              this.getVerificationKeyboard(lang),
            );
          } else {
            await ctx.reply(
              this.t(lang, 'access_request_error'),
              this.getVerificationKeyboard(lang),
            );
          }
        }
        return;
      }

      // Fallback
      await ctx.reply(
        this.t(lang, 'welcome_new', ctx.from?.first_name || 'User'),
        this.getVerificationKeyboard(lang),
      );
    });

    // Main menu command
    this.bot.command('menu', async (ctx) => {
      await this.logMessage(ctx, TelegramMessageType.COMMAND, '/menu');

      if (!ctx.telegramUser?.is_verified) {
        await ctx.reply(
          this.t(ctx.telegramUser?.language || TelegramLanguage.RU, 'not_verified'),
          this.getVerificationKeyboard(ctx.telegramUser?.language || TelegramLanguage.RU),
        );
        return;
      }

      const lang = ctx.telegramUser.language;
      await ctx.reply(this.t(lang, 'main_menu'), this.getMainMenuKeyboard(lang));
    });

    // Machines command
    this.bot.command('machines', async (ctx) => {
      await this.handleMachinesCommand(ctx);
    });

    // Alerts command
    this.bot.command('alerts', async (ctx) => {
      await this.handleAlertsCommand(ctx);
    });

    // Stats command
    this.bot.command('stats', async (ctx) => {
      await this.handleStatsCommand(ctx);
    });

    // Help command
    this.bot.command('help', async (ctx) => {
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
      await ctx.reply(this.t(lang, 'help'), { parse_mode: 'HTML' });
    });

    // Language command
    this.bot.command('language', async (ctx) => {
      await ctx.reply(
        'Choose your language / Выберите язык:',
        Markup.inlineKeyboard([
          [
            Markup.button.callback('🇷🇺 Русский', 'lang_ru'),
            Markup.button.callback('🇬🇧 English', 'lang_en'),
          ],
        ]),
      );
    });

    // ============================================================================
    // SUPER ADMIN COMMANDS (Команды для супер администратора)
    // ============================================================================

    // Pending users command (super admin only)
    this.bot.command('pending_users', async (ctx) => {
      await this.handlePendingUsersCommand(ctx);
    });

    // ============================================================================
    // TASKS COMMANDS (Команды для работы с задачами)
    // ============================================================================

    // Tasks list command
    this.bot.command('tasks', async (ctx) => {
      await this.handleTasksCommand(ctx);
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
    // SPRINT 3: NEW COMMANDS (Команды Sprint 3)
    // ============================================================================

    // Incident command - create incident via bot
    this.bot.command('incident', async (ctx) => {
      await this.handleIncidentCommand(ctx);
    });

    // Stock command - check machine inventory
    this.bot.command('stock', async (ctx) => {
      await this.handleStockCommand(ctx);
    });

    // Staff command - team status for managers
    this.bot.command('staff', async (ctx) => {
      await this.handleStaffCommand(ctx);
    });

    // Report command - daily photo report
    this.bot.command('report', async (ctx) => {
      await this.handleReportCommand(ctx);
    });
  }

  private setupCallbacks(): void {
    if (!this.bot) return;

    // Language selection callbacks
    this.bot.action('lang_ru', async (ctx) => {
      await this.updateUserLanguage(ctx, TelegramLanguage.RU);
      await ctx.answerCbQuery('Язык изменен на русский ✓');
      await ctx.editMessageText(
        'Язык изменен на русский 🇷🇺',
        this.getMainMenuKeyboard(TelegramLanguage.RU),
      );
    });

    this.bot.action('lang_en', async (ctx) => {
      await this.updateUserLanguage(ctx, TelegramLanguage.EN);
      await ctx.answerCbQuery('Language changed to English ✓');
      await ctx.editMessageText(
        'Language changed to English 🇬🇧',
        this.getMainMenuKeyboard(TelegramLanguage.EN),
      );
    });

    // Main menu callbacks
    this.bot.action('menu_machines', async (ctx) => {
      await ctx.answerCbQuery();
      await this.handleMachinesCommand(ctx);
    });

    this.bot.action('menu_alerts', async (ctx) => {
      await ctx.answerCbQuery();
      await this.handleAlertsCommand(ctx);
    });

    this.bot.action('menu_stats', async (ctx) => {
      await ctx.answerCbQuery();
      await this.handleStatsCommand(ctx);
    });

    this.bot.action('menu_settings', async (ctx) => {
      await ctx.answerCbQuery();
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
      await ctx.editMessageText(this.t(lang, 'settings_menu'), this.getSettingsKeyboard(lang));
    });

    this.bot.action('back_to_menu', async (ctx) => {
      await ctx.answerCbQuery();
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
      await ctx.editMessageText(this.t(lang, 'main_menu'), this.getMainMenuKeyboard(lang));
    });

    // Settings callbacks
    this.bot.action('settings_notifications', async (ctx) => {
      await ctx.answerCbQuery();
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
      await ctx.editMessageText(
        this.t(lang, 'notification_settings'),
        this.getNotificationSettingsKeyboard(lang, ctx.telegramUser!),
      );
    });

    this.bot.action('settings_language', async (ctx) => {
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
        await this.toggleNotification(ctx, type);
      });
    });

    // Task callbacks
    this.bot.action('refresh_tasks', async (ctx) => {
      await ctx.answerCbQuery();
      await this.handleTasksCommand(ctx);
    });

    // Task start callback (from inline button)
    this.bot.action(/task_start_(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const taskId = ctx.match[1];

      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;

      try {
        const user = await this.usersService.findByTelegramId(ctx.telegramUser!.telegram_id);
        if (!user) {
          await ctx.reply(
            lang === TelegramLanguage.RU ? '❌ Пользователь не найден' : '❌ User not found',
          );
          return;
        }

        const task = await this.tasksService.startTask(taskId, user.id);

        // 🎯 SET CONVERSATION STATE - Request BEFORE photo
        await this.sessionService.requestPhoto(user.id, taskId, 'before');

        await ctx.reply(
          lang === TelegramLanguage.RU
            ? `🎉 Задача "${task.type_code}" начата!\n\n` +
                `🎯 Аппарат: ${task.machine?.machine_number || 'N/A'}\n` +
                `📍 Локация: ${task.machine?.location?.name || 'N/A'}\n\n` +
                `📸 <b>Теперь просто отправьте фото ДО начала работы</b>\n` +
                `<i>(подпись не нужна, я запомнил что вы в этой задаче)</i>`
            : `🎉 Task "${task.type_code}" started!\n\n` +
                `🎯 Machine: ${task.machine?.machine_number || 'N/A'}\n` +
                `📍 Location: ${task.machine?.location?.name || 'N/A'}\n\n` +
                `📸 <b>Now just send BEFORE photo</b>\n` +
                `<i>(no caption needed, I remember you're in this task)</i>`,
          { parse_mode: 'HTML' },
        );
      } catch (error) {
        this.logger.error('Error starting task:', error);
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? `❌ Ошибка: ${error.message}`
            : `❌ Error: ${error.message}`,
        );
      }
    });

    // ============================================================================
    // STEP-BY-STEP TASK EXECUTION CALLBACKS
    // ============================================================================

    // Handle "Done" button - mark step as completed
    this.bot.action(/^step_done_(.+)_(\d+)$/, async (ctx) => {
      const match = ctx.match;
      const taskId = match[1];
      const stepIndex = parseInt(match[2], 10);

      await ctx.answerCbQuery('✅');
      await this.handleStepCompletion(ctx, taskId, stepIndex, false);
    });

    // Handle "Skip" button - skip current step
    this.bot.action(/^step_skip_(.+)_(\d+)$/, async (ctx) => {
      const match = ctx.match;
      const taskId = match[1];
      const stepIndex = parseInt(match[2], 10);

      await ctx.answerCbQuery('⏭️');
      await this.handleStepCompletion(ctx, taskId, stepIndex, true);
    });

    // Handle "Back" button - go to previous step
    this.bot.action(/^step_back_(.+)$/, async (ctx) => {
      const match = ctx.match;
      const taskId = match[1];

      if (!ctx.telegramUser?.is_verified) {
        return;
      }

      const lang = ctx.telegramUser.language;

      try {
        const task = await this.tasksService.findOne(taskId);
        const state = this.getExecutionState(task);

        if (!state) {
          await ctx.answerCbQuery('❌ State not found');
          return;
        }

        if (state.current_step > 0) {
          state.current_step -= 1;
          await this.updateExecutionState(taskId, state);

          await ctx.answerCbQuery('◀️');
          const updatedTask = await this.tasksService.findOne(taskId);
          await this.showCurrentStep(ctx, updatedTask, state, lang);
        } else {
          await ctx.answerCbQuery(
            lang === TelegramLanguage.RU ? 'Уже на первом шаге' : 'Already at first step',
          );
        }
      } catch (error) {
        this.logger.error('Error going back:', error);
        await ctx.answerCbQuery('❌ Error');
      }
    });

    // ============================================================================
    // SUPER ADMIN APPROVAL CALLBACKS
    // ============================================================================

    // Expand user details to show role selection
    this.bot.action(/^expand_user_(.+)$/, async (ctx) => {
      const match = ctx.match;
      const userId = match[1];

      await ctx.answerCbQuery();
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;

      // Check super admin permission
      if (!this.isSuperAdmin(ctx.from?.id.toString())) {
        await ctx.answerCbQuery(
          lang === TelegramLanguage.RU ? 'Недостаточно прав' : 'Insufficient permissions',
          { show_alert: true },
        );
        return;
      }

      try {
        // Get user details
        const user = await this.usersService.findOne(userId);

        const message =
          lang === TelegramLanguage.RU
            ? `<b>👤 Информация о пользователе</b>\n\n` +
              `Имя: <b>${user.full_name}</b>\n` +
              `Email: ${user.email}\n` +
              `Телефон: ${user.phone || 'N/A'}\n` +
              `Дата регистрации: ${new Date(user.created_at).toLocaleDateString('ru-RU')}\n\n` +
              `<b>Выберите роль для пользователя:</b>`
            : `<b>👤 User Information</b>\n\n` +
              `Name: <b>${user.full_name}</b>\n` +
              `Email: ${user.email}\n` +
              `Phone: ${user.phone || 'N/A'}\n` +
              `Registered: ${new Date(user.created_at).toLocaleDateString('en-US')}\n\n` +
              `<b>Select role for the user:</b>`;

        const keyboard = this.getRoleSelectionKeyboard(userId, lang);

        await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
      } catch (error) {
        this.logger.error('Error expanding user:', error);
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? `❌ Ошибка: ${error.message}`
            : `❌ Error: ${error.message}`,
        );
      }
    });

    // Role selection for user approval
    this.bot.action(/^approve_user_(.+)_role_(.+)$/, async (ctx) => {
      const match = ctx.match;
      const userId = match[1];
      const role = match[2] as UserRole;

      await this.handleApproveUserAction(ctx, userId, role);
    });

    // Reject user action
    this.bot.action(/^reject_user_(.+)$/, async (ctx) => {
      const match = ctx.match;
      const userId = match[1];

      await ctx.answerCbQuery();
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;

      // For rejection, we need to get the reason - for now, ask the user
      // In a production system, we'd use a state machine or store the user ID temporarily
      await ctx.editMessageText(
        lang === TelegramLanguage.RU
          ? `❌ Введите причину отказа (минимум 10 символов):`
          : `❌ Enter rejection reason (minimum 10 characters):`,
      );

      // Store the userId in the context for the next message
      // Since Telegraf doesn't have built-in state, we'll handle this via reply
      const telegramUser = ctx.telegramUser;
      if (telegramUser) {
        // Mark this user as waiting for rejection reason
        telegramUser.metadata = telegramUser.metadata || {};
        telegramUser.metadata.pending_rejection_user_id = userId;
        await this.telegramUserRepository.save(telegramUser);
      }
    });

    // Refresh pending users list
    this.bot.action('refresh_pending_users', async (ctx) => {
      await ctx.answerCbQuery();
      await this.handlePendingUsersCommand(ctx);
    });

    // ============================================================================
    // SPRINT 3: CALLBACK HANDLERS
    // ============================================================================

    // Stock machine selection callback
    this.bot.action(/^stock_machine:(.+)$/, async (ctx) => {
      const match = ctx.match;
      const machineId = match[1];

      await ctx.answerCbQuery();
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;

      try {
        await this.sendMachineStockInfo(ctx, machineId, lang);
      } catch (error) {
        this.logger.error('Error in stock_machine callback:', error);
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? `❌ Ошибка: ${error.message}`
            : `❌ Error: ${error.message}`,
        );
      }
    });

    // Staff refresh callback
    this.bot.action('staff_refresh', async (ctx) => {
      await ctx.answerCbQuery();
      await this.handleStaffCommand(ctx);
    });

    // Staff analytics callback
    this.bot.action('staff_analytics', async (ctx) => {
      await ctx.answerCbQuery();
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;

      try {
        const user = await this.usersService.findByTelegramId(ctx.telegramUser!.telegram_id);
        if (!user) return;

        const analytics = await this.managerToolsService.getTeamAnalytics(user.id);
        const message = this.managerToolsService.formatAnalyticsMessage(analytics, lang);

        await ctx.reply(message, { parse_mode: 'HTML' });
      } catch (error) {
        this.logger.error('Error in staff_analytics callback:', error);
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? `❌ Ошибка: ${error.message}`
            : `❌ Error: ${error.message}`,
        );
      }
    });

    // Incident type selection callback
    this.bot.action(/^incident_type:(.+)$/, async (ctx) => {
      const match = ctx.match;
      const incidentType = match[1];

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
      } catch (error) {
        this.logger.error('Error in incident_type callback:', error);
      }
    });

    // Incident machine selection callback
    this.bot.action(/^incident_machine:(.+)$/, async (ctx) => {
      const match = ctx.match;
      const machineId = match[1];

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
      } catch (error) {
        this.logger.error('Error in incident_machine callback:', error);
      }
    });

    // Cancel incident creation
    this.bot.action('incident_cancel', async (ctx) => {
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
      await this.updateExecutionState(task.id, state);

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
        await this.showCurrentStep(ctx, task, state, lang);
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
        const state = this.getExecutionState(task);

        if (state) {
          if (isAwaitingBefore) {
            state.photos_uploaded.before = true;
          } else if (isAwaitingAfter) {
            state.photos_uploaded.after = true;
          }

          await this.updateExecutionState(taskId, state);
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
   * Check if user is the super admin (owner)
   * Super Admin Telegram ID is configured via SUPER_ADMIN_TELEGRAM_ID environment variable
   */
  private isSuperAdmin(telegramId: string | undefined): boolean {
    const OWNER_TELEGRAM_ID = process.env.SUPER_ADMIN_TELEGRAM_ID;
    if (!OWNER_TELEGRAM_ID) {
      this.logger.warn('SUPER_ADMIN_TELEGRAM_ID not configured');
      return false;
    }
    return telegramId === OWNER_TELEGRAM_ID;
  }

  /**
   * Notify owner about new pending user registration
   * Sends a message with user info and role selection buttons
   */
  private async notifyAdminAboutNewUser(
    userId: string,
    telegramFrom: { id: number; first_name?: string; last_name?: string; username?: string },
  ): Promise<void> {
    const OWNER_TELEGRAM_ID = process.env.SUPER_ADMIN_TELEGRAM_ID;

    if (!OWNER_TELEGRAM_ID) {
      this.logger.warn('SUPER_ADMIN_TELEGRAM_ID not configured, cannot send notification');
      return;
    }

    try {
      // Get owner's TelegramUser to find their chat_id
      const adminTelegramUser = await this.telegramUserRepository.findOne({
        where: { telegram_id: OWNER_TELEGRAM_ID },
      });

      if (!adminTelegramUser) {
        this.logger.warn('Owner TelegramUser not found, cannot send notification');
        return;
      }

      // Build user info
      const name = [telegramFrom.first_name, telegramFrom.last_name].filter(Boolean).join(' ') ||
        `@${telegramFrom.username}` ||
        `User ${telegramFrom.id}`;

      const message =
        `🆕 <b>Новая заявка на регистрацию</b>\n\n` +
        `👤 Имя: <b>${name}</b>\n` +
        `📱 Telegram: ${telegramFrom.username ? `@${telegramFrom.username}` : 'не указан'}\n` +
        `🆔 ID: <code>${telegramFrom.id}</code>\n\n` +
        `<b>Выберите действие:</b>`;

      // Create simplified approval keyboard (only MANAGER and OPERATOR)
      const keyboard = this.getAdminApprovalKeyboard(userId, TelegramLanguage.RU);

      await this.sendMessage(adminTelegramUser.chat_id, message, keyboard);

      this.logger.log(`Notification sent to admin about new user ${userId}`);
    } catch (error) {
      this.logger.error('Failed to notify admin about new user:', error);
      // Don't throw - notification failure shouldn't block registration
    }
  }

  /**
   * Handler for /pending_users command - shows list of users awaiting approval
   * Super admin only command
   */
  private async handlePendingUsersCommand(ctx: BotContext): Promise<void> {
    await this.logMessage(ctx, TelegramMessageType.COMMAND, '/pending_users');

    const lang = ctx.telegramUser?.language || TelegramLanguage.RU;

    // Check if super admin
    if (!this.isSuperAdmin(ctx.from?.id.toString())) {
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? '🔒 Эта команда доступна только для супер администратора'
          : '🔒 This command is only available for super admin',
      );
      return;
    }

    try {
      // Get pending users from database
      const pendingUsers = await this.usersService.getPendingUsers();

      if (pendingUsers.length === 0) {
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '✅ Нет пользователей в ожидании одобрения'
            : '✅ No pending users for approval',
        );
        return;
      }

      // Format message with pending users
      const message = this.formatPendingUsersMessage(pendingUsers, lang);

      // Create keyboard with user options
      const keyboard = this.getPendingUsersKeyboard(pendingUsers, lang);

      if (ctx.callbackQuery) {
        await ctx.editMessageText(message, { ...keyboard, parse_mode: 'HTML' });
      } else {
        await ctx.reply(message, { ...keyboard, parse_mode: 'HTML' });
      }
    } catch (error) {
      this.logger.error('Error fetching pending users:', error);
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `❌ Ошибка при загрузке пользователей: ${error.message}`
          : `❌ Error loading users: ${error.message}`,
      );
    }
  }

  /**
   * Handle user approval with role assignment
   */
  private async handleApproveUserAction(
    ctx: BotContext,
    userId: string,
    role: UserRole,
  ): Promise<void> {
    await ctx.answerCbQuery('⏳ Одобрение...');

    const lang = ctx.telegramUser?.language || TelegramLanguage.RU;

    // Check super admin permission
    if (!this.isSuperAdmin(ctx.from?.id.toString())) {
      await ctx.answerCbQuery(
        lang === TelegramLanguage.RU ? 'Недостаточно прав' : 'Insufficient permissions',
        { show_alert: true },
      );
      return;
    }

    try {
      // Get the super admin user from database
      const superAdmin = await this.usersService.findByTelegramId(ctx.from?.id.toString() || '');

      if (!superAdmin) {
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '❌ Администратор не найден'
            : '❌ Administrator not found',
        );
        return;
      }

      // Approve user using the service (which handles credential generation)
      const result = await this.usersService.approveUser(userId, { role }, superAdmin.id);

      // Send approval confirmation to super admin
      await ctx.editMessageText(
        lang === TelegramLanguage.RU
          ? `✅ <b>Пользователь одобрен</b>\n\n` +
              `👤 ${result.user.full_name}\n` +
              `📧 ${result.user.email}\n` +
              `👨‍💼 Роль: <b>${this.formatRole(role, lang)}</b>\n\n` +
              `🔐 Учетные данные:\n` +
              `Username: <code>${result.credentials.username}</code>\n` +
              `Password: <code>${result.credentials.password}</code>\n\n` +
              `📨 Письмо с учетными данными отправлено пользователю.`
          : `✅ <b>User approved</b>\n\n` +
              `👤 ${result.user.full_name}\n` +
              `📧 ${result.user.email}\n` +
              `👨‍💼 Role: <b>${this.formatRole(role, lang)}</b>\n\n` +
              `🔐 Credentials:\n` +
              `Username: <code>${result.credentials.username}</code>\n` +
              `Password: <code>${result.credentials.password}</code>\n\n` +
              `📨 Email with credentials sent to user.`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              lang === TelegramLanguage.RU ? '🔄 Обновить список' : '🔄 Refresh list',
              'refresh_pending_users',
            ),
          ],
        ]),
      );

      // Send approval notification to the user (if they have telegram linked)
      if (result.user.telegram_user_id) {
        try {
          const telegramUserRecord = await this.telegramUserRepository.findOne({
            where: { telegram_id: result.user.telegram_user_id },
          });

          // Determine chat_id and language
          const chatId = telegramUserRecord?.chat_id || result.user.telegram_user_id;
          const userLang = telegramUserRecord?.language || TelegramLanguage.RU;

          const message =
            userLang === TelegramLanguage.RU
              ? `✅ <b>Ваша учетная запись одобрена!</b>\n\n` +
                `🎉 Добро пожаловать в VendHub!\n\n` +
                `🔐 <b>Ваши учетные данные:</b>\n` +
                `Username: <code>${result.credentials.username}</code>\n` +
                `Password: <code>${result.credentials.password}</code>\n\n` +
                `⚠️ <b>Важно:</b> Пароль временный и одноразовый. Вам потребуется изменить его при первом входе.\n\n` +
                `🌐 <a href="${process.env.FRONTEND_URL}">Перейти в VendHub Manager</a>`
              : `✅ <b>Your account has been approved!</b>\n\n` +
                `🎉 Welcome to VendHub!\n\n` +
                `🔐 <b>Your credentials:</b>\n` +
                `Username: <code>${result.credentials.username}</code>\n` +
                `Password: <code>${result.credentials.password}</code>\n\n` +
                `⚠️ <b>Important:</b> Password is temporary and one-time. You'll need to change it on first login.\n\n` +
                `🌐 <a href="${process.env.FRONTEND_URL}">Open VendHub Manager</a>`;

          await this.sendMessage(chatId, message);
        } catch (error) {
          this.logger.warn(`Failed to send telegram notification to user ${userId}:`, error);
          // Don't fail the approval if telegram notification fails
        }
      }
    } catch (error) {
      this.logger.error('Error approving user:', error);
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `❌ Ошибка при одобрении: ${error.message}`
          : `❌ Error approving user: ${error.message}`,
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

    const lang = ctx.telegramUser.language;
    const messageText = ctx.message && 'text' in ctx.message ? ctx.message.text : '';

    try {
      // Check if admin is waiting for rejection reason
      if (ctx.telegramUser.metadata?.pending_rejection_user_id && messageText.length >= 10) {
        const userId = ctx.telegramUser.metadata.pending_rejection_user_id;

        // Check super admin permission
        if (!this.isSuperAdmin(ctx.from?.id.toString())) {
          await ctx.reply(
            lang === TelegramLanguage.RU ? '🔒 Недостаточно прав' : '🔒 Insufficient permissions',
          );
          return;
        }

        // Get the super admin user
        const superAdmin = await this.usersService.findByTelegramId(ctx.from?.id.toString() || '');

        if (!superAdmin) {
          await ctx.reply(
            lang === TelegramLanguage.RU
              ? '❌ Администратор не найден'
              : '❌ Administrator not found',
          );
          return;
        }

        // Reject user
        const rejectedUser = await this.usersService.rejectUser(userId, messageText, superAdmin.id);

        // Clear the pending rejection flag
        ctx.telegramUser.metadata.pending_rejection_user_id = null;
        await this.telegramUserRepository.save(ctx.telegramUser);

        // Send rejection confirmation to super admin
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? `✅ <b>Пользователь отклонен</b>\n\n` +
                `👤 ${rejectedUser.full_name}\n` +
                `📧 ${rejectedUser.email}\n` +
                `📝 Причина: ${messageText}`
            : `✅ <b>User rejected</b>\n\n` +
                `👤 ${rejectedUser.full_name}\n` +
                `📧 ${rejectedUser.email}\n` +
                `📝 Reason: ${messageText}`,
          Markup.inlineKeyboard([
            [
              Markup.button.callback(
                lang === TelegramLanguage.RU ? '🔄 Обновить список' : '🔄 Refresh list',
                'refresh_pending_users',
              ),
            ],
          ]),
        );

        // Send rejection notification to user (if they have telegram linked)
        if (rejectedUser.telegram_user_id) {
          try {
            const telegramUserRecord = await this.telegramUserRepository.findOne({
              where: { telegram_id: rejectedUser.telegram_user_id },
            });

            if (telegramUserRecord) {
              const userLang = telegramUserRecord.language;
              await this.sendMessage(
                telegramUserRecord.chat_id,
                userLang === TelegramLanguage.RU
                  ? `❌ <b>Ваша заявка отклонена</b>\n\n` +
                      `🔍 <b>Причина:</b>\n${messageText}\n\n` +
                      `📞 Если у вас есть вопросы, свяжитесь с администратором.`
                  : `❌ <b>Your application has been rejected</b>\n\n` +
                      `🔍 <b>Reason:</b>\n${messageText}\n\n` +
                      `📞 If you have questions, contact the administrator.`,
              );
            }
          } catch (error) {
            this.logger.warn(`Failed to send telegram notification to user ${userId}:`, error);
          }
        }
      } else if (ctx.telegramUser.metadata?.pending_rejection_user_id) {
        // Reason text is too short
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '❌ Причина должна содержать минимум 10 символов. Попробуйте еще раз.'
            : '❌ Reason must be at least 10 characters. Try again.',
        );
      }
    } catch (error) {
      this.logger.error('Error handling text message:', error);
      await ctx.reply(
        lang === TelegramLanguage.RU ? `❌ Ошибка: ${error.message}` : `❌ Error: ${error.message}`,
      );
    }
  }

  // ============================================================================
  // SPRINT 3: NEW COMMAND HANDLERS
  // ============================================================================

  /**
   * Handler for /incident command - create incident via Telegram
   */
  private async handleIncidentCommand(ctx: BotContext): Promise<void> {
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
    } catch (error) {
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
  private async handleStockCommand(ctx: BotContext): Promise<void> {
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
    } catch (error) {
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
  private async sendMachineStockInfo(
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
  private async handleStaffCommand(ctx: BotContext): Promise<void> {
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
    } catch (error) {
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
  private async handleReportCommand(ctx: BotContext): Promise<void> {
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
    } catch (error) {
      this.logger.error('Error in report command:', error);
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `❌ Ошибка: ${error.message}`
          : `❌ Error: ${error.message}`,
      );
    }
  }

  /**
   * Get task type emoji
   */
  private getTaskTypeEmoji(type: TaskType): string {
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
  private getTaskTypeLabel(type: TaskType, lang: TelegramLanguage): string {
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
  private getIncidentTypeLabel(type: string, lang: TelegramLanguage): string {
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

  /**
   * Format pending users list for super admin
   */
  private formatPendingUsersMessage(
    users: TelegramPendingUserInfo[],
    lang: TelegramLanguage,
  ): string {
    const header = `<b>👥 ${lang === TelegramLanguage.RU ? 'Пользователи в ожидании одобрения' : 'Pending Users'}</b>\n\n`;

    const usersList = users
      .map((user, index) => {
        const registeredDate = new Date(user.created_at).toLocaleDateString(
          lang === TelegramLanguage.RU ? 'ru-RU' : 'en-US',
        );

        return (
          `${index + 1}. <b>${user.full_name}</b>\n` +
          `   📧 ${user.email}\n` +
          `   📱 ${user.phone || 'N/A'}\n` +
          `   📅 ${lang === TelegramLanguage.RU ? 'Дата регистрации' : 'Registered'}: ${registeredDate}\n` +
          `   🆔 <code>${user.id}</code>`
        );
      })
      .join('\n\n');

    const footer =
      lang === TelegramLanguage.RU
        ? `\n\n<i>${users.length} ${users.length === 1 ? 'пользователь' : 'пользователей'} в ожидании</i>`
        : `\n\n<i>${users.length} ${users.length === 1 ? 'user' : 'users'} pending approval</i>`;

    return header + usersList + footer;
  }

  /**
   * Create keyboard for pending users approval actions
   */
  private getPendingUsersKeyboard(users: TelegramPendingUserInfo[], lang: TelegramLanguage) {
    const buttons: TelegramKeyboardRow[] = [];

    // Add buttons for first 5 users
    users.slice(0, 5).forEach((user) => {
      buttons.push([
        Markup.button.callback(
          `👤 ${user.full_name.substring(0, 20)}${user.full_name.length > 20 ? '...' : ''}`,
          `expand_user_${user.id}`,
        ),
      ]);
    });

    buttons.push([
      Markup.button.callback(
        lang === TelegramLanguage.RU ? '🔄 Обновить' : '🔄 Refresh',
        'refresh_pending_users',
      ),
    ]);

    return Markup.inlineKeyboard(buttons);
  }

  /**
   * Get role selection keyboard for user approval
   */
  /**
   * Get simplified keyboard for admin approval notification
   * Shows only MANAGER and OPERATOR roles + Reject button
   */
  private getAdminApprovalKeyboard(userId: string, lang: TelegramLanguage) {
    const buttons = [
      [
        Markup.button.callback(
          lang === TelegramLanguage.RU ? '📊 Одобрить как Менеджер' : '📊 Approve as Manager',
          `approve_user_${userId}_role_${UserRole.MANAGER}`,
        ),
      ],
      [
        Markup.button.callback(
          lang === TelegramLanguage.RU ? '👨‍💼 Одобрить как Оператор' : '👨‍💼 Approve as Operator',
          `approve_user_${userId}_role_${UserRole.OPERATOR}`,
        ),
      ],
      [
        Markup.button.callback(
          lang === TelegramLanguage.RU ? '❌ Отклонить' : '❌ Reject',
          `reject_user_${userId}`,
        ),
      ],
    ];

    return Markup.inlineKeyboard(buttons);
  }

  private getRoleSelectionKeyboard(userId: string, lang: TelegramLanguage) {
    const roles = [
      {
        value: UserRole.OPERATOR,
        label: lang === TelegramLanguage.RU ? '👨‍💼 Оператор' : '👨‍💼 Operator',
      },
      {
        value: UserRole.COLLECTOR,
        label: lang === TelegramLanguage.RU ? '💰 Инкассатор' : '💰 Collector',
      },
      {
        value: UserRole.TECHNICIAN,
        label: lang === TelegramLanguage.RU ? '🔧 Техник' : '🔧 Technician',
      },
      {
        value: UserRole.MANAGER,
        label: lang === TelegramLanguage.RU ? '📊 Менеджер' : '📊 Manager',
      },
      { value: UserRole.VIEWER, label: lang === TelegramLanguage.RU ? '👁️ Просмотр' : '👁️ Viewer' },
    ];

    const buttons = roles.map((role) => [
      Markup.button.callback(role.label, `approve_user_${userId}_role_${role.value}`),
    ]);

    buttons.push([
      Markup.button.callback(
        lang === TelegramLanguage.RU ? '❌ Отклонить' : '❌ Reject',
        `reject_user_${userId}`,
      ),
    ]);

    return Markup.inlineKeyboard(buttons);
  }

  /**
   * Format role name for display
   */
  private formatRole(role: UserRole, lang: TelegramLanguage): string {
    const roleMap = {
      [UserRole.OWNER]: lang === TelegramLanguage.RU ? 'Владелец' : 'Owner',
      [UserRole.ADMIN]: lang === TelegramLanguage.RU ? 'Администратор' : 'Admin',
      [UserRole.MANAGER]: lang === TelegramLanguage.RU ? 'Менеджер' : 'Manager',
      [UserRole.OPERATOR]: lang === TelegramLanguage.RU ? 'Оператор' : 'Operator',
      [UserRole.COLLECTOR]: lang === TelegramLanguage.RU ? 'Инкассатор' : 'Collector',
      [UserRole.TECHNICIAN]: lang === TelegramLanguage.RU ? 'Техник' : 'Technician',
      [UserRole.VIEWER]: lang === TelegramLanguage.RU ? 'Просмотр' : 'Viewer',
    };

    return roleMap[role] || role;
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

  /**
   * Get execution state from task metadata
   */
  private getExecutionState(task: TelegramTaskInfo): TaskExecutionState | null {
    return (
      ((task.metadata as Record<string, unknown> | null)
        ?.telegram_execution_state as TaskExecutionState | null) || null
    );
  }

  /**
   * Update task execution state with pessimistic locking to prevent race conditions
   * Uses QueryRunner to ensure atomic updates of task metadata
   *
   * @param taskId - Task ID to update
   * @param state - New execution state
   * @throws Error if task not found or update fails
   */
  private async updateExecutionState(taskId: string, state: TaskExecutionState): Promise<void> {
    try {
      const task = await this.tasksService.findOne(taskId);

      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      // Update task metadata with new execution state
      const metadata = task.metadata || {};
      metadata.telegram_execution_state = {
        ...state,
        last_interaction_at: new Date().toISOString(),
      };

      // Update the task via service
      await this.tasksService.update(taskId, { metadata });
    } catch (error) {
      this.logger.error(`Failed to update execution state for task ${taskId}:`, error);
      throw error;
    }
  }

  /**
   * Show current step with inline keyboard
   */
  private async showCurrentStep(
    ctx: BotContext,
    task: TelegramTaskInfo,
    state: TaskExecutionState,
    lang: TelegramLanguage,
  ): Promise<void> {
    const checklist = task.checklist || [];

    if (!checklist.length) {
      // No checklist, just show basic instructions
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `📋 Задача без чек-листа\n\n` +
              `📸 Загрузите фото ДО и ПОСЛЕ выполнения\n` +
              `После загрузки фото используйте /complete_task ${task.id}`
          : `📋 Task without checklist\n\n` +
              `📸 Upload BEFORE and AFTER photos\n` +
              `After uploading photos use /complete_task ${task.id}`,
      );
      return;
    }

    const currentStep = state.current_step;
    const totalSteps = checklist.length;
    const currentItem = checklist[currentStep];

    if (currentStep >= totalSteps) {
      // All steps completed
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? `✅ Все шаги выполнены! (${totalSteps}/${totalSteps})\n\n` +
              `${state.photos_uploaded.before ? '✅' : '❌'} Фото ДО\n` +
              `${state.photos_uploaded.after ? '✅' : '❌'} Фото ПОСЛЕ\n\n` +
              (state.photos_uploaded.before && state.photos_uploaded.after
                ? `🎉 Задача готова к завершению!\n\n` + `Используйте /complete_task ${task.id}`
                : `📸 Загрузите ${!state.photos_uploaded.before ? 'фото ДО' : 'фото ПОСЛЕ'}`)
          : `✅ All steps completed! (${totalSteps}/${totalSteps})\n\n` +
              `${state.photos_uploaded.before ? '✅' : '❌'} BEFORE photo\n` +
              `${state.photos_uploaded.after ? '✅' : '❌'} AFTER photo\n\n` +
              (state.photos_uploaded.before && state.photos_uploaded.after
                ? `🎉 Task ready to complete!\n\n` + `Use /complete_task ${task.id}`
                : `📸 Upload ${!state.photos_uploaded.before ? 'BEFORE photo' : 'AFTER photo'}`),
        Markup.inlineKeyboard([
          [
            Markup.button.callback(
              lang === TelegramLanguage.RU ? '◀️ Назад' : '◀️ Back',
              `step_back_${task.id}`,
            ),
          ],
        ]),
      );
      return;
    }

    // Show current step
    const progressBar = this.buildProgressBar(state.checklist_progress, totalSteps);
    const completedCount = Object.values(state.checklist_progress).filter(
      (p) => p.completed,
    ).length;

    await ctx.reply(
      lang === TelegramLanguage.RU
        ? `📋 Шаг ${currentStep + 1}/${totalSteps}\n` +
            `${progressBar}\n\n` +
            `${currentItem.item}\n\n` +
            `✅ Выполнено: ${completedCount}/${totalSteps}`
        : `📋 Step ${currentStep + 1}/${totalSteps}\n` +
            `${progressBar}\n\n` +
            `${currentItem.item}\n\n` +
            `✅ Completed: ${completedCount}/${totalSteps}`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            lang === TelegramLanguage.RU ? '✅ Готово' : '✅ Done',
            `step_done_${task.id}_${currentStep}`,
          ),
          Markup.button.callback(
            lang === TelegramLanguage.RU ? '⏭️ Пропустить' : '⏭️ Skip',
            `step_skip_${task.id}_${currentStep}`,
          ),
        ],
        currentStep > 0
          ? [
              Markup.button.callback(
                lang === TelegramLanguage.RU ? '◀️ Назад' : '◀️ Back',
                `step_back_${task.id}`,
              ),
            ]
          : [],
      ]),
    );
  }

  /**
   * Build visual progress bar
   */
  private buildProgressBar(progress: Record<number, any>, total: number): string {
    let bar = '';
    for (let i = 0; i < total; i++) {
      bar += progress[i]?.completed ? '🟩' : '⬜';
    }
    return bar;
  }

  /**
   * Mark current step as completed and move to next
   */
  private async handleStepCompletion(
    ctx: BotContext,
    taskId: string,
    stepIndex: number,
    skipped: boolean = false,
  ): Promise<void> {
    if (!ctx.telegramUser?.is_verified) {
      return;
    }

    const lang = ctx.telegramUser.language;

    try {
      const task = await this.tasksService.findOne(taskId);
      const state = this.getExecutionState(task);

      if (!state) {
        await ctx.reply(
          lang === TelegramLanguage.RU
            ? '❌ Состояние выполнения не найдено'
            : '❌ Execution state not found',
        );
        return;
      }

      // Validate step index bounds
      const checklistLength = task.checklist?.length || 0;
      if (stepIndex < 0 || stepIndex >= checklistLength) {
        this.logger.warn(
          `Step index out of bounds for task ${taskId}: index=${stepIndex}, checklist_length=${checklistLength}`,
        );
        await ctx.reply(
          lang === TelegramLanguage.RU ? '❌ Некорректный номер шага' : '❌ Invalid step number',
        );
        return;
      }

      // Mark step as completed
      state.checklist_progress[stepIndex] = {
        completed: !skipped,
        completed_at: new Date().toISOString(),
      };

      // Move to next step with bounds check
      // Cap at checklist length to prevent overflow
      state.current_step = Math.min(stepIndex + 1, checklistLength);

      // Update task checklist
      if (task.checklist && task.checklist[stepIndex]) {
        task.checklist[stepIndex].completed = !skipped;
        await this.tasksService.update(taskId, {
          checklist: task.checklist,
        });
      }

      // Save state
      await this.updateExecutionState(taskId, state);

      // Show next step
      const updatedTask = await this.tasksService.findOne(taskId);
      await this.showCurrentStep(ctx, updatedTask, state, lang);
    } catch (error) {
      this.logger.error('Error handling step completion:', error);
      await ctx.reply(
        lang === TelegramLanguage.RU ? `❌ Ошибка: ${error.message}` : `❌ Error: ${error.message}`,
      );
    }
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
