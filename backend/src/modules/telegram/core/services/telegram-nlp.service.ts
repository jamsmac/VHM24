import { Injectable, Logger } from '@nestjs/common';
import { Context, Markup } from 'telegraf';
import { TelegramUser, TelegramLanguage } from '../../shared/entities/telegram-user.entity';
import { TelegramMessageType } from '../../shared/entities/telegram-message-log.entity';
import { TasksService } from '../../../tasks/tasks.service';
import { UsersService } from '../../../users/users.service';
import { MachinesService } from '../../../machines/machines.service';
import { TransactionsService } from '../../../transactions/transactions.service';
import { InventoryService } from '../../../inventory/inventory.service';
import { IncidentsService } from '../../../incidents/incidents.service';
import { TaskStatus, TaskType } from '../../../tasks/entities/task.entity';
import { MachineStatus } from '../../../machines/entities/machine.entity';
import { IncidentStatus } from '../../../incidents/entities/incident.entity';
import { TelegramCacheService } from '../../infrastructure/services/telegram-cache.service';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

interface BotContext extends Context {
  telegramUser?: TelegramUser;
}

interface NlpHelpers {
  t: (lang: TelegramLanguage, key: string, ...args: string[]) => string;
  logMessage: (ctx: BotContext, type: TelegramMessageType, command?: string) => Promise<void>;
}

/**
 * Query intent recognized from natural language
 */
enum QueryIntent {
  TASKS_TODAY = 'tasks_today',
  TASKS_PENDING = 'tasks_pending',
  TASKS_BY_TYPE = 'tasks_by_type',
  MACHINES_STATUS = 'machines_status',
  MACHINES_PROBLEMS = 'machines_problems',
  MACHINES_LOW_STOCK = 'machines_low_stock',
  REVENUE_TODAY = 'revenue_today',
  REVENUE_WEEK = 'revenue_week',
  INCIDENTS_OPEN = 'incidents_open',
  PERFORMANCE_TODAY = 'performance_today',
  HELP = 'help',
  UNKNOWN = 'unknown',
}

/**
 * Query context extracted from natural language
 */
interface QueryContext {
  intent: QueryIntent;
  taskType?: TaskType;
  machineNumber?: string;
  timeRange?: 'today' | 'week' | 'month';
  confidence: number;
}

/**
 * TelegramNlpService
 *
 * Handles natural language queries via /ask command.
 * Parses user questions and retrieves relevant data.
 *
 * Examples:
 * - "How many refills today?" -> Tasks count by type
 * - "Which machines need attention?" -> Problem machines
 * - "Today's revenue?" -> Transaction summary
 *
 * @module TelegramCoreModule
 */
@Injectable()
export class TelegramNlpService {
  private readonly logger = new Logger(TelegramNlpService.name);
  private helpers: NlpHelpers | null = null;

  // Intent patterns for Russian
  private readonly patternsRu: Map<QueryIntent, RegExp[]> = new Map([
    [QueryIntent.TASKS_TODAY, [
      /сколько.*задач.*сегодня/i,
      /задач.*за.*день/i,
      /выполнено.*сегодня/i,
      /сегодняшние.*задачи/i,
    ]],
    [QueryIntent.TASKS_PENDING, [
      /сколько.*задач.*осталось/i,
      /незавершённые.*задачи/i,
      /ожидающие.*задачи/i,
      /что.*нужно.*сделать/i,
      /какие.*задачи/i,
    ]],
    [QueryIntent.TASKS_BY_TYPE, [
      /сколько.*пополнен/i,
      /сколько.*инкассац/i,
      /сколько.*ремонт/i,
      /сколько.*обслужив/i,
    ]],
    [QueryIntent.MACHINES_STATUS, [
      /статус.*аппарат/i,
      /состояние.*машин/i,
      /как.*аппарат/i,
      /все.*аппарат/i,
    ]],
    [QueryIntent.MACHINES_PROBLEMS, [
      /проблем.*аппарат/i,
      /неисправн/i,
      /сломан/i,
      /офлайн/i,
      /требует.*внимани/i,
      /какие.*проблем/i,
    ]],
    [QueryIntent.MACHINES_LOW_STOCK, [
      /низкий.*остат/i,
      /мало.*товар/i,
      /пополнить/i,
      /заканчива/i,
      /нужно.*пополн/i,
    ]],
    [QueryIntent.REVENUE_TODAY, [
      /выручка.*сегодня/i,
      /сколько.*заработ.*сегодня/i,
      /продажи.*сегодня/i,
      /доход.*сегодня/i,
    ]],
    [QueryIntent.REVENUE_WEEK, [
      /выручка.*недел/i,
      /доход.*недел/i,
      /продажи.*недел/i,
      /за.*неделю/i,
    ]],
    [QueryIntent.INCIDENTS_OPEN, [
      /открытые.*инцидент/i,
      /активные.*инцидент/i,
      /проблем.*сейчас/i,
      /инцидент/i,
    ]],
    [QueryIntent.PERFORMANCE_TODAY, [
      /моя.*статистика/i,
      /как.*я.*работа/i,
      /моя.*эффективность/i,
      /мои.*показатели/i,
    ]],
    [QueryIntent.HELP, [
      /что.*могу.*спросить/i,
      /какие.*вопрос/i,
      /помощь/i,
      /что.*умеешь/i,
    ]],
  ]);

  // Intent patterns for English
  private readonly patternsEn: Map<QueryIntent, RegExp[]> = new Map([
    [QueryIntent.TASKS_TODAY, [
      /how.*many.*tasks.*today/i,
      /tasks.*completed.*today/i,
      /today'?s.*tasks/i,
      /done.*today/i,
    ]],
    [QueryIntent.TASKS_PENDING, [
      /pending.*tasks/i,
      /remaining.*tasks/i,
      /what.*need.*to.*do/i,
      /what.*tasks/i,
      /incomplete.*tasks/i,
    ]],
    [QueryIntent.TASKS_BY_TYPE, [
      /how.*many.*refill/i,
      /how.*many.*collection/i,
      /how.*many.*repair/i,
      /how.*many.*maintenance/i,
    ]],
    [QueryIntent.MACHINES_STATUS, [
      /machine.*status/i,
      /status.*machines/i,
      /how.*machines/i,
      /all.*machines/i,
    ]],
    [QueryIntent.MACHINES_PROBLEMS, [
      /machine.*problem/i,
      /broken.*machine/i,
      /offline.*machine/i,
      /need.*attention/i,
      /which.*problem/i,
    ]],
    [QueryIntent.MACHINES_LOW_STOCK, [
      /low.*stock/i,
      /need.*refill/i,
      /running.*low/i,
      /out.*of.*stock/i,
    ]],
    [QueryIntent.REVENUE_TODAY, [
      /revenue.*today/i,
      /sales.*today/i,
      /earnings.*today/i,
      /today'?s.*revenue/i,
    ]],
    [QueryIntent.REVENUE_WEEK, [
      /revenue.*week/i,
      /weekly.*sales/i,
      /this.*week.*revenue/i,
      /earnings.*week/i,
    ]],
    [QueryIntent.INCIDENTS_OPEN, [
      /open.*incident/i,
      /active.*incident/i,
      /current.*problem/i,
      /incident/i,
    ]],
    [QueryIntent.PERFORMANCE_TODAY, [
      /my.*statistic/i,
      /my.*performance/i,
      /how.*am.*i.*doing/i,
      /my.*progress/i,
    ]],
    [QueryIntent.HELP, [
      /what.*can.*ask/i,
      /what.*question/i,
      /help/i,
      /what.*can.*you.*do/i,
    ]],
  ]);

  constructor(
    private readonly tasksService: TasksService,
    private readonly usersService: UsersService,
    private readonly machinesService: MachinesService,
    private readonly transactionsService: TransactionsService,
    private readonly inventoryService: InventoryService,
    private readonly incidentsService: IncidentsService,
    private readonly cacheService: TelegramCacheService,
  ) {}

  /**
   * Set helper methods from TelegramBotService
   */
  setHelpers(helpers: NlpHelpers): void {
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

  // ============================================================================
  // COMMAND HANDLER
  // ============================================================================

  /**
   * Handle /ask command - natural language query
   */
  async handleAskCommand(ctx: BotContext): Promise<void> {
    await this.logMessage(ctx, TelegramMessageType.COMMAND, '/ask');

    if (!ctx.telegramUser?.is_verified) {
      const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
      await ctx.reply(this.t(lang, 'not_verified'));
      return;
    }

    const lang = ctx.telegramUser.language;

    // Extract query from command
    const messageText = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
    const query = messageText.replace(/^\/ask\s*/i, '').trim();

    if (!query) {
      // Show help if no query provided
      await this.sendAskHelp(ctx, lang);
      return;
    }

    // Show typing indicator
    await ctx.replyWithChatAction('typing');

    try {
      // Parse the query
      const queryContext = this.parseQuery(query, lang);

      // Execute query and get response
      const response = await this.executeQuery(ctx, queryContext, lang);

      await ctx.reply(response, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(
            lang === TelegramLanguage.RU ? '❓ Ещё вопрос' : '❓ Ask another',
            'ask_help',
          )],
        ]),
      });
    } catch (error) {
      this.logger.error('Error processing NLP query:', error);
      await ctx.reply(
        lang === TelegramLanguage.RU
          ? '❌ Не удалось обработать запрос. Попробуйте переформулировать.'
          : '❌ Could not process query. Try rephrasing.',
      );
    }
  }

  /**
   * Handle ask help callback
   */
  async handleAskHelpCallback(ctx: BotContext): Promise<void> {
    await ctx.answerCbQuery();
    const lang = ctx.telegramUser?.language || TelegramLanguage.RU;
    await this.sendAskHelp(ctx, lang);
  }

  // ============================================================================
  // NLP PARSING
  // ============================================================================

  /**
   * Parse natural language query to extract intent
   */
  private parseQuery(query: string, lang: TelegramLanguage): QueryContext {
    const patterns = lang === TelegramLanguage.RU ? this.patternsRu : this.patternsEn;

    // Try to match each intent
    for (const [intent, regexes] of patterns) {
      for (const regex of regexes) {
        if (regex.test(query)) {
          return {
            intent,
            confidence: 0.8,
            taskType: this.extractTaskType(query, lang),
            timeRange: this.extractTimeRange(query, lang),
          };
        }
      }
    }

    // Default to unknown with low confidence
    return {
      intent: QueryIntent.UNKNOWN,
      confidence: 0.0,
    };
  }

  /**
   * Extract task type from query
   */
  private extractTaskType(query: string, lang: TelegramLanguage): TaskType | undefined {
    const lowerQuery = query.toLowerCase();

    if (lang === TelegramLanguage.RU) {
      if (/пополнен|refill/i.test(lowerQuery)) return TaskType.REFILL;
      if (/инкассац|collect/i.test(lowerQuery)) return TaskType.COLLECTION;
      if (/ремонт|repair/i.test(lowerQuery)) return TaskType.REPAIR;
      if (/обслужив|осмотр|inspect/i.test(lowerQuery)) return TaskType.INSPECTION;
      if (/чист|clean|мойк/i.test(lowerQuery)) return TaskType.CLEANING;
      if (/установ|install/i.test(lowerQuery)) return TaskType.INSTALL;
    } else {
      if (/refill/i.test(lowerQuery)) return TaskType.REFILL;
      if (/collection/i.test(lowerQuery)) return TaskType.COLLECTION;
      if (/repair/i.test(lowerQuery)) return TaskType.REPAIR;
      if (/inspect|maintenance/i.test(lowerQuery)) return TaskType.INSPECTION;
      if (/clean/i.test(lowerQuery)) return TaskType.CLEANING;
      if (/install/i.test(lowerQuery)) return TaskType.INSTALL;
    }

    return undefined;
  }

  /**
   * Extract time range from query
   */
  private extractTimeRange(query: string, lang: TelegramLanguage): 'today' | 'week' | 'month' | undefined {
    const lowerQuery = query.toLowerCase();

    if (/сегодня|today/i.test(lowerQuery)) return 'today';
    if (/недел|week/i.test(lowerQuery)) return 'week';
    if (/месяц|month/i.test(lowerQuery)) return 'month';

    return undefined;
  }

  // ============================================================================
  // QUERY EXECUTION
  // ============================================================================

  /**
   * Execute parsed query and return response
   */
  private async executeQuery(
    ctx: BotContext,
    queryContext: QueryContext,
    lang: TelegramLanguage,
  ): Promise<string> {
    switch (queryContext.intent) {
      case QueryIntent.TASKS_TODAY:
        return this.queryTasksToday(ctx, lang);

      case QueryIntent.TASKS_PENDING:
        return this.queryTasksPending(ctx, lang);

      case QueryIntent.TASKS_BY_TYPE:
        return this.queryTasksByType(ctx, queryContext.taskType, lang);

      case QueryIntent.MACHINES_STATUS:
        return this.queryMachinesStatus(lang);

      case QueryIntent.MACHINES_PROBLEMS:
        return this.queryMachinesProblems(lang);

      case QueryIntent.MACHINES_LOW_STOCK:
        return this.queryMachinesLowStock(lang);

      case QueryIntent.REVENUE_TODAY:
        return this.queryRevenueToday(lang);

      case QueryIntent.REVENUE_WEEK:
        return this.queryRevenueWeek(lang);

      case QueryIntent.INCIDENTS_OPEN:
        return this.queryIncidentsOpen(lang);

      case QueryIntent.PERFORMANCE_TODAY:
        return this.queryPerformanceToday(ctx, lang);

      case QueryIntent.HELP:
        return this.getHelpMessage(lang);

      default:
        return this.getUnknownMessage(lang);
    }
  }

  /**
   * Query: Tasks completed today
   */
  private async queryTasksToday(ctx: BotContext, lang: TelegramLanguage): Promise<string> {
    const user = await this.usersService.findByTelegramId(ctx.telegramUser!.telegram_id);
    if (!user) {
      return lang === TelegramLanguage.RU
        ? '❌ Пользователь не найден'
        : '❌ User not found';
    }

    const today = new Date();
    const tasks = await this.tasksService.findAll(TaskStatus.COMPLETED, undefined, undefined, user.id);
    const todayTasks = tasks.filter(t => {
      if (!t.completed_at) return false;
      const completedDate = new Date(t.completed_at);
      return completedDate >= startOfDay(today) && completedDate <= endOfDay(today);
    });

    // Group by type
    const byType: Record<string, number> = {};
    for (const task of todayTasks) {
      byType[task.type_code] = (byType[task.type_code] || 0) + 1;
    }

    let message = lang === TelegramLanguage.RU
      ? `📊 <b>Задачи за сегодня</b>\n\n` +
        `✅ Выполнено: <b>${todayTasks.length}</b>\n\n`
      : `📊 <b>Today's Tasks</b>\n\n` +
        `✅ Completed: <b>${todayTasks.length}</b>\n\n`;

    if (Object.keys(byType).length > 0) {
      message += lang === TelegramLanguage.RU ? '<b>По типам:</b>\n' : '<b>By type:</b>\n';
      for (const [type, count] of Object.entries(byType)) {
        const emoji = this.getTaskTypeEmoji(type as TaskType);
        message += `${emoji} ${this.getTaskTypeLabel(type as TaskType, lang)}: ${count}\n`;
      }
    }

    return message;
  }

  /**
   * Query: Pending tasks
   */
  private async queryTasksPending(ctx: BotContext, lang: TelegramLanguage): Promise<string> {
    const user = await this.usersService.findByTelegramId(ctx.telegramUser!.telegram_id);
    if (!user) {
      return lang === TelegramLanguage.RU
        ? '❌ Пользователь не найден'
        : '❌ User not found';
    }

    const tasks = await this.tasksService.findAll(undefined, undefined, undefined, user.id);
    const pendingTasks = tasks.filter(t =>
      t.status === TaskStatus.PENDING ||
      t.status === TaskStatus.ASSIGNED ||
      t.status === TaskStatus.IN_PROGRESS
    );

    if (pendingTasks.length === 0) {
      return lang === TelegramLanguage.RU
        ? '✅ У вас нет незавершённых задач!'
        : '✅ You have no pending tasks!';
    }

    let message = lang === TelegramLanguage.RU
      ? `📋 <b>Незавершённые задачи</b>\n\n` +
        `⏳ Всего: <b>${pendingTasks.length}</b>\n\n`
      : `📋 <b>Pending Tasks</b>\n\n` +
        `⏳ Total: <b>${pendingTasks.length}</b>\n\n`;

    // Show first 5 tasks
    for (const task of pendingTasks.slice(0, 5)) {
      const emoji = this.getTaskTypeEmoji(task.type_code);
      const machineNum = task.machine?.machine_number || 'N/A';
      message += `${emoji} ${machineNum} - ${this.getTaskTypeLabel(task.type_code, lang)}\n`;
    }

    if (pendingTasks.length > 5) {
      message += lang === TelegramLanguage.RU
        ? `\n<i>...и ещё ${pendingTasks.length - 5}</i>`
        : `\n<i>...and ${pendingTasks.length - 5} more</i>`;
    }

    return message;
  }

  /**
   * Query: Tasks by specific type
   */
  private async queryTasksByType(
    ctx: BotContext,
    taskType: TaskType | undefined,
    lang: TelegramLanguage,
  ): Promise<string> {
    const user = await this.usersService.findByTelegramId(ctx.telegramUser!.telegram_id);
    if (!user) {
      return lang === TelegramLanguage.RU
        ? '❌ Пользователь не найден'
        : '❌ User not found';
    }

    const tasks = await this.tasksService.findAll(TaskStatus.COMPLETED, taskType, undefined, user.id);
    const today = new Date();
    const todayTasks = tasks.filter(t => {
      if (!t.completed_at) return false;
      const completedDate = new Date(t.completed_at);
      return completedDate >= startOfDay(today) && completedDate <= endOfDay(today);
    });

    const typeLabel = taskType
      ? this.getTaskTypeLabel(taskType, lang)
      : (lang === TelegramLanguage.RU ? 'все типы' : 'all types');

    return lang === TelegramLanguage.RU
      ? `📊 <b>${typeLabel}</b>\n\nВыполнено сегодня: <b>${todayTasks.length}</b>`
      : `📊 <b>${typeLabel}</b>\n\nCompleted today: <b>${todayTasks.length}</b>`;
  }

  /**
   * Query: Machines status
   */
  private async queryMachinesStatus(lang: TelegramLanguage): Promise<string> {
    const machines = await this.cacheService.getOrSet(
      'nlp:machines:status',
      async () => this.machinesService.findAllSimple(),
      TelegramCacheService.TTL.MEDIUM,
    );

    const statusCounts: Record<string, number> = {};
    for (const machine of machines) {
      statusCounts[machine.status] = (statusCounts[machine.status] || 0) + 1;
    }

    let message = lang === TelegramLanguage.RU
      ? `🖥 <b>Статус аппаратов</b>\n\nВсего: <b>${machines.length}</b>\n\n`
      : `🖥 <b>Machines Status</b>\n\nTotal: <b>${machines.length}</b>\n\n`;

    const statusEmojis: Record<string, string> = {
      [MachineStatus.ACTIVE]: '✅',
      [MachineStatus.OFFLINE]: '⚫',
      [MachineStatus.ERROR]: '🔴',
      [MachineStatus.MAINTENANCE]: '🔧',
      [MachineStatus.LOW_STOCK]: '📦',
      [MachineStatus.DISABLED]: '⛔',
    };

    for (const [status, count] of Object.entries(statusCounts)) {
      const emoji = statusEmojis[status] || '❓';
      message += `${emoji} ${status}: ${count}\n`;
    }

    return message;
  }

  /**
   * Query: Machines with problems
   */
  private async queryMachinesProblems(lang: TelegramLanguage): Promise<string> {
    const machines = await this.machinesService.findAllSimple();
    const problemMachines = machines.filter(m =>
      m.status === MachineStatus.OFFLINE ||
      m.status === MachineStatus.ERROR ||
      m.status === MachineStatus.MAINTENANCE
    );

    if (problemMachines.length === 0) {
      return lang === TelegramLanguage.RU
        ? '✅ Все аппараты работают нормально!'
        : '✅ All machines are working normally!';
    }

    let message = lang === TelegramLanguage.RU
      ? `⚠️ <b>Аппараты с проблемами</b>\n\nВсего: <b>${problemMachines.length}</b>\n\n`
      : `⚠️ <b>Problem Machines</b>\n\nTotal: <b>${problemMachines.length}</b>\n\n`;

    for (const machine of problemMachines.slice(0, 5)) {
      const statusEmoji = machine.status === MachineStatus.ERROR ? '🔴' :
                         machine.status === MachineStatus.OFFLINE ? '⚫' : '🔧';
      message += `${statusEmoji} ${machine.machine_number} - ${machine.location?.name || 'N/A'}\n`;
    }

    if (problemMachines.length > 5) {
      message += lang === TelegramLanguage.RU
        ? `\n<i>...и ещё ${problemMachines.length - 5}</i>`
        : `\n<i>...and ${problemMachines.length - 5} more</i>`;
    }

    return message;
  }

  /**
   * Query: Low stock machines
   */
  private async queryMachinesLowStock(lang: TelegramLanguage): Promise<string> {
    const lowStockItems = await this.inventoryService.getMachinesLowStock();

    if (lowStockItems.length === 0) {
      return lang === TelegramLanguage.RU
        ? '✅ Все аппараты достаточно заполнены!'
        : '✅ All machines have sufficient stock!';
    }

    // Group by machine
    const machineMap = new Map<string, number>();
    for (const item of lowStockItems) {
      const current = machineMap.get(item.machine_id) || 0;
      machineMap.set(item.machine_id, current + 1);
    }

    let message = lang === TelegramLanguage.RU
      ? `📦 <b>Низкие остатки</b>\n\nАппаратов: <b>${machineMap.size}</b>\n\n`
      : `📦 <b>Low Stock</b>\n\nMachines: <b>${machineMap.size}</b>\n\n`;

    let count = 0;
    for (const [machineId, itemCount] of machineMap) {
      if (count >= 5) break;
      const machine = await this.machinesService.findOne(machineId);
      if (machine) {
        message += `📦 ${machine.machine_number}: ${itemCount} ${lang === TelegramLanguage.RU ? 'позиций' : 'items'}\n`;
      }
      count++;
    }

    if (machineMap.size > 5) {
      message += lang === TelegramLanguage.RU
        ? `\n<i>...и ещё ${machineMap.size - 5} аппаратов</i>`
        : `\n<i>...and ${machineMap.size - 5} more machines</i>`;
    }

    return message;
  }

  /**
   * Query: Today's revenue
   */
  private async queryRevenueToday(lang: TelegramLanguage): Promise<string> {
    const today = new Date();
    const transactions = await this.transactionsService.findAll(
      undefined,
      undefined,
      undefined,
      startOfDay(today).toISOString(),
      endOfDay(today).toISOString(),
    );

    const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const transactionCount = transactions.length;

    return lang === TelegramLanguage.RU
      ? `💰 <b>Выручка за сегодня</b>\n\n` +
        `💵 Сумма: <b>${totalRevenue.toLocaleString('ru-RU')} ₽</b>\n` +
        `📝 Транзакций: <b>${transactionCount}</b>`
      : `💰 <b>Today's Revenue</b>\n\n` +
        `💵 Amount: <b>${totalRevenue.toLocaleString('en-US')} ₽</b>\n` +
        `📝 Transactions: <b>${transactionCount}</b>`;
  }

  /**
   * Query: Week's revenue
   */
  private async queryRevenueWeek(lang: TelegramLanguage): Promise<string> {
    const today = new Date();
    const weekAgo = subDays(today, 7);

    const transactions = await this.transactionsService.findAll(
      undefined,
      undefined,
      undefined,
      startOfDay(weekAgo).toISOString(),
      endOfDay(today).toISOString(),
    );

    const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const transactionCount = transactions.length;
    const avgPerDay = Math.round(totalRevenue / 7);

    return lang === TelegramLanguage.RU
      ? `💰 <b>Выручка за неделю</b>\n\n` +
        `💵 Сумма: <b>${totalRevenue.toLocaleString('ru-RU')} ₽</b>\n` +
        `📝 Транзакций: <b>${transactionCount}</b>\n` +
        `📊 В среднем/день: <b>${avgPerDay.toLocaleString('ru-RU')} ₽</b>`
      : `💰 <b>Weekly Revenue</b>\n\n` +
        `💵 Amount: <b>${totalRevenue.toLocaleString('en-US')} ₽</b>\n` +
        `📝 Transactions: <b>${transactionCount}</b>\n` +
        `📊 Avg/day: <b>${avgPerDay.toLocaleString('en-US')} ₽</b>`;
  }

  /**
   * Query: Open incidents
   */
  private async queryIncidentsOpen(lang: TelegramLanguage): Promise<string> {
    const incidents = await this.incidentsService.findAll(IncidentStatus.OPEN, undefined);

    if (incidents.length === 0) {
      return lang === TelegramLanguage.RU
        ? '✅ Нет открытых инцидентов!'
        : '✅ No open incidents!';
    }

    let message = lang === TelegramLanguage.RU
      ? `🚨 <b>Открытые инциденты</b>\n\nВсего: <b>${incidents.length}</b>\n\n`
      : `🚨 <b>Open Incidents</b>\n\nTotal: <b>${incidents.length}</b>\n\n`;

    for (const incident of incidents.slice(0, 5)) {
      const machineNum = incident.machine?.machine_number || 'N/A';
      const ago = this.getTimeAgo(incident.reported_at, lang);
      message += `🔴 ${machineNum}: ${incident.incident_type || 'Unknown'} (${ago})\n`;
    }

    if (incidents.length > 5) {
      message += lang === TelegramLanguage.RU
        ? `\n<i>...и ещё ${incidents.length - 5}</i>`
        : `\n<i>...and ${incidents.length - 5} more</i>`;
    }

    return message;
  }

  /**
   * Query: Personal performance today
   */
  private async queryPerformanceToday(ctx: BotContext, lang: TelegramLanguage): Promise<string> {
    const user = await this.usersService.findByTelegramId(ctx.telegramUser!.telegram_id);
    if (!user) {
      return lang === TelegramLanguage.RU
        ? '❌ Пользователь не найден'
        : '❌ User not found';
    }

    const today = new Date();
    const allTasks = await this.tasksService.findAll(undefined, undefined, undefined, user.id);

    const completedToday = allTasks.filter(t => {
      if (t.status !== TaskStatus.COMPLETED || !t.completed_at) return false;
      const completedDate = new Date(t.completed_at);
      return completedDate >= startOfDay(today) && completedDate <= endOfDay(today);
    });

    const pending = allTasks.filter(t =>
      t.status === TaskStatus.PENDING ||
      t.status === TaskStatus.ASSIGNED ||
      t.status === TaskStatus.IN_PROGRESS
    );

    return lang === TelegramLanguage.RU
      ? `📊 <b>Ваша статистика за сегодня</b>\n\n` +
        `👤 ${user.full_name}\n\n` +
        `✅ Выполнено: <b>${completedToday.length}</b>\n` +
        `⏳ Осталось: <b>${pending.length}</b>\n\n` +
        `💪 ${this.getMotivationalMessage(completedToday.length, lang)}`
      : `📊 <b>Your Stats Today</b>\n\n` +
        `👤 ${user.full_name}\n\n` +
        `✅ Completed: <b>${completedToday.length}</b>\n` +
        `⏳ Remaining: <b>${pending.length}</b>\n\n` +
        `💪 ${this.getMotivationalMessage(completedToday.length, lang)}`;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Send help message for /ask command
   */
  private async sendAskHelp(ctx: BotContext, lang: TelegramLanguage): Promise<void> {
    const message = this.getHelpMessage(lang);
    await ctx.reply(message, { parse_mode: 'HTML' });
  }

  /**
   * Get help message
   */
  private getHelpMessage(lang: TelegramLanguage): string {
    return lang === TelegramLanguage.RU
      ? `❓ <b>Что можно спросить</b>\n\n` +
        `<b>📋 Задачи:</b>\n` +
        `• "Сколько задач сегодня?"\n` +
        `• "Какие задачи осталось сделать?"\n` +
        `• "Сколько пополнений сегодня?"\n\n` +
        `<b>🖥 Аппараты:</b>\n` +
        `• "Какой статус аппаратов?"\n` +
        `• "Какие аппараты с проблемами?"\n` +
        `• "Какие аппараты нужно пополнить?"\n\n` +
        `<b>💰 Финансы:</b>\n` +
        `• "Выручка за сегодня?"\n` +
        `• "Выручка за неделю?"\n\n` +
        `<b>📊 Прочее:</b>\n` +
        `• "Открытые инциденты?"\n` +
        `• "Моя статистика?"\n\n` +
        `💡 Использование: <code>/ask ваш вопрос</code>`
      : `❓ <b>What You Can Ask</b>\n\n` +
        `<b>📋 Tasks:</b>\n` +
        `• "How many tasks today?"\n` +
        `• "What tasks are pending?"\n` +
        `• "How many refills today?"\n\n` +
        `<b>🖥 Machines:</b>\n` +
        `• "Machine status?"\n` +
        `• "Which machines have problems?"\n` +
        `• "Which machines need refill?"\n\n` +
        `<b>💰 Finance:</b>\n` +
        `• "Today's revenue?"\n` +
        `• "Weekly revenue?"\n\n` +
        `<b>📊 Other:</b>\n` +
        `• "Open incidents?"\n` +
        `• "My performance?"\n\n` +
        `💡 Usage: <code>/ask your question</code>`;
  }

  /**
   * Get unknown query message
   */
  private getUnknownMessage(lang: TelegramLanguage): string {
    return lang === TelegramLanguage.RU
      ? `🤔 Не понял вопрос.\n\n` +
        `💡 Попробуйте:\n` +
        `• "Сколько задач сегодня?"\n` +
        `• "Какие аппараты с проблемами?"\n` +
        `• "Выручка за сегодня?"\n\n` +
        `Или введите <code>/ask</code> для списка вопросов.`
      : `🤔 Didn't understand the question.\n\n` +
        `💡 Try:\n` +
        `• "How many tasks today?"\n` +
        `• "Which machines have problems?"\n` +
        `• "Today's revenue?"\n\n` +
        `Or type <code>/ask</code> for question examples.`;
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
   * Get time ago string
   */
  private getTimeAgo(date: Date, lang: TelegramLanguage): string {
    const diff = Date.now() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return lang === TelegramLanguage.RU
        ? `${hours}ч ${minutes}м назад`
        : `${hours}h ${minutes}m ago`;
    }
    return lang === TelegramLanguage.RU
      ? `${minutes}м назад`
      : `${minutes}m ago`;
  }

  /**
   * Get motivational message based on completed tasks
   */
  private getMotivationalMessage(completedCount: number, lang: TelegramLanguage): string {
    if (completedCount === 0) {
      return lang === TelegramLanguage.RU
        ? 'Время начать!'
        : 'Time to start!';
    }
    if (completedCount < 3) {
      return lang === TelegramLanguage.RU
        ? 'Хорошее начало!'
        : 'Good start!';
    }
    if (completedCount < 5) {
      return lang === TelegramLanguage.RU
        ? 'Отличная работа!'
        : 'Great work!';
    }
    return lang === TelegramLanguage.RU
      ? 'Вы на высоте! 🔥'
      : "You're on fire! 🔥";
  }
}
