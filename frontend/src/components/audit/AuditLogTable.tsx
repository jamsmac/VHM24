'use client'

import { useState } from 'react'
import {
  AuditLog,
  AuditEventType,
  AuditSeverity,
  eventTypeLabels,
  severityLabels,
  getSeverityColor,
  formatUserAgent,
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
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Button } from '@/components/ui/button'

interface AuditLogTableProps {
  logs: AuditLog[]
  isLoading?: boolean
  showUser?: boolean
}

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

function AuditLogRow({ log, showUser }: { log: AuditLog; showUser: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const severityColors = getSeverityColor(log.severity)

  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors">
        <td className="px-4 py-3 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded ${severityColors}`}>
              {getEventIcon(log.event_type)}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {eventTypeLabels[log.event_type] || log.event_type}
              </p>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(log.created_at), {
                  addSuffix: true,
                  locale: ru,
                })}
              </p>
            </div>
          </div>
        </td>

        {showUser && (
          <td className="px-4 py-3 whitespace-nowrap">
            {log.user ? (
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {log.user.first_name} {log.user.last_name}
                </p>
                <p className="text-xs text-gray-500">{log.user.email}</p>
              </div>
            ) : (
              <span className="text-sm text-gray-400">—</span>
            )}
          </td>
        )}

        <td className="px-4 py-3 whitespace-nowrap">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${severityColors}`}
          >
            {severityLabels[log.severity]}
          </span>
        </td>

        <td className="px-4 py-3 whitespace-nowrap">
          {log.success ? (
            <span className="inline-flex items-center gap-1 text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Успешно</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-red-600">
              <XCircle className="h-4 w-4" />
              <span className="text-sm">Ошибка</span>
            </span>
          )}
        </td>

        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
          {log.ip_address || '—'}
        </td>

        <td className="px-4 py-3 whitespace-nowrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-gray-50">
          <td colSpan={showUser ? 6 : 5} className="px-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Детали события</h4>
                <dl className="space-y-1">
                  <div className="flex">
                    <dt className="w-32 text-gray-500">Время:</dt>
                    <dd className="text-gray-900">
                      {format(new Date(log.created_at), 'dd.MM.yyyy HH:mm:ss', { locale: ru })}
                    </dd>
                  </div>
                  {log.description && (
                    <div className="flex">
                      <dt className="w-32 text-gray-500">Описание:</dt>
                      <dd className="text-gray-900">{log.description}</dd>
                    </div>
                  )}
                  {log.error_message && (
                    <div className="flex">
                      <dt className="w-32 text-gray-500">Ошибка:</dt>
                      <dd className="text-red-600">{log.error_message}</dd>
                    </div>
                  )}
                  {log.user_agent && (
                    <div className="flex">
                      <dt className="w-32 text-gray-500">Браузер:</dt>
                      <dd className="text-gray-900">{formatUserAgent(log.user_agent)}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {log.target_user && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Целевой пользователь</h4>
                  <dl className="space-y-1">
                    <div className="flex">
                      <dt className="w-32 text-gray-500">Имя:</dt>
                      <dd className="text-gray-900">
                        {log.target_user.first_name} {log.target_user.last_name}
                      </dd>
                    </div>
                    <div className="flex">
                      <dt className="w-32 text-gray-500">Email:</dt>
                      <dd className="text-gray-900">{log.target_user.email}</dd>
                    </div>
                  </dl>
                </div>
              )}

              {log.metadata && Object.keys(log.metadata).length > 0 && (
                <div className="col-span-2">
                  <h4 className="font-medium text-gray-900 mb-2">Метаданные</h4>
                  <pre className="bg-gray-100 rounded p-2 text-xs overflow-x-auto">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export function AuditLogTable({ logs, isLoading, showUser = true }: AuditLogTableProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded mb-2" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-gray-100 rounded mb-2" />
        ))}
      </div>
    )
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
        <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Нет записей аудита</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Событие
            </th>
            {showUser && (
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Пользователь
              </th>
            )}
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Важность
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Статус
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              IP адрес
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">

            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {logs.map((log) => (
            <AuditLogRow key={log.id} log={log} showUser={showUser} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
