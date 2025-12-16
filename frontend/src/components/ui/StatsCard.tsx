'use client'

import { cn } from '@/lib/utils'
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'

// Basic Stats Card
interface StatsCardProps {
  title: string
  value: string | number
  icon?: LucideIcon
  iconColor?: string
  change?: number
  changeLabel?: string
  changePeriod?: string
  description?: string
  className?: string
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  iconColor = 'text-primary',
  change,
  changeLabel,
  changePeriod = 'vs прошлый период',
  description,
  className,
}: StatsCardProps) {
  const isPositive = change !== undefined && change > 0
  const isNegative = change !== undefined && change < 0
  const isNeutral = change !== undefined && change === 0

  return (
    <div
      className={cn(
        'bg-card rounded-lg border border-border p-6',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
        {Icon && (
          <div className={cn('p-2 rounded-lg bg-muted', iconColor)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      {(change !== undefined || description) && (
        <div className="mt-4 flex items-center gap-2">
          {change !== undefined && (
            <>
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-sm font-medium',
                  isPositive && 'text-green-600',
                  isNegative && 'text-red-600',
                  isNeutral && 'text-muted-foreground'
                )}
              >
                {isPositive && <TrendingUp className="h-4 w-4" />}
                {isNegative && <TrendingDown className="h-4 w-4" />}
                {isNeutral && <Minus className="h-4 w-4" />}
                {changeLabel || `${isPositive ? '+' : ''}${change}%`}
              </span>
              <span className="text-sm text-muted-foreground">{changePeriod}</span>
            </>
          )}
          {description && !change && (
            <span className="text-sm text-muted-foreground">{description}</span>
          )}
        </div>
      )}
    </div>
  )
}

// Compact Stats (inline)
interface CompactStatProps {
  label: string
  value: string | number
  icon?: LucideIcon
  className?: string
}

export function CompactStat({
  label,
  value,
  icon: Icon,
  className,
}: CompactStatProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {Icon && (
        <div className="p-2 rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold text-foreground">{value}</p>
      </div>
    </div>
  )
}

// Stats Grid
interface StatsGridProps {
  stats: Array<{
    label: string
    value: string | number
    icon?: LucideIcon
    change?: number
  }>
  columns?: 2 | 3 | 4
  className?: string
}

export function StatsGrid({
  stats,
  columns = 4,
  className,
}: StatsGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {stats.map((stat, index) => (
        <StatsCard
          key={index}
          title={stat.label}
          value={stat.value}
          icon={stat.icon}
          change={stat.change}
        />
      ))}
    </div>
  )
}

// Metric with comparison
interface MetricComparisonProps {
  label: string
  current: number
  previous: number
  format?: (value: number) => string
  higherIsBetter?: boolean
  className?: string
}

export function MetricComparison({
  label,
  current,
  previous,
  format = (v) => v.toString(),
  higherIsBetter = true,
  className,
}: MetricComparisonProps) {
  const change = previous !== 0 ? ((current - previous) / previous) * 100 : 0
  const isImproved = higherIsBetter ? change > 0 : change < 0

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex items-end gap-3">
        <span className="text-3xl font-bold text-foreground">
          {format(current)}
        </span>
        <div className="flex items-center gap-1 pb-1">
          <span
            className={cn(
              'text-sm font-medium',
              isImproved ? 'text-green-600' : 'text-red-600'
            )}
          >
            {change > 0 ? '+' : ''}{change.toFixed(1)}%
          </span>
          {isImproved ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Ранее: {format(previous)}
      </p>
    </div>
  )
}

// Mini Sparkline Stat
interface SparklineStatProps {
  label: string
  value: string | number
  data: number[]
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}

export function SparklineStat({
  label,
  value,
  data,
  trend = 'neutral',
  className,
}: SparklineStatProps) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * 100
      const y = 100 - ((d - min) / range) * 100
      return `${x},${y}`
    })
    .join(' ')

  const trendColors = {
    up: 'stroke-green-500',
    down: 'stroke-red-500',
    neutral: 'stroke-primary',
  }

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex items-center gap-4">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        <svg
          viewBox="0 0 100 40"
          className="w-20 h-8"
          preserveAspectRatio="none"
        >
          <polyline
            points={points}
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={trendColors[trend]}
          />
        </svg>
      </div>
    </div>
  )
}

// Percentage Stat with Bar
interface PercentageStatProps {
  label: string
  value: number
  max?: number
  showBar?: boolean
  variant?: 'default' | 'success' | 'warning' | 'danger'
  className?: string
}

export function PercentageStat({
  label,
  value,
  max = 100,
  showBar = true,
  variant = 'default',
  className,
}: PercentageStatProps) {
  const percentage = Math.min((value / max) * 100, 100)

  const variantColors = {
    default: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="text-sm font-medium text-foreground">
          {percentage.toFixed(0)}%
        </span>
      </div>
      {showBar && (
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', variantColors[variant])}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  )
}

// Goal Progress
interface GoalProgressProps {
  label: string
  current: number
  goal: number
  format?: (value: number) => string
  className?: string
}

export function GoalProgress({
  label,
  current,
  goal,
  format = (v) => v.toString(),
  className,
}: GoalProgressProps) {
  const percentage = Math.min((current / goal) * 100, 100)
  const isComplete = current >= goal

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {isComplete && (
          <span className="text-xs font-medium text-green-600 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded">
            Достигнуто!
          </span>
        )}
      </div>
      <div className="flex items-end gap-1">
        <span className="text-3xl font-bold text-foreground">
          {format(current)}
        </span>
        <span className="text-lg text-muted-foreground pb-0.5">
          / {format(goal)}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            isComplete ? 'bg-green-500' : 'bg-primary'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {percentage.toFixed(0)}% от цели
      </p>
    </div>
  )
}
