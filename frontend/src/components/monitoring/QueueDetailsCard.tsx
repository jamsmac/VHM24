'use client'

import { useQuery } from '@tanstack/react-query'
import { monitoringApi, QueueStats } from '@/lib/monitoring-api'
import {
  Layers,
  Clock,
  Play,
  CheckCircle,
  XCircle,
  Timer,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const queueNameLabels: Record<string, string> = {
  'commission-calculations': 'Расчёт комиссий',
  'sales-import': 'Импорт продаж',
}

interface QueueCardProps {
  name: string
  stats: QueueStats
}

function QueueCard({ name, stats }: QueueCardProps) {
  const total = stats.waiting + stats.active + stats.completed + stats.failed + stats.delayed
  const successRate = total > 0 ? ((stats.completed / total) * 100).toFixed(1) : '100'

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="h-5 w-5 text-indigo-600" />
        <h4 className="font-medium text-gray-900">
          {queueNameLabels[name] || name}
        </h4>
      </div>

      <div className="grid grid-cols-5 gap-2 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center h-8 w-8 mx-auto mb-1 rounded-full bg-yellow-100">
            <Clock className="h-4 w-4 text-yellow-600" />
          </div>
          <p className="text-lg font-bold text-yellow-600">{stats.waiting}</p>
          <p className="text-xs text-gray-500">Ожидает</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center h-8 w-8 mx-auto mb-1 rounded-full bg-blue-100">
            <Play className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-lg font-bold text-blue-600">{stats.active}</p>
          <p className="text-xs text-gray-500">Активно</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center h-8 w-8 mx-auto mb-1 rounded-full bg-green-100">
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-lg font-bold text-green-600">{stats.completed}</p>
          <p className="text-xs text-gray-500">Выполнено</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center h-8 w-8 mx-auto mb-1 rounded-full bg-red-100">
            <XCircle className="h-4 w-4 text-red-600" />
          </div>
          <p className="text-lg font-bold text-red-600">{stats.failed}</p>
          <p className="text-xs text-gray-500">Ошибки</p>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center h-8 w-8 mx-auto mb-1 rounded-full bg-purple-100">
            <Timer className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-lg font-bold text-purple-600">{stats.delayed}</p>
          <p className="text-xs text-gray-500">Отложено</p>
        </div>
      </div>

      <div className="pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Успешность:</span>
          <span className={`font-medium ${parseFloat(successRate) >= 95 ? 'text-green-600' : parseFloat(successRate) >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
            {successRate}%
          </span>
        </div>
      </div>
    </div>
  )
}

export function QueueDetailsCard() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['queue-health'],
    queryFn: () => monitoringApi.getQueueHealth(),
    refetchInterval: 15000, // Refresh every 15 seconds
    staleTime: 5000,
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6 text-center">
        <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-600 font-medium">Ошибка загрузки очередей</p>
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

  const queues = Object.entries(data.queues)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Layers className="h-5 w-5 text-indigo-600" />
          Очереди задач
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {queues.map(([name, stats]) => (
          <QueueCard key={name} name={name} stats={stats} />
        ))}
      </div>
    </div>
  )
}
