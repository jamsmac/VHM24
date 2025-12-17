import apiClient from './axios'

export interface HealthCheck {
  status: string
  timestamp: string
  info?: {
    database?: { status: string }
    [key: string]: { status: string } | undefined
  }
  error?: Record<string, unknown>
}

export interface ReadinessCheck {
  status: string
  timestamp: string
  uptime: number
  environment: string
}

export interface LivenessCheck {
  status: string
  timestamp: string
}

export interface QueueStats {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
}

export interface QueueHealth {
  status: string
  timestamp: string
  queues: {
    'commission-calculations': QueueStats
    'sales-import': QueueStats
    [key: string]: QueueStats
  }
}

export interface MonitoringHealth {
  status: string
  timestamp: string
  uptime: number
  memory: {
    rss: number
    heapTotal: number
    heapUsed: number
    external: number
    arrayBuffers: number
  }
  environment: string
}

export interface SystemMetrics {
  uptime: number
  memory: {
    rss: number
    heapTotal: number
    heapUsed: number
    external: number
  }
  database: {
    activeConnections: number
  }
  queues: {
    [queueName: string]: QueueStats
  }
}

export interface MetricDataPoint {
  timestamp: string
  value: number
}

export interface DashboardStats {
  health: {
    database: 'up' | 'down'
    cache: 'up' | 'down'
    queues: 'up' | 'down'
  }
  uptime: number
  memory: {
    used: number
    total: number
    percentage: number
  }
  queues: {
    totalWaiting: number
    totalActive: number
    totalCompleted: number
    totalFailed: number
  }
}

export const monitoringApi = {
  /**
   * Get health check status
   */
  getHealth: async (): Promise<HealthCheck> => {
    const response = await apiClient.get<HealthCheck>('/health')
    return response.data
  },

  /**
   * Get readiness status
   */
  getReadiness: async (): Promise<ReadinessCheck> => {
    const response = await apiClient.get<ReadinessCheck>('/health/ready')
    return response.data
  },

  /**
   * Get liveness status
   */
  getLiveness: async (): Promise<LivenessCheck> => {
    const response = await apiClient.get<LivenessCheck>('/health/live')
    return response.data
  },

  /**
   * Get queue health and statistics
   */
  getQueueHealth: async (): Promise<QueueHealth> => {
    const response = await apiClient.get<QueueHealth>('/health/queues')
    return response.data
  },

  /**
   * Get monitoring health (detailed)
   */
  getMonitoringHealth: async (): Promise<MonitoringHealth> => {
    const response = await apiClient.get<MonitoringHealth>('/monitoring/health')
    return response.data
  },

  /**
   * Get all system metrics in a combined format
   */
  getSystemMetrics: async (): Promise<SystemMetrics> => {
    const [health, queues] = await Promise.all([
      monitoringApi.getMonitoringHealth(),
      monitoringApi.getQueueHealth(),
    ])

    return {
      uptime: health.uptime,
      memory: health.memory,
      database: {
        activeConnections: 0, // Would need to parse from /metrics
      },
      queues: queues.queues,
    }
  },

  /**
   * Get dashboard statistics
   */
  getDashboardStats: async (): Promise<DashboardStats> => {
    const [health, queues, readiness] = await Promise.all([
      monitoringApi.getMonitoringHealth(),
      monitoringApi.getQueueHealth(),
      monitoringApi.getReadiness(),
    ])

    const queueValues = Object.values(queues.queues)
    const totalWaiting = queueValues.reduce((sum, q) => sum + q.waiting, 0)
    const totalActive = queueValues.reduce((sum, q) => sum + q.active, 0)
    const totalCompleted = queueValues.reduce((sum, q) => sum + q.completed, 0)
    const totalFailed = queueValues.reduce((sum, q) => sum + q.failed, 0)

    const memoryUsedMB = health.memory.heapUsed / (1024 * 1024)
    const memoryTotalMB = health.memory.heapTotal / (1024 * 1024)

    return {
      health: {
        database: 'up',
        cache: 'up',
        queues: queues.status === 'ok' ? 'up' : 'down',
      },
      uptime: health.uptime,
      memory: {
        used: memoryUsedMB,
        total: memoryTotalMB,
        percentage: (memoryUsedMB / memoryTotalMB) * 100,
      },
      queues: {
        totalWaiting,
        totalActive,
        totalCompleted,
        totalFailed,
      },
    }
  },
}

// Helper functions
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) {
    return `${days}д ${hours}ч ${minutes}м`
  }
  if (hours > 0) {
    return `${hours}ч ${minutes}м`
  }
  return `${minutes}м`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function getHealthColor(status: 'up' | 'down'): string {
  return status === 'up' ? 'text-green-600' : 'text-red-600'
}

export function getHealthBg(status: 'up' | 'down'): string {
  return status === 'up' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
}
