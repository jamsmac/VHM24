'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { tasksApi } from '@/lib/tasks-api'
import { taskColumns } from '@/components/tasks/columns'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import { Plus, Filter } from 'lucide-react'
import Link from 'next/link'
import { TaskStatus, TaskType, TaskPriority } from '@/types/tasks'
import { useTranslations } from '@/providers/I18nProvider'

export default function TasksPage() {
  const { t } = useTranslations()
  const [statusFilter, setStatusFilter] = useState<TaskStatus | undefined>()
  const [typeFilter, setTypeFilter] = useState<TaskType | undefined>()
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | undefined>()
  const [showPendingPhotosOnly, setShowPendingPhotosOnly] = useState(false)

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', statusFilter, typeFilter, priorityFilter, showPendingPhotosOnly],
    queryFn: async () => {
      if (showPendingPhotosOnly) {
        return await tasksApi.getPendingPhotos()
      }
      return await tasksApi.getAll({
        status: statusFilter,
        type: typeFilter,
        priority: priorityFilter,
      })
    },
  })

  const { data: stats } = useQuery({
    queryKey: ['tasks', 'stats'],
    queryFn: tasksApi.getStats,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('tasks.title')}</h1>
          <p className="mt-2 text-muted-foreground">{t('tasks.subtitle')}</p>
        </div>
        <Link href="/dashboard/tasks/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('tasks.addTask')}
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">{t('tasks.stats.total')}</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">{t('tasks.stats.inProgress')}</p>
            <p className="text-2xl font-bold text-primary">
              {stats.by_status?.in_progress || 0}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">{t('tasks.stats.completed')}</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.by_status?.completed || 0}
            </p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">{t('tasks.stats.overdue')}</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {stats.overdue || 0}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium text-foreground">{t('tasks.filter.title')}</h3>
        </div>

        {/* Pending Photos Filter */}
        <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showPendingPhotosOnly}
              onChange={(e) => {
                setShowPendingPhotosOnly(e.target.checked)
                if (e.target.checked) {
                  setStatusFilter(undefined)
                  setTypeFilter(undefined)
                  setPriorityFilter(undefined)
                }
              }}
              className="w-4 h-4 text-orange-600 border-orange-300 rounded focus:ring-2 focus:ring-orange-500"
            />
            <span className="text-sm font-medium text-orange-900 dark:text-orange-100 flex items-center gap-1">
              📸 Только задачи с ожидающими фото
              <span className="text-xs text-orange-700 dark:text-orange-300 ml-1">(неполные)</span>
            </span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={statusFilter || ''}
            onChange={(e) => setStatusFilter(e.target.value as TaskStatus || undefined)}
            disabled={showPendingPhotosOnly}
            className="px-3 py-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-input disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">{t('tasks.filter.allStatuses')}</option>
            <option value="pending">{t('tasks.pending')}</option>
            <option value="assigned">{t('tasks.assigned')}</option>
            <option value="in_progress">{t('tasks.inProgress')}</option>
            <option value="completed">{t('tasks.completed')}</option>
          </select>

          <select
            value={typeFilter || ''}
            onChange={(e) => setTypeFilter(e.target.value as TaskType || undefined)}
            disabled={showPendingPhotosOnly}
            className="px-3 py-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-input disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">{t('tasks.filter.allTypes')}</option>
            <optgroup label="Основные операции">
              <option value="refill">{t('tasks.refill')}</option>
              <option value="collection">{t('tasks.collection')}</option>
              <option value="maintenance">{t('tasks.maintenance')}</option>
              <option value="inspection">Проверка</option>
            </optgroup>
            <optgroup label="Замена компонентов">
              <option value="replace_hopper">Замена бункера</option>
              <option value="replace_grinder">Замена гриндера</option>
              <option value="replace_brewer">Замена варочной группы</option>
              <option value="replace_mixer">Замена миксера</option>
            </optgroup>
            <optgroup label="Обслуживание">
              <option value="cleaning">{t('tasks.cleaning')}</option>
              <option value="repair">{t('tasks.repair')}</option>
            </optgroup>
          </select>

          <select
            value={priorityFilter || ''}
            onChange={(e) => setPriorityFilter(e.target.value as TaskPriority || undefined)}
            disabled={showPendingPhotosOnly}
            className="px-3 py-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-input disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">{t('tasks.filter.allPriorities')}</option>
            <option value="low">{t('tasks.low')}</option>
            <option value="medium">{t('tasks.medium')}</option>
            <option value="high">{t('tasks.high')}</option>
            <option value="critical">{t('tasks.critical')}</option>
          </select>
        </div>
      </div>

      {/* DataTable */}
      <div className="bg-card rounded-lg border border-border">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : tasks && tasks.length > 0 ? (
          <DataTable
            columns={taskColumns}
            data={tasks}
            searchKey="machine.machine_number"
            searchPlaceholder={t('common.search')}
          />
        ) : (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">{t('tasks.noTasks')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
