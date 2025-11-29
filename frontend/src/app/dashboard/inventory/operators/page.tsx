'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { inventoryApi } from '@/lib/inventory-api'
import { usersApi } from '@/lib/users-api'
import { UserRole } from '@/types/users'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Package, User, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { TableSkeleton } from '@/components/ui/LoadingSkeleton'

export default function OperatorInventoryPage() {
  const [selectedOperator, setSelectedOperator] = useState<string>('')

  const { data: operators } = useQuery({
    queryKey: ['users', 'operators'],
    queryFn: () => usersApi.getAll({ role: UserRole.OPERATOR }),
  })

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory', 'operator', selectedOperator],
    queryFn: () => inventoryApi.getOperatorInventory(selectedOperator),
    enabled: !!selectedOperator,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Инвентарь операторов</h1>
          <p className="mt-2 text-gray-600">Товары на руках у операторов</p>
        </div>
        <Link href="/inventory/transfer/operator-machine">
          <Button>
            <ArrowRight className="h-4 w-4 mr-2" />
            Загрузить в аппарат
          </Button>
        </Link>
      </div>

      {/* Operator Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Выберите оператора
        </label>
        <select
          value={selectedOperator}
          onChange={(e) => setSelectedOperator(e.target.value)}
          className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Выберите оператора</option>
          {operators?.map((operator) => (
            <option key={operator.id} value={operator.id}>
              {operator.full_name} ({operator.phone})
            </option>
          ))}
        </select>
      </div>

      {/* Statistics */}
      {inventory && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Всего позиций</p>
            <p className="text-2xl font-bold text-gray-900">{inventory.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Общее количество</p>
            <p className="text-2xl font-bold text-indigo-600">
              {inventory.reduce((sum, item) => sum + item.quantity, 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Стоимость</p>
            <p className="text-2xl font-bold text-green-600">
              {inventory.reduce((sum, item) => sum + (item.quantity * (item.product?.price ?? 0)), 0).toLocaleString('ru-RU')} ₽
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Оператор</p>
            <div className="flex items-center gap-2 mt-1">
              <User className="h-5 w-5 text-gray-400" />
              <p className="font-semibold text-gray-900">
                {operators?.find(o => o.id === selectedOperator)?.full_name}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Table */}
      {selectedOperator ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Товар
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Количество
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Цена
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Сумма
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4">
                      <TableSkeleton rows={5} />
                    </td>
                  </tr>
                ) : inventory && inventory.length > 0 ? (
                  inventory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Package className="h-5 w-5 text-gray-400" />
                          <p className="font-medium text-gray-900">{item.product?.name || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm text-gray-500">{item.product?.sku || '-'}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-semibold text-gray-900">{item.quantity}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-gray-900">{(item.product?.price ?? 0).toLocaleString('ru-RU')} ₽</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-semibold text-green-600">
                          {((item.quantity * (item.product?.price ?? 0))).toLocaleString('ru-RU')} ₽
                        </p>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      У оператора нет товаров
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Выберите оператора для просмотра инвентаря</p>
        </div>
      )}
    </div>
  )
}
