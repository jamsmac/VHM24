'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export default function SalesReportPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Mock data
  const data = [
    { date: '01.11', sales: 45000 },
    { date: '02.11', sales: 52000 },
    { date: '03.11', sales: 48000 },
    { date: '04.11', sales: 61000 },
    { date: '05.11', sales: 55000 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Отчет по продажам</h1>
          <p className="mt-2 text-gray-600">Аналитика продаж по аппаратам и товарам</p>
        </div>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Экспорт
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-2 gap-4">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Всего продаж</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(261000)}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Средний чек</p>
          <p className="text-2xl font-bold text-indigo-600">{formatCurrency(150)}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Количество транзакций</p>
          <p className="text-2xl font-bold text-gray-900">1740</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Рост vs прошлый период</p>
          <p className="text-2xl font-bold text-green-600 flex items-center">
            <TrendingUp className="h-5 w-5 mr-1" />
            +12%
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Динамика продаж</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
