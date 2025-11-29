import { memo, useMemo } from 'react'
import Link from 'next/link'
import { Machine } from '@/types/machines'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { MapPin, DollarSign, Package, AlertTriangle } from 'lucide-react'

interface MachineCardProps {
  machine: Machine
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  low_stock: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  maintenance: 'bg-orange-100 text-orange-800',
  offline: 'bg-gray-100 text-gray-800',
}

export const MachineCard = memo(function MachineCard({ machine }: MachineCardProps) {
  const cashPercentage = useMemo(
    () => (machine.current_cash_amount / machine.cash_capacity) * 100,
    [machine.current_cash_amount, machine.cash_capacity]
  )

  return (
    <Link href={`/dashboard/machines/${machine.id}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{machine.machine_number}</h3>
            <p className="text-sm text-gray-600">{machine.name}</p>
          </div>
          <Badge className={statusColors[machine.status] || 'bg-gray-100 text-gray-800'}>
            {machine.status}
          </Badge>
        </div>

        {machine.location && (
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <MapPin className="h-4 w-4" />
            <span>{machine.location.name}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-xs text-gray-500">Наличных</p>
              <p className="text-sm font-semibold">{formatCurrency(machine.current_cash_amount)}</p>
              {cashPercentage > 80 && (
                <div className="flex items-center gap-1 text-xs text-orange-600 mt-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Требуется инкассация</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Товаров</p>
              <p className="text-sm font-semibold">
                {machine.current_product_count} / {machine.max_product_slots}
              </p>
            </div>
          </div>
        </div>

        {machine.last_collection_date && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">
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
