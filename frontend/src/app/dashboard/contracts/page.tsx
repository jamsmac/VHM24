'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { contractsApi } from '@/lib/contracts-api'
import { Button } from '@/components/ui/button'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import { Plus, Filter, FileText, Calendar } from 'lucide-react'
import Link from 'next/link'
import { ContractStatus, CommissionType } from '@/types/contract'

export default function ContractsPage() {
  const [statusFilter, setStatusFilter] = useState<ContractStatus | undefined>()
  const [typeFilter, setTypeFilter] = useState<CommissionType | undefined>()

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts', statusFilter, typeFilter],
    queryFn: () => contractsApi.getAll({ status: statusFilter, commission_type: typeFilter }),
  })

  const { data: stats } = useQuery({
    queryKey: ['contracts', 'stats'],
    queryFn: contractsApi.getStats,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Договоры</h1>
          <p className="mt-2 text-gray-600">Управление договорами и комиссиями</p>
        </div>
        <Link href="/dashboard/contracts/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Создать договор
          </Button>
        </Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Всего</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_contracts}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Активных</p>
            <p className="text-2xl font-bold text-green-600">{stats.active_count}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Истекает скоро</p>
            <p className="text-2xl font-bold text-orange-600">{stats.expiring_soon_count}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Черновиков</p>
            <p className="text-2xl font-bold text-gray-600">
              {stats.by_status?.draft || 0}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
            <select
              value={statusFilter || ''}
              onChange={(e) => setStatusFilter((e.target.value as ContractStatus) || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Все статусы</option>
              <option value="draft">Черновик</option>
              <option value="active">Активный</option>
              <option value="suspended">Приостановлен</option>
              <option value="expired">Истек</option>
              <option value="terminated">Расторгнут</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Тип комиссии</label>
            <select
              value={typeFilter || ''}
              onChange={(e) => setTypeFilter((e.target.value as CommissionType) || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Все типы</option>
              <option value="percentage">Процент</option>
              <option value="fixed">Фиксированная</option>
              <option value="tiered">Ступенчатая</option>
              <option value="hybrid">Гибридная</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Номер договора
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Контрагент
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Период
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Комиссия
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Действия
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
              ) : contracts && contracts.length > 0 ? (
                contracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-3" />
                        <div className="text-sm font-medium text-gray-900">
                          {contract.contract_number}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {contract.counterparty?.name || 'Не указан'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1 text-gray-400" />
                          {new Date(contract.start_date).toLocaleDateString('ru-RU')}
                        </div>
                        <div className="text-xs text-gray-500">
                          до:{' '}
                          {contract.end_date
                            ? new Date(contract.end_date).toLocaleDateString('ru-RU')
                            : 'Бессрочный'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        {contract.commission_type === 'percentage' && (
                          <span className="text-indigo-600">{contract.commission_rate}%</span>
                        )}
                        {contract.commission_type === 'fixed' && (
                          <span className="text-purple-600">
                            {contract.commission_fixed_amount?.toLocaleString()} UZS
                          </span>
                        )}
                        {contract.commission_type === 'tiered' && (
                          <span className="text-orange-600">Ступенчатая</span>
                        )}
                        {contract.commission_type === 'hybrid' && (
                          <span className="text-pink-600">Гибридная</span>
                        )}
                        <div className="text-xs text-gray-500">
                          {contract.commission_type === 'percentage' && 'Процент'}
                          {contract.commission_type === 'fixed' &&
                            `${contract.commission_fixed_period || 'monthly'}`}
                          {contract.commission_type === 'tiered' &&
                            `${contract.commission_tiers?.length || 0} уровней`}
                          {contract.commission_type === 'hybrid' &&
                            `${contract.commission_hybrid_rate}% + ${contract.commission_hybrid_fixed?.toLocaleString()}`}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          contract.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : contract.status === 'draft'
                            ? 'bg-gray-100 text-gray-800'
                            : contract.status === 'suspended'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {contract.status === 'active' && 'Активный'}
                        {contract.status === 'draft' && 'Черновик'}
                        {contract.status === 'suspended' && 'Приостановлен'}
                        {contract.status === 'expired' && 'Истек'}
                        {contract.status === 'terminated' && 'Расторгнут'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/dashboard/contracts/${contract.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Подробнее
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Договоры не найдены
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
