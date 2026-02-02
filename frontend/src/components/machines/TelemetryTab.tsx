'use client'

import { cn } from '@/lib/utils'
import { TelemetryGauge } from './TelemetryGauge'
import { WarmCard } from '@/components/ui/warm-card'
import {
  Thermometer,
  Gauge,
  Droplets,
  Zap,
  Clock,
  Activity,
  Wifi,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface TelemetryData {
  temperature: number
  pressure: number
  humidity?: number
  powerConsumption?: number
  uptime: string
  lastSync: string
  signalStrength?: number
  cycleCount?: number
}

export interface TelemetryTabProps {
  telemetry: TelemetryData
  onRefresh?: () => void
  isRefreshing?: boolean
  className?: string
}

/**
 * TelemetryTab - Telemetry dashboard tab content
 * Part of VendHub "Warm Brew" design system
 */
export function TelemetryTab({
  telemetry,
  onRefresh,
  isRefreshing = false,
  className,
}: TelemetryTabProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-stone-800">Телеметрия</h3>
          <p className="text-sm text-stone-500">
            Последнее обновление: {telemetry.lastSync}
          </p>
        </div>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="gap-2 border-stone-200 hover:border-amber-300 hover:bg-amber-50"
          >
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            Обновить
          </Button>
        )}
      </div>

      {/* Main Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TelemetryGauge
          value={telemetry.temperature}
          min={0}
          max={120}
          unit="°C"
          label="Температура бойлера"
          warningThreshold={95}
          criticalThreshold={100}
          optimalRange={[88, 94]}
          icon={Thermometer}
          size="md"
        />
        <TelemetryGauge
          value={telemetry.pressure}
          min={0}
          max={15}
          unit="бар"
          label="Давление"
          warningThreshold={12}
          criticalThreshold={14}
          optimalRange={[8, 10]}
          icon={Gauge}
          size="md"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {telemetry.humidity !== undefined && (
          <WarmCard padding="md" className="bg-stone-50">
            <div className="flex items-center gap-2 text-stone-500 mb-2">
              <Droplets className="w-4 h-4" />
              <span className="text-xs">Влажность</span>
            </div>
            <div className="text-xl font-bold text-stone-800">{telemetry.humidity}%</div>
          </WarmCard>
        )}

        {telemetry.powerConsumption !== undefined && (
          <WarmCard padding="md" className="bg-stone-50">
            <div className="flex items-center gap-2 text-stone-500 mb-2">
              <Zap className="w-4 h-4" />
              <span className="text-xs">Потребление</span>
            </div>
            <div className="text-xl font-bold text-stone-800">{telemetry.powerConsumption} Вт</div>
          </WarmCard>
        )}

        <WarmCard padding="md" className="bg-stone-50">
          <div className="flex items-center gap-2 text-stone-500 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-xs">Аптайм</span>
          </div>
          <div className="text-xl font-bold text-stone-800">{telemetry.uptime}</div>
        </WarmCard>

        {telemetry.signalStrength !== undefined && (
          <WarmCard padding="md" className="bg-stone-50">
            <div className="flex items-center gap-2 text-stone-500 mb-2">
              <Wifi className="w-4 h-4" />
              <span className="text-xs">Сигнал</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xl font-bold text-stone-800">{telemetry.signalStrength}%</div>
              <SignalBars strength={telemetry.signalStrength} />
            </div>
          </WarmCard>
        )}

        {telemetry.cycleCount !== undefined && (
          <WarmCard padding="md" className="bg-stone-50">
            <div className="flex items-center gap-2 text-stone-500 mb-2">
              <Activity className="w-4 h-4" />
              <span className="text-xs">Всего варок</span>
            </div>
            <div className="text-xl font-bold text-stone-800">
              {telemetry.cycleCount.toLocaleString()}
            </div>
          </WarmCard>
        )}
      </div>

      {/* Historical Chart Placeholder */}
      <WarmCard>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-stone-800">История температуры</h4>
          <div className="flex gap-2">
            {['1ч', '24ч', '7д'].map((period) => (
              <button
                key={period}
                className="px-3 py-1 text-xs font-medium rounded-lg border border-stone-200 text-stone-600 hover:bg-amber-50 hover:border-amber-300 transition-colors"
              >
                {period}
              </button>
            ))}
          </div>
        </div>
        <div className="h-48 bg-stone-50 rounded-xl flex items-center justify-center text-stone-400">
          {/* Chart placeholder - would use Recharts in production */}
          <div className="text-center">
            <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">График температуры</p>
          </div>
        </div>
      </WarmCard>
    </div>
  )
}

// Helper component for signal strength visualization
function SignalBars({ strength }: { strength: number }) {
  const bars = 4
  const activeBars = Math.ceil((strength / 100) * bars)

  return (
    <div className="flex items-end gap-0.5 h-4">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-1 rounded-full transition-colors',
            i < activeBars ? 'bg-emerald-500' : 'bg-stone-200'
          )}
          style={{ height: `${((i + 1) / bars) * 100}%` }}
        />
      ))}
    </div>
  )
}

export default TelemetryTab
