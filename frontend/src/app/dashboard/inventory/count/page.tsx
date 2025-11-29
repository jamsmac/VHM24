'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Package, Save, Plus, Minus, AlertCircle } from 'lucide-react'

type InventoryLevel = 'WAREHOUSE' | 'OPERATOR' | 'MACHINE'

interface CountItem {
  nomenclature_id: string
  nomenclature_name: string
  calculated_quantity: number
  actual_quantity: number
  difference: number
}

export default function InventoryCountPage() {
  const [levelType, setLevelType] = useState<InventoryLevel>('WAREHOUSE')
  const [levelRefId, setLevelRefId] = useState('')
  const [countedAt, setCountedAt] = useState(new Date().toISOString().slice(0, 16))
  const [items, setItems] = useState<CountItem[]>([
    {
      nomenclature_id: '1',
      nomenclature_name: 'Coca-Cola 0.5л',
      calculated_quantity: 150,
      actual_quantity: 145,
      difference: -5,
    },
    {
      nomenclature_id: '2',
      nomenclature_name: 'Snickers',
      calculated_quantity: 200,
      actual_quantity: 198,
      difference: -2,
    },
    {
      nomenclature_id: '3',
      nomenclature_name: 'Kit-Kat',
      calculated_quantity: 80,
      actual_quantity: 95,
      difference: 15,
    },
  ])

  const updateActualQuantity = (index: number, value: number) => {
    const newItems = [...items]
    newItems[index].actual_quantity = value
    newItems[index].difference = value - newItems[index].calculated_quantity
    setItems(newItems)
  }

  const handleSubmit = async () => {
    alert('Инвентаризация сохранена!')
    // TODO: API call to POST /api/inventory-counts/batch
  }

  const totalDifference = items.reduce(
    (sum, item) => sum + Math.abs(item.difference),
    0,
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Инвентаризация (Фактические остатки)
        </h1>
        <p className="mt-2 text-gray-600">
          Ввод фактических количеств и сравнение с расчётными остатками
        </p>
      </div>

      {/* Форма выбора уровня и объекта */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Уровень учёта
            </label>
            <select
              value={levelType}
              onChange={(e) => setLevelType(e.target.value as InventoryLevel)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="WAREHOUSE">Склад</option>
              <option value="OPERATOR">Оператор</option>
              <option value="MACHINE">Аппарат</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Объект
            </label>
            <select
              value={levelRefId}
              onChange={(e) => setLevelRefId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Выберите...</option>
              <option value="warehouse-1">Основной склад</option>
              <option value="operator-1">Оператор Иванов</option>
              <option value="machine-1">Аппарат M-001</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Дата инвентаризации
            </label>
            <input
              type="datetime-local"
              value={countedAt}
              onChange={(e) => setCountedAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Всего позиций</p>
          <p className="text-2xl font-bold">{items.length}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Расхождения</p>
          <p className="text-2xl font-bold text-orange-600">
            {items.filter((i) => i.difference !== 0).length}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Сумма расхождений</p>
          <p className="text-2xl font-bold text-red-600">{totalDifference}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Статус</p>
          <Badge className="bg-yellow-100 text-yellow-800">В процессе</Badge>
        </div>
      </div>

      {/* Таблица товаров */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Товар
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Расчётный остаток
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Фактический остаток
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Расхождение
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item, index) => (
              <tr key={item.nomenclature_id}>
                <td className="px-6 py-4 flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-400" />
                  {item.nomenclature_name}
                </td>
                <td className="px-6 py-4 text-center text-gray-900">
                  {item.calculated_quantity}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() =>
                        updateActualQuantity(index, item.actual_quantity - 1)
                      }
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      value={item.actual_quantity}
                      onChange={(e) =>
                        updateActualQuantity(index, parseInt(e.target.value) || 0)
                      }
                      className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                    />
                    <button
                      onClick={() =>
                        updateActualQuantity(index, item.actual_quantity + 1)
                      }
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`font-semibold ${
                      item.difference > 0
                        ? 'text-green-600'
                        : item.difference < 0
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {item.difference > 0 ? '+' : ''}
                    {item.difference}
                    {item.difference !== 0 && (
                      <span className="text-xs ml-1">
                        ({((item.difference / item.calculated_quantity) * 100).toFixed(
                          1,
                        )}
                        %)
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  {Math.abs(item.difference) > 10 && (
                    <Badge className="bg-red-100 text-red-800">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Критическое
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Действия */}
      <div className="flex justify-end gap-4">
        <Button variant="outline">Отменить</Button>
        <Button onClick={handleSubmit}>
          <Save className="h-4 w-4 mr-2" />
          Сохранить инвентаризацию
        </Button>
      </div>
    </div>
  )
}
