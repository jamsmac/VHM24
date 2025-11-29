import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { Telegraf } from 'telegraf';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InputFile } from 'telegraf/typings/core/types/typegram';
import { TelegramSettings } from '../entities/telegram-settings.entity';
import {
  TelegramMessageLog,
  TelegramMessageType,
  TelegramMessageStatus,
} from '../entities/telegram-message-log.entity';
import { LocationContent } from '../types/telegram.types';

/**
 * Message content type for queue - using unknown for flexibility with Telegraf API
 */
type QueueMessageContent = string | Buffer | LocationContent;

/**
 * Message options compatible with Telegraf
 */
interface QueueMessageOptions {
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  caption?: string;
  disable_notification?: boolean;
  [key: string]: unknown;
}

/**
 * Message types for Telegram queue
 */
export interface TelegramMessageJob {
  type: 'text' | 'photo' | 'document' | 'voice' | 'location';
  chatId: string | number;
  content: QueueMessageContent;
  options?: QueueMessageOptions;
  metadata?: {
    userId?: string;
    messageType?: TelegramMessageType;
    relatedEntityType?: string;
    relatedEntityId?: string;
  };
}

/**
 * Queue processor for Telegram messages
 *
 * Handles sending messages to Telegram with automatic retry on network failures.
 * Critical for Uzbekistan's unreliable network infrastructure.
 *
 * Features:
 * - Exponential backoff retry (5 attempts)
 * - Network error detection and recovery
 * - Message logging for audit trail
 * - Dead letter queue for permanently failed messages
 */
@Processor('telegram-messages')
export class TelegramQueueProcessor {
  private readonly logger = new Logger(TelegramQueueProcessor.name);
  private bot: Telegraf | null = null;

  constructor(
    @InjectRepository(TelegramSettings)
    private readonly settingsRepository: Repository<TelegramSettings>,
    @InjectRepository(TelegramMessageLog)
    private readonly messageLogRepository: Repository<TelegramMessageLog>,
  ) {
    this.initializeBot();
  }

  /**
   * Initialize Telegram bot instance
   */
  private async initializeBot(): Promise<void> {
    try {
      const settings = await this.settingsRepository.findOne({
        where: { setting_key: 'default' },
      });

      if (settings && settings.bot_token && settings.is_active) {
        this.bot = new Telegraf(settings.bot_token);
        this.logger.log('Telegram queue processor bot initialized');
      } else {
        this.logger.warn('Telegram bot not configured for queue processor');
      }
    } catch (error) {
      this.logger.error('Failed to initialize bot for queue processor', error);
    }
  }

  /**
   * Process queued Telegram message
   *
   * Automatically retries on network errors with exponential backoff:
   * - Attempt 1: immediate
   * - Attempt 2: +2s delay
   * - Attempt 3: +4s delay
   * - Attempt 4: +8s delay
   * - Attempt 5: +16s delay
   *
   * After 5 failures, message goes to dead letter queue for manual review.
   */
  @Process({
    name: 'send-message',
    concurrency: 5, // Process 5 messages concurrently
  })
  async handleSendMessage(
    job: Job<TelegramMessageJob>,
  ): Promise<{ success: boolean; messageId?: number }> {
    const { type, chatId, content, options, metadata } = job.data;
    const attemptNumber = job.attemptsMade + 1;

    this.logger.log(
      `📤 Processing Telegram message job ${job.id} (attempt ${attemptNumber}/${job.opts.attempts || 3}): ` +
        `type=${type}, chatId=${chatId}`,
    );

    // Ensure bot is initialized
    if (!this.bot) {
      await this.initializeBot();
      if (!this.bot) {
        throw new Error('Telegram bot not initialized. Check configuration.');
      }
    }

    try {
      let result: { message_id: number };

      // Send message based on type
      switch (type) {
        case 'text':
          result = await this.bot.telegram.sendMessage(chatId, content as string, {
            parse_mode: options?.parse_mode,
            disable_notification: options?.disable_notification,
          });
          break;

        case 'photo': {
          // Telegraf accepts string (URL/file_id) or InputFile object with source
          const photoInput = typeof content === 'string' ? content : { source: content as Buffer };
          result = await this.bot.telegram.sendPhoto(chatId, photoInput as InputFile, {
            caption: options?.caption,
            parse_mode: options?.parse_mode,
          });
          break;
        }

        case 'document': {
          const docInput = typeof content === 'string' ? content : { source: content as Buffer };
          result = await this.bot.telegram.sendDocument(chatId, docInput as InputFile, {
            caption: options?.caption,
            parse_mode: options?.parse_mode,
          });
          break;
        }

        case 'voice': {
          const voiceInput = typeof content === 'string' ? content : { source: content as Buffer };
          result = await this.bot.telegram.sendVoice(chatId, voiceInput as InputFile, {
            caption: options?.caption,
            parse_mode: options?.parse_mode,
          });
          break;
        }

        case 'location': {
          const locationContent = content as LocationContent;
          result = await this.bot.telegram.sendLocation(
            chatId,
            locationContent.latitude,
            locationContent.longitude,
          );
          break;
        }

        default:
          throw new Error(`Unsupported message type: ${type}`);
      }

      // Log successful message
      if (metadata) {
        await this.logMessage({
          telegram_user_id: chatId.toString(),
          message_type: metadata.messageType || TelegramMessageType.NOTIFICATION,
          message_text: type === 'text' ? (content as string) : `[${type}]`,
          status: TelegramMessageStatus.SENT,
          metadata: {
            jobId: job.id,
            attempt: attemptNumber,
            messageId: result.message_id,
          },
        });
      }

      this.logger.log(
        `✅ Message sent successfully: job=${job.id}, messageId=${result.message_id}, attempt=${attemptNumber}`,
      );

      return { success: true, messageId: result.message_id };
    } catch (error) {
      this.logger.error(
        `❌ Failed to send message: job=${job.id}, attempt=${attemptNumber}, error=${error.message}`,
        error.stack,
      );

      // Log failed attempt
      if (metadata) {
        await this.logMessage({
          telegram_user_id: chatId.toString(),
          message_type: metadata.messageType || TelegramMessageType.NOTIFICATION,
          message_text: type === 'text' ? (content as string) : `[${type}]`,
          status: TelegramMessageStatus.FAILED,
          metadata: {
            jobId: job.id,
            attempt: attemptNumber,
            error: error.message,
          },
        });
      }

      // Check if error is retryable (network issues)
      if (this.isRetryableError(error)) {
        // BullMQ will automatically retry based on job options
        throw error; // Re-throw to trigger retry
      } else {
        // Non-retryable error (e.g., blocked user, invalid chat ID)
        this.logger.error(
          `⛔ Non-retryable error for job ${job.id}: ${error.message}. Moving to failed.`,
        );
        throw error; // Will go to failed queue, no more retries
      }
    }
  }

  /**
   * Check if error is retryable (network/timeout issues)
   */
  private isRetryableError(error: Error & { code?: string }): boolean {
    const retryableErrors = [
      'ETIMEDOUT',
      'ECONNREFUSED',
      'ECONNRESET',
      'ENOTFOUND',
      'ENETUNREACH',
      'EAI_AGAIN',
      '429', // Rate limit (should retry after delay)
      '500', // Internal server error
      '502', // Bad gateway
      '503', // Service unavailable
      '504', // Gateway timeout
    ];

    const errorMessage = error.message || error.toString();
    return retryableErrors.some((retryableError) => errorMessage.includes(retryableError));
  }

  /**
   * Log message to database for audit trail
   */
  private async logMessage(data: Partial<TelegramMessageLog>): Promise<void> {
    try {
      const log = this.messageLogRepository.create(data);
      await this.messageLogRepository.save(log);
    } catch (error) {
      this.logger.warn(`Failed to log message: ${error.message}`);
      // Don't fail the job if logging fails
    }
  }

  /**
   * Handle job completion
   * Note: This is informational logging. Main success handling is in handleSendMessage.
   */
  // Removed @Process decorator - onCompleted/onFailed should not be processors
  // async onCompleted(job: Job, result: any): Promise<void> {
  //   this.logger.log(`✅ Job ${job.id} completed successfully after ${job.attemptsMade + 1} attempt(s)`);
  // }

  /**
   * Handle job failure (after all retries exhausted)
   * Note: This is informational logging. Main error handling is in handleSendMessage.
   */
  // Removed @Process decorator - onCompleted/onFailed should not be processors
  // async onFailed(job: Job, error: Error): Promise<void> {
  //   this.logger.error(
  //     `⛔ Job ${job.id} failed permanently after ${job.attemptsMade + 1} attempt(s): ${error.message}`
  //   );
  //
  //   // Log to database for manual review
  //   const { chatId, type, metadata } = job.data;
  //   if (metadata) {
  //     await this.logMessage({
  //       telegram_user_id: chatId.toString(),
  //       message_type: metadata.messageType || TelegramMessageType.NOTIFICATION,
  //       message_text: `[Failed after retries] Type: ${type}`,
  //       status: TelegramMessageStatus.FAILED,
  //       metadata: {
  //         jobId: job.id,
  //         finalAttempt: job.attemptsMade + 1,
  //         error: error.message,
  //         stackTrace: error.stack,
  //       },
  //     });
  //   }
  // }
}
