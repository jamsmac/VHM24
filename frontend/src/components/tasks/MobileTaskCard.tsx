'use client'

import { memo } from 'react'
import { Task, TaskStatus, TaskPriority } from '@/types/tasks'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, getStatusColor, getPriorityColor } from '@/lib/utils'
import Link from 'next/link'
import { MapPin, Clock, Camera, ArrowRight, AlertTriangle } from 'lucide-react'

interface MobileTaskCardProps {
  task: Task
  onSwipeLeft?: (task: Task) => void
  onSwipeRight?: (task: Task) => void
}

export const MobileTaskCard = memo(function MobileTaskCard({ task, onSwipeLeft: _onSwipeLeft, onSwipeRight: _onSwipeRight }: MobileTaskCardProps) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date()
  const canStart = task.status === TaskStatus.ASSIGNED
  const canComplete = task.status === TaskStatus.IN_PROGRESS

  return (
    <Link
      href={canComplete ? `/dashboard/tasks/${task.id}/complete` : `/dashboard/tasks/${task.id}`}
      className="block"
    >
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden active:scale-98 transition-transform touch-manipulation">
        {/* Header with status badges */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 pb-3">
          <div className="flex items-start justify-between mb-2">
            <div className="flex flex-wrap gap-2">
              <Badge className={getStatusColor(task.status)}>
                {task.status === TaskStatus.ASSIGNED && '📋 Назначена'}
                {task.status === TaskStatus.IN_PROGRESS && '⚡ В работе'}
                {task.status === TaskStatus.COMPLETED && '✅ Завершена'}
                {task.status === TaskStatus.CANCELLED && '❌ Отменена'}
              </Badge>
              <Badge className={getPriorityColor(task.priority)}>
                {task.priority === TaskPriority.CRITICAL && '🔥 Срочно'}
                {task.priority === TaskPriority.HIGH && '⬆️ Высокий'}
                {task.priority === TaskPriority.MEDIUM && '➡️ Средний'}
                {task.priority === TaskPriority.LOW && '⬇️ Низкий'}
              </Badge>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
          </div>

          {/* Task type */}
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {task.type_code === 'refill' && '🔄 Пополнение'}
            {task.type_code === 'collection' && '💰 Инкассация'}
            {task.type_code === 'maintenance' && '🔧 Обслуживание'}
            {task.type_code === 'cleaning' && '🧹 Мойка'}
            {task.type_code === 'inspection' && '🔍 Проверка'}
            {task.type_code === 'repair' && '⚙️ Ремонт'}
            {!['refill', 'collection', 'maintenance', 'cleaning', 'inspection', 'repair'].includes(task.type_code || '') && task.type_code}
          </h3>

          {task.description && (
            <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>
          )}
        </div>

        {/* Machine info */}
        {task.machine && (
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
              <MapPin className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{task.machine.machine_number}</p>
              {task.machine.location && (
                <p className="text-sm text-gray-500 truncate">{task.machine.location.name}</p>
              )}
            </div>
          </div>
        )}

        {/* Time info */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}>
              {formatDateTime(task.scheduled_date)}
            </span>
          </div>

          {task.pending_photos && (
            <div className="flex items-center gap-1 text-orange-600 text-sm font-medium">
              <Camera className="h-4 w-4" />
              <span>Нужны фото</span>
            </div>
          )}

          {isOverdue && !task.pending_photos && (
            <div className="flex items-center gap-1 text-red-600 text-sm font-medium">
              <AlertTriangle className="h-4 w-4" />
              <span>Просрочено</span>
            </div>
          )}
        </div>

        {/* Action hint */}
        {canComplete && (
          <div className="bg-green-50 px-4 py-2 text-center border-t border-green-100">
            <p className="text-sm font-medium text-green-700">
              ✓ Нажмите для завершения
            </p>
          </div>
        )}

        {canStart && (
          <div className="bg-blue-50 px-4 py-2 text-center border-t border-blue-100">
            <p className="text-sm font-medium text-blue-700">
              ▶ Нажмите для начала
            </p>
          </div>
        )}
      </div>
    </Link>
  )
})
