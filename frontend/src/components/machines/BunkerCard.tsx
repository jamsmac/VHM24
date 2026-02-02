'use client'

import { cn } from '@/lib/utils'
import { LevelBar } from '@/components/ui/level-bar'
import { Button } from '@/components/ui/button'
import {
  Coffee,
  Droplets,
  CupSoda,
  Package,
  Plus,
  AlertTriangle,
  TrendingDown,
} from 'lucide-react'

export interface BunkerData {
  id: string
  name: string
  type: 'coffee' | 'water' | 'milk' | 'cups' | 'sugar' | 'other'
  currentLevel: number
  maxCapacity: number
  unit: string
  lowThreshold?: number
  criticalThreshold?: number
  daysUntilEmpty?: number
  lastRefillDate?: string
}

export interface BunkerCardProps {
  bunker: BunkerData
  onRefill?: (bunkerId: string) => void
  compact?: boolean
  className?: string
}

const bunkerIcons: Record<BunkerData['type'], React.ElementType> = {
  coffee: Coffee,
  water: Droplets,
  milk: Droplets,
  cups: CupSoda,
  sugar: Package,
  other: Package,
}

const bunkerColors: Record<BunkerData['type'], { bg: string; icon: string }> = {
  coffee: { bg: 'bg-amber-100', icon: 'text-amber-600' },
  water: { bg: 'bg-blue-100', icon: 'text-blue-600' },
  milk: { bg: 'bg-stone-100', icon: 'text-stone-600' },
  cups: { bg: 'bg-orange-100', icon: 'text-orange-600' },
  sugar: { bg: 'bg-stone-100', icon: 'text-stone-600' },
  other: { bg: 'bg-stone-100', icon: 'text-stone-600' },
}

/**
 * BunkerCard - Card for displaying bunker/container status
 * Part of VendHub "Warm Brew" design system
 */
export function BunkerCard({
  bunker,
  onRefill,
  compact = false,
  className,
}: BunkerCardProps) {
  const percentage = Math.round((bunker.currentLevel / bunker.maxCapacity) * 100)
  const lowThreshold = bunker.lowThreshold ?? 30
  const criticalThreshold = bunker.criticalThreshold ?? 10

  const isLow = percentage <= lowThreshold
  const isCritical = percentage <= criticalThreshold

  const Icon = bunkerIcons[bunker.type]
  const colors = bunkerColors[bunker.type]

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 bg-white rounded-xl border border-stone-200',
          isCritical && 'border-red-300 bg-red-50/50',
          isLow && !isCritical && 'border-amber-300 bg-amber-50/50',
          className
        )}
      >
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', colors.bg)}>
          <Icon className={cn('w-5 h-5', colors.icon)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-stone-800 truncate">{bunker.name}</span>
            {isCritical && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
          </div>
          <LevelBar
            value={bunker.currentLevel}
            max={bunker.maxCapacity}
            threshold={lowThreshold}
            criticalThreshold={criticalThreshold}
            size="sm"
          />
        </div>
        <span
          className={cn(
            'text-sm font-semibold',
            isCritical ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-stone-700'
          )}
        >
          {percentage}%
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-stone-200 p-4 transition-all hover:shadow-md',
        isCritical && 'border-red-300 bg-red-50/30',
        isLow && !isCritical && 'border-amber-300 bg-amber-50/30',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', colors.bg)}>
            <Icon className={cn('w-6 h-6', colors.icon)} />
          </div>
          <div>
            <h3 className="font-semibold text-stone-800">{bunker.name}</h3>
            <p className="text-sm text-stone-500">
              {bunker.currentLevel.toLocaleString()} / {bunker.maxCapacity.toLocaleString()} {bunker.unit}
            </p>
          </div>
        </div>
        {(isCritical || isLow) && (
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium',
              isCritical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
            )}
          >
            <AlertTriangle className="w-3 h-3" />
            {isCritical ? 'Критический' : 'Низкий'}
          </div>
        )}
      </div>

      {/* Level Bar */}
      <div className="mb-4">
        <LevelBar
          value={bunker.currentLevel}
          max={bunker.maxCapacity}
          threshold={lowThreshold}
          criticalThreshold={criticalThreshold}
          showPercent
          size="md"
        />
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between mb-4">
        {bunker.daysUntilEmpty !== undefined && (
          <div className="flex items-center gap-1.5 text-sm">
            <TrendingDown className="w-4 h-4 text-stone-400" />
            <span className="text-stone-500">Хватит на</span>
            <span
              className={cn(
                'font-semibold',
                bunker.daysUntilEmpty <= 1 ? 'text-red-600' : bunker.daysUntilEmpty <= 3 ? 'text-amber-600' : 'text-stone-700'
              )}
            >
              {bunker.daysUntilEmpty} {bunker.daysUntilEmpty === 1 ? 'день' : bunker.daysUntilEmpty < 5 ? 'дня' : 'дней'}
            </span>
          </div>
        )}
        {bunker.lastRefillDate && (
          <div className="text-xs text-stone-400">
            Последнее пополнение: {new Date(bunker.lastRefillDate).toLocaleDateString('ru-RU')}
          </div>
        )}
      </div>

      {/* Refill Button */}
      {onRefill && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRefill(bunker.id)}
          className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400"
        >
          <Plus className="w-4 h-4 mr-2" />
          Пополнить
        </Button>
      )}
    </div>
  )
}

export default BunkerCard
