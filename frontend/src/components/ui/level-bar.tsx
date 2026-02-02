'use client'

import { cn } from '@/lib/utils'

export interface LevelBarProps {
  /** Current value */
  value: number
  /** Maximum value */
  max: number
  /** Low level threshold (optional) */
  threshold?: number
  /** Critical threshold (optional, defaults to threshold/2) */
  criticalThreshold?: number
  /** Show percentage label */
  showPercent?: boolean
  /** Show value label */
  showValue?: boolean
  /** Unit for value label */
  unit?: string
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Additional class names */
  className?: string
}

/**
 * LevelBar - Visual indicator for inventory/resource levels
 * Part of VendHub "Warm Brew" design system
 */
export function LevelBar({
  value,
  max,
  threshold,
  criticalThreshold,
  showPercent = false,
  showValue = false,
  unit = '',
  size = 'md',
  className,
}: LevelBarProps) {
  const percentage = Math.round((value / max) * 100)
  const effectiveThreshold = threshold ?? max * 0.2
  const effectiveCritical = criticalThreshold ?? effectiveThreshold / 2

  const isLow = value <= effectiveThreshold
  const isCritical = value <= effectiveCritical

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  }

  const barColor = isCritical
    ? 'bg-red-500'
    : isLow
    ? 'bg-amber-500'
    : 'bg-emerald-500'

  const bgColor = isCritical
    ? 'bg-red-100'
    : isLow
    ? 'bg-amber-100'
    : 'bg-stone-100'

  return (
    <div className={cn('w-full', className)}>
      {(showPercent || showValue) && (
        <div className="flex items-center justify-between text-xs mb-1">
          {showValue && (
            <span className="text-stone-600">
              {value.toLocaleString()} / {max.toLocaleString()} {unit}
            </span>
          )}
          {showPercent && (
            <span
              className={cn(
                'font-semibold',
                isCritical ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-stone-700'
              )}
            >
              {percentage}%
            </span>
          )}
        </div>
      )}
      <div className={cn('rounded-full overflow-hidden', bgColor, sizeClasses[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-300', barColor)}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  )
}

export default LevelBar
