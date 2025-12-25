'use client'

import { useQuery } from '@tanstack/react-query'
import { alertsApi, AlertSeverity } from '@/lib/alerts-api'
import { AlertTriangle, AlertCircle, Info, BellRing, Bell } from 'lucide-react'
import Link from 'next/link'

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
    label: 'Предупреждения',
  },
  [AlertSeverity.CRITICAL]: {
    icon: AlertCircle,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    label: 'Критичные',
  },
  [AlertSeverity.EMERGENCY]: {
    icon: BellRing,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    label: 'Экстренные',
  },
}

export function AlertsSummaryWidget() {
  const { data: statistics, isLoading } = useQuery({
    queryKey: ['alerts', 'statistics'],
    queryFn: () => alertsApi.getStatistics(),
    refetchInterval: 60000, // Refresh every minute
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 w-32 bg-gray-200 rounded mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const severityCounts = statistics?.by_severity?.reduce(
    (acc, item) => {
      acc[item.severity] = item.count
      return acc
    },
    {} as Record<string, number>
  ) || {}

  const totalActive = statistics?.active_count || 0

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Оповещения</h2>
          {totalActive > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
              {totalActive} активных
            </span>
          )}
        </div>
        <Link
          href="/dashboard/alerts"
          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Все оповещения →
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(severityConfig).map(([severity, config]) => {
          const count = severityCounts[severity] || 0
          const Icon = config.icon

          return (
            <Link
              key={severity}
              href={`/dashboard/alerts?severity=${severity}`}
              className={`rounded-lg border ${config.border} ${config.bg} p-4 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${config.color}`} />
                <span className={`text-2xl font-bold ${config.color}`}>{count}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{config.label}</p>
            </Link>
          )
        })}
      </div>

      {statistics && (
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <span>Всего оповещений: {statistics.total}</span>
          {statistics.avg_resolution_time_minutes && (
            <span>
              Среднее время решения: {Math.round(statistics.avg_resolution_time_minutes)} мин
            </span>
          )}
        </div>
      )}
    </div>
  )
}
