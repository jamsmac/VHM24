import { memo } from 'react'
import Link from 'next/link'
import { formatDateTime } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Task } from '@/types/tasks'
import type { RecentTask } from '@/lib/dashboard-api'
import { Clock, MapPin, User } from 'lucide-react'

// Support both full Task and simplified RecentTask from dashboard
type TaskCardData = Task | RecentTask

interface TaskCardProps {
  task: TaskCardData
}

// Type guard to check if task is full Task type
function isFullTask(task: TaskCardData): task is Task {
  return 'machine_id' in task
}

export const TaskCard = memo(function TaskCard({ task }: TaskCardProps) {
  const fullTask = isFullTask(task) ? task : null
  const isOverdue = fullTask?.due_date && new Date(fullTask.due_date) < new Date()
  const overdueHours = isOverdue && fullTask?.due_date
    ? Math.floor((Date.now() - new Date(fullTask.due_date).getTime()) / (1000 * 60 * 60))
    : 0

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    assigned: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-indigo-100 text-indigo-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800',
  }

  const priorityColors: Record<string, string> = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  }

  return (
    <Link href={`/dashboard/tasks/${task.id}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">{task.type_code}</h3>
              <Badge className={statusColors[task.status] || 'bg-gray-100 text-gray-800'}>
                {task.status}
              </Badge>
              {fullTask && (
                <Badge className={priorityColors[fullTask.priority] || 'bg-gray-100 text-gray-800'}>
                  {fullTask.priority}
                </Badge>
              )}
            </div>
            {fullTask?.description && (
              <p className="text-sm text-gray-600 line-clamp-2">{fullTask.description}</p>
            )}
          </div>
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          {/* Show machine info - support both full and simplified task */}
          {fullTask?.machine ? (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{fullTask.machine.machine_number}</span>
              {fullTask.machine.location && <span className="text-gray-400">• {fullTask.machine.location.name}</span>}
            </div>
          ) : 'machine_number' in task && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{task.machine_number}</span>
            </div>
          )}

          {fullTask?.assigned_to && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{fullTask.assigned_to.full_name}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{formatDateTime(task.scheduled_date)}</span>
          </div>

          {isOverdue && overdueHours > 4 && (
            <Badge variant="danger" className="mt-2">
              Просрочена {overdueHours} ч. {overdueHours > 4 && '(инцидент создан)'}
            </Badge>
          )}
        </div>
      </div>
    </Link>
  )
})
