'use client'

import { useQuery } from '@tanstack/react-query'
import { transactionsApi } from '@/lib/transactions-api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, DollarSign, Calendar, MapPin, User, Package, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { formatDateTime, formatCurrency } from '@/lib/utils'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'

interface TransactionDetailPageProps {
  params: {
    id: string
  }
}

export default function TransactionDetailPage({ params }: TransactionDetailPageProps) {
  const { data: transaction, isLoading } = useQuery({
    queryKey: ['transactions', params.id],
    queryFn: () => transactionsApi.getById(params.id),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton />
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Транзакция не найдена</p>
      </div>
    )
  }

  const typeLabels: Record<string, string> = {
    sale: 'Продажа',
    collection: 'Инкассация',
    expense: 'Расход',
    refund: 'Возврат',
  }

  const typeColors: Record<string, string> = {
    sale: 'bg-green-100 text-green-800',
    collection: 'bg-blue-100 text-blue-800',
    expense: 'bg-red-100 text-red-800',
    refund: 'bg-orange-100 text-orange-800',
  }

  const paymentMethodLabels: Record<string, string> = {
    cash: 'Наличные',
    card: 'Карта',
    mobile: 'Мобильный',
    qr: 'QR-код',
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
            <h1 className="text-3xl font-bold text-gray-900">{transaction.transaction_number}</h1>
            <p className="mt-2 text-gray-600">{typeLabels[transaction.transaction_type]}</p>
          </div>
        </div>
        <Badge className={typeColors[transaction.transaction_type]}>
          {typeLabels[transaction.transaction_type]}
        </Badge>
      </div>

      {/* Main Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Сумма</p>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(transaction.amount)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Дата и время</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatDateTime(transaction.transaction_date)}
              </p>
            </div>
          </div>

          {transaction.machine && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MapPin className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Аппарат</p>
                <Link href={`/machines/${transaction.machine.id}`}>
                  <p className="text-lg font-semibold text-indigo-600 hover:underline">
                    {transaction.machine.machine_number}
                  </p>
                </Link>
                <p className="text-sm text-gray-500">{transaction.machine.location?.name}</p>
              </div>
            </div>
          )}

          {transaction.created_by && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <User className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Создано</p>
                <p className="text-lg font-semibold text-gray-900">
                  {transaction.created_by.full_name}
                </p>
                <p className="text-sm text-gray-500">{transaction.created_by.phone}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Details */}
      {(transaction.payment_method || transaction.payment_system) && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Детали оплаты</h3>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            {transaction.payment_method && (
              <div>
                <dt className="text-gray-600">Метод оплаты</dt>
                <dd className="font-medium text-gray-900">
                  {paymentMethodLabels[transaction.payment_method] || transaction.payment_method}
                </dd>
              </div>
            )}
            {transaction.payment_system && (
              <div>
                <dt className="text-gray-600">Платежная система</dt>
                <dd className="font-medium text-gray-900">{transaction.payment_system}</dd>
              </div>
            )}
            {transaction.payment_transaction_id && (
              <div className="col-span-2">
                <dt className="text-gray-600">ID транзакции</dt>
                <dd className="font-mono text-sm text-gray-900">{transaction.payment_transaction_id}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Sale Items */}
      {transaction.items && transaction.items.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Товары</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Товар
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Количество
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Цена
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Сумма
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transaction.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{item.recipe?.name}</p>
                          <p className="text-sm text-gray-500">{item.recipe?.sku}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-gray-900">{item.quantity}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-gray-900">{formatCurrency(item.unit_price || 0)}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency((item.unit_price || 0) * item.quantity)}
                      </p>
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50">
                  <td colSpan={3} className="px-6 py-4 text-right font-semibold text-gray-900">
                    Итого:
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(transaction.amount)}
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expense Details */}
      {transaction.transaction_type === 'expense' && transaction.expense_category && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Детали расхода</h3>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-600">Категория</dt>
              <dd className="font-medium text-gray-900">{transaction.expense_category}</dd>
            </div>
            {transaction.expense_description && (
              <div className="col-span-2">
                <dt className="text-gray-600">Описание</dt>
                <dd className="font-medium text-gray-900">{transaction.expense_description}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Collection Details */}
      {transaction.transaction_type === 'collection' && transaction.task && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Связанная задача</h3>
          <div className="flex items-center gap-3">
            <p className="text-sm text-blue-700">
              Транзакция создана автоматически при завершении задачи инкассации
            </p>
            <Link href={`/tasks/${transaction.task.id}`}>
              <Button variant="secondary" size="sm">
                Просмотреть задачу
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Notes */}
      {transaction.notes && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Примечания</h3>
          <p className="text-gray-700">{transaction.notes}</p>
        </div>
      )}
    </div>
  )
}
