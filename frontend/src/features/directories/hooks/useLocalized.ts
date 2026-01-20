'use client';

/**
 * Hooks for localized content
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Interface for entities with localized names
 */
interface LocalizableEntity {
  name_ru: string;
  name_en?: string | null;
  translations?: Record<string, string> | null;
}

/**
 * Interface for fields with localized display names
 */
interface LocalizableField {
  name_ru: string;
  name_en?: string | null;
  translations?: Record<string, string> | null;
}

/**
 * Hook to get localized name from an entity
 *
 * @param entity - Entity with name_ru, name_en, and optional translations
 * @returns Localized name string
 */
export function useLocalized<T extends LocalizableEntity>(
  entity: T | null | undefined,
): string {
  const { i18n } = useTranslation();
  const currentLocale = i18n.language || 'ru';
  const defaultLocale = 'ru';

  return useMemo(() => {
    if (!entity) return '';

    // Try translations first (for custom locales like 'uz')
    if (entity.translations?.[currentLocale]) {
      return entity.translations[currentLocale];
    }

    // Try current locale field
    if (currentLocale === 'en' && entity.name_en) {
      return entity.name_en;
    }

    // Try default locale in translations
    if (entity.translations?.[defaultLocale]) {
      return entity.translations[defaultLocale];
    }

    // Fallback to name_ru
    return entity.name_ru;
  }, [entity, currentLocale, defaultLocale]);
}

/**
 * Hook to get localized field display name
 *
 * @param field - Field with name_ru, name_en, and optional translations
 * @returns Localized field label
 */
export function useLocalizedField(
  field: LocalizableField | null | undefined,
): string {
  const { i18n } = useTranslation();
  const currentLocale = i18n.language || 'ru';
  const defaultLocale = 'ru';

  return useMemo(() => {
    if (!field) return '';

    // Try translations first
    if (field.translations?.[currentLocale]) {
      return field.translations[currentLocale];
    }

    // Try current locale field
    if (currentLocale === 'en' && field.name_en) {
      return field.name_en;
    }

    // Try default locale in translations
    if (field.translations?.[defaultLocale]) {
      return field.translations[defaultLocale];
    }

    // Fallback to name_ru
    return field.name_ru;
  }, [field, currentLocale, defaultLocale]);
}

/**
 * Hook to get localized value from a translations object
 *
 * @param translations - Record of locale to string
 * @param fallback - Fallback value if no translation found
 * @returns Localized string
 */
export function useLocalizedValue(
  translations: Record<string, string> | null | undefined,
  fallback: string = '',
): string {
  const { i18n } = useTranslation();
  const currentLocale = i18n.language || 'ru';
  const defaultLocale = 'ru';

  return useMemo(() => {
    if (!translations) return fallback;

    return (
      translations[currentLocale] ||
      translations[defaultLocale] ||
      fallback
    );
  }, [translations, currentLocale, defaultLocale, fallback]);
}

/**
 * Helper function for getting localized name outside of React components
 * (e.g., in utilities or API transforms)
 *
 * @param entity - Entity with localized fields
 * @param locale - Target locale
 * @returns Localized name
 */
export function getLocalizedName(
  entity: LocalizableEntity | null | undefined,
  locale: string = 'ru',
): string {
  if (!entity) return '';

  // Try translations
  if (entity.translations?.[locale]) {
    return entity.translations[locale];
  }

  // Try locale-specific field
  if (locale === 'en' && entity.name_en) {
    return entity.name_en;
  }

  // Fallback to Russian
  return entity.name_ru;
}
