'use client'

import { Bell, Search, User, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LanguageToggle } from '@/components/LanguageToggle'
import { useTranslations } from '@/providers/I18nProvider'

export function Header() {
  const { user, logout } = useAuth()
  const { t } = useTranslations()
  const [showUserMenu, setShowUserMenu] = useState(false)

  return (
    <header className="bg-card border-b border-border h-16" role="banner">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Search */}
        <div className="flex-1 max-w-lg">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-input rounded-md leading-5 bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring sm:text-sm"
              placeholder={t('common.search')}
              aria-label={t('common.search')}
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button
            className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={t('nav.notifications')}
          >
            <span className="sr-only">{t('nav.notifications')}</span>
            <Bell className="h-6 w-6" aria-hidden="true" />
            <span
              className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-destructive ring-2 ring-card"
              aria-label="New notifications"
            />
          </button>

          {/* Language Toggle */}
          <LanguageToggle />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 focus:outline-none"
              aria-expanded={showUserMenu}
              aria-haspopup="menu"
              aria-label="User menu"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                <User className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-foreground">{user?.full_name || 'User'}</p>
                <p className="text-xs text-muted-foreground">{user?.role || 'Role'}</p>
              </div>
            </button>

            {showUserMenu && (
              <div
                className="absolute right-0 mt-2 w-48 bg-popover rounded-md shadow-lg py-1 z-50 border border-border"
                role="menu"
                aria-label="User menu options"
              >
                <button
                  onClick={logout}
                  className="flex items-center w-full px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                  role="menuitem"
                >
                  <LogOut className="mr-3 h-4 w-4" aria-hidden="true" />
                  {t('auth.logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
