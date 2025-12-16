'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  auditLogApi,
  AuditLog,
  AuditEventType,
  eventTypeLabels,
  getSeverityColor,
  isSecurityEvent,
} from '@/lib/audit-log-api'
import {
  LogIn,
  LogOut,
  Key,
  Shield,
  User,
  UserCog,
  Lock,
  AlertTriangle,
  Monitor,
  Activity,
  CheckCircle,
  XCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Button } from '@/components/ui/button'

function getEventIcon(eventType: AuditEventType) {
  const iconClass = 'h-4 w-4'

  if (eventType.includes('login') || eventType.includes('logout')) {
    return eventType === AuditEventType.LOGOUT ? (
      <LogOut className={iconClass} />
    ) : (
      <LogIn className={iconClass} />
    )
  }
  if (eventType.includes('password')) return <Key className={iconClass} />
  if (eventType.includes('2fa')) return <Shield className={iconClass} />
  if (eventType.includes('account')) return <User className={iconClass} />
  if (eventType.includes('role') || eventType.includes('permission')) return <UserCog className={iconClass} />
  if (eventType.includes('access')) return <Lock className={iconClass} />
  if (eventType.includes('brute') || eventType.includes('blocked') || eventType.includes('suspicious')) {
    return <AlertTriangle className={iconClass} />
  }
  if (eventType.includes('session')) return <Monitor className={iconClass} />

  return <Activity className={iconClass} />
}

function ActivityItem({ log }: { log: AuditLog }) {
  const severityColors = getSeverityColor(log.severity)
  const isSecure = isSecurityEvent(log)

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${isSecure ? 'bg-red-50' : 'hover:bg-gray-50'} transition-colors`}>
      <div className={`p-2 rounded-full ${severityColors}`}>
        {getEventIcon(log.event_type)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 truncate">
            {eventTypeLabels[log.event_type] || log.event_type}
          </p>
          {log.success ? (
            <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
          )}
        </div>

        {log.user && (
          <p className="text-xs text-gray-600 truncate">
            {log.user.first_name} {log.user.last_name}
          </p>
        )}

        <p className="text-xs text-gray-400 mt-0.5">
          {formatDistanceToNow(new Date(log.created_at), {
            addSuffix: true,
            locale: ru,
          })}
          {log.ip_address && ` • ${log.ip_address}`}
        </p>
      </div>
    </div>
  )
}

interface ActivityFeedProps {
  limit?: number
  compact?: boolean
}

export function ActivityFeed({ limit = 8, compact = false }: ActivityFeedProps) {
  const { data: logs, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['audit-logs', 'recent', limit],
    queryFn: () => auditLogApi.getRecentActivity(limit),
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000,
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 rounded w-1/3" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-8 w-8 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-1">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-4 text-center">
        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-600 font-medium">Ошибка загрузки</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="mt-3"
        >
          Повторить
        </Button>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            Активность
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {logs && logs.length > 0 ? (
            logs.slice(0, 5).map((log) => (
              <ActivityItem key={log.id} log={log} />
            ))
          ) : (
            <p className="text-center text-gray-500 py-4">Нет активности</p>
          )}
        </div>

        <Link
          href="/dashboard/audit"
          className="flex items-center justify-center gap-1 mt-4 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Все записи
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            Последняя активность
          </h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
            <Link href="/dashboard/audit">
              <Button variant="outline" size="sm">
                Все записи
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
        {logs && logs.length > 0 ? (
          logs.map((log) => (
            <div key={log.id} className="p-2">
              <ActivityItem log={log} />
            </div>
          ))
        ) : (
          <div className="p-8 text-center">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Нет активности за последние 24 часа</p>
          </div>
        )}
      </div>
    </div>
  )
}
