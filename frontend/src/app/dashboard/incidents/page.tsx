'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { incidentsApi } from '@/lib/incidents-api'
import { IncidentCard } from '@/components/incidents/IncidentCard'
import { Button } from '@/components/ui/button'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import { Plus, Filter } from 'lucide-react'
import Link from 'next/link'
import { IncidentStatus, IncidentType, IncidentPriority } from '@/types/incidents'

export default function IncidentsPage() {
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | undefined>()
  const [typeFilter, setTypeFilter] = useState<IncidentType | undefined>()
  const [priorityFilter, setPriorityFilter] = useState<IncidentPriority | undefined>()

  const { data: incidents, isLoading } = useQuery({
    queryKey: ['incidents', statusFilter, typeFilter, priorityFilter],
    queryFn: () => incidentsApi.getAll({
      status: statusFilter,
      type: typeFilter,
      priority: priorityFilter,
    }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Инциденты</h1>
          <p className="mt-2 text-gray-600">Управление инцидентами и проблемами</p>
        </div>
        <Link href="/dashboard/incidents/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Создать инцидент
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-gray-600" />
          <h3 className="font-medium text-gray-900">Фильтры</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={statusFilter || ''}
            onChange={(e) => setStatusFilter(e.target.value as IncidentStatus || undefined)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Все статусы</option>
            <option value="open">Открыт</option>
            <option value="in_progress">В работе</option>
            <option value="resolved">Решен</option>
            <option value="closed">Закрыт</option>
          </select>

          <select
            value={typeFilter || ''}
            onChange={(e) => setTypeFilter(e.target.value as IncidentType || undefined)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Все типы</option>
            <option value="technical_failure">Техническая неисправность</option>
            <option value="out_of_stock">Закончился товар</option>
            <option value="cash_full">Переполнен купюроприемник</option>
            <option value="cash_discrepancy">Расхождение в инкассации</option>
            <option value="vandalism">Вандализм</option>
            <option value="power_outage">Отключение питания</option>
            <option value="other">Прочее</option>
          </select>

          <select
            value={priorityFilter || ''}
            onChange={(e) => setPriorityFilter(e.target.value as IncidentPriority || undefined)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Все приоритеты</option>
            <option value="low">Низкий</option>
            <option value="medium">Средний</option>
            <option value="high">Высокий</option>
            <option value="critical">Критичный</option>
          </select>
        </div>
      </div>

      {/* Incidents List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
        ) : incidents && incidents.length > 0 ? (
          incidents.map((incident) => <IncidentCard key={incident.id} incident={incident} />)
        ) : (
          <div className="col-span-full">
            <p className="text-gray-500 text-center py-12">Инциденты не найдены</p>
          </div>
        )}
      </div>
    </div>
  )
}
