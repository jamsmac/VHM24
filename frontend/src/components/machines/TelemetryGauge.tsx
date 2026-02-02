'use client'

import { cn } from '@/lib/utils'
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react'

export interface TelemetryGaugeProps {
  /** Current value */
  value: number
  /** Minimum value */
  min: number
  /** Maximum value */
  max: number
  /** Unit label (e.g., "°C", "бар", "%") */
  unit: string
  /** Gauge label */
  label: string
  /** Warning threshold */
  warningThreshold?: number
  /** Critical threshold */
  criticalThreshold?: number
  /** Optimal range [min, max] */
  optimalRange?: [number, number]
  /** Trend compared to previous */
  trend?: 'up' | 'down' | 'stable'
  /** Icon component */
  icon?: React.ElementType
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Additional class names */
  className?: string
}

/**
 * TelemetryGauge - Linear gauge for telemetry values
 * Part of VendHub "Warm Brew" design system
 */
export function TelemetryGauge({
  value,
  min,
  max,
  unit,
  label,
  warningThreshold,
  criticalThreshold,
  optimalRange,
  trend,
  icon: Icon,
  size = 'md',
  className,
}: TelemetryGaugeProps) {
  const range = max - min
  const percentage = Math.max(0, Math.min(100, ((value - min) / range) * 100))

  // Determine status
  const isCritical = criticalThreshold !== undefined && value >= criticalThreshold
  const isWarning = !isCritical && warningThreshold !== undefined && value >= warningThreshold
  const isOutOfOptimal = optimalRange && (value < optimalRange[0] || value > optimalRange[1])

  // Status colors
  const getStatusColor = () => {
    if (isCritical) return 'text-red-600'
    if (isWarning) return 'text-amber-600'
    if (isOutOfOptimal) return 'text-amber-600'
    return 'text-emerald-600'
  }

  const getBarColor = () => {
    if (isCritical) return 'bg-red-500'
    if (isWarning) return 'bg-amber-500'
    if (isOutOfOptimal) return 'bg-amber-500'
    return 'bg-emerald-500'
  }

  const sizeClasses = {
    sm: {
      container: 'p-3',
      icon: 'w-8 h-8',
      iconInner: 'w-4 h-4',
      value: 'text-lg',
      bar: 'h-1.5',
      label: 'text-xs',
    },
    md: {
      container: 'p-4',
      icon: 'w-10 h-10',
      iconInner: 'w-5 h-5',
      value: 'text-2xl',
      bar: 'h-2',
      label: 'text-sm',
    },
    lg: {
      container: 'p-5',
      icon: 'w-12 h-12',
      iconInner: 'w-6 h-6',
      value: 'text-3xl',
      bar: 'h-2.5',
      label: 'text-base',
    },
  }

  const s = sizeClasses[size]

  // Calculate optimal range indicators
  const optimalStartPercent = optimalRange
    ? ((optimalRange[0] - min) / range) * 100
    : undefined
  const optimalEndPercent = optimalRange
    ? ((optimalRange[1] - min) / range) * 100
    : undefined

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-stone-200',
        isCritical && 'border-red-300',
        isWarning && !isCritical && 'border-amber-300',
        s.container,
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && (
            <div
              className={cn(
                'rounded-lg flex items-center justify-center',
                s.icon,
                isCritical ? 'bg-red-100' : isWarning ? 'bg-amber-100' : 'bg-stone-100'
              )}
            >
              <Icon
                className={cn(
                  s.iconInner,
                  isCritical ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-stone-600'
                )}
              />
            </div>
          )}
          <span className={cn('font-medium text-stone-700', s.label)}>{label}</span>
        </div>
        {(isCritical || isWarning) && (
          <AlertTriangle
            className={cn('w-4 h-4', isCritical ? 'text-red-500' : 'text-amber-500')}
          />
        )}
      </div>

      {/* Value */}
      <div className="flex items-end gap-2 mb-3">
        <span className={cn('font-bold', s.value, getStatusColor())}>
          {value.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}
        </span>
        <span className={cn('text-stone-500 mb-1', s.label)}>{unit}</span>
        {trend && (
          <div className="ml-auto mb-1">
            {trend === 'up' && <TrendingUp className="w-4 h-4 text-red-500" />}
            {trend === 'down' && <TrendingDown className="w-4 h-4 text-emerald-500" />}
            {trend === 'stable' && <Minus className="w-4 h-4 text-stone-400" />}
          </div>
        )}
      </div>

      {/* Gauge Bar */}
      <div className="relative">
        {/* Background */}
        <div className={cn('w-full rounded-full bg-stone-100', s.bar)}>
          {/* Optimal range indicator */}
          {optimalRange && (
            <div
              className="absolute top-0 h-full bg-emerald-100 rounded-full"
              style={{
                left: `${optimalStartPercent}%`,
                width: `${(optimalEndPercent ?? 0) - (optimalStartPercent ?? 0)}%`,
              }}
            />
          )}
          {/* Value bar */}
          <div
            className={cn('h-full rounded-full transition-all duration-500', getBarColor())}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Scale markers */}
        <div className="flex justify-between mt-1">
          <span className="text-xs text-stone-400">{min}</span>
          {optimalRange && (
            <span className="text-xs text-emerald-600">
              {optimalRange[0]}-{optimalRange[1]}
            </span>
          )}
          <span className="text-xs text-stone-400">{max}</span>
        </div>
      </div>
    </div>
  )
}

export default TelemetryGauge
