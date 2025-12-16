'use client'

import { useQuery } from '@tanstack/react-query'
import { monitoringApi, formatUptime, getHealthColor, getHealthBg, DashboardStats } from '@/lib/monitoring-api'
import {
  Database,
  Server,
  Layers,
  Clock,
  HardDrive,
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HealthIndicatorProps {
  label: string
  status: 'up' | 'down'
  icon: React.ReactNode
}

function HealthIndicator({ label, status, icon }: HealthIndicatorProps) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${getHealthBg(status)}`}>
      <div className={getHealthColor(status)}>{icon}</div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className={`text-xs ${getHealthColor(status)}`}>
          {status === 'up' ? 'Работает' : 'Недоступен'}
        </p>
      </div>
      {status === 'up' ? (
        <CheckCircle2 className={`h-5 w-5 ${getHealthColor(status)}`} />
      ) : (
        <XCircle className={`h-5 w-5 ${getHealthColor(status)}`} />
      )}
    </div>
  )
}

interface MemoryProgressProps {
  used: number
  total: number
  percentage: number
}

function MemoryProgress({ used, total, percentage }: MemoryProgressProps) {
  const getBarColor = (pct: number) => {
    if (pct < 60) return 'bg-green-500'
    if (pct < 80) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Память</span>
        <span className="text-sm text-gray-500">
          {used.toFixed(0)} MB / {total.toFixed(0)} MB
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getBarColor(percentage)} transition-all duration-300`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 text-right">{percentage.toFixed(1)}% использовано</p>
    </div>
  )
}

interface QueueStatsDisplayProps {
  stats: DashboardStats['queues']
}

function QueueStatsDisplay({ stats }: QueueStatsDisplayProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      <div className="text-center p-2 bg-yellow-50 rounded-lg">
        <p className="text-lg font-bold text-yellow-600">{stats.totalWaiting}</p>
        <p className="text-xs text-yellow-700">Ожидает</p>
      </div>
      <div className="text-center p-2 bg-blue-50 rounded-lg">
        <p className="text-lg font-bold text-blue-600">{stats.totalActive}</p>
        <p className="text-xs text-blue-700">Активно</p>
      </div>
      <div className="text-center p-2 bg-green-50 rounded-lg">
        <p className="text-lg font-bold text-green-600">{stats.totalCompleted}</p>
        <p className="text-xs text-green-700">Выполнено</p>
      </div>
      <div className="text-center p-2 bg-red-50 rounded-lg">
        <p className="text-lg font-bold text-red-600">{stats.totalFailed}</p>
        <p className="text-xs text-red-700">Ошибки</p>
      </div>
    </div>
  )
}

interface SystemHealthWidgetProps {
  compact?: boolean
}

export function SystemHealthWidget({ compact = false }: SystemHealthWidgetProps) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => monitoringApi.getDashboardStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000,
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded" />
            ))}
          </div>
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <div className="text-center">
          <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-600 font-medium">Ошибка загрузки</p>
          <p className="text-sm text-gray-500 mt-1">Не удалось получить статус системы</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="mt-3"
          >
            Повторить
          </Button>
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            Состояние системы
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

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className={`text-center p-2 rounded-lg ${getHealthBg(data.health.database)}`}>
            <Database className={`h-5 w-5 mx-auto ${getHealthColor(data.health.database)}`} />
            <p className="text-xs mt-1 font-medium">БД</p>
          </div>
          <div className={`text-center p-2 rounded-lg ${getHealthBg(data.health.cache)}`}>
            <Server className={`h-5 w-5 mx-auto ${getHealthColor(data.health.cache)}`} />
            <p className="text-xs mt-1 font-medium">Кэш</p>
          </div>
          <div className={`text-center p-2 rounded-lg ${getHealthBg(data.health.queues)}`}>
            <Layers className={`h-5 w-5 mx-auto ${getHealthColor(data.health.queues)}`} />
            <p className="text-xs mt-1 font-medium">Очереди</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {formatUptime(data.uptime)}
          </span>
          <span className="flex items-center gap-1">
            <HardDrive className="h-4 w-4" />
            {data.memory.percentage.toFixed(0)}%
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Activity className="h-5 w-5 text-indigo-600" />
          Состояние системы
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      {/* Health Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <HealthIndicator
          label="База данных"
          status={data.health.database}
          icon={<Database className="h-5 w-5" />}
        />
        <HealthIndicator
          label="Кэш (Redis)"
          status={data.health.cache}
          icon={<Server className="h-5 w-5" />}
        />
        <HealthIndicator
          label="Очереди"
          status={data.health.queues}
          icon={<Layers className="h-5 w-5" />}
        />
      </div>

      {/* Uptime & Memory */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-gray-600" />
            <span className="font-medium text-gray-900">Время работы</span>
          </div>
          <p className="text-2xl font-bold text-indigo-600">{formatUptime(data.uptime)}</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <MemoryProgress
            used={data.memory.used}
            total={data.memory.total}
            percentage={data.memory.percentage}
          />
        </div>
      </div>

      {/* Queue Stats */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
          <Layers className="h-4 w-4 text-gray-600" />
          Статистика очередей
        </h4>
        <QueueStatsDisplay stats={data.queues} />
      </div>
    </div>
  )
}
