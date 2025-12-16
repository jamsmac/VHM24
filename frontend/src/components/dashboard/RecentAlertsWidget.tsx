'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { alertsApi, AlertSeverity, AlertStatus, AlertHistory } from '@/lib/alerts-api'
import { AlertTriangle, AlertCircle, Info, BellRing, Check, CheckCircle2, Clock } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

const severityConfig = {
  [AlertSeverity.INFO]: {
    icon: Info,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  [AlertSeverity.WARNING]: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
  },
  [AlertSeverity.CRITICAL]: {
    icon: AlertCircle,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
  },
  [AlertSeverity.EMERGENCY]: {
    icon: BellRing,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
}

function AlertItem({ alert, onAcknowledge, onResolve }: {
  alert: AlertHistory
  onAcknowledge: (id: string) => void
  onResolve: (id: string) => void
}) {
  const severity = severityConfig[alert.severity]
  const Icon = severity.icon

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${severity.bg} ${severity.border} border`}>
      <div className={`p-1.5 rounded-full ${severity.bg}`}>
        <Icon className={`h-4 w-4 ${severity.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <Link href={`/dashboard/alerts/${alert.id}`} className="hover:underline">
          <h4 className="font-medium text-gray-900 text-sm truncate">{alert.title}</h4>
        </Link>
        <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{alert.message}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(alert.triggered_at), {
              addSuffix: true,
              locale: ru,
            })}
          </span>
        </div>
      </div>
      {alert.status === AlertStatus.ACTIVE && (
        <div className="flex gap-1 flex-shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.preventDefault()
              onAcknowledge(alert.id)
            }}
            title="Подтвердить"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={(e) => {
              e.preventDefault()
              onResolve(alert.id)
            }}
            title="Решить"
          >
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

export function RecentAlertsWidget() {
  const queryClient = useQueryClient()

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['alerts', 'recent'],
    queryFn: () => alertsApi.getHistory({ status: AlertStatus.ACTIVE, limit: 5 }),
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => alertsApi.acknowledgeAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast.success('Оповещение подтверждено')
    },
    onError: () => {
      toast.error('Ошибка при подтверждении')
    },
  })

  const resolveMutation = useMutation({
    mutationFn: (id: string) => alertsApi.resolveAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      toast.success('Оповещение решено')
    },
    onError: () => {
      toast.error('Ошибка при решении')
    },
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const activeAlerts = alerts || []

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-semibold text-gray-900">Активные оповещения</h2>
        </div>
        <Link
          href="/dashboard/alerts?status=active"
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Все активные →
        </Link>
      </div>

      {activeAlerts.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
          <p className="text-gray-500">Нет активных оповещений</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeAlerts.map((alert) => (
            <AlertItem
              key={alert.id}
              alert={alert}
              onAcknowledge={(id) => acknowledgeMutation.mutate(id)}
              onResolve={(id) => resolveMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
