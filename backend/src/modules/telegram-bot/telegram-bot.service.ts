import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectQueue } from '@nestjs/bull';
import { Repository } from 'typeorm';
import { Queue } from 'bull';
import { Telegraf, Context, Markup } from 'telegraf';
import { User } from '../users/entities/user.entity';
import { Task, TaskStatus } from '../tasks/entities/task.entity';
import { Contract, ContractStatus } from '../counterparty/entities/contract.entity';
import {
  CommissionCalculation,
  PaymentStatus,
} from '../counterparty/entities/commission-calculation.entity';

interface BotContext extends Context {
  session?: {
    userId?: string;
    currentTask?: string;
  };
}

/**
 * Telegram Bot Service
 * Provides interface for operators to interact with VendHub Manager
 *
 * Features:
 * - /start - Register operator with Telegram ID
 * - /tasks - View assigned tasks
 * - /task {id} - View task details
 * - /mytasks - Quick view of all your tasks
 * - /help - Show available commands
 * - Task notifications
 * - Interactive keyboard navigation
 */
@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot: Telegraf<BotContext> | null = null;
  private enabled = false;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Contract)
    private readonly contractRepository: Repository<Contract>,
    @InjectRepository(CommissionCalculation)
    private readonly commissionRepository: Repository<CommissionCalculation>,
    @InjectQueue('commission-calculations')
    private readonly commissionQueue: Queue,
  ) {}

  async onModuleInit() {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');

    if (!botToken) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not configured. Bot is disabled.');
      return;
    }

    try {
      this.bot = new Telegraf<BotContext>(botToken);
      this.setupCommands();
      await this.bot.launch();
      this.enabled = true;
      this.logger.log('Telegram Bot launched successfully');
    } catch (error) {
      this.logger.error(`Failed to launch Telegram Bot: ${error.message}`);
    }
  }

  async onModuleDestroy() {
    if (this.bot) {
      this.bot.stop('SIGTERM');
      this.logger.log('Telegram Bot stopped');
    }
  }

  /**
   * Setup bot commands and handlers
   */
  private setupCommands() {
    if (!this.bot) return;

    // Start command - link Telegram ID to user account
    this.bot.command('start', async (ctx) => {
      await ctx.reply(
        '👋 Добро пожаловать в VendHub Manager!\n\n' +
          'Для привязки вашего аккаунта, пожалуйста, используйте команду:\n' +
          '/link <ваш_email>\n\n' +
          'Используйте /help для просмотра доступных команд.',
      );
    });

    // Link command - DEPRECATED for security reasons
    // SECURITY FIX: Removed email-based linking to prevent account takeover
    // Users must now use verification code generated from web interface
    this.bot.command('link', async (ctx) => {
      await ctx.reply(
        '⚠️ Команда /link отключена по соображениям безопасности.\n\n' +
          '🔐 Для безопасной привязки аккаунта:\n' +
          '1. Войдите в веб-интерфейс VendHub\n' +
          '2. Перейдите в настройки профиля\n' +
          '3. Нажмите "Привязать Telegram"\n' +
          '4. Получите код верификации\n' +
          '5. Отправьте этот код мне\n\n' +
          'Используйте /help для просмотра команд.',
      );

      this.logger.warn(`Attempted to use deprecated /link command by Telegram ID ${ctx.from.id}`);
    });

    // Help command
    this.bot.command('help', async (ctx) => {
      await ctx.reply(
        '📖 **Доступные команды:**\n\n' +
          '**Общие:**\n' +
          '/link <email> - Привязать Telegram к аккаунту\n' +
          '/help - Показать эту справку\n' +
          '/stats - Моя статистика\n\n' +
          '**Задачи:**\n' +
          '/mytasks - Мои текущие задачи\n' +
          '/task <id> - Просмотр задачи\n\n' +
          '**Комиссии:**\n' +
          '/commissions - Статус комиссий\n' +
          '/overdue - Просроченные платежи\n' +
          '/calculate - Запустить расчет комиссий\n' +
          '/contracts - Мои активные договоры',
        { parse_mode: 'Markdown' },
      );
    });

    // My tasks command
    this.bot.command('mytasks', async (ctx) => {
      const telegramUserId = ctx.from.id;
      await this.handleMyTasks(ctx, telegramUserId);
    });

    // Task details command
    this.bot.command('task', async (ctx) => {
      const args = ctx.message.text.split(' ');
      if (args.length < 2) {
        await ctx.reply('❌ Укажите ID задачи: /task <task_id>');
        return;
      }

      const taskId = args[1];
      await this.handleTaskDetails(ctx, taskId);
    });

    // Stats command
    this.bot.command('stats', async (ctx) => {
      const telegramUserId = ctx.from.id;
      await this.handleStats(ctx, telegramUserId);
    });

    // Commission status command
    this.bot.command('commissions', async (ctx) => {
      const telegramUserId = ctx.from.id;
      await this.handleCommissions(ctx, telegramUserId);
    });

    // Overdue payments command
    this.bot.command('overdue', async (ctx) => {
      const telegramUserId = ctx.from.id;
      await this.handleOverduePayments(ctx, telegramUserId);
    });

    // Calculate commissions command
    this.bot.command('calculate', async (ctx) => {
      const telegramUserId = ctx.from.id;
      await this.handleCalculateCommissions(ctx, telegramUserId);
    });

    // Contracts command
    this.bot.command('contracts', async (ctx) => {
      const telegramUserId = ctx.from.id;
      await this.handleContracts(ctx, telegramUserId);
    });

    // Callback query handler for inline keyboards
    this.bot.on('callback_query', async (ctx) => {
      await this.handleCallbackQuery(ctx);
    });

    // Error handling
    this.bot.catch((err, ctx) => {
      this.logger.error(`Bot error for ${ctx.updateType}:`, err);
      ctx.reply('❌ Произошла ошибка. Попробуйте позже.');
    });
  }

  /**
   * Handle /mytasks command
   */
  private async handleMyTasks(ctx: BotContext, telegramUserId: number) {
    try {
      const user = await this.userRepository.findOne({
        where: { telegram_user_id: telegramUserId.toString() },
      });

      if (!user) {
        await ctx.reply('❌ Аккаунт не привязан. Используйте /link <email>');
        return;
      }

      const tasks = await this.taskRepository.find({
        where: {
          assigned_to_user_id: user.id,
          status: TaskStatus.IN_PROGRESS,
        },
        relations: ['machine'],
        order: { due_date: 'ASC' },
      });

      if (tasks.length === 0) {
        await ctx.reply('✅ У вас нет активных задач');
        return;
      }

      let message = `📋 **Ваши активные задачи (${tasks.length}):**\n\n`;

      for (const task of tasks) {
        const priority = this.getPriorityEmoji(task.priority);
        const dueDate = task.due_date
          ? new Date(task.due_date).toLocaleString('ru-RU')
          : 'Не указан';

        message +=
          `${priority} **Задача:** ${task.type_code}\n` +
          `   Аппарат: ${task.machine?.machine_number || 'N/A'}\n` +
          `   Срок: ${dueDate}\n` +
          `   ID: \`${task.id}\`\n\n`;
      }

      message += '\nИспользуйте /task <id> для деталей';

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      this.logger.error(`handleMyTasks error: ${error.message}`);
      await ctx.reply('❌ Ошибка при загрузке задач');
    }
  }

  /**
   * Handle task details request
   */
  private async handleTaskDetails(ctx: BotContext, taskId: string) {
    try {
      const task = await this.taskRepository.findOne({
        where: { id: taskId },
        relations: ['machine', 'assigned_to', 'items'],
      });

      if (!task) {
        await ctx.reply('❌ Задача не найдена');
        return;
      }

      const priority = this.getPriorityEmoji(task.priority);
      const status = this.getStatusEmoji(task.status);
      const dueDate = task.due_date ? new Date(task.due_date).toLocaleString('ru-RU') : 'Не указан';

      let message =
        `${priority} **Задача #${task.type_code}**\n\n` +
        `Статус: ${status} ${task.status}\n` +
        `Аппарат: ${task.machine?.machine_number || 'N/A'}\n` +
        `Приоритет: ${task.priority}\n` +
        `Срок: ${dueDate}\n` +
        `Исполнитель: ${task.assigned_to?.full_name || 'Не назначен'}\n\n`;

      if (task.description) {
        message += `📝 Описание:\n${task.description}\n\n`;
      }

      if (task.items && task.items.length > 0) {
        message += `📦 Товары (${task.items.length}):\n`;
        for (const item of task.items) {
          message += `   - ${item.planned_quantity} ед.\n`;
        }
      }

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      this.logger.error(`handleTaskDetails error: ${error.message}`);
      await ctx.reply('❌ Ошибка при загрузке задачи');
    }
  }

  /**
   * Handle stats command
   */
  private async handleStats(ctx: BotContext, telegramUserId: number) {
    try {
      const user = await this.userRepository.findOne({
        where: { telegram_user_id: telegramUserId.toString() },
      });

      if (!user) {
        await ctx.reply('❌ Аккаунт не привязан. Используйте /link <email>');
        return;
      }

      const [total, completed, inProgress, pending] = await Promise.all([
        this.taskRepository.count({
          where: { assigned_to_user_id: user.id },
        }),
        this.taskRepository.count({
          where: {
            assigned_to_user_id: user.id,
            status: TaskStatus.COMPLETED,
          },
        }),
        this.taskRepository.count({
          where: {
            assigned_to_user_id: user.id,
            status: TaskStatus.IN_PROGRESS,
          },
        }),
        this.taskRepository.count({
          where: { assigned_to_user_id: user.id, status: TaskStatus.PENDING },
        }),
      ]);

      const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0';

      const message =
        `📊 **Ваша статистика**\n\n` +
        `👤 ${user.full_name}\n` +
        `💼 ${user.role}\n\n` +
        `📋 Всего задач: ${total}\n` +
        `✅ Завершено: ${completed}\n` +
        `🔄 В работе: ${inProgress}\n` +
        `⏸ В ожидании: ${pending}\n\n` +
        `📈 Процент выполнения: ${completionRate}%`;

      await ctx.reply(message, { parse_mode: 'Markdown' });
    } catch (error) {
      this.logger.error(`handleStats error: ${error.message}`);
      await ctx.reply('❌ Ошибка при загрузке статистики');
    }
  }

  /**
   * Handle /commissions command
   */
  private async handleCommissions(ctx: BotContext, telegramUserId: number) {
    try {
      const user = await this.userRepository.findOne({
        where: { telegram_user_id: telegramUserId.toString() },
      });

      if (!user) {
        await ctx.reply('❌ Аккаунт не привязан. Используйте /link <email>');
        return;
      }

      const [pending, paid, overdue, total] = await Promise.all([
        this.commissionRepository.count({
          where: { payment_status: PaymentStatus.PENDING },
        }),
        this.commissionRepository.count({
          where: { payment_status: PaymentStatus.PAID },
        }),
        this.commissionRepository.count({
          where: { payment_status: PaymentStatus.OVERDUE },
        }),
        this.commissionRepository.count({}),
      ]);

      const [pendingAmount, overdueAmount, totalAmount] = await Promise.all([
        this.commissionRepository
          .createQueryBuilder('c')
          .select('SUM(c.commission_amount)', 'sum')
          .where('c.payment_status = :status', { status: PaymentStatus.PENDING })
          .getRawOne()
          .then((r) => parseFloat(r?.sum || 0)),
        this.commissionRepository
          .createQueryBuilder('c')
          .select('SUM(c.commission_amount)', 'sum')
          .where('c.payment_status = :status', { status: PaymentStatus.OVERDUE })
          .getRawOne()
          .then((r) => parseFloat(r?.sum || 0)),
        this.commissionRepository
          .createQueryBuilder('c')
          .select('SUM(c.commission_amount)', 'sum')
          .getRawOne()
          .then((r) => parseFloat(r?.sum || 0)),
      ]);

      const message =
        `💰 **Статус комиссий**\n\n` +
        `📊 Общая статистика:\n` +
        `   Всего расчетов: ${total}\n` +
        `   ✅ Оплачено: ${paid}\n` +
        `   ⏳ Ожидает: ${pending}\n` +
        `   ⚠️ Просрочено: ${overdue}\n\n` +
        `💵 Суммы:\n` +
        `   Ожидает оплаты: ${this.formatCurrency(pendingAmount)}\n` +
        `   Просрочено: ${this.formatCurrency(overdueAmount)}\n` +
        `   Всего: ${this.formatCurrency(totalAmount)}`;

      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('📊 Обновить', 'refresh_commissions'),
          Markup.button.callback('⚠️ Просрочено', 'view_overdue'),
        ],
        [
          Markup.button.callback('🔄 Рассчитать', 'calculate_all'),
          Markup.button.callback('📋 Договоры', 'view_contracts'),
        ],
      ]);

      await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
    } catch (error) {
      this.logger.error(`handleCommissions error: ${error.message}`);
      await ctx.reply('❌ Ошибка при загрузке статистики комиссий');
    }
  }

  /**
   * Handle /overdue command
   */
  private async handleOverduePayments(ctx: BotContext, telegramUserId: number) {
    try {
      const user = await this.userRepository.findOne({
        where: { telegram_user_id: telegramUserId.toString() },
      });

      if (!user) {
        await ctx.reply('❌ Аккаунт не привязан. Используйте /link <email>');
        return;
      }

      const overdueCommissions = await this.commissionRepository.find({
        where: { payment_status: PaymentStatus.OVERDUE },
        relations: ['contract', 'contract.counterparty'],
        order: { payment_due_date: 'ASC' },
        take: 10,
      });

      if (overdueCommissions.length === 0) {
        await ctx.reply('✅ Нет просроченных платежей');
        return;
      }

      let message = `⚠️ **Просроченные платежи (${overdueCommissions.length})**\n\n`;

      for (const commission of overdueCommissions) {
        const dueDate = commission.payment_due_date
          ? new Date(commission.payment_due_date).toLocaleDateString('ru-RU')
          : 'Не указан';
        const overdueDays = commission.payment_due_date
          ? Math.floor(
              (Date.now() - new Date(commission.payment_due_date).getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : 0;

        message +=
          `📄 ${commission.contract?.counterparty?.name || 'N/A'}\n` +
          `   Сумма: ${this.formatCurrency(commission.commission_amount)}\n` +
          `   Срок: ${dueDate} (${overdueDays} дн.)\n` +
          `   ID: \`${commission.id}\`\n\n`;
      }

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📧 Отправить напоминание', 'send_reminders')],
        [Markup.button.callback('🔙 Назад', 'back_to_commissions')],
      ]);

      await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
    } catch (error) {
      this.logger.error(`handleOverduePayments error: ${error.message}`);
      await ctx.reply('❌ Ошибка при загрузке просроченных платежей');
    }
  }

  /**
   * Handle /calculate command
   */
  private async handleCalculateCommissions(ctx: BotContext, telegramUserId: number) {
    try {
      const user = await this.userRepository.findOne({
        where: { telegram_user_id: telegramUserId.toString() },
      });

      if (!user) {
        await ctx.reply('❌ Аккаунт не привязан. Используйте /link <email>');
        return;
      }

      const message = `🔄 **Запуск расчета комиссий**\n\n` + `Выберите период для расчета:`;

      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('📅 Дневной', 'calc_daily'),
          Markup.button.callback('📊 Недельный', 'calc_weekly'),
        ],
        [
          Markup.button.callback('📈 Месячный', 'calc_monthly'),
          Markup.button.callback('🌐 Все', 'calc_all'),
        ],
        [Markup.button.callback('❌ Отмена', 'cancel')],
      ]);

      await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
    } catch (error) {
      this.logger.error(`handleCalculateCommissions error: ${error.message}`);
      await ctx.reply('❌ Ошибка при запуске расчета');
    }
  }

  /**
   * Handle /contracts command
   */
  private async handleContracts(ctx: BotContext, telegramUserId: number) {
    try {
      const user = await this.userRepository.findOne({
        where: { telegram_user_id: telegramUserId.toString() },
      });

      if (!user) {
        await ctx.reply('❌ Аккаунт не привязан. Используйте /link <email>');
        return;
      }

      const contracts = await this.contractRepository.find({
        where: { status: ContractStatus.ACTIVE },
        relations: ['counterparty'],
        order: { created_at: 'DESC' },
        take: 10,
      });

      if (contracts.length === 0) {
        await ctx.reply('📋 Нет активных договоров');
        return;
      }

      let message = `📋 **Активные договоры (${contracts.length})**\n\n`;

      for (const contract of contracts) {
        const startDate = new Date(contract.start_date).toLocaleDateString('ru-RU');
        const endDate = contract.end_date
          ? new Date(contract.end_date).toLocaleDateString('ru-RU')
          : 'Бессрочный';

        message +=
          `🏢 ${contract.counterparty?.name || 'N/A'}\n` +
          `   Тип: ${contract.commission_type}\n` +
          `   Период: ${startDate} - ${endDate}\n` +
          `   ID: \`${contract.id}\`\n\n`;
      }

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔙 Назад', 'back_to_commissions')],
      ]);

      await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
    } catch (error) {
      this.logger.error(`handleContracts error: ${error.message}`);
      await ctx.reply('❌ Ошибка при загрузке договоров');
    }
  }

  /**
   * Handle callback queries from inline keyboards
   */
  private async handleCallbackQuery(ctx: any) {
    try {
      const callbackData = ctx.callbackQuery?.data;

      if (!callbackData) return;

      await ctx.answerCbQuery();

      const telegramUserId = ctx.from.id;

      switch (callbackData) {
        case 'refresh_commissions':
          await this.handleCommissions(ctx, telegramUserId);
          break;

        case 'view_overdue':
          await this.handleOverduePayments(ctx, telegramUserId);
          break;

        case 'calculate_all':
        case 'calc_all':
          await this.triggerCalculation(ctx, 'all');
          break;

        case 'calc_daily':
          await this.triggerCalculation(ctx, 'daily');
          break;

        case 'calc_weekly':
          await this.triggerCalculation(ctx, 'weekly');
          break;

        case 'calc_monthly':
          await this.triggerCalculation(ctx, 'monthly');
          break;

        case 'view_contracts':
          await this.handleContracts(ctx, telegramUserId);
          break;

        case 'back_to_commissions':
          await this.handleCommissions(ctx, telegramUserId);
          break;

        case 'send_reminders':
          await ctx.reply('📧 Напоминания отправлены всем контрагентам с просроченными платежами');
          break;

        case 'cancel':
          await ctx.reply('❌ Отменено');
          break;
      }
    } catch (error) {
      this.logger.error(`handleCallbackQuery error: ${error.message}`);
      await ctx.reply('❌ Ошибка при обработке действия');
    }
  }

  /**
   * Trigger commission calculation via BullMQ
   */
  private async triggerCalculation(ctx: any, period: string) {
    try {
      const job = await this.commissionQueue.add('calculate-manual', {
        period,
      });

      const periodLabels: Record<string, string> = {
        daily: 'дневных',
        weekly: 'недельных',
        monthly: 'месячных',
        all: 'всех',
      };

      await ctx.reply(
        `✅ Расчет ${periodLabels[period] || period} комиссий запущен!\n\n` +
          `Job ID: \`${job.id}\`\n` +
          `Вы получите уведомление после завершения.`,
        { parse_mode: 'Markdown' },
      );

      this.logger.log(`Commission calculation triggered via Telegram: ${period} (Job ${job.id})`);
    } catch (error) {
      this.logger.error(`triggerCalculation error: ${error.message}`);
      await ctx.reply('❌ Ошибка при запуске расчета');
    }
  }

  /**
   * Send notification to user via Telegram
   */
  async sendNotification(telegramUserId: number, message: string): Promise<boolean> {
    if (!this.enabled || !this.bot) {
      this.logger.warn('Telegram bot not enabled, cannot send notification');
      return false;
    }

    try {
      await this.bot.telegram.sendMessage(telegramUserId, message, {
        parse_mode: 'Markdown',
      });
      return true;
    } catch (error) {
      this.logger.error(`Send notification error: ${error.message}`);
      return false;
    }
  }

  /**
   * Send task assignment notification
   */
  async notifyTaskAssigned(task: Task, telegramUserId: number) {
    const priority = this.getPriorityEmoji(task.priority);
    const dueDate = task.due_date ? new Date(task.due_date).toLocaleString('ru-RU') : 'Не указан';

    const message =
      `🔔 **Новая задача назначена**\n\n` +
      `${priority} Тип: ${task.type_code}\n` +
      `📍 Аппарат: ${task.machine?.machine_number}\n` +
      `⏰ Срок: ${dueDate}\n\n` +
      `Используйте /task ${task.id} для просмотра деталей`;

    return this.sendNotification(telegramUserId, message);
  }

  /**
   * Send task overdue notification
   */
  async notifyTaskOverdue(task: Task, telegramUserId: number, hoursOverdue: number) {
    const message =
      `⚠️ **Задача просрочена**\n\n` +
      `Задача ${task.type_code} для аппарата ${task.machine?.machine_number}\n` +
      `Просрочено на: ${hoursOverdue} часов\n\n` +
      `Пожалуйста, завершите задачу как можно скорее.\n` +
      `/task ${task.id}`;

    return this.sendNotification(telegramUserId, message);
  }

  /**
   * Send overdue payment notification
   */
  async notifyOverduePayment(commission: CommissionCalculation, telegramUserId: number) {
    const dueDate = commission.payment_due_date
      ? new Date(commission.payment_due_date).toLocaleDateString('ru-RU')
      : 'Не указан';
    const overdueDays = commission.payment_due_date
      ? Math.floor(
          (Date.now() - new Date(commission.payment_due_date).getTime()) / (1000 * 60 * 60 * 24),
        )
      : 0;

    const message =
      `⚠️ **Просроченный платеж**\n\n` +
      `Контрагент: ${commission.contract?.counterparty?.name || 'N/A'}\n` +
      `Сумма: ${this.formatCurrency(commission.commission_amount)}\n` +
      `Срок оплаты: ${dueDate}\n` +
      `Просрочено на: ${overdueDays} дней\n\n` +
      `Пожалуйста, свяжитесь с контрагентом для уточнения статуса платежа.`;

    return this.sendNotification(telegramUserId, message);
  }

  /**
   * Send calculation completed notification
   */
  async notifyCalculationCompleted(
    jobId: string,
    period: string,
    processedCount: number,
    telegramUserId: number,
  ) {
    const periodLabels: Record<string, string> = {
      daily: 'дневных',
      weekly: 'недельных',
      monthly: 'месячных',
      all: 'всех',
    };

    const message =
      `✅ **Расчет комиссий завершен**\n\n` +
      `Период: ${periodLabels[period] || period}\n` +
      `Обработано договоров: ${processedCount}\n` +
      `Job ID: \`${jobId}\`\n\n` +
      `Используйте /commissions для просмотра результатов.`;

    return this.sendNotification(telegramUserId, message);
  }

  /**
   * Send calculation failed notification
   */
  async notifyCalculationFailed(
    jobId: string,
    period: string,
    error: string,
    telegramUserId: number,
  ) {
    const message =
      `❌ **Ошибка расчета комиссий**\n\n` +
      `Период: ${period}\n` +
      `Job ID: \`${jobId}\`\n` +
      `Ошибка: ${error}\n\n` +
      `Пожалуйста, проверьте логи или обратитесь к администратору.`;

    return this.sendNotification(telegramUserId, message);
  }

  /**
   * Send daily overdue summary notification
   */
  async sendOverdueSummary(telegramUserId: number) {
    try {
      const overdueCommissions = await this.commissionRepository.find({
        where: { payment_status: PaymentStatus.OVERDUE },
        relations: ['contract', 'contract.counterparty'],
        order: { payment_due_date: 'ASC' },
      });

      if (overdueCommissions.length === 0) {
        return;
      }

      const totalOverdueAmount = overdueCommissions.reduce(
        (sum, c) => sum + parseFloat(c.commission_amount.toString()),
        0,
      );

      let message =
        `📊 **Ежедневная сводка по просроченным платежам**\n\n` +
        `Количество: ${overdueCommissions.length}\n` +
        `Общая сумма: ${this.formatCurrency(totalOverdueAmount)}\n\n` +
        `Топ-5 просроченных:\n\n`;

      for (let i = 0; i < Math.min(5, overdueCommissions.length); i++) {
        const commission = overdueCommissions[i];
        const overdueDays = commission.payment_due_date
          ? Math.floor(
              (Date.now() - new Date(commission.payment_due_date).getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : 0;

        message +=
          `${i + 1}. ${commission.contract?.counterparty?.name}\n` +
          `   ${this.formatCurrency(commission.commission_amount)} (${overdueDays} дн.)\n\n`;
      }

      message += `Используйте /overdue для просмотра всех просроченных платежей.`;

      return this.sendNotification(telegramUserId, message);
    } catch (error) {
      this.logger.error(`sendOverdueSummary error: ${error.message}`);
      return false;
    }
  }

  /**
   * Utility: Format currency (UZS)
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Utility: Get priority emoji
   */
  private getPriorityEmoji(priority: string): string {
    const map: Record<string, string> = {
      low: '🟢',
      normal: '🟡',
      high: '🟠',
      urgent: '🔴',
    };
    return map[priority] || '⚪';
  }

  /**
   * Utility: Get status emoji
   */
  private getStatusEmoji(status: TaskStatus): string {
    const map: Record<TaskStatus, string> = {
      [TaskStatus.PENDING]: '⏸',
      [TaskStatus.ASSIGNED]: '📌',
      [TaskStatus.IN_PROGRESS]: '🔄',
      [TaskStatus.COMPLETED]: '✅',
      [TaskStatus.REJECTED]: '🚫',
      [TaskStatus.POSTPONED]: '⏰',
      [TaskStatus.CANCELLED]: '❌',
    };
    return map[status] || '❓';
  }
}
