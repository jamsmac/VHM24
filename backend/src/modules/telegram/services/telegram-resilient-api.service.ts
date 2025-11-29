import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, JobOptions } from 'bull';
import { TelegramMessageJob } from '../processors/telegram-queue.processor';
import { TelegramMessageType } from '../entities/telegram-message-log.entity';

/**
 * Telegram message options for sendText, sendPhoto, etc.
 * Compatible with Telegraf's ExtraReplyMessage
 */
export interface TelegramSendOptions {
  reply_markup?: unknown;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disable_web_page_preview?: boolean;
  disable_notification?: boolean;
  caption?: string;
  duration?: number;
  performer?: string;
  title?: string;
}

/**
 * Options for resilient message sending
 */
export interface ResilientSendOptions {
  /**
   * Priority: higher number = higher priority
   * Default: 0
   */
  priority?: number;

  /**
   * Number of retry attempts
   * Default: 5 (critical for unreliable networks)
   */
  attempts?: number;

  /**
   * Backoff delay between retries (milliseconds)
   * Default: Exponential backoff starting at 2000ms
   */
  backoff?: number | { type: 'exponential' | 'fixed'; delay: number };

  /**
   * Timeout for the entire job (milliseconds)
   * Default: 60000 (1 minute)
   */
  timeout?: number;

  /**
   * Remove job on completion
   * Default: true (to save memory)
   */
  removeOnComplete?: boolean;

  /**
   * Remove job on failure
   * Default: false (keep for debugging)
   */
  removeOnFail?: boolean;

  /**
   * Metadata for logging
   */
  metadata?: {
    userId?: string;
    messageType?: TelegramMessageType;
    relatedEntityType?: string;
    relatedEntityId?: string;
  };
}

/**
 * Resilient Telegram API Service
 *
 * Provides network-resilient message sending for Telegram bot using Bull queue.
 * All messages are queued and automatically retried on network failures.
 *
 * **Why this is critical for Uzbekistan:**
 * - Unreliable mobile networks in remote locations
 * - Frequent network interruptions during operator routes
 * - Prevents message loss during connectivity issues
 * - Automatic retry with exponential backoff
 *
 * **Usage:**
 * ```typescript
 * // Instead of: ctx.reply('Hello')
 * // Use: this.resilientApi.sendText(chatId, 'Hello')
 * ```
 */
@Injectable()
export class TelegramResilientApiService {
  private readonly logger = new Logger(TelegramResilientApiService.name);

  // Default job options optimized for unreliable networks
  private readonly defaultJobOptions: JobOptions = {
    attempts: 5, // Try 5 times before giving up
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2s, then 4s, 8s, 16s, 32s
    },
    timeout: 60000, // 1 minute timeout per attempt
    removeOnComplete: true, // Save memory
    removeOnFail: false, // Keep failed jobs for debugging
  };

  constructor(
    @InjectQueue('telegram-messages')
    private readonly messageQueue: Queue<TelegramMessageJob>,
  ) {
    this.logger.log('Telegram Resilient API Service initialized');
  }

  /**
   * Send text message with automatic retry
   *
   * @param chatId - Telegram chat ID
   * @param text - Message text (supports Markdown/HTML based on parse_mode)
   * @param options - Telegram message options (reply_markup, parse_mode, etc.)
   * @param resilientOptions - Queue options for retry behavior
   * @returns Job ID for tracking
   */
  async sendText(
    chatId: string | number,
    text: string,
    options?: TelegramSendOptions,
    resilientOptions?: ResilientSendOptions,
  ): Promise<string> {
    const jobOptions = this.mergeOptions(resilientOptions);

    const job = await this.messageQueue.add(
      'send-message',
      {
        type: 'text',
        chatId,
        content: text,
        options,
        metadata: resilientOptions?.metadata,
      } as TelegramMessageJob,
      jobOptions,
    );

    this.logger.debug(
      `📤 Queued text message: job=${job.id}, chatId=${chatId}, length=${text.length}`,
    );

    return job.id.toString();
  }

  /**
   * Send photo with automatic retry
   */
  async sendPhoto(
    chatId: string | number,
    photo: string | Buffer,
    options?: TelegramSendOptions,
    resilientOptions?: ResilientSendOptions,
  ): Promise<string> {
    const jobOptions = this.mergeOptions(resilientOptions);

    const job = await this.messageQueue.add(
      'send-message',
      {
        type: 'photo',
        chatId,
        content: photo,
        options,
        metadata: resilientOptions?.metadata,
      } as TelegramMessageJob,
      jobOptions,
    );

    this.logger.debug(`📤 Queued photo message: job=${job.id}, chatId=${chatId}`);

    return job.id.toString();
  }

  /**
   * Send document with automatic retry
   */
  async sendDocument(
    chatId: string | number,
    document: string | Buffer,
    options?: TelegramSendOptions,
    resilientOptions?: ResilientSendOptions,
  ): Promise<string> {
    const jobOptions = this.mergeOptions(resilientOptions);

    const job = await this.messageQueue.add(
      'send-message',
      {
        type: 'document',
        chatId,
        content: document,
        options,
        metadata: resilientOptions?.metadata,
      } as TelegramMessageJob,
      jobOptions,
    );

    this.logger.debug(`📤 Queued document message: job=${job.id}, chatId=${chatId}`);

    return job.id.toString();
  }

  /**
   * Send voice message with automatic retry
   */
  async sendVoice(
    chatId: string | number,
    voice: string | Buffer,
    options?: TelegramSendOptions,
    resilientOptions?: ResilientSendOptions,
  ): Promise<string> {
    const jobOptions = this.mergeOptions(resilientOptions);

    const job = await this.messageQueue.add(
      'send-message',
      {
        type: 'voice',
        chatId,
        content: voice,
        options,
        metadata: resilientOptions?.metadata,
      } as TelegramMessageJob,
      jobOptions,
    );

    this.logger.debug(`📤 Queued voice message: job=${job.id}, chatId=${chatId}`);

    return job.id.toString();
  }

  /**
   * Send location with automatic retry
   */
  async sendLocation(
    chatId: string | number,
    latitude: number,
    longitude: number,
    options?: TelegramSendOptions,
    resilientOptions?: ResilientSendOptions,
  ): Promise<string> {
    const jobOptions = this.mergeOptions(resilientOptions);

    const job = await this.messageQueue.add(
      'send-message',
      {
        type: 'location',
        chatId,
        content: { latitude, longitude },
        options,
        metadata: resilientOptions?.metadata,
      } as TelegramMessageJob,
      jobOptions,
    );

    this.logger.debug(`📤 Queued location message: job=${job.id}, chatId=${chatId}`);

    return job.id.toString();
  }

  /**
   * Check job status
   *
   * @param jobId - Job ID returned from send methods
   * @returns Job state and progress
   */
  async getJobStatus(jobId: string): Promise<{
    state: string;
    progress: number;
    attemptsMade: number;
    failedReason?: string;
  }> {
    const job = await this.messageQueue.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const state = await job.getState();
    const progress = job.progress();
    const attemptsMade = job.attemptsMade;
    const failedReason = job.failedReason;

    return {
      state,
      progress,
      attemptsMade,
      failedReason,
    };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const counts = await this.messageQueue.getJobCounts();

    return {
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
    };
  }

  /**
   * Clear failed jobs (admin function)
   */
  async clearFailedJobs(): Promise<number> {
    const failedJobs = await this.messageQueue.getFailed();
    let count = 0;

    for (const job of failedJobs) {
      await job.remove();
      count++;
    }

    this.logger.log(`Cleared ${count} failed jobs from queue`);
    return count;
  }

  /**
   * Retry failed job manually
   */
  async retryFailedJob(jobId: string): Promise<void> {
    const job = await this.messageQueue.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    await job.retry();
    this.logger.log(`Retrying job ${jobId} manually`);
  }

  /**
   * Merge user options with defaults
   */
  private mergeOptions(userOptions?: ResilientSendOptions): JobOptions {
    if (!userOptions) {
      return this.defaultJobOptions;
    }

    return {
      ...this.defaultJobOptions,
      priority: userOptions.priority,
      attempts: userOptions.attempts ?? this.defaultJobOptions.attempts,
      backoff: userOptions.backoff ?? this.defaultJobOptions.backoff,
      timeout: userOptions.timeout ?? this.defaultJobOptions.timeout,
      removeOnComplete: userOptions.removeOnComplete ?? this.defaultJobOptions.removeOnComplete,
      removeOnFail: userOptions.removeOnFail ?? this.defaultJobOptions.removeOnFail,
    };
  }
}
