'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { alertsApi, AlertStatus, AlertSeverity, AlertHistory } from '@/lib/alerts-api'
import { Button } from '@/components/ui/button'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import {
  Bell,
  BellRing,
  Filter,
  Check,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Settings,
  Clock,
} from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow, format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { toast } from 'sonner'

const severityConfig = {
  [AlertSeverity.INFO]: {
    icon: Info,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    label: 'Информация',
  },
  [AlertSeverity.WARNING]: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    label: 'Предупреждение',
  },
  [AlertSeverity.CRITICAL]: {
    icon: AlertCircle,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    label: 'Критично',
  },
  [AlertSeverity.EMERGENCY]: {
    icon: BellRing,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    label: 'Экстренно',
  },
}

const statusLabels: Record<AlertStatus, string> = {
  [AlertStatus.ACTIVE]: 'Активно',
  [AlertStatus.ACKNOWLEDGED]: 'Подтверждено',
  [AlertStatus.RESOLVED]: 'Решено',
  [AlertStatus.ESCALATED]: 'Эскалировано',
  [AlertStatus.EXPIRED]: 'Истекло',
}

function AlertCard({ alert, onAcknowledge, onResolve }: {
  alert: AlertHistory
  onAcknowledge: (id: string) => void
  onResolve: (id: string) => void
}) {
  const severity = severityConfig[alert.severity]
  const SeverityIcon = severity.icon

  return (
    <div className={`rounded-lg border ${severity.border} ${severity.bg} p-4`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${severity.bg}`}>
            <SeverityIcon className={`h-5 w-5 ${severity.color}`} />
          </div>
          <div className="flex-1">
            <Link href={`/dashboard/alerts/${alert.id}`} className="hover:underline">
              <h3 className="font-semibold text-gray-900">{alert.title}</h3>
            </Link>
            <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(alert.triggered_at), {
                  addSuffix: true,
                  locale: ru,
                })}
              </span>
              <span className={`px-2 py-0.5 rounded-full ${
                alert.status === AlertStatus.ACTIVE
                  ? 'bg-red-100 text-red-700'
                  : alert.status === AlertStatus.ACKNOWLEDGED
                  ? 'bg-yellow-100 text-yellow-700'
                  : alert.status === AlertStatus.RESOLVED
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {statusLabels[alert.status]}
              </span>
            </div>
          </div>
        </div>
      </div>

      {alert.status === AlertStatus.ACTIVE && (
        <div className="flex gap-2 mt-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAcknowledge(alert.id)}
          >
            <Check className="h-4 w-4 mr-1" />
            Подтвердить
          </Button>
          <Button
            size="sm"
            onClick={() => onResolve(alert.id)}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Решить
          </Button>
        </div>
      )}

      {alert.status === AlertStatus.ACKNOWLEDGED && (
        <div className="flex gap-2 mt-4">
          <Button
            size="sm"
            onClick={() => onResolve(alert.id)}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Решить
          </Button>
        </div>
      )}

      {alert.acknowledged_at && (
        <div className="mt-3 text-xs text-gray-500">
          Подтверждено: {format(new Date(alert.acknowledged_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
          {alert.acknowledged_by && ` (${alert.acknowledged_by.first_name} ${alert.acknowledged_by.last_name})`}
        </div>
      )}

      {alert.resolved_at && (
        <div className="mt-1 text-xs text-gray-500">
          Решено: {format(new Date(alert.resolved_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
          {alert.resolved_by && ` (${alert.resolved_by.first_name} ${alert.resolved_by.last_name})`}
        </div>
      )}
    </div>
  )
}

export default function AlertsPage() {
  const [statusFilter, setStatusFilter] = useState<AlertStatus | ''>('')
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | ''>('')
  const queryClient = useQueryClient()

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts', 'history', statusFilter, severityFilter],
    queryFn: () => alertsApi.getHistory({
      status: statusFilter || undefined,
      severity: severityFilter || undefined,
    }),
  })

  const { data: statistics } = useQuery({
    queryKey: ['alerts', 'statistics'],
    queryFn: () => alertsApi.getStatistics(),
  })

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => alertsApi.acknowledgeAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast.success('Оповещение подтверждено')
    },
    onError: () => {
      toast.error('Ошибка при подтверждении оповещения')
    },
  })

  const resolveMutation = useMutation({
    mutationFn: (id: string) => alertsApi.resolveAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast.success('Оповещение решено')
    },
    onError: () => {
      toast.error('Ошибка при решении оповещения')
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Оповещения</h1>
          <p className="mt-2 text-gray-600">Мониторинг и управление оповещениями системы</p>
        </div>
        <Link href="/dashboard/alerts/rules">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Правила оповещений
          </Button>
        </Link>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">Всего</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">{statistics.total}</p>
          </div>
          <div className="bg-red-50 rounded-lg border border-red-200 p-4">
            <div className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-red-500" />
              <span className="text-sm text-red-600">Активных</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-red-700">{statistics.active_count}</p>
          </div>
          <div className="bg-green-50 rounded-lg border border-green-200 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm text-green-600">Решено</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-green-700">
              {statistics.by_status.find(s => s.status === AlertStatus.RESOLVED)?.count || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">Ср. время решения</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {statistics.avg_resolution_time_minutes
                ? `${Math.round(statistics.avg_resolution_time_minutes)} мин`
                : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-gray-600" />
          <h3 className="font-medium text-gray-900">Фильтры</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AlertStatus | '')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Все статусы</option>
            <option value={AlertStatus.ACTIVE}>Активно</option>
            <option value={AlertStatus.ACKNOWLEDGED}>Подтверждено</option>
            <option value={AlertStatus.RESOLVED}>Решено</option>
            <option value={AlertStatus.ESCALATED}>Эскалировано</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as AlertSeverity | '')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Все уровни</option>
            <option value={AlertSeverity.INFO}>Информация</option>
            <option value={AlertSeverity.WARNING}>Предупреждение</option>
            <option value={AlertSeverity.CRITICAL}>Критично</option>
            <option value={AlertSeverity.EMERGENCY}>Экстренно</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : alerts && alerts.length > 0 ? (
          alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onAcknowledge={(id) => acknowledgeMutation.mutate(id)}
              onResolve={(id) => resolveMutation.mutate(id)}
            />
          ))
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Оповещения не найдены</p>
          </div>
        )}
      </div>
    </div>
  )
}
