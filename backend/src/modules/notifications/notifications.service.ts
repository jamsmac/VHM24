import { Injectable, NotFoundException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Notification,
  NotificationStatus,
  NotificationChannel,
  NotificationType,
} from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { CreateNotificationDto, BulkNotificationDto } from './dto/create-notification.dto';
import {
  CreateNotificationPreferenceDto,
  UpdateNotificationPreferenceDto,
} from './dto/notification-preference.dto';
import { EmailService } from '../email/email.service';
import { TelegramNotificationsService } from '../telegram/notifications/services/telegram-notifications.service';
import { WebPushService } from '../web-push/web-push.service';
import { FcmService } from '../fcm/fcm.service';
import { SmsService } from '../sms/sms.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationPreference)
    private readonly preferenceRepository: Repository<NotificationPreference>,
    private readonly emailService: EmailService,
    @Inject(forwardRef(() => TelegramNotificationsService))
    private readonly telegramNotificationsService: TelegramNotificationsService,
    private readonly webPushService: WebPushService,
    private readonly fcmService: FcmService,
    private readonly smsService: SmsService,
  ) {}

  // ============================================================================
  // NOTIFICATIONS CRUD
  // ============================================================================

  /**
   * Создание и отправка уведомления
   */
  async create(dto: CreateNotificationDto): Promise<Notification> {
    // Проверяем настройки пользователя
    const preference = await this.getUserPreference(dto.recipient_id, dto.type, dto.channel);

    if (preference && !preference.is_enabled) {
      // Пользователь отключил этот тип уведомлений
      // Можем либо не создавать уведомление, либо создать но не отправлять
      // Создаем для истории, но не отправляем
      const notification = this.notificationRepository.create({
        ...dto,
        status: NotificationStatus.FAILED,
        error_message: 'Disabled by user preference',
      });
      return this.notificationRepository.save(notification);
    }

    const notification = this.notificationRepository.create(dto);
    const savedNotification = await this.notificationRepository.save(notification);

    // Асинхронно отправляем уведомление
    this.sendNotification(savedNotification.id).catch((error) => {
      this.logger.error(`Failed to send notification ${savedNotification.id}:`, error);
    });

    return savedNotification;
  }

  /**
   * Массовая отправка уведомлений
   * Optimized: uses Promise.all instead of sequential loop
   */
  async createBulk(dto: BulkNotificationDto): Promise<Notification[]> {
    // Process in parallel for better performance
    const notifications = await Promise.all(
      dto.recipient_ids.map((recipientId) =>
        this.create({
          type: dto.type,
          channel: dto.channel,
          recipient_id: recipientId,
          title: dto.title,
          message: dto.message,
          data: dto.data,
        }),
      ),
    );

    return notifications;
  }

  /**
   * Получение уведомлений пользователя
   */
  async getUserNotifications(
    userId: string,
    status?: NotificationStatus,
    unreadOnly: boolean = false,
  ): Promise<Notification[]> {
    const query = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.recipient_id = :userId', { userId });

    if (status) {
      query.andWhere('notification.status = :status', { status });
    }

    if (unreadOnly) {
      query.andWhere('notification.read_at IS NULL');
    }

    query.orderBy('notification.created_at', 'DESC');

    return query.getMany();
  }

  /**
   * Получение уведомления по ID
   */
  async findOne(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`Уведомление с ID ${id} не найдено`);
    }

    return notification;
  }

  /**
   * Отметить уведомление как прочитанное
   */
  async markAsRead(id: string): Promise<Notification> {
    const notification = await this.findOne(id);

    if (!notification.read_at) {
      notification.read_at = new Date();
      notification.status = NotificationStatus.READ;
      return this.notificationRepository.save(notification);
    }

    return notification;
  }

  /**
   * Отметить все уведомления пользователя как прочитанные
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({
        read_at: new Date(),
        status: NotificationStatus.READ,
      })
      .where('recipient_id = :userId', { userId })
      .andWhere('read_at IS NULL')
      .execute();
  }

  /**
   * Удаление уведомления
   */
  async remove(id: string): Promise<void> {
    const notification = await this.findOne(id);
    await this.notificationRepository.softRemove(notification);
  }

  // ============================================================================
  // ОТПРАВКА УВЕДОМЛЕНИЙ
  // ============================================================================

  /**
   * Отправка уведомления через соответствующий канал
   */
  async sendNotification(notificationId: string): Promise<Notification> {
    const notification = await this.findOne(notificationId);

    if (notification.status === NotificationStatus.SENT) {
      return notification; // Уже отправлено
    }

    try {
      let response = '';

      switch (notification.channel) {
        case NotificationChannel.TELEGRAM:
          response = await this.sendTelegram(notification);
          break;

        case NotificationChannel.EMAIL:
          response = await this.sendEmail(notification);
          break;

        case NotificationChannel.SMS:
          response = await this.sendSMS(notification);
          break;

        case NotificationChannel.WEB_PUSH:
          response = await this.sendWebPush(notification);
          break;

        case NotificationChannel.FCM:
          response = await this.sendFcm(notification);
          break;

        case NotificationChannel.IN_APP:
          // In-app уведомления не требуют отправки, сразу доставлены
          response = 'In-app notification created';
          break;

        default:
          throw new Error(`Unsupported channel: ${notification.channel}`);
      }

      // If we reached here without throwing, the send was successful
      notification.status = NotificationStatus.SENT;
      notification.sent_at = new Date();
      notification.delivered_at = new Date(); // Считаем доставленным сразу
      notification.delivery_response = response;
    } catch (error) {
      notification.status = NotificationStatus.FAILED;
      notification.error_message = error.message;
      notification.retry_count += 1;

      // Планируем повторную попытку (экспоненциальная задержка)
      if (notification.retry_count < 3) {
        const delayMinutes = Math.pow(2, notification.retry_count) * 5; // 5, 10, 20 минут
        notification.next_retry_at = new Date(Date.now() + delayMinutes * 60 * 1000);
      }
    }

    return this.notificationRepository.save(notification);
  }

  /**
   * Повторная отправка неудавшихся уведомлений
   */
  async retryFailedNotifications(): Promise<void> {
    const failedNotifications = await this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.status = :status', {
        status: NotificationStatus.FAILED,
      })
      .andWhere('notification.retry_count < 3')
      .andWhere('notification.next_retry_at <= :now', { now: new Date() })
      .getMany();

    for (const notification of failedNotifications) {
      await this.sendNotification(notification.id);
    }
  }

  // ============================================================================
  // CHANNEL-SPECIFIC SENDING
  // ============================================================================

  /**
   * Отправка через Telegram
   */
  private async sendTelegram(notification: Notification): Promise<string> {
    if (!notification.recipient || !notification.recipient.telegram_user_id) {
      throw new Error('Recipient Telegram ID not found');
    }

    const telegramUserId = parseInt(notification.recipient.telegram_user_id, 10);

    // Определяем тип уведомления и используем соответствующий метод
    let success = false;

    switch (notification.type) {
      case NotificationType.TASK_ASSIGNED:
        if (notification.data?.task) {
          success = await this.telegramNotificationsService.notifyTaskAssignedWithTask(
            notification.data.task,
            telegramUserId,
          );
        }
        break;

      case NotificationType.TASK_OVERDUE:
        if (notification.data?.task && notification.data?.overdue_hours) {
          success = await this.telegramNotificationsService.notifyTaskOverdue(
            notification.data.task,
            telegramUserId,
            notification.data.overdue_hours,
          );
        }
        break;

      default: {
        // Для остальных типов отправляем простое сообщение
        const message = `**${notification.title}**\n\n${notification.message}`;
        success = await this.telegramNotificationsService.sendDirectNotification(
          telegramUserId,
          message,
        );
      }
    }

    if (!success) {
      throw new Error('Failed to send Telegram notification');
    }

    return `Telegram message sent to ${telegramUserId}`;
  }

  /**
   * Отправка через Email
   */
  private async sendEmail(notification: Notification): Promise<string> {
    if (!notification.recipient || !notification.recipient.email) {
      throw new Error('Recipient email not found');
    }

    const email = notification.recipient.email;

    // Определяем тип уведомления и отправляем соответствующий шаблон
    let success = false;

    switch (notification.type) {
      case NotificationType.TASK_ASSIGNED:
        if (notification.data?.machine_number && notification.data?.due_date) {
          success = await this.emailService.sendTaskNotification(
            email,
            notification.data.task_type || 'Задача',
            notification.data.machine_number,
            new Date(notification.data.due_date),
          );
        }
        break;

      case NotificationType.TASK_OVERDUE:
        if (notification.data?.machine_number && notification.data?.overdue_hours) {
          success = await this.emailService.sendOverdueNotification(
            email,
            notification.data.task_type || 'Задача',
            notification.data.machine_number,
            notification.data.overdue_hours,
          );
        }
        break;

      case NotificationType.LOW_STOCK_MACHINE:
        if (notification.data?.machine_number && notification.data?.items) {
          success = await this.emailService.sendLowStockAlert(
            email,
            notification.data.machine_number,
            notification.data.items,
          );
        }
        break;

      default:
        // Для остальных типов отправляем простое письмо
        success = await this.emailService.sendEmail({
          to: email,
          subject: notification.title,
          text: notification.message,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>${notification.title}</h2>
              <p>${notification.message}</p>
              ${notification.action_url ? `<a href="${notification.action_url}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Перейти</a>` : ''}
            </div>
          `,
        });
    }

    if (!success) {
      throw new Error('Failed to send email');
    }

    return `Email sent to ${email}`;
  }

  /**
   * Отправка через SMS
   * Sends SMS notification to user's phone number via Twilio
   */
  private async sendSMS(notification: Notification): Promise<string> {
    if (!notification.recipient || !notification.recipient.phone) {
      throw new Error('Recipient phone number not found');
    }

    // Format phone number to E.164 format
    const formattedPhone = SmsService.formatPhoneNumber(notification.recipient.phone);
    if (!formattedPhone) {
      throw new Error(`Invalid phone number format: ${notification.recipient.phone}`);
    }

    // Check if SMS service is configured
    if (!this.smsService.isReady()) {
      this.logger.warn(
        `[SMS] Service not configured, skipping SMS to ${notification.recipient_id}`,
      );
      throw new Error('SMS service not configured');
    }

    // Send SMS based on notification type
    let success = false;

    switch (notification.type) {
      case NotificationType.TASK_ASSIGNED:
        if (notification.data?.machine_number && notification.data?.due_date) {
          success = await this.smsService.sendTaskNotification(
            formattedPhone,
            notification.data.task_type || 'Task',
            notification.data.machine_number,
            new Date(notification.data.due_date),
          );
        } else {
          success = await this.smsService.sendSimple(formattedPhone, notification.message);
        }
        break;

      case NotificationType.SYSTEM_ALERT:
      case NotificationType.MACHINE_ERROR:
        success = await this.smsService.sendUrgentAlert(formattedPhone, notification.message);
        break;

      default:
        success = await this.smsService.sendSimple(formattedPhone, notification.message);
    }

    if (!success) {
      throw new Error('Failed to send SMS');
    }

    this.logger.debug(`[SMS] Sent to ${formattedPhone} for user ${notification.recipient_id}`);

    return `SMS sent to ${formattedPhone}`;
  }

  /**
   * Отправка через Web Push
   * Sends browser push notifications to user's subscribed devices
   */
  private async sendWebPush(notification: Notification): Promise<string> {
    const sentCount = await this.webPushService.sendToUser(notification.recipient_id, {
      user_id: notification.recipient_id,
      title: notification.title,
      body: notification.message,
      url: notification.action_url ?? undefined,
      data: notification.data ?? undefined,
    });

    if (sentCount === 0) {
      throw new Error('No active push subscriptions for user');
    }

    this.logger.debug(
      `[WEB_PUSH] Sent to user ${notification.recipient_id}: ${sentCount} device(s)`,
    );

    return `Web push sent to ${sentCount} device(s)`;
  }

  /**
   * Отправка через FCM (Firebase Cloud Messaging)
   * Sends mobile push notifications to user's registered devices
   */
  private async sendFcm(notification: Notification): Promise<string> {
    if (!this.fcmService.isConfigured()) {
      this.logger.warn(
        `[FCM] Service not configured, skipping FCM to ${notification.recipient_id}`,
      );
      throw new Error('FCM service not configured');
    }

    const sentCount = await this.fcmService.sendToUser({
      user_id: notification.recipient_id,
      title: notification.title,
      body: notification.message,
      url: notification.action_url ?? undefined,
      data: notification.data
        ? Object.fromEntries(
            Object.entries(notification.data).map(([k, v]) => [k, String(v)]),
          )
        : undefined,
    });

    if (sentCount === 0) {
      throw new Error('No active FCM tokens for user');
    }

    this.logger.debug(
      `[FCM] Sent to user ${notification.recipient_id}: ${sentCount} device(s)`,
    );

    return `FCM sent to ${sentCount} device(s)`;
  }

  // ============================================================================
  // PREFERENCES
  // ============================================================================

  /**
   * Получение настроек пользователя
   */
  async getUserPreferences(userId: string): Promise<NotificationPreference[]> {
    return this.preferenceRepository.find({
      where: { user_id: userId },
    });
  }

  /**
   * Получение конкретной настройки
   */
  async getUserPreference(
    userId: string,
    notificationType: NotificationType,
    channel: NotificationChannel,
  ): Promise<NotificationPreference | null> {
    return this.preferenceRepository.findOne({
      where: {
        user_id: userId,
        notification_type: notificationType,
        channel: channel,
      },
    });
  }

  /**
   * Создание настройки уведомления
   */
  async createPreference(
    userId: string,
    dto: CreateNotificationPreferenceDto,
  ): Promise<NotificationPreference> {
    const preference = this.preferenceRepository.create({
      user_id: userId,
      ...dto,
    });

    return this.preferenceRepository.save(preference);
  }

  /**
   * Обновление настройки уведомления
   */
  async updatePreference(
    userId: string,
    notificationType: NotificationType,
    channel: NotificationChannel,
    dto: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreference> {
    let preference = await this.getUserPreference(userId, notificationType, channel);

    if (!preference) {
      // Создаем если не существует
      preference = this.preferenceRepository.create({
        user_id: userId,
        notification_type: notificationType,
        channel: channel,
        ...dto,
      });
    } else {
      Object.assign(preference, dto);
    }

    return this.preferenceRepository.save(preference);
  }

  /**
   * Удаление настройки
   */
  async removePreference(
    userId: string,
    notificationType: NotificationType,
    channel: NotificationChannel,
  ): Promise<void> {
    const preference = await this.getUserPreference(userId, notificationType, channel);

    if (preference) {
      await this.preferenceRepository.softRemove(preference);
    }
  }

  // ============================================================================
  // СТАТИСТИКА
  // ============================================================================

  /**
   * Статистика уведомлений
   */
  async getStats(userId?: string) {
    const query = this.notificationRepository.createQueryBuilder('notification');

    if (userId) {
      query.where('notification.recipient_id = :userId', { userId });
    }

    const total = await query.getCount();

    const byStatus = await this.notificationRepository
      .createQueryBuilder('notification')
      .select('notification.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('notification.status')
      .getRawMany();

    const byChannel = await this.notificationRepository
      .createQueryBuilder('notification')
      .select('notification.channel', 'channel')
      .addSelect('COUNT(*)', 'count')
      .groupBy('notification.channel')
      .getRawMany();

    const byType = await this.notificationRepository
      .createQueryBuilder('notification')
      .select('notification.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('notification.type')
      .getRawMany();

    return {
      total,
      by_status: byStatus.map((item) => ({
        status: item.status,
        count: parseInt(item.count),
      })),
      by_channel: byChannel.map((item) => ({
        channel: item.channel,
        count: parseInt(item.count),
      })),
      by_type: byType.map((item) => ({
        type: item.type,
        count: parseInt(item.count),
      })),
    };
  }
}
