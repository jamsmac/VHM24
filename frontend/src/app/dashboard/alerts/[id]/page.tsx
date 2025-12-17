'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { alertsApi, AlertStatus, AlertSeverity } from '@/lib/alerts-api'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  BellRing,
  Info,
  MapPin,
  Package,
  MessageSquare,
} from 'lucide-react'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
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

const statusConfig: Record<AlertStatus, { label: string; color: string }> = {
  [AlertStatus.ACTIVE]: { label: 'Активно', color: 'bg-red-100 text-red-700' },
  [AlertStatus.ACKNOWLEDGED]: { label: 'Подтверждено', color: 'bg-yellow-100 text-yellow-700' },
  [AlertStatus.RESOLVED]: { label: 'Решено', color: 'bg-green-100 text-green-700' },
  [AlertStatus.ESCALATED]: { label: 'Эскалировано', color: 'bg-purple-100 text-purple-700' },
  [AlertStatus.EXPIRED]: { label: 'Истекло', color: 'bg-gray-100 text-gray-700' },
}

export default function AlertDetailPage() {
  const params = useParams()
  const queryClient = useQueryClient()
  const [note, setNote] = useState('')

  const { data: alert, isLoading } = useQuery({
    queryKey: ['alerts', 'detail', params.id],
    queryFn: () => alertsApi.getAlert(params.id as string),
    enabled: !!params.id,
  })

  const acknowledgeMutation = useMutation({
    mutationFn: () => alertsApi.acknowledgeAlert(params.id as string, note || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      setNote('')
      toast.success('Оповещение подтверждено')
    },
    onError: () => {
      toast.error('Ошибка при подтверждении оповещения')
    },
  })

  const resolveMutation = useMutation({
    mutationFn: () => alertsApi.resolveAlert(params.id as string, note || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      setNote('')
      toast.success('Оповещение решено')
    },
    onError: () => {
      toast.error('Ошибка при решении оповещения')
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  if (!alert) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Оповещение не найдено</p>
        <Link href="/dashboard/alerts">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к списку
          </Button>
        </Link>
      </div>
    )
  }

  const severity = severityConfig[alert.severity]
  const status = statusConfig[alert.status]
  const SeverityIcon = severity.icon

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/alerts">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Назад
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${severity.bg}`}>
              <SeverityIcon className={`h-6 w-6 ${severity.color}`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{alert.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                  {status.label}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${severity.bg} ${severity.color}`}>
                  {severity.label}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Message */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Сообщение</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{alert.message}</p>
          </div>

          {/* Metric Snapshot */}
          {alert.metric_snapshot && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Данные на момент срабатывания</h2>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-500">Метрика</dt>
                  <dd className="text-lg font-medium">{alert.metric_snapshot.metric}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Текущее значение</dt>
                  <dd className="text-lg font-medium">{alert.metric_snapshot.current_value}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Порог</dt>
                  <dd className="text-lg font-medium">{alert.metric_snapshot.threshold}</dd>
                </div>
                {alert.metric_snapshot.additional_data && (
                  <div className="col-span-2">
                    <dt className="text-sm text-gray-500 mb-2">Дополнительные данные</dt>
                    <dd className="text-sm bg-gray-50 p-3 rounded-md">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(alert.metric_snapshot.additional_data, null, 2)}
                      </pre>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Actions */}
          {(alert.status === AlertStatus.ACTIVE || alert.status === AlertStatus.ACKNOWLEDGED) && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4">Действия</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Комментарий (необязательно)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Добавьте комментарий..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    rows={3}
                  />
                </div>
                <div className="flex gap-3">
                  {alert.status === AlertStatus.ACTIVE && (
                    <Button
                      variant="outline"
                      onClick={() => acknowledgeMutation.mutate()}
                      disabled={acknowledgeMutation.isPending}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {acknowledgeMutation.isPending ? 'Подтверждение...' : 'Подтвердить'}
                    </Button>
                  )}
                  <Button
                    onClick={() => resolveMutation.mutate()}
                    disabled={resolveMutation.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    {resolveMutation.isPending ? 'Решение...' : 'Решить'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">История</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-red-100">
                  <BellRing className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Оповещение создано</p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(alert.triggered_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(alert.triggered_at), { addSuffix: true, locale: ru })}
                  </p>
                </div>
              </div>

              {alert.acknowledged_at && (
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-full bg-yellow-100">
                    <Check className="h-4 w-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Подтверждено</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(alert.acknowledged_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                    </p>
                    {alert.acknowledged_by && (
                      <p className="text-xs text-gray-400">
                        {alert.acknowledged_by.first_name} {alert.acknowledged_by.last_name}
                      </p>
                    )}
                    {alert.acknowledgement_note && (
                      <p className="text-xs text-gray-600 mt-1 italic">
                        "{alert.acknowledgement_note}"
                      </p>
                    )}
                  </div>
                </div>
              )}

              {alert.escalated_at && (
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-full bg-purple-100">
                    <AlertTriangle className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Эскалировано (уровень {alert.escalation_level})</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(alert.escalated_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                    </p>
                  </div>
                </div>
              )}

              {alert.resolved_at && (
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-full bg-green-100">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Решено</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(alert.resolved_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                    </p>
                    {alert.resolved_by && (
                      <p className="text-xs text-gray-400">
                        {alert.resolved_by.first_name} {alert.resolved_by.last_name}
                      </p>
                    )}
                    {alert.resolution_note && (
                      <p className="text-xs text-gray-600 mt-1 italic">
                        "{alert.resolution_note}"
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Related Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Связанные данные</h2>
            <div className="space-y-3">
              {alert.machine_id && (
                <Link
                  href={`/dashboard/machines/${alert.machine_id}`}
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800"
                >
                  <Package className="h-4 w-4" />
                  Перейти к аппарату
                </Link>
              )}
              {alert.location_id && (
                <Link
                  href={`/dashboard/locations/${alert.location_id}`}
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800"
                >
                  <MapPin className="h-4 w-4" />
                  Перейти к локации
                </Link>
              )}
              {alert.alert_rule && (
                <Link
                  href={`/dashboard/alerts/rules`}
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800"
                >
                  <MessageSquare className="h-4 w-4" />
                  Правило: {alert.alert_rule.name}
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
