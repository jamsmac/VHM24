import apiClient from './axios'

export type ComplaintStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export interface Complaint {
  id: string
  number: string
  customer_name: string
  phone: string
  email?: string
  machine_id: string
  machine?: {
    id: string
    machine_number: string
    location?: {
      name: string
    }
  }
  description: string
  status: ComplaintStatus
  priority?: 'low' | 'medium' | 'high'
  assigned_to?: {
    id: string
    full_name: string
  }
  resolution?: string
  resolved_at?: string
  created_at: string
  updated_at: string
}

export interface CreateComplaintDto {
  customer_name: string
  phone: string
  email?: string
  machine_id: string
  description: string
  priority?: 'low' | 'medium' | 'high'
}

export const complaintsApi = {
  getAll: async (params?: {
    status?: ComplaintStatus
    machine_id?: string
    date_from?: string
    date_to?: string
  }): Promise<Complaint[]> => {
    const response = await apiClient.get<Complaint[]>('/complaints', { params })
    return response.data
  },

  getById: async (id: string): Promise<Complaint> => {
    const response = await apiClient.get<Complaint>(`/complaints/${id}`)
    return response.data
  },

  create: async (data: CreateComplaintDto): Promise<Complaint> => {
    const response = await apiClient.post<Complaint>('/complaints', data)
    return response.data
  },

  assign: async (id: string, userId: string): Promise<Complaint> => {
    const response = await apiClient.patch<Complaint>(`/complaints/${id}/assign`, {
      user_id: userId,
    })
    return response.data
  },

  takeInProgress: async (id: string): Promise<Complaint> => {
    const response = await apiClient.patch<Complaint>(`/complaints/${id}/in-progress`)
    return response.data
  },

  resolve: async (id: string, resolution: string): Promise<Complaint> => {
    const response = await apiClient.patch<Complaint>(`/complaints/${id}/resolve`, {
      resolution,
    })
    return response.data
  },

  close: async (id: string): Promise<Complaint> => {
    const response = await apiClient.patch<Complaint>(`/complaints/${id}/close`)
    return response.data
  },

  addNote: async (id: string, note: string): Promise<void> => {
    await apiClient.post(`/complaints/${id}/notes`, { note })
  },

  getNotes: async (id: string) => {
    const response = await apiClient.get(`/complaints/${id}/notes`)
    return response.data
  },
}
