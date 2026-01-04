import apiClient from './axios'

// User profile types
export interface UserProfile {
  id: string
  email: string
  phone: string | null
  first_name: string
  last_name: string
  middle_name: string | null
  full_name: string
  role: string
  status: string
  is_2fa_enabled: boolean
  telegram_id: string | null
  telegram_username: string | null
  created_at: string
  updated_at: string
  last_login_at: string | null
}

export interface Session {
  id: string
  user_id: string
  ip_address: string
  user_agent: string | null
  device_type: string | null
  browser: string | null
  os: string | null
  is_current: boolean
  created_at: string
  expires_at: string
  last_activity_at: string | null
}

export interface TwoFactorSetup {
  secret: string
  qrCode: string
  manualEntryKey: string
}

export interface ChangePasswordDto {
  currentPassword: string
  newPassword: string
}

export interface UpdateProfileDto {
  first_name?: string
  last_name?: string
  middle_name?: string
  phone?: string
}

export const profileApi = {
  /**
   * Get current user profile
   */
  getProfile: async (): Promise<UserProfile> => {
    const response = await apiClient.get<UserProfile>('/auth/profile')
    return response.data
  },

  /**
   * Change password (first login)
   */
  changePassword: async (data: ChangePasswordDto): Promise<void> => {
    await apiClient.post('/auth/first-login-change-password', data)
  },

  // ============================================================================
  // TWO-FACTOR AUTHENTICATION
  // ============================================================================

  /**
   * Setup 2FA - generates QR code and secret
   */
  setup2FA: async (): Promise<TwoFactorSetup> => {
    const response = await apiClient.post<TwoFactorSetup>('/auth/2fa/setup')
    return response.data
  },

  /**
   * Enable 2FA with verification code
   */
  enable2FA: async (secret: string, token: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>('/auth/2fa/enable', {
      secret,
      token,
    })
    return response.data
  },

  /**
   * Disable 2FA
   */
  disable2FA: async (token: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>('/auth/2fa/disable', {
      token,
    })
    return response.data
  },

  /**
   * Verify 2FA code
   */
  verify2FA: async (token: string): Promise<{ valid: boolean; message: string }> => {
    const response = await apiClient.post<{ valid: boolean; message: string }>('/auth/2fa/verify', {
      token,
    })
    return response.data
  },

  // ============================================================================
  // SESSION MANAGEMENT
  // ============================================================================

  /**
   * Get active sessions
   */
  getActiveSessions: async (): Promise<Session[]> => {
    const response = await apiClient.get<Session[]>('/auth/sessions')
    return response.data
  },

  /**
   * Get all sessions (including expired)
   */
  getAllSessions: async (): Promise<Session[]> => {
    const response = await apiClient.get<Session[]>('/auth/sessions/all')
    return response.data
  },

  /**
   * Revoke specific session
   */
  revokeSession: async (sessionId: string): Promise<void> => {
    await apiClient.post(`/auth/sessions/${sessionId}/revoke`)
  },

  /**
   * Revoke all other sessions
   */
  revokeOtherSessions: async (currentRefreshToken: string): Promise<{ revoked: number }> => {
    const response = await apiClient.post<{ revoked: number }>('/auth/sessions/revoke-others', {
      currentRefreshToken,
    })
    return response.data
  },

  // ============================================================================
  // PASSWORD RESET
  // ============================================================================

  /**
   * Request password reset
   */
  requestPasswordReset: async (email: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      '/auth/password-reset/request',
      { email }
    )
    return response.data
  },

  /**
   * Validate reset token
   */
  validateResetToken: async (token: string): Promise<{ valid: boolean; message?: string }> => {
    const response = await apiClient.post<{ valid: boolean; message?: string }>(
      '/auth/password-reset/validate',
      { token }
    )
    return response.data
  },

  /**
   * Reset password with token
   */
  resetPassword: async (
    token: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      '/auth/password-reset/confirm',
      { token, newPassword }
    )
    return response.data
  },
}

// Helper functions
export function getDeviceIcon(deviceType: string | null): string {
  if (!deviceType) return '💻'
  const type = deviceType.toLowerCase()
  if (type.includes('mobile') || type.includes('phone')) return '📱'
  if (type.includes('tablet')) return '📱'
  if (type.includes('desktop')) return '🖥️'
  return '💻'
}

export function formatUserAgent(userAgent: string | null): string {
  if (!userAgent) return 'Неизвестно'

  // Simple browser detection
  if (userAgent.includes('Chrome')) {
    if (userAgent.includes('Edg')) return 'Microsoft Edge'
    if (userAgent.includes('OPR')) return 'Opera'
    return 'Google Chrome'
  }
  if (userAgent.includes('Firefox')) return 'Mozilla Firefox'
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari'
  if (userAgent.includes('MSIE') || userAgent.includes('Trident')) return 'Internet Explorer'

  return 'Браузер'
}

export function getRoleLabel(role: string): string {
  const roles: Record<string, string> = {
    owner: 'Владелец',
    admin: 'Администратор',
    manager: 'Менеджер',
    operator: 'Оператор',
    collector: 'Инкассатор',
    technician: 'Техник',
    viewer: 'Наблюдатель',
  }
  return roles[role.toLowerCase()] || role
}

export function getStatusLabel(status: string): string {
  const statuses: Record<string, string> = {
    active: 'Активен',
    pending: 'Ожидает подтверждения',
    blocked: 'Заблокирован',
    inactive: 'Неактивен',
  }
  return statuses[status.toLowerCase()] || status
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'text-green-600 bg-green-50',
    pending: 'text-yellow-600 bg-yellow-50',
    blocked: 'text-red-600 bg-red-50',
    inactive: 'text-gray-600 bg-gray-50',
  }
  return colors[status.toLowerCase()] || 'text-gray-600 bg-gray-50'
}
