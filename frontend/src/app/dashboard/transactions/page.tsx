'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { transactionsApi } from '@/lib/transactions-api'
import { Badge } from '@/components/ui/badge'
import { TableSkeleton } from '@/components/ui/LoadingSkeleton'
import { formatDateTime, formatCurrency, getStatusColor } from '@/lib/utils'
import { Filter, Download } from 'lucide-react'
import { TransactionType } from '@/types/transactions'
import Link from 'next/link'

export default function TransactionsPage() {
  const [typeFilter, setTypeFilter] = useState<TransactionType | undefined>()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', typeFilter, dateFrom, dateTo],
    queryFn: () => transactionsApi.getAll({
      transactionType: typeFilter,
      dateFrom,
      dateTo,
    }),
  })

  const { data: stats } = useQuery({
    queryKey: ['transactions', 'stats', dateFrom, dateTo],
    queryFn: () => transactionsApi.getStats(dateFrom, dateTo),
  })

  const typeColors: Record<string, string> = {
    sale: 'bg-green-100 text-green-800',
    collection: 'bg-blue-100 text-blue-800',
    expense: 'bg-red-100 text-red-800',
    refund: 'bg-orange-100 text-orange-800',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Транзакции</h1>
          <p className="mt-2 text-gray-600">Финансовые операции</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
          <Download className="h-4 w-4" />
          Экспорт
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Выручка</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.total_revenue)}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Расходы</p>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(stats.total_expenses)}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Инкассации</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(stats.total_collections)}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Прибыль</p>
            <p className="text-2xl font-bold text-indigo-600">
              {formatCurrency(stats.net_profit)}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-gray-600" />
          <h3 className="font-medium text-gray-900">Фильтры</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={typeFilter || ''}
            onChange={(e) => setTypeFilter(e.target.value as TransactionType || undefined)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Все типы</option>
            <option value="sale">Продажа</option>
            <option value="collection">Инкассация</option>
            <option value="expense">Расход</option>
            <option value="refund">Возврат</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="С"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="По"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Номер
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Тип
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Сумма
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Аппарат
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4">
                    <TableSkeleton rows={5} />
                  </td>
                </tr>
              ) : transactions && transactions.length > 0 ? (
                transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {transaction.transaction_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={typeColors[transaction.transaction_type]}>
                        {transaction.transaction_type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {transaction.machine?.machine_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(transaction.transaction_date)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Транзакции не найдены
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
