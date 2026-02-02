'use client'

import { cn } from '@/lib/utils'
import { Task, TaskStatus, TaskType, TaskPriority } from '@/types/tasks'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { WarmCard } from '@/components/ui/warm-card'
import {
  Coffee,
  Wrench,
  Droplets,
  Trash2,
  ClipboardCheck,
  AlertCircle,
  Clock,
  User,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  Camera,
  MessageSquare,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'

export interface TaskDetailModalProps {
  task: Task | null
  open: boolean
  onClose: () => void
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void
  onAssign?: (taskId: string) => void
  isLoading?: boolean
}

const taskTypeIcons: Record<TaskType, React.ElementType> = {
  [TaskType.REFILL]: Droplets,
  [TaskType.COLLECTION]: Coffee,
  [TaskType.REPAIR]: Wrench,
  [TaskType.MAINTENANCE]: Wrench,
  [TaskType.CLEANING]: Trash2,
  [TaskType.INSPECTION]: ClipboardCheck,
  [TaskType.REPLACE_HOPPER]: Wrench,
  [TaskType.REPLACE_GRINDER]: Wrench,
  [TaskType.REPLACE_BREWER]: Wrench,
  [TaskType.REPLACE_MIXER]: Wrench,
  [TaskType.OTHER]: AlertCircle,
}

const taskTypeLabels: Record<TaskType, string> = {
  [TaskType.REFILL]: 'Пополнение',
  [TaskType.COLLECTION]: 'Инкассация',
  [TaskType.REPAIR]: 'Ремонт',
  [TaskType.MAINTENANCE]: 'Техническое обслуживание',
  [TaskType.CLEANING]: 'Чистка',
  [TaskType.INSPECTION]: 'Осмотр',
  [TaskType.REPLACE_HOPPER]: 'Замена бункера',
  [TaskType.REPLACE_GRINDER]: 'Замена кофемолки',
  [TaskType.REPLACE_BREWER]: 'Замена варочной группы',
  [TaskType.REPLACE_MIXER]: 'Замена миксера',
  [TaskType.OTHER]: 'Прочее',
}

const statusConfig: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  [TaskStatus.PENDING]: { label: 'Ожидает', color: 'text-amber-700', bg: 'bg-amber-100' },
  [TaskStatus.ASSIGNED]: { label: 'Назначена', color: 'text-blue-700', bg: 'bg-blue-100' },
  [TaskStatus.IN_PROGRESS]: { label: 'В работе', color: 'text-purple-700', bg: 'bg-purple-100' },
  [TaskStatus.COMPLETED]: { label: 'Завершена', color: 'text-emerald-700', bg: 'bg-emerald-100' },
  [TaskStatus.CANCELLED]: { label: 'Отменена', color: 'text-stone-700', bg: 'bg-stone-100' },
  [TaskStatus.POSTPONED]: { label: 'Отложена', color: 'text-orange-700', bg: 'bg-orange-100' },
}

const priorityConfig: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  [TaskPriority.LOW]: { label: 'Низкий', color: 'text-stone-600', bg: 'bg-stone-100' },
  [TaskPriority.MEDIUM]: { label: 'Средний', color: 'text-blue-700', bg: 'bg-blue-100' },
  [TaskPriority.HIGH]: { label: 'Высокий', color: 'text-amber-700', bg: 'bg-amber-100' },
  [TaskPriority.CRITICAL]: { label: 'Критический', color: 'text-red-700', bg: 'bg-red-100' },
}

/**
 * TaskDetailModal - Modal for viewing and managing task details
 * Part of VendHub "Warm Brew" design system
 */
export function TaskDetailModal({
  task,
  open,
  onClose,
  onStatusChange,
  onAssign,
  isLoading = false,
}: TaskDetailModalProps) {
  if (!task) return null

  const Icon = taskTypeIcons[task.type_code] || AlertCircle
  const status = statusConfig[task.status]
  const priority = priorityConfig[task.priority]

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== TaskStatus.COMPLETED
  const canStart = task.status === TaskStatus.PENDING || task.status === TaskStatus.ASSIGNED
  const canComplete = task.status === TaskStatus.IN_PROGRESS
  const canCancel = task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.CANCELLED

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title=""
      size="lg"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center', priority.bg)}>
            <Icon className={cn('w-7 h-7', priority.color)} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-stone-800">
                {taskTypeLabels[task.type_code]}
              </h2>
              <Badge className={cn(status.bg, status.color, 'border-0')}>
                {status.label}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-stone-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Создана {formatDate(task.created_at)}
              </span>
              {task.due_date && (
                <span className={cn('flex items-center gap-1', isOverdue && 'text-red-600')}>
                  <Clock className="w-4 h-4" />
                  До {formatDate(task.due_date)}
                  {isOverdue && ' (просрочена)'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Machine Info */}
        {task.machine && (
          <WarmCard className="bg-stone-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Coffee className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-stone-800">{task.machine.machine_number}</p>
                  {task.machine.location && (
                    <p className="text-sm text-stone-500 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {task.machine.location.name}
                    </p>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" asChild className="border-stone-200">
                <Link href={`/dashboard/machines/${task.machine.id}`}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Открыть
                </Link>
              </Button>
            </div>
          </WarmCard>
        )}

        {/* Description */}
        {task.description && (
          <div>
            <h3 className="text-sm font-semibold text-stone-700 mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Описание
            </h3>
            <p className="text-stone-600 bg-stone-50 rounded-xl p-4">{task.description}</p>
          </div>
        )}

        {/* Priority & Assignment */}
        <div className="grid grid-cols-2 gap-4">
          <WarmCard className="bg-stone-50">
            <p className="text-xs text-stone-500 mb-1">Приоритет</p>
            <Badge className={cn(priority.bg, priority.color, 'border-0')}>
              {priority.label}
            </Badge>
          </WarmCard>
          <WarmCard className="bg-stone-50">
            <p className="text-xs text-stone-500 mb-1">Исполнитель</p>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-stone-400" />
              <span className="font-medium text-stone-700">
                {task.assigned_to?.full_name || 'Не назначен'}
              </span>
            </div>
            {onAssign && !task.assigned_to && (
              <Button
                variant="link"
                size="sm"
                onClick={() => onAssign(task.id)}
                className="text-amber-600 p-0 h-auto mt-1"
              >
                Назначить
              </Button>
            )}
          </WarmCard>
        </div>

        {/* Items (if any) */}
        {task.items && task.items.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-stone-700 mb-2">Позиции</h3>
            <div className="space-y-2">
              {task.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-stone-50 rounded-lg"
                >
                  <span className="text-stone-700">{item.nomenclature?.name || 'Позиция'}</span>
                  <div className="text-right">
                    <span className="font-medium text-stone-800">
                      {item.actual_quantity ?? item.planned_quantity} {item.nomenclature?.unit_of_measure_code}
                    </span>
                    {item.actual_quantity !== undefined && item.actual_quantity !== item.planned_quantity && (
                      <span className="text-xs text-stone-500 ml-2">
                        (план: {item.planned_quantity})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photos Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-stone-400" />
            <span className="text-sm text-stone-500">Фото до:</span>
            {task.has_photo_before ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <XCircle className="w-4 h-4 text-stone-300" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-stone-500">Фото после:</span>
            {task.has_photo_after ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <XCircle className="w-4 h-4 text-stone-300" />
            )}
          </div>
        </div>

        {/* Timestamps */}
        {(task.started_at || task.completed_at) && (
          <div className="text-sm text-stone-500 border-t border-stone-100 pt-4">
            {task.started_at && (
              <p>Начата: {formatDateTime(task.started_at)}</p>
            )}
            {task.completed_at && (
              <p>Завершена: {formatDateTime(task.completed_at)}</p>
            )}
          </div>
        )}

        {/* Actions */}
        {onStatusChange && (
          <div className="flex gap-3 pt-2 border-t border-stone-100">
            {canStart && (
              <Button
                onClick={() => onStatusChange(task.id, TaskStatus.IN_PROGRESS)}
                disabled={isLoading}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Play className="w-4 h-4 mr-2" />
                Начать
              </Button>
            )}
            {canComplete && (
              <Button
                onClick={() => onStatusChange(task.id, TaskStatus.COMPLETED)}
                disabled={isLoading}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Завершить
              </Button>
            )}
            {canCancel && (
              <Button
                variant="outline"
                onClick={() => onStatusChange(task.id, TaskStatus.CANCELLED)}
                disabled={isLoading}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Отменить
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

export default TaskDetailModal
