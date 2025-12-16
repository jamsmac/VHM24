'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  AlertTriangle,
  MessageSquare,
  DollarSign,
  Users,
  MapPin,
  Map,
  Settings,
  Shield,
  Bell,
  BellRing,
  BarChart3,
  Wrench,
  Send,
  Building2,
  FileText,
  Receipt,
  FileUp,
  Activity,
  ScrollText,
  Timer,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useActiveAlertsCount } from '@/hooks/useActiveAlertsCount'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Аппараты', href: '/dashboard/machines', icon: Package },
  { name: 'Задачи', href: '/dashboard/tasks', icon: ClipboardList },
  { name: 'Инциденты', href: '/dashboard/incidents', icon: AlertTriangle },
  { name: 'Жалобы', href: '/dashboard/complaints', icon: MessageSquare },
  { name: 'Транзакции', href: '/dashboard/transactions', icon: DollarSign },
  { name: 'Контрагенты', href: '/dashboard/counterparties', icon: Building2 },
  { name: 'Договоры', href: '/dashboard/contracts', icon: FileText },
  { name: 'Комиссии', href: '/dashboard/commissions', icon: Receipt },
  { name: 'Инвентарь', href: '/dashboard/inventory', icon: Package },
  { name: 'Пользователи', href: '/dashboard/users', icon: Users },
  { name: 'Локации', href: '/dashboard/locations', icon: MapPin },
  { name: 'Карта', href: '/dashboard/map', icon: Map },
  { name: 'Уведомления', href: '/dashboard/notifications', icon: Bell },
  { name: 'Оповещения', href: '/dashboard/alerts', icon: BellRing, showBadge: true },
  { name: 'Отчеты', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Импорт', href: '/dashboard/import', icon: FileUp },
  { name: 'Мониторинг', href: '/dashboard/monitoring', icon: Activity },
  { name: 'Оборудование', href: '/dashboard/equipment', icon: Wrench },
  { name: 'Telegram', href: '/dashboard/telegram', icon: Send },
  { name: 'Аудит', href: '/dashboard/audit', icon: ScrollText },
  { name: 'Расписание', href: '/dashboard/scheduled-tasks', icon: Timer },
  { name: 'Безопасность', href: '/dashboard/security', icon: Shield },
  { name: 'Настройки', href: '/dashboard/settings', icon: Settings },
]

function AlertsBadge() {
  const { count } = useActiveAlertsCount()

  if (count === 0) return null

  return (
    <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen overflow-y-auto" role="navigation" aria-label="Main navigation">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center space-x-2" aria-label="VendHub Home">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg" aria-hidden="true" />
          <span className="text-xl font-bold text-gray-900">VendHub</span>
        </Link>
      </div>

      <nav className="mt-6 px-3" aria-label="Primary">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
            const Icon = item.icon

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="mr-3 h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  <span className="flex-1">{item.name}</span>
                  {item.showBadge && <AlertsBadge />}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
