'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contractsApi } from '@/lib/contracts-api'
import { Button } from '@/components/ui/button'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import { ArrowLeft, Trash2, Calendar, Receipt } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'
import { getErrorMessage } from '@/lib/utils'
import type { Machine } from '@/types/machines'
import type { CommissionCalculation } from '@/types/commission'

export default function ContractDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: contract, isLoading } = useQuery({
    queryKey: ['contracts', params.id],
    queryFn: () => contractsApi.getById(params.id),
  })

  const { data: calculations } = useQuery({
    queryKey: ['contracts', params.id, 'calculations'],
    queryFn: () => contractsApi.getCommissionCalculations(params.id),
    enabled: !!contract,
  })

  const { data: machines } = useQuery({
    queryKey: ['contracts', params.id, 'machines'],
    queryFn: () => contractsApi.getMachines(params.id),
    enabled: !!contract,
  })

  const deleteMutation = useMutation({
    mutationFn: () => contractsApi.delete(params.id),
    onSuccess: () => {
      toast.success('Договор успешно удален')
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      router.push('/dashboard/contracts')
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Ошибка при удалении договора'))
    },
  })

  const activateMutation = useMutation({
    mutationFn: () => contractsApi.activate(params.id),
    onSuccess: () => {
      toast.success('Договор активирован')
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
    },
  })

  const suspendMutation = useMutation({
    mutationFn: () => contractsApi.suspend(params.id),
    onSuccess: () => {
      toast.success('Договор приостановлен')
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
    },
  })

  const handleDelete = () => {
    if (confirm('Вы уверены, что хотите удалить этот договор?')) {
      deleteMutation.mutate()
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <CardSkeleton />
      </div>
    )
  }

  if (!contract) {
    return <div className="text-center text-gray-500 py-12">Договор не найден</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/contracts">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{contract.contract_number}</h1>
            <p className="mt-2 text-gray-600">
              {contract.counterparty?.name} (ИНН: {contract.counterparty?.inn})
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {contract.status === 'draft' && (
            <Button onClick={() => activateMutation.mutate()}>Активировать</Button>
          )}
          {contract.status === 'active' && (
            <Button onClick={() => suspendMutation.mutate()} variant="outline">
              Приостановить
            </Button>
          )}
          <Button variant="outline" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Удалить
          </Button>
        </div>
      </div>

      {/* Contract Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Основная информация</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Статус</dt>
              <dd className="mt-1">
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    contract.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : contract.status === 'draft'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {contract.status}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Период действия</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  {new Date(contract.start_date).toLocaleDateString('ru-RU')} -{' '}
                  {contract.end_date
                    ? new Date(contract.end_date).toLocaleDateString('ru-RU')
                    : 'Бессрочный'}
                </div>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Условия оплаты</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {contract.payment_term_days} дней, {contract.payment_type}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Комиссия</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Тип</dt>
              <dd className="mt-1 text-sm text-gray-900 capitalize">{contract.commission_type}</dd>
            </div>
            {contract.commission_type === 'percentage' && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Ставка</dt>
                <dd className="mt-1 text-2xl font-bold text-indigo-600">{contract.commission_rate}%</dd>
              </div>
            )}
            {contract.commission_type === 'fixed' && (
              <>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Сумма</dt>
                  <dd className="mt-1 text-2xl font-bold text-purple-600">
                    {contract.commission_fixed_amount?.toLocaleString()} UZS
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Период</dt>
                  <dd className="mt-1 text-sm text-gray-900">{contract.commission_fixed_period}</dd>
                </div>
              </>
            )}
            {contract.commission_type === 'tiered' && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Уровни</dt>
                <dd className="mt-1 space-y-1">
                  {contract.commission_tiers?.map((tier, i) => (
                    <div key={i} className="text-sm text-gray-900">
                      {tier.from.toLocaleString()} - {tier.to ? tier.to.toLocaleString() : '∞'}: {tier.rate}%
                    </div>
                  ))}
                </dd>
              </div>
            )}
            {contract.commission_type === 'hybrid' && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Условия</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {contract.commission_hybrid_fixed?.toLocaleString()} UZS +{' '}
                  {contract.commission_hybrid_rate}%
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Linked Machines */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Привязанные аппараты</h3>
        {machines && machines.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {machines.map((machine: Machine) => (
              <Link
                key={machine.id}
                href={`/dashboard/machines/${machine.id}`}
                className="p-4 border border-gray-200 rounded-md hover:bg-gray-50"
              >
                <div className="font-medium text-gray-900">{machine.machine_number}</div>
                <div className="text-sm text-gray-500">{machine.name}</div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">Аппараты не привязаны</p>
        )}
      </div>

      {/* Commission Calculations */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Расчеты комиссий</h3>
          <Link href={`/dashboard/commissions?contract_id=${contract.id}`}>
            <Button variant="outline" size="sm">
              <Receipt className="h-4 w-4 mr-2" />
              Все расчеты
            </Button>
          </Link>
        </div>
        {calculations && calculations.length > 0 ? (
          <div className="space-y-2">
            {calculations.slice(0, 5).map((calc: CommissionCalculation) => (
              <Link
                key={calc.id}
                href={`/dashboard/commissions/${calc.id}`}
                className="block p-4 border border-gray-200 rounded-md hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">
                      {new Date(calc.period_start).toLocaleDateString('ru-RU')} -{' '}
                      {new Date(calc.period_end).toLocaleDateString('ru-RU')}
                    </p>
                    <p className="text-lg font-medium text-gray-900">
                      {calc.commission_amount.toLocaleString()} UZS
                    </p>
                    <p className="text-xs text-gray-500">
                      Оборот: {calc.total_revenue.toLocaleString()} UZS ({calc.transaction_count}{' '}
                      транзакций)
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      calc.payment_status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : calc.payment_status === 'overdue'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {calc.payment_status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">Расчеты отсутствуют</p>
        )}
      </div>
    </div>
  )
}
