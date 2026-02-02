'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Filter,
  X,
  Wifi,
  WifiOff,
  AlertTriangle,
  Star,
  BellRing,
  Package,
  ChevronDown,
} from 'lucide-react'

export type MachineStatus = 'online' | 'offline' | 'warning' | 'error'
export type InventoryLevel = 'all' | 'low' | 'critical' | 'full'

export interface FilterPanelFilters {
  statuses: MachineStatus[]
  inventoryLevel: InventoryLevel
  onlyWithAlerts: boolean
  onlyFavorites: boolean
}

export interface FilterPanelProps {
  filters: FilterPanelFilters
  onFiltersChange: (filters: FilterPanelFilters) => void
  activeCount?: number
}

const statusOptions: { value: MachineStatus; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'online', label: 'Онлайн', icon: Wifi, color: 'text-emerald-600' },
  { value: 'offline', label: 'Офлайн', icon: WifiOff, color: 'text-stone-500' },
  { value: 'warning', label: 'Внимание', icon: AlertTriangle, color: 'text-amber-600' },
  { value: 'error', label: 'Ошибка', icon: AlertTriangle, color: 'text-red-600' },
]

const inventoryOptions: { value: InventoryLevel; label: string }[] = [
  { value: 'all', label: 'Все уровни' },
  { value: 'low', label: 'Низкий запас (<30%)' },
  { value: 'critical', label: 'Критический (<10%)' },
  { value: 'full', label: 'Полный (>80%)' },
]

/**
 * FilterPanel - Dropdown panel for filtering machines
 * Part of VendHub "Warm Brew" design system
 */
export function FilterPanel({
  filters,
  onFiltersChange,
  activeCount = 0,
}: FilterPanelProps) {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const toggleStatus = (status: MachineStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status]
    onFiltersChange({ ...filters, statuses: newStatuses })
  }

  const resetFilters = () => {
    onFiltersChange({
      statuses: [],
      inventoryLevel: 'all',
      onlyWithAlerts: false,
      onlyFavorites: false,
    })
  }

  const hasActiveFilters =
    filters.statuses.length > 0 ||
    filters.inventoryLevel !== 'all' ||
    filters.onlyWithAlerts ||
    filters.onlyFavorites

  const filterCount = activeCount ||
    filters.statuses.length +
    (filters.inventoryLevel !== 'all' ? 1 : 0) +
    (filters.onlyWithAlerts ? 1 : 0) +
    (filters.onlyFavorites ? 1 : 0)

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="outline"
        onClick={() => setOpen(!open)}
        className={cn(
          'gap-2 border-stone-200 hover:border-amber-300 hover:bg-amber-50',
          hasActiveFilters && 'border-amber-400 bg-amber-50'
        )}
      >
        <Filter className="h-4 w-4" />
        Фильтры
        {hasActiveFilters && (
          <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs font-medium text-white">
            {filterCount}
          </span>
        )}
        <ChevronDown className={cn('h-4 w-4 ml-1 transition-transform', open && 'rotate-180')} />
      </Button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-stone-200 z-50 animate-in fade-in-0 zoom-in-95"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <h3 className="font-semibold text-stone-800">Фильтры</h3>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-7 text-xs text-stone-500 hover:text-stone-700"
              >
                <X className="h-3 w-3 mr-1" />
                Сбросить
              </Button>
            )}
          </div>

          <div className="p-4 space-y-5 max-h-[60vh] overflow-y-auto">
            {/* Status Filter */}
            <div>
              <Label className="text-sm font-medium text-stone-700 mb-3 block">
                Статус машины
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {statusOptions.map((option) => {
                  const Icon = option.icon
                  const isActive = filters.statuses.includes(option.value)
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggleStatus(option.value)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all',
                        isActive
                          ? 'border-amber-400 bg-amber-50 text-amber-700'
                          : 'border-stone-200 hover:border-stone-300 text-stone-600'
                      )}
                    >
                      <Icon className={cn('h-4 w-4', isActive ? 'text-amber-600' : option.color)} />
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Inventory Level */}
            <div>
              <Label className="text-sm font-medium text-stone-700 mb-3 block">
                <Package className="h-4 w-4 inline mr-2" />
                Уровень запасов
              </Label>
              <div className="space-y-1">
                {inventoryOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onFiltersChange({ ...filters, inventoryLevel: option.value })}
                    className={cn(
                      'w-full flex items-center px-3 py-2 rounded-lg text-sm text-left transition-all',
                      filters.inventoryLevel === option.value
                        ? 'bg-amber-100 text-amber-700 font-medium'
                        : 'hover:bg-stone-50 text-stone-600'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Filters */}
            <div className="space-y-3 pt-2 border-t border-stone-100">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="alerts"
                  checked={filters.onlyWithAlerts}
                  onCheckedChange={(checked) =>
                    onFiltersChange({ ...filters, onlyWithAlerts: checked })
                  }
                />
                <Label
                  htmlFor="alerts"
                  className="text-sm text-stone-600 cursor-pointer flex items-center gap-2"
                >
                  <BellRing className="h-4 w-4 text-amber-500" />
                  Только с оповещениями
                </Label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="favorites"
                  checked={filters.onlyFavorites}
                  onCheckedChange={(checked) =>
                    onFiltersChange({ ...filters, onlyFavorites: checked })
                  }
                />
                <Label
                  htmlFor="favorites"
                  className="text-sm text-stone-600 cursor-pointer flex items-center gap-2"
                >
                  <Star className="h-4 w-4 text-amber-500" />
                  Только избранные
                </Label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-stone-100 bg-stone-50 rounded-b-xl">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              className="text-stone-600"
            >
              Отмена
            </Button>
            <Button
              size="sm"
              onClick={() => setOpen(false)}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              Применить
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default FilterPanel
