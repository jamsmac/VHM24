'use client'

import { cn } from '@/lib/utils'
import { WarmCard } from '@/components/ui/warm-card'
import { Badge } from '@/components/ui/badge'
import {
  Coffee,
  CreditCard,
  Smartphone,
  Banknote,
  QrCode,
  Thermometer,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export type PaymentMethod = 'cash' | 'card' | 'qr' | 'nfc'
export type BrewQuality = 'good' | 'warning' | 'error'

export interface BrewingRecord {
  id: string
  timestamp: string
  productName: string
  productType?: string
  price: number
  paymentMethod: PaymentMethod
  temperature?: number
  brewDuration?: number
  quality: BrewQuality
  errorMessage?: string
}

export interface BrewingHistoryTableProps {
  records: BrewingRecord[]
  currentPage?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  isLoading?: boolean
  className?: string
}

const paymentIcons: Record<PaymentMethod, React.ElementType> = {
  cash: Banknote,
  card: CreditCard,
  qr: QrCode,
  nfc: Smartphone,
}

const paymentLabels: Record<PaymentMethod, string> = {
  cash: 'Наличные',
  card: 'Карта',
  qr: 'QR',
  nfc: 'NFC',
}

const qualityConfig: Record<BrewQuality, { icon: React.ElementType; color: string; label: string }> = {
  good: { icon: CheckCircle2, color: 'text-emerald-500', label: 'Успешно' },
  warning: { icon: Clock, color: 'text-amber-500', label: 'С задержкой' },
  error: { icon: XCircle, color: 'text-red-500', label: 'Ошибка' },
}

/**
 * BrewingHistoryTable - Table of brewing/vending history
 * Part of VendHub "Warm Brew" design system
 */
export function BrewingHistoryTable({
  records,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  isLoading = false,
  className,
}: BrewingHistoryTableProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  }

  return (
    <WarmCard className={cn('overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-stone-100">
        <div>
          <h3 className="font-semibold text-stone-800">История варок</h3>
          <p className="text-sm text-stone-500">{records.length} записей</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-stone-50 text-left">
              <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Время
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Напиток
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Сумма
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Оплата
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider hidden md:table-cell">
                Темп.
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Статус
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-3">
                    <div className="h-4 bg-stone-200 rounded w-16" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 bg-stone-200 rounded w-24" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-4 bg-stone-200 rounded w-20" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-6 bg-stone-200 rounded w-12" />
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="h-4 bg-stone-200 rounded w-12" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-6 bg-stone-200 rounded w-16" />
                  </td>
                </tr>
              ))
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <Coffee className="w-12 h-12 mx-auto text-stone-300 mb-3" />
                  <p className="text-stone-500">Нет записей о варках</p>
                </td>
              </tr>
            ) : (
              records.map((record) => {
                const PaymentIcon = paymentIcons[record.paymentMethod]
                const quality = qualityConfig[record.quality]
                const QualityIcon = quality.icon

                return (
                  <tr
                    key={record.id}
                    className="hover:bg-stone-50/50 transition-colors"
                  >
                    {/* Time */}
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-stone-800">
                        {formatTime(record.timestamp)}
                      </div>
                      <div className="text-xs text-stone-500">
                        {formatDate(record.timestamp)}
                      </div>
                    </td>

                    {/* Product */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                          <Coffee className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-stone-800">
                            {record.productName}
                          </div>
                          {record.productType && (
                            <div className="text-xs text-stone-500">
                              {record.productType}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-stone-800">
                        {record.price.toLocaleString()} сум
                      </span>
                    </td>

                    {/* Payment Method */}
                    <td className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className="gap-1.5 bg-stone-100 text-stone-700"
                      >
                        <PaymentIcon className="w-3 h-3" />
                        {paymentLabels[record.paymentMethod]}
                      </Badge>
                    </td>

                    {/* Temperature */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      {record.temperature !== undefined ? (
                        <div className="flex items-center gap-1 text-sm text-stone-600">
                          <Thermometer className="w-3.5 h-3.5" />
                          {record.temperature}°C
                        </div>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>

                    {/* Quality/Status */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <QualityIcon className={cn('w-4 h-4', quality.color)} />
                        <span className={cn('text-sm', quality.color)}>
                          {quality.label}
                        </span>
                      </div>
                      {record.errorMessage && (
                        <p className="text-xs text-red-500 mt-0.5 truncate max-w-[120px]">
                          {record.errorMessage}
                        </p>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-stone-100 bg-stone-50">
          <span className="text-sm text-stone-500">
            Страница {currentPage} из {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="border-stone-200"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="border-stone-200"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </WarmCard>
  )
}

export default BrewingHistoryTable
