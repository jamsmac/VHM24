import apiClient from './axios'
import type { Incident, CreateIncidentDto, IncidentStatus, IncidentType, IncidentPriority } from '@/types/incidents'

export const incidentsApi = {
  getAll: async (params?: {
    status?: IncidentStatus
    type?: IncidentType
    machineId?: string
    priority?: IncidentPriority
    assignedToUserId?: string
  }): Promise<Incident[]> => {
    const response = await apiClient.get<Incident[]>('/incidents', { params })
    return response.data
  },

  getById: async (id: string): Promise<Incident> => {
    const response = await apiClient.get<Incident>(`/incidents/${id}`)
    return response.data
  },

  create: async (data: CreateIncidentDto): Promise<Incident> => {
    const response = await apiClient.post<Incident>('/incidents', data)
    return response.data
  },

  update: async (id: string, data: Partial<CreateIncidentDto>): Promise<Incident> => {
    const response = await apiClient.patch<Incident>(`/incidents/${id}`, data)
    return response.data
  },

  assign: async (id: string, userId: string): Promise<Incident> => {
    const response = await apiClient.patch<Incident>(`/incidents/${id}`, {
      assigned_to_user_id: userId,
    })
    return response.data
  },

  resolve: async (id: string, resolutionNotes: string): Promise<Incident> => {
    const response = await apiClient.post<Incident>(`/incidents/${id}/resolve`, {
      resolution_notes: resolutionNotes,
    })
    return response.data
  },

  close: async (id: string): Promise<Incident> => {
    const response = await apiClient.post<Incident>(`/incidents/${id}/close`)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/incidents/${id}`)
  },

  getStats: async () => {
    const response = await apiClient.get('/incidents/stats')
    return response.data
  },
}
