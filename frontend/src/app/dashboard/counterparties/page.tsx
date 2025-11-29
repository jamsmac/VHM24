'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { counterpartiesApi } from '@/lib/counterparties-api'
import { Button } from '@/components/ui/button'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import { Plus, Filter, Building2, Phone, Mail, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { CounterpartyType } from '@/types/counterparty'

export default function CounterpartiesPage() {
  const [typeFilter, setTypeFilter] = useState<CounterpartyType | undefined>()
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>()

  const { data: counterparties, isLoading } = useQuery({
    queryKey: ['counterparties', typeFilter, activeFilter],
    queryFn: () => counterpartiesApi.getAll({ type: typeFilter, is_active: activeFilter }),
  })

  const { data: stats } = useQuery({
    queryKey: ['counterparties', 'stats'],
    queryFn: counterpartiesApi.getStats,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Контрагенты</h1>
          <p className="mt-2 text-gray-600">Управление контрагентами и партнерами</p>
        </div>
        <Link href="/dashboard/counterparties/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Добавить контрагента
          </Button>
        </Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Всего</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_counterparties}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Активных</p>
            <p className="text-2xl font-bold text-green-600">{stats.active_count}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Клиентов</p>
            <p className="text-2xl font-bold text-indigo-600">
              {stats.by_type?.client || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Владельцев локаций</p>
            <p className="text-2xl font-bold text-purple-600">
              {stats.by_type?.location_owner || 0}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Тип</label>
            <select
              value={typeFilter || ''}
              onChange={(e) => setTypeFilter((e.target.value as CounterpartyType) || undefined)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Все типы</option>
              <option value="client">Клиент</option>
              <option value="supplier">Поставщик</option>
              <option value="partner">Партнер</option>
              <option value="location_owner">Владелец локации</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
            <select
              value={activeFilter === undefined ? '' : activeFilter.toString()}
              onChange={(e) => setActiveFilter(e.target.value === '' ? undefined : e.target.value === 'true')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Все статусы</option>
              <option value="true">Активные</option>
              <option value="false">Неактивные</option>
            </select>
          </div>
        </div>
      </div>

      {/* Counterparties Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Название
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ИНН
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Тип
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Контакты
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
              ) : counterparties && counterparties.length > 0 ? (
                counterparties.map((counterparty) => (
                  <tr key={counterparty.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building2 className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {counterparty.name}
                          </div>
                          {counterparty.short_name && (
                            <div className="text-sm text-gray-500">{counterparty.short_name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{counterparty.inn}</div>
                      {counterparty.oked && (
                        <div className="text-xs text-gray-500">ОКЭД: {counterparty.oked}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                        {counterparty.type === 'client' && 'Клиент'}
                        {counterparty.type === 'supplier' && 'Поставщик'}
                        {counterparty.type === 'partner' && 'Партнер'}
                        {counterparty.type === 'location_owner' && 'Владелец локации'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {counterparty.phone && (
                          <div className="flex items-center mb-1">
                            <Phone className="h-3 w-3 mr-1 text-gray-400" />
                            {counterparty.phone}
                          </div>
                        )}
                        {counterparty.email && (
                          <div className="flex items-center">
                            <Mail className="h-3 w-3 mr-1 text-gray-400" />
                            {counterparty.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {counterparty.is_active ? (
                        <span className="flex items-center text-sm text-green-600">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Активен
                        </span>
                      ) : (
                        <span className="flex items-center text-sm text-gray-400">
                          <XCircle className="h-4 w-4 mr-1" />
                          Неактивен
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/dashboard/counterparties/${counterparty.id}`}
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
                    Контрагенты не найдены
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
