'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Task, TaskStatus, TaskType, TaskPriority } from '@/types/tasks'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/ui/data-table'
import { DataTableRowActions, RowAction } from '@/components/ui/data-table-row-actions'
import {
  Eye,
  CheckCircle2,
  Clock,
  Edit,
  Trash2,
  UserPlus,
  CalendarClock,
  XCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

// Status badge mapping
const statusConfig: Record<TaskStatus, { variant: 'success' | 'warning' | 'error' | 'default' | 'info', label: string }> = {
  [TaskStatus.PENDING]: { variant: 'warning', label: 'Ожидает' },
  [TaskStatus.ASSIGNED]: { variant: 'info', label: 'Назначена' },
  [TaskStatus.IN_PROGRESS]: { variant: 'info', label: 'В процессе' },
  [TaskStatus.COMPLETED]: { variant: 'success', label: 'Завершена' },
  [TaskStatus.CANCELLED]: { variant: 'default', label: 'Отменена' },
  [TaskStatus.POSTPONED]: { variant: 'warning', label: 'Отложена' },
}

// Type badge mapping
const typeConfig: Record<TaskType, { variant: 'success' | 'warning' | 'error' | 'default' | 'info', label: string }> = {
  [TaskType.REFILL]: { variant: 'success', label: 'Пополнение' },
  [TaskType.COLLECTION]: { variant: 'info', label: 'Инкассация' },
  [TaskType.REPAIR]: { variant: 'error', label: 'Ремонт' },
  [TaskType.MAINTENANCE]: { variant: 'warning', label: 'ТО' },
  [TaskType.CLEANING]: { variant: 'info', label: 'Мойка' },
  [TaskType.INSPECTION]: { variant: 'info', label: 'Проверка' },
  [TaskType.REPLACE_HOPPER]: { variant: 'warning', label: 'Замена бункера' },
  [TaskType.REPLACE_GRINDER]: { variant: 'warning', label: 'Замена кофемолки' },
  [TaskType.REPLACE_BREWER]: { variant: 'warning', label: 'Замена варочного блока' },
  [TaskType.REPLACE_MIXER]: { variant: 'warning', label: 'Замена миксера' },
  [TaskType.OTHER]: { variant: 'default', label: 'Другое' },
}

// Priority badge mapping
const priorityConfig: Record<TaskPriority, { variant: 'success' | 'warning' | 'error' | 'default', label: string }> = {
  [TaskPriority.LOW]: { variant: 'default', label: 'Низкий' },
  [TaskPriority.MEDIUM]: { variant: 'warning', label: 'Средний' },
  [TaskPriority.HIGH]: { variant: 'error', label: 'Высокий' },
  [TaskPriority.CRITICAL]: { variant: 'error', label: 'Критичный' },
}

export const taskColumns: ColumnDef<Task>[] = [
  {
    accessorKey: 'machine',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Аппарат" />
    ),
    cell: ({ row }) => {
      const machine = row.original.machine
      return (
        <div className="max-w-[150px]">
          <div className="font-medium text-foreground">
            {machine?.machine_number || '-'}
          </div>
          {machine?.location?.name && (
            <div className="text-xs text-muted-foreground truncate">
              {machine.location.name}
            </div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'type_code',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Тип" />
    ),
    cell: ({ row }) => {
      const type = row.getValue('type_code') as TaskType
      const config = typeConfig[type] || typeConfig[TaskType.OTHER]

      return (
        <Badge variant={config.variant}>
          {config.label}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'status',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Статус" />
    ),
    cell: ({ row }) => {
      const status = row.getValue('status') as TaskStatus
      const config = statusConfig[status] || statusConfig[TaskStatus.PENDING]

      return (
        <Badge variant={config.variant}>
          {config.label}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'priority',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Приоритет" />
    ),
    cell: ({ row }) => {
      const priority = row.getValue('priority') as TaskPriority
      const config = priorityConfig[priority] || priorityConfig[TaskPriority.MEDIUM]

      return (
        <Badge variant={config.variant}>
          {config.label}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'assigned_to',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Назначена" />
    ),
    cell: ({ row }) => {
      const assignedTo = row.original.assigned_to
      return (
        <div className="text-sm">
          {assignedTo?.full_name || (
            <span className="text-muted-foreground">Не назначена</span>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'scheduled_date',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Запланировано" />
    ),
    cell: ({ row }) => {
      const date = row.getValue('scheduled_date') as string
      const dueDate = row.original.due_date

      return (
        <div className="text-sm">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span>{format(new Date(date), 'dd.MM.yyyy', { locale: ru })}</span>
          </div>
          {dueDate && (
            <div className="text-xs text-muted-foreground">
              До: {format(new Date(dueDate), 'dd.MM.yyyy', { locale: ru })}
            </div>
          )}
        </div>
      )
    },
  },
  {
    id: 'photos',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Фото" />
    ),
    cell: ({ row }) => {
      const hasBefore = row.original.has_photo_before
      const hasAfter = row.original.has_photo_after

      return (
        <div className="flex gap-1">
          {hasBefore ? (
            <Badge variant="success" className="text-xs px-1.5 py-0">До</Badge>
          ) : (
            <Badge variant="outline" className="text-xs px-1.5 py-0">До</Badge>
          )}
          {hasAfter ? (
            <Badge variant="success" className="text-xs px-1.5 py-0">После</Badge>
          ) : (
            <Badge variant="outline" className="text-xs px-1.5 py-0">После</Badge>
          )}
        </div>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const task = row.original

      return (
        <TaskRowActions task={task} />
      )
    },
  },
]

export interface TaskActionCallbacks {
  onView?: (task: Task) => void
  onEdit?: (task: Task) => void
  onComplete?: (task: Task) => void
  onAssign?: (task: Task) => void
  onPostpone?: (task: Task) => void
  onCancel?: (task: Task) => void
  onDelete?: (task: Task) => void
}

interface TaskRowActionsProps {
  task: Task
  callbacks?: TaskActionCallbacks
}

export function TaskRowActions({ task, callbacks }: TaskRowActionsProps) {
  const actions: RowAction<Task>[] = [
    {
      label: 'Просмотр',
      icon: <Eye className="h-4 w-4" />,
      onClick: (t) => {
        if (callbacks?.onView) {
          callbacks.onView(t)
        } else {
          window.location.href = `/dashboard/tasks/${t.id}`
        }
      },
    },
    {
      label: 'Редактировать',
      icon: <Edit className="h-4 w-4" />,
      onClick: (t) => {
        if (callbacks?.onEdit) {
          callbacks.onEdit(t)
        } else {
          window.location.href = `/dashboard/tasks/${t.id}/edit`
        }
      },
      hidden: (t) => t.status === TaskStatus.COMPLETED || t.status === TaskStatus.CANCELLED,
    },
    {
      label: 'Завершить',
      icon: <CheckCircle2 className="h-4 w-4" />,
      onClick: (t) => {
        if (callbacks?.onComplete) {
          callbacks.onComplete(t)
        } else {
          window.location.href = `/dashboard/tasks/${t.id}/complete`
        }
      },
      hidden: (t) => t.status === TaskStatus.COMPLETED || t.status === TaskStatus.CANCELLED,
    },
    {
      label: 'Назначить',
      icon: <UserPlus className="h-4 w-4" />,
      onClick: (t) => callbacks?.onAssign?.(t),
      hidden: (t) => t.status === TaskStatus.COMPLETED || t.status === TaskStatus.CANCELLED || !callbacks?.onAssign,
    },
    {
      label: 'Отложить',
      icon: <CalendarClock className="h-4 w-4" />,
      onClick: (t) => callbacks?.onPostpone?.(t),
      hidden: (t) => t.status === TaskStatus.COMPLETED || t.status === TaskStatus.CANCELLED || t.status === TaskStatus.POSTPONED || !callbacks?.onPostpone,
    },
    {
      label: 'Отменить',
      icon: <XCircle className="h-4 w-4" />,
      onClick: (t) => callbacks?.onCancel?.(t),
      hidden: (t) => t.status === TaskStatus.COMPLETED || t.status === TaskStatus.CANCELLED || !callbacks?.onCancel,
      variant: 'destructive',
    },
    {
      label: 'Удалить',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: (t) => callbacks?.onDelete?.(t),
      hidden: !callbacks?.onDelete,
      variant: 'destructive',
    },
  ]

  return <DataTableRowActions row={task} actions={actions} menuLabel="Действия" />
}
