import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';

import { TelegramSessionService } from './services/telegram-session.service';
import { TelegramResilientApiService } from './services/telegram-resilient-api.service';
import { TelegramCacheService } from './services/telegram-cache.service';
import { TelegramFormulaService } from './services/telegram-formula.service';
import { TelegramQueueProcessor } from './processors/telegram-queue.processor';

import { TelegramSettings } from '../shared/entities/telegram-settings.entity';
import { TelegramMessageLog } from '../shared/entities/telegram-message-log.entity';

/**
 * Telegram Infrastructure Module
 *
 * Provides core infrastructure services for Telegram bot:
 * - Session management (Redis-backed)
 * - Resilient API service (Bull queue for reliable message delivery)
 * - Cache service (Redis-backed with memory fallback)
 * - Queue processor for message handling
 *
 * @module TelegramInfrastructureModule
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([TelegramSettings, TelegramMessageLog]),
    BullModule.registerQueue({
      name: 'telegram-messages',
    }),
  ],
  providers: [
    TelegramSessionService,
    TelegramResilientApiService,
    TelegramCacheService,
    TelegramFormulaService,
    TelegramQueueProcessor,
  ],
  exports: [
    TelegramSessionService,
    TelegramResilientApiService,
    TelegramCacheService,
    TelegramFormulaService,
    TelegramQueueProcessor,
  ],
})
export class TelegramInfrastructureModule {}
