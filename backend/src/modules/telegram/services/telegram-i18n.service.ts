import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import i18next, { TFunction } from 'i18next';
import { format } from 'date-fns';
import { TelegramLanguage } from '../entities/telegram-user.entity';

// Import translations directly for reliability (avoids filesystem path issues)
import * as ruTranslations from '../locales/ru.json';
import * as enTranslations from '../locales/en.json';
import * as uzTranslations from '../locales/uz.json';

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
    await this.initialize();
  }

  /**
   * Initialize i18next with inline resources
   */
  private async initialize(): Promise<void> {
    try {
      await i18next.init({
        lng: 'ru', // Default language
        fallbackLng: 'ru', // Fallback if translation missing
        supportedLngs: ['ru', 'en', 'uz'],

        // Inline resources (more reliable than filesystem loading)
        resources: {
          ru: { translation: ruTranslations },
          en: { translation: enTranslations },
          uz: { translation: uzTranslations },
        },

        // Interpolation options
        interpolation: {
          escapeValue: false, // Not needed for Telegram (no XSS risk)
        },

        // Return key if translation missing (for debugging)
        returnNull: false,
        returnEmptyString: false,
      });

      this.isInitialized = true;
      this.logger.log('i18next initialized successfully with languages: ru, en, uz');
    } catch (error) {
      this.logger.error('Failed to initialize i18next', error);
      // Don't throw - allow service to work with fallback
      this.isInitialized = false;
    }
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
      // Return fallback from inline translations if not initialized
      return this.getFallbackTranslation(language, key, options) || key;
    }

    try {
      return i18next.t(key, { lng: language, ...options }) as string;
    } catch (error) {
      this.logger.error(`Translation error for key "${key}" in language "${language}"`, error);
      return key; // Return key as fallback
    }
  }

  /**
   * Get fallback translation directly from imported JSON
   */
  private getFallbackTranslation(
    language: string,
    key: string,
    options?: Record<string, unknown>,
  ): string | null {
    const translations: Record<string, Record<string, unknown>> = {
      ru: ruTranslations as unknown as Record<string, unknown>,
      en: enTranslations as unknown as Record<string, unknown>,
      uz: uzTranslations as unknown as Record<string, unknown>,
    };

    const langTranslations = translations[language] || translations['ru'];

    // Navigate nested keys (e.g., 'welcome.title')
    const keys = key.split('.');
    let value: unknown = langTranslations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return null;
      }
    }

    if (typeof value !== 'string') {
      return null;
    }

    // Simple interpolation for fallback
    if (options) {
      let result = value;
      for (const [optKey, optValue] of Object.entries(options)) {
        result = result.replace(new RegExp(`\\{\\{${optKey}\\}\\}`, 'g'), String(optValue));
      }
      return result;
    }

    return value;
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
      this.logger.warn('i18next not initialized yet, using fallback');
      // Return fallback function
      return ((key: string, options?: Record<string, unknown>) =>
        this.t(language, key, options)) as unknown as TFunction;
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
      return this.getFallbackTranslation(language, key) !== null;
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
    return this.t(language, `tasks.types.${taskType.toLowerCase()}`) || taskType;
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
