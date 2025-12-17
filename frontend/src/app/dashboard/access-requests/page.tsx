'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accessRequestsApi, type AccessRequest } from '@/lib/access-requests-api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Filter, User, Check, X, Clock, Calendar } from 'lucide-react'
import { TableSkeleton } from '@/components/ui/LoadingSkeleton'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { toast } from 'react-toastify'
import { getErrorMessage } from '@/lib/utils'

export default function AccessRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<'new' | 'approved' | 'rejected' | undefined>()
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [approveData, setApproveData] = useState({ role: 'Operator', note: '' })
  const [rejectReason, setRejectReason] = useState('')

  const queryClient = useQueryClient()

  const { data: requests, isLoading } = useQuery({
    queryKey: ['access-requests', statusFilter],
    queryFn: () => accessRequestsApi.getAll({ status: statusFilter }),
  })

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      accessRequestsApi.approve(id, {
        role: approveData.role,
        note: approveData.note || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-requests'] })
      toast.success('Заявка одобрена')
      setShowApproveModal(false)
      setSelectedRequest(null)
      setApproveData({ role: 'Operator', note: '' })
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Ошибка при одобрении заявки'))
    },
  })

  const rejectMutation = useMutation({
    mutationFn: (id: string) =>
      accessRequestsApi.reject(id, { reason: rejectReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-requests'] })
      toast.success('Заявка отклонена')
      setShowRejectModal(false)
      setSelectedRequest(null)
      setRejectReason('')
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Ошибка при отклонении заявки'))
    },
  })

  const statusLabels = {
    new: 'Новая',
    approved: 'Одобрена',
    rejected: 'Отклонена',
  }

  const statusColors = {
    new: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  }

  const handleApprove = (request: AccessRequest) => {
    setSelectedRequest(request)
    setShowApproveModal(true)
  }

  const handleReject = (request: AccessRequest) => {
    setSelectedRequest(request)
    setShowRejectModal(true)
  }

  const confirmApprove = () => {
    if (selectedRequest) {
      approveMutation.mutate(selectedRequest.id)
    }
  }

  const confirmReject = () => {
    if (selectedRequest && rejectReason.trim()) {
      rejectMutation.mutate(selectedRequest.id)
    } else {
      toast.error('Укажите причину отклонения')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Заявки на доступ</h1>
          <p className="mt-2 text-gray-600">
            Управление заявками на регистрацию от Telegram-бота
          </p>
        </div>
      </div>

      {/* Statistics */}
      {requests && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Всего заявок</p>
            <p className="text-2xl font-bold text-gray-900">{requests.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Новых</p>
            <p className="text-2xl font-bold text-yellow-600">
              {requests.filter((r) => r.status === 'new').length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Одобренных</p>
            <p className="text-2xl font-bold text-green-600">
              {requests.filter((r) => r.status === 'approved').length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Отклоненных</p>
            <p className="text-2xl font-bold text-red-600">
              {requests.filter((r) => r.status === 'rejected').length}
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
          <select
            value={statusFilter || ''}
            onChange={(e) =>
              setStatusFilter(
                (e.target.value as 'new' | 'approved' | 'rejected') || undefined
              )
            }
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Все статусы</option>
            <option value="new">Новые</option>
            <option value="approved">Одобренные</option>
            <option value="rejected">Отклоненные</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Пользователь
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Telegram
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Дата создания
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4">
                    <TableSkeleton rows={8} />
                  </td>
                </tr>
              ) : requests && requests.length > 0 ? (
                requests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-full">
                          <User className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {request.first_name} {request.last_name}
                          </p>
                          {request.note && (
                            <p className="text-sm text-gray-500">{request.note}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-900">
                          @{request.telegram_username || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">
                          ID: {request.telegram_user_id}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={statusColors[request.status]}>
                        {statusLabels[request.status]}
                      </Badge>
                      {request.rejection_reason && (
                        <p className="mt-1 text-xs text-red-600">
                          {request.rejection_reason}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {formatDistanceToNow(new Date(request.created_at), {
                            addSuffix: true,
                            locale: ru,
                          })}
                        </span>
                      </div>
                      {request.processed_at && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            Обработана{' '}
                            {formatDistanceToNow(new Date(request.processed_at), {
                              addSuffix: true,
                              locale: ru,
                            })}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {request.status === 'new' ? (
                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleApprove(request)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Одобрить
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleReject(request)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Отклонить
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Обработана</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    Заявки не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Одобрить заявку
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Пользователь:</p>
                <p className="font-medium text-gray-900">
                  {selectedRequest.first_name} {selectedRequest.last_name}
                </p>
                <p className="text-sm text-gray-500">
                  @{selectedRequest.telegram_username}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Роль
                </label>
                <select
                  value={approveData.role}
                  onChange={(e) =>
                    setApproveData({ ...approveData, role: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="Operator">Оператор</option>
                  <option value="Manager">Менеджер</option>
                  <option value="Viewer">Наблюдатель</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Примечание (опционально)
                </label>
                <textarea
                  value={approveData.note}
                  onChange={(e) =>
                    setApproveData({ ...approveData, note: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Дополнительная информация..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="primary"
                onClick={confirmApprove}
                disabled={approveMutation.isPending}
                className="flex-1"
              >
                {approveMutation.isPending ? 'Обработка...' : 'Одобрить'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowApproveModal(false)
                  setSelectedRequest(null)
                  setApproveData({ role: 'Operator', note: '' })
                }}
                disabled={approveMutation.isPending}
                className="flex-1"
              >
                Отмена
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Отклонить заявку
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Пользователь:</p>
                <p className="font-medium text-gray-900">
                  {selectedRequest.first_name} {selectedRequest.last_name}
                </p>
                <p className="text-sm text-gray-500">
                  @{selectedRequest.telegram_username}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Причина отклонения *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Укажите причину отклонения заявки..."
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="primary"
                onClick={confirmReject}
                disabled={rejectMutation.isPending || !rejectReason.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {rejectMutation.isPending ? 'Обработка...' : 'Отклонить'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowRejectModal(false)
                  setSelectedRequest(null)
                  setRejectReason('')
                }}
                disabled={rejectMutation.isPending}
                className="flex-1"
              >
                Отмена
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
