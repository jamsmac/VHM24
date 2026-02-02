'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Machine } from '@/types/machines'
import { LevelBar } from '@/components/ui/level-bar'
import { TrendBadge } from '@/components/ui/trend-badge'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Coffee,
  MapPin,
  X,
  ExternalLink,
  Star,
  StarOff,
  Wifi,
  WifiOff,
  AlertTriangle,
  Thermometer,
  Gauge,
  Package,
  BarChart3,
  History,
  Settings,
  RefreshCw,
  Edit,
  QrCode,
  Map,
} from 'lucide-react'
import Link from 'next/link'

export interface MachineDetailSlideOverProps {
  machine: Machine | null
  open: boolean
  onClose: () => void
  onToggleFavorite?: (id: string) => void
  onRefresh?: (id: string) => void
}

type TabId = 'overview' | 'inventory' | 'history' | 'settings'

const statusConfig = {
  online: {
    label: 'Онлайн',
    icon: Wifi,
    headerBg: 'bg-emerald-500',
    dotBg: 'bg-emerald-400',
  },
  offline: {
    label: 'Офлайн',
    icon: WifiOff,
    headerBg: 'bg-stone-500',
    dotBg: 'bg-stone-400',
  },
  warning: {
    label: 'Внимание',
    icon: AlertTriangle,
    headerBg: 'bg-amber-500',
    dotBg: 'bg-amber-400',
  },
  error: {
    label: 'Ошибка',
    icon: AlertTriangle,
    headerBg: 'bg-red-500',
    dotBg: 'bg-red-400',
  },
}

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Обзор', icon: BarChart3 },
  { id: 'inventory', label: 'Запасы', icon: Package },
  { id: 'history', label: 'История', icon: History },
  { id: 'settings', label: 'Настройки', icon: Settings },
]

/**
 * MachineDetailSlideOver - Side panel for quick machine details
 * Part of VendHub "Warm Brew" design system
 */
export function MachineDetailSlideOver({
  machine,
  open,
  onClose,
  onToggleFavorite,
  onRefresh,
}: MachineDetailSlideOverProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  if (!machine) return null

  const status = statusConfig[machine.status as keyof typeof statusConfig] || statusConfig.offline
  const StatusIcon = status.icon

  // Mock data (should come from machine data)
  const telemetry = {
    temperature: 92,
    pressure: 9.2,
    uptime: '45д 12ч',
  }

  const quickStats = [
    { label: 'Сегодня', value: (machine.today_sales ?? 0).toLocaleString(), suffix: 'сум' },
    { label: 'Варок', value: machine.today_brews ?? 0, suffix: '' },
    { label: 'Ср. чек', value: (machine.avg_check ?? 0).toLocaleString(), suffix: 'сум' },
  ]

  const bunkers = [
    { name: 'Кофе', level: 85, max: 100 },
    { name: 'Молоко', level: 72, max: 100 },
    { name: 'Стаканы', level: 45, max: 100 },
    { name: 'Вода', level: 90, max: 100 },
  ]

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:w-[540px] p-0 bg-white border-l border-stone-200 overflow-hidden"
      >
        {/* Colored Header */}
        <div className={cn('relative', status.headerBg, 'text-white')}>
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <SheetHeader className="px-6 pt-6 pb-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
                <Coffee className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <SheetTitle className="text-xl font-bold text-white">
                    {machine.machine_number}
                  </SheetTitle>
                  {machine.is_favorite && (
                    <Star className="w-5 h-5 fill-white" />
                  )}
                </div>
                <p className="text-white/80 text-sm">{machine.model || 'Модель неизвестна'}</p>
                <div className="flex items-center gap-1.5 mt-2 text-sm text-white/80">
                  <MapPin className="w-4 h-4" />
                  <span>{machine.location?.name || 'Без локации'}</span>
                </div>
              </div>
            </div>
          </SheetHeader>

          {/* Quick Stats */}
          <div className="px-6 pb-4">
            <div className="grid grid-cols-3 gap-3">
              {quickStats.map((stat, i) => (
                <div key={i} className="bg-white/20 rounded-xl px-3 py-2">
                  <div className="text-xs text-white/70">{stat.label}</div>
                  <div className="text-lg font-bold">
                    {stat.value} {stat.suffix && <span className="text-sm font-normal">{stat.suffix}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status Badge */}
          <div className="absolute bottom-0 left-6 translate-y-1/2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full shadow-lg border border-stone-200">
              <div className={cn('w-2 h-2 rounded-full animate-pulse', status.dotBg)} />
              <StatusIcon className="w-4 h-4 text-stone-600" />
              <span className="text-sm font-medium text-stone-700">{status.label}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-8 pb-2 border-b border-stone-100">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const TabIcon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'bg-amber-100 text-amber-700'
                      : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
                  )}
                >
                  <TabIcon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Telemetry */}
              <div>
                <h3 className="text-sm font-semibold text-stone-800 mb-3">Телеметрия</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-stone-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-stone-500 mb-1">
                      <Thermometer className="w-4 h-4" />
                      <span className="text-xs">Температура</span>
                    </div>
                    <div className="text-xl font-bold text-stone-800">{telemetry.temperature}°C</div>
                  </div>
                  <div className="bg-stone-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-stone-500 mb-1">
                      <Gauge className="w-4 h-4" />
                      <span className="text-xs">Давление</span>
                    </div>
                    <div className="text-xl font-bold text-stone-800">{telemetry.pressure} бар</div>
                  </div>
                  <div className="bg-stone-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-stone-500 mb-1">
                      <Wifi className="w-4 h-4" />
                      <span className="text-xs">Аптайм</span>
                    </div>
                    <div className="text-xl font-bold text-stone-800">{telemetry.uptime}</div>
                  </div>
                </div>
              </div>

              {/* Inventory Preview */}
              <div>
                <h3 className="text-sm font-semibold text-stone-800 mb-3">Запасы</h3>
                <div className="space-y-3">
                  {bunkers.map((bunker, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <span className="w-20 text-sm text-stone-600">{bunker.name}</span>
                      <div className="flex-1">
                        <LevelBar
                          value={bunker.level}
                          max={bunker.max}
                          threshold={30}
                          size="sm"
                          showPercent
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sales Trend */}
              <div>
                <h3 className="text-sm font-semibold text-stone-800 mb-3">Тренд продаж</h3>
                <div className="flex items-center gap-4">
                  <TrendBadge value={machine.sales_trend ?? 5.2} suffix="%" size="lg" />
                  <span className="text-sm text-stone-500">за последние 7 дней</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="text-sm text-stone-500">
              Подробная информация о запасах...
            </div>
          )}

          {activeTab === 'history' && (
            <div className="text-sm text-stone-500">
              История операций...
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="text-sm text-stone-500">
              Настройки машины...
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="p-4 border-t border-stone-100 bg-stone-50">
          <div className="grid grid-cols-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="flex-col h-auto py-3 gap-1 border-stone-200 hover:border-amber-300 hover:bg-amber-50"
            >
              <Link href={`/dashboard/machines/${machine.id}`}>
                <ExternalLink className="h-4 w-4" />
                <span className="text-xs">Открыть</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="flex-col h-auto py-3 gap-1 border-stone-200 hover:border-amber-300 hover:bg-amber-50"
            >
              <Link href={`/dashboard/machines/${machine.id}/edit`}>
                <Edit className="h-4 w-4" />
                <span className="text-xs">Изменить</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-col h-auto py-3 gap-1 border-stone-200 hover:border-amber-300 hover:bg-amber-50"
              onClick={() => onRefresh?.(machine.id)}
            >
              <RefreshCw className="h-4 w-4" />
              <span className="text-xs">Обновить</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-col h-auto py-3 gap-1 border-stone-200 hover:border-amber-300 hover:bg-amber-50"
              onClick={() => onToggleFavorite?.(machine.id)}
            >
              {machine.is_favorite ? (
                <StarOff className="h-4 w-4" />
              ) : (
                <Star className="h-4 w-4" />
              )}
              <span className="text-xs">Избранное</span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default MachineDetailSlideOver
