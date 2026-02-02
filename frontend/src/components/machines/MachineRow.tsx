'use client'

import { cn } from '@/lib/utils'
import { Machine } from '@/types/machines'
import { LevelBar } from '@/components/ui/level-bar'
import { TrendBadge } from '@/components/ui/trend-badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Coffee,
  MapPin,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Star,
  StarOff,
  Wifi,
  WifiOff,
  AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'

export interface MachineRowProps {
  machine: Machine
  selected?: boolean
  onSelect?: (id: string, selected: boolean) => void
  onToggleFavorite?: (id: string) => void
  onDelete?: (id: string) => void
  onRefresh?: (id: string) => void
}

const statusConfig = {
  online: {
    label: 'Онлайн',
    icon: Wifi,
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  offline: {
    label: 'Офлайн',
    icon: WifiOff,
    bg: 'bg-stone-100',
    text: 'text-stone-600',
    dot: 'bg-stone-400',
  },
  warning: {
    label: 'Внимание',
    icon: AlertTriangle,
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  error: {
    label: 'Ошибка',
    icon: AlertTriangle,
    bg: 'bg-red-100',
    text: 'text-red-700',
    dot: 'bg-red-500',
  },
}

/**
 * MachineRow - List view row for machines
 * Part of VendHub "Warm Brew" design system
 */
export function MachineRow({
  machine,
  selected = false,
  onSelect,
  onToggleFavorite,
  onDelete,
  onRefresh,
}: MachineRowProps) {
  const status = statusConfig[machine.status as keyof typeof statusConfig] || statusConfig.offline
  const StatusIcon = status.icon

  // Mock data for inventory level (should come from machine data)
  const inventoryLevel = machine.inventory_level ?? 75
  const salesTrend = machine.sales_trend ?? 5.2

  return (
    <div
      className={cn(
        'flex items-center gap-4 px-4 py-3 bg-white border-b border-stone-100 hover:bg-stone-50 transition-colors',
        selected && 'bg-amber-50/50'
      )}
    >
      {/* Checkbox */}
      {onSelect && (
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onSelect(machine.id, checked as boolean)}
          className="border-stone-300"
        />
      )}

      {/* Machine Icon */}
      <div className="relative">
        <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center">
          <Coffee className="w-5 h-5 text-stone-600" />
        </div>
        <div
          className={cn(
            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white',
            status.dot
          )}
        />
      </div>

      {/* Machine Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/machines/${machine.id}`}
            className="font-medium text-stone-800 hover:text-amber-600 truncate"
          >
            {machine.machine_number}
          </Link>
          {machine.is_favorite && (
            <Star className="w-4 h-4 text-amber-500 fill-amber-500 flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-1 text-sm text-stone-500">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{machine.location?.name || 'Без локации'}</span>
        </div>
      </div>

      {/* Status Badge */}
      <div
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
          status.bg,
          status.text
        )}
      >
        <StatusIcon className="w-3.5 h-3.5" />
        <span>{status.label}</span>
      </div>

      {/* Inventory Level */}
      <div className="w-24 hidden md:block">
        <LevelBar
          value={inventoryLevel}
          max={100}
          threshold={30}
          size="sm"
          showPercent
        />
      </div>

      {/* Sales Trend */}
      <div className="hidden lg:block">
        <TrendBadge value={salesTrend} suffix="%" size="sm" />
      </div>

      {/* Today Sales */}
      <div className="hidden xl:block text-right">
        <div className="text-sm font-semibold text-stone-800">
          {(machine.today_sales ?? 0).toLocaleString()} сум
        </div>
        <div className="text-xs text-stone-500">сегодня</div>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/machines/${machine.id}`}>
              <Eye className="mr-2 h-4 w-4" />
              Просмотр
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/machines/${machine.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Редактировать
            </Link>
          </DropdownMenuItem>
          {onRefresh && (
            <DropdownMenuItem onClick={() => onRefresh(machine.id)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Обновить статус
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {onToggleFavorite && (
            <DropdownMenuItem onClick={() => onToggleFavorite(machine.id)}>
              {machine.is_favorite ? (
                <>
                  <StarOff className="mr-2 h-4 w-4" />
                  Убрать из избранного
                </>
              ) : (
                <>
                  <Star className="mr-2 h-4 w-4" />
                  В избранное
                </>
              )}
            </DropdownMenuItem>
          )}
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(machine.id)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Удалить
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export default MachineRow
