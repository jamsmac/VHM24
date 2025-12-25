'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { dashboardApi } from '@/lib/dashboard-api'
import {
  Calendar,
  Sun,
  Moon,
  Cloud,
  Clock,
  AlertTriangle,
  ClipboardList,
  TrendingUp,
  Package,
} from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'

function getGreeting(): { text: string; icon: React.ReactNode } {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) {
    return { text: 'Доброе утро', icon: <Sun className="h-5 w-5 text-yellow-500" /> }
  } else if (hour >= 12 && hour < 17) {
    return { text: 'Добрый день', icon: <Sun className="h-5 w-5 text-orange-500" /> }
  } else if (hour >= 17 && hour < 22) {
    return { text: 'Добрый вечер', icon: <Cloud className="h-5 w-5 text-indigo-500" /> }
  } else {
    return { text: 'Доброй ночи', icon: <Moon className="h-5 w-5 text-blue-500" /> }
  }
}

interface TodaySummaryProps {
  userName?: string
}

export function TodaySummary({ userName }: TodaySummaryProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: dashboardApi.getStats,
    staleTime: 60000,
  })

  const greeting = getGreeting()
  const today = new Date()

  return (
    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-lg p-6 text-white">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {greeting.icon}
            <span className="text-lg font-medium text-white/90">
              {greeting.text}{userName ? `, ${userName}` : ''}!
            </span>
          </div>
          <div className="flex items-center gap-2 text-white/70 text-sm">
            <Calendar className="h-4 w-4" />
            <span>{format(today, 'EEEE, d MMMM yyyy', { locale: ru })}</span>
          </div>
          <div className="flex items-center gap-2 text-white/70 text-sm mt-1">
            <Clock className="h-4 w-4" />
            <span>{format(today, 'HH:mm')}</span>
          </div>
        </div>

        <div className="text-right">
          <p className="text-4xl font-bold">{format(today, 'd')}</p>
          <p className="text-sm text-white/70">{format(today, 'MMMM', { locale: ru })}</p>
        </div>
      </div>

      {/* Today's Overview */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link
          href="/dashboard/tasks?status=active"
          className="bg-white/10 backdrop-blur rounded-lg p-3 hover:bg-white/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-white/70" />
            <span className="text-xs text-white/70">Активных задач</span>
          </div>
          <p className="text-2xl font-bold mt-1">
            {isLoading ? '...' : stats?.total_tasks_active || 0}
          </p>
        </Link>

        <Link
          href="/dashboard/incidents?status=open"
          className="bg-white/10 backdrop-blur rounded-lg p-3 hover:bg-white/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-white/70" />
            <span className="text-xs text-white/70">Инцидентов</span>
          </div>
          <p className="text-2xl font-bold mt-1">
            {isLoading ? '...' : stats?.total_incidents_open || 0}
          </p>
        </Link>

        <Link
          href="/dashboard/machines"
          className="bg-white/10 backdrop-blur rounded-lg p-3 hover:bg-white/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-white/70" />
            <span className="text-xs text-white/70">Активно</span>
          </div>
          <p className="text-2xl font-bold mt-1">
            {isLoading ? '...' : stats?.total_machines_active || 0}
          </p>
        </Link>

        <div className="bg-white/10 backdrop-blur rounded-lg p-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-white/70" />
            <span className="text-xs text-white/70">Выручка</span>
          </div>
          <p className="text-2xl font-bold mt-1">
            {isLoading ? '...' : `${((stats?.total_revenue_today || 0) / 1000).toFixed(0)}K`}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="mt-4 flex items-center gap-4 text-sm">
          {stats.revenue_vs_yesterday !== undefined && (
            <div className="flex items-center gap-1">
              <span className={stats.revenue_vs_yesterday >= 0 ? 'text-green-300' : 'text-red-300'}>
                {stats.revenue_vs_yesterday >= 0 ? '+' : ''}
                {stats.revenue_vs_yesterday?.toFixed(1)}%
              </span>
              <span className="text-white/60">vs вчера</span>
            </div>
          )}
          {stats.tasks_vs_yesterday !== undefined && (
            <div className="flex items-center gap-1">
              <span className={stats.tasks_vs_yesterday >= 0 ? 'text-green-300' : 'text-red-300'}>
                {stats.tasks_vs_yesterday >= 0 ? '+' : ''}
                {stats.tasks_vs_yesterday}
              </span>
              <span className="text-white/60">задач</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Compact version
export function TodaySummaryCompact() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: dashboardApi.getStats,
    staleTime: 60000,
  })

  const greeting = getGreeting()
  const today = new Date()

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            {greeting.icon}
          </div>
          <div>
            <p className="font-medium text-gray-900">{greeting.text}!</p>
            <p className="text-sm text-gray-500">
              {format(today, 'd MMMM, EEEE', { locale: ru })}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{format(today, 'HH:mm')}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="text-center p-2 bg-blue-50 rounded-lg">
          <p className="text-lg font-bold text-blue-600">{stats?.total_tasks_active || 0}</p>
          <p className="text-xs text-blue-600/70">Задач</p>
        </div>
        <div className="text-center p-2 bg-orange-50 rounded-lg">
          <p className="text-lg font-bold text-orange-600">{stats?.total_incidents_open || 0}</p>
          <p className="text-xs text-orange-600/70">Инцидентов</p>
        </div>
        <div className="text-center p-2 bg-green-50 rounded-lg">
          <p className="text-lg font-bold text-green-600">
            {((stats?.total_revenue_today || 0) / 1000).toFixed(0)}K
          </p>
          <p className="text-xs text-green-600/70">Выручка</p>
        </div>
      </div>
    </div>
  )
}
