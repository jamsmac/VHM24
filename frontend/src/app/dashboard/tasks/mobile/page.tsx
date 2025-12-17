'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { tasksApi } from '@/lib/tasks-api'
import { MobileTaskCard } from '@/components/tasks/MobileTaskCard'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { MobileNav } from '@/components/layout/MobileNav'
import { Filter, RefreshCw } from 'lucide-react'
import { TaskStatus, TaskPriority } from '@/types/tasks'

export default function MobileTasksPage() {
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | ''>('')
  const [showFilters, setShowFilters] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)

  const { data: tasks, isLoading, refetch } = useQuery({
    queryKey: ['tasks', statusFilter, priorityFilter],
    queryFn: () => tasksApi.getAll({
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
    }),
  })

  // Pull to refresh
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY
    }
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (startY.current === 0 || window.scrollY > 0) {return}

    const currentY = e.touches[0].clientY
    const distance = currentY - startY.current

    if (distance > 0 && distance < 150) {
      setPullDistance(distance)
    }
  }, [])

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance > 80) {
      setIsRefreshing(true)
      await refetch()
      setTimeout(() => {
        setIsRefreshing(false)
        setPullDistance(0)
      }, 500)
    } else {
      setPullDistance(0)
    }
    startY.current = 0
  }, [pullDistance, refetch])

  useEffect(() => {
    const container = document.getElementById('tasks-container')
    if (!container) {return}

    container.addEventListener('touchstart', handleTouchStart as EventListener)
    container.addEventListener('touchmove', handleTouchMove as EventListener)
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart as EventListener)
      container.removeEventListener('touchmove', handleTouchMove as EventListener)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  const myTasks = tasks?.filter((t) => t.status === 'assigned' || t.status === 'in_progress') || []
  const completedTasks = tasks?.filter((t) => t.status === 'completed') || []

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader
        title="Мои задачи"
        actions={
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 rounded-lg active:bg-gray-100 touch-manipulation"
          >
            <Filter className="h-6 w-6 text-gray-700" />
          </button>
        }
      />

      {/* Pull to refresh indicator */}
      {pullDistance > 0 && (
        <div
          className="flex justify-center items-center py-4 transition-all"
          style={{ transform: `translateY(${Math.min(pullDistance, 100)}px)` }}
        >
          <RefreshCw
            className={`h-6 w-6 text-indigo-600 ${isRefreshing || pullDistance > 80 ? 'animate-spin' : ''}`}
          />
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Статус
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setStatusFilter('')}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap touch-manipulation ${
                  statusFilter === '' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Все
              </button>
              <button
                onClick={() => setStatusFilter(TaskStatus.ASSIGNED)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap touch-manipulation ${
                  statusFilter === TaskStatus.ASSIGNED ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Назначены
              </button>
              <button
                onClick={() => setStatusFilter(TaskStatus.IN_PROGRESS)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap touch-manipulation ${
                  statusFilter === TaskStatus.IN_PROGRESS ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                В работе
              </button>
              <button
                onClick={() => setStatusFilter(TaskStatus.COMPLETED)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap touch-manipulation ${
                  statusFilter === TaskStatus.COMPLETED ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Завершены
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Приоритет
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setPriorityFilter('')}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap touch-manipulation ${
                  priorityFilter === '' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Все
              </button>
              <button
                onClick={() => setPriorityFilter(TaskPriority.CRITICAL)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap touch-manipulation ${
                  priorityFilter === TaskPriority.CRITICAL ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                🔥 Срочно
              </button>
              <button
                onClick={() => setPriorityFilter(TaskPriority.HIGH)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap touch-manipulation ${
                  priorityFilter === TaskPriority.HIGH ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Высокий
              </button>
              <button
                onClick={() => setPriorityFilter(TaskPriority.MEDIUM)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap touch-manipulation ${
                  priorityFilter === TaskPriority.MEDIUM ? 'bg-yellow-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                Средний
              </button>
            </div>
          </div>
        </div>
      )}

      <div id="tasks-container" className="p-4 space-y-6">
        {/* Active tasks */}
        {!statusFilter || statusFilter === 'assigned' || statusFilter === 'in_progress' ? (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 px-1">
              Активные задачи ({myTasks.length})
            </h2>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl h-48 animate-pulse" />
                ))}
              </div>
            ) : myTasks.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <p className="text-gray-500">Нет активных задач</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myTasks.map((task) => (
                  <MobileTaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </section>
        ) : null}

        {/* Completed tasks */}
        {!statusFilter || statusFilter === 'completed' ? (
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 px-1">
              Завершенные ({completedTasks.length})
            </h2>
            {completedTasks.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <p className="text-gray-500">Нет завершенных задач</p>
              </div>
            ) : (
              <div className="space-y-4">
                {completedTasks.map((task) => (
                  <MobileTaskCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </section>
        ) : null}
      </div>

      <MobileNav />
    </div>
  )
}
