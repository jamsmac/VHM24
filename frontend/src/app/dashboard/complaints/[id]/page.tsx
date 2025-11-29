'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, User, Phone, Calendar, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { formatDateTime } from '@/lib/utils'
import { complaintsApi } from '@/lib/complaints-api'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'
import { toast } from 'react-toastify'
import { queryClient } from '@/lib/query-client'

interface ComplaintDetailPageProps {
  params: { id: string }
}

export default function ComplaintDetailPage({ params }: ComplaintDetailPageProps) {
  const { data: complaint, isLoading } = useQuery({
    queryKey: ['complaints', params.id],
    queryFn: () => complaintsApi.getById(params.id),
  })

  const takeInProgressMutation = useMutation({
    mutationFn: () => complaintsApi.takeInProgress(params.id),
    onSuccess: () => {
      toast.success('Жалоба взята в работу')
      queryClient.invalidateQueries({ queryKey: ['complaints', params.id] })
    },
  })

  const resolveMutation = useMutation({
    mutationFn: (resolution: string) => complaintsApi.resolve(params.id, resolution),
    onSuccess: () => {
      toast.success('Жалоба решена')
      queryClient.invalidateQueries({ queryKey: ['complaints', params.id] })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton />
      </div>
    )
  }

  if (!complaint) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Жалоба не найдена</p>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    open: 'bg-orange-100 text-orange-800',
    in_progress: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/complaints">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{complaint.number}</h1>
            <p className="mt-2 text-gray-600">Жалоба от {complaint.customer_name}</p>
          </div>
        </div>
        <Badge className={statusColors[complaint.status]}>
          {complaint.status === 'open' && 'Открыта'}
          {complaint.status === 'in_progress' && 'В работе'}
          {complaint.status === 'resolved' && 'Решена'}
        </Badge>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Информация о клиенте</h3>
        <div className="grid grid-cols-2 gap-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Имя</p>
              <p className="font-semibold">{complaint.customer_name}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Phone className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Телефон</p>
              <p className="font-semibold">{complaint.phone}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Детали жалобы</h3>
        <dl className="space-y-4">
          <div>
            <dt className="text-sm text-gray-600">Аппарат</dt>
            <dd className="font-semibold mt-1">
              {complaint.machine ? (
                <Link href={`/machines/${complaint.machine.id}`} className="text-indigo-600 hover:underline">
                  {complaint.machine.machine_number}
                </Link>
              ) : (
                'Не указан'
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-gray-600">Описание проблемы</dt>
            <dd className="mt-1">{complaint.description}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-600">Дата создания</dt>
            <dd className="mt-1">{formatDateTime(complaint.created_at)}</dd>
          </div>
        </dl>
      </div>

      {complaint.status !== 'resolved' && complaint.status !== 'closed' && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Действия</h3>
          <div className="flex gap-3">
            {complaint.status === 'open' && (
              <Button
                onClick={() => takeInProgressMutation.mutate()}
                disabled={takeInProgressMutation.isPending}
              >
                Взять в работу
              </Button>
            )}
            {complaint.status === 'in_progress' && (
              <Button
                onClick={() => {
                  const resolution = prompt('Введите решение проблемы:')
                  if (resolution) {resolveMutation.mutate(resolution)}
                }}
                disabled={resolveMutation.isPending}
              >
                Решить жалобу
              </Button>
            )}
            <Button variant="secondary">Связаться с клиентом</Button>
          </div>
        </div>
      )}
    </div>
  )
}
