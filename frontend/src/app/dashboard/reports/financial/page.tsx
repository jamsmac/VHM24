'use client'

import { Button } from '@/components/ui/button'
import { Download, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'

export default function FinancialReportPage() {
  const data = [
    { month: 'Янв', revenue: 450000, expenses: 180000, profit: 270000 },
    { month: 'Фев', revenue: 520000, expenses: 195000, profit: 325000 },
    { month: 'Мар', revenue: 480000, expenses: 175000, profit: 305000 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Финансовый отчет</h1>
          <p className="mt-2 text-gray-600">Доходы, расходы и прибыль</p>
        </div>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Экспорт
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Выручка</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(1450000)}</p>
          <p className="text-sm text-green-600 mt-1">
            <TrendingUp className="h-4 w-4 inline mr-1" />
            +8% vs прошлый квартал
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Расходы</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(550000)}</p>
          <p className="text-sm text-red-600 mt-1">
            <TrendingUp className="h-4 w-4 inline mr-1" />
            +3% vs прошлый квартал
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Прибыль</p>
          <p className="text-2xl font-bold text-indigo-600">{formatCurrency(900000)}</p>
          <p className="text-sm text-green-600 mt-1">
            <TrendingUp className="h-4 w-4 inline mr-1" />
            +12% vs прошлый квартал
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Маржа</p>
          <p className="text-2xl font-bold text-gray-900">62%</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Финансовая динамика</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(Number(value) || 0)} />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#10b981" name="Выручка" strokeWidth={2} />
            <Line type="monotone" dataKey="expenses" stroke="#ef4444" name="Расходы" strokeWidth={2} />
            <Line type="monotone" dataKey="profit" stroke="#6366f1" name="Прибыль" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
