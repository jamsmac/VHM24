'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Download, Package, AlertTriangle } from 'lucide-react'

export default function InventoryReportPage() {
  const inventory = [
    { product: 'Coca-Cola 0.5л', warehouse: 150, operators: 45, machines: 89, lowStock: 3 },
    { product: 'Snickers', warehouse: 200, operators: 60, machines: 120, lowStock: 1 },
    { product: 'Kit-Kat', warehouse: 80, operators: 25, machines: 45, lowStock: 5 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Отчет по инвентарю</h1>
          <p className="mt-2 text-gray-600">Остатки товаров на всех уровнях</p>
        </div>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Экспорт
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Всего позиций</p>
          <p className="text-2xl font-bold">{inventory.length}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">На складе</p>
          <p className="text-2xl font-bold text-blue-600">
            {inventory.reduce((s, i) => s + i.warehouse, 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">У операторов</p>
          <p className="text-2xl font-bold text-green-600">
            {inventory.reduce((s, i) => s + i.operators, 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">В аппаратах</p>
          <p className="text-2xl font-bold text-indigo-600">
            {inventory.reduce((s, i) => s + i.machines, 0)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Товар
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Склад
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Операторы
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Аппараты
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Статус
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {inventory.map((item, idx) => (
              <tr key={idx}>
                <td className="px-6 py-4 flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-400" />
                  {item.product}
                </td>
                <td className="px-6 py-4">{item.warehouse}</td>
                <td className="px-6 py-4">{item.operators}</td>
                <td className="px-6 py-4">{item.machines}</td>
                <td className="px-6 py-4">
                  {item.lowStock > 0 ? (
                    <Badge className="bg-orange-100 text-orange-800">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Низкий запас ({item.lowStock} аппаратов)
                    </Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-800">В норме</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
