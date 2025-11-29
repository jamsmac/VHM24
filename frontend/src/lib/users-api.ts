import apiClient from './axios'
import type { User, CreateUserDto } from '@/types/users'
import { UserRole } from '@/types/users'

// Re-export for backward compatibility
export type { User, CreateUserDto }
export { UserRole }

export const usersApi = {
  getAll: async (params?: {
    role?: UserRole
    is_active?: boolean
  }): Promise<User[]> => {
    const response = await apiClient.get<User[]>('/users', { params })
    return response.data
  },

  getById: async (id: string): Promise<User> => {
    const response = await apiClient.get<User>(`/users/${id}`)
    return response.data
  },

  create: async (data: CreateUserDto): Promise<User> => {
    const response = await apiClient.post<User>('/users', data)
    return response.data
  },

  update: async (id: string, data: Partial<CreateUserDto>): Promise<User> => {
    const response = await apiClient.patch<User>(`/users/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`)
  },

  activate: async (id: string): Promise<User> => {
    const response = await apiClient.post<User>(`/users/${id}/activate`)
    return response.data
  },

  deactivate: async (id: string): Promise<User> => {
    const response = await apiClient.post<User>(`/users/${id}/deactivate`)
    return response.data
  },

  changePassword: async (id: string, newPassword: string): Promise<void> => {
    await apiClient.post(`/users/${id}/change-password`, { new_password: newPassword })
  },
}
