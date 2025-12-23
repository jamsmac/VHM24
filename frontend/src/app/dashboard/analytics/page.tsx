'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analyticsApi, MetricType, GroupByType } from '@/lib/analytics-api'
import { machinesApi } from '@/lib/machines-api'
import { locationsApi } from '@/lib/locations-api'
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Activity,
  Percent,
  BarChart3,
  LineChart,
  type LucideIcon,
} from 'lucide-react'

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState({
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  })

  const [selectedMachines, _setSelectedMachines] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [groupBy, setGroupBy] = useState<GroupByType>(GroupByType.DAY)

  // Fetch data
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['analytics', 'metrics', dateRange, selectedMachines, selectedLocations, groupBy],
    queryFn: () =>
      analyticsApi.getMetrics({
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
        machine_ids: selectedMachines.length > 0 ? selectedMachines : undefined,
        location_ids: selectedLocations.length > 0 ? selectedLocations : undefined,
        metrics: [
          MetricType.REVENUE,
          MetricType.TRANSACTIONS,
          MetricType.UNITS_SOLD,
          MetricType.AVERAGE_TRANSACTION,
          MetricType.AVAILABILITY,
          MetricType.PROFIT_MARGIN,
        ],
        group_by: groupBy,
      }),
  })

  const { data: topMachines } = useQuery({
    queryKey: ['analytics', 'top-machines', 30],
    queryFn: () => analyticsApi.getTopMachines(10, 30),
  })

  const { data: topProducts } = useQuery({
    queryKey: ['analytics', 'top-products', 30],
    queryFn: () => analyticsApi.getTopProducts(10, 30),
  })

  // Machines query reserved for future machine filter UI
  const { data: _machines } = useQuery({
    queryKey: ['machines'],
    queryFn: () => machinesApi.getAll({}),
  })

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationsApi.getAll(),
  })

  // Extract individual metrics
  const revenueMetric = metrics?.find((m) => m.metric === MetricType.REVENUE)
  const transactionsMetric = metrics?.find((m) => m.metric === MetricType.TRANSACTIONS)
  const unitsSoldMetric = metrics?.find((m) => m.metric === MetricType.UNITS_SOLD)
  const avgTransactionMetric = metrics?.find((m) => m.metric === MetricType.AVERAGE_TRANSACTION)
  const availabilityMetric = metrics?.find((m) => m.metric === MetricType.AVAILABILITY)
  const profitMarginMetric = metrics?.find((m) => m.metric === MetricType.PROFIT_MARGIN)

  const formatCurrency = (value: number) => {
    return `${new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 0,
    }).format(value)} сўм`
  }

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Аналитика и отчетность
        </h1>
        <p className="mt-2 text-gray-600">
          Расширенная аналитика продаж, производительности и доходности
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Фильтры</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Период с
            </label>
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, start_date: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Период по
            </label>
            <input
              type="date"
              value={dateRange.end_date}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, end_date: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Group By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Группировка
            </label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupByType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value={GroupByType.HOUR}>По часам</option>
              <option value={GroupByType.DAY}>По дням</option>
              <option value={GroupByType.WEEK}>По неделям</option>
              <option value={GroupByType.MONTH}>По месяцам</option>
              <option value={GroupByType.MACHINE}>По аппаратам</option>
              <option value={GroupByType.LOCATION}>По локациям</option>
              <option value={GroupByType.PRODUCT}>По продуктам</option>
            </select>
          </div>

          {/* Locations Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Локации
            </label>
            <select
              multiple
              value={selectedLocations}
              onChange={(e) =>
                setSelectedLocations(
                  Array.from(e.target.selectedOptions, (option) => option.value)
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              size={3}
            >
              <option value="">Все локации</option>
              {locations?.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Revenue */}
        <KPICard
          title="Выручка"
          value={revenueMetric ? formatCurrency(revenueMetric.value) : '—'}
          change={revenueMetric?.change_percent}
          icon={DollarSign}
          color="green"
          loading={metricsLoading}
        />

        {/* Transactions */}
        <KPICard
          title="Транзакции"
          value={transactionsMetric ? transactionsMetric.value.toString() : '—'}
          change={transactionsMetric?.change_percent}
          icon={ShoppingCart}
          color="blue"
          loading={metricsLoading}
        />

        {/* Units Sold */}
        <KPICard
          title="Продано единиц"
          value={unitsSoldMetric ? unitsSoldMetric.value.toString() : '—'}
          change={unitsSoldMetric?.change_percent}
          icon={BarChart3}
          color="purple"
          loading={metricsLoading}
        />

        {/* Average Transaction */}
        <KPICard
          title="Средний чек"
          value={avgTransactionMetric ? formatCurrency(avgTransactionMetric.value) : '—'}
          change={avgTransactionMetric?.change_percent}
          icon={TrendingUp}
          color="indigo"
          loading={metricsLoading}
        />

        {/* Availability */}
        <KPICard
          title="Доступность"
          value={availabilityMetric ? formatPercent(availabilityMetric.value) : '—'}
          change={availabilityMetric?.change_percent}
          icon={Activity}
          color="cyan"
          loading={metricsLoading}
        />

        {/* Profit Margin */}
        <KPICard
          title="Маржа прибыли"
          value={profitMarginMetric ? formatPercent(profitMarginMetric.value) : '—'}
          change={profitMarginMetric?.change_percent}
          icon={Percent}
          color="orange"
          loading={metricsLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        {revenueMetric?.data && revenueMetric.data.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <LineChart className="h-5 w-5 text-green-600" />
              Динамика выручки
            </h3>
            <div className="space-y-2">
              {revenueMetric.data.slice(0, 10).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {item.date || item.group || `Период ${index + 1}`}
                  </span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(item.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transactions Trend Chart */}
        {transactionsMetric?.data && transactionsMetric.data.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Динамика транзакций
            </h3>
            <div className="space-y-2">
              {transactionsMetric.data.slice(0, 10).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {item.date || item.group || `Период ${index + 1}`}
                  </span>
                  <span className="font-semibold text-gray-900">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Top Machines & Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Machines */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Топ-10 аппаратов по выручке
          </h3>
          <div className="space-y-3">
            {topMachines?.slice(0, 10).map((machine, index) => (
              <div
                key={machine.machine_id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{machine.machine_number}</p>
                    <p className="text-sm text-gray-500">{machine.location_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(machine.revenue)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {machine.transaction_count} транз.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Топ-10 продуктов по продажам
          </h3>
          <div className="space-y-3">
            {topProducts?.slice(0, 10).map((product, index) => (
              <div
                key={product.product_id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 font-bold text-sm">
                    {index + 1}
                  </div>
                  <p className="font-medium text-gray-900">{product.product_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(product.revenue)}
                  </p>
                  <p className="text-sm text-gray-500">{product.units_sold} ед.</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// KPI Card Component
interface KPICardProps {
  title: string
  value: string
  change?: number
  icon: LucideIcon
  color: 'green' | 'blue' | 'purple' | 'indigo' | 'cyan' | 'orange'
  loading?: boolean
}

function KPICard({ title, value, change, icon: Icon, color, loading }: KPICardProps) {
  const colorClasses = {
    green: 'from-green-500 to-emerald-500',
    blue: 'from-blue-500 to-cyan-500',
    purple: 'from-purple-500 to-pink-500',
    indigo: 'from-indigo-500 to-blue-500',
    cyan: 'from-cyan-500 to-teal-500',
    orange: 'from-orange-500 to-red-500',
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
        <div className="h-8 bg-gray-200 rounded w-3/4" />
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-lg transition-shadow">
      <div
        className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorClasses[color]} opacity-10 rounded-full blur-3xl`}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div
            className={`p-3 rounded-full bg-gradient-to-br ${colorClasses[color]} bg-opacity-10`}
          >
            <Icon className="h-6 w-6 text-gray-700" />
          </div>
        </div>

        <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>

        {change !== undefined && (
          <p
            className={`text-sm font-medium ${
              change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}% vs предыдущий период
          </p>
        )}
      </div>
    </div>
  )
}
