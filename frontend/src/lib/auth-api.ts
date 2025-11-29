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
  }
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
