export const locales = ['en', 'zh', 'ar'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  zh: '中文',
  ar: 'العربية',
}

export const localeFlags: Record<Locale, string> = {
  en: '🇺🇸',
  zh: '🇨🇳',
  ar: '🇸🇦',
}

export const rtlLocales: Locale[] = ['ar']

export function isRtlLocale(locale: string): boolean {
  return rtlLocales.includes(locale as Locale)
}
