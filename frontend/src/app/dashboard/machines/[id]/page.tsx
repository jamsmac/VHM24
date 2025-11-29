'use client'

import { useQuery } from '@tanstack/react-query'
import { machinesApi } from '@/lib/machines-api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, MapPin, Calendar, DollarSign, Package, Settings, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { formatDateTime, formatCurrency, getStatusColor } from '@/lib/utils'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'

interface MachineDetailPageProps {
  params: {
    id: string
  }
}

export default function MachineDetailPage({ params }: MachineDetailPageProps) {
  const { data: machine, isLoading } = useQuery({
    queryKey: ['machines', params.id],
    queryFn: () => machinesApi.getById(params.id),
  })

  const { data: inventory } = useQuery({
    queryKey: ['machines', params.id, 'inventory'],
    queryFn: () => machinesApi.getInventory(params.id),
  })

  const { data: stats } = useQuery({
    queryKey: ['machines', params.id, 'stats'],
    queryFn: () => machinesApi.getMachineStats(params.id),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton />
      </div>
    )
  }

  if (!machine) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Аппарат не найден</p>
      </div>
    )
  }

  const cashPercentage = machine.cash_capacity > 0
    ? ((machine.current_cash || 0) / machine.cash_capacity) * 100
    : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/machines">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{machine.machine_number}</h1>
            <p className="mt-2 text-gray-600">{machine.location?.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/machines/${params.id}/tasks`}>
            <Button variant="secondary">
              История задач
            </Button>
          </Link>
          <Link href={`/machines/${params.id}/edit`}>
            <Button>
              <Settings className="h-4 w-4 mr-2" />
              Настройки
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Статус аппарата</h3>
          <Badge className={getStatusColor(machine.status)}>
            {machine.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Локация</p>
              <p className="font-semibold text-gray-900">{machine.location?.name || '-'}</p>
              <p className="text-sm text-gray-500">{machine.location?.address}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Наличные</p>
              <p className="font-semibold text-gray-900">
                {formatCurrency(machine.current_cash || 0)}
              </p>
              <div className="mt-1">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      cashPercentage > 80 ? 'bg-red-500' : cashPercentage > 50 ? 'bg-orange-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(cashPercentage, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{cashPercentage.toFixed(0)}% заполнено</p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Package className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Товары</p>
              <p className="font-semibold text-gray-900">
                {inventory?.length || 0} позиций
              </p>
              {inventory && (
                <p className="text-sm text-gray-500">
                  {inventory.filter((i: any) => i.quantity < i.min_stock).length} с низким запасом
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Calendar className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Последнее обновление</p>
              <p className="font-semibold text-gray-900">
                {machine.last_sync ? formatDateTime(machine.last_sync) : 'Никогда'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Выручка сегодня</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.revenue_today || 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Выручка за неделю</p>
            <p className="text-2xl font-bold text-indigo-600">
              {formatCurrency(stats.revenue_week || 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Всего продаж</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.total_sales || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Активных задач</p>
            <p className="text-2xl font-bold text-orange-600">
              {stats.active_tasks || 0}
            </p>
          </div>
        </div>
      )}

      {/* Inventory */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Инвентарь</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Товар
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Количество
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Мин. запас
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Статус
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventory && inventory.length > 0 ? (
                inventory.map((item: any) => {
                  const isLowStock = item.quantity < item.min_stock
                  return (
                    <tr key={item.id} className={isLowStock ? 'bg-orange-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-medium text-gray-900">{item.product?.name}</p>
                        <p className="text-sm text-gray-500">{item.product?.sku}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-semibold text-gray-900">{item.quantity}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-gray-600">{item.min_stock}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isLowStock ? (
                          <Badge className="bg-orange-100 text-orange-800">
                            Низкий запас
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800">
                            В норме
                          </Badge>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    Нет данных об инвентаре
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Technical Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Технические характеристики</h3>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-600">Модель</dt>
            <dd className="font-medium text-gray-900">{machine.model || '-'}</dd>
          </div>
          <div>
            <dt className="text-gray-600">Серийный номер</dt>
            <dd className="font-medium text-gray-900">{machine.serial_number || '-'}</dd>
          </div>
          <div>
            <dt className="text-gray-600">Емкость купюроприемника</dt>
            <dd className="font-medium text-gray-900">{formatCurrency(machine.cash_capacity)}</dd>
          </div>
          <div>
            <dt className="text-gray-600">Последняя синхронизация</dt>
            <dd className="font-medium text-gray-900">{machine.last_sync ? formatDateTime(machine.last_sync) : 'Никогда'}</dd>
          </div>
          {machine.description && (
            <div className="col-span-2">
              <dt className="text-gray-600">Описание</dt>
              <dd className="font-medium text-gray-900 mt-1">{machine.description}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  )
}
