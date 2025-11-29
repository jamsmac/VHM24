import apiClient from './axios'

export interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  is_read: boolean
  created_at: string
  link?: string
  metadata?: Record<string, any>
}

export const notificationsApi = {
  getAll: async (): Promise<Notification[]> => {
    const response = await apiClient.get<Notification[]>('/notifications')
    return response.data
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get<{ count: number }>('/notifications/unread/count')
    return response.data.count
  },

  markAsRead: async (id: string): Promise<void> => {
    await apiClient.patch(`/notifications/${id}/read`)
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.patch('/notifications/read-all')
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/notifications/${id}`)
  },

  deleteAll: async (): Promise<void> => {
    await apiClient.delete('/notifications')
  },
}
