'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { transactionsApi } from '@/lib/transactions-api'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Download, TrendingUp, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend, Bar, BarChart, Pie, PieChart, Cell } from 'recharts'

interface MachineStatItem {
  machine_number: string
  revenue: number
}

interface TopRecipeItem {
  recipe_name: string
  total_quantity: number
  total_sales: number
}

export default function TransactionReportsPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['transactions', 'stats', dateFrom, dateTo],
    queryFn: () => transactionsApi.getStats(dateFrom, dateTo),
  })

  const { data: dailyRevenue, isLoading: dailyLoading } = useQuery({
    queryKey: ['transactions', 'daily-revenue', dateFrom, dateTo],
    queryFn: () => transactionsApi.getDailyRevenue(dateFrom, dateTo),
  })

  const { data: topRecipes } = useQuery({
    queryKey: ['transactions', 'top-recipes', dateFrom, dateTo],
    queryFn: () => transactionsApi.getTopRecipes(10, dateFrom, dateTo),
  })

  const { data: machineStats } = useQuery({
    queryKey: ['transactions', 'machine-stats', dateFrom, dateTo],
    queryFn: () => transactionsApi.getMachineStats(dateFrom, dateTo),
  })

  const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

  const exportReport = () => {
    // TODO: Implement export functionality
    alert('Функция экспорта будет реализована')
  }

  if (statsLoading || dailyLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/transactions">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Финансовые отчеты</h1>
            <p className="mt-2 text-gray-600">Аналитика и статистика транзакций</p>
          </div>
        </div>
        <Button onClick={exportReport}>
          <Download className="h-4 w-4 mr-2" />
          Экспорт отчета
        </Button>
      </div>

      {/* Date Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Дата от
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Дата до
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Выручка</p>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(stats.total_revenue)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {stats.transaction_count || 0} транзакций
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Расходы</p>
              <TrendingDown className="h-5 w-5 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-red-600">
              {formatCurrency(stats.total_expenses)}
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Инкассации</p>
              <TrendingUp className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-blue-600">
              {formatCurrency(stats.total_collections)}
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Прибыль</p>
              <TrendingUp className="h-5 w-5 text-indigo-500" />
            </div>
            <p className="text-3xl font-bold text-indigo-600">
              {formatCurrency(stats.net_profit)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Маржа: {stats.profit_margin?.toFixed(1) || 0}%
            </p>
          </div>
        </div>
      )}

      {/* Daily Revenue Chart */}
      {dailyRevenue && dailyRevenue.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Динамика выручки</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) => formatDate(value)}
              />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: '#10b981', r: 4 }}
                name="Выручка"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Recipes */}
        {topRecipes && topRecipes.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Топ продукты</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topRecipes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="recipe_name" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="total_sales" fill="#4f46e5" name="Продажи" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Machine Stats */}
        {machineStats && machineStats.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Выручка по аппаратам</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={machineStats}
                  dataKey="revenue"
                  nameKey="machine_number"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.machine_number}: ${formatCurrency(entry.revenue)}`}
                >
                  {(machineStats as MachineStatItem[]).map((_: MachineStatItem, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top Recipes Table */}
      {topRecipes && topRecipes.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Детальная статистика по продуктам</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Продукт
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Количество
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Сумма
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {(topRecipes as TopRecipeItem[]).map((item: TopRecipeItem, index: number) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-medium text-gray-900">{item.recipe_name}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-gray-900">{item.total_quantity}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-semibold text-green-600">
                        {formatCurrency(item.total_sales)}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
