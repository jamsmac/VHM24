import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramUser } from '../entities/telegram-user.entity';
import { TelegramResilientApiService } from './telegram-resilient-api.service';
import { TelegramI18nService } from './telegram-i18n.service';
import { Markup } from 'telegraf';

/**
 * Manager Tools Service for Telegram Bot
 *
 * Provides management features for supervisors and admins:
 * - Task assignment to operators
 * - Broadcasting messages to teams
 * - Team performance analytics
 * - Active operator monitoring
 * - Approval workflows
 *
 * **Access Control:**
 * - Only MANAGER and ADMIN roles can use these features
 * - Managers can only manage their assigned teams
 * - Admins can manage all teams
 *
 * **Use Cases:**
 * 1. Urgent task assignment - Manager assigns critical task to specific operator
 * 2. Team broadcast - Announce schedule change to all operators
 * 3. Performance review - View team stats for daily standup
 * 4. Emergency coordination - Monitor all active operators during incident
 *
 * **Example Flow:**
 * ```
 * Manager: /assign_task
 * Bot: "Select operator:"
 * Manager: [Selects operator]
 * Bot: "Select task:"
 * Manager: [Selects task]
 * Bot: "✅ Task assigned! Operator will be notified."
 * Operator: [Receives notification with task details]
 * ```
 */
@Injectable()
export class TelegramManagerToolsService {
  private readonly logger = new Logger(TelegramManagerToolsService.name);

  constructor(
    @InjectRepository(TelegramUser)
    private readonly telegramUserRepository: Repository<TelegramUser>,
    private readonly resilientApi: TelegramResilientApiService,
    private readonly i18nService: TelegramI18nService,
  ) {}

  /**
   * Verify user has manager or admin role
   *
   * @param userId - VendHub user ID
   * @throws ForbiddenException if user is not manager/admin
   */
  async verifyManagerAccess(userId: string): Promise<void> {
    // TODO: Integrate with actual users service to check role
    // For now, this is a placeholder that would check:
    // - User role is MANAGER or ADMIN
    // - User is verified in Telegram
    // - User account is active

    this.logger.log(`Verifying manager access for user ${userId}`);

    // Placeholder - in real implementation:
    // const user = await this.usersService.findOne(userId);
    // if (!['MANAGER', 'ADMIN'].includes(user.role)) {
    //   throw new ForbiddenException('Only managers and admins can use this feature');
    // }
  }

  /**
   * Get list of operators available for task assignment
   *
   * Returns operators that manager can assign tasks to.
   * Managers see only their team, admins see all operators.
   *
   * @param managerId - Manager's VendHub user ID
   * @returns List of operators with Telegram info
   *
   * @example
   * ```typescript
   * const operators = await this.managerTools.getAvailableOperators(managerId);
   * // Returns: [
   * //   { id: 'uuid1', name: 'Ivan Petrov', chatId: '123456', status: MachineStatus.ACTIVE },
   * //   { id: 'uuid2', name: 'Anna Ivanova', chatId: '789012', status: MachineStatus.ACTIVE },
   * // ]
   * ```
   */
  async getAvailableOperators(managerId: string): Promise<
    Array<{
      id: string;
      name: string;
      chatId: string;
      status: string;
      tasksInProgress: number;
      lastActive: Date | null;
    }>
  > {
    await this.verifyManagerAccess(managerId);

    // TODO: Implement actual query:
    // 1. Get manager's team (if manager) or all operators (if admin)
    // 2. Filter to only users with Telegram linked
    // 3. Get current task counts
    // 4. Get last activity timestamp
    // 5. Sort by status (active first) and name

    this.logger.log(`Getting available operators for manager ${managerId}`);

    // Placeholder
    return [];
  }

  /**
   * Get list of unassigned tasks available for assignment
   *
   * @param managerId - Manager's VendHub user ID
   * @returns List of tasks that can be assigned
   */
  async getUnassignedTasks(managerId: string): Promise<
    Array<{
      id: string;
      type: string;
      machineNumber: string;
      machineName: string;
      location: string;
      priority: string;
      createdAt: Date;
    }>
  > {
    await this.verifyManagerAccess(managerId);

    // TODO: Implement actual query:
    // 1. Get tasks with status 'created' (not assigned)
    // 2. Filter to manager's area/machines (if manager)
    // 3. Include machine and location info
    // 4. Sort by priority and creation date

    this.logger.log(`Getting unassigned tasks for manager ${managerId}`);

    // Placeholder
    return [];
  }

  /**
   * Assign task to operator via bot
   *
   * Assigns task and sends notification to operator via Telegram.
   *
   * @param managerId - Manager assigning the task
   * @param taskId - Task ID to assign
   * @param operatorId - Operator to assign to
   * @returns Success status and notification details
   *
   * @example
   * ```typescript
   * const result = await this.managerTools.assignTask(
   *   'manager-uuid',
   *   'task-uuid',
   *   'operator-uuid'
   * );
   *
   * if (result.success) {
   *   // Task assigned, operator notified
   * }
   * ```
   */
  async assignTask(
    managerId: string,
    taskId: string,
    operatorId: string,
  ): Promise<{
    success: boolean;
    notificationSent: boolean;
    error?: string;
  }> {
    try {
      await this.verifyManagerAccess(managerId);

      // TODO: Implement actual assignment:
      // 1. Validate task exists and is unassigned
      // 2. Validate operator exists and is available
      // 3. Check manager has permission to assign this task
      // 4. Update task.assigned_user_id = operatorId
      // 5. Send notification to operator

      this.logger.log(`Manager ${managerId} assigning task ${taskId} to operator ${operatorId}`);

      // Get operator's Telegram chat ID
      const operator = await this.telegramUserRepository.findOne({
        where: { user_id: operatorId },
      });

      if (!operator || !operator.chat_id) {
        return {
          success: false,
          notificationSent: false,
          error: 'Operator does not have Telegram linked',
        };
      }

      // Send notification to operator
      const message = this.i18nService.t(operator.language, 'manager.task_assigned', {
        taskType: 'Refill', // TODO: Get from actual task
        machineNumber: 'M-001', // TODO: Get from actual task
      });

      await this.resilientApi.sendText(
        operator.chat_id,
        message,
        { parse_mode: 'HTML' },
        {
          priority: 1, // High priority for task assignments
          attempts: 5,
        },
      );

      return {
        success: true,
        notificationSent: true,
      };
    } catch (error) {
      this.logger.error('Failed to assign task', error);
      return {
        success: false,
        notificationSent: false,
        error: error.message,
      };
    }
  }

  /**
   * Broadcast message to team
   *
   * Sends message to all operators in manager's team.
   * Admins can broadcast to all operators or specific teams.
   *
   * @param managerId - Manager sending the broadcast
   * @param message - Message to broadcast
   * @param options - Broadcast options
   * @returns Delivery statistics
   *
   * @example
   * ```typescript
   * const result = await this.managerTools.broadcastMessage(
   *   'manager-uuid',
   *   'Внимание! График работы изменен на завтра.',
   *   { teamIds: ['team-1'], urgent: true }
   * );
   *
   * console.log(`Sent: ${result.sent}, Failed: ${result.failed}`);
   * ```
   */
  async broadcastMessage(
    managerId: string,
    message: string,
    options?: {
      teamIds?: string[];
      urgent?: boolean;
      operatorIds?: string[];
    },
  ): Promise<{
    sent: number;
    failed: number;
    total: number;
    failedRecipients: string[];
  }> {
    try {
      await this.verifyManagerAccess(managerId);

      // TODO: Implement actual broadcast:
      // 1. Get list of operators to send to (based on teams/operatorIds)
      // 2. Verify manager has permission to message these operators
      // 3. Get Telegram chat IDs for all operators
      // 4. Send message to each operator (use BullMQ for queuing)
      // 5. Track successes and failures

      this.logger.log(
        `Manager ${managerId} broadcasting message to ${options?.teamIds?.length || 'all'} teams`,
      );

      // Get recipients
      const recipients = await this.telegramUserRepository.find({
        where: {
          is_verified: true,
          // TODO: Add team filtering
        },
      });

      let sent = 0;
      let failed = 0;
      const failedRecipients: string[] = [];

      for (const recipient of recipients) {
        if (!recipient.chat_id) {
          failed++;
          failedRecipients.push(recipient.user_id);
          continue;
        }

        try {
          await this.resilientApi.sendText(
            recipient.chat_id,
            `📢 <b>Сообщение от менеджера:</b>\n\n${message}`,
            { parse_mode: 'HTML' },
            {
              priority: options?.urgent ? 2 : 0,
              attempts: 3,
            },
          );
          sent++;
        } catch (error) {
          failed++;
          failedRecipients.push(recipient.user_id);
          this.logger.error(`Failed to send broadcast to ${recipient.user_id}`, error);
        }
      }

      return {
        sent,
        failed,
        total: recipients.length,
        failedRecipients,
      };
    } catch (error) {
      this.logger.error('Failed to broadcast message', error);
      throw error;
    }
  }

  /**
   * Get team performance analytics
   *
   * Returns statistics for manager's team:
   * - Tasks completed today/this week
   * - Average completion time
   * - Active operators
   * - Tasks in progress
   *
   * @param managerId - Manager requesting analytics
   * @param period - Time period ('today' | 'week' | 'month')
   * @returns Team analytics data
   *
   * @example
   * ```typescript
   * const analytics = await this.managerTools.getTeamAnalytics('manager-uuid', 'today');
   * // Returns: {
   * //   tasksCompleted: 24,
   * //   tasksInProgress: 5,
   * //   activeOperators: 8,
   * //   avgCompletionTime: 35, // minutes
   * //   topPerformers: [...],
   * // }
   * ```
   */
  async getTeamAnalytics(
    managerId: string,
    period: 'today' | 'week' | 'month' = 'today',
  ): Promise<{
    tasksCompleted: number;
    tasksInProgress: number;
    activeOperators: number;
    totalOperators: number;
    avgCompletionTimeMinutes: number;
    topPerformers: Array<{
      name: string;
      tasksCompleted: number;
    }>;
    tasksByType: Record<string, number>;
  }> {
    await this.verifyManagerAccess(managerId);

    // TODO: Implement actual analytics query:
    // 1. Get manager's team
    // 2. Query tasks in specified period
    // 3. Calculate completion times
    // 4. Identify top performers
    // 5. Group by task type

    this.logger.log(`Getting team analytics for manager ${managerId}, period: ${period}`);

    // Placeholder
    return {
      tasksCompleted: 0,
      tasksInProgress: 0,
      activeOperators: 0,
      totalOperators: 0,
      avgCompletionTimeMinutes: 0,
      topPerformers: [],
      tasksByType: {},
    };
  }

  /**
   * Get list of active operators with current status
   *
   * Shows which operators are currently working and what they're doing.
   * Useful for real-time team monitoring.
   *
   * @param managerId - Manager requesting status
   * @returns List of operators with real-time status
   */
  async getActiveOperatorsStatus(managerId: string): Promise<
    Array<{
      id: string;
      name: string;
      status: 'idle' | 'working' | 'offline';
      currentTask?: {
        id: string;
        type: string;
        machineNumber: string;
        startedAt: Date;
      };
      lastSeen: Date;
      tasksCompletedToday: number;
    }>
  > {
    await this.verifyManagerAccess(managerId);

    // TODO: Implement actual status query:
    // 1. Get manager's team operators
    // 2. Check who has Telegram active (recent activity)
    // 3. Get current task for each operator
    // 4. Get today's completion count

    this.logger.log(`Getting active operators status for manager ${managerId}`);

    // Placeholder
    return [];
  }

  /**
   * Get pending task approvals
   *
   * Returns list of tasks waiting for manager approval
   * (e.g., completed tasks that need photo review).
   *
   * @param managerId - Manager ID
   * @returns List of tasks pending approval
   */
  async getPendingApprovals(managerId: string): Promise<
    Array<{
      taskId: string;
      type: string;
      operatorName: string;
      machineNumber: string;
      completedAt: Date;
      photosCount: number;
      requiresReview: boolean;
    }>
  > {
    await this.verifyManagerAccess(managerId);

    // TODO: Implement actual query:
    // 1. Get tasks with status 'completed' but not approved
    // 2. Filter to manager's area
    // 3. Include operator and machine info
    // 4. Count photos for review

    this.logger.log(`Getting pending approvals for manager ${managerId}`);

    // Placeholder
    return [];
  }

  /**
   * Approve or reject task completion
   *
   * Manager reviews task photos and approves/rejects completion.
   *
   * @param managerId - Manager ID
   * @param taskId - Task to approve/reject
   * @param approved - Approval decision
   * @param comment - Optional feedback comment
   * @returns Approval result
   */
  async approveTask(
    managerId: string,
    taskId: string,
    approved: boolean,
    comment?: string,
  ): Promise<{
    success: boolean;
    notifiedOperator: boolean;
  }> {
    try {
      await this.verifyManagerAccess(managerId);

      // TODO: Implement actual approval:
      // 1. Validate task exists and is pending approval
      // 2. Update task status (approved/rejected)
      // 3. Add comment to task history
      // 4. Notify operator of decision

      this.logger.log(`Manager ${managerId} ${approved ? 'approved' : 'rejected'} task ${taskId}`);

      // Get task and operator info
      // TODO: Actual implementation

      // Send notification to operator
      // TODO: Send via resilient API

      return {
        success: true,
        notifiedOperator: true,
      };
    } catch (error) {
      this.logger.error('Failed to approve task', error);
      return {
        success: false,
        notifiedOperator: false,
      };
    }
  }

  /**
   * Format team analytics as Telegram message
   *
   * Creates nicely formatted message with emojis and stats.
   *
   * @param analytics - Analytics data
   * @param language - Language for formatting
   * @returns Formatted message
   */
  formatAnalyticsMessage(
    analytics: {
      tasksCompleted: number;
      tasksInProgress: number;
      activeOperators: number;
      totalOperators: number;
      avgCompletionTimeMinutes: number;
      topPerformers: Array<{ name: string; tasksCompleted: number }>;
      tasksByType: Record<string, number>;
    },
    language: string = 'ru',
  ): string {
    const t = this.i18nService.getFixedT(language);

    let message = `📊 <b>${t('manager.analytics_title')}</b>\n\n`;

    message += `✅ ${t('manager.tasks_completed')}: <b>${analytics.tasksCompleted}</b>\n`;
    message += `⏳ ${t('manager.tasks_in_progress')}: <b>${analytics.tasksInProgress}</b>\n`;
    message += `👥 ${t('manager.active_operators')}: <b>${analytics.activeOperators}/${analytics.totalOperators}</b>\n`;
    message += `⏱ ${t('manager.avg_completion_time')}: <b>${analytics.avgCompletionTimeMinutes} ${t('common.minutes')}</b>\n\n`;

    if (analytics.topPerformers.length > 0) {
      message += `🏆 <b>${t('manager.top_performers')}:</b>\n`;
      analytics.topPerformers.slice(0, 3).forEach((performer, index) => {
        const medal = ['🥇', '🥈', '🥉'][index];
        message += `${medal} ${performer.name} - ${performer.tasksCompleted} ${t('manager.tasks')}\n`;
      });
      message += '\n';
    }

    if (Object.keys(analytics.tasksByType).length > 0) {
      message += `📋 <b>${t('manager.tasks_by_type')}:</b>\n`;
      Object.entries(analytics.tasksByType).forEach(([type, count]) => {
        const emoji =
          {
            refill: '📦',
            collection: '💰',
            maintenance: '🔧',
            inspection: '🔍',
            repair: '🛠',
            cleaning: '🧹',
          }[type] || '📌';
        message += `${emoji} ${t(`tasks.types.${type}`)}: ${count}\n`;
      });
    }

    return message;
  }

  /**
   * Create keyboard for task assignment flow
   *
   * @param operators - List of operators
   * @param language - Language for labels
   * @returns Inline keyboard markup
   */
  createOperatorSelectionKeyboard(
    operators: Array<{ id: string; name: string; tasksInProgress: number }>,
    language: string = 'ru',
  ) {
    const buttons = operators.map((operator) => [
      Markup.button.callback(
        `${operator.name} (${operator.tasksInProgress} задач)`,
        `assign_operator:${operator.id}`,
      ),
    ]);

    buttons.push([
      Markup.button.callback(this.i18nService.t(language, 'common.cancel'), 'assign_cancel'),
    ]);

    return Markup.inlineKeyboard(buttons);
  }

  /**
   * Create keyboard for task selection
   *
   * @param tasks - List of tasks
   * @param language - Language for labels
   * @returns Inline keyboard markup
   */
  createTaskSelectionKeyboard(
    tasks: Array<{
      id: string;
      type: string;
      machineNumber: string;
      priority: string;
    }>,
    language: string = 'ru',
  ) {
    const buttons = tasks.slice(0, 10).map((task) => {
      const emoji =
        {
          refill: '📦',
          collection: '💰',
          maintenance: '🔧',
        }[task.type] || '📌';

      const priorityEmoji = task.priority === 'high' ? '🔴 ' : '';

      return [
        Markup.button.callback(
          `${priorityEmoji}${emoji} ${task.machineNumber} - ${this.i18nService.t(language, `tasks.types.${task.type}`)}`,
          `assign_task:${task.id}`,
        ),
      ];
    });

    buttons.push([
      Markup.button.callback(this.i18nService.t(language, 'common.cancel'), 'assign_cancel'),
    ]);

    return Markup.inlineKeyboard(buttons);
  }
}
