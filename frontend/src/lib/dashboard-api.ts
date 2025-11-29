import apiClient from './axios'

export interface DashboardStats {
  total_revenue_today: number
  total_tasks_active: number
  total_incidents_open: number
  total_machines_active: number
  revenue_vs_yesterday: number
  tasks_vs_yesterday: number
  incidents_vs_yesterday: number
  machines_vs_yesterday: number
}

export interface RecentTask {
  id: string
  type_code: string
  machine_number: string
  status: string
  scheduled_date: string
}

export interface ActiveIncident {
  id: string
  title: string
  priority: string
  machine_number: string
  reported_at: string
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get<DashboardStats>('/dashboard/stats')
    return response.data
  },

  getRecentTasks: async (limit: number = 5): Promise<RecentTask[]> => {
    const response = await apiClient.get<RecentTask[]>('/dashboard/recent-tasks', {
      params: { limit },
    })
    return response.data
  },

  getActiveIncidents: async (limit: number = 5): Promise<ActiveIncident[]> => {
    const response = await apiClient.get<ActiveIncident[]>('/dashboard/active-incidents', {
      params: { limit },
    })
    return response.data
  },

  getRevenueChart: async (days: number = 7) => {
    const response = await apiClient.get('/dashboard/revenue-chart', {
      params: { days },
    })
    return response.data
  },

  getMachineStatusStats: async () => {
    const response = await apiClient.get('/dashboard/machine-status-stats')
    return response.data
  },

  getTaskTypeStats: async () => {
    const response = await apiClient.get('/dashboard/task-type-stats')
    return response.data
  },

  getSalesOverview: async (days: number = 7) => {
    const response = await apiClient.get('/dashboard/sales-overview', {
      params: { days },
    })
    return response.data
  },
}
