import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

import { TelegramSessionService } from './services/telegram-session.service';
import { TelegramResilientApiService } from './services/telegram-resilient-api.service';
import { TelegramQueueProcessor } from './processors/telegram-queue.processor';

import { TelegramSettings } from '../shared/entities/telegram-settings.entity';
import { TelegramMessageLog } from '../shared/entities/telegram-message-log.entity';

/**
 * Telegram Infrastructure Module
 *
 * Provides core infrastructure services for Telegram bot:
 * - Session management (Redis-backed)
 * - Resilient API service (Bull queue for reliable message delivery)
 * - Queue processor for message handling
 *
 * @module TelegramInfrastructureModule
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TelegramSettings, TelegramMessageLog]),
    BullModule.registerQueue({
      name: 'telegram-messages',
    }),
  ],
  providers: [TelegramSessionService, TelegramResilientApiService, TelegramQueueProcessor],
  exports: [TelegramSessionService, TelegramResilientApiService, TelegramQueueProcessor],
})
export class TelegramInfrastructureModule {}
