'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { tasksApi } from '@/lib/tasks-api'
import { filesApi } from '@/lib/files-api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, formatCurrency, getStatusColor, getPriorityColor } from '@/lib/utils'
import { toast } from 'react-toastify'
import { MapPin, User, Clock, Package, AlertTriangle, Camera, Wrench, Image as ImageIcon, Upload } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { PhotoUploader } from '@/components/tasks/PhotoUploader'
import type { TaskPhoto, TaskComponent } from '@/types/tasks'
import { getErrorMessage } from '@/types/common'

export default function TaskDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const taskId = params.id as string

  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)
  const [showPhotoUpload, setShowPhotoUpload] = useState(false)
  const [photosBeforeIds, setPhotosBeforeIds] = useState<string[]>([])
  const [photosAfterIds, setPhotosAfterIds] = useState<string[]>([])

  const { data: task, isLoading } = useQuery({
    queryKey: ['tasks', taskId],
    queryFn: () => tasksApi.getById(taskId),
  })

  const { data: photos } = useQuery({
    queryKey: ['tasks', taskId, 'photos'],
    queryFn: () => tasksApi.getPhotos(taskId),
    enabled: !!task,
  })

  const startMutation = useMutation({
    mutationFn: () => tasksApi.start(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] })
      toast.success('Задача начата!')
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Ошибка при начале задачи')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => tasksApi.cancel(taskId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] })
      toast.success('Задача отменена')
    },
  })

  const completeWithPhotosMutation = useMutation({
    mutationFn: async () => {
      // Validate photos before completing
      const validation = await filesApi.validateTaskPhotos(taskId)

      if (!validation.is_valid) {
        throw new Error('Необходимо загрузить фото до и после выполнения задачи')
      }

      return tasksApi.uploadPendingPhotos(taskId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId, 'photos'] })
      toast.success('Задача успешно завершена с фото!')
      setShowPhotoUpload(false)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Ошибка при завершении задачи')
    },
  })

  if (isLoading) {
    return <div className="flex justify-center py-12">Загрузка...</div>
  }

  if (!task) {
    return <div className="text-center py-12">Задача не найдена</div>
  }

  const isOverdue = task.due_date && new Date(task.due_date) < new Date()
  const overdueHours = isOverdue && task.due_date
    ? Math.floor((Date.now() - new Date(task.due_date).getTime()) / (1000 * 60 * 60))
    : 0

  const photosBefore = photos?.filter((p: TaskPhoto) => p.category_code === 'task_photo_before') || []
  const photosAfter = photos?.filter((p: TaskPhoto) => p.category_code === 'task_photo_after') || []

  // Map photos for PhotoUploader component (requires file_url to be present)
  const photosBeforeForUploader = photosBefore
    .filter((p: TaskPhoto) => p.file_url || p.cloudflare_url)
    .map((p: TaskPhoto) => ({ id: p.id, file_url: p.file_url || p.cloudflare_url || '', cloudflare_url: p.cloudflare_url }))
  const photosAfterForUploader = photosAfter
    .filter((p: TaskPhoto) => p.file_url || p.cloudflare_url)
    .map((p: TaskPhoto) => ({ id: p.id, file_url: p.file_url || p.cloudflare_url || '', cloudflare_url: p.cloudflare_url }))

  const hasComponents = task.type_code && [
    'replace_hopper',
    'replace_grinder',
    'replace_brewer',
    'replace_mixer',
    'cleaning',
    'repair',
  ].includes(task.type_code)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{task.type_code}</h1>
          <p className="mt-2 text-gray-600">ID: {task.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(task.status)}>{task.status}</Badge>
          <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
          {task.pending_photos && (
            <Badge className="bg-orange-100 text-orange-800">
              <Camera className="h-3 w-3 mr-1" />
              Ожидает фото
            </Badge>
          )}
        </div>
      </div>

      {isOverdue && overdueHours > 4 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <div>
            <p className="font-semibold text-red-900">
              Задача просрочена на {overdueHours} часов
            </p>
            <p className="text-sm text-red-700">
              Автоматически создан инцидент для эскалации
            </p>
          </div>
        </div>
      )}

      {task.pending_photos && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-2">
          <Camera className="h-5 w-5 text-orange-600" />
          <div className="flex-1">
            <p className="font-semibold text-orange-900">
              Задача выполнена без фото
            </p>
            <p className="text-sm text-orange-700">
              Необходимо загрузить фото до и после для завершения задачи
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowPhotoUpload(!showPhotoUpload)}
          >
            <Upload className="h-4 w-4 mr-2" />
            {showPhotoUpload ? 'Скрыть' : 'Загрузить фото'}
          </Button>
        </div>
      )}

      {/* Photo Upload Section for Incomplete Tasks */}
      {task.pending_photos && showPhotoUpload && (
        <div className="bg-white rounded-lg border border-orange-300 p-6 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Upload className="h-5 w-5 text-orange-600" />
              Загрузка недостающих фото
            </h3>
          </div>

          <div className="space-y-8">
            <PhotoUploader
              taskId={taskId}
              category="task_photo_before"
              label="Фото ДО выполнения"
              description="Сфотографируйте состояние аппарата перед началом работы"
              maxFiles={3}
              existingPhotos={photosBeforeForUploader}
              onUploadComplete={(ids) => {
                setPhotosBeforeIds((prev) => [...prev, ...ids])
                queryClient.invalidateQueries({ queryKey: ['tasks', taskId, 'photos'] })
              }}
            />

            <div className="border-t pt-6">
              <PhotoUploader
                taskId={taskId}
                category="task_photo_after"
                label="Фото ПОСЛЕ выполнения"
                description="Сфотографируйте результат работы"
                maxFiles={3}
                existingPhotos={photosAfterForUploader}
                onUploadComplete={(ids) => {
                  setPhotosAfterIds((prev) => [...prev, ...ids])
                  queryClient.invalidateQueries({ queryKey: ['tasks', taskId, 'photos'] })
                }}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={() => completeWithPhotosMutation.mutate()}
              disabled={completeWithPhotosMutation.isPending}
            >
              {completeWithPhotosMutation.isPending ? 'Завершение...' : 'Завершить задачу с фото'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowPhotoUpload(false)}
            >
              Отмена
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {task.machine && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Аппарат</p>
                    <p className="font-semibold">{task.machine.machine_number}</p>
                    {task.machine.location && (
                      <p className="text-sm text-gray-500">{task.machine.location.name}</p>
                    )}
                  </div>
                </div>
              )}

              {task.assigned_to && (
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Назначена</p>
                    <p className="font-semibold">{task.assigned_to.full_name}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Запланировано</p>
                  <p className="font-semibold">{formatDateTime(task.scheduled_date)}</p>
                </div>
              </div>

              {task.due_date && (
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Срок выполнения</p>
                    <p className={`font-semibold ${isOverdue ? 'text-red-600' : ''}`}>
                      {formatDateTime(task.due_date)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {task.description && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Описание</p>
                <p className="text-gray-900">{task.description}</p>
              </div>
            )}

            {task.type_code === 'collection' && task.status === 'completed' && task.actual_cash_amount !== undefined && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Инкассация завершена</h3>
                <p className="text-sm">
                  Собрано: <span className="font-semibold">{formatCurrency(task.actual_cash_amount)}</span>
                </p>
              </div>
            )}

            {task.items && task.items.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Товары
                </h3>
                <div className="space-y-2">
                  {task.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded"
                    >
                      <span className="text-sm">{item.nomenclature?.name}</span>
                      <span className="text-sm font-semibold">
                        {item.actual_quantity || item.planned_quantity} {item.unit_of_measure_code}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Photo section */}
          {(photosBefore.length > 0 || photosAfter.length > 0 || task.status === 'completed') && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Фотофиксация
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Photos before */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Фото ДО ({photosBefore.length})
                  </h4>
                  {photosBefore.length === 0 ? (
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                      <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Нет фото</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {photosBefore.map((photo: TaskPhoto) => (
                        <div
                          key={photo.id}
                          role="button"
                          tabIndex={0}
                          className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedPhoto(photo.file_url || photo.cloudflare_url || null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setSelectedPhoto(photo.file_url || photo.cloudflare_url || null)
                            }
                          }}
                        >
                          <Image
                            src={photo.file_url || photo.cloudflare_url || ''}
                            alt="Фото до"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Photos after */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Фото ПОСЛЕ ({photosAfter.length})
                  </h4>
                  {photosAfter.length === 0 ? (
                    <div className="bg-gray-50 rounded-lg p-6 text-center">
                      <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Нет фото</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {photosAfter.map((photo: TaskPhoto) => (
                        <div
                          key={photo.id}
                          role="button"
                          tabIndex={0}
                          className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedPhoto(photo.file_url || photo.cloudflare_url || null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setSelectedPhoto(photo.file_url || photo.cloudflare_url || null)
                            }
                          }}
                        >
                          <Image
                            src={photo.file_url || photo.cloudflare_url || ''}
                            alt="Фото после"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Components section (for replace and maintenance tasks) */}
          {hasComponents && task.components && task.components.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Компоненты
              </h3>
              <div className="space-y-3">
                {task.components.map((tc: TaskComponent) => (
                  <div key={tc.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        tc.role === 'old'
                          ? 'bg-red-100 text-red-700'
                          : tc.role === 'new'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {tc.role === 'old' ? 'Снимаемый' : tc.role === 'new' ? 'Устанавливаемый' : 'Обслуживаемый'}
                      </span>
                    </div>
                    <Link
                      href={`/dashboard/equipment/components/${tc.component_id}`}
                      className="font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      {tc.component?.name || 'Компонент'}
                    </Link>
                    {tc.component?.serial_number && (
                      <p className="text-sm text-gray-500">S/N: {tc.component.serial_number}</p>
                    )}
                    {tc.notes && (
                      <p className="text-sm text-gray-600 mt-2">{tc.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Действия</h3>
            <div className="space-y-2">
              {task.status === 'assigned' && (
                <Button
                  className="w-full"
                  onClick={() => startMutation.mutate()}
                  isLoading={startMutation.isPending}
                >
                  Начать выполнение
                </Button>
              )}
              {task.status === 'in_progress' && (
                <Link href={`/dashboard/tasks/${task.id}/complete`} className="block">
                  <Button className="w-full">Завершить задачу</Button>
                </Link>
              )}
              {!['completed', 'cancelled'].includes(task.status) && (
                <Button
                  className="w-full"
                  variant="danger"
                  onClick={() => {
                    const reason = prompt('Причина отмены:')
                    if (reason) {cancelMutation.mutate(reason)}
                  }}
                >
                  Отменить
                </Button>
              )}
            </div>
          </div>

          {task.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">Завершена</h3>
              {task.completed_at && (
                <p className="text-sm text-green-700">
                  {formatDateTime(task.completed_at)}
                </p>
              )}
              {task.completed_by && (
                <p className="text-sm text-green-700 mt-1">
                  Исполнитель: {typeof task.completed_by === 'string' ? task.completed_by : task.completed_by.full_name}
                </p>
              )}
            </div>
          )}

          {task.notes && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Примечания</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{task.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Photo modal */}
      {selectedPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo preview"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/80 cursor-pointer"
            onClick={() => setSelectedPhoto(null)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSelectedPhoto(null)
              }
            }}
            aria-label="Close photo preview"
          />
          {/* Content */}
          <div className="relative max-w-4xl max-h-full z-10">
            <Image
              src={selectedPhoto}
              alt="Просмотр фото"
              width={800}
              height={600}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              unoptimized
            />
          </div>
        </div>
      )}
    </div>
  )
}
