'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Filter } from 'lucide-react'
import Link from 'next/link'
import { formatDateTime } from '@/lib/utils'
import { complaintsApi, type ComplaintStatus } from '@/lib/complaints-api'

export default function ComplaintsPage() {
  const [statusFilter, setStatusFilter] = useState<ComplaintStatus | ''>('')

  const { data: complaints = [] } = useQuery({
    queryKey: ['complaints', statusFilter],
    queryFn: () => complaintsApi.getAll({
      status: statusFilter || undefined,
    }),
  })

  const statusColors: Record<string, string> = {
    open: 'bg-orange-100 text-orange-800',
    in_progress: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
  }

  const statusLabels: Record<string, string> = {
    open: 'Открыта',
    in_progress: 'В работе',
    resolved: 'Решена',
    closed: 'Закрыта',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Жалобы</h1>
          <p className="mt-2 text-gray-600">Управление жалобами клиентов</p>
        </div>
        <Link href="/complaints/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Добавить жалобу
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Всего жалоб</p>
          <p className="text-2xl font-bold">{complaints.length}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Открытых</p>
          <p className="text-2xl font-bold text-orange-600">
            {complaints.filter(c => c.status === 'open').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Решено</p>
          <p className="text-2xl font-bold text-green-600">
            {complaints.filter(c => c.status === 'resolved').length}
          </p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-600">Среднее время</p>
          <p className="text-2xl font-bold">1.5ч</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-gray-600" />
          <h3 className="font-medium">Фильтры</h3>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ComplaintStatus | '')}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          <option value="">Все статусы</option>
          <option value="open">Открытые</option>
          <option value="in_progress">В работе</option>
          <option value="resolved">Решенные</option>
          <option value="closed">Закрытые</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="min-w-full divide-y">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Номер
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Клиент
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Аппарат
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Описание
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Статус
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Дата
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {complaints.map((complaint) => (
              <tr key={complaint.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium">{complaint.number}</td>
                <td className="px-6 py-4">
                  <p className="font-medium">{complaint.customer_name}</p>
                  <p className="text-sm text-gray-500">{complaint.phone}</p>
                </td>
                <td className="px-6 py-4">{complaint.machine?.machine_number || 'Не указан'}</td>
                <td className="px-6 py-4 max-w-xs truncate">{complaint.description}</td>
                <td className="px-6 py-4">
                  <Badge className={statusColors[complaint.status]}>
                    {statusLabels[complaint.status]}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {formatDateTime(complaint.created_at)}
                </td>
                <td className="px-6 py-4">
                  <Link href={`/complaints/${complaint.id}`}>
                    <Button variant="secondary" size="sm">Просмотр</Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
