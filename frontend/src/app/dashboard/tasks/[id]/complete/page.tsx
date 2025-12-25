'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { tasksApi } from '@/lib/tasks-api'
import { filesApi } from '@/lib/files-api'
import { Button } from '@/components/ui/button'
import { ArrowLeft, AlertTriangle, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'react-toastify'
import { formatCurrency } from '@/lib/utils'
import { PhotoUploader } from '@/components/tasks/PhotoUploader'
import type { Task, CompleteTaskDto, TaskPhoto } from '@/types/tasks'
import { getErrorMessage } from '@/types/common'

interface CompleteTaskResponse extends Task {
  transaction_created?: boolean
  incident_created?: boolean
}

interface CompleteTaskPageProps {
  params: {
    id: string
  }
}

export default function CompleteTaskPage({ params }: CompleteTaskPageProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    actual_cash_amount: '',
    notes: '',
  })
  const [, setPhotosBeforeIds] = useState<string[]>([])
  const [, setPhotosAfterIds] = useState<string[]>([])

  const { data: task, isLoading } = useQuery({
    queryKey: ['tasks', params.id],
    queryFn: () => tasksApi.getById(params.id),
  })

  const { data: existingPhotos } = useQuery({
    queryKey: ['tasks', params.id, 'photos'],
    queryFn: () => tasksApi.getPhotos(params.id),
    enabled: !!task,
  })

  const completeMutation = useMutation({
    mutationFn: async (data: CompleteTaskDto): Promise<CompleteTaskResponse> => {
      // Проверяем наличие фото перед завершением
      const validation = await filesApi.validateTaskPhotos(params.id)

      if (!validation.is_valid) {
        // Если фото нет, предлагаем завершить в офлайн-режиме
        const confirmOffline = window.confirm(
          'Не все обязательные фото загружены. Завершить задачу без фото? ' +
          'Вы сможете загрузить фото позже.'
        )

        if (!confirmOffline) {
          throw new Error('Пожалуйста, загрузите все обязательные фото')
        }

        // Завершаем в офлайн-режиме
        return tasksApi.complete(params.id, { ...data, skip_photos: true }) as Promise<CompleteTaskResponse>
      }

      // Завершаем с фото
      return tasksApi.complete(params.id, data) as Promise<CompleteTaskResponse>
    },
    onSuccess: (response: CompleteTaskResponse) => {
      toast.success('Задача успешно завершена!')

      // Show additional info about created entities
      if (response.transaction_created) {
        toast.success('Транзакция создана автоматически')
      }
      if (response.incident_created) {
        toast.error('Создан инцидент: расхождение в инкассации', { autoClose: 5000 })
      }

      router.push(`/dashboard/tasks/${params.id}`)
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error) || 'Ошибка при завершении задачи')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const submitData: CompleteTaskDto = {
      completion_notes: formData.notes || undefined,
    }

    // Добавляем сумму для задач инкассации
    if (task?.type_code === 'collection' && formData.actual_cash_amount) {
      submitData.actual_cash_amount = parseFloat(formData.actual_cash_amount)
    }

    completeMutation.mutate(submitData)
  }

  const expectedAmount = task?.expected_cash_amount || 0
  const actualAmount = parseFloat(formData.actual_cash_amount) || 0
  const discrepancy = expectedAmount > 0 ? ((actualAmount - expectedAmount) / expectedAmount) * 100 : 0
  const hasDiscrepancy = Math.abs(discrepancy) > 10

  // Filter and map photos for PhotoUploader (requires file_url to be present)
  const existingPhotosBefore = existingPhotos
    ?.filter((p: TaskPhoto) => p.category_code === 'task_photo_before' && (p.file_url || p.cloudflare_url))
    .map((p: TaskPhoto) => ({ id: p.id, file_url: p.file_url || p.cloudflare_url || '', cloudflare_url: p.cloudflare_url })) || []
  const existingPhotosAfter = existingPhotos
    ?.filter((p: TaskPhoto) => p.category_code === 'task_photo_after' && (p.file_url || p.cloudflare_url))
    .map((p: TaskPhoto) => ({ id: p.id, file_url: p.file_url || p.cloudflare_url || '', cloudflare_url: p.cloudflare_url })) || []

  if (isLoading) {
    return <div className="flex justify-center py-12">Загрузка...</div>
  }

  if (!task) {
    return <div className="text-center py-12">Задача не найдена</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/tasks/${params.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Завершить задачу</h1>
          <p className="mt-2 text-gray-600">{task.type_code}</p>
        </div>
      </div>

      {/* Task Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Информация о задаче</h3>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-600">Тип</dt>
            <dd className="font-medium">{task.type_code}</dd>
          </div>
          <div>
            <dt className="text-gray-600">Аппарат</dt>
            <dd className="font-medium">{task.machine?.machine_number}</dd>
          </div>
          <div>
            <dt className="text-gray-600">Локация</dt>
            <dd className="font-medium">{task.machine?.location?.name}</dd>
          </div>
          {task.type_code === 'collection' && task.expected_cash_amount && (
            <div>
              <dt className="text-gray-600">Ожидаемая сумма</dt>
              <dd className="font-medium text-green-600">
                {formatCurrency(task.expected_cash_amount)}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Photo Uploaders */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-8">
        <div>
          <h3 className="font-semibold text-gray-900 mb-4">Фотофиксация</h3>
          <p className="text-sm text-gray-600 mb-6">
            Загрузите фото до и после выполнения задачи. Фото обязательны для завершения задачи.
          </p>

          <div className="space-y-6">
            <PhotoUploader
              taskId={params.id}
              category="task_photo_before"
              label="Фото ДО выполнения"
              description="Сфотографируйте состояние аппарата перед началом работы"
              maxFiles={3}
              existingPhotos={existingPhotosBefore}
              onUploadComplete={(ids) => setPhotosBeforeIds((prev) => [...prev, ...ids])}
            />

            <div className="border-t pt-6">
              <PhotoUploader
                taskId={params.id}
                category="task_photo_after"
                label="Фото ПОСЛЕ выполнения"
                description="Сфотографируйте результат работы"
                maxFiles={3}
                existingPhotos={existingPhotosAfter}
                onUploadComplete={(ids) => setPhotosAfterIds((prev) => [...prev, ...ids])}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Completion Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Данные о выполнении</h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Collection Amount */}
          {task.type_code === 'collection' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Собранная сумма * (сўм)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.actual_cash_amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, actual_cash_amount: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите собранную сумму"
              />

              {/* Discrepancy Warning */}
              {formData.actual_cash_amount && expectedAmount > 0 && (
                <div
                  className={`mt-3 p-4 rounded-lg ${
                    hasDiscrepancy
                      ? 'bg-orange-50 border border-orange-200'
                      : 'bg-green-50 border border-green-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {hasDiscrepancy ? (
                      <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <h4
                        className={`font-semibold mb-2 ${
                          hasDiscrepancy ? 'text-orange-900' : 'text-green-900'
                        }`}
                      >
                        {hasDiscrepancy ? 'Обнаружено расхождение!' : 'Сумма соответствует ожидаемой'}
                      </h4>
                      <dl className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <dt>Ожидалось:</dt>
                          <dd className="font-semibold">{formatCurrency(expectedAmount)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt>Собрано:</dt>
                          <dd className="font-semibold">{formatCurrency(actualAmount)}</dd>
                        </div>
                        <div className="flex justify-between border-t pt-1 mt-1">
                          <dt>Разница:</dt>
                          <dd
                            className={`font-semibold ${
                              hasDiscrepancy ? 'text-orange-700' : 'text-green-700'
                            }`}
                          >
                            {discrepancy > 0 ? '+' : ''}
                            {discrepancy.toFixed(2)}%
                          </dd>
                        </div>
                      </dl>
                      {hasDiscrepancy && (
                        <p className="mt-2 text-sm text-orange-700">
                          ⚠️ Будет автоматически создан инцидент о расхождении в инкассации
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Примечания</label>
            <textarea
              rows={4}
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Дополнительная информация о выполнении задачи..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={completeMutation.isPending}>
              {completeMutation.isPending ? 'Завершение...' : 'Завершить задачу'}
            </Button>
            <Link href={`/dashboard/tasks/${params.id}`}>
              <Button type="button" variant="secondary">
                Отмена
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
