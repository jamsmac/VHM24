'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { commissionsApi } from '@/lib/commissions-api'
import { Button } from '@/components/ui/button'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import { AlertCircle, CheckCircle, Clock, Filter, Calculator, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { PaymentStatus } from '@/types/commission'
import { toast } from 'react-toastify'
import { getErrorMessage } from '@/lib/utils'

export default function CommissionsPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | undefined>()

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['commissions', 'dashboard'],
    queryFn: commissionsApi.getDashboard,
  })

  const { data: calculations } = useQuery({
    queryKey: ['commissions', statusFilter],
    queryFn: () => commissionsApi.getAll({ payment_status: statusFilter, limit: 50 }),
  })

  const calculateNowMutation = useMutation({
    mutationFn: () => commissionsApi.calculateNow({ period: 'all' }),
    onSuccess: (data) => {
      toast.success(`Расчет запущен! Job ID: ${data.job_id}`)
      setTimeout(() => queryClient.invalidateQueries({ queryKey: ['commissions'] }), 5000)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Ошибка при запуске расчета'))
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Комиссии</h1>
          <p className="mt-2 text-gray-600">Расчеты и статистика комиссионных выплат</p>
        </div>
        <Button onClick={() => calculateNowMutation.mutate()} disabled={calculateNowMutation.isPending}>
          <Calculator className="h-4 w-4 mr-2" />
          {calculateNowMutation.isPending ? 'Расчет...' : 'Рассчитать сейчас'}
        </Button>
      </div>

      {/* Stats */}
      {dashboard?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Ожидают оплаты</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {dashboard.stats.total_pending_amount.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  {dashboard.stats.by_status?.pending || 0} расчетов
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Просрочено</p>
                <p className="text-2xl font-bold text-red-600">
                  {dashboard.stats.total_overdue_amount.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">{dashboard.stats.overdue_count} расчетов</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Оплачено</p>
                <p className="text-2xl font-bold text-green-600">
                  {dashboard.stats.total_paid_amount.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  {dashboard.stats.by_status?.paid || 0} расчетов
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Всего расчетов</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {dashboard.stats.total_calculations}
                </p>
                <p className="text-xs text-gray-500">за всё время</p>
              </div>
              <TrendingUp className="h-8 w-8 text-indigo-400" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-gray-600" />
          <h3 className="font-medium text-gray-900">Фильтры</h3>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Статус оплаты</label>
          <select
            value={statusFilter || ''}
            onChange={(e) => setStatusFilter((e.target.value as PaymentStatus) || undefined)}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Все статусы</option>
            <option value="pending">Ожидает оплаты</option>
            <option value="paid">Оплачено</option>
            <option value="overdue">Просрочено</option>
            <option value="cancelled">Отменено</option>
          </select>
        </div>
      </div>

      {/* Revenue by Contract */}
      {dashboard?.revenue_by_contract && dashboard.revenue_by_contract.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Топ договоров по выручке</h3>
          <div className="space-y-3">
            {dashboard.revenue_by_contract.slice(0, 10).map((item) => (
              <Link
                key={item.contract_id}
                href={`/dashboard/contracts/${item.contract_id}`}
                className="block p-4 border border-gray-200 rounded-md hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.contract_number}</p>
                    <p className="text-sm text-gray-500">
                      Последний расчет:{' '}
                      {new Date(item.last_calculation_date).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-indigo-600">
                      {item.total_commission.toLocaleString()} UZS
                    </p>
                    <p className="text-sm text-gray-500">
                      Оборот: {item.total_revenue.toLocaleString()} UZS
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Calculations */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Расчеты комиссий</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Период
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Договор
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Оборот
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Комиссия
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Срок оплаты
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12">
                    <div className="flex justify-center">
                      <CardSkeleton />
                    </div>
                  </td>
                </tr>
              ) : calculations?.data && calculations.data.length > 0 ? (
                calculations.data.map((calc) => (
                  <tr key={calc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(calc.period_start).toLocaleDateString('ru-RU')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(calc.period_end).toLocaleDateString('ru-RU')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {calc.contract?.contract_number || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {calc.contract?.counterparty?.name || ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {calc.total_revenue.toLocaleString()} UZS
                      </div>
                      <div className="text-xs text-gray-500">
                        {calc.transaction_count} транзакций
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-indigo-600">
                        {calc.commission_amount.toLocaleString()} UZS
                      </div>
                      <div className="text-xs text-gray-500">{calc.commission_type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          calc.payment_status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : calc.payment_status === 'overdue'
                            ? 'bg-red-100 text-red-800'
                            : calc.payment_status === 'cancelled'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {calc.payment_status === 'pending' && 'Ожидает'}
                        {calc.payment_status === 'paid' && 'Оплачено'}
                        {calc.payment_status === 'overdue' && 'Просрочено'}
                        {calc.payment_status === 'cancelled' && 'Отменено'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {calc.payment_due_date
                        ? new Date(calc.payment_due_date).toLocaleDateString('ru-RU')
                        : 'N/A'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Расчеты не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
