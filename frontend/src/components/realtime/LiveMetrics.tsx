'use client'

import { useEffect, useState } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { DollarSign, TrendingUp, Clock, AlertTriangle } from 'lucide-react'

interface DashboardMetrics {
  totalRevenue: number
  totalCommissions: number
  pendingPayments: number
  overduePayments: number
  activeContracts: number
  timestamp: string
}

interface LiveMetricsProps {
  initialData?: DashboardMetrics
  refreshInterval?: number
}

/**
 * Live Metrics Component
 *
 * Displays real-time dashboard metrics using WebSocket updates
 *
 * Features:
 * - Real-time metric updates via WebSocket
 * - Animated value changes
 * - Color-coded indicators
 * - Last update timestamp
 */
export function LiveMetrics({
  initialData,
  refreshInterval = 30000,
}: LiveMetricsProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(
    initialData || null
  )
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const { socket, isConnected, subscribe, unsubscribe } = useWebSocket({
    autoConnect: true,
  })

  // Subscribe to dashboard updates
  useEffect(() => {
    if (!isConnected) {return}

    subscribe('dashboard')

    return () => {
      unsubscribe('dashboard')
    }
  }, [isConnected, subscribe, unsubscribe])

  // Listen to dashboard metrics events
  useEffect(() => {
    if (!socket) {return}

    const handleMetricsUpdate = (data: DashboardMetrics) => {
      setMetrics(data)
      setLastUpdate(new Date(data.timestamp))
    }

    socket.on('dashboard:metrics', handleMetricsUpdate)

    return () => {
      socket.off('dashboard:metrics', handleMetricsUpdate)
    }
  }, [socket])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'UZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getRelativeTime = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)

    if (seconds < 60) {return 'только что'}
    if (seconds < 120) {return '1 минуту назад'}
    if (seconds < 3600) {return `${Math.floor(seconds / 60)} минут назад`}
    if (seconds < 7200) {return '1 час назад'}
    return `${Math.floor(seconds / 3600)} часов назад`
  }

  if (!metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
            <div className="h-8 bg-gray-200 rounded w-32" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div>
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-4">
        {/* Total Revenue */}
        <MetricCard
          title="Общая выручка"
          value={formatCurrency(metrics.totalRevenue)}
          icon={<DollarSign className="h-6 w-6 text-blue-500" />}
          bgColor="bg-blue-50"
          isConnected={isConnected}
        />

        {/* Total Commissions */}
        <MetricCard
          title="Всего комиссий"
          value={formatCurrency(metrics.totalCommissions)}
          icon={<TrendingUp className="h-6 w-6 text-green-500" />}
          bgColor="bg-green-50"
          isConnected={isConnected}
        />

        {/* Pending Payments */}
        <MetricCard
          title="Ожидает оплаты"
          value={formatCurrency(metrics.pendingPayments)}
          icon={<Clock className="h-6 w-6 text-amber-500" />}
          bgColor="bg-amber-50"
          isConnected={isConnected}
        />

        {/* Overdue Payments */}
        <MetricCard
          title="Просрочено"
          value={formatCurrency(metrics.overduePayments)}
          icon={<AlertTriangle className="h-6 w-6 text-red-500" />}
          bgColor="bg-red-50"
          isConnected={isConnected}
        />
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center space-x-2">
          <div
            className={`h-2 w-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span>
            {isConnected ? 'Онлайн' : 'Отключено'}
          </span>
        </div>
        <span>Обновлено: {getRelativeTime(lastUpdate)}</span>
      </div>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string
  icon: React.ReactNode
  bgColor: string
  isConnected: boolean
}

function MetricCard({
  title,
  value,
  icon,
  bgColor,
  isConnected,
}: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 relative overflow-hidden">
      {/* Background icon */}
      <div className={`absolute top-0 right-0 -mt-4 -mr-4 ${bgColor} rounded-full p-8 opacity-50`}>
        {icon}
      </div>

      {/* Content */}
      <div className="relative">
        <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
        <p className={`text-2xl font-bold text-gray-900 transition-all ${
          isConnected ? 'opacity-100' : 'opacity-50'
        }`}>
          {value}
        </p>
      </div>

      {/* Live indicator */}
      {isConnected && (
        <div className="absolute bottom-2 right-2">
          <div className="flex items-center space-x-1">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-gray-500">Live</span>
          </div>
        </div>
      )}
    </div>
  )
}
