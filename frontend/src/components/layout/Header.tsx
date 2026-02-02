'use client'

import { Search, User, LogOut, Settings, Command, FileCode } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LanguageToggle } from '@/components/LanguageToggle'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { Breadcrumbs, BreadcrumbsCompact } from '@/components/layout/Breadcrumbs'
import { useTranslations } from '@/providers/I18nProvider'
import { useCommandPaletteContext } from '@/providers/CommandPaletteProvider'

export function Header() {
  const { user, logout } = useAuth()
  const { t } = useTranslations()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const { open: openCommandPalette } = useCommandPaletteContext()

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0

  return (
    <header className="bg-white border-b border-stone-200 h-16" role="banner">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left side: Breadcrumbs + Search */}
        <div className="flex items-center gap-4 flex-1">
          {/* Breadcrumbs - hidden on mobile */}
          <div className="hidden md:block">
            <Breadcrumbs />
          </div>
          {/* Compact breadcrumbs for mobile */}
          <div className="md:hidden">
            <BreadcrumbsCompact />
          </div>

          {/* Search Trigger */}
          <div className="flex-1 max-w-lg" data-tour="header-search">
          <button
            onClick={openCommandPalette}
            className="w-full flex items-center gap-3 px-4 py-2 text-left rounded-xl bg-stone-100 hover:bg-stone-200 transition-colors group"
          >
            <Search className="h-4 w-4 text-stone-500" aria-hidden="true" />
            <span className="flex-1 text-sm text-stone-500">
              {t('common.search')}...
            </span>
            <kbd className="hidden md:inline-flex items-center gap-0.5 px-2 py-1 text-xs font-medium text-stone-500 bg-white rounded-lg border border-stone-200">
              {isMac ? <Command className="h-3 w-3" /> : 'Ctrl'}
              <span>K</span>
            </kbd>
          </button>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <div data-tour="header-notifications">
            <NotificationCenter />
          </div>

          {/* Language Toggle */}
          <LanguageToggle />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User menu */}
          <div className="relative" data-tour="header-user">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 focus:outline-none"
              aria-expanded={showUserMenu}
              aria-haspopup="menu"
              aria-label="User menu"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
                <User className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-foreground">{user?.full_name || 'User'}</p>
                <p className="text-xs text-muted-foreground">{user?.role || 'Role'}</p>
              </div>
            </button>

            {showUserMenu && (
              <div
                className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-2 z-50 border border-stone-200"
                role="menu"
                aria-label="User menu options"
              >
                <Link
                  href="/dashboard/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center w-full px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                  role="menuitem"
                >
                  <User className="mr-3 h-4 w-4" aria-hidden="true" />
                  Профиль
                </Link>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center w-full px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                  role="menuitem"
                >
                  <Settings className="mr-3 h-4 w-4" aria-hidden="true" />
                  Настройки
                </Link>
                {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                  <a
                    href="/api/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center w-full px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                    role="menuitem"
                  >
                    <FileCode className="mr-3 h-4 w-4" aria-hidden="true" />
                    API Документация
                  </a>
                )}
                <hr className="my-1 border-border" />
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
