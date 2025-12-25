'use client'

import Link from 'next/link'
import {
  Plus,
  ClipboardList,
  AlertTriangle,
  Package,
  FileUp,
  UserPlus,
  MapPin,
  FileText,
  QrCode,
  ArrowRight,
} from 'lucide-react'

interface QuickAction {
  id: string
  label: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
}

const quickActions: QuickAction[] = [
  {
    id: 'create-task',
    label: 'Создать задачу',
    description: 'Новая задача для оператора',
    href: '/dashboard/tasks/create',
    icon: ClipboardList,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
  },
  {
    id: 'create-incident',
    label: 'Создать инцидент',
    description: 'Зарегистрировать проблему',
    href: '/dashboard/incidents/create',
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 hover:bg-orange-100',
  },
  {
    id: 'add-machine',
    label: 'Добавить аппарат',
    description: 'Новый торговый автомат',
    href: '/dashboard/machines/create',
    icon: Package,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100',
  },
  {
    id: 'import-data',
    label: 'Импорт данных',
    description: 'Загрузить из файла',
    href: '/dashboard/import',
    icon: FileUp,
    color: 'text-green-600',
    bgColor: 'bg-green-50 hover:bg-green-100',
  },
  {
    id: 'add-user',
    label: 'Добавить пользователя',
    description: 'Новый сотрудник',
    href: '/dashboard/users/create',
    icon: UserPlus,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 hover:bg-indigo-100',
  },
  {
    id: 'add-location',
    label: 'Добавить локацию',
    description: 'Новая точка размещения',
    href: '/dashboard/locations/create',
    icon: MapPin,
    color: 'text-red-600',
    bgColor: 'bg-red-50 hover:bg-red-100',
  },
  {
    id: 'create-contract',
    label: 'Создать договор',
    description: 'Новый контракт',
    href: '/dashboard/contracts/create',
    icon: FileText,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 hover:bg-cyan-100',
  },
  {
    id: 'scan-qr',
    label: 'Сканировать QR',
    description: 'Быстрый доступ к аппарату',
    href: '/dashboard/scan',
    icon: QrCode,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50 hover:bg-gray-100',
  },
]

interface QuickActionsProps {
  maxItems?: number
  compact?: boolean
}

export function QuickActions({ maxItems = 8, compact = false }: QuickActionsProps) {
  const displayActions = quickActions.slice(0, maxItems)

  if (compact) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Быстрые действия</h3>
          <Link
            href="/dashboard/tasks/create"
            className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            Все действия
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {displayActions.slice(0, 4).map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.id}
                href={action.href}
                className={`flex flex-col items-center p-3 rounded-lg ${action.bgColor} transition-colors`}
              >
                <Icon className={`h-5 w-5 ${action.color}`} />
                <span className="text-xs text-gray-700 mt-1.5 text-center line-clamp-1">
                  {action.label.split(' ')[0]}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Быстрые действия</h3>
          <p className="text-sm text-gray-500">Часто используемые операции</p>
        </div>
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Plus className="h-5 w-5 text-indigo-600" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {displayActions.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.id}
              href={action.href}
              className={`flex flex-col items-center p-4 rounded-lg ${action.bgColor} transition-colors group`}
            >
              <div className={`p-2 rounded-lg bg-white/50 ${action.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-gray-900 mt-2 text-center">
                {action.label}
              </span>
              <span className="text-xs text-gray-500 mt-0.5 text-center hidden md:block">
                {action.description}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// Mini Quick Actions for sidebar or header
export function MiniQuickActions() {
  const mainActions = quickActions.slice(0, 4)

  return (
    <div className="flex items-center gap-1">
      {mainActions.map((action) => {
        const Icon = action.icon
        return (
          <Link
            key={action.id}
            href={action.href}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title={action.label}
          >
            <Icon className="h-4 w-4" />
          </Link>
        )
      })}
    </div>
  )
}
