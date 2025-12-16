'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { cn } from '@/lib/utils'
import { Activity, Pause, Play, RefreshCw } from 'lucide-react'

interface DataPoint {
  timestamp: number
  value: number
}

interface RealTimeChartProps {
  className?: string
  height?: number
  maxDataPoints?: number
  refreshInterval?: number
  fetchData: () => Promise<number>
  label?: string
  unit?: string
  thresholds?: {
    warning?: number
    critical?: number
  }
  showControls?: boolean
}

export function RealTimeChart({
  className,
  height = 200,
  maxDataPoints = 30,
  refreshInterval = 5000,
  fetchData,
  label = 'Value',
  unit = '',
  thresholds,
  showControls = true,
}: RealTimeChartProps) {
  const [data, setData] = useState<DataPoint[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [lastValue, setLastValue] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchNewData = useCallback(async () => {
    if (isPaused) return

    setIsLoading(true)
    try {
      const value = await fetchData()
      const timestamp = Date.now()

      setLastValue(value)
      setData((prev) => {
        const newData = [...prev, { timestamp, value }]
        if (newData.length > maxDataPoints) {
          return newData.slice(-maxDataPoints)
        }
        return newData
      })
    } catch (error) {
      console.error('Failed to fetch real-time data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [fetchData, isPaused, maxDataPoints])

  useEffect(() => {
    fetchNewData() // Initial fetch

    const interval = setInterval(fetchNewData, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchNewData, refreshInterval])

  const chartData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      time: new Date(point.timestamp).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    }))
  }, [data])

  const { min, max, avg } = useMemo(() => {
    if (data.length === 0) return { min: 0, max: 0, avg: 0 }

    const values = data.map((d) => d.value)
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
    }
  }, [data])

  const getValueStatus = (value: number) => {
    if (thresholds?.critical && value >= thresholds.critical) return 'critical'
    if (thresholds?.warning && value >= thresholds.warning) return 'warning'
    return 'normal'
  }

  const status = lastValue !== null ? getValueStatus(lastValue) : 'normal'

  return (
    <div className={cn('bg-card border border-border rounded-lg p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity
            className={cn(
              'h-5 w-5',
              status === 'critical' && 'text-red-500',
              status === 'warning' && 'text-yellow-500',
              status === 'normal' && 'text-green-500'
            )}
          />
          <span className="font-medium text-foreground">{label}</span>
          {isLoading && (
            <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />
          )}
        </div>

        {showControls && (
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={cn(
              'p-2 rounded-md transition-colors',
              'hover:bg-accent text-muted-foreground hover:text-foreground'
            )}
            aria-label={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
        )}
      </div>

      {lastValue !== null && (
        <div className="mb-4">
          <span
            className={cn(
              'text-3xl font-bold',
              status === 'critical' && 'text-red-500',
              status === 'warning' && 'text-yellow-500',
              status === 'normal' && 'text-foreground'
            )}
          >
            {lastValue.toFixed(1)}
            {unit && <span className="text-lg text-muted-foreground ml-1">{unit}</span>}
          </span>
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="time"
            className="text-xs fill-muted-foreground"
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={['auto', 'auto']}
            className="text-xs fill-muted-foreground"
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value: number) => [`${value.toFixed(2)}${unit}`, label]}
          />
          {thresholds?.warning && (
            <ReferenceLine
              y={thresholds.warning}
              stroke="hsl(var(--chart-4))"
              strokeDasharray="5 5"
            />
          )}
          {thresholds?.critical && (
            <ReferenceLine
              y={thresholds.critical}
              stroke="hsl(var(--destructive))"
              strokeDasharray="5 5"
            />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {data.length > 0 && (
        <div className="mt-4 flex justify-between text-xs text-muted-foreground">
          <span>Мин: {min.toFixed(1)}{unit}</span>
          <span>Среднее: {avg.toFixed(1)}{unit}</span>
          <span>Макс: {max.toFixed(1)}{unit}</span>
        </div>
      )}
    </div>
  )
}

// Multi-line real-time chart for comparing multiple metrics
interface MultiMetric {
  id: string
  label: string
  color: string
  fetchData: () => Promise<number>
}

interface MultiRealTimeChartProps {
  metrics: MultiMetric[]
  className?: string
  height?: number
  maxDataPoints?: number
  refreshInterval?: number
}

interface MultiDataPoint {
  timestamp: number
  [key: string]: number
}

export function MultiRealTimeChart({
  metrics,
  className,
  height = 250,
  maxDataPoints = 30,
  refreshInterval = 5000,
}: MultiRealTimeChartProps) {
  const [data, setData] = useState<MultiDataPoint[]>([])
  const [isPaused, setIsPaused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const fetchAllData = useCallback(async () => {
    if (isPaused) return

    setIsLoading(true)
    try {
      const values = await Promise.all(metrics.map((m) => m.fetchData()))
      const timestamp = Date.now()

      const newPoint: MultiDataPoint = { timestamp }
      metrics.forEach((metric, index) => {
        newPoint[metric.id] = values[index]
      })

      setData((prev) => {
        const newData = [...prev, newPoint]
        if (newData.length > maxDataPoints) {
          return newData.slice(-maxDataPoints)
        }
        return newData
      })
    } catch (error) {
      console.error('Failed to fetch multi real-time data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [metrics, isPaused, maxDataPoints])

  useEffect(() => {
    fetchAllData()

    const interval = setInterval(fetchAllData, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchAllData, refreshInterval])

  const chartData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      time: new Date(point.timestamp).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    }))
  }, [data])

  return (
    <div className={cn('bg-card border border-border rounded-lg p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          {metrics.map((metric) => (
            <div key={metric.id} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: metric.color }}
              />
              <span className="text-sm text-muted-foreground">{metric.label}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {isLoading && (
            <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />
          )}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
          >
            {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="time"
            className="text-xs fill-muted-foreground"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            className="text-xs fill-muted-foreground"
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          {metrics.map((metric) => (
            <Line
              key={metric.id}
              type="monotone"
              dataKey={metric.id}
              stroke={metric.color}
              strokeWidth={2}
              dot={false}
              name={metric.label}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// Sparkline component for inline trends
interface SparklineProps {
  data: number[]
  className?: string
  width?: number
  height?: number
  color?: string
  showChange?: boolean
}

export function Sparkline({
  data,
  className,
  width = 100,
  height = 30,
  color = 'hsl(var(--primary))',
  showChange = false,
}: SparklineProps) {
  const chartData = useMemo(() => data.map((value, index) => ({ value, index })), [data])

  const change = useMemo(() => {
    if (data.length < 2) return 0
    const first = data[0]
    const last = data[data.length - 1]
    if (first === 0) return 0
    return ((last - first) / first) * 100
  }, [data])

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <ResponsiveContainer width={width} height={height}>
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>

      {showChange && (
        <span
          className={cn(
            'text-xs font-medium',
            change > 0 && 'text-green-600',
            change < 0 && 'text-red-600',
            change === 0 && 'text-muted-foreground'
          )}
        >
          {change > 0 && '+'}
          {change.toFixed(1)}%
        </span>
      )}
    </div>
  )
}
