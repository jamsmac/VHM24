'use client'

import { useEffect, useState } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react'

interface JobResult {
  processed?: number
  updated?: number
  [key: string]: unknown
}

interface JobProgress {
  jobId: string
  type: string
  progress: number
  message?: string
  status: 'running' | 'completed' | 'failed'
  result?: JobResult
  error?: string
  timestamp: string
}

interface JobEventData {
  jobId: string
  type: string
  progress?: number
  message?: string
  result?: JobResult
  error?: string
}

interface JobProgressIndicatorProps {
  autoSubscribe?: boolean
  maxJobs?: number
}

/**
 * Job Progress Indicator Component
 *
 * Displays real-time progress of background jobs using WebSocket
 *
 * Features:
 * - Auto-connects to WebSocket
 * - Subscribes to queue updates
 * - Shows progress bar for running jobs
 * - Success/error notifications
 * - Auto-removes completed jobs after 5 seconds
 */
export function JobProgressIndicator({
  autoSubscribe = true,
  maxJobs = 5,
}: JobProgressIndicatorProps) {
  const [jobs, setJobs] = useState<Map<string, JobProgress>>(new Map())
  const { socket, isConnected, subscribe, unsubscribe } = useWebSocket({
    autoConnect: true,
  })

  // Subscribe to queue updates
  useEffect(() => {
    if (!isConnected || !autoSubscribe) {return}

    subscribe('queue')

    return () => {
      unsubscribe('queue')
    }
  }, [isConnected, autoSubscribe, subscribe, unsubscribe])

  // Listen to job events
  useEffect(() => {
    if (!socket) {return}

    // Job progress update
    const handleJobProgress = (rawData: unknown) => {
      const data = rawData as JobEventData
      setJobs((prev) => {
        const newJobs = new Map(prev)
        newJobs.set(data.jobId, {
          jobId: data.jobId,
          type: data.type,
          progress: data.progress ?? 0,
          message: data.message,
          status: 'running',
          timestamp: new Date().toISOString(),
        })
        return newJobs
      })
    }

    // Job completed
    const handleJobCompleted = (rawData: unknown) => {
      const data = rawData as JobEventData
      setJobs((prev) => {
        const newJobs = new Map(prev)
        newJobs.set(data.jobId, {
          jobId: data.jobId,
          type: data.type,
          progress: 100,
          status: 'completed',
          result: data.result,
          timestamp: new Date().toISOString(),
        })
        return newJobs
      })

      // Auto-remove after 5 seconds
      setTimeout(() => {
        setJobs((prev) => {
          const newJobs = new Map(prev)
          newJobs.delete(data.jobId)
          return newJobs
        })
      }, 5000)
    }

    // Job failed
    const handleJobFailed = (rawData: unknown) => {
      const data = rawData as JobEventData
      setJobs((prev) => {
        const newJobs = new Map(prev)
        newJobs.set(data.jobId, {
          jobId: data.jobId,
          type: data.type,
          progress: 0,
          status: 'failed',
          error: data.error,
          timestamp: new Date().toISOString(),
        })
        return newJobs
      })

      // Auto-remove after 10 seconds
      setTimeout(() => {
        setJobs((prev) => {
          const newJobs = new Map(prev)
          newJobs.delete(data.jobId)
          return newJobs
        })
      }, 10000)
    }

    socket.on('queue:job-progress', handleJobProgress)
    socket.on('queue:job-completed', handleJobCompleted)
    socket.on('queue:job-failed', handleJobFailed)

    return () => {
      socket.off('queue:job-progress', handleJobProgress)
      socket.off('queue:job-completed', handleJobCompleted)
      socket.off('queue:job-failed', handleJobFailed)
    }
  }, [socket])

  const jobsArray = Array.from(jobs.values()).slice(0, maxJobs)

  if (jobsArray.length === 0) {
    return null
  }

  const getJobTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'calculate-daily': 'Расчет дневных комиссий',
      'calculate-weekly': 'Расчет недельных комиссий',
      'calculate-monthly': 'Расчет месячных комиссий',
      'calculate-manual': 'Ручной расчет комиссий',
      'check-overdue': 'Проверка просроченных платежей',
      'sales-import': 'Импорт продаж',
    }
    return labels[type] || type
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 space-y-2 z-50">
      {jobsArray.map((job) => (
        <div
          key={job.jobId}
          className={`bg-white rounded-lg shadow-lg border-2 p-4 transition-all duration-300 ${
            job.status === 'completed'
              ? 'border-green-500'
              : job.status === 'failed'
              ? 'border-red-500'
              : 'border-blue-500'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              {job.status === 'running' && (
                <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
              )}
              {job.status === 'completed' && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              {job.status === 'failed' && (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="text-sm font-medium text-gray-900">
                {getJobTypeLabel(job.type)}
              </span>
            </div>

            <span className="text-xs text-gray-500">
              Job #{job.jobId.substring(0, 8)}
            </span>
          </div>

          {/* Progress bar */}
          {job.status === 'running' && (
            <div className="mb-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">{job.progress}%</p>
            </div>
          )}

          {/* Message */}
          {job.message && job.status === 'running' && (
            <p className="text-sm text-gray-700">{job.message}</p>
          )}

          {/* Success message */}
          {job.status === 'completed' && job.result && (
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div className="text-sm text-gray-700">
                <p className="font-medium">Успешно завершено!</p>
                {job.result.processed && (
                  <p className="text-xs text-gray-600">
                    Обработано: {job.result.processed}
                  </p>
                )}
                {job.result.updated && (
                  <p className="text-xs text-gray-600">
                    Обновлено: {job.result.updated}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Error message */}
          {job.status === 'failed' && (
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
              <div className="text-sm text-red-700">
                <p className="font-medium">Ошибка выполнения</p>
                <p className="text-xs text-red-600">{job.error}</p>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Connection status */}
      {!isConnected && (
        <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium text-yellow-800">
              Отключено от сервера
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
