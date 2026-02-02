import { memo, useMemo } from 'react'
import Link from 'next/link'
import { Machine, MachineStatus } from '@/types/machines'
import { Badge } from '@/components/ui/badge'
import { LevelBar } from '@/components/ui/level-bar'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { MapPin, Banknote, Package, AlertTriangle, Coffee, Wifi, WifiOff, Star } from 'lucide-react'

interface MachineCardProps {
  machine: Machine
}

const statusConfig: Record<string, { label: string; bg: string; text: string; icon: React.ElementType; dot: string }> = {
  [MachineStatus.ACTIVE]: { label: 'Онлайн', bg: 'bg-emerald-100', text: 'text-emerald-700', icon: Wifi, dot: 'bg-emerald-500' },
  [MachineStatus.LOW_STOCK]: { label: 'Мало товара', bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertTriangle, dot: 'bg-amber-500' },
  [MachineStatus.ERROR]: { label: 'Ошибка', bg: 'bg-red-100', text: 'text-red-700', icon: AlertTriangle, dot: 'bg-red-500' },
  [MachineStatus.MAINTENANCE]: { label: 'На ТО', bg: 'bg-orange-100', text: 'text-orange-700', icon: AlertTriangle, dot: 'bg-orange-500' },
  [MachineStatus.OFFLINE]: { label: 'Офлайн', bg: 'bg-stone-100', text: 'text-stone-600', icon: WifiOff, dot: 'bg-stone-400' },
  [MachineStatus.DISABLED]: { label: 'Отключён', bg: 'bg-stone-100', text: 'text-stone-500', icon: WifiOff, dot: 'bg-stone-300' },
}

/**
 * MachineCard - Card for displaying machine in grid view
 * Part of VendHub "Warm Brew" design system
 */
export const MachineCard = memo(function MachineCard({ machine }: MachineCardProps) {
  const cashPercentage = useMemo(
    () => (machine.current_cash_amount / machine.cash_capacity) * 100,
    [machine.current_cash_amount, machine.cash_capacity]
  )

  const inventoryPercentage = useMemo(
    () => (machine.current_product_count / machine.max_product_slots) * 100,
    [machine.current_product_count, machine.max_product_slots]
  )

  const status = statusConfig[machine.status] || statusConfig[MachineStatus.OFFLINE]
  const StatusIcon = status.icon

  return (
    <Link href={`/dashboard/machines/${machine.id}`}>
      <div className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-lg hover:border-amber-300 transition-all cursor-pointer group">
        {/* Header with status ring */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center group-hover:bg-amber-50 transition-colors">
                <Coffee className="w-6 h-6 text-stone-600 group-hover:text-amber-600" />
              </div>
              {/* Status dot */}
              <div className={cn('absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white', status.dot)} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-stone-800 group-hover:text-amber-700">{machine.machine_number}</h3>
                {machine.is_favorite && (
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                )}
              </div>
              <p className="text-sm text-stone-500">{machine.name}</p>
            </div>
          </div>
          <Badge className={cn(status.bg, status.text, 'border-0 gap-1')}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </Badge>
        </div>

        {machine.location && (
          <div className="flex items-center gap-2 text-sm text-stone-500 mb-4">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{machine.location.name}</span>
          </div>
        )}

        {/* Stats with level bars */}
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="flex items-center gap-1.5 text-stone-600">
                <Banknote className="h-4 w-4 text-emerald-600" />
                Наличные
              </span>
              <span className="font-medium text-stone-800">{formatCurrency(machine.current_cash_amount)}</span>
            </div>
            <LevelBar
              value={machine.current_cash_amount}
              max={machine.cash_capacity}
              threshold={20}
              size="sm"
            />
            {cashPercentage > 80 && (
              <div className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                <AlertTriangle className="h-3 w-3" />
                <span>Требуется инкассация</span>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="flex items-center gap-1.5 text-stone-600">
                <Package className="h-4 w-4 text-blue-600" />
                Товары
              </span>
              <span className="font-medium text-stone-800">
                {machine.current_product_count} / {machine.max_product_slots}
              </span>
            </div>
            <LevelBar
              value={machine.current_product_count}
              max={machine.max_product_slots}
              threshold={30}
              size="sm"
            />
          </div>
        </div>

        {machine.last_collection_date && (
          <div className="mt-4 pt-3 border-t border-stone-100">
            <p className="text-xs text-stone-400">
              Последняя инкассация: {formatDate(machine.last_collection_date)}
            </p>
          </div>
        )}
      </div>
    </Link>
  )
}, (prevProps, nextProps) => {
  // Custom comparison: only re-render if machine data changes
  return (
    prevProps.machine.id === nextProps.machine.id &&
    prevProps.machine.status === nextProps.machine.status &&
    prevProps.machine.current_cash_amount === nextProps.machine.current_cash_amount &&
    prevProps.machine.current_product_count === nextProps.machine.current_product_count
  )
})
