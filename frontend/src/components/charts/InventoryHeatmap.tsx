'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Tooltip } from '@/components/ui/Tooltip'

interface HeatmapCell {
  machineId: string
  machineName: string
  productId: string
  productName: string
  stockLevel: number // 0-100 percentage
  quantity: number
  maxQuantity: number
}

interface InventoryHeatmapProps {
  data: HeatmapCell[]
  className?: string
  showLegend?: boolean
  onCellClick?: (cell: HeatmapCell) => void
}

function getStockColor(level: number): string {
  if (level <= 10) return 'bg-red-500 dark:bg-red-600'
  if (level <= 25) return 'bg-orange-500 dark:bg-orange-600'
  if (level <= 50) return 'bg-yellow-500 dark:bg-yellow-600'
  if (level <= 75) return 'bg-green-400 dark:bg-green-500'
  return 'bg-green-600 dark:bg-green-700'
}

function getStockOpacity(level: number): string {
  if (level === 0) return 'opacity-30'
  return ''
}

export function InventoryHeatmap({
  data,
  className,
  showLegend = true,
  onCellClick,
}: InventoryHeatmapProps) {
  // Group data by machine and product
  const { machines, products, cellMap } = useMemo(() => {
    const machineSet = new Map<string, string>()
    const productSet = new Map<string, string>()
    const cellMap = new Map<string, HeatmapCell>()

    data.forEach((cell) => {
      machineSet.set(cell.machineId, cell.machineName)
      productSet.set(cell.productId, cell.productName)
      cellMap.set(`${cell.machineId}-${cell.productId}`, cell)
    })

    return {
      machines: Array.from(machineSet.entries()),
      products: Array.from(productSet.entries()),
      cellMap,
    }
  }, [data])

  if (machines.length === 0 || products.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-48 text-muted-foreground', className)}>
        Нет данных для отображения
      </div>
    )
  }

  return (
    <div className={cn('', className)}>
      {showLegend && (
        <div className="flex items-center gap-4 mb-4 text-sm">
          <span className="text-muted-foreground">Уровень запаса:</span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="h-4 w-4 rounded bg-red-500" />
              <span>0-10%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-4 w-4 rounded bg-orange-500" />
              <span>11-25%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-4 w-4 rounded bg-yellow-500" />
              <span>26-50%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-4 w-4 rounded bg-green-400" />
              <span>51-75%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-4 w-4 rounded bg-green-600" />
              <span>76-100%</span>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-left text-sm font-medium text-muted-foreground sticky left-0 bg-background z-10">
                Аппарат
              </th>
              {products.map(([id, name]) => (
                <th
                  key={id}
                  className="p-2 text-center text-xs font-medium text-muted-foreground min-w-[60px]"
                  title={name}
                >
                  <div className="truncate max-w-[80px]">{name}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {machines.map(([machineId, machineName]) => (
              <tr key={machineId}>
                <td className="p-2 text-sm font-medium sticky left-0 bg-background z-10 border-r border-border">
                  {machineName}
                </td>
                {products.map(([productId]) => {
                  const cell = cellMap.get(`${machineId}-${productId}`)
                  if (!cell) {
                    return (
                      <td key={productId} className="p-1">
                        <div className="h-8 w-full rounded bg-muted/30" />
                      </td>
                    )
                  }

                  return (
                    <td key={productId} className="p-1">
                      <Tooltip
                        content={
                          <div className="text-sm">
                            <p className="font-medium">{cell.productName}</p>
                            <p className="text-muted-foreground">{cell.machineName}</p>
                            <p className="mt-1">
                              {cell.quantity} / {cell.maxQuantity} ({cell.stockLevel}%)
                            </p>
                          </div>
                        }
                      >
                        <button
                          onClick={() => onCellClick?.(cell)}
                          className={cn(
                            'h-8 w-full rounded transition-all hover:ring-2 hover:ring-primary/50',
                            getStockColor(cell.stockLevel),
                            getStockOpacity(cell.stockLevel),
                            onCellClick && 'cursor-pointer'
                          )}
                        >
                          <span className="sr-only">
                            {cell.productName}: {cell.stockLevel}%
                          </span>
                        </button>
                      </Tooltip>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Simple heatmap for time-based data (e.g., sales by hour and day)
interface TimeHeatmapData {
  hour: number
  dayOfWeek: number
  value: number
}

interface TimeHeatmapProps {
  data: TimeHeatmapData[]
  className?: string
  valueLabel?: string
  formatValue?: (value: number) => string
}

const DAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

export function TimeHeatmap({
  data,
  className,
  valueLabel = 'Продажи',
  formatValue = (v) => v.toString(),
}: TimeHeatmapProps) {
  const { maxValue, dataMap } = useMemo(() => {
    let max = 0
    const map = new Map<string, number>()

    data.forEach(({ hour, dayOfWeek, value }) => {
      map.set(`${dayOfWeek}-${hour}`, value)
      if (value > max) max = value
    })

    return { maxValue: max, dataMap: map }
  }, [data])

  const getIntensity = (value: number): string => {
    if (maxValue === 0) return 'bg-muted'
    const ratio = value / maxValue
    if (ratio === 0) return 'bg-muted/30'
    if (ratio <= 0.2) return 'bg-primary/20'
    if (ratio <= 0.4) return 'bg-primary/40'
    if (ratio <= 0.6) return 'bg-primary/60'
    if (ratio <= 0.8) return 'bg-primary/80'
    return 'bg-primary'
  }

  return (
    <div className={cn('', className)}>
      <div className="overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-sm font-medium text-muted-foreground" />
              {HOURS.map((hour) => (
                <th
                  key={hour}
                  className="p-1 text-xs font-medium text-muted-foreground text-center min-w-[28px]"
                >
                  {hour}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS_RU.map((day, dayIndex) => (
              <tr key={day}>
                <td className="p-2 text-sm font-medium text-muted-foreground">{day}</td>
                {HOURS.map((hour) => {
                  const value = dataMap.get(`${dayIndex}-${hour}`) || 0
                  return (
                    <td key={hour} className="p-0.5">
                      <Tooltip
                        content={
                          <div className="text-sm">
                            <p>
                              {day}, {hour}:00
                            </p>
                            <p className="font-medium">
                              {valueLabel}: {formatValue(value)}
                            </p>
                          </div>
                        }
                      >
                        <div
                          className={cn(
                            'h-6 w-6 rounded-sm transition-colors',
                            getIntensity(value)
                          )}
                        />
                      </Tooltip>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
        <span>Меньше</span>
        <div className="flex gap-0.5">
          <div className="h-4 w-4 rounded-sm bg-muted/30" />
          <div className="h-4 w-4 rounded-sm bg-primary/20" />
          <div className="h-4 w-4 rounded-sm bg-primary/40" />
          <div className="h-4 w-4 rounded-sm bg-primary/60" />
          <div className="h-4 w-4 rounded-sm bg-primary/80" />
          <div className="h-4 w-4 rounded-sm bg-primary" />
        </div>
        <span>Больше</span>
      </div>
    </div>
  )
}
