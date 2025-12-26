import { Module } from '@nestjs/common';

import { TelegramKeyboardHandler } from './handlers/telegram-keyboard.handler';
import { TelegramMessageHandler } from './handlers/telegram-message.handler';

import { TelegramI18nModule } from '../i18n/telegram-i18n.module';

/**
 * Telegram UI Module
 *
 * Provides UI-related services for Telegram bot:
 * - Keyboard generation
 * - Message formatting
 *
 * @module TelegramUiModule
 */
@Module({
  imports: [TelegramI18nModule],
  providers: [TelegramKeyboardHandler, TelegramMessageHandler],
  exports: [TelegramKeyboardHandler, TelegramMessageHandler],
})
export class TelegramUiModule {}
