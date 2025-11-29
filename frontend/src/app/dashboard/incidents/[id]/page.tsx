'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { incidentsApi } from '@/lib/incidents-api'
import { usersApi } from '@/lib/users-api'
import { UserRole } from '@/types/users'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, User, Calendar, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { formatDateTime, formatCurrency, getStatusColor, getPriorityColor } from '@/lib/utils'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'
import { toast } from 'react-toastify'
import { useState } from 'react'
import { queryClient } from '@/lib/query-client'
import { getErrorMessage } from '@/types/common'

// Type for cash discrepancy metadata
interface CashDiscrepancyMetadata {
  expected_amount: number
  actual_amount: number
  discrepancy_percent?: number
  task_id?: string
}

interface IncidentDetailPageProps {
  params: {
    id: string
  }
}

export default function IncidentDetailPage({ params }: IncidentDetailPageProps) {
  const [assignUserId, setAssignUserId] = useState('')

  const { data: incident, isLoading } = useQuery({
    queryKey: ['incidents', params.id],
    queryFn: () => incidentsApi.getById(params.id),
  })

  const { data: users } = useQuery({
    queryKey: ['users', 'operators'],
    queryFn: () => usersApi.getAll({ role: UserRole.OPERATOR }),
  })

  const assignMutation = useMutation({
    mutationFn: (userId: string) => incidentsApi.assign(params.id, userId),
    onSuccess: () => {
      toast.success('Инцидент назначен')
      queryClient.invalidateQueries({ queryKey: ['incidents', params.id] })
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Ошибка при назначении')
    },
  })

  const resolveMutation = useMutation({
    mutationFn: (notes: string) => incidentsApi.resolve(params.id, notes),
    onSuccess: () => {
      toast.success('Инцидент решен')
      queryClient.invalidateQueries({ queryKey: ['incidents', params.id] })
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Ошибка при решении')
    },
  })

  const closeMutation = useMutation({
    mutationFn: () => incidentsApi.close(params.id),
    onSuccess: () => {
      toast.success('Инцидент закрыт')
      queryClient.invalidateQueries({ queryKey: ['incidents', params.id] })
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Ошибка при закрытии')
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton />
      </div>
    )
  }

  if (!incident) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Инцидент не найден</p>
      </div>
    )
  }

  const typeLabels: Record<string, string> = {
    technical_failure: 'Техническая неисправность',
    out_of_stock: 'Закончился товар',
    cash_full: 'Переполнен купюроприемник',
    cash_discrepancy: 'Расхождение в инкассации',
    vandalism: 'Вандализм',
    power_outage: 'Отключение питания',
    other: 'Прочее',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/incidents">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{incident.incident_number}</h1>
            <p className="mt-2 text-gray-600">{typeLabels[incident.incident_type]}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge className={getStatusColor(incident.status)}>
            {incident.status}
          </Badge>
          <Badge className={getPriorityColor(incident.priority)}>
            {incident.priority}
          </Badge>
        </div>
      </div>

      {/* Cash Discrepancy Details */}
      {incident.incident_type === 'cash_discrepancy' && incident.metadata && (() => {
        const metadata = incident.metadata as unknown as CashDiscrepancyMetadata
        return (
          <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-orange-900 mb-3">
                  Обнаружено расхождение в инкассации
                </h3>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-orange-700">Ожидаемая сумма</dt>
                    <dd className="text-2xl font-bold text-orange-900">
                      {formatCurrency(metadata.expected_amount)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-orange-700">Фактическая сумма</dt>
                    <dd className="text-2xl font-bold text-orange-900">
                      {formatCurrency(metadata.actual_amount)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-orange-700">Разница</dt>
                    <dd className="text-2xl font-bold text-red-600">
                      {formatCurrency(Math.abs(metadata.expected_amount - metadata.actual_amount))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-orange-700">Процент расхождения</dt>
                    <dd className="text-2xl font-bold text-red-600">
                      {metadata.discrepancy_percent?.toFixed(2)}%
                    </dd>
                  </div>
                  {metadata.task_id && (
                    <div className="col-span-2">
                      <dt className="text-sm text-orange-700 mb-1">Связанная задача</dt>
                      <Link href={`/tasks/${metadata.task_id}`}>
                        <Button variant="secondary" size="sm">
                          Просмотреть задачу инкассации
                        </Button>
                      </Link>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Main Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Информация об инциденте</h3>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-600">Аппарат</dt>
            <dd className="font-medium text-gray-900">
              {incident.machine?.machine_number || '-'}
            </dd>
            <dd className="text-sm text-gray-500">{incident.machine?.location?.name}</dd>
          </div>
          <div>
            <dt className="text-gray-600">Создан</dt>
            <dd className="font-medium text-gray-900">
              {formatDateTime(incident.created_at)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-600">Создатель</dt>
            <dd className="font-medium text-gray-900">
              {incident.created_by?.full_name || '-'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-600">Назначен</dt>
            <dd className="font-medium text-gray-900">
              {incident.assigned_to?.full_name || 'Не назначен'}
            </dd>
          </div>
          {incident.resolved_at && (
            <div>
              <dt className="text-gray-600">Решен</dt>
              <dd className="font-medium text-gray-900">
                {formatDateTime(incident.resolved_at)}
              </dd>
            </div>
          )}
        </dl>

        {incident.description && (
          <div className="mt-4 pt-4 border-t">
            <dt className="text-sm text-gray-600 mb-2">Описание</dt>
            <dd className="text-gray-900">{incident.description}</dd>
          </div>
        )}

        {incident.resolution_notes && (
          <div className="mt-4 pt-4 border-t">
            <dt className="text-sm text-gray-600 mb-2">Решение</dt>
            <dd className="text-gray-900">{incident.resolution_notes}</dd>
          </div>
        )}
      </div>

      {/* Actions */}
      {incident.status !== 'closed' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Действия</h3>
          <div className="space-y-4">
            {/* Assign */}
            {incident.status === 'open' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Назначить оператору
                </label>
                <div className="flex gap-2">
                  <select
                    value={assignUserId}
                    onChange={(e) => setAssignUserId(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Выберите оператора</option>
                    {users?.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name}
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={() => assignUserId && assignMutation.mutate(assignUserId)}
                    disabled={!assignUserId || assignMutation.isPending}
                  >
                    Назначить
                  </Button>
                </div>
              </div>
            )}

            {/* Resolve */}
            {incident.status === 'in_progress' && (
              <div>
                <Button
                  onClick={() => {
                    const notes = prompt('Введите примечания о решении:')
                    if (notes) {resolveMutation.mutate(notes)}
                  }}
                  disabled={resolveMutation.isPending}
                >
                  Решить инцидент
                </Button>
              </div>
            )}

            {/* Close */}
            {incident.status === 'resolved' && (
              <div>
                <Button
                  onClick={() => closeMutation.mutate()}
                  disabled={closeMutation.isPending}
                >
                  Закрыть инцидент
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
