'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  auditLogApi,
  AuditEventType,
  AuditSeverity,
  eventTypeLabels,
  severityLabels,
  eventTypeCategories,
  categoryLabels,
  AuditLogQueryParams,
} from '@/lib/audit-log-api'
import { AuditLogTable } from '@/components/audit/AuditLogTable'
import { Button } from '@/components/ui/button'
import {
  Activity,
  Filter,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  AlertTriangle,
  Shield,
  CheckCircle,
} from 'lucide-react'

const ITEMS_PER_PAGE = 50

export default function AuditLogPage() {
  const [filters, setFilters] = useState<AuditLogQueryParams>({
    limit: ITEMS_PER_PAGE,
    offset: 0,
  })
  const [showFilters, setShowFilters] = useState(false)

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => auditLogApi.getAll(filters),
    staleTime: 30000,
  })

  const handleFilterChange = (key: keyof AuditLogQueryParams, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
      offset: 0, // Reset pagination when filters change
    }))
  }

  const clearFilters = () => {
    setFilters({
      limit: ITEMS_PER_PAGE,
      offset: 0,
    })
  }

  const handlePageChange = (newOffset: number) => {
    setFilters((prev) => ({
      ...prev,
      offset: newOffset,
    }))
  }

  const hasActiveFilters =
    filters.event_type ||
    filters.severity ||
    filters.user_id ||
    filters.from_date ||
    filters.to_date ||
    filters.ip_address

  const totalPages = data ? Math.ceil(data.total / ITEMS_PER_PAGE) : 0
  const currentPage = Math.floor((filters.offset || 0) / ITEMS_PER_PAGE) + 1

  // Calculate stats from data
  const stats = data?.data
    ? {
        total: data.total,
        success: data.data.filter((l) => l.success).length,
        failed: data.data.filter((l) => !l.success).length,
        security: data.data.filter(
          (l) =>
            l.severity !== AuditSeverity.INFO ||
            eventTypeCategories.security.includes(l.event_type)
        ).length,
      }
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Журнал аудита</h1>
          <p className="mt-2 text-gray-600">
            История всех действий и событий безопасности
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Фильтры
            {hasActiveFilters && (
              <span className="ml-2 bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full text-xs">
                Активны
              </span>
            )}
          </Button>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Activity className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-500">Всего записей</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.success}</p>
                <p className="text-sm text-gray-500">Успешных</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <X className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.failed}</p>
                <p className="text-sm text-gray-500">Неудачных</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Shield className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.security}</p>
                <p className="text-sm text-gray-500">Безопасность</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Фильтры</h3>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Сбросить
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Event Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Тип события
              </label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={filters.event_type || ''}
                onChange={(e) => handleFilterChange('event_type', e.target.value as AuditEventType)}
              >
                <option value="">Все типы</option>
                {Object.entries(categoryLabels).map(([category, label]) => (
                  <optgroup key={category} label={label}>
                    {eventTypeCategories[category as keyof typeof eventTypeCategories].map((type) => (
                      <option key={type} value={type}>
                        {eventTypeLabels[type]}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Важность
              </label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={filters.severity || ''}
                onChange={(e) => handleFilterChange('severity', e.target.value as AuditSeverity)}
              >
                <option value="">Все уровни</option>
                {Object.entries(severityLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* From Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                С даты
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={filters.from_date?.split('T')[0] || ''}
                onChange={(e) =>
                  handleFilterChange(
                    'from_date',
                    e.target.value ? new Date(e.target.value).toISOString() : undefined
                  )
                }
              />
            </div>

            {/* To Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                По дату
              </label>
              <input
                type="date"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={filters.to_date?.split('T')[0] || ''}
                onChange={(e) =>
                  handleFilterChange(
                    'to_date',
                    e.target.value ? new Date(e.target.value).toISOString() : undefined
                  )
                }
              />
            </div>

            {/* IP Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IP адрес
              </label>
              <input
                type="text"
                placeholder="192.168.1.1"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={filters.ip_address || ''}
                onChange={(e) => handleFilterChange('ip_address', e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <div>
            <p className="font-medium text-red-800">Ошибка загрузки журнала аудита</p>
            <p className="text-sm text-red-600">Проверьте права доступа или попробуйте позже</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-auto">
            Повторить
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <AuditLogTable logs={data?.data || []} isLoading={isLoading} />

        {/* Pagination */}
        {data && data.total > ITEMS_PER_PAGE && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Показано {(filters.offset || 0) + 1} —{' '}
              {Math.min((filters.offset || 0) + ITEMS_PER_PAGE, data.total)} из {data.total}
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange((filters.offset || 0) - ITEMS_PER_PAGE)}
                disabled={!filters.offset || filters.offset === 0}
              >
                <ChevronLeft className="h-4 w-4" />
                Назад
              </Button>

              <span className="text-sm text-gray-600">
                Страница {currentPage} из {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange((filters.offset || 0) + ITEMS_PER_PAGE)}
                disabled={(filters.offset || 0) + ITEMS_PER_PAGE >= data.total}
              >
                Вперёд
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
