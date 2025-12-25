'use client'

import {
  ScheduledTask,
  categoryLabels,
  frequencyLabels,
  getCategoryColor,
  getFrequencyColor,
} from '@/lib/scheduled-tasks-api'
import {
  Clock,
  Calendar,
  Activity,
  CheckCircle,
  XCircle,
  Timer,
  RefreshCw,
} from 'lucide-react'

interface ScheduledTaskCardProps {
  task: ScheduledTask
  compact?: boolean
}

export function ScheduledTaskCard({ task, compact = false }: ScheduledTaskCardProps) {
  const categoryColor = getCategoryColor(task.category)
  const frequencyColor = getFrequencyColor(task.frequency)

  if (compact) {
    return (
      <div className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-white">
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg ${categoryColor}`}>
            <Activity className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900 truncate">
              {task.name}
            </h4>
            <p className="text-xs text-gray-500 truncate">{task.description}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-xs rounded-full ${frequencyColor}`}>
              {frequencyLabels[task.frequency]}
            </span>
            {task.isActive ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${categoryColor}`}>
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{task.name}</h3>
            <p className="text-sm text-gray-500">{task.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {task.isActive ? (
            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
              <CheckCircle className="h-3.5 w-3.5" />
              Активна
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
              <XCircle className="h-3.5 w-3.5" />
              Неактивна
            </span>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        {/* Category */}
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-xs text-gray-500 mb-1">Категория</p>
          <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full border ${categoryColor}`}>
            {categoryLabels[task.category]}
          </span>
        </div>

        {/* Frequency */}
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-xs text-gray-500 mb-1">Частота</p>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${frequencyColor}`}>
            <RefreshCw className="h-3 w-3" />
            {frequencyLabels[task.frequency]}
          </span>
        </div>

        {/* Cron Expression */}
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-xs text-gray-500 mb-1">Cron</p>
          <code className="text-xs text-gray-700 font-mono bg-gray-100 px-1 py-0.5 rounded">
            {task.cronExpression}
          </code>
        </div>

        {/* Scheduled Time (if daily/monthly) */}
        <div className="bg-gray-50 rounded-lg p-2">
          <p className="text-xs text-gray-500 mb-1">Время запуска</p>
          {task.scheduledTime ? (
            <span className="flex items-center gap-1 text-xs text-gray-700">
              <Clock className="h-3 w-3" />
              {task.scheduledTime}
            </span>
          ) : (
            <span className="text-xs text-gray-400">По расписанию</span>
          )}
        </div>
      </div>

      {/* Metrics (if available) */}
      {(task.lastRun || task.successRate !== undefined || task.avgDuration !== undefined) && (
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
          {task.lastRun && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Последний запуск: {new Date(task.lastRun).toLocaleString('ru-RU')}
            </span>
          )}
          {task.avgDuration !== undefined && (
            <span className="flex items-center gap-1">
              <Timer className="h-3.5 w-3.5" />
              ~{task.avgDuration}ms
            </span>
          )}
          {task.successRate !== undefined && (
            <span className="flex items-center gap-1">
              <Activity className="h-3.5 w-3.5" />
              {task.successRate}% успех
            </span>
          )}
        </div>
      )}
    </div>
  )
}

interface ScheduledTasksListProps {
  tasks: ScheduledTask[]
  compact?: boolean
}

export function ScheduledTasksList({ tasks, compact = false }: ScheduledTasksListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Нет запланированных задач</p>
      </div>
    )
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {tasks.map((task) => (
        <ScheduledTaskCard key={task.id} task={task} compact={compact} />
      ))}
    </div>
  )
}
