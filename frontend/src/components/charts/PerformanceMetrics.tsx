'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
} from 'recharts'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Target, AlertTriangle } from 'lucide-react'

// Machine performance ranking
interface MachinePerformance {
  machineId: string
  machineName: string
  revenue: number
  transactions: number
  uptime: number // percentage
  efficiency: number // percentage
}

interface MachineRankingChartProps {
  data: MachinePerformance[]
  metric: 'revenue' | 'transactions' | 'uptime' | 'efficiency'
  className?: string
  height?: number
  limit?: number
  showBest?: boolean
}

const COLORS = {
  best: 'hsl(var(--chart-1))',
  good: 'hsl(var(--chart-2))',
  average: 'hsl(var(--chart-3))',
  poor: 'hsl(var(--chart-4))',
}

export function MachineRankingChart({
  data,
  metric,
  className,
  height = 300,
  limit = 10,
  showBest = true,
}: MachineRankingChartProps) {
  const sortedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      const valueA = a[metric]
      const valueB = b[metric]
      return showBest ? valueB - valueA : valueA - valueB
    })
    return sorted.slice(0, limit).map((item, index) => ({
      ...item,
      rank: index + 1,
      value: item[metric],
    }))
  }, [data, metric, limit, showBest])

  const getBarColor = (index: number, total: number) => {
    const position = index / total
    if (showBest) {
      if (position <= 0.2) return COLORS.best
      if (position <= 0.5) return COLORS.good
      if (position <= 0.8) return COLORS.average
      return COLORS.poor
    } else {
      if (position <= 0.2) return COLORS.poor
      if (position <= 0.5) return COLORS.average
      if (position <= 0.8) return COLORS.good
      return COLORS.best
    }
  }

  const formatValue = (value: number) => {
    if (metric === 'revenue') {
      return value >= 1000000
        ? `${(value / 1000000).toFixed(1)}M`
        : `${(value / 1000).toFixed(0)}K`
    }
    if (metric === 'uptime' || metric === 'efficiency') {
      return `${value}%`
    }
    return value.toString()
  }

  const metricLabels = {
    revenue: 'Выручка',
    transactions: 'Транзакции',
    uptime: 'Время работы',
    efficiency: 'Эффективность',
  }

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={sortedData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
          <XAxis
            type="number"
            className="text-xs fill-muted-foreground"
            tickLine={false}
            axisLine={false}
            tickFormatter={formatValue}
          />
          <YAxis
            type="category"
            dataKey="machineName"
            className="text-xs fill-muted-foreground"
            tickLine={false}
            axisLine={false}
            width={75}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
            formatter={(value: number) => [formatValue(value), metricLabels[metric]]}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {sortedData.map((_, index) => (
              <Cell key={index} fill={getBarColor(index, sortedData.length)} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              className="fill-muted-foreground text-xs"
              formatter={(value) => formatValue(Number(value ?? 0))}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Radar chart for machine health/performance overview
interface MachineHealthData {
  category: string
  value: number
  maxValue: number
}

interface MachineHealthRadarProps {
  data: MachineHealthData[]
  className?: string
  size?: number
}

export function MachineHealthRadar({ data, className, size = 300 }: MachineHealthRadarProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      fullMark: item.maxValue,
    }))
  }, [data])

  return (
    <div className={cn('flex justify-center', className)}>
      <ResponsiveContainer width={size} height={size}>
        <RadarChart data={chartData}>
          <PolarGrid className="stroke-border" />
          <PolarAngleAxis
            dataKey="category"
            className="text-xs fill-muted-foreground"
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            className="text-xs fill-muted-foreground"
          />
          <Radar
            name="Показатели"
            dataKey="value"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.3}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

// KPI Summary Cards
interface KPIData {
  label: string
  value: number
  previousValue?: number
  target?: number
  format?: 'number' | 'currency' | 'percent'
  prefix?: string
  suffix?: string
}

interface KPISummaryProps {
  data: KPIData[]
  className?: string
  columns?: 2 | 3 | 4
}

export function KPISummary({ data, className, columns = 4 }: KPISummaryProps) {
  const formatValue = (value: number, format?: string, prefix?: string, suffix?: string) => {
    let formatted: string

    switch (format) {
      case 'currency':
        formatted = new Intl.NumberFormat('ru-RU').format(value)
        break
      case 'percent':
        formatted = `${value.toFixed(1)}%`
        break
      default:
        formatted = new Intl.NumberFormat('ru-RU').format(value)
    }

    return `${prefix || ''}${formatted}${suffix || ''}`
  }

  const getChangePercent = (current: number, previous: number) => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  }

  return (
    <div className={cn(`grid gap-4 ${gridCols[columns]}`, className)}>
      {data.map((kpi, index) => {
        const change = kpi.previousValue
          ? getChangePercent(kpi.value, kpi.previousValue)
          : null
        const targetProgress = kpi.target
          ? (kpi.value / kpi.target) * 100
          : null

        return (
          <div
            key={index}
            className="bg-card border border-border rounded-lg p-4"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              {targetProgress !== null && (
                <Target
                  className={cn(
                    'h-4 w-4',
                    targetProgress >= 100 ? 'text-green-500' : 'text-yellow-500'
                  )}
                />
              )}
            </div>

            <p className="mt-2 text-2xl font-bold text-foreground">
              {formatValue(kpi.value, kpi.format, kpi.prefix, kpi.suffix)}
            </p>

            {change !== null && (
              <div className="mt-2 flex items-center gap-1">
                {change > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : change < 0 ? (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                ) : null}
                <span
                  className={cn(
                    'text-sm font-medium',
                    change > 0 && 'text-green-600',
                    change < 0 && 'text-red-600',
                    change === 0 && 'text-muted-foreground'
                  )}
                >
                  {change > 0 && '+'}
                  {change.toFixed(1)}%
                </span>
                <span className="text-sm text-muted-foreground">
                  vs предыдущий период
                </span>
              </div>
            )}

            {targetProgress !== null && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Цель</span>
                  <span className="font-medium">
                    {targetProgress.toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      targetProgress >= 100 ? 'bg-green-500' : 'bg-primary'
                    )}
                    style={{ width: `${Math.min(targetProgress, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Donut chart for category breakdown
interface CategoryData {
  name: string
  value: number
  color?: string
  [key: string]: string | number | undefined
}

interface CategoryDonutProps {
  data: CategoryData[]
  className?: string
  size?: number
  showLegend?: boolean
  centerLabel?: string
  centerValue?: string
}

const DEFAULT_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
]

export function CategoryDonut({
  data,
  className,
  size = 200,
  showLegend = true,
  centerLabel,
  centerValue,
}: CategoryDonutProps) {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data])

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={size * 0.3}
              outerRadius={size * 0.45}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [
                `${((value / total) * 100).toFixed(1)}%`,
                '',
              ]}
            />
          </PieChart>
        </ResponsiveContainer>

        {(centerLabel || centerValue) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerValue && (
              <span className="text-2xl font-bold text-foreground">{centerValue}</span>
            )}
            {centerLabel && (
              <span className="text-sm text-muted-foreground">{centerLabel}</span>
            )}
          </div>
        )}
      </div>

      {showLegend && (
        <div className="flex flex-wrap justify-center gap-4">
          {data.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{
                  backgroundColor:
                    entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
                }}
              />
              <span className="text-sm text-muted-foreground">
                {entry.name}: {((entry.value / total) * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
