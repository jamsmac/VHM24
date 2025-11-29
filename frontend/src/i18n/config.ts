export const locales = ['ru', 'uz'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'ru'

export const localeNames: Record<Locale, string> = {
  ru: 'Русский',
  uz: 'O\'zbekcha',
}
