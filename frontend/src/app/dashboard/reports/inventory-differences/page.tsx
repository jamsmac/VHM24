'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Download,
  Package,
  AlertTriangle,
  AlertCircle,
  Info,
  Filter,
} from 'lucide-react'

type SeverityLevel = 'INFO' | 'WARNING' | 'CRITICAL'

interface DifferenceItem {
  id: string
  nomenclature_name: string
  level_type: string
  level_name: string
  counted_at: string
  calculated_quantity: number
  actual_quantity: number
  difference_abs: number
  difference_rel: number
  severity: SeverityLevel
  threshold_exceeded: boolean
}

export default function InventoryDifferencesReportPage() {
  const [showFilters, setShowFilters] = useState(false)
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | 'ALL'>('ALL')

  const differences: DifferenceItem[] = [
    {
      id: '1',
      nomenclature_name: 'Coca-Cola 0.5л',
      level_type: 'WAREHOUSE',
      level_name: 'Основной склад',
      counted_at: '2025-11-20T10:30:00',
      calculated_quantity: 150,
      actual_quantity: 145,
      difference_abs: -5,
      difference_rel: -3.33,
      severity: 'INFO',
      threshold_exceeded: false,
    },
    {
      id: '2',
      nomenclature_name: 'Snickers',
      level_type: 'MACHINE',
      level_name: 'Аппарат M-001',
      counted_at: '2025-11-20T10:35:00',
      calculated_quantity: 200,
      actual_quantity: 180,
      difference_abs: -20,
      difference_rel: -10.0,
      severity: 'WARNING',
      threshold_exceeded: true,
    },
    {
      id: '3',
      nomenclature_name: 'Kit-Kat',
      level_type: 'MACHINE',
      level_name: 'Аппарат M-002',
      counted_at: '2025-11-20T10:40:00',
      calculated_quantity: 80,
      actual_quantity: 50,
      difference_abs: -30,
      difference_rel: -37.5,
      severity: 'CRITICAL',
      threshold_exceeded: true,
    },
  ]

  const filteredDifferences =
    severityFilter === 'ALL'
      ? differences
      : differences.filter((d) => d.severity === severityFilter)

  const getSeverityIcon = (severity: SeverityLevel) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'WARNING':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'INFO':
        return <Info className="h-4 w-4 text-blue-600" />
    }
  }

  const getSeverityBadge = (severity: SeverityLevel) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <Badge className="bg-red-100 text-red-800">Критическое</Badge>
        )
      case 'WARNING':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">Предупреждение</Badge>
        )
      case 'INFO':
        return <Badge className="bg-blue-100 text-blue-800">Информация</Badge>
    }
  }

  const handleExport = () => {
    alert('Экспорт в Excel начат...')
    // TODO: API call to GET /api/inventory-differences/export
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Отчёт по расхождениям остатков
          </h1>
          <p className="mt-2 text-gray-600">
            Сравнение расчётных и фактических остатков с анализом расхождений
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="h-4 w-4 mr-2" />
            Фильтры
          </Button>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Экспорт
          </Button>
        </div>
      </div>

      {/* Фильтры */}
      {showFilters && (
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h3 className="font-semibold">Фильтры</h3>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Период (с)
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Период (по)
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Уровень учёта
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                <option value="">Все</option>
                <option value="WAREHOUSE">Склад</option>
                <option value="OPERATOR">Оператор</option>
                <option value="MACHINE">Аппарат</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Товар
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                <option value="">Все</option>
                <option value="1">Coca-Cola 0.5л</option>
                <option value="2">Snickers</option>
                <option value="3">Kit-Kat</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Статистика */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Всего проверено</p>
          <p className="text-2xl font-bold">{differences.length}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">С расхождениями</p>
          <p className="text-2xl font-bold text-orange-600">
            {differences.filter((d) => d.difference_abs !== 0).length}
          </p>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <p className="text-sm text-blue-700">Информация</p>
          <p className="text-2xl font-bold text-blue-600">
            {differences.filter((d) => d.severity === 'INFO').length}
          </p>
        </div>
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
          <p className="text-sm text-yellow-700">Предупреждения</p>
          <p className="text-2xl font-bold text-yellow-600">
            {differences.filter((d) => d.severity === 'WARNING').length}
          </p>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <p className="text-sm text-red-700">Критические</p>
          <p className="text-2xl font-bold text-red-600">
            {differences.filter((d) => d.severity === 'CRITICAL').length}
          </p>
        </div>
      </div>

      {/* Фильтр по серьёзности */}
      <div className="flex gap-2">
        <Button
          variant={severityFilter === 'ALL' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSeverityFilter('ALL')}
        >
          Все
        </Button>
        <Button
          variant={severityFilter === 'INFO' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSeverityFilter('INFO')}
        >
          Информация
        </Button>
        <Button
          variant={severityFilter === 'WARNING' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSeverityFilter('WARNING')}
        >
          Предупреждения
        </Button>
        <Button
          variant={severityFilter === 'CRITICAL' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSeverityFilter('CRITICAL')}
        >
          Критические
        </Button>
      </div>

      {/* Таблица расхождений */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Товар
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Уровень / Объект
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Расчётный
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Фактический
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Δ абс.
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Δ %
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Серьёзность
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredDifferences.map((item) => (
              <tr
                key={item.id}
                className={
                  item.severity === 'CRITICAL'
                    ? 'bg-red-50'
                    : item.severity === 'WARNING'
                    ? 'bg-yellow-50'
                    : ''
                }
              >
                <td className="px-6 py-4 flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-400" />
                  {item.nomenclature_name}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500">
                      {item.level_type}
                    </span>
                    <span className="font-medium">{item.level_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  {item.calculated_quantity}
                </td>
                <td className="px-6 py-4 text-center">{item.actual_quantity}</td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`font-semibold ${
                      item.difference_abs > 0
                        ? 'text-green-600'
                        : item.difference_abs < 0
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {item.difference_abs > 0 ? '+' : ''}
                    {item.difference_abs}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`font-semibold ${
                      item.difference_rel > 0
                        ? 'text-green-600'
                        : item.difference_rel < 0
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {item.difference_rel > 0 ? '+' : ''}
                    {item.difference_rel.toFixed(1)}%
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {getSeverityIcon(item.severity)}
                    {getSeverityBadge(item.severity)}
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  {item.threshold_exceeded && (
                    <div className="flex gap-1 justify-center">
                      <Button size="sm" variant="outline">
                        Создать задачу
                      </Button>
                    </div>
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
