'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Filter, User, Calendar } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { TableSkeleton } from '@/components/ui/LoadingSkeleton'
import { auditApi } from '@/lib/audit-api'

export default function AuditLogsPage() {
  const [actionFilter, setActionFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', actionFilter, dateFrom],
    queryFn: () => auditApi.getAll({
      action: actionFilter || undefined,
      date_from: dateFrom || undefined,
    }),
  })

  const logs = data?.data || []

  const actionColors: Record<string, string> = {
    CREATE: 'bg-green-100 text-green-800',
    UPDATE: 'bg-blue-100 text-blue-800',
    DELETE: 'bg-red-100 text-red-800',
    LOGIN: 'bg-purple-100 text-purple-800',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Журнал аудита</h1>
        <p className="mt-2 text-gray-600">История действий пользователей</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-gray-600" />
          <h3 className="font-medium text-gray-900">Фильтры</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Все действия</option>
            <option value="CREATE">Создание</option>
            <option value="UPDATE">Обновление</option>
            <option value="DELETE">Удаление</option>
            <option value="LOGIN">Вход</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Дата"
          />

          <input
            type="text"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Поиск по пользователю"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Пользователь
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Действие
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Описание
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                IP адрес
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Время
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-4">
                  <TableSkeleton rows={10} />
                </td>
              </tr>
            ) : logs.length > 0 ? (
              logs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{log.user.full_name}</p>
                      <p className="text-sm text-gray-500">{log.user.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge className={actionColors[log.action]}>
                    {log.action}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-900">{log.description}</p>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {log.ip_address}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {formatDateTime(log.created_at)}
                </td>
              </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  Нет записей в журнале аудита
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
