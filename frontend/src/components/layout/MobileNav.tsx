'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ClipboardList, QrCode, User, Bell } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { tasksApi } from '@/lib/tasks-api'

export function MobileNav() {
  const pathname = usePathname()

  // Get task stats for badge
  const { data: stats } = useQuery({
    queryKey: ['tasks', 'stats'],
    queryFn: () => tasksApi.getStats(),
    refetchInterval: 60000, // Refetch every minute
  })

  const navItems = [
    {
      icon: Home,
      label: 'Главная',
      href: '/dashboard',
      match: (path: string) => path === '/dashboard',
    },
    {
      icon: ClipboardList,
      label: 'Задачи',
      href: '/dashboard/tasks',
      match: (path: string) => path.startsWith('/dashboard/tasks'),
      badge: stats?.in_progress || 0,
    },
    {
      icon: QrCode,
      label: 'Сканер',
      href: '/dashboard/scan',
      match: (path: string) => path.startsWith('/dashboard/scan'),
    },
    {
      icon: Bell,
      label: 'Уведомления',
      href: '/dashboard/notifications',
      match: (path: string) => path.startsWith('/dashboard/notifications'),
    },
    {
      icon: User,
      label: 'Профиль',
      href: '/dashboard/profile',
      match: (path: string) => path.startsWith('/dashboard/profile'),
    },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom z-40">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = item.match(pathname)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg
                transition-colors touch-manipulation min-w-[64px]
                ${isActive
                  ? 'text-indigo-600 bg-indigo-50'
                  : 'text-gray-600 active:bg-gray-100'
                }
              `}
            >
              <div className="relative">
                <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className={`text-xs font-medium ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
