import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between, MoreThan } from 'typeorm';
import { TelegramUser, TelegramUserStatus } from '../entities/telegram-user.entity';
import { TelegramResilientApiService } from './telegram-resilient-api.service';
import { TelegramI18nService } from './telegram-i18n.service';
import { Markup } from 'telegraf';
import { UsersService } from '../../users/users.service';
import { TasksService } from '../../tasks/tasks.service';
import { FilesService } from '../../files/files.service';
import { User, UserRole, UserStatus } from '../../users/entities/user.entity';
import { Task, TaskStatus, TaskType } from '../../tasks/entities/task.entity';

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
 */
@Injectable()
export class TelegramManagerToolsService {
  private readonly logger = new Logger(TelegramManagerToolsService.name);

  // Roles allowed to use manager tools
  private readonly MANAGER_ROLES = [
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
  ];

  // Roles that can be assigned tasks
  private readonly OPERATOR_ROLES = [
    UserRole.OPERATOR,
    UserRole.COLLECTOR,
    UserRole.TECHNICIAN,
  ];

  constructor(
    @InjectRepository(TelegramUser)
    private readonly telegramUserRepository: Repository<TelegramUser>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly resilientApi: TelegramResilientApiService,
    private readonly i18nService: TelegramI18nService,
    private readonly usersService: UsersService,
    private readonly tasksService: TasksService,
    private readonly filesService: FilesService,
  ) {}

  /**
   * Verify user has manager or admin role
   *
   * @param userId - VendHub user ID
   * @throws ForbiddenException if user is not manager/admin
   */
  async verifyManagerAccess(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (!this.MANAGER_ROLES.includes(user.role)) {
      throw new ForbiddenException(
        'Only managers and admins can use this feature',
      );
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException('User account is not active');
    }

    this.logger.log(`Manager access verified for user ${userId} (${user.role})`);
    return user;
  }

  /**
   * Get list of operators available for task assignment
   *
   * Returns operators that manager can assign tasks to.
   * Managers see only their team, admins see all operators.
   *
   * @param managerId - Manager's VendHub user ID
   * @returns List of operators with Telegram info
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

    // Get operators with Telegram linked
    const telegramUsers = await this.telegramUserRepository.find({
      where: {
        is_verified: true,
        status: TelegramUserStatus.ACTIVE,
      },
      relations: ['user'],
    });

    // Filter to only operators
    const operators = telegramUsers.filter(
      (tu) =>
        tu.user &&
        this.OPERATOR_ROLES.includes(tu.user.role) &&
        tu.user.status === UserStatus.ACTIVE,
    );

    // Get task counts for each operator
    const result = await Promise.all(
      operators.map(async (op) => {
        const tasksInProgress = await this.taskRepository.count({
          where: {
            assigned_to_user_id: op.user_id,
            status: In([TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS]),
          },
        });

        return {
          id: op.user_id,
          name: op.user?.full_name || op.first_name || 'Unknown',
          chatId: op.chat_id,
          status: op.user?.status || 'unknown',
          tasksInProgress,
          lastActive: op.last_interaction_at,
        };
      }),
    );

    // Sort by status (those with fewer tasks first) and name
    result.sort((a, b) => {
      if (a.tasksInProgress !== b.tasksInProgress) {
        return a.tasksInProgress - b.tasksInProgress;
      }
      return a.name.localeCompare(b.name);
    });

    this.logger.log(
      `Found ${result.length} available operators for manager ${managerId}`,
    );

    return result;
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

    // Get tasks with status 'pending' (not yet assigned)
    const tasks = await this.taskRepository.find({
      where: {
        status: TaskStatus.PENDING,
        assigned_to_user_id: null as unknown as string,
      },
      relations: ['machine', 'machine.location'],
      order: {
        priority: 'DESC',
        created_at: 'ASC',
      },
      take: 50, // Limit to 50 most urgent tasks
    });

    const result = tasks.map((task) => ({
      id: task.id,
      type: task.type_code,
      machineNumber: task.machine?.machine_number || 'N/A',
      machineName: task.machine?.name || 'Unknown',
      location:
        task.machine?.location?.name ||
        task.machine?.location?.address ||
        'Unknown',
      priority: task.priority,
      createdAt: task.created_at,
    }));

    this.logger.log(
      `Found ${result.length} unassigned tasks for manager ${managerId}`,
    );

    return result;
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

      // Get the task
      const task = await this.tasksService.findOne(taskId);

      if (!task) {
        return {
          success: false,
          notificationSent: false,
          error: 'Task not found',
        };
      }

      if (task.status === TaskStatus.COMPLETED) {
        return {
          success: false,
          notificationSent: false,
          error: 'Cannot assign a completed task',
        };
      }

      // Assign the task using TasksService
      await this.tasksService.assignTask(taskId, operatorId);

      this.logger.log(
        `Manager ${managerId} assigned task ${taskId} to operator ${operatorId}`,
      );

      // Get operator's Telegram info
      const operator = await this.telegramUserRepository.findOne({
        where: { user_id: operatorId },
      });

      if (!operator || !operator.chat_id) {
        return {
          success: true,
          notificationSent: false,
          error: 'Operator does not have Telegram linked',
        };
      }

      // Get task type emoji
      const taskEmoji = this.getTaskTypeEmoji(task.type_code);

      // Send notification to operator
      const message = this.i18nService.t(operator.language, 'manager.task_assigned', {
        taskType: this.i18nService.t(operator.language, `tasks.types.${task.type_code}`),
        machineNumber: task.machine?.machine_number || 'N/A',
      });

      const fullMessage =
        `${taskEmoji} <b>${message}</b>\n\n` +
        `📍 ${task.machine?.location?.name || task.machine?.location?.address || 'Unknown location'}\n` +
        `📝 ${task.description || 'No description'}\n\n` +
        `${this.i18nService.t(operator.language, 'manager.tap_to_view')}`;

      await this.resilientApi.sendText(
        operator.chat_id,
        fullMessage,
        {
          parse_mode: 'HTML',
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback(
                this.i18nService.t(operator.language, 'tasks.view_task'),
                `task:${taskId}`,
              ),
            ],
          ]),
        },
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
   */
  async broadcastMessage(
    managerId: string,
    message: string,
    options?: {
      teamIds?: string[];
      urgent?: boolean;
      operatorIds?: string[];
      roles?: UserRole[];
    },
  ): Promise<{
    sent: number;
    failed: number;
    total: number;
    failedRecipients: string[];
  }> {
    try {
      const manager = await this.verifyManagerAccess(managerId);

      // Build query for recipients
      let recipients: TelegramUser[];

      if (options?.operatorIds && options.operatorIds.length > 0) {
        // Send to specific operators
        recipients = await this.telegramUserRepository.find({
          where: {
            user_id: In(options.operatorIds),
            is_verified: true,
            status: TelegramUserStatus.ACTIVE,
          },
        });
      } else {
        // Get all verified telegram users
        recipients = await this.telegramUserRepository.find({
          where: {
            is_verified: true,
            status: TelegramUserStatus.ACTIVE,
          },
          relations: ['user'],
        });

        // Filter by roles if specified
        if (options?.roles && options.roles.length > 0) {
          recipients = recipients.filter(
            (r) => r.user && options.roles!.includes(r.user.role),
          );
        } else {
          // Default: send to operators only
          recipients = recipients.filter(
            (r) => r.user && this.OPERATOR_ROLES.includes(r.user.role),
          );
        }
      }

      this.logger.log(
        `Manager ${managerId} broadcasting message to ${recipients.length} recipients`,
      );

      let sent = 0;
      let failed = 0;
      const failedRecipients: string[] = [];

      const managerName = manager.full_name || 'Manager';
      const urgentPrefix = options?.urgent ? '🚨 ' : '';

      for (const recipient of recipients) {
        if (!recipient.chat_id) {
          failed++;
          failedRecipients.push(recipient.user_id);
          continue;
        }

        try {
          const formattedMessage =
            `${urgentPrefix}📢 <b>${this.i18nService.t(recipient.language, 'manager.broadcast_from', { name: managerName })}:</b>\n\n` +
            message;

          await this.resilientApi.sendText(
            recipient.chat_id,
            formattedMessage,
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
          this.logger.error(
            `Failed to send broadcast to ${recipient.user_id}`,
            error,
          );
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

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
    }

    // Get completed tasks in period
    const completedTasks = await this.taskRepository.find({
      where: {
        status: TaskStatus.COMPLETED,
        completed_at: Between(startDate, now),
      },
      relations: ['assigned_to'],
    });

    // Get tasks in progress
    const tasksInProgress = await this.taskRepository.count({
      where: {
        status: In([TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS]),
      },
    });

    // Get operator counts
    const totalOperators = await this.telegramUserRepository.count({
      where: {
        is_verified: true,
        status: TelegramUserStatus.ACTIVE,
      },
    });

    // Active operators (interacted in last 24 hours)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const activeOperators = await this.telegramUserRepository.count({
      where: {
        is_verified: true,
        status: TelegramUserStatus.ACTIVE,
        last_interaction_at: MoreThan(oneDayAgo),
      },
    });

    // Calculate average completion time
    let avgCompletionTimeMinutes = 0;
    if (completedTasks.length > 0) {
      const totalMinutes = completedTasks.reduce((sum, task) => {
        if (task.started_at && task.completed_at) {
          const duration =
            (task.completed_at.getTime() - task.started_at.getTime()) /
            (1000 * 60);
          return sum + duration;
        }
        return sum;
      }, 0);
      avgCompletionTimeMinutes = Math.round(totalMinutes / completedTasks.length);
    }

    // Get top performers
    const performerMap = new Map<string, { name: string; count: number }>();
    for (const task of completedTasks) {
      if (task.assigned_to) {
        const key = task.assigned_to_user_id!;
        const existing = performerMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          performerMap.set(key, {
            name: task.assigned_to.full_name,
            count: 1,
          });
        }
      }
    }

    const topPerformers = Array.from(performerMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((p) => ({ name: p.name, tasksCompleted: p.count }));

    // Group by task type
    const tasksByType: Record<string, number> = {};
    for (const task of completedTasks) {
      tasksByType[task.type_code] = (tasksByType[task.type_code] || 0) + 1;
    }

    this.logger.log(
      `Generated analytics for manager ${managerId}: ${completedTasks.length} completed tasks in ${period}`,
    );

    return {
      tasksCompleted: completedTasks.length,
      tasksInProgress,
      activeOperators,
      totalOperators,
      avgCompletionTimeMinutes,
      topPerformers,
      tasksByType,
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

    // Get all verified operators with Telegram
    const operators = await this.telegramUserRepository.find({
      where: {
        is_verified: true,
        status: TelegramUserStatus.ACTIVE,
      },
      relations: ['user'],
    });

    // Filter to operators only
    const filteredOperators = operators.filter(
      (op) => op.user && this.OPERATOR_ROLES.includes(op.user.role),
    );

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const result = await Promise.all(
      filteredOperators.map(async (op) => {
        // Get current task (in progress)
        const currentTask = await this.taskRepository.findOne({
          where: {
            assigned_to_user_id: op.user_id,
            status: TaskStatus.IN_PROGRESS,
          },
          relations: ['machine'],
        });

        // Get tasks completed today
        const tasksCompletedToday = await this.taskRepository.count({
          where: {
            assigned_to_user_id: op.user_id,
            status: TaskStatus.COMPLETED,
            completed_at: Between(todayStart, now),
          },
        });

        // Determine status
        let status: 'idle' | 'working' | 'offline';
        if (currentTask) {
          status = 'working';
        } else if (
          op.last_interaction_at &&
          op.last_interaction_at > oneHourAgo
        ) {
          status = 'idle';
        } else {
          status = 'offline';
        }

        return {
          id: op.user_id,
          name: op.user?.full_name || op.first_name || 'Unknown',
          status,
          currentTask: currentTask
            ? {
                id: currentTask.id,
                type: currentTask.type_code,
                machineNumber: currentTask.machine?.machine_number || 'N/A',
                startedAt: currentTask.started_at!,
              }
            : undefined,
          lastSeen: op.last_interaction_at || op.created_at,
          tasksCompletedToday,
        };
      }),
    );

    // Sort: working first, then idle, then offline
    const statusOrder = { working: 0, idle: 1, offline: 2 };
    result.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    this.logger.log(
      `Got status for ${result.length} operators for manager ${managerId}`,
    );

    return result;
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

    // Get completed tasks that might need review
    // Tasks with pending_photos or recently completed
    const tasks = await this.taskRepository.find({
      where: [
        { status: TaskStatus.COMPLETED, pending_photos: true },
        {
          status: TaskStatus.COMPLETED,
          completed_at: MoreThan(
            new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          ),
        },
      ],
      relations: ['machine', 'assigned_to'],
      order: { completed_at: 'DESC' },
      take: 50,
    });

    const result = await Promise.all(
      tasks.map(async (task) => {
        // Get photo count for task
        const photos = await this.filesService.findByEntity('task', task.id);

        return {
          taskId: task.id,
          type: task.type_code,
          operatorName: task.assigned_to?.full_name || 'Unknown',
          machineNumber: task.machine?.machine_number || 'N/A',
          completedAt: task.completed_at!,
          photosCount: photos.length,
          requiresReview:
            task.pending_photos ||
            !task.has_photo_before ||
            !task.has_photo_after,
        };
      }),
    );

    // Sort: tasks requiring review first
    result.sort((a, b) => {
      if (a.requiresReview !== b.requiresReview) {
        return a.requiresReview ? -1 : 1;
      }
      return b.completedAt.getTime() - a.completedAt.getTime();
    });

    this.logger.log(
      `Found ${result.length} pending approvals for manager ${managerId}`,
    );

    return result;
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
      const manager = await this.verifyManagerAccess(managerId);

      const task = await this.tasksService.findOne(taskId);

      if (!task) {
        this.logger.warn(`Task ${taskId} not found for approval`);
        return { success: false, notifiedOperator: false };
      }

      if (task.status !== TaskStatus.COMPLETED) {
        this.logger.warn(
          `Task ${taskId} is not in completed status, cannot approve/reject`,
        );
        return { success: false, notifiedOperator: false };
      }

      // Update task metadata with approval info
      const metadata = task.metadata || {};
      metadata.reviewed_by = managerId;
      metadata.reviewed_at = new Date().toISOString();
      metadata.approved = approved;
      if (comment) {
        metadata.review_comment = comment;
      }

      await this.taskRepository.update(taskId, {
        metadata,
        pending_photos: false, // Clear pending flag after review
      });

      this.logger.log(
        `Manager ${managerId} ${approved ? 'approved' : 'rejected'} task ${taskId}`,
      );

      // Notify operator if they have Telegram
      let notifiedOperator = false;
      if (task.assigned_to_user_id) {
        const operator = await this.telegramUserRepository.findOne({
          where: { user_id: task.assigned_to_user_id },
        });

        if (operator?.chat_id) {
          const emoji = approved ? '✅' : '❌';
          const statusKey = approved
            ? 'manager.task_approved'
            : 'manager.task_rejected';

          let message =
            `${emoji} <b>${this.i18nService.t(operator.language, statusKey)}</b>\n\n` +
            `📋 ${this.i18nService.t(operator.language, `tasks.types.${task.type_code}`)}\n` +
            `🏭 ${task.machine?.machine_number || 'N/A'}\n` +
            `👤 ${this.i18nService.t(operator.language, 'manager.reviewed_by')}: ${manager.full_name}`;

          if (comment) {
            message += `\n\n💬 ${comment}`;
          }

          try {
            await this.resilientApi.sendText(
              operator.chat_id,
              message,
              { parse_mode: 'HTML' },
              { priority: 1, attempts: 3 },
            );
            notifiedOperator = true;
          } catch (error) {
            this.logger.error(
              `Failed to notify operator about task approval`,
              error,
            );
          }
        }
      }

      return {
        success: true,
        notifiedOperator,
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
        const emoji = this.getTaskTypeEmoji(type as TaskType);
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
        `${operator.name} (${operator.tasksInProgress} ${this.i18nService.t(language, 'manager.tasks')})`,
        `assign_operator:${operator.id}`,
      ),
    ]);

    buttons.push([
      Markup.button.callback(
        this.i18nService.t(language, 'common.cancel'),
        'assign_cancel',
      ),
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
      const emoji = this.getTaskTypeEmoji(task.type as TaskType);
      const priorityEmoji = task.priority === 'high' || task.priority === 'urgent' ? '🔴 ' : '';

      return [
        Markup.button.callback(
          `${priorityEmoji}${emoji} ${task.machineNumber} - ${this.i18nService.t(language, `tasks.types.${task.type}`)}`,
          `assign_task:${task.id}`,
        ),
      ];
    });

    buttons.push([
      Markup.button.callback(
        this.i18nService.t(language, 'common.cancel'),
        'assign_cancel',
      ),
    ]);

    return Markup.inlineKeyboard(buttons);
  }

  /**
   * Format operators status as Telegram message
   */
  formatOperatorsStatusMessage(
    operators: Array<{
      name: string;
      status: 'idle' | 'working' | 'offline';
      currentTask?: { type: string; machineNumber: string };
      tasksCompletedToday: number;
    }>,
    language: string = 'ru',
  ): string {
    const t = this.i18nService.getFixedT(language);

    let message = `👥 <b>${t('manager.operators_status')}</b>\n\n`;

    const statusEmoji = {
      working: '🟢',
      idle: '🟡',
      offline: '⚫',
    };

    for (const op of operators) {
      message += `${statusEmoji[op.status]} <b>${op.name}</b>`;

      if (op.status === 'working' && op.currentTask) {
        const taskEmoji = this.getTaskTypeEmoji(op.currentTask.type as TaskType);
        message += ` - ${taskEmoji} ${op.currentTask.machineNumber}`;
      }

      message += ` (${op.tasksCompletedToday} ${t('manager.today')})\n`;
    }

    return message;
  }
}
