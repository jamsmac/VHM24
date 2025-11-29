'use client'

import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  BarChart3,
} from 'lucide-react'

export default function InventoryDifferenceDashboardPage() {
  const topProducts = [
    { name: 'Kit-Kat', difference: 30, percent: 37.5, count: 5 },
    { name: 'Snickers', difference: 20, percent: 10.0, count: 3 },
    { name: 'Coca-Cola 0.5л', difference: 5, percent: 3.3, count: 2 },
  ]

  const topMachines = [
    { name: 'Аппарат M-002', difference: 45, percent: 18.5, count: 8 },
    { name: 'Аппарат M-001', difference: 25, percent: 12.3, count: 5 },
    { name: 'Аппарат M-005', difference: 15, percent: 8.7, count: 3 },
  ]

  const topOperators = [
    { name: 'Иванов И.И.', difference: 60, percent: 15.2, count: 12 },
    { name: 'Петров П.П.', difference: 35, percent: 9.8, count: 7 },
    { name: 'Сидоров С.С.', difference: 20, percent: 5.5, count: 4 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Дашборд расхождений инвентаря
        </h1>
        <p className="mt-2 text-gray-600">
          Визуализация и анализ ключевых метрик по расхождениям остатков
        </p>
      </div>

      {/* Основные метрики */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Всего расхождений</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">127</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
            <span className="text-green-600 font-medium">+12%</span>
            <span className="text-gray-600 ml-2">за неделю</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Позиций проверено</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">456</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
            <span className="text-green-600 font-medium">+23%</span>
            <span className="text-gray-600 ml-2">за неделю</span>
          </div>
        </div>

        <div className="bg-red-50 rounded-lg border border-red-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700">Критических</p>
              <p className="text-3xl font-bold text-red-600 mt-2">8</p>
            </div>
            <div className="p-3 bg-red-200 rounded-lg">
              <AlertTriangle className="h-8 w-8 text-red-700" />
            </div>
          </div>
          <Badge className="bg-red-200 text-red-800 mt-4">Требует внимания</Badge>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Средний % расхождения</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">8.5%</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
            <span className="text-red-600 font-medium">-2.3%</span>
            <span className="text-gray-600 ml-2">за неделю</span>
          </div>
        </div>
      </div>

      {/* Распределение по уровням серьёзности */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">
          Распределение по уровням серьёзности
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-700 mb-2">Информационные</p>
            <p className="text-2xl font-bold text-blue-600">89</p>
            <div className="mt-2 bg-blue-200 h-2 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full" style={{ width: '70%' }} />
            </div>
            <p className="text-xs text-blue-600 mt-1">70% от общего числа</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-700 mb-2">Предупреждения</p>
            <p className="text-2xl font-bold text-yellow-600">30</p>
            <div className="mt-2 bg-yellow-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-yellow-600 h-full"
                style={{ width: '24%' }}
               />
            </div>
            <p className="text-xs text-yellow-600 mt-1">24% от общего числа</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700 mb-2">Критические</p>
            <p className="text-2xl font-bold text-red-600">8</p>
            <div className="mt-2 bg-red-200 h-2 rounded-full overflow-hidden">
              <div className="bg-red-600 h-full" style={{ width: '6%' }} />
            </div>
            <p className="text-xs text-red-600 mt-1">6% от общего числа</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Топ товаров */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-gray-600" />
            Топ-10 товаров по расхождениям
          </h2>
          <div className="space-y-3">
            {topProducts.map((product, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 text-orange-600 font-bold rounded-full h-8 w-8 flex items-center justify-center text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.count} случаев</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-red-600">
                    {product.difference}
                  </p>
                  <p className="text-xs text-gray-500">
                    {product.percent.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Топ аппаратов */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gray-600" />
            Топ-10 аппаратов по расхождениям
          </h2>
          <div className="space-y-3">
            {topMachines.map((machine, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 text-blue-600 font-bold rounded-full h-8 w-8 flex items-center justify-center text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{machine.name}</p>
                    <p className="text-xs text-gray-500">{machine.count} случаев</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-red-600">
                    {machine.difference}
                  </p>
                  <p className="text-xs text-gray-500">
                    {machine.percent.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Топ операторов */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-gray-600" />
            Топ-10 операторов по расхождениям
          </h2>
          <div className="space-y-3">
            {topOperators.map((operator, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 text-green-600 font-bold rounded-full h-8 w-8 flex items-center justify-center text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{operator.name}</p>
                    <p className="text-xs text-gray-500">{operator.count} случаев</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-red-600">
                    {operator.difference}
                  </p>
                  <p className="text-xs text-gray-500">
                    {operator.percent.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* График динамики (заглушка) */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">
          Динамика расхождений по времени
        </h2>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center text-gray-500">
          График будет реализован с использованием Chart.js или Recharts
        </div>
      </div>
    </div>
  )
}
