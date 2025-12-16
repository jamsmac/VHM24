'use client'

import { useQuery } from '@tanstack/react-query'
import { monitoringApi, formatBytes } from '@/lib/monitoring-api'
import {
  HardDrive,
  MemoryStick,
  Box,
  Layers,
  RefreshCw,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MetricBarProps {
  label: string
  value: number
  maxValue: number
  icon: React.ReactNode
  color: string
}

function MetricBar({ label, value, maxValue, icon, color }: MetricBarProps) {
  const percentage = (value / maxValue) * 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
          {icon}
          {label}
        </span>
        <span className="text-sm text-gray-500">
          {formatBytes(value)}
        </span>
      </div>
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-300`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 text-right">{percentage.toFixed(1)}%</p>
    </div>
  )
}

export function MemoryMetricsCard() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['monitoring-health'],
    queryFn: () => monitoringApi.getMonitoringHealth(),
    refetchInterval: 30000,
    staleTime: 10000,
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-3 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6 text-center">
        <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-600 font-medium">Ошибка загрузки метрик памяти</p>
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

  const { memory } = data
  // Calculate maximum for visualization (RSS is usually the largest)
  const maxMemory = memory.rss

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MemoryStick className="h-5 w-5 text-indigo-600" />
          Использование памяти
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

      <div className="space-y-6">
        <MetricBar
          label="RSS (Resident Set Size)"
          value={memory.rss}
          maxValue={maxMemory}
          icon={<HardDrive className="h-4 w-4 text-gray-500" />}
          color="bg-indigo-500"
        />

        <MetricBar
          label="Heap Total"
          value={memory.heapTotal}
          maxValue={maxMemory}
          icon={<Box className="h-4 w-4 text-gray-500" />}
          color="bg-blue-500"
        />

        <MetricBar
          label="Heap Used"
          value={memory.heapUsed}
          maxValue={maxMemory}
          icon={<Layers className="h-4 w-4 text-gray-500" />}
          color="bg-green-500"
        />

        <MetricBar
          label="External"
          value={memory.external}
          maxValue={maxMemory}
          icon={<Box className="h-4 w-4 text-gray-500" />}
          color="bg-purple-500"
        />

        <MetricBar
          label="Array Buffers"
          value={memory.arrayBuffers}
          maxValue={maxMemory}
          icon={<Layers className="h-4 w-4 text-gray-500" />}
          color="bg-orange-500"
        />
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-indigo-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-indigo-600">
              {formatBytes(memory.heapUsed)}
            </p>
            <p className="text-xs text-indigo-700">Heap используется</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-2xl font-bold text-gray-600">
              {formatBytes(memory.heapTotal)}
            </p>
            <p className="text-xs text-gray-700">Heap всего</p>
          </div>
        </div>
      </div>
    </div>
  )
}
