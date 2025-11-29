'use client'

import * as React from 'react'
import { Languages } from 'lucide-react'
import { useTranslations } from '@/providers/I18nProvider'
import { localeNames, Locale } from '@/i18n/config'

export function LanguageToggle() {
  const { locale, setLocale } = useTranslations()
  const [showMenu, setShowMenu] = React.useState(false)

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale)
    setShowMenu(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="rounded-md p-2 hover:bg-accent transition-colors flex items-center gap-2"
        aria-label="Change language"
      >
        <Languages className="h-5 w-5" />
        <span className="text-sm font-medium uppercase">{locale}</span>
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-40 bg-popover rounded-md shadow-lg py-1 z-50 border border-border">
          {Object.entries(localeNames).map(([code, name]) => (
            <button
              key={code}
              onClick={() => handleLocaleChange(code as Locale)}
              className={`flex items-center w-full px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${
                locale === code ? 'bg-accent text-accent-foreground' : 'text-popover-foreground'
              }`}
            >
              <span className="mr-3 text-xs font-medium uppercase w-8">{code}</span>
              <span>{name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
