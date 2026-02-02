'use client'

import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export interface TrendBadgeProps {
  /** Trend value (positive = up, negative = down, 0 = neutral) */
  value: number
  /** Suffix to display after value (e.g., "%" or "сум") */
  suffix?: string
  /** Show icon */
  showIcon?: boolean
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Additional class names */
  className?: string
  /** Invert colors (positive = bad, negative = good) */
  invertColors?: boolean
}

/**
 * TrendBadge - Shows trend direction with color coding
 * Part of VendHub "Warm Brew" design system
 */
export function TrendBadge({
  value,
  suffix = '%',
  showIcon = true,
  size = 'md',
  className,
  invertColors = false,
}: TrendBadgeProps) {
  const isPositive = value > 0
  const isNegative = value < 0
  const isNeutral = value === 0

  // Determine color based on value and inversion
  const getColorClass = () => {
    if (isNeutral) return 'bg-stone-100 text-stone-600'
    if (invertColors) {
      return isPositive
        ? 'bg-red-100 text-red-700'
        : 'bg-emerald-100 text-emerald-700'
    }
    return isPositive
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-red-100 text-red-700'
  }

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs gap-0.5',
    md: 'px-2 py-1 text-xs gap-1',
    lg: 'px-2.5 py-1 text-sm gap-1',
  }

  const iconSizes = {
    sm: 10,
    md: 12,
    lg: 14,
  }

  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus

  const formattedValue = isPositive ? `+${value}` : value.toString()

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        getColorClass(),
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon size={iconSizes[size]} />}
      <span>
        {formattedValue}
        {suffix}
      </span>
    </span>
  )
}

export default TrendBadge
