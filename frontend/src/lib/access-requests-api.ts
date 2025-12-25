import apiClient from './axios'

// Access Request Types
export interface AccessRequest {
  id: string
  telegram_user_id: string
  telegram_username: string | null
  first_name: string | null
  last_name: string | null
  status: 'new' | 'approved' | 'rejected'
  requested_role: string | null
  note: string | null
  rejection_reason: string | null
  processed_by: string | null
  created_user_id: string | null
  created_at: string
  processed_at: string | null
  metadata: Record<string, unknown> | null
}

export interface ApproveAccessRequestDto {
  role: string
  permissions?: string[]
  note?: string
}

export interface RejectAccessRequestDto {
  reason: string
}

export interface QueryAccessRequestDto {
  status?: 'new' | 'approved' | 'rejected'
  telegram_user_id?: string
  from_date?: string
  to_date?: string
}

export const accessRequestsApi = {
  // Get all access requests with optional filters
  getAll: async (query?: QueryAccessRequestDto): Promise<AccessRequest[]> => {
    const params = new URLSearchParams()
    if (query?.status) {params.append('status', query.status)}
    if (query?.telegram_user_id) {params.append('telegram_user_id', query.telegram_user_id)}
    if (query?.from_date) {params.append('from_date', query.from_date)}
    if (query?.to_date) {params.append('to_date', query.to_date)}

    const queryString = params.toString()
    const url = queryString ? `/access-requests?${queryString}` : '/access-requests'

    const response = await apiClient.get<AccessRequest[]>(url)
    return response.data
  },

  // Get single access request
  getOne: async (id: string): Promise<AccessRequest> => {
    const response = await apiClient.get<AccessRequest>(`/access-requests/${id}`)
    return response.data
  },

  // Approve access request
  approve: async (id: string, data: ApproveAccessRequestDto): Promise<AccessRequest> => {
    const response = await apiClient.patch<AccessRequest>(
      `/access-requests/${id}/approve`,
      data
    )
    return response.data
  },

  // Reject access request
  reject: async (id: string, data: RejectAccessRequestDto): Promise<AccessRequest> => {
    const response = await apiClient.patch<AccessRequest>(
      `/access-requests/${id}/reject`,
      data
    )
    return response.data
  },

  // Delete access request (Owner only)
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/access-requests/${id}`)
  },
}
