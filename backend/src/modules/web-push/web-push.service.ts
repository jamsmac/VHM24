import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as webpush from 'web-push';
import { PushSubscription } from './entities/push-subscription.entity';
import { SubscribePushDto, SendPushNotificationDto } from './dto/push-subscription.dto';

/**
 * Web Push Notifications Service
 * Manages browser push notifications using Web Push API
 */
@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private isConfigured = false;

  constructor(
    @InjectRepository(PushSubscription)
    private readonly subscriptionRepository: Repository<PushSubscription>,
    private readonly configService: ConfigService,
  ) {
    this.initializeWebPush();
  }

  /**
   * Initialize Web Push with VAPID keys
   */
  private initializeWebPush() {
    const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const email = this.configService.get<string>('VAPID_EMAIL');

    if (!publicKey || !privateKey || !email) {
      this.logger.warn(
        'Web Push not configured. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_EMAIL in .env',
      );
      return;
    }

    webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);
    this.isConfigured = true;
    this.logger.log('Web Push configured successfully');
  }

  /**
   * Get VAPID public key for client-side subscription
   */
  getPublicKey(): string {
    return this.configService.get<string>('VAPID_PUBLIC_KEY', '');
  }

  /**
   * Subscribe user to push notifications
   */
  async subscribe(userId: string, dto: SubscribePushDto): Promise<PushSubscription> {
    // Check if subscription already exists
    let subscription = await this.subscriptionRepository.findOne({
      where: { endpoint: dto.endpoint },
    });

    if (subscription) {
      // Update existing subscription
      subscription.user_id = userId;
      subscription.p256dh = dto.keys.p256dh;
      subscription.auth = dto.keys.auth;
      subscription.user_agent = dto.user_agent || null;
      subscription.is_active = true;
    } else {
      // Create new subscription
      subscription = this.subscriptionRepository.create({
        user_id: userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        user_agent: dto.user_agent,
        is_active: true,
      });
    }

    const saved = await this.subscriptionRepository.save(subscription);
    this.logger.log(`User ${userId} subscribed to push notifications`);
    return saved;
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { user_id: userId, endpoint },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    await this.subscriptionRepository.softRemove(subscription);
    this.logger.log(`User ${userId} unsubscribed from push notifications`);
  }

  /**
   * Send push notification to specific user
   */
  async sendToUser(userId: string, dto: SendPushNotificationDto): Promise<number> {
    if (!this.isConfigured) {
      this.logger.warn('Web Push not configured, cannot send notification');
      return 0;
    }

    const subscriptions = await this.subscriptionRepository.find({
      where: { user_id: userId, is_active: true },
    });

    if (subscriptions.length === 0) {
      this.logger.warn(`No active subscriptions for user ${userId}`);
      return 0;
    }

    const payload = JSON.stringify({
      title: dto.title,
      body: dto.body,
      icon: dto.icon || '/icon-192x192.png',
      badge: '/badge-72x72.png',
      url: dto.url || '/',
      data: dto.data || {},
      timestamp: Date.now(),
    });

    let sentCount = 0;

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload,
        );

        // Update last sent timestamp
        subscription.last_sent_at = new Date();
        await this.subscriptionRepository.save(subscription);

        sentCount++;
      } catch (error) {
        this.logger.error(`Failed to send push notification: ${error.message}`);

        // Deactivate subscription if it's invalid (410 Gone or 404 Not Found)
        if (error.statusCode === 410 || error.statusCode === 404 || error.statusCode === 403) {
          subscription.is_active = false;
          await this.subscriptionRepository.save(subscription);
          this.logger.warn(`Deactivated invalid subscription for user ${userId}`);
        }
      }
    }

    return sentCount;
  }

  /**
   * Send push notification to multiple users
   */
  async sendToMultipleUsers(
    userIds: string[],
    title: string,
    body: string,
    url?: string,
    data?: Record<string, any>,
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        const count = await this.sendToUser(userId, {
          user_id: userId,
          title,
          body,
          url,
          data,
        });
        sent += count;
      } catch (error) {
        this.logger.error(`Failed to send to user ${userId}: ${error.message}`);
        failed++;
      }
    }

    return { sent, failed };
  }

  /**
   * Get user's active subscriptions
   */
  async getUserSubscriptions(userId: string): Promise<PushSubscription[]> {
    return this.subscriptionRepository.find({
      where: { user_id: userId, is_active: true },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Test push notification
   */
  async sendTestNotification(userId: string): Promise<number> {
    return this.sendToUser(userId, {
      user_id: userId,
      title: '🔔 Тестовое уведомление',
      body: 'Уведомления настроены и работают правильно!',
      icon: '/icon-192x192.png',
      url: '/dashboard',
      data: { test: true },
    });
  }

  /**
   * Clean up inactive subscriptions
   */
  async cleanupInactiveSubscriptions(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.subscriptionRepository
      .createQueryBuilder()
      .softDelete()
      .where('is_active = false')
      .andWhere('updated_at < :date', { date: thirtyDaysAgo })
      .execute();

    return result.affected || 0;
  }

  /**
   * Generate VAPID keys (utility for initial setup)
   */
  static generateVapidKeys(): {
    publicKey: string;
    privateKey: string;
  } {
    return webpush.generateVAPIDKeys();
  }
}
