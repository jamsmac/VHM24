import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as i18next from 'i18next';
import { TFunction } from 'i18next';
import * as Backend from 'i18next-fs-backend';
import { join } from 'path';
import { format } from 'date-fns';
import { TelegramLanguage } from '../entities/telegram-user.entity';

/**
 * i18n Service for Telegram Bot
 *
 * Provides multi-language support for bot messages using i18next.
 * Supports Russian, English, and Uzbek languages.
 *
 * **Usage:**
 * ```typescript
 * const message = this.i18nService.t('ru', 'welcome.title');
 * const formatted = this.i18nService.t('en', 'verification.too_many_attempts', { minutes: 5 });
 * ```
 */
@Injectable()
export class TelegramI18nService implements OnModuleInit {
  private readonly logger = new Logger(TelegramI18nService.name);
  private isInitialized = false;

  async onModuleInit() {
    // Temporarily disabled due to i18next v25 API compatibility issues
    // await this.initialize();
    this.logger.warn('i18n initialization disabled - using fallback translations');
  }

  /**
   * Initialize i18next with file system backend
   *
   * TEMPORARILY DISABLED: i18next v25 API changes require refactoring
   */
  private async initialize(): Promise<void> {
    // Disabled due to i18next v25 API compatibility issues
    // TODO: Refactor to use i18next v25 API or downgrade to v23
    this.logger.warn('i18n initialization disabled - using fallback translations');
    return;

    /*
    try {
      await i18next.use(Backend).init({
        lng: 'ru', // Default language
        fallbackLng: 'ru', // Fallback if translation missing
        supportedLngs: ['ru', 'en', 'uz'],
        preload: ['ru', 'en', 'uz'], // Load all languages on init

        backend: {
          loadPath: join(__dirname, '../locales/{{lng}}.json'),
        },

        // Interpolation options
        interpolation: {
          escapeValue: false, // Not needed for Telegram (no XSS risk)
        },

        // Return key if translation missing (for debugging)
        saveMissing: false,
        missingKeyHandler: (lngs, ns, key) => {
          this.logger.warn(`Missing translation: [${lngs}] ${key}`);
        },
      });

      this.isInitialized = true;
      this.logger.log('i18next initialized successfully with languages: ru, en, uz');
    } catch (error) {
      this.logger.error('Failed to initialize i18next', error);
      throw error;
    }
    */
  }

  /**
   * Translate a key to the specified language
   *
   * @param language - Language code (ru, en, uz)
   * @param key - Translation key (dot notation: 'welcome.title')
   * @param options - Interpolation variables
   * @returns Translated string
   *
   * @example
   * ```typescript
   * // Simple translation
   * t('ru', 'welcome.title') // "🏠 Добро пожаловать в VendHub Manager!"
   *
   * // With interpolation
   * t('en', 'verification.too_many_attempts', { minutes: 5 })
   * // "🚫 Too many failed attempts. Try again in 5 minutes."
   * ```
   */
  t(language: TelegramLanguage | string, key: string, options?: Record<string, unknown>): string {
    if (!this.isInitialized) {
      this.logger.warn('i18next not initialized yet, returning key');
      return key;
    }

    try {
      return i18next.t(key, { lng: language, ...options }) as string;
    } catch (error) {
      this.logger.error(`Translation error for key "${key}" in language "${language}"`, error);
      return key; // Return key as fallback
    }
  }

  /**
   * Get a translation function bound to a specific language
   *
   * Useful for reducing repetition when translating multiple keys in same language.
   *
   * @param language - Language code (ru, en, uz)
   * @returns Translation function
   *
   * @example
   * ```typescript
   * const t = this.i18nService.getFixedT('ru');
   * const title = t('welcome.title');
   * const description = t('welcome.description');
   * ```
   */
  getFixedT(language: TelegramLanguage | string): TFunction {
    if (!this.isInitialized) {
      this.logger.warn('i18next not initialized yet');
      return ((key: string) => key) as any as TFunction;
    }

    return i18next.getFixedT(language);
  }

  /**
   * Check if a translation key exists
   *
   * @param language - Language code
   * @param key - Translation key
   * @returns True if key exists
   */
  exists(language: TelegramLanguage | string, key: string): boolean {
    if (!this.isInitialized) {
      return false;
    }

    return i18next.exists(key, { lng: language });
  }

  /**
   * Get language name in its native form
   *
   * @param language - Language code
   * @returns Native language name
   */
  getLanguageName(language: TelegramLanguage | string): string {
    const names: Record<string, string> = {
      ru: 'Русский',
      en: 'English',
      uz: "O'zbek",
    };

    return names[language] || language;
  }

  /**
   * Get language flag emoji
   *
   * @param language - Language code
   * @returns Flag emoji
   */
  getLanguageFlag(language: TelegramLanguage | string): string {
    const flags: Record<string, string> = {
      ru: '🇷🇺',
      en: '🇬🇧',
      uz: '🇺🇿',
    };

    return flags[language] || '🌐';
  }

  /**
   * Get all supported languages
   *
   * @returns Array of language codes
   */
  getSupportedLanguages(): string[] {
    return ['ru', 'en', 'uz'];
  }

  /**
   * Validate if language is supported
   *
   * @param language - Language code to validate
   * @returns True if supported
   */
  isLanguageSupported(language: string): boolean {
    return this.getSupportedLanguages().includes(language);
  }

  /**
   * Get language-specific date format
   *
   * @param language - Language code
   * @returns Date format string for date-fns
   */
  getDateFormat(language: TelegramLanguage | string): string {
    const formats: Record<string, string> = {
      ru: 'dd.MM.yyyy',
      en: 'MM/dd/yyyy',
      uz: 'dd.MM.yyyy',
    };

    return formats[language] || 'dd.MM.yyyy';
  }

  /**
   * Get language-specific time format
   *
   * @param language - Language code
   * @returns Time format string
   */
  getTimeFormat(language: TelegramLanguage | string): string {
    const formats: Record<string, string> = {
      ru: 'HH:mm',
      en: 'hh:mm a',
      uz: 'HH:mm',
    };

    return formats[language] || 'HH:mm';
  }

  /**
   * Format date according to user's language
   *
   * @param date - Date to format
   * @param language - Language code
   * @param includeTime - Include time in output
   * @returns Formatted date string
   */
  formatDate(
    date: Date,
    language: TelegramLanguage | string,
    includeTime: boolean = false,
  ): string {
    const dateFormat = this.getDateFormat(language);
    const timeFormat = this.getTimeFormat(language);

    try {
      if (includeTime) {
        return format(date, `${dateFormat} ${timeFormat}`);
      }

      return format(date, dateFormat);
    } catch (error) {
      this.logger.error('Error formatting date', error);
      return date.toISOString();
    }
  }

  /**
   * Get localized task type name
   *
   * @param taskType - Task type code
   * @param language - Language code
   * @returns Localized task type name
   */
  getTaskTypeName(taskType: string, language: TelegramLanguage | string): string {
    return this.t(language, `tasks.types.${taskType.toLowerCase()}` || taskType);
  }

  /**
   * Get localized machine status name
   *
   * @param status - Machine status code
   * @param language - Language code
   * @returns Localized status name
   */
  getMachineStatusName(status: string, language: TelegramLanguage | string): string {
    return this.t(language, `machines.status.${status.toLowerCase()}`) || status;
  }
}
