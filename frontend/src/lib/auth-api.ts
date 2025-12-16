import apiClient from './axios'

interface LoginRequest {
  email?: string
  username?: string
  password: string
}

interface LoginResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  user: {
    id: string
    email: string
    full_name: string
    role: string
    status?: string
    two_factor_enabled?: boolean
  }
  // 2FA fields - returned when 2FA is required
  requires_2fa?: boolean
  temp_token?: string
}

interface Login2FARequest {
  temp_token: string
  token: string // TOTP code
}

interface Login2FABackupRequest {
  temp_token: string
  backup_code: string
}

interface RefreshTokenResponse {
  access_token: string
  expires_in?: number
}

interface User {
  id: string
  email: string
  full_name: string
  role: string
  status?: string
}

export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials)
    return response.data
  },

  /**
   * Complete login with 2FA TOTP code
   * Uses the temporary JWT token from initial login as Bearer auth
   */
  verify2FA: async (data: Login2FARequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/2fa/login', {
      token: data.token,
    }, {
      headers: {
        'Authorization': `Bearer ${data.temp_token}`,
      },
    })
    return response.data
  },

  /**
   * Complete login with 2FA backup code
   * Uses the temporary JWT token from initial login as Bearer auth
   */
  verify2FABackup: async (data: Login2FABackupRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/2fa/login/backup', {
      code: data.backup_code,
    }, {
      headers: {
        'Authorization': `Bearer ${data.temp_token}`,
      },
    })
    return response.data
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout')
  },

  getProfile: async () => {
    const response = await apiClient.get('/auth/profile')
    return response.data
  },

  refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    })
    return response.data
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me')
    return response.data
  },
}
