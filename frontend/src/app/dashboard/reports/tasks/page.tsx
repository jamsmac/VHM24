'use client'

import { Button } from '@/components/ui/button'
import { Download, CheckCircle, Clock, XCircle } from 'lucide-react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export default function TasksReportPage() {
  const data = [
    { operator: 'Иванов', completed: 45, pending: 5, overdue: 2 },
    { operator: 'Петров', completed: 38, pending: 8, overdue: 1 },
    { operator: 'Сидоров', completed: 52, pending: 3, overdue: 0 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Отчет по задачам</h1>
          <p className="mt-2 text-gray-600">Эффективность работы операторов</p>
        </div>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Экспорт
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <p className="text-sm text-gray-600">Выполнено</p>
          </div>
          <p className="text-2xl font-bold text-green-600">135</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <p className="text-sm text-gray-600">В работе</p>
          </div>
          <p className="text-2xl font-bold text-blue-600">16</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-gray-600">Просрочено</p>
          </div>
          <p className="text-2xl font-bold text-red-600">3</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Среднее время</p>
          <p className="text-2xl font-bold text-gray-900">2.5ч</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Производительность по операторам</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <XAxis dataKey="operator" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="completed" fill="#10b981" name="Выполнено" />
            <Bar dataKey="pending" fill="#3b82f6" name="В работе" />
            <Bar dataKey="overdue" fill="#ef4444" name="Просрочено" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
