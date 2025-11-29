import apiClient from './axios'
import type { Task, CreateTaskDto, CompleteTaskDto, TaskStats, TaskStatus, TaskType, TaskPriority, TaskPhoto } from '@/types/tasks'

export const tasksApi = {
  getAll: async (params?: {
    status?: TaskStatus
    type?: TaskType
    machineId?: string
    assignedToUserId?: string
    priority?: TaskPriority
    dateFrom?: string
    dateTo?: string
  }): Promise<Task[]> => {
    const response = await apiClient.get<Task[]>('/tasks', { params })
    return response.data
  },

  getById: async (id: string): Promise<Task> => {
    const response = await apiClient.get<Task>(`/tasks/${id}`)
    return response.data
  },

  create: async (data: CreateTaskDto): Promise<Task> => {
    const response = await apiClient.post<Task>('/tasks', data)
    return response.data
  },

  update: async (id: string, data: Partial<CreateTaskDto>): Promise<Task> => {
    const response = await apiClient.patch<Task>(`/tasks/${id}`, data)
    return response.data
  },

  assign: async (id: string, userId: string): Promise<Task> => {
    const response = await apiClient.post<Task>(`/tasks/${id}/assign`, { user_id: userId })
    return response.data
  },

  start: async (id: string): Promise<Task> => {
    const response = await apiClient.post<Task>(`/tasks/${id}/start`)
    return response.data
  },

  complete: async (id: string, data: CompleteTaskDto): Promise<Task> => {
    const response = await apiClient.post<Task>(`/tasks/${id}/complete`, data)
    return response.data
  },

  cancel: async (id: string, reason: string): Promise<Task> => {
    const response = await apiClient.post<Task>(`/tasks/${id}/cancel`, { reason })
    return response.data
  },

  postpone: async (id: string, newDate: string, reason: string): Promise<Task> => {
    const response = await apiClient.post<Task>(`/tasks/${id}/postpone`, {
      new_scheduled_date: newDate,
      reason,
    })
    return response.data
  },

  addComment: async (taskId: string, comment: string): Promise<void> => {
    await apiClient.post(`/tasks/${taskId}/comments`, { comment })
  },

  getComments: async (taskId: string) => {
    const response = await apiClient.get(`/tasks/${taskId}/comments`)
    return response.data
  },

  getStats: async (): Promise<TaskStats> => {
    const response = await apiClient.get<TaskStats>('/tasks/stats')
    return response.data
  },

  getOverdue: async (): Promise<Task[]> => {
    const response = await apiClient.get<Task[]>('/tasks/overdue')
    return response.data
  },

  escalate: async (): Promise<{ escalated_count: number; incidents_created: number }> => {
    const response = await apiClient.post('/tasks/escalate')
    return response.data
  },

  getPhotos: async (taskId: string): Promise<TaskPhoto[]> => {
    const response = await apiClient.get<TaskPhoto[]>(`/tasks/${taskId}/photos`)
    return response.data
  },

  getPendingPhotos: async (): Promise<Task[]> => {
    const response = await apiClient.get<Task[]>('/tasks/pending-photos')
    return response.data
  },

  uploadPendingPhotos: async (taskId: string): Promise<Task> => {
    const response = await apiClient.post<Task>(`/tasks/${taskId}/upload-photos`)
    return response.data
  },
}
