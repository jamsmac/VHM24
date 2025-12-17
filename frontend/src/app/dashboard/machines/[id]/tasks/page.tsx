'use client'

import { useQuery } from '@tanstack/react-query'
import { machinesApi } from '@/lib/machines-api'
import { TaskCard } from '@/components/tasks/TaskCard'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { CardSkeleton } from '@/components/ui/LoadingSkeleton'
import type { Task } from '@/types/tasks'

interface MachineTasksPageProps {
  params: {
    id: string
  }
}

export default function MachineTasksPage({ params }: MachineTasksPageProps) {
  const { data: machine } = useQuery({
    queryKey: ['machines', params.id],
    queryFn: () => machinesApi.getById(params.id),
  })

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['machines', params.id, 'tasks'],
    queryFn: () => machinesApi.getTasks(params.id),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/machines/${params.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к аппарату
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">История задач</h1>
          <p className="mt-2 text-gray-600">
            {machine?.machine_number} - {machine?.location?.name}
          </p>
        </div>
      </div>

      {/* Task Statistics */}
      {tasks && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Всего задач</p>
            <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Завершено</p>
            <p className="text-2xl font-bold text-green-600">
              {tasks.filter((t: Task) => t.status === 'completed').length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">В работе</p>
            <p className="text-2xl font-bold text-blue-600">
              {tasks.filter((t: Task) => t.status === 'in_progress').length}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Просрочено</p>
            <p className="text-2xl font-bold text-red-600">
              {tasks.filter((t: Task & { is_overdue?: boolean }) => t.is_overdue).length}
            </p>
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i: number) => <CardSkeleton key={i} />)
        ) : tasks && tasks.length > 0 ? (
          tasks.map((task: Task) => <TaskCard key={task.id} task={task} />)
        ) : (
          <div className="col-span-full">
            <p className="text-gray-500 text-center py-12">Задачи не найдены</p>
          </div>
        )}
      </div>
    </div>
  )
}
