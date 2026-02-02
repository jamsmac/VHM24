'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Task, TaskStatus, TaskType, TaskPriority } from '@/types/tasks'
import { WarmCard } from '@/components/ui/warm-card'
import { Button } from '@/components/ui/button'
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
  GripVertical,
  Plus,
} from 'lucide-react'

export type KanbanColumn = 'pending' | 'in_progress' | 'completed'

export interface KanbanBoardProps {
  tasks: Task[]
  onTaskClick?: (task: Task) => void
  onTaskMove?: (taskId: string, newStatus: TaskStatus) => void
  onAddTask?: (column: KanbanColumn) => void
  className?: string
}

const columnConfig: Record<KanbanColumn, { title: string; status: TaskStatus[]; color: string }> = {
  pending: {
    title: 'Ожидает',
    status: [TaskStatus.PENDING, TaskStatus.ASSIGNED],
    color: 'border-t-amber-500',
  },
  in_progress: {
    title: 'В работе',
    status: [TaskStatus.IN_PROGRESS],
    color: 'border-t-blue-500',
  },
  completed: {
    title: 'Завершено',
    status: [TaskStatus.COMPLETED],
    color: 'border-t-emerald-500',
  },
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
  [TaskType.MAINTENANCE]: 'ТО',
  [TaskType.CLEANING]: 'Чистка',
  [TaskType.INSPECTION]: 'Осмотр',
  [TaskType.REPLACE_HOPPER]: 'Замена бункера',
  [TaskType.REPLACE_GRINDER]: 'Замена кофемолки',
  [TaskType.REPLACE_BREWER]: 'Замена варочной группы',
  [TaskType.REPLACE_MIXER]: 'Замена миксера',
  [TaskType.OTHER]: 'Прочее',
}

const priorityConfig: Record<TaskPriority, { bg: string; text: string; dot: string }> = {
  [TaskPriority.LOW]: { bg: 'bg-stone-100', text: 'text-stone-600', dot: 'bg-stone-400' },
  [TaskPriority.MEDIUM]: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  [TaskPriority.HIGH]: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  [TaskPriority.CRITICAL]: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
}

/**
 * KanbanBoard - Kanban board for task management
 * Part of VendHub "Warm Brew" design system
 */
export function KanbanBoard({
  tasks,
  onTaskClick,
  onTaskMove,
  onAddTask,
  className,
}: KanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<string | null>(null)

  // Group tasks by column
  const tasksByColumn = useMemo(() => {
    const grouped: Record<KanbanColumn, Task[]> = {
      pending: [],
      in_progress: [],
      completed: [],
    }

    tasks.forEach((task) => {
      if (columnConfig.pending.status.includes(task.status)) {
        grouped.pending.push(task)
      } else if (columnConfig.in_progress.status.includes(task.status)) {
        grouped.in_progress.push(task)
      } else if (columnConfig.completed.status.includes(task.status)) {
        grouped.completed.push(task)
      }
    })

    return grouped
  }, [tasks])

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId)
  }

  const handleDragEnd = () => {
    setDraggedTask(null)
  }

  const handleDrop = (column: KanbanColumn) => {
    if (draggedTask && onTaskMove) {
      const newStatus = column === 'pending'
        ? TaskStatus.PENDING
        : column === 'in_progress'
        ? TaskStatus.IN_PROGRESS
        : TaskStatus.COMPLETED
      onTaskMove(draggedTask, newStatus)
    }
    setDraggedTask(null)
  }

  return (
    <div className={cn('flex gap-4 h-full overflow-x-auto pb-4', className)}>
      {(Object.keys(columnConfig) as KanbanColumn[]).map((columnId) => {
        const config = columnConfig[columnId]
        const columnTasks = tasksByColumn[columnId]

        return (
          <div
            key={columnId}
            className="flex-1 min-w-[300px] max-w-[400px] flex flex-col"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(columnId)}
          >
            {/* Column Header */}
            <div className={cn('bg-white rounded-t-xl border-t-4 p-4', config.color)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-stone-800">{config.title}</h3>
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-stone-100 text-xs font-medium text-stone-600">
                    {columnTasks.length}
                  </span>
                </div>
                {onAddTask && columnId !== 'completed' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onAddTask(columnId)}
                    className="h-8 w-8 text-stone-500 hover:text-amber-600 hover:bg-amber-50"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Task List */}
            <div className="flex-1 bg-stone-100 rounded-b-xl p-2 space-y-2 overflow-y-auto">
              {columnTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-stone-400">
                  <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">Нет задач</p>
                </div>
              ) : (
                columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => onTaskClick?.(task)}
                    onDragStart={() => handleDragStart(task.id)}
                    onDragEnd={handleDragEnd}
                    isDragging={draggedTask === task.id}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Task Card Component
interface TaskCardProps {
  task: Task
  onClick?: () => void
  onDragStart?: () => void
  onDragEnd?: () => void
  isDragging?: boolean
}

function TaskCard({
  task,
  onClick,
  onDragStart,
  onDragEnd,
  isDragging = false,
}: TaskCardProps) {
  const Icon = taskTypeIcons[task.type_code] || AlertCircle
  const priority = priorityConfig[task.priority]

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== TaskStatus.COMPLETED

  return (
    <WarmCard
      hover
      clickable
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        'cursor-pointer transition-all',
        isDragging && 'opacity-50 rotate-2 scale-105',
        isOverdue && 'border-red-300'
      )}
    >
      {/* Drag Handle */}
      <div className="flex items-start gap-2 mb-3">
        <GripVertical className="w-4 h-4 text-stone-300 mt-0.5 cursor-grab" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={cn('w-6 h-6 rounded-md flex items-center justify-center', priority.bg)}>
              <Icon className={cn('w-3.5 h-3.5', priority.text)} />
            </div>
            <span className="text-sm font-medium text-stone-800 truncate">
              {taskTypeLabels[task.type_code]}
            </span>
          </div>
          {task.description && (
            <p className="text-xs text-stone-500 line-clamp-2 ml-8">
              {task.description}
            </p>
          )}
        </div>
      </div>

      {/* Machine Info */}
      {task.machine && (
        <div className="flex items-center gap-2 text-xs text-stone-500 mb-2">
          <Coffee className="w-3.5 h-3.5" />
          <span className="truncate">{task.machine.machine_number}</span>
          {task.machine.location && (
            <>
              <MapPin className="w-3 h-3 ml-1" />
              <span className="truncate">{task.machine.location.name}</span>
            </>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-stone-100">
        {/* Assignee */}
        <div className="flex items-center gap-1.5 text-xs text-stone-500">
          <User className="w-3.5 h-3.5" />
          <span className="truncate max-w-[100px]">
            {task.assigned_to?.full_name || 'Не назначен'}
          </span>
        </div>

        {/* Due Date */}
        <div className={cn(
          'flex items-center gap-1 text-xs',
          isOverdue ? 'text-red-600' : 'text-stone-500'
        )}>
          <Clock className="w-3.5 h-3.5" />
          {task.due_date ? (
            <span>{new Date(task.due_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
          ) : (
            <span>Без срока</span>
          )}
        </div>

        {/* Priority dot */}
        <div className={cn('w-2 h-2 rounded-full', priority.dot)} title={task.priority} />
      </div>
    </WarmCard>
  )
}

export default KanbanBoard
