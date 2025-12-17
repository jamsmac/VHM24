import apiClient from './axios'
import { Machine } from '@/types/machines'

export interface Location {
  id: string
  name: string
  address: string
  city?: string
  region?: string
  postal_code?: string
  location_type?: string
  foot_traffic?: string
  coordinates?: {
    latitude: number
    longitude: number
  }
  contact_person?: string
  contact_phone?: string
  notes?: string
  is_active: boolean
  machines?: Machine[]
  machine_count?: number
  created_at: string
  updated_at: string
}

export interface MapLocationData {
  id: string
  name: string
  address: string
  city: string
  latitude: number
  longitude: number
  status: string
  machine_count: number
  machines_active: number
  machines_error: number
  machines_low_stock: number
}

export interface CreateLocationDto {
  name: string
  address: string
  city?: string
  region?: string
  postal_code?: string
  location_type?: string
  foot_traffic?: string
  latitude?: number
  longitude?: number
  contact_person?: string
  contact_phone?: string
  notes?: string
}

export const locationsApi = {
  getAll: async (params?: {
    is_active?: boolean
  }): Promise<Location[]> => {
    const response = await apiClient.get<Location[]>('/locations', { params })
    return response.data
  },

  getById: async (id: string): Promise<Location> => {
    const response = await apiClient.get<Location>(`/locations/${id}`)
    return response.data
  },

  create: async (data: CreateLocationDto): Promise<Location> => {
    const response = await apiClient.post<Location>('/locations', data)
    return response.data
  },

  update: async (id: string, data: Partial<CreateLocationDto>): Promise<Location> => {
    const response = await apiClient.patch<Location>(`/locations/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/locations/${id}`)
  },

  getMachines: async (id: string) => {
    const response = await apiClient.get(`/locations/${id}/machines`)
    return response.data
  },

  getStats: async (id: string) => {
    const response = await apiClient.get(`/locations/${id}/stats`)
    return response.data
  },

  getMapData: async (): Promise<MapLocationData[]> => {
    const response = await apiClient.get<MapLocationData[]>('/locations/map')
    return response.data
  },
}
