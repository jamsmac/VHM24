import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TelegramNotificationsService } from './services/telegram-notifications.service';
import { TelegramNotificationsController } from './controllers/telegram-notifications.controller';

import { TelegramUser } from '../shared/entities/telegram-user.entity';
import { TelegramMessageLog } from '../shared/entities/telegram-message-log.entity';

import { TelegramInfrastructureModule } from '../infrastructure/telegram-infrastructure.module';
import { TelegramUsersModule } from '../users/telegram-users.module';
import { TelegramCoreModule } from '../core/telegram-core.module';

/**
 * Telegram Notifications Module
 *
 * Provides notification sending functionality via Telegram:
 * - Send notifications to specific users
 * - Broadcast messages to multiple users
 * - Log notification delivery status
 * - Support for action buttons in notifications
 * - Notification preferences per user
 *
 * @module TelegramNotificationsModule
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TelegramUser, TelegramMessageLog]),
    TelegramInfrastructureModule,
    TelegramUsersModule,
    forwardRef(() => TelegramCoreModule),
  ],
  controllers: [TelegramNotificationsController],
  providers: [TelegramNotificationsService],
  exports: [TelegramNotificationsService],
})
export class TelegramNotificationsModule {}
