import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FcmToken } from './entities/fcm-token.entity';
import { RegisterFcmTokenDto, SendFcmNotificationDto } from './dto/register-token.dto';

// Dynamic import for firebase-admin (optional dependency)
 
let firebaseAdmin: any = null;

/**
 * Firebase Cloud Messaging Service
 * Handles mobile push notifications via FCM
 *
 * Note: Requires firebase-admin package and GOOGLE_APPLICATION_CREDENTIALS env variable
 * If not configured, methods will gracefully skip sending notifications
 */
@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private isInitialized = false;
   
  private messaging: any = null;

  constructor(
    @InjectRepository(FcmToken)
    private readonly tokenRepository: Repository<FcmToken>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.initializeFirebase();
  }

  /**
   * Initialize Firebase Admin SDK
   */
  private async initializeFirebase() {
    const credentials = this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS');
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');

    if (!credentials && !projectId) {
      this.logger.warn(
        'FCM not configured. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_PROJECT_ID to enable mobile push notifications.',
      );
      return;
    }

    try {
      // Dynamic import of firebase-admin (using require to avoid TypeScript module resolution)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      firebaseAdmin = require('firebase-admin');

      // Initialize Firebase if not already initialized
      if (firebaseAdmin.apps.length === 0) {
        if (credentials) {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const serviceAccount = require(credentials);
          firebaseAdmin.initializeApp({
            credential: firebaseAdmin.credential.cert(serviceAccount),
          });
        } else if (projectId) {
          firebaseAdmin.initializeApp({
            projectId,
          });
        }
      }

      this.messaging = firebaseAdmin.messaging();
      this.isInitialized = true;
      this.logger.log('Firebase Admin SDK initialized successfully');
    } catch (error) {
      this.logger.warn(`Failed to initialize Firebase: ${error.message}`);
      this.logger.warn(
        'FCM notifications disabled. Install firebase-admin package if needed: npm install firebase-admin',
      );
    }
  }

  /**
   * Check if FCM is configured and ready
   */
  isConfigured(): boolean {
    return this.isInitialized && this.messaging !== null;
  }

  /**
   * Register a device token for a user
   */
  async registerToken(userId: string, dto: RegisterFcmTokenDto): Promise<FcmToken> {
    // Check if token already exists
    let fcmToken = await this.tokenRepository.findOne({
      where: { token: dto.token },
    });

    if (fcmToken) {
      // Update existing token
      fcmToken.user_id = userId;
      fcmToken.device_type = dto.device_type || fcmToken.device_type;
      fcmToken.device_name = dto.device_name || fcmToken.device_name;
      fcmToken.is_active = true;
    } else {
      // Create new token
      fcmToken = this.tokenRepository.create({
        user_id: userId,
        token: dto.token,
        device_type: dto.device_type,
        device_name: dto.device_name,
        is_active: true,
      });
    }

    const saved = await this.tokenRepository.save(fcmToken);
    this.logger.log(`FCM token registered for user ${userId}`);
    return saved;
  }

  /**
   * Unregister a device token
   */
  async unregisterToken(userId: string, token: string): Promise<void> {
    const fcmToken = await this.tokenRepository.findOne({
      where: { user_id: userId, token },
    });

    if (fcmToken) {
      await this.tokenRepository.softRemove(fcmToken);
      this.logger.log(`FCM token unregistered for user ${userId}`);
    }
  }

  /**
   * Send notification to a specific user
   */
  async sendToUser(dto: SendFcmNotificationDto): Promise<number> {
    if (!this.isConfigured()) {
      this.logger.warn('FCM not configured, skipping notification');
      return 0;
    }

    const tokens = await this.tokenRepository.find({
      where: { user_id: dto.user_id, is_active: true },
    });

    if (tokens.length === 0) {
      this.logger.warn(`No active FCM tokens for user ${dto.user_id}`);
      return 0;
    }

    let sentCount = 0;

    for (const fcmToken of tokens) {
      try {
        await this.messaging!.send({
          token: fcmToken.token,
          notification: {
            title: dto.title,
            body: dto.body,
          },
          data: {
            ...dto.data,
            url: dto.url || '',
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
          },
          android: {
            priority: 'high',
            notification: {
              channelId: 'default',
              sound: 'default',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              },
            },
          },
        });

        // Update last used timestamp
        fcmToken.last_used_at = new Date();
        await this.tokenRepository.save(fcmToken);

        sentCount++;
      } catch (error) {
        this.logger.error(`Failed to send FCM notification: ${error.message}`);

        // Deactivate invalid tokens
        if (
          error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered'
        ) {
          fcmToken.is_active = false;
          await this.tokenRepository.save(fcmToken);
          this.logger.warn(`Deactivated invalid FCM token for user ${dto.user_id}`);
        }
      }
    }

    return sentCount;
  }

  /**
   * Send notification to multiple users
   */
  async sendToMultipleUsers(
    userIds: string[],
    title: string,
    body: string,
    url?: string,
    data?: Record<string, string>,
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        const count = await this.sendToUser({ user_id: userId, title, body, url, data });
        sent += count;
      } catch (error) {
        this.logger.error(`Failed to send FCM to user ${userId}: ${error.message}`);
        failed++;
      }
    }

    return { sent, failed };
  }

  /**
   * Subscribe user tokens to a topic
   */
  async subscribeToTopic(userId: string, topic: string): Promise<void> {
    if (!this.isConfigured()) {
      return;
    }

    const tokens = await this.tokenRepository.find({
      where: { user_id: userId, is_active: true },
    });

    if (tokens.length === 0) {
      return;
    }

    const tokenStrings = tokens.map((t) => t.token);

    try {
      await this.messaging!.subscribeToTopic(tokenStrings, topic);
      this.logger.log(`User ${userId} subscribed to topic ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to subscribe to topic: ${error.message}`);
    }
  }

  /**
   * Unsubscribe user tokens from a topic
   */
  async unsubscribeFromTopic(userId: string, topic: string): Promise<void> {
    if (!this.isConfigured()) {
      return;
    }

    const tokens = await this.tokenRepository.find({
      where: { user_id: userId, is_active: true },
    });

    if (tokens.length === 0) {
      return;
    }

    const tokenStrings = tokens.map((t) => t.token);

    try {
      await this.messaging!.unsubscribeFromTopic(tokenStrings, topic);
      this.logger.log(`User ${userId} unsubscribed from topic ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from topic: ${error.message}`);
    }
  }

  /**
   * Send notification to a topic
   */
  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      await this.messaging!.send({
        topic,
        notification: {
          title,
          body,
        },
        data,
      });

      this.logger.log(`Sent notification to topic ${topic}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send to topic ${topic}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get user's active tokens
   */
  async getUserTokens(userId: string): Promise<FcmToken[]> {
    return this.tokenRepository.find({
      where: { user_id: userId, is_active: true },
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Clean up inactive tokens older than 30 days
   */
  async cleanupInactiveTokens(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.tokenRepository
      .createQueryBuilder()
      .softDelete()
      .where('is_active = false')
      .andWhere('updated_at < :date', { date: thirtyDaysAgo })
      .execute();

    return result.affected || 0;
  }
}
