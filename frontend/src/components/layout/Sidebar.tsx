'use client'

import { useState, useEffect } from 'react'
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
  KeyRound,
  ChevronDown,
  ChevronRight,
  Coffee,
  ExternalLink,
  Bot,
  Terminal,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useActiveAlertsCount } from '@/hooks/useActiveAlertsCount'

// Navigation item interface
interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  showBadge?: boolean
}

// Navigation group interface
interface NavGroup {
  id: string
  label: string
  icon: LucideIcon
  defaultOpen?: boolean
  items: NavItem[]
}

// Grouped navigation structure
const NAVIGATION_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    label: 'Обзор',
    icon: LayoutDashboard,
    defaultOpen: true,
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ]
  },
  {
    id: 'machines',
    label: 'Автоматы',
    icon: Coffee,
    defaultOpen: true,
    items: [
      { name: 'Все аппараты', href: '/dashboard/machines', icon: Package },
      { name: 'Доступ', href: '/dashboard/machines/access', icon: KeyRound },
      { name: 'Карта', href: '/dashboard/map', icon: Map },
      { name: 'Мониторинг', href: '/dashboard/monitoring', icon: Activity },
    ]
  },
  {
    id: 'operations',
    label: 'Операции',
    icon: ClipboardList,
    defaultOpen: true,
    items: [
      { name: 'Задачи', href: '/dashboard/tasks', icon: ClipboardList },
      { name: 'Расписание', href: '/dashboard/scheduled-tasks', icon: Timer },
      { name: 'Инциденты', href: '/dashboard/incidents', icon: AlertTriangle },
      { name: 'Жалобы', href: '/dashboard/complaints', icon: MessageSquare },
    ]
  },
  {
    id: 'inventory',
    label: 'Склад и оборудование',
    icon: Wrench,
    items: [
      { name: 'Инвентарь', href: '/dashboard/inventory', icon: Package },
      { name: 'Оборудование', href: '/dashboard/equipment', icon: Wrench },
      { name: 'Импорт данных', href: '/dashboard/import', icon: FileUp },
    ]
  },
  {
    id: 'finance',
    label: 'Финансы',
    icon: DollarSign,
    items: [
      { name: 'Транзакции', href: '/dashboard/transactions', icon: DollarSign },
      { name: 'Комиссии', href: '/dashboard/commissions', icon: Receipt },
      { name: 'Договоры', href: '/dashboard/contracts', icon: FileText },
      { name: 'Контрагенты', href: '/dashboard/counterparties', icon: Building2 },
      { name: 'Отчёты', href: '/dashboard/reports', icon: BarChart3 },
    ]
  },
  {
    id: 'notifications',
    label: 'Уведомления',
    icon: Bell,
    items: [
      { name: 'Уведомления', href: '/dashboard/notifications', icon: Bell },
      { name: 'Оповещения', href: '/dashboard/alerts', icon: BellRing, showBadge: true },
    ]
  },
  {
    id: 'admin',
    label: 'Администрирование',
    icon: Settings,
    items: [
      { name: 'Пользователи', href: '/dashboard/users', icon: Users },
      { name: 'Локации', href: '/dashboard/locations', icon: MapPin },
      { name: 'Telegram', href: '/dashboard/telegram', icon: Send },
      { name: 'Аудит', href: '/dashboard/audit', icon: ScrollText },
      { name: 'Безопасность', href: '/dashboard/security', icon: Shield },
      { name: 'Настройки', href: '/dashboard/settings', icon: Settings },
    ]
  },
  {
    id: 'ai-tools',
    label: 'AI Инструменты',
    icon: Sparkles,
    items: [
      { name: 'AI Ассистент', href: '/dashboard/ai-assistant', icon: Bot },
      { name: 'Агенты', href: '/dashboard/agents', icon: Terminal },
      { name: 'AI Провайдеры', href: '/dashboard/settings/ai-providers', icon: Sparkles },
    ]
  },
]

// Custom hook for localStorage
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
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

  const setValue = (value: T) => {
    try {
      setStoredValue(value)
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error)
    }
  }

  return [storedValue, setValue]
}

function AlertsBadge() {
  const { count } = useActiveAlertsCount()

  if (count === 0) return null

  return (
    <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
      {count > 99 ? '99+' : count}
    </span>
  )
}

export function Sidebar() {
  const pathname = usePathname()

  // Get default expanded groups
  const defaultExpanded = NAVIGATION_GROUPS
    .filter(g => g.defaultOpen)
    .map(g => g.id)

  const [expandedGroups, setExpandedGroups] = useLocalStorage<string[]>(
    'vhm24-sidebar-expanded',
    defaultExpanded
  )

  // Auto-expand group containing current path
  useEffect(() => {
    const currentGroup = NAVIGATION_GROUPS.find(group =>
      group.items.some(item =>
        pathname === item.href || pathname?.startsWith(item.href + '/')
      )
    )
    if (currentGroup && !expandedGroups.includes(currentGroup.id)) {
      setExpandedGroups([...expandedGroups, currentGroup.id])
    }
  }, [pathname, expandedGroups, setExpandedGroups])

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(
      expandedGroups.includes(groupId)
        ? expandedGroups.filter(id => id !== groupId)
        : [...expandedGroups, groupId]
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
      className="hidden md:flex md:flex-col w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-screen"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800" data-tour="sidebar-logo">
        <Link
          href="/dashboard"
          className="flex items-center space-x-3"
          aria-label="VendHub Home"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Coffee className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">VendHub</span>
            <span className="block text-xs text-gray-500 dark:text-gray-400">Manager</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3" aria-label="Primary">
        <div className="space-y-1">
          {NAVIGATION_GROUPS.map((group) => {
            const isExpanded = expandedGroups.includes(group.id)
            const isActive = isActiveGroup(group)
            const GroupIcon = group.icon

            return (
              <div key={group.id} className="mb-1">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                  )}
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-3">
                    <GroupIcon className="w-5 h-5" aria-hidden="true" />
                    <span>{group.label}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>

                {/* Group Items */}
                <div
                  className={cn(
                    'overflow-hidden transition-all duration-200 ease-in-out',
                    isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  )}
                >
                  <ul className="mt-1 ml-4 space-y-0.5 border-l-2 border-gray-100 dark:border-gray-800 pl-3">
                    {group.items.map((item) => {
                      const ItemIcon = item.icon
                      const isItemActive = isActiveItem(item.href)

                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={cn(
                              'flex items-center px-3 py-2 text-sm rounded-md transition-colors',
                              isItemActive
                                ? 'bg-indigo-100 text-indigo-700 font-medium dark:bg-indigo-900/50 dark:text-indigo-300'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
                            )}
                            aria-current={isItemActive ? 'page' : undefined}
                            data-tour={`nav-${item.href.split('/').pop()}`}
                          >
                            <ItemIcon className="mr-3 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                            <span className="flex-1">{item.name}</span>
                            {item.showBadge && <AlertsBadge />}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>
      </nav>

      {/* Footer - Ecosystem Links */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-800 space-y-1">
        <a
          href="https://vendhub.live"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-gray-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/20 rounded-lg transition"
        >
          <ExternalLink className="w-4 h-4" />
          vendhub.live
        </a>
        <a
          href="https://t.me/VendHubBot"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition"
        >
          <Send className="w-4 h-4" />
          @VendHubBot
        </a>
        <div className="text-xs text-gray-400 dark:text-gray-500 text-center pt-2">
          VendHub v2.0
        </div>
      </div>
    </aside>
  )
}
