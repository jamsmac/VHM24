'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { usersApi } from '@/lib/users-api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, User, Phone, Mail, Calendar, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { formatDateTime, getErrorMessage } from '@/lib/utils'
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton'
import { toast } from 'react-toastify'
import { queryClient } from '@/lib/query-client'
import { UserRole, getRoleLabel, getRoleBadgeClass } from '@/types/users'

interface UserDetailPageProps {
  params: {
    id: string
  }
}

export default function UserDetailPage({ params }: UserDetailPageProps) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['users', params.id],
    queryFn: () => usersApi.getById(params.id),
  })

  const activateMutation = useMutation({
    mutationFn: () => usersApi.activate(params.id),
    onSuccess: () => {
      toast.success('Пользователь активирован')
      queryClient.invalidateQueries({ queryKey: ['users', params.id] })
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Ошибка при активации'))
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: () => usersApi.deactivate(params.id),
    onSuccess: () => {
      toast.success('Пользователь деактивирован')
      queryClient.invalidateQueries({ queryKey: ['users', params.id] })
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Ошибка при деактивации'))
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Пользователь не найден</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/users">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Назад
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{user.full_name}</h1>
            <p className="mt-2 text-gray-600">{user.username}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge className={getRoleBadgeClass(user.role)}>
            {getRoleLabel(user.role)}
          </Badge>
          {user.is_active ? (
            <Badge className="bg-green-100 text-green-800">
              Активен
            </Badge>
          ) : (
            <Badge className="bg-gray-100 text-gray-800">
              Неактивен
            </Badge>
          )}
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Информация о пользователе</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Полное имя</p>
              <p className="text-lg font-semibold text-gray-900">{user.full_name}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Phone className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Телефон</p>
              <p className="text-lg font-semibold text-gray-900">{user.phone}</p>
            </div>
          </div>

          {user.email && (
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Mail className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-lg font-semibold text-gray-900">{user.email}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Создан</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatDateTime(user.created_at)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Role & Permissions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Роль и права доступа</h3>
        <dl className="grid grid-cols-1 gap-4 text-sm">
          <div>
            <dt className="text-gray-600">Роль в системе</dt>
            <dd className="mt-1">
              <Badge className={getRoleBadgeClass(user.role)}>
                {getRoleLabel(user.role)}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-gray-600 mb-2">Описание роли</dt>
            <dd className="text-gray-900">
              {user.role === UserRole.OWNER && 'Полный доступ ко всем функциям и настройкам системы'}
              {user.role === UserRole.ADMIN && 'Управление пользователями, аппаратами, отчетами и настройками'}
              {user.role === UserRole.MANAGER && 'Управление аппаратами, задачами, инвентарем и отчетами'}
              {user.role === UserRole.OPERATOR && 'Выполнение задач, управление инвентарем на руках'}
              {user.role === UserRole.COLLECTOR && 'Сбор наличных, просмотр информации об аппаратах'}
              {user.role === UserRole.TECHNICIAN && 'Техническое обслуживание и ремонт аппаратов'}
              {user.role === UserRole.VIEWER && 'Только просмотр данных без возможности редактирования'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Activity Stats */}
      {user.role === UserRole.OPERATOR && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Статистика активности</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Задач выполнено</p>
              <p className="text-2xl font-bold text-green-600">
                {user.stats?.completed_tasks || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Активных задач</p>
              <p className="text-2xl font-bold text-blue-600">
                {user.stats?.active_tasks || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Инцидентов решено</p>
              <p className="text-2xl font-bold text-orange-600">
                {user.stats?.resolved_incidents || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Последняя активность</p>
              <p className="text-sm font-semibold text-gray-900">
                {user.last_login ? formatDateTime(user.last_login) : 'Никогда'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Действия</h3>
        <div className="flex gap-3">
          {user.is_active ? (
            <Button
              variant="danger"
              onClick={() => {
                if (confirm(`Деактивировать пользователя ${user.full_name}?`)) {
                  deactivateMutation.mutate()
                }
              }}
              disabled={deactivateMutation.isPending}
            >
              Деактивировать
            </Button>
          ) : (
            <Button
              onClick={() => activateMutation.mutate()}
              disabled={activateMutation.isPending}
            >
              Активировать
            </Button>
          )}

          <Button
            variant="secondary"
            onClick={() => {
              const newPassword = prompt('Введите новый пароль:')
              if (newPassword) {
                usersApi.changePassword(params.id, newPassword)
                  .then(() => toast.success('Пароль изменен'))
                  .catch(() => toast.error('Ошибка при изменении пароля'))
              }
            }}
          >
            Сменить пароль
          </Button>
        </div>
      </div>
    </div>
  )
}
