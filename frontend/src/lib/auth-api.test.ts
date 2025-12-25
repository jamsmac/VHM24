import { describe, it, expect, beforeEach, vi } from 'vitest'
import { authApi } from './auth-api'
import apiClient from './axios'

// Mock axios
vi.mock('./axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockResponse = {
        data: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          expires_in: 900,
          user: {
            id: '123',
            email: 'test@example.com',
            full_name: 'Test User',
            role: 'admin',
          },
        },
      }

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await authApi.login({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(apiClient.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password123',
      })
      expect(result).toEqual(mockResponse.data)
      expect(result.access_token).toBe('test-access-token')
      expect(result.user.email).toBe('test@example.com')
    })

    it('should handle invalid credentials error', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            message: 'Invalid credentials',
          },
        },
      }

      vi.mocked(apiClient.post).mockRejectedValue(mockError)

      await expect(
        authApi.login({
          email: 'wrong@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toEqual(mockError)
    })

    it('should handle network error', async () => {
      const mockError = new Error('Network Error')
      vi.mocked(apiClient.post).mockRejectedValue(mockError)

      await expect(
        authApi.login({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Network Error')
    })

    it('should handle server error (500)', async () => {
      const mockError = {
        response: {
          status: 500,
          data: {
            message: 'Internal server error',
          },
        },
      }

      vi.mocked(apiClient.post).mockRejectedValue(mockError)

      await expect(
        authApi.login({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toEqual(mockError)
    })
  })

  describe('verify2FA', () => {
    it('should successfully verify 2FA TOTP code', async () => {
      const mockResponse = {
        data: {
          access_token: 'full-access-token',
          refresh_token: 'refresh-token',
          expires_in: 900,
          user: {
            id: '123',
            email: 'test@example.com',
            full_name: 'Test User',
            role: 'admin',
            two_factor_enabled: true,
          },
        },
      }

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await authApi.verify2FA({
        temp_token: 'temp-jwt-token',
        token: '123456',
      })

      expect(apiClient.post).toHaveBeenCalledWith(
        '/auth/2fa/login',
        { token: '123456' },
        { headers: { Authorization: 'Bearer temp-jwt-token' } }
      )
      expect(result).toEqual(mockResponse.data)
      expect(result.access_token).toBe('full-access-token')
    })

    it('should handle invalid 2FA code error', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            message: 'Invalid 2FA code',
          },
        },
      }

      vi.mocked(apiClient.post).mockRejectedValue(mockError)

      await expect(
        authApi.verify2FA({
          temp_token: 'temp-jwt-token',
          token: '000000',
        })
      ).rejects.toEqual(mockError)
    })
  })

  describe('verify2FABackup', () => {
    it('should successfully verify 2FA backup code', async () => {
      const mockResponse = {
        data: {
          access_token: 'full-access-token',
          refresh_token: 'refresh-token',
          expires_in: 900,
          user: {
            id: '123',
            email: 'test@example.com',
            full_name: 'Test User',
            role: 'admin',
            two_factor_enabled: true,
          },
        },
      }

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await authApi.verify2FABackup({
        temp_token: 'temp-jwt-token',
        backup_code: 'ABCD-1234-EFGH',
      })

      expect(apiClient.post).toHaveBeenCalledWith(
        '/auth/2fa/login/backup',
        { code: 'ABCD-1234-EFGH' },
        { headers: { Authorization: 'Bearer temp-jwt-token' } }
      )
      expect(result).toEqual(mockResponse.data)
      expect(result.access_token).toBe('full-access-token')
    })

    it('should handle invalid backup code error', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            message: 'Invalid backup code',
          },
        },
      }

      vi.mocked(apiClient.post).mockRejectedValue(mockError)

      await expect(
        authApi.verify2FABackup({
          temp_token: 'temp-jwt-token',
          backup_code: 'INVALID-CODE',
        })
      ).rejects.toEqual(mockError)
    })

    it('should handle expired temp token', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            message: 'Temporary token expired',
          },
        },
      }

      vi.mocked(apiClient.post).mockRejectedValue(mockError)

      await expect(
        authApi.verify2FABackup({
          temp_token: 'expired-temp-token',
          backup_code: 'ABCD-1234-EFGH',
        })
      ).rejects.toEqual(mockError)
    })
  })

  describe('logout', () => {
    it('should successfully logout', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({ data: { success: true } })

      await authApi.logout()

      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout')
      // logout returns void, no return value to check
    })

    it('should handle logout error gracefully', async () => {
      const mockError = new Error('Logout failed')
      vi.mocked(apiClient.post).mockRejectedValue(mockError)

      await expect(authApi.logout()).rejects.toThrow('Logout failed')
    })
  })

  describe('getProfile', () => {
    it('should successfully get user profile', async () => {
      const mockResponse = {
        data: {
          id: '123',
          email: 'test@example.com',
          full_name: 'Test User',
          role: 'admin',
          status: 'active',
          avatar_url: 'https://example.com/avatar.jpg',
          phone: '+1234567890',
        },
      }

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const result = await authApi.getProfile()

      expect(apiClient.get).toHaveBeenCalledWith('/auth/profile')
      expect(result).toEqual(mockResponse.data)
      expect(result.email).toBe('test@example.com')
    })

    it('should handle unauthorized error', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            message: 'Unauthorized',
          },
        },
      }

      vi.mocked(apiClient.get).mockRejectedValue(mockError)

      await expect(authApi.getProfile()).rejects.toEqual(mockError)
    })

    it('should handle network error', async () => {
      const mockError = new Error('Network Error')
      vi.mocked(apiClient.get).mockRejectedValue(mockError)

      await expect(authApi.getProfile()).rejects.toThrow('Network Error')
    })
  })

  describe('refreshToken', () => {
    it('should successfully refresh token', async () => {
      const mockResponse = {
        data: {
          access_token: 'new-access-token',
          expires_in: 900,
        },
      }

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await authApi.refreshToken('old-refresh-token')

      expect(apiClient.post).toHaveBeenCalledWith('/auth/refresh', {
        refresh_token: 'old-refresh-token',
      })
      expect(result).toEqual(mockResponse.data)
      expect(result.access_token).toBe('new-access-token')
    })

    it('should handle expired refresh token', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            message: 'Refresh token expired',
          },
        },
      }

      vi.mocked(apiClient.post).mockRejectedValue(mockError)

      await expect(authApi.refreshToken('expired-token')).rejects.toEqual(mockError)
    })
  })

  describe('getCurrentUser', () => {
    it('should successfully get current user', async () => {
      const mockResponse = {
        data: {
          id: '123',
          email: 'test@example.com',
          full_name: 'Test User',
          role: 'admin',
        },
      }

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse)

      const result = await authApi.getCurrentUser()

      expect(apiClient.get).toHaveBeenCalledWith('/auth/me')
      expect(result).toEqual(mockResponse.data)
    })

    it('should handle unauthorized error', async () => {
      const mockError = {
        response: {
          status: 401,
          data: {
            message: 'Unauthorized',
          },
        },
      }

      vi.mocked(apiClient.get).mockRejectedValue(mockError)

      await expect(authApi.getCurrentUser()).rejects.toEqual(mockError)
    })
  })
})
