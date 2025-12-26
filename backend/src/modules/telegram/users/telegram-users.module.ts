import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TelegramUsersService } from './services/telegram-users.service';
import { TelegramSettingsService } from './services/telegram-settings.service';
import { TelegramUsersController } from './controllers/telegram-users.controller';
import { TelegramSettingsController } from './controllers/telegram-settings.controller';

import { TelegramUser } from '../shared/entities/telegram-user.entity';
import { TelegramSettings } from '../shared/entities/telegram-settings.entity';

/**
 * Telegram Users Module
 *
 * Provides user management services for Telegram bot:
 * - User registration and verification
 * - User settings management
 * - Telegram settings configuration
 *
 * @module TelegramUsersModule
 */
@Module({
  imports: [TypeOrmModule.forFeature([TelegramUser, TelegramSettings])],
  controllers: [TelegramUsersController, TelegramSettingsController],
  providers: [TelegramUsersService, TelegramSettingsService],
  exports: [TelegramUsersService, TelegramSettingsService],
})
export class TelegramUsersModule {}
