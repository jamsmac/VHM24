import { Injectable, Logger } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

/**
 * Conversation states for step-by-step dialogs
 */
export enum ConversationState {
  IDLE = 'idle',
  AWAITING_PHOTO_BEFORE = 'awaiting_photo_before',
  AWAITING_PHOTO_AFTER = 'awaiting_photo_after',
  AWAITING_TEXT_INPUT = 'awaiting_text_input',
  IN_TASK_EXECUTION = 'in_task_execution',
}

/**
 * User session data stored in Redis
 */
export interface UserSession {
  userId: string;
  chatId: string;
  telegramId: string;

  // Conversation state
  state: ConversationState;

  // Context data
  context: {
    activeTaskId?: string;
    awaitingPhotoType?: 'before' | 'after';
    previousState?: ConversationState;
    conversationStep?: number;
    tempData?: Record<string, any>;
  };

  // Metadata
  createdAt: string;
  lastInteractionAt: string;
  expiresAt: string;
}

@Injectable()
export class TelegramSessionService {
  private readonly logger = new Logger(TelegramSessionService.name);
  private redisClient: RedisClientType;
  private readonly SESSION_TTL = 3600; // 1 hour in seconds
  private readonly SESSION_PREFIX = 'telegram:session:';

  async onModuleInit() {
    try {
      // Initialize Redis client
      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      });

      this.redisClient.on('error', (err) => {
        this.logger.error('Redis Client Error', err);
      });

      this.redisClient.on('connect', () => {
        this.logger.log('Redis Client Connected');
      });

      await this.redisClient.connect();
      this.logger.log('Telegram Session Service initialized with Redis');
    } catch (error) {
      this.logger.error('Failed to connect to Redis', error);
      this.logger.warn('Session management will be disabled');
    }
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }

  /**
   * Get user session from Redis
   */
  async getSession(userId: string): Promise<UserSession | null> {
    if (!this.redisClient || !this.redisClient.isOpen) {
      this.logger.warn('Redis not available, returning null session');
      return null;
    }

    try {
      const key = this.getSessionKey(userId);
      const data = await this.redisClient.get(key);

      if (!data) {
        return null;
      }

      const session: UserSession = JSON.parse(data);

      // Check if session expired
      if (new Date(session.expiresAt) < new Date()) {
        await this.deleteSession(userId);
        return null;
      }

      return session;
    } catch (error) {
      this.logger.error(`Error getting session for user ${userId}`, error);
      return null;
    }
  }

  /**
   * Save or update user session
   */
  async saveSession(userId: string, session: Partial<UserSession>): Promise<void> {
    if (!this.redisClient || !this.redisClient.isOpen) {
      this.logger.warn('Redis not available, session not saved');
      return;
    }

    try {
      const key = this.getSessionKey(userId);

      // Get existing session or create new
      let existingSession = await this.getSession(userId);

      if (!existingSession) {
        existingSession = this.createDefaultSession(userId, session.chatId!, session.telegramId!);
      }

      // Merge with updates
      const updatedSession: UserSession = {
        ...existingSession,
        ...session,
        lastInteractionAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + this.SESSION_TTL * 1000).toISOString(),
      };

      // Save to Redis with TTL
      await this.redisClient.setEx(key, this.SESSION_TTL, JSON.stringify(updatedSession));

      this.logger.debug(`Session saved for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error saving session for user ${userId}`, error);
    }
  }

  /**
   * Update session state
   */
  async updateState(
    userId: string,
    state: ConversationState,
    context?: Partial<UserSession['context']>,
  ): Promise<void> {
    const session = await this.getSession(userId);

    if (!session) {
      this.logger.warn(`Cannot update state for user ${userId}: session not found`);
      return;
    }

    await this.saveSession(userId, {
      state,
      context: {
        ...session.context,
        ...context,
      },
    });
  }

  /**
   * Set active task in session
   */
  async setActiveTask(userId: string, taskId: string): Promise<void> {
    await this.updateState(userId, ConversationState.IN_TASK_EXECUTION, {
      activeTaskId: taskId,
    });
  }

  /**
   * Request photo upload
   */
  async requestPhoto(userId: string, taskId: string, photoType: 'before' | 'after'): Promise<void> {
    const state =
      photoType === 'before'
        ? ConversationState.AWAITING_PHOTO_BEFORE
        : ConversationState.AWAITING_PHOTO_AFTER;

    await this.updateState(userId, state, {
      activeTaskId: taskId,
      awaitingPhotoType: photoType,
    });
  }

  /**
   * Clear active task and reset to idle
   */
  async clearActiveTask(userId: string): Promise<void> {
    await this.updateState(userId, ConversationState.IDLE, {
      activeTaskId: undefined,
      awaitingPhotoType: undefined,
    });
  }

  /**
   * Delete session
   */
  async deleteSession(userId: string): Promise<void> {
    if (!this.redisClient || !this.redisClient.isOpen) {
      return;
    }

    try {
      const key = this.getSessionKey(userId);
      await this.redisClient.del(key);
      this.logger.debug(`Session deleted for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error deleting session for user ${userId}`, error);
    }
  }

  /**
   * Create default session
   */
  private createDefaultSession(userId: string, chatId: string, telegramId: string): UserSession {
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + this.SESSION_TTL * 1000).toISOString();

    return {
      userId,
      chatId,
      telegramId,
      state: ConversationState.IDLE,
      context: {},
      createdAt: now,
      lastInteractionAt: now,
      expiresAt,
    };
  }

  /**
   * Get Redis key for user session
   */
  private getSessionKey(userId: string): string {
    return `${this.SESSION_PREFIX}${userId}`;
  }

  /**
   * Check if session is in specific state
   */
  async isInState(userId: string, state: ConversationState): Promise<boolean> {
    const session = await this.getSession(userId);
    return session?.state === state;
  }

  /**
   * Get active task ID from session
   */
  async getActiveTaskId(userId: string): Promise<string | null> {
    const session = await this.getSession(userId);
    return session?.context?.activeTaskId || null;
  }

  // ========================================
  // FSM Session Data Methods (for catalog/cart handlers)
  // ========================================

  /**
   * Get FSM session data from context.tempData
   */
  async getSessionData(userId: string): Promise<Record<string, any> | null> {
    const session = await this.getSession(userId);
    return session?.context?.tempData || null;
  }

  /**
   * Set FSM session data in context.tempData
   */
  async setSessionData(userId: string, data: Record<string, any>): Promise<void> {
    const session = await this.getSession(userId);

    if (session) {
      await this.saveSession(userId, {
        context: {
          ...session.context,
          tempData: data,
        },
      });
    } else {
      // Create a minimal session with the FSM data
      await this.saveSession(userId, {
        chatId: userId,
        telegramId: userId,
        state: ConversationState.IDLE,
        context: {
          tempData: data,
        },
      });
    }
  }

  /**
   * Clean up expired sessions (can be called by cron job)
   */
  async cleanupExpiredSessions(): Promise<void> {
    if (!this.redisClient || !this.redisClient.isOpen) {
      return;
    }

    try {
      const pattern = `${this.SESSION_PREFIX}*`;
      const keys: string[] = [];

      // Scan for all session keys (scanIterator may return string or string[])
      for await (const scanResult of this.redisClient.scanIterator({ MATCH: pattern, COUNT: 100 })) {
        if (Array.isArray(scanResult)) {
          keys.push(...scanResult);
        } else {
          keys.push(scanResult as string);
        }
      }

      this.logger.log(`Found ${keys.length} session keys to check`);

      let expiredCount = 0;
      for (const key of keys) {
        const data = await this.redisClient.get(key);
        if (data) {
          const session: UserSession = JSON.parse(data);
          if (new Date(session.expiresAt) < new Date()) {
            await this.redisClient.del(key);
            expiredCount++;
          }
        }
      }

      if (expiredCount > 0) {
        this.logger.log(`Cleaned up ${expiredCount} expired sessions`);
      }
    } catch (error) {
      this.logger.error('Error cleaning up expired sessions', error);
    }
  }
}
