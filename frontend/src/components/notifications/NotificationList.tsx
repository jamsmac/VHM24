'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Notification,
  notificationsApi,
  notificationTypeLabels,
  priorityLabels,
  getPriorityColor,
  isUnread,
  NotificationPriority,
} from '@/lib/notifications-api'
import {
  Bell,
  ClipboardList,
  Package,
  AlertTriangle,
  AlertCircle,
  MessageSquare,
  FileText,
  Wrench,
  Droplets,
  Check,
  Trash2,
  ExternalLink,
  Clock,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

function getTypeIcon(type: string) {
  const iconClass = 'h-5 w-5'

  if (type.includes('task')) return <ClipboardList className={iconClass} />
  if (type.includes('stock') || type.includes('spare')) return <Package className={iconClass} />
  if (type.includes('machine') || type.includes('error')) return <AlertTriangle className={iconClass} />
  if (type.includes('incident')) return <AlertCircle className={iconClass} />
  if (type.includes('complaint')) return <MessageSquare className={iconClass} />
  if (type.includes('report')) return <FileText className={iconClass} />
  if (type.includes('component') || type.includes('maintenance')) return <Wrench className={iconClass} />
  if (type.includes('washing')) return <Droplets className={iconClass} />

  return <Bell className={iconClass} />
}

interface NotificationItemProps {
  notification: Notification
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
  compact?: boolean
}

function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
  compact = false,
}: NotificationItemProps) {
  const unread = isUnread(notification)
  const priorityColor = getPriorityColor(notification.priority)

  if (compact) {
    return (
      <div
        className={`p-3 border-b border-gray-100 last:border-0 ${
          unread ? 'bg-indigo-50/50' : ''
        } hover:bg-gray-50 transition-colors`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`p-1.5 rounded-lg ${
              notification.priority === NotificationPriority.URGENT
                ? 'bg-red-100 text-red-600'
                : notification.priority === NotificationPriority.HIGH
                ? 'bg-orange-100 text-orange-600'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {getTypeIcon(notification.type)}
          </div>

          <div className="flex-1 min-w-0">
            <p
              className={`text-sm truncate ${
                unread ? 'font-medium text-gray-900' : 'text-gray-700'
              }`}
            >
              {notification.title}
            </p>
            <p className="text-xs text-gray-500 truncate mt-0.5">{notification.message}</p>
            <p className="text-xs text-gray-400 mt-1">
              {formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true,
                locale: ru,
              })}
            </p>
          </div>

          {unread && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onMarkRead(notification.id)
              }}
              className="p-1 text-gray-400 hover:text-indigo-600"
              title="Отметить как прочитанное"
            >
              <Check className="h-4 w-4" />
            </button>
          )}
        </div>

        {notification.action_url && (
          <Link
            href={notification.action_url}
            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 mt-2 ml-10"
          >
            Перейти
            <ExternalLink className="h-3 w-3" />
          </Link>
        )}
      </div>
    )
  }

  return (
    <div
      className={`p-4 border border-gray-200 rounded-lg ${
        unread ? 'bg-indigo-50/30 border-indigo-200' : 'bg-white'
      } hover:shadow-sm transition-shadow`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`p-2 rounded-lg ${
            notification.priority === NotificationPriority.URGENT
              ? 'bg-red-100 text-red-600'
              : notification.priority === NotificationPriority.HIGH
              ? 'bg-orange-100 text-orange-600'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {getTypeIcon(notification.type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4
              className={`text-sm ${unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}
            >
              {notification.title}
            </h4>
            {notification.priority !== NotificationPriority.NORMAL && (
              <span
                className={`px-2 py-0.5 text-xs rounded-full border ${priorityColor}`}
              >
                {priorityLabels[notification.priority]}
              </span>
            )}
            {unread && (
              <span className="w-2 h-2 bg-indigo-500 rounded-full" />
            )}
          </div>

          <p className="text-sm text-gray-600">{notification.message}</p>

          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true,
                locale: ru,
              })}
            </span>
            <span>{notificationTypeLabels[notification.type]}</span>
          </div>

          {notification.action_url && (
            <Link
              href={notification.action_url}
              className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 mt-2"
            >
              Перейти к деталям
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        <div className="flex items-center gap-1">
          {unread && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMarkRead(notification.id)}
              title="Отметить как прочитанное"
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(notification.id)}
            title="Удалить"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>
    </div>
  )
}

interface NotificationListProps {
  notifications: Notification[]
  isLoading?: boolean
  compact?: boolean
  maxItems?: number
}

export function NotificationList({
  notifications,
  isLoading,
  compact = false,
  maxItems,
}: NotificationListProps) {
  const queryClient = useQueryClient()

  const markReadMutation = useMutation({
    mutationFn: notificationsApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: notificationsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Уведомление удалено')
    },
    onError: () => {
      toast.error('Ошибка при удалении')
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div
              className={`${compact ? 'p-3' : 'p-4 border border-gray-200 rounded-lg'}`}
            >
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 bg-gray-200 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const displayNotifications = maxItems
    ? notifications.slice(0, maxItems)
    : notifications

  if (displayNotifications.length === 0) {
    return (
      <div className="text-center py-8">
        <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Нет уведомлений</p>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="divide-y divide-gray-100">
        {displayNotifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkRead={(id) => markReadMutation.mutate(id)}
            onDelete={(id) => deleteMutation.mutate(id)}
            compact
          />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {displayNotifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onMarkRead={(id) => markReadMutation.mutate(id)}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      ))}
    </div>
  )
}
