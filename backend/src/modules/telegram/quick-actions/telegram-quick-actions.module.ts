import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TelegramQuickActionsService } from './services/telegram-quick-actions.service';
import { TelegramBotAnalytics } from '../shared/entities/telegram-bot-analytics.entity';

import { TelegramI18nModule } from '../i18n/telegram-i18n.module';

/**
 * Telegram Quick Actions Module
 *
 * Provides one-tap shortcuts for common operator workflows:
 * - Emergency actions (report incident, request repair)
 * - Common tasks (start refill, start collection, complete task)
 * - Information (today's progress, route map, task list)
 * - Context-aware keyboards based on user state
 * - Persistent menu for quick access
 *
 * @module TelegramQuickActionsModule
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TelegramBotAnalytics]),
    TelegramI18nModule,
  ],
  providers: [TelegramQuickActionsService],
  exports: [TelegramQuickActionsService],
})
export class TelegramQuickActionsModule {}
