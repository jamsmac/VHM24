'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ChevronDown,
  ChevronRight,
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
  KeyRound,
  Coffee,
  Wallet,
  LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useActiveAlertsCount } from '@/hooks/useActiveAlertsCount'

// Navigation structure with groups
interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  showBadge?: boolean
  dataTour?: string
}

interface NavGroup {
  id: string
  label: string
  icon: LucideIcon
  items: NavItem[]
}

const NAVIGATION_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    label: 'Обзор',
    icon: LayoutDashboard,
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ]
  },
  {
    id: 'machines',
    label: 'Автоматы',
    icon: Coffee,
    items: [
      { href: '/dashboard/machines', label: 'Список машин', icon: Package, dataTour: 'machines' },
      { href: '/dashboard/machines/access', label: 'Доступ', icon: KeyRound },
      { href: '/dashboard/map', label: 'Карта', icon: Map },
      { href: '/dashboard/monitoring', label: 'Мониторинг', icon: Activity },
    ]
  },
  {
    id: 'operations',
    label: 'Операции',
    icon: ClipboardList,
    items: [
      { href: '/dashboard/tasks', label: 'Задачи', icon: ClipboardList, dataTour: 'tasks' },
      { href: '/dashboard/scheduled-tasks', label: 'Расписание', icon: Timer },
      { href: '/dashboard/incidents', label: 'Инциденты', icon: AlertTriangle },
      { href: '/dashboard/complaints', label: 'Жалобы', icon: MessageSquare },
    ]
  },
  {
    id: 'inventory',
    label: 'Склад',
    icon: Package,
    items: [
      { href: '/dashboard/inventory', label: 'Инвентарь', icon: Package },
      { href: '/dashboard/equipment', label: 'Оборудование', icon: Wrench },
      { href: '/dashboard/import', label: 'Импорт', icon: FileUp },
    ]
  },
  {
    id: 'finance',
    label: 'Финансы',
    icon: DollarSign,
    items: [
      { href: '/dashboard/transactions', label: 'Транзакции', icon: DollarSign },
      { href: '/dashboard/counterparties', label: 'Контрагенты', icon: Building2 },
      { href: '/dashboard/contracts', label: 'Договоры', icon: FileText },
      { href: '/dashboard/commissions', label: 'Комиссии', icon: Receipt },
    ]
  },
  {
    id: 'analytics',
    label: 'Аналитика',
    icon: BarChart3,
    items: [
      { href: '/dashboard/reports', label: 'Отчеты', icon: BarChart3, dataTour: 'analytics' },
      { href: '/dashboard/audit', label: 'Аудит', icon: ScrollText },
    ]
  },
  {
    id: 'notifications',
    label: 'Уведомления',
    icon: Bell,
    items: [
      { href: '/dashboard/notifications', label: 'Уведомления', icon: Bell, dataTour: 'notifications' },
      { href: '/dashboard/alerts', label: 'Оповещения', icon: BellRing, showBadge: true },
      { href: '/dashboard/telegram', label: 'Telegram', icon: Send },
    ]
  },
  {
    id: 'settings',
    label: 'Настройки',
    icon: Settings,
    items: [
      { href: '/dashboard/users', label: 'Пользователи', icon: Users },
      { href: '/dashboard/locations', label: 'Локации', icon: MapPin },
      { href: '/dashboard/security', label: 'Безопасность', icon: Shield },
      { href: '/dashboard/settings', label: 'Система', icon: Settings },
    ]
  }
]

function AlertsBadge() {
  const { count } = useActiveAlertsCount()

  if (count === 0) return null

  return (
    <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
      {count > 99 ? '99+' : count}
    </span>
  )
}

// Custom hook for localStorage with SSR support
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(initialValue)

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key)
      if (item) {
        setStoredValue(JSON.parse(item))
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error)
    }
  }, [key])

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error)
    }
  }

  return [storedValue, setValue]
}

interface CollapsibleSidebarProps {
  className?: string
}

export function CollapsibleSidebar({ className }: CollapsibleSidebarProps) {
  const pathname = usePathname()
  const [expandedGroups, setExpandedGroups] = useLocalStorage<string[]>(
    'vhm24-sidebar-expanded',
    ['overview', 'machines'] // Default expanded
  )

  // Auto-expand group containing current path
  useEffect(() => {
    const currentGroup = NAVIGATION_GROUPS.find(group =>
      group.items.some(item => pathname === item.href || pathname?.startsWith(item.href + '/'))
    )

    if (currentGroup && !expandedGroups.includes(currentGroup.id)) {
      setExpandedGroups([...expandedGroups, currentGroup.id])
    }
  }, [pathname, expandedGroups, setExpandedGroups])

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    )
  }

  const isActiveItem = (href: string) => {
    return pathname === href || pathname?.startsWith(href + '/')
  }

  const isActiveGroup = (group: NavGroup) => {
    return group.items.some(item => isActiveItem(item.href))
  }

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 h-screen overflow-hidden',
        className
      )}
      role="navigation"
      aria-label="Main navigation"
      data-tour="sidebar"
    >
      {/* Logo */}
      <div className="p-4 border-b border-gray-100 dark:border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Coffee className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-gray-900 dark:text-white">VendHub</div>
            <div className="text-xs text-gray-500 dark:text-slate-400">Manager</div>
          </div>
        </Link>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-1">
          {NAVIGATION_GROUPS.map((group) => {
            const isExpanded = expandedGroups.includes(group.id)
            const isActive = isActiveGroup(group)
            const GroupIcon = group.icon

            return (
              <li key={group.id} className="mb-1">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
                  )}
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-3">
                    <GroupIcon className="w-5 h-5" />
                    <span>{group.label}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>

                {/* Group Items */}
                <ul
                  className={cn(
                    'overflow-hidden transition-all duration-200',
                    isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  )}
                >
                  <li className="ml-4 mt-1 space-y-0.5 border-l border-gray-200 dark:border-slate-700 pl-3">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon
                      const isItemActive = isActiveItem(item.href)

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                            isItemActive
                              ? 'bg-indigo-100 text-indigo-700 font-medium dark:bg-indigo-900/30 dark:text-indigo-400'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
                          )}
                          aria-current={isItemActive ? 'page' : undefined}
                          {...(item.dataTour && { 'data-tour': item.dataTour })}
                        >
                          <ItemIcon className="w-4 h-4" />
                          <span className="flex-1">{item.label}</span>
                          {item.showBadge && <AlertsBadge />}
                        </Link>
                      )
                    })}
                  </li>
                </ul>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer - User Section */}
      <div className="p-4 border-t border-gray-100 dark:border-slate-800" data-tour="user-menu">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
            VH
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">VendHub</div>
            <div className="text-xs text-gray-500 dark:text-slate-400 truncate">v1.0.0</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
