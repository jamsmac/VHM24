'use client'

import { useState, useMemo } from 'react'
import {
  scheduledTasks,
  TaskCategory,
  TaskFrequency,
  categoryLabels,
  frequencyLabels,
  getScheduledTasksStats,
  getCategoryColor,
  getFrequencyColor,
} from '@/lib/scheduled-tasks-api'
import { ScheduledTasksList } from '@/components/scheduled-tasks/ScheduledTaskCard'
import {
  Calendar,
  Activity,
  Clock,
  Filter,
  X,
  CheckCircle,
  ListTodo,
  Package,
  Server,
  Bell,
  DollarSign,
  BarChart3,
  AlertTriangle,
  MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

type ViewMode = 'all' | 'by-category' | 'by-frequency'

const categoryIcons: Record<TaskCategory, React.ReactNode> = {
  [TaskCategory.TASKS]: <ListTodo className="h-4 w-4" />,
  [TaskCategory.INVENTORY]: <Package className="h-4 w-4" />,
  [TaskCategory.MACHINES]: <Server className="h-4 w-4" />,
  [TaskCategory.NOTIFICATIONS]: <Bell className="h-4 w-4" />,
  [TaskCategory.FINANCE]: <DollarSign className="h-4 w-4" />,
  [TaskCategory.MONITORING]: <BarChart3 className="h-4 w-4" />,
  [TaskCategory.ALERTS]: <AlertTriangle className="h-4 w-4" />,
  [TaskCategory.COMPLAINTS]: <MessageSquare className="h-4 w-4" />,
}

export default function ScheduledTasksPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | ''>('')
  const [frequencyFilter, setFrequencyFilter] = useState<TaskFrequency | ''>('')
  const [showFilters, setShowFilters] = useState(false)

  const stats = useMemo(() => getScheduledTasksStats(), [])

  const filteredTasks = useMemo(() => {
    return scheduledTasks.filter((task) => {
      if (categoryFilter && task.category !== categoryFilter) return false
      if (frequencyFilter && task.frequency !== frequencyFilter) return false
      return true
    })
  }, [categoryFilter, frequencyFilter])

  const tasksByCategory = useMemo(() => {
    return Object.values(TaskCategory).reduce((acc, category) => {
      acc[category] = filteredTasks.filter((t) => t.category === category)
      return acc
    }, {} as Record<TaskCategory, typeof scheduledTasks>)
  }, [filteredTasks])

  const tasksByFrequency = useMemo(() => {
    return Object.values(TaskFrequency).reduce((acc, frequency) => {
      acc[frequency] = filteredTasks.filter((t) => t.frequency === frequency)
      return acc
    }, {} as Record<TaskFrequency, typeof scheduledTasks>)
  }, [filteredTasks])

  const hasActiveFilters = categoryFilter || frequencyFilter

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Запланированные задачи</h1>
          <p className="mt-2 text-gray-600">
            Обзор cron-задач и автоматических процессов системы
          </p>
        </div>
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
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Calendar className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Всего задач</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              <p className="text-sm text-gray-500">Активных</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{Object.keys(stats.byCategory).length}</p>
              <p className="text-sm text-gray-500">Категорий</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{Object.keys(stats.byFrequency).length}</p>
              <p className="text-sm text-gray-500">Расписаний</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Фильтры</h3>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCategoryFilter('')
                  setFrequencyFilter('')
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Сбросить
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Категория
              </label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as TaskCategory)}
              >
                <option value="">Все категории</option>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Частота
              </label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={frequencyFilter}
                onChange={(e) => setFrequencyFilter(e.target.value as TaskFrequency)}
              >
                <option value="">Все частоты</option>
                {Object.entries(frequencyLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* View Mode Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setViewMode('all')}
            className={`
              pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
              ${viewMode === 'all'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <Calendar className="h-4 w-4" />
            Все задачи
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
              {filteredTasks.length}
            </span>
          </button>
          <button
            onClick={() => setViewMode('by-category')}
            className={`
              pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
              ${viewMode === 'by-category'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <Activity className="h-4 w-4" />
            По категориям
          </button>
          <button
            onClick={() => setViewMode('by-frequency')}
            className={`
              pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
              ${viewMode === 'by-frequency'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            <Clock className="h-4 w-4" />
            По частоте
          </button>
        </nav>
      </div>

      {/* Content */}
      {viewMode === 'all' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <ScheduledTasksList tasks={filteredTasks} />
        </div>
      )}

      {viewMode === 'by-category' && (
        <div className="space-y-6">
          {Object.entries(tasksByCategory).map(([category, tasks]) => {
            if (tasks.length === 0) return null
            const categoryColor = getCategoryColor(category as TaskCategory)
            return (
              <div key={category} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className={`px-4 py-3 border-b border-gray-200 flex items-center gap-3 ${categoryColor.replace('border-', 'bg-').split(' ')[1]}`}>
                  <div className={`p-1.5 rounded-lg ${categoryColor}`}>
                    {categoryIcons[category as TaskCategory]}
                  </div>
                  <h3 className="font-medium text-gray-900">
                    {categoryLabels[category as TaskCategory]}
                  </h3>
                  <span className="bg-white/50 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                    {tasks.length} задач
                  </span>
                </div>
                <div className="p-4">
                  <ScheduledTasksList tasks={tasks} compact />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {viewMode === 'by-frequency' && (
        <div className="space-y-6">
          {Object.entries(tasksByFrequency).map(([frequency, tasks]) => {
            if (tasks.length === 0) return null
            const frequencyColor = getFrequencyColor(frequency as TaskFrequency)
            return (
              <div key={frequency} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${frequencyColor}`}>
                    <Clock className="h-4 w-4" />
                  </div>
                  <h3 className="font-medium text-gray-900">
                    {frequencyLabels[frequency as TaskFrequency]}
                  </h3>
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                    {tasks.length} задач
                  </span>
                </div>
                <div className="p-4">
                  <ScheduledTasksList tasks={tasks} compact />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Information Footer */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Activity className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-medium text-blue-900">О запланированных задачах</h4>
            <p className="text-sm text-blue-700 mt-1">
              Эти задачи выполняются автоматически по расписанию. Они обеспечивают мониторинг системы,
              отправку уведомлений, проверку остатков, расчёт комиссий и другие важные операции.
              Время указано в часовом поясе сервера (UTC).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
