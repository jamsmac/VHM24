import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Markup } from 'telegraf';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramSettingsService } from './telegram-settings.service';
import { TelegramResilientApiService } from './telegram-resilient-api.service';
import { TelegramUser, TelegramUserStatus } from '../entities/telegram-user.entity';
import {
  TelegramMessageLog,
  TelegramMessageType,
  TelegramMessageStatus,
} from '../entities/telegram-message-log.entity';
import { Task } from '../../tasks/entities/task.entity';

/**
 * Type for inline keyboard with reply_markup
 */
type InlineKeyboard = ReturnType<typeof Markup.inlineKeyboard> | undefined;

export interface NotificationPayload {
  userId?: string; // Send to specific user
  userIds?: string[]; // Send to multiple users
  broadcast?: boolean; // Send to all active users
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  actions?: Array<{ text: string; url?: string; callback_data?: string }>;
}

@Injectable()
export class TelegramNotificationsService {
  private readonly logger = new Logger(TelegramNotificationsService.name);

  constructor(
    private telegramBotService: TelegramBotService,
    private telegramSettingsService: TelegramSettingsService,
    private resilientApi: TelegramResilientApiService,
    @InjectRepository(TelegramUser)
    private telegramUserRepository: Repository<TelegramUser>,
    @InjectRepository(TelegramMessageLog)
    private telegramMessageLogRepository: Repository<TelegramMessageLog>,
  ) {}

  async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      const settings = await this.telegramSettingsService.getSettings();

      if (!settings.send_notifications || !this.telegramBotService.isReady()) {
        this.logger.warn('Telegram notifications are disabled or bot is not ready');
        return;
      }

      const users = await this.getTargetUsers(payload);

      if (users.length === 0) {
        this.logger.warn('No target users found for notification');
        return;
      }

      const message = this.formatNotificationMessage(payload);
      const keyboard = this.buildKeyboard(payload);

      for (const user of users) {
        // Check if user wants this type of notification
        if (!this.shouldSendNotification(user, payload.type)) {
          continue;
        }

        try {
          // 🚀 Use resilient API with automatic retry for unreliable networks
          await this.resilientApi.sendText(
            user.chat_id,
            message,
            keyboard
              ? { reply_markup: keyboard.reply_markup, parse_mode: 'HTML' }
              : { parse_mode: 'HTML' },
            {
              priority: 1, // High priority for notifications
              attempts: 5, // Retry up to 5 times
              metadata: {
                userId: user.id,
                messageType: TelegramMessageType.NOTIFICATION,
                relatedEntityType: payload.type,
              },
            },
          );

          await this.logNotification(
            user.id,
            user.chat_id,
            payload.type,
            message,
            TelegramMessageStatus.SENT,
          );
        } catch (error) {
          this.logger.error(`Failed to queue notification for user ${user.id}`, error);

          await this.logNotification(
            user.id,
            user.chat_id,
            payload.type,
            message,
            TelegramMessageStatus.FAILED,
            error.message,
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to send notification', error);
    }
  }

  private async getTargetUsers(payload: NotificationPayload): Promise<TelegramUser[]> {
    if (payload.broadcast) {
      return this.telegramUserRepository.find({
        where: { is_verified: true, status: TelegramUserStatus.ACTIVE },
      });
    }

    if (payload.userId) {
      const user = await this.telegramUserRepository.findOne({
        where: { user_id: payload.userId, is_verified: true },
      });
      return user ? [user] : [];
    }

    if (payload.userIds && payload.userIds.length > 0) {
      return this.telegramUserRepository
        .createQueryBuilder('telegram_user')
        .where('telegram_user.user_id IN (:...userIds)', { userIds: payload.userIds })
        .andWhere('telegram_user.is_verified = :verified', { verified: true })
        .getMany();
    }

    return [];
  }

  private shouldSendNotification(user: TelegramUser, notificationType: string): boolean {
    const prefs = (user.notification_preferences || {}) as Record<string, boolean | undefined>;

    // Map notification types to preference keys
    const typeMap: Record<string, string> = {
      machine_offline: 'machine_offline',
      machine_online: 'machine_online',
      low_stock: 'low_stock',
      sales_milestone: 'sales_milestone',
      maintenance_due: 'maintenance_due',
      equipment_needs_maintenance: 'equipment_needs_maintenance',
      equipment_low_stock: 'equipment_low_stock',
      equipment_washing_due: 'equipment_washing_due',
      payment_failed: 'payment_failed',
      task_assigned: 'task_assigned',
      task_completed: 'task_completed',
      custom: 'custom',
    };

    const prefKey = typeMap[notificationType];

    if (!prefKey) {
      // Unknown type, send by default
      return true;
    }

    // If preference is not set, default to true
    return prefs[prefKey] !== false;
  }

  private formatNotificationMessage(payload: NotificationPayload): string {
    const icon = this.getNotificationIcon(payload.type);

    let message = `${icon} <b>${payload.title}</b>\n\n${payload.message}`;

    if (payload.data) {
      const dataLines = Object.entries(payload.data)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');

      if (dataLines) {
        message += `\n\n${dataLines}`;
      }
    }

    return message;
  }

  private getNotificationIcon(type: string): string {
    const icons: Record<string, string> = {
      machine_offline: '🔴',
      machine_online: '🟢',
      low_stock: '📦',
      sales_milestone: '🎉',
      maintenance_due: '🔧',
      equipment_needs_maintenance: '⚠️',
      equipment_low_stock: '📦',
      equipment_washing_due: '🧼',
      payment_failed: '💳',
      task_assigned: '📋',
      task_completed: '✅',
      custom: '🔔',
    };

    return icons[type] || '🔔';
  }

  private buildKeyboard(payload: NotificationPayload): InlineKeyboard {
    if (!payload.actions || payload.actions.length === 0) {
      return undefined;
    }

    const buttons = payload.actions
      .map((action) => {
        if (action.url) {
          return Markup.button.url(action.text, action.url);
        } else if (action.callback_data) {
          return Markup.button.callback(action.text, action.callback_data);
        }
        return null;
      })
      .filter(
        (
          btn,
        ): btn is
          | ReturnType<typeof Markup.button.url>
          | ReturnType<typeof Markup.button.callback> => btn !== null,
      );

    if (buttons.length === 0) {
      return undefined;
    }

    return Markup.inlineKeyboard([buttons]);
  }

  private async logNotification(
    userId: string,
    chatId: string,
    type: string,
    message: string,
    status: TelegramMessageStatus,
    errorMessage?: string,
  ): Promise<void> {
    try {
      const log = this.telegramMessageLogRepository.create({
        telegram_user_id: userId,
        chat_id: chatId,
        message_type: TelegramMessageType.NOTIFICATION,
        message_text: message,
        status,
        error_message: errorMessage || null,
        metadata: { notification_type: type },
      });

      await this.telegramMessageLogRepository.save(log);
    } catch (error) {
      this.logger.error('Failed to log notification', error);
    }
  }

  // Convenience methods for specific notification types
  async notifyMachineOffline(
    userId: string,
    machineId: string,
    machineName: string,
  ): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'machine_offline',
      title: 'Машина оффлайн',
      message: `Машина "${machineName}" перешла в оффлайн режим`,
      data: {
        'ID машины': machineId,
      },
      actions: [
        {
          text: '🔍 Посмотреть детали',
          url: `${process.env.FRONTEND_URL}/machines/${machineId}`,
        },
      ],
    });
  }

  async notifyLowStock(
    userId: string,
    machineId: string,
    machineName: string,
    stockLevel: number,
  ): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'low_stock',
      title: 'Низкий запас',
      message: `Низкий уровень запаса на машине "${machineName}"`,
      data: {
        Осталось: `${stockLevel}%`,
      },
      actions: [
        {
          text: '📦 Пополнить запас',
          url: `${process.env.FRONTEND_URL}/machines/${machineId}`,
        },
      ],
    });
  }

  async notifyTaskAssigned(userId: string, taskId: string, taskTitle: string): Promise<void> {
    await this.sendNotification({
      userId,
      type: 'task_assigned',
      title: 'Новая задача',
      message: `Вам назначена новая задача: ${taskTitle}`,
      actions: [
        {
          text: '📋 Открыть задачу',
          url: `${process.env.FRONTEND_URL}/tasks/${taskId}`,
        },
      ],
    });
  }

  // ============================================================================
  // DIRECT TELEGRAM ID METHODS (for legacy compatibility with NotificationsService)
  // ============================================================================

  /**
   * Send notification directly to Telegram user by their Telegram ID
   * Used by NotificationsService for general notifications
   *
   * @param telegramUserId - Telegram user ID (numeric)
   * @param message - Message text (supports Markdown)
   * @returns true if sent successfully
   */
  async sendDirectNotification(telegramUserId: number, message: string): Promise<boolean> {
    if (!this.telegramBotService.isReady()) {
      this.logger.warn('Telegram bot not ready, cannot send notification');
      return false;
    }

    try {
      await this.resilientApi.sendText(
        telegramUserId.toString(),
        message,
        { parse_mode: 'Markdown' },
        {
          priority: 1,
          attempts: 3,
          metadata: {
            messageType: TelegramMessageType.NOTIFICATION,
            relatedEntityType: 'direct_notification',
          },
        },
      );
      return true;
    } catch (error) {
      this.logger.error(`Failed to send direct notification to ${telegramUserId}`, error);
      return false;
    }
  }

  /**
   * Notify user about task assignment with full task object
   * Used by NotificationsService for task assignment notifications
   *
   * @param task - Task entity with machine relation
   * @param telegramUserId - Telegram user ID (numeric)
   * @returns true if sent successfully
   */
  async notifyTaskAssignedWithTask(task: Task, telegramUserId: number): Promise<boolean> {
    const priority = this.getPriorityEmoji(task.priority);
    const dueDate = task.due_date
      ? new Date(task.due_date).toLocaleString('ru-RU')
      : 'Не указан';

    const message =
      `🔔 **Новая задача назначена**\n\n` +
      `${priority} Тип: ${task.type_code}\n` +
      `📍 Аппарат: ${task.machine?.machine_number || 'N/A'}\n` +
      `⏰ Срок: ${dueDate}\n\n` +
      `Используйте /task ${task.id} для просмотра деталей`;

    return this.sendDirectNotification(telegramUserId, message);
  }

  /**
   * Notify user about overdue task
   * Used by NotificationsService for task overdue notifications
   *
   * @param task - Task entity with machine relation
   * @param telegramUserId - Telegram user ID (numeric)
   * @param hoursOverdue - Hours the task is overdue
   * @returns true if sent successfully
   */
  async notifyTaskOverdue(
    task: Task,
    telegramUserId: number,
    hoursOverdue: number,
  ): Promise<boolean> {
    const message =
      `⚠️ **Задача просрочена**\n\n` +
      `Задача ${task.type_code} для аппарата ${task.machine?.machine_number || 'N/A'}\n` +
      `Просрочено на: ${hoursOverdue} часов\n\n` +
      `Пожалуйста, завершите задачу как можно скорее.\n` +
      `/task ${task.id}`;

    return this.sendDirectNotification(telegramUserId, message);
  }

  /**
   * Get priority emoji for task priority
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
}
