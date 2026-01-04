import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Markup } from 'telegraf';
import { TelegramLanguage } from '../../shared/entities/telegram-user.entity';
import { TelegramNotificationsService } from '../../notifications/services/telegram-notifications.service';
import { TasksService } from '../../../tasks/tasks.service';
import { UsersService } from '../../../users/users.service';
import { MachinesService } from '../../../machines/machines.service';
import { TaskStatus, TaskType } from '../../../tasks/entities/task.entity';
import { MachineStatus } from '../../../machines/entities/machine.entity';
import { UserRole } from '../../../users/entities/user.entity';

/**
 * Workflow rule definition
 */
interface WorkflowRule {
  id: string;
  name: string;
  trigger: 'schedule' | 'event' | 'condition';
  conditions: Record<string, unknown>;
  actions: WorkflowAction[];
  enabled: boolean;
}

/**
 * Workflow action to execute
 */
interface WorkflowAction {
  type: 'notify' | 'create_task' | 'update_status' | 'send_reminder';
  params: Record<string, unknown>;
}

/**
 * Task reminder data
 */
interface TaskReminder {
  taskId: string;
  userId: string;
  telegramId: string;
  taskType: TaskType;
  machineNumber: string;
  hoursOverdue: number;
}

/**
 * TelegramWorkflowService
 *
 * Implements automated workflows for Telegram bot:
 * - Task reminders (overdue tasks notification)
 * - Daily morning briefing (pending tasks summary)
 * - Machine status alerts (low stock, offline)
 * - Auto-assignment suggestions
 *
 * @module TelegramTasksModule
 */
@Injectable()
export class TelegramWorkflowService {
  private readonly logger = new Logger(TelegramWorkflowService.name);

  // Built-in workflow rules
  private workflows: WorkflowRule[] = [
    {
      id: 'task_reminder_2h',
      name: 'Task Reminder (2 hours)',
      trigger: 'schedule',
      conditions: { overdueHours: 2 },
      actions: [{ type: 'send_reminder', params: { urgency: 'normal' } }],
      enabled: true,
    },
    {
      id: 'task_reminder_4h',
      name: 'Task Reminder (4 hours)',
      trigger: 'schedule',
      conditions: { overdueHours: 4 },
      actions: [{ type: 'send_reminder', params: { urgency: 'high' } }],
      enabled: true,
    },
    {
      id: 'morning_briefing',
      name: 'Morning Briefing',
      trigger: 'schedule',
      conditions: { time: '09:00' },
      actions: [{ type: 'notify', params: { type: 'briefing' } }],
      enabled: true,
    },
    {
      id: 'machine_offline_alert',
      name: 'Machine Offline Alert',
      trigger: 'event',
      conditions: { event: 'machine_status_change', newStatus: 'offline' },
      actions: [{ type: 'notify', params: { type: 'alert' } }],
      enabled: true,
    },
  ];

  constructor(
    private readonly notificationsService: TelegramNotificationsService,
    private readonly tasksService: TasksService,
    private readonly usersService: UsersService,
    private readonly machinesService: MachinesService,
  ) {}

  // ============================================================================
  // SCHEDULED WORKFLOWS
  // ============================================================================

  /**
   * Check for overdue tasks and send reminders (every 2 hours)
   */
  @Cron('0 */2 * * *') // Every 2 hours
  async checkOverdueTasks(): Promise<void> {
    if (!this.isWorkflowEnabled('task_reminder_2h')) return;

    this.logger.log('Running overdue tasks check...');

    try {
      const overdueTasks = await this.getOverdueTasks(2);

      for (const reminder of overdueTasks) {
        await this.sendTaskReminder(reminder, 'normal');
      }

      if (overdueTasks.length > 0) {
        this.logger.log(`Sent ${overdueTasks.length} task reminders`);
      }
    } catch (error) {
      this.logger.error('Error checking overdue tasks:', error);
    }
  }

  /**
   * Morning briefing for operators (weekdays at 9:00)
   */
  @Cron('0 9 * * 1-5') // 9:00 AM, Mon-Fri
  async sendMorningBriefing(): Promise<void> {
    if (!this.isWorkflowEnabled('morning_briefing')) return;

    this.logger.log('Sending morning briefings...');

    try {
      // Get all operators with pending tasks
      const operators = await this.getOperatorsWithPendingTasks();

      for (const operator of operators) {
        await this.sendBriefingToOperator(operator);
      }

      this.logger.log(`Sent briefing to ${operators.length} operators`);
    } catch (error) {
      this.logger.error('Error sending morning briefings:', error);
    }
  }

  /**
   * Check machine status and send alerts (every 30 minutes)
   */
  @Cron('*/30 * * * *') // Every 30 minutes
  async checkMachineStatus(): Promise<void> {
    if (!this.isWorkflowEnabled('machine_offline_alert')) return;

    try {
      const problemMachines = await this.getMachinesWithProblems();

      if (problemMachines.length > 0) {
        await this.notifyManagersAboutMachines(problemMachines);
      }
    } catch (error) {
      this.logger.error('Error checking machine status:', error);
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get tasks that are overdue by specified hours
   */
  private async getOverdueTasks(hoursOverdue: number): Promise<TaskReminder[]> {
    const reminders: TaskReminder[] = [];
    const cutoffTime = new Date(Date.now() - hoursOverdue * 60 * 60 * 1000);

    // Get all assigned/in_progress tasks
    const tasks = await this.tasksService.findAll(undefined);
    const overdueTasks = tasks.filter((t) => {
      const isActive =
        t.status === TaskStatus.ASSIGNED || t.status === TaskStatus.IN_PROGRESS;
      const isOverdue = t.scheduled_date && new Date(t.scheduled_date) < cutoffTime;
      return isActive && isOverdue;
    });

    for (const task of overdueTasks) {
      if (!task.assigned_to_user_id) continue;

      const user = await this.usersService.findOne(task.assigned_to_user_id);
      if (!user?.telegram_user_id) continue;

      const hoursOver = Math.floor(
        (Date.now() - new Date(task.scheduled_date!).getTime()) / (1000 * 60 * 60),
      );

      reminders.push({
        taskId: task.id,
        userId: user.id,
        telegramId: user.telegram_user_id,
        taskType: task.type_code,
        machineNumber: task.machine?.machine_number || 'Unknown',
        hoursOverdue: hoursOver,
      });
    }

    return reminders;
  }

  /**
   * Send task reminder to operator
   */
  private async sendTaskReminder(
    reminder: TaskReminder,
    urgency: 'normal' | 'high',
  ): Promise<void> {
    const emoji = urgency === 'high' ? '🚨' : '⏰';
    const lang = TelegramLanguage.RU;

    const message =
      lang === TelegramLanguage.RU
        ? `${emoji} <b>Напоминание о задаче</b>\n\n` +
          `📋 Тип: ${this.getTaskTypeLabel(reminder.taskType, lang)}\n` +
          `🏭 Автомат: ${reminder.machineNumber}\n` +
          `⏱ Просрочено: ${reminder.hoursOverdue}ч\n\n` +
          `💡 Нажмите /tasks чтобы начать`
        : `${emoji} <b>Task Reminder</b>\n\n` +
          `📋 Type: ${this.getTaskTypeLabel(reminder.taskType, lang)}\n` +
          `🏭 Machine: ${reminder.machineNumber}\n` +
          `⏱ Overdue: ${reminder.hoursOverdue}h\n\n` +
          `💡 Press /tasks to start`;

    try {
      await this.notificationsService.sendNotification({
        userId: reminder.userId,
        type: 'task_reminder',
        title: urgency === 'high' ? 'Urgent Task Reminder' : 'Task Reminder',
        message,
        data: { taskId: reminder.taskId },
        actions: [
          {
            text: lang === TelegramLanguage.RU ? '▶️ Начать' : '▶️ Start',
            callback_data: `start_task_${reminder.taskId}`,
          },
        ],
      });
    } catch (error) {
      this.logger.warn(`Failed to send reminder to user ${reminder.userId}:`, error);
    }
  }

  /**
   * Get operators with pending tasks
   */
  private async getOperatorsWithPendingTasks(): Promise<
    Array<{
      userId: string;
      telegramId: string;
      pendingCount: number;
      tasks: Array<{ type: TaskType; machineNumber: string }>;
    }>
  > {
    const operators: Map<
      string,
      {
        userId: string;
        telegramId: string;
        pendingCount: number;
        tasks: Array<{ type: TaskType; machineNumber: string }>;
      }
    > = new Map();

    const tasks = await this.tasksService.findAll(TaskStatus.ASSIGNED);

    for (const task of tasks) {
      if (!task.assigned_to_user_id) continue;

      const user = await this.usersService.findOne(task.assigned_to_user_id);
      if (!user?.telegram_user_id) continue;

      if (!operators.has(user.id)) {
        operators.set(user.id, {
          userId: user.id,
          telegramId: user.telegram_user_id,
          pendingCount: 0,
          tasks: [],
        });
      }

      const op = operators.get(user.id)!;
      op.pendingCount++;
      op.tasks.push({
        type: task.type_code,
        machineNumber: task.machine?.machine_number || 'Unknown',
      });
    }

    return Array.from(operators.values());
  }

  /**
   * Send morning briefing to operator
   */
  private async sendBriefingToOperator(operator: {
    userId: string;
    telegramId: string;
    pendingCount: number;
    tasks: Array<{ type: TaskType; machineNumber: string }>;
  }): Promise<void> {
    const lang = TelegramLanguage.RU;

    if (operator.pendingCount === 0) return;

    const tasksList = operator.tasks
      .slice(0, 5)
      .map((t) => `• ${this.getTaskTypeLabel(t.type, lang)}: ${t.machineNumber}`)
      .join('\n');

    const more =
      operator.pendingCount > 5
        ? lang === TelegramLanguage.RU
          ? `\n...и ещё ${operator.pendingCount - 5}`
          : `\n...and ${operator.pendingCount - 5} more`
        : '';

    const message =
      lang === TelegramLanguage.RU
        ? `☀️ <b>Доброе утро!</b>\n\n` +
          `📋 У вас ${operator.pendingCount} задач на сегодня:\n\n` +
          `${tasksList}${more}\n\n` +
          `💪 Хорошего рабочего дня!`
        : `☀️ <b>Good morning!</b>\n\n` +
          `📋 You have ${operator.pendingCount} tasks today:\n\n` +
          `${tasksList}${more}\n\n` +
          `💪 Have a great day!`;

    try {
      await this.notificationsService.sendNotification({
        userId: operator.userId,
        type: 'briefing',
        title: 'Morning Briefing',
        message,
        actions: [
          {
            text: lang === TelegramLanguage.RU ? '📋 Мои задачи' : '📋 My Tasks',
            callback_data: 'menu_tasks',
          },
        ],
      });
    } catch (error) {
      this.logger.warn(`Failed to send briefing to user ${operator.userId}:`, error);
    }
  }

  /**
   * Get machines with problems (offline, error, low stock)
   */
  private async getMachinesWithProblems(): Promise<
    Array<{ id: string; machineNumber: string; status: MachineStatus; location: string }>
  > {
    const machines = await this.machinesService.findAllSimple();

    return machines
      .filter(
        (m) =>
          m.status === MachineStatus.OFFLINE ||
          m.status === MachineStatus.ERROR ||
          m.status === MachineStatus.MAINTENANCE,
      )
      .map((m) => ({
        id: m.id,
        machineNumber: m.machine_number,
        status: m.status,
        location: m.location?.name || 'Unknown',
      }));
  }

  /**
   * Notify managers about machine problems
   */
  private async notifyManagersAboutMachines(
    machines: Array<{
      id: string;
      machineNumber: string;
      status: MachineStatus;
      location: string;
    }>,
  ): Promise<void> {
    // Get managers (users with manager role)
    const managers = await this.usersService.findByRole(UserRole.MANAGER);

    const statusEmoji: Record<MachineStatus, string> = {
      [MachineStatus.ACTIVE]: '✅',
      [MachineStatus.OFFLINE]: '⚫',
      [MachineStatus.ERROR]: '🔴',
      [MachineStatus.MAINTENANCE]: '🔧',
      [MachineStatus.LOW_STOCK]: '📦',
      [MachineStatus.DISABLED]: '⛔',
    };

    const machinesList = machines
      .slice(0, 5)
      .map((m) => `${statusEmoji[m.status]} ${m.machineNumber} (${m.location})`)
      .join('\n');

    const message =
      `⚠️ <b>Проблемы с аппаратами</b>\n\n` +
      `${machinesList}\n\n` +
      `Всего: ${machines.length} аппаратов`;

    for (const manager of managers) {
      if (!manager.telegram_user_id) continue;

      try {
        await this.notificationsService.sendNotification({
          userId: manager.id,
          type: 'alert',
          title: 'Machine Problems',
          message,
          actions: [
            {
              text: '🖥 Аппараты',
              callback_data: 'menu_machines',
            },
          ],
        });
      } catch (error) {
        this.logger.warn(`Failed to notify manager ${manager.id}:`, error);
      }
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Check if workflow is enabled
   */
  private isWorkflowEnabled(workflowId: string): boolean {
    const workflow = this.workflows.find((w) => w.id === workflowId);
    return workflow?.enabled ?? false;
  }

  /**
   * Get task type label
   */
  private getTaskTypeLabel(type: TaskType, lang: TelegramLanguage): string {
    const labels: Partial<Record<TaskType, Record<TelegramLanguage, string>>> = {
      [TaskType.REFILL]: { ru: '🔄 Пополнение', en: '🔄 Refill', uz: '🔄 To\'ldirish' },
      [TaskType.COLLECTION]: { ru: '💰 Инкассация', en: '💰 Collection', uz: '💰 Yig\'ish' },
      [TaskType.INSPECTION]: { ru: '🔍 Проверка', en: '🔍 Inspection', uz: '🔍 Tekshirish' },
      [TaskType.REPAIR]: { ru: '🛠 Ремонт', en: '🛠 Repair', uz: '🛠 Ta\'mirlash' },
      [TaskType.CLEANING]: { ru: '🧹 Уборка', en: '🧹 Cleaning', uz: '🧹 Tozalash' },
      [TaskType.INSTALL]: { ru: '📦 Установка', en: '📦 Installation', uz: '📦 O\'rnatish' },
      [TaskType.REMOVAL]: { ru: '📤 Снятие', en: '📤 Removal', uz: '📤 Olib tashlash' },
      [TaskType.AUDIT]: { ru: '📋 Ревизия', en: '📋 Audit', uz: '📋 Tekshirish' },
      [TaskType.REPLACE_HOPPER]: { ru: '🔄 Замена бункера', en: '🔄 Replace Hopper', uz: '🔄 Bunker almashtirish' },
      [TaskType.REPLACE_GRINDER]: { ru: '⚙️ Замена гриндера', en: '⚙️ Replace Grinder', uz: '⚙️ Grinder almashtirish' },
      [TaskType.REPLACE_BREW_UNIT]: { ru: '☕ Замена варочного блока', en: '☕ Replace Brew Unit', uz: '☕ Pishirish bloki' },
      [TaskType.REPLACE_MIXER]: { ru: '🔧 Замена миксера', en: '🔧 Replace Mixer', uz: '🔧 Mikser almashtirish' },
    };

    return labels[type]?.[lang] || type;
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Enable/disable a workflow
   */
  setWorkflowEnabled(workflowId: string, enabled: boolean): boolean {
    const workflow = this.workflows.find((w) => w.id === workflowId);
    if (workflow) {
      workflow.enabled = enabled;
      this.logger.log(`Workflow ${workflowId} ${enabled ? 'enabled' : 'disabled'}`);
      return true;
    }
    return false;
  }

  /**
   * Get all workflows
   */
  getWorkflows(): WorkflowRule[] {
    return this.workflows;
  }

  /**
   * Trigger workflow manually
   */
  async triggerWorkflow(workflowId: string): Promise<void> {
    switch (workflowId) {
      case 'task_reminder_2h':
        await this.checkOverdueTasks();
        break;
      case 'morning_briefing':
        await this.sendMorningBriefing();
        break;
      case 'machine_offline_alert':
        await this.checkMachineStatus();
        break;
      default:
        this.logger.warn(`Unknown workflow: ${workflowId}`);
    }
  }
}
