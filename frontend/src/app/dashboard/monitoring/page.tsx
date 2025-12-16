'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { monitoringApi, formatUptime } from '@/lib/monitoring-api'
import { SystemHealthWidget } from '@/components/monitoring/SystemHealthWidget'
import { QueueDetailsCard } from '@/components/monitoring/QueueDetailsCard'
import { MemoryMetricsCard } from '@/components/monitoring/MemoryMetricsCard'
import { Button } from '@/components/ui/button'
import {
  Activity,
  RefreshCw,
  Server,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react'

type Tab = 'overview' | 'queues' | 'memory'

function HealthEndpointCard({
  title,
  endpoint,
  status,
  lastChecked,
}: {
  title: string
  endpoint: string
  status: 'ok' | 'error' | 'loading'
  lastChecked?: string
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium text-gray-900">{title}</h4>
          <p className="text-xs text-gray-500 font-mono mt-1">{endpoint}</p>
        </div>
        {status === 'ok' && (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        )}
        {status === 'error' && (
          <XCircle className="h-5 w-5 text-red-500" />
        )}
        {status === 'loading' && (
          <RefreshCw className="h-5 w-5 text-gray-400 animate-spin" />
        )}
      </div>
      {lastChecked && (
        <p className="text-xs text-gray-400 mt-2">
          Проверено: {lastChecked}
        </p>
      )}
    </div>
  )
}

export default function MonitoringPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  // Health check queries
  const healthQuery = useQuery({
    queryKey: ['health-check'],
    queryFn: () => monitoringApi.getHealth(),
    refetchInterval: 60000,
  })

  const readinessQuery = useQuery({
    queryKey: ['readiness-check'],
    queryFn: () => monitoringApi.getReadiness(),
    refetchInterval: 60000,
  })

  const livenessQuery = useQuery({
    queryKey: ['liveness-check'],
    queryFn: () => monitoringApi.getLiveness(),
    refetchInterval: 60000,
  })

  const refreshAll = () => {
    healthQuery.refetch()
    readinessQuery.refetch()
    livenessQuery.refetch()
  }

  const formatTimestamp = (ts?: string) => {
    if (!ts) return undefined
    return new Date(ts).toLocaleTimeString('ru-RU')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Мониторинг</h1>
          <p className="mt-2 text-gray-600">
            Состояние системы и метрики производительности
          </p>
        </div>
        <Button onClick={refreshAll} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить всё
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`
              pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
              ${activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <Activity className="h-4 w-4" />
            Обзор
          </button>
          <button
            onClick={() => setActiveTab('queues')}
            className={`
              pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
              ${activeTab === 'queues'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <Server className="h-4 w-4" />
            Очереди
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            className={`
              pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
              ${activeTab === 'memory'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <Clock className="h-4 w-4" />
            Память
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Main Health Widget */}
          <SystemHealthWidget />

          {/* Health Endpoints */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Эндпоинты проверки здоровья
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <HealthEndpointCard
                title="Health Check"
                endpoint="/health"
                status={healthQuery.isLoading ? 'loading' : healthQuery.data ? 'ok' : 'error'}
                lastChecked={formatTimestamp(healthQuery.data?.timestamp)}
              />
              <HealthEndpointCard
                title="Readiness"
                endpoint="/health/ready"
                status={readinessQuery.isLoading ? 'loading' : readinessQuery.data ? 'ok' : 'error'}
                lastChecked={formatTimestamp(readinessQuery.data?.timestamp)}
              />
              <HealthEndpointCard
                title="Liveness"
                endpoint="/health/live"
                status={livenessQuery.isLoading ? 'loading' : livenessQuery.data ? 'ok' : 'error'}
                lastChecked={formatTimestamp(livenessQuery.data?.timestamp)}
              />
            </div>
          </div>

          {/* Quick Stats */}
          {readinessQuery.data && (
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-indigo-100 text-sm">Время работы</p>
                  <p className="text-2xl font-bold mt-1">
                    {formatUptime(readinessQuery.data.uptime)}
                  </p>
                </div>
                <div>
                  <p className="text-indigo-100 text-sm">Окружение</p>
                  <p className="text-2xl font-bold mt-1 capitalize">
                    {readinessQuery.data.environment}
                  </p>
                </div>
                <div>
                  <p className="text-indigo-100 text-sm">Статус</p>
                  <p className="text-2xl font-bold mt-1 capitalize">
                    {readinessQuery.data.status}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Prometheus Link */}
          <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Prometheus метрики</h4>
              <p className="text-sm text-gray-500">
                Доступны расширенные метрики в формате Prometheus
              </p>
            </div>
            <a
              href="/api/metrics"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              /metrics
            </a>
          </div>
        </div>
      )}

      {activeTab === 'queues' && (
        <div className="space-y-6">
          <QueueDetailsCard />

          {/* Queue Info */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Информация об очередях</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>commission-calculations</strong> - обработка расчётов комиссий контрагентов</li>
              <li>• <strong>sales-import</strong> - фоновый импорт данных о продажах</li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'memory' && (
        <div className="space-y-6">
          <MemoryMetricsCard />

          {/* Memory Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Описание метрик</h4>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>
                <strong>RSS (Resident Set Size)</strong> - общий объём памяти, выделенный процессу
              </li>
              <li>
                <strong>Heap Total</strong> - общий размер кучи V8
              </li>
              <li>
                <strong>Heap Used</strong> - используемый размер кучи V8
              </li>
              <li>
                <strong>External</strong> - память, используемая объектами C++ привязанными к JavaScript
              </li>
              <li>
                <strong>Array Buffers</strong> - память для ArrayBuffer и SharedArrayBuffer
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
