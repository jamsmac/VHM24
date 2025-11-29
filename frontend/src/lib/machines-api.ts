import apiClient from './axios'
import type { Machine, MachineStats, CreateMachineDto, MachineStatus } from '@/types/machines'

export const machinesApi = {
  getAll: async (params?: {
    status?: MachineStatus
    locationId?: string
  }): Promise<Machine[]> => {
    const response = await apiClient.get<Machine[]>('/machines', { params })
    return response.data
  },

  getById: async (id: string): Promise<Machine> => {
    const response = await apiClient.get<Machine>(`/machines/${id}`)
    return response.data
  },

  create: async (data: CreateMachineDto): Promise<Machine> => {
    const response = await apiClient.post<Machine>('/machines', data)
    return response.data
  },

  update: async (id: string, data: Partial<CreateMachineDto>): Promise<Machine> => {
    const response = await apiClient.patch<Machine>(`/machines/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/machines/${id}`)
  },

  updateStats: async (id: string, stats: {
    current_cash_amount?: number
    current_product_count?: number
    last_collection_date?: Date
    last_refill_date?: Date
  }): Promise<Machine> => {
    const response = await apiClient.patch<Machine>(`/machines/${id}/stats`, stats)
    return response.data
  },

  getStats: async (): Promise<MachineStats> => {
    const response = await apiClient.get<MachineStats>('/machines/stats')
    return response.data
  },

  getTasks: async (id: string) => {
    const response = await apiClient.get(`/machines/${id}/tasks`)
    return response.data
  },

  getInventory: async (id: string) => {
    const response = await apiClient.get(`/machines/${id}/inventory`)
    return response.data
  },

  getMachineStats: async (id: string, dateFrom?: string, dateTo?: string) => {
    const response = await apiClient.get(`/machines/${id}/stats`, {
      params: { dateFrom, dateTo },
    })
    return response.data
  },
}
