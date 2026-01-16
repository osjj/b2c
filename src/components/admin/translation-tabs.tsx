'use client'

import { cn } from '@/lib/utils'
import { locales, localeNames, type Locale } from '@/i18n/config'
import { Check, Circle } from 'lucide-react'

interface TranslationTabsProps {
  activeLocale: Locale
  onLocaleChange: (locale: Locale) => void
  completedLocales?: Locale[]
}

export function TranslationTabs({
  activeLocale,
  onLocaleChange,
  completedLocales = [],
}: TranslationTabsProps) {
  return (
    <div className="flex gap-1 border-b mb-4">
      {locales.map((locale) => {
        const isActive = activeLocale === locale
        const isCompleted = completedLocales.includes(locale)

        return (
          <button
            key={locale}
            type="button"
            onClick={() => onLocaleChange(locale)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2',
              isActive
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {localeNames[locale]}
            {isCompleted ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Circle className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
        )
      })}
    </div>
  )
}
