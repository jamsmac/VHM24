import apiClient from './axios'

export interface AuditLog {
  id: string
  user: {
    id: string
    full_name: string
    username: string
  }
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT'
  entity_type: string
  entity_id?: string
  description: string
  ip_address: string
  user_agent?: string
  metadata?: Record<string, any>
  created_at: string
}

export const auditApi = {
  getAll: async (params?: {
    action?: string
    entity_type?: string
    user_id?: string
    date_from?: string
    date_to?: string
    page?: number
    limit?: number
  }): Promise<{ data: AuditLog[]; total: number; page: number; limit: number }> => {
    const response = await apiClient.get('/audit-logs', { params })
    return response.data
  },

  getById: async (id: string): Promise<AuditLog> => {
    const response = await apiClient.get(`/audit-logs/${id}`)
    return response.data
  },

  exportLogs: async (params?: {
    date_from?: string
    date_to?: string
    format?: 'csv' | 'xlsx'
  }): Promise<Blob> => {
    const response = await apiClient.get('/audit-logs/export', {
      params,
      responseType: 'blob',
    })
    return response.data
  },
}
