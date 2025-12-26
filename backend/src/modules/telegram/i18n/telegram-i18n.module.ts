import { Module } from '@nestjs/common';
import { TelegramI18nService } from './services/telegram-i18n.service';

/**
 * Telegram i18n Submodule
 *
 * Provides internationalization (i18n) support for Telegram bot.
 * Supports Russian, English, and Uzbek languages.
 *
 * @example
 * ```typescript
 * // In your module
 * imports: [TelegramI18nModule]
 *
 * // In your service
 * constructor(private readonly i18n: TelegramI18nService) {}
 *
 * // Usage
 * const message = this.i18n.t('ru', 'welcome.title');
 * ```
 */
@Module({
  providers: [TelegramI18nService],
  exports: [TelegramI18nService],
})
export class TelegramI18nModule {}
