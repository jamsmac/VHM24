'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, History, Gift, Settings, LogOut, Coffee, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { clientTokenManager, clientAuthApi } from '@/lib/client-api'
import type { ClientUser } from '@/types/client'

const navigation = [
  { name: 'Мой кабинет', href: '/my', icon: LayoutDashboard },
  { name: 'История заказов', href: '/my/history', icon: History },
  { name: 'Бонусы', href: '/my/bonuses', icon: Gift },
  { name: 'Настройки', href: '/my/settings', icon: Settings },
]

export default function ClientCabinetLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<ClientUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      if (!clientTokenManager.isAuthenticated()) {
        // For demo purposes, allow access without auth
        // In production, redirect to Telegram bot
        setLoading(false)
        return
      }

      try {
        const userData = await clientAuthApi.getMe()
        setUser(userData)
      } catch {
        clientTokenManager.clearTokens()
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const handleLogout = () => {
    clientAuthApi.logout()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Coffee className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">VendHub</span>
          </Link>

          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm text-muted-foreground">
                {user.first_name} {user.last_name}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              title="Выйти"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground">
            Главная
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">Личный кабинет</span>
        </nav>

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          {/* Sidebar */}
          <aside className="hidden lg:block">
            <nav className="sticky top-24 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </aside>

          {/* Mobile nav */}
          <nav className="lg:hidden flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-white text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Main content */}
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </div>
  )
}
