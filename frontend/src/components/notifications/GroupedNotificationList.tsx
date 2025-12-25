'use client'

import { useState, useMemo, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Notification,
  notificationsApi,
  notificationTypeLabels,
  getPriorityColor,
  isUnread,
  NotificationPriority,
  NotificationType,
} from '@/lib/notifications-api'
import {
  Bell,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Package,
  AlertTriangle,
  AlertCircle,
  MessageSquare,
  FileText,
  Wrench,
  Droplets,
  Check,
  CheckCheck,
  Trash2,
  ExternalLink,
  Clock,
  Calendar,
} from 'lucide-react'
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Time-based grouping
type TimeGroup = 'today' | 'yesterday' | 'thisWeek' | 'earlier'

interface NotificationGroup {
  id: string
  label: string
  icon: React.ReactNode
  notifications: Notification[]
  unreadCount: number
}

interface TimeBasedGroup {
  id: TimeGroup
  label: string
  groups: NotificationGroup[]
}

function getTypeIcon(type: string, className = 'h-5 w-5') {
  if (type.includes('task')) return <ClipboardList className={className} />
  if (type.includes('stock') || type.includes('spare')) return <Package className={className} />
  if (type.includes('machine') || type.includes('error')) return <AlertTriangle className={className} />
  if (type.includes('incident')) return <AlertCircle className={className} />
  if (type.includes('complaint')) return <MessageSquare className={className} />
  if (type.includes('report')) return <FileText className={className} />
  if (type.includes('component') || type.includes('maintenance')) return <Wrench className={className} />
  if (type.includes('washing')) return <Droplets className={className} />
  return <Bell className={className} />
}

function getTimeGroup(date: Date): TimeGroup {
  if (isToday(date)) return 'today'
  if (isYesterday(date)) return 'yesterday'
  if (isThisWeek(date)) return 'thisWeek'
  return 'earlier'
}

const TIME_GROUP_LABELS: Record<TimeGroup, string> = {
  today: 'Сегодня',
  yesterday: 'Вчера',
  thisWeek: 'На этой неделе',
  earlier: 'Ранее',
}

interface GroupedNotificationListProps {
  notifications: Notification[]
  isLoading?: boolean
  groupBy?: 'type' | 'time' | 'both'
}

export function GroupedNotificationList({
  notifications,
  isLoading,
  groupBy: _groupBy = 'both',
}: GroupedNotificationListProps) {
  const queryClient = useQueryClient()
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['today', 'yesterday']))
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set())

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
  })

  const markAllReadMutation = useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Все уведомления отмечены как прочитанные')
    },
  })

  // Group notifications by time, then by type
  const groupedNotifications = useMemo(() => {
    const timeGroups: Record<TimeGroup, Record<string, Notification[]>> = {
      today: {},
      yesterday: {},
      thisWeek: {},
      earlier: {},
    }

    notifications.forEach((n) => {
      const date = new Date(n.created_at)
      const timeGroup = getTimeGroup(date)
      const type = n.type

      if (!timeGroups[timeGroup][type]) {
        timeGroups[timeGroup][type] = []
      }
      timeGroups[timeGroup][type].push(n)
    })

    // Convert to structured format
    const result: TimeBasedGroup[] = []

    for (const timeGroupId of ['today', 'yesterday', 'thisWeek', 'earlier'] as TimeGroup[]) {
      const typeGroups = timeGroups[timeGroupId]
      const groups: NotificationGroup[] = []

      for (const [type, notifs] of Object.entries(typeGroups)) {
        groups.push({
          id: `${timeGroupId}-${type}`,
          label: notificationTypeLabels[type as NotificationType] || type,
          icon: getTypeIcon(type),
          notifications: notifs.sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ),
          unreadCount: notifs.filter(isUnread).length,
        })
      }

      if (groups.length > 0) {
        // Sort groups by unread count, then by notification count
        groups.sort((a, b) => b.unreadCount - a.unreadCount || b.notifications.length - a.notifications.length)

        result.push({
          id: timeGroupId,
          label: TIME_GROUP_LABELS[timeGroupId],
          groups,
        })
      }
    }

    return result
  }, [notifications])

  const toggleTimeGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }, [])

  const toggleTypeGroup = useCallback((groupId: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
      }
      return next
    })
  }, [])

  const markGroupAsRead = useCallback(
    async (groupNotifications: Notification[]) => {
      const unreadIds = groupNotifications.filter(isUnread).map((n) => n.id)
      for (const id of unreadIds) {
        await markReadMutation.mutateAsync(id)
      }
      toast.success(`${unreadIds.length} уведомлений отмечено как прочитанные`)
    },
    [markReadMutation]
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-12 bg-gray-100 rounded-lg mb-2" />
            <div className="space-y-2 pl-4">
              <div className="h-16 bg-gray-50 rounded-lg" />
              <div className="h-16 bg-gray-50 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-12">
        <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 font-medium">Нет уведомлений</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-500">
            {notifications.length} уведомлений
          </span>
          {notifications.filter(isUnread).length > 0 && (
            <span className="text-sm text-indigo-600 font-medium">
              ({notifications.filter(isUnread).length} новых)
            </span>
          )}
        </div>
        {notifications.filter(isUnread).length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-1" />
            Прочитать все
          </Button>
        )}
      </div>

      {/* Grouped List */}
      {groupedNotifications.map((timeGroup) => {
        const isTimeExpanded = expandedGroups.has(timeGroup.id)
        const totalUnread = timeGroup.groups.reduce((sum, g) => sum + g.unreadCount, 0)
        const totalCount = timeGroup.groups.reduce((sum, g) => sum + g.notifications.length, 0)

        return (
          <div key={timeGroup.id} className="space-y-2">
            {/* Time Group Header */}
            <button
              onClick={() => toggleTimeGroup(timeGroup.id)}
              className={cn(
                'w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all',
                'bg-gray-50 hover:bg-gray-100 dark:bg-slate-800 dark:hover:bg-slate-700',
                totalUnread > 0 && 'border-l-4 border-indigo-500'
              )}
            >
              <div className="flex items-center gap-3">
                {isTimeExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
                <span className="font-medium text-gray-900 dark:text-white">
                  {timeGroup.label}
                </span>
                <span className="text-sm text-gray-500">
                  {totalCount} уведомлений
                </span>
              </div>
              {totalUnread > 0 && (
                <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                  {totalUnread} новых
                </span>
              )}
            </button>

            {/* Type Groups */}
            {isTimeExpanded && (
              <div className="space-y-2 pl-4">
                {timeGroup.groups.map((typeGroup) => {
                  const isTypeExpanded = expandedTypes.has(typeGroup.id)
                  const showCollapsed = typeGroup.notifications.length > 3 && !isTypeExpanded

                  return (
                    <div
                      key={typeGroup.id}
                      className="bg-white dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 overflow-hidden"
                    >
                      {/* Type Header */}
                      <div
                        className={cn(
                          'flex items-center justify-between px-4 py-3',
                          'border-b border-gray-100 dark:border-slate-700',
                          typeGroup.unreadCount > 0 && 'bg-indigo-50/50 dark:bg-indigo-900/10'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300">
                            {typeGroup.icon}
                          </div>
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {typeGroup.label}
                            </span>
                            <span className="ml-2 text-sm text-gray-500">
                              ({typeGroup.notifications.length})
                            </span>
                          </div>
                          {typeGroup.unreadCount > 0 && (
                            <span className="w-2 h-2 rounded-full bg-indigo-500" />
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {typeGroup.unreadCount > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                markGroupAsRead(typeGroup.notifications)
                              }}
                              className="text-xs"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Прочитать
                            </Button>
                          )}
                          {typeGroup.notifications.length > 3 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleTypeGroup(typeGroup.id)}
                              className="text-xs"
                            >
                              {isTypeExpanded ? 'Свернуть' : `Показать все (${typeGroup.notifications.length})`}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Notifications */}
                      <div className="divide-y divide-gray-50 dark:divide-slate-700">
                        {(showCollapsed
                          ? typeGroup.notifications.slice(0, 3)
                          : typeGroup.notifications
                        ).map((notification) => (
                          <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onMarkRead={(id) => markReadMutation.mutate(id)}
                            onDelete={(id) => deleteMutation.mutate(id)}
                          />
                        ))}
                      </div>

                      {/* Show more indicator */}
                      {showCollapsed && (
                        <button
                          onClick={() => toggleTypeGroup(typeGroup.id)}
                          className="w-full px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors text-center"
                        >
                          + ещё {typeGroup.notifications.length - 3} уведомлений
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Individual notification item
interface NotificationItemProps {
  notification: Notification
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
}

function NotificationItem({ notification, onMarkRead, onDelete }: NotificationItemProps) {
  const unread = isUnread(notification)
  const priorityColor = getPriorityColor(notification.priority)

  return (
    <div
      className={cn(
        'px-4 py-3 transition-colors',
        unread ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p
              className={cn(
                'text-sm truncate',
                unread ? 'font-medium text-gray-900 dark:text-white' : 'text-gray-700 dark:text-slate-300'
              )}
            >
              {notification.title}
            </p>
            {notification.priority !== NotificationPriority.NORMAL && (
              <span className={cn('px-1.5 py-0.5 text-xs rounded border', priorityColor)}>
                {notification.priority === NotificationPriority.URGENT ? 'Срочно' : 'Важно'}
              </span>
            )}
            {unread && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
          </div>

          <p className="text-sm text-gray-500 dark:text-slate-400 line-clamp-2">
            {notification.message}
          </p>

          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true,
                locale: ru,
              })}
            </span>
            {notification.action_url && (
              <Link
                href={notification.action_url}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
              >
                Подробнее
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {unread && (
            <button
              onClick={() => onMarkRead(notification.id)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
              title="Отметить как прочитанное"
            >
              <Check className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(notification.id)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
            title="Удалить"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
