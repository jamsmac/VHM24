import apiClient from './axios'

// Session Types
export interface Session {
  id: string
  user_id: string
  device: string
  device_type: 'desktop' | 'mobile' | 'tablet'
  ip_address: string
  location?: string
  user_agent: string
  is_current: boolean
  last_activity: string
  created_at: string
}

// API Key Types
export interface ApiKey {
  id: string
  name: string
  key: string
  is_active: boolean
  last_used?: string
  created_at: string
  expires_at?: string
}

export interface CreateApiKeyDto {
  name: string
  expires_in_days?: number
}

// Backup Types
export interface Backup {
  id: string
  name: string
  size: number
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  type: 'automatic' | 'manual'
  created_at: string
  completed_at?: string
  error_message?: string
}

export const securityApi = {
  // Sessions
  getSessions: async (): Promise<Session[]> => {
    const response = await apiClient.get<Session[]>('/security/sessions')
    return response.data
  },

  revokeSession: async (sessionId: string): Promise<void> => {
    await apiClient.delete(`/security/sessions/${sessionId}`)
  },

  revokeAllSessions: async (): Promise<void> => {
    await apiClient.delete('/security/sessions/all')
  },

  // API Keys
  getApiKeys: async (): Promise<ApiKey[]> => {
    const response = await apiClient.get<ApiKey[]>('/security/api-keys')
    return response.data
  },

  createApiKey: async (data: CreateApiKeyDto): Promise<ApiKey> => {
    const response = await apiClient.post<ApiKey>('/security/api-keys', data)
    return response.data
  },

  revokeApiKey: async (keyId: string): Promise<void> => {
    await apiClient.delete(`/security/api-keys/${keyId}`)
  },

  // Access Control
  getRoles: async () => {
    const response = await apiClient.get('/security/roles')
    return response.data
  },

  getPermissions: async () => {
    const response = await apiClient.get('/security/permissions')
    return response.data
  },

  updateRolePermissions: async (roleId: string, permissions: string[]) => {
    const response = await apiClient.put(`/security/roles/${roleId}/permissions`, {
      permissions,
    })
    return response.data
  },

  // Backups
  getBackups: async (): Promise<Backup[]> => {
    const response = await apiClient.get<Backup[]>('/security/backups')
    return response.data
  },

  createBackup: async (name: string): Promise<Backup> => {
    const response = await apiClient.post<Backup>('/security/backups', { name })
    return response.data
  },

  downloadBackup: async (backupId: string): Promise<Blob> => {
    const response = await apiClient.get(`/security/backups/${backupId}/download`, {
      responseType: 'blob',
    })
    return response.data
  },

  restoreBackup: async (backupId: string): Promise<void> => {
    await apiClient.post(`/security/backups/${backupId}/restore`)
  },

  deleteBackup: async (backupId: string): Promise<void> => {
    await apiClient.delete(`/security/backups/${backupId}`)
  },
}
