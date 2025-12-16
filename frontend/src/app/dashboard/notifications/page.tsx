'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  notificationsApi,
  NotificationStatus,
  NotificationPriority,
  notificationTypeLabels,
  statusLabels,
  priorityLabels,
  isUnread,
} from '@/lib/notifications-api'
import { NotificationList } from '@/components/notifications/NotificationList'
import { Button } from '@/components/ui/button'
import {
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  Settings,
  RefreshCw,
  Filter,
  X,
  Inbox,
} from 'lucide-react'
import { toast } from 'sonner'

type FilterTab = 'all' | 'unread' | 'urgent'

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilter, setStatusFilter] = useState<NotificationStatus | ''>('')
  const [priorityFilter, setPriorityFilter] = useState<NotificationPriority | ''>('')

  const queryClient = useQueryClient()

  const { data: notifications, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['notifications', 'my'],
    queryFn: () => notificationsApi.getMyNotifications(),
    staleTime: 30000,
  })

  const { data: stats } = useQuery({
    queryKey: ['notifications', 'stats'],
    queryFn: () => notificationsApi.getStats(),
    staleTime: 30000,
  })

  const markAllReadMutation = useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Все уведомления отмечены как прочитанные')
    },
    onError: () => {
      toast.error('Ошибка при обновлении')
    },
  })

  // Filter notifications based on tab and filters
  const filteredNotifications = notifications?.filter((n) => {
    // Tab filter
    if (activeTab === 'unread' && !isUnread(n)) return false
    if (activeTab === 'urgent' && n.priority !== NotificationPriority.URGENT && n.priority !== NotificationPriority.HIGH) return false

    // Status filter
    if (statusFilter && n.status !== statusFilter) return false

    // Priority filter
    if (priorityFilter && n.priority !== priorityFilter) return false

    return true
  }) || []

  const unreadCount = stats?.unread || (notifications?.filter(isUnread).length ?? 0)
  const urgentCount = notifications?.filter(
    (n) => (n.priority === NotificationPriority.URGENT || n.priority === NotificationPriority.HIGH) && isUnread(n)
  ).length ?? 0

  const hasActiveFilters = statusFilter || priorityFilter

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Уведомления</h1>
          <p className="mt-2 text-gray-600">
            Управление уведомлениями и настройками
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Фильтры
            {hasActiveFilters && (
              <span className="ml-2 bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-xs">
                Активны
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Прочитать все
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Inbox className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.total || notifications?.length || 0}</p>
              <p className="text-sm text-gray-500">Всего</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bell className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{unreadCount}</p>
              <p className="text-sm text-gray-500">Непрочитанных</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Bell className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{urgentCount}</p>
              <p className="text-sm text-gray-500">Срочных</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCheck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {(stats?.total || notifications?.length || 0) - unreadCount}
              </p>
              <p className="text-sm text-gray-500">Прочитанных</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Фильтры</h3>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter('')
                  setPriorityFilter('')
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Сбросить
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Статус
              </label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as NotificationStatus)}
              >
                <option value="">Все статусы</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Приоритет
              </label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as NotificationPriority)}
              >
                <option value="">Все приоритеты</option>
                {Object.entries(priorityLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`
              pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
              ${activeTab === 'all'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <Inbox className="h-4 w-4" />
            Все
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
              {notifications?.length || 0}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={`
              pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
              ${activeTab === 'unread'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <Bell className="h-4 w-4" />
            Непрочитанные
            {unreadCount > 0 && (
              <span className="bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-xs">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('urgent')}
            className={`
              pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
              ${activeTab === 'urgent'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <Bell className="h-4 w-4" />
            Срочные
            {urgentCount > 0 && (
              <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs">
                {urgentCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredNotifications.length === 0 && !isLoading ? (
          <div className="p-12 text-center">
            <BellOff className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Нет уведомлений</p>
            <p className="text-sm text-gray-400 mt-1">
              {activeTab === 'unread'
                ? 'Все уведомления прочитаны'
                : activeTab === 'urgent'
                ? 'Нет срочных уведомлений'
                : 'Уведомления появятся здесь'}
            </p>
          </div>
        ) : (
          <div className="p-4">
            <NotificationList
              notifications={filteredNotifications}
              isLoading={isLoading}
            />
          </div>
        )}
      </div>
    </div>
  )
}
