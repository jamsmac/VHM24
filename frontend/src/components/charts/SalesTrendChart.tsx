'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
  ReferenceLine,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface SalesData {
  date: string
  revenue: number
  transactions: number
  average_check?: number
}

interface SalesTrendChartProps {
  data: SalesData[]
  className?: string
  showTransactions?: boolean
  showAverageCheck?: boolean
  showTrend?: boolean
  height?: number
  currency?: string
}

function formatCurrency(value: number, currency = 'UZS'): string {
  if (currency === 'UZS') {
    return new Intl.NumberFormat('ru-RU').format(value) + ' сум'
  }
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency }).format(value)
}

function calculateTrend(data: SalesData[]): { value: number; direction: 'up' | 'down' | 'neutral' } {
  if (data.length < 2) return { value: 0, direction: 'neutral' }

  const midPoint = Math.floor(data.length / 2)
  const firstHalf = data.slice(0, midPoint)
  const secondHalf = data.slice(midPoint)

  const firstAvg = firstHalf.reduce((sum, d) => sum + d.revenue, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((sum, d) => sum + d.revenue, 0) / secondHalf.length

  const change = ((secondAvg - firstAvg) / firstAvg) * 100

  return {
    value: Math.abs(change),
    direction: change > 1 ? 'up' : change < -1 ? 'down' : 'neutral',
  }
}

export function SalesTrendChart({
  data,
  className,
  showTransactions = false,
  showAverageCheck = false,
  showTrend = true,
  height = 300,
  currency = 'UZS',
}: SalesTrendChartProps) {
  const trend = useMemo(() => calculateTrend(data), [data])

  const averageRevenue = useMemo(() => {
    if (data.length === 0) return 0
    return data.reduce((sum, d) => sum + d.revenue, 0) / data.length
  }, [data])

  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      date: format(parseISO(item.date), 'd MMM', { locale: ru }),
      fullDate: format(parseISO(item.date), 'd MMMM yyyy', { locale: ru }),
    }))
  }, [data])

  interface TooltipPayloadItem {
    payload: {
      fullDate: string
      revenue: number
      transactions: number
      average_check?: number
    }
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0].payload

    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium text-foreground mb-2">{data.fullDate}</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Выручка:</span>
            <span className="font-medium text-foreground">{formatCurrency(data.revenue, currency)}</span>
          </div>
          {showTransactions && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Транзакции:</span>
              <span className="font-medium text-foreground">{data.transactions}</span>
            </div>
          )}
          {showAverageCheck && data.average_check && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Средний чек:</span>
              <span className="font-medium text-foreground">{formatCurrency(data.average_check, currency)}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('', className)}>
      {showTrend && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">Тренд:</span>
          <div className={cn(
            'flex items-center gap-1 text-sm font-medium',
            trend.direction === 'up' && 'text-green-600',
            trend.direction === 'down' && 'text-red-600',
            trend.direction === 'neutral' && 'text-gray-500'
          )}>
            {trend.direction === 'up' && <TrendingUp className="h-4 w-4" />}
            {trend.direction === 'down' && <TrendingDown className="h-4 w-4" />}
            {trend.direction === 'neutral' && <Minus className="h-4 w-4" />}
            <span>
              {trend.direction === 'up' && '+'}
              {trend.direction === 'down' && '-'}
              {trend.value.toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="date"
            className="text-xs fill-muted-foreground"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            className="text-xs fill-muted-foreground"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) =>
              value >= 1000000
                ? `${(value / 1000000).toFixed(1)}M`
                : value >= 1000
                  ? `${(value / 1000).toFixed(0)}K`
                  : value.toString()
            }
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={averageRevenue}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="5 5"
            label={{
              value: 'Среднее',
              position: 'right',
              className: 'fill-muted-foreground text-xs',
            }}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="hsl(var(--primary))"
            fill="url(#revenueGradient)"
            strokeWidth={2}
            name="Выручка"
          />
          {showTransactions && (
            <Line
              type="monotone"
              dataKey="transactions"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              dot={false}
              name="Транзакции"
              yAxisId="right"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// Comparison chart for two periods
interface SalesComparisonChartProps {
  currentPeriod: SalesData[]
  previousPeriod: SalesData[]
  className?: string
  height?: number
  labels?: { current: string; previous: string }
}

export function SalesComparisonChart({
  currentPeriod,
  previousPeriod,
  className,
  height = 300,
  labels = { current: 'Текущий период', previous: 'Предыдущий период' },
}: SalesComparisonChartProps) {
  const chartData = useMemo(() => {
    return currentPeriod.map((item, index) => ({
      date: format(parseISO(item.date), 'd MMM', { locale: ru }),
      current: item.revenue,
      previous: previousPeriod[index]?.revenue || 0,
    }))
  }, [currentPeriod, previousPeriod])

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis
            dataKey="date"
            className="text-xs fill-muted-foreground"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            className="text-xs fill-muted-foreground"
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) =>
              value >= 1000000
                ? `${(value / 1000000).toFixed(1)}M`
                : `${(value / 1000).toFixed(0)}K`
            }
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="current"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            name={labels.current}
          />
          <Line
            type="monotone"
            dataKey="previous"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            name={labels.previous}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
