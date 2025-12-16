'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { auditLogApi, getEventIcon, getEventColor, eventTypeLabels } from '@/lib/audit-log-api'
import {
  Activity,
  ArrowRight,
  Clock,
  User,
  RefreshCw,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

interface RecentActivityWidgetProps {
  maxItems?: number
  showHeader?: boolean
}

export function RecentActivityWidget({ maxItems = 8, showHeader = true }: RecentActivityWidgetProps) {
  const { data: activities, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['audit-log', 'recent', maxItems],
    queryFn: () => auditLogApi.getRecentActivity(maxItems),
    staleTime: 30000,
    refetchInterval: 60000,
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {showHeader && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Activity className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Последняя активность</h3>
                <p className="text-sm text-gray-500">События системы</p>
              </div>
            </div>
          </div>
        )}
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Activity className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Последняя активность</h3>
              <p className="text-sm text-gray-500">События системы в реальном времени</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
              title="Обновить"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/dashboard/audit"
              className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              Все события
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {activities && activities.length > 0 ? (
        <div className="space-y-1">
          {activities.map((activity, index) => {
            const eventColor = getEventColor(activity.event_type)
            const eventIcon = getEventIcon(activity.event_type)

            return (
              <div
                key={activity.id}
                className={`flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors ${
                  index === 0 ? 'bg-indigo-50/50' : ''
                }`}
              >
                <div className={`p-1.5 rounded-full ${eventColor.split(' ')[1]}`}>
                  <span className="text-sm">{eventIcon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 line-clamp-1">
                    {eventTypeLabels[activity.event_type] || activity.event_type}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    {activity.user && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {activity.user.first_name} {activity.user.last_name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(activity.created_at), {
                        addSuffix: true,
                        locale: ru,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Нет недавних событий</p>
        </div>
      )}
    </div>
  )
}

// Compact version for smaller spaces
export function RecentActivityCompact({ maxItems = 5 }: { maxItems?: number }) {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['audit-log', 'recent', maxItems],
    queryFn: () => auditLogApi.getRecentActivity(maxItems),
    staleTime: 30000,
  })

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-200 rounded-full" />
            <div className="flex-1 h-4 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {activities?.slice(0, maxItems).map((activity) => {
        const eventIcon = getEventIcon(activity.event_type)
        return (
          <div key={activity.id} className="flex items-center gap-2 text-sm">
            <span>{eventIcon}</span>
            <span className="text-gray-600 truncate flex-1">
              {eventTypeLabels[activity.event_type] || activity.event_type}
            </span>
            <span className="text-xs text-gray-400 shrink-0">
              {formatDistanceToNow(new Date(activity.created_at), {
                addSuffix: false,
                locale: ru,
              })}
            </span>
          </div>
        )
      })}
    </div>
  )
}
