'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { inventoryApi } from '@/lib/inventory-api'
import { machinesApi } from '@/lib/machines-api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Package, MonitorSmartphone, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { TableSkeleton } from '@/components/ui/LoadingSkeleton'

export default function MachineInventoryPage() {
  const [selectedMachine, setSelectedMachine] = useState<string>('')

  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => machinesApi.getAll({}),
  })

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory', 'machine', selectedMachine],
    queryFn: () => inventoryApi.getMachineInventory(selectedMachine),
    enabled: !!selectedMachine,
  })

  const lowStockItems = inventory?.filter(item => item.quantity < (item.min_stock ?? 0)) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Инвентарь аппаратов</h1>
          <p className="mt-2 text-gray-600">Товары в вендинговых автоматах</p>
        </div>
        {selectedMachine && (
          <Link href={`/machines/${selectedMachine}`}>
            <Button variant="secondary">
              Перейти к аппарату
            </Button>
          </Link>
        )}
      </div>

      {/* Machine Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Выберите аппарат
        </label>
        <select
          value={selectedMachine}
          onChange={(e) => setSelectedMachine(e.target.value)}
          className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Выберите аппарат</option>
          {machines?.map((machine) => (
            <option key={machine.id} value={machine.id}>
              {machine.machine_number} - {machine.location?.name}
            </option>
          ))}
        </select>
      </div>

      {/* Statistics */}
      {inventory && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Всего позиций</p>
              <p className="text-2xl font-bold text-gray-900">{inventory.length}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Низкий запас</p>
              <p className="text-2xl font-bold text-orange-600">{lowStockItems.length}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Общее количество</p>
              <p className="text-2xl font-bold text-indigo-600">
                {inventory.reduce((sum, item) => sum + item.quantity, 0)}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-600">Аппарат</p>
              <div className="flex items-center gap-2 mt-1">
                <MonitorSmartphone className="h-5 w-5 text-gray-400" />
                <p className="font-semibold text-gray-900">
                  {machines?.find(m => m.id === selectedMachine)?.machine_number}
                </p>
              </div>
            </div>
          </div>

          {/* Low Stock Alert */}
          {lowStockItems.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-orange-900">
                    Низкий запас ({lowStockItems.length} позиций)
                  </h3>
                  <p className="text-sm text-orange-700 mt-1">
                    Требуется пополнение товаров в аппарате
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Inventory Table */}
      {selectedMachine ? (
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
                    Мин. запас
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Заполненность
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4">
                      <TableSkeleton rows={5} />
                    </td>
                  </tr>
                ) : inventory && inventory.length > 0 ? (
                  inventory.map((item) => {
                    const isLowStock = item.quantity < (item.min_stock ?? 0)
                    const fillPercentage = (item.max_capacity ?? 0) > 0
                      ? (item.quantity / (item.max_capacity ?? 1)) * 100
                      : 0

                    return (
                      <tr key={item.id} className={isLowStock ? 'bg-orange-50' : 'hover:bg-gray-50'}>
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
                          <p className={`font-semibold ${isLowStock ? 'text-orange-600' : 'text-gray-900'}`}>
                            {item.quantity}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-gray-600">{item.min_stock ?? 0}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-32">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    fillPercentage < 20 ? 'bg-red-500' : fillPercentage < 50 ? 'bg-orange-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${Math.min(fillPercentage, 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-600">{fillPercentage.toFixed(0)}%</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isLowStock ? (
                            <Badge className="bg-orange-100 text-orange-800">
                              <AlertTriangle className="h-3 w-3 mr-1" />
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
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      В аппарате нет товаров
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <MonitorSmartphone className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Выберите аппарат для просмотра инвентаря</p>
        </div>
      )}
    </div>
  )
}
