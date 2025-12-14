import { describe, it, expect, beforeEach, vi } from 'vitest'
import axios from 'axios'
import { authStorage } from './auth-storage'

// Mock auth storage
vi.mock('./auth-storage', () => ({
  authStorage: {
    ensureValidToken: vi.fn(),
    refreshAccessToken: vi.fn(),
    clearStorage: vi.fn(),
    getAccessToken: vi.fn(),
  },
}))

describe('Axios Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('Request Interceptor', () => {
    it('should add authorization header with valid token', async () => {
      const mockToken = 'valid-access-token'
      vi.mocked(authStorage.ensureValidToken).mockResolvedValue(mockToken)

      // Import after mocking to get configured instance
      const { default: apiClient } = await import('./axios')

      const config: any = { headers: {} }
      const interceptor = (apiClient.interceptors.request as any).handlers[0]

      const result = await interceptor.fulfilled(config)

      expect(authStorage.ensureValidToken).toHaveBeenCalled()
      expect(result.headers.Authorization).toBe(`Bearer ${mockToken}`)
    })

    it('should handle request without token by redirecting to login', async () => {
      vi.mocked(authStorage.ensureValidToken).mockResolvedValue(null)

      // Mock window.location
      const mockLocation = { href: '' }
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      })

      const { default: apiClient } = await import('./axios')

      const config: any = { headers: {}, url: '/api/test' }
      const interceptor = (apiClient.interceptors.request as any).handlers[0]

      // Should reject and redirect to login when no token
      await expect(interceptor.fulfilled(config)).rejects.toThrow('No valid authentication token')
      expect(mockLocation.href).toBe('/login')
    })

    it('should handle token refresh error by rejecting', async () => {
      vi.mocked(authStorage.ensureValidToken).mockRejectedValue(new Error('Refresh failed'))

      const { default: apiClient } = await import('./axios')

      const config: any = { headers: {}, url: '/api/test' }
      const interceptor = (apiClient.interceptors.request as any).handlers[0]

      // Should reject with the refresh error
      await expect(interceptor.fulfilled(config)).rejects.toThrow('Refresh failed')
    })
  })

  describe('Response Interceptor - Success', () => {
    it('should return successful response unchanged', async () => {
      const mockResponse = {
        data: { message: 'Success' },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      }

      const { default: apiClient } = await import('./axios')
      const interceptor = (apiClient.interceptors.response as any).handlers[0]

      const result = interceptor.fulfilled(mockResponse)

      expect(result).toEqual(mockResponse)
    })
  })

  describe('Response Interceptor - 401 Error Handling', () => {
    it('should attempt token refresh on 401 error', async () => {
      const mockError: {
        response: { status: number; data: { message: string } }
        config: { url: string; headers: Record<string, string>; _retry?: boolean }
      } = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
        config: {
          url: '/api/test',
          headers: {},
        },
      }

      // Mock refresh to fail so we can test the refresh was attempted
      vi.mocked(authStorage.refreshAccessToken).mockResolvedValue(false)

      // Mock window.location for the redirect
      const mockLocation = { href: '' }
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      })

      const { default: apiClient } = await import('./axios')
      const interceptor = (apiClient.interceptors.response as any).handlers[0]

      // Should reject after failed refresh
      await expect(interceptor.rejected(mockError)).rejects.toEqual(mockError)

      // Verify refresh was attempted
      expect(authStorage.refreshAccessToken).toHaveBeenCalled()
      expect(mockError.config._retry).toBe(true)
      expect(authStorage.clearStorage).toHaveBeenCalled()
    })

    it('should not retry if already retried', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
        config: {
          url: '/api/test',
          headers: {},
          _retry: true, // Already retried
        },
      }

      const { default: apiClient } = await import('./axios')
      const interceptor = (apiClient.interceptors.response as any).handlers[0]

      await expect(interceptor.rejected(mockError)).rejects.toEqual(mockError)
      expect(authStorage.refreshAccessToken).not.toHaveBeenCalled()
    })

    it('should redirect to login if refresh fails', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
        config: {
          url: '/api/test',
          headers: {},
        },
      }

      vi.mocked(authStorage.refreshAccessToken).mockResolvedValue(false)

      // Mock window.location
      const mockLocation = { href: '' }
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      })

      const { default: apiClient } = await import('./axios')
      const interceptor = (apiClient.interceptors.response as any).handlers[0]

      await expect(interceptor.rejected(mockError)).rejects.toEqual(mockError)

      expect(authStorage.clearStorage).toHaveBeenCalled()
      expect(mockLocation.href).toBe('/login')
    })

    it('should handle refresh error and redirect', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
        config: {
          url: '/api/test',
          headers: {},
        },
      }

      vi.mocked(authStorage.refreshAccessToken).mockRejectedValue(new Error('Refresh failed'))

      // Mock window.location
      const mockLocation = { href: '' }
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      })

      const { default: apiClient } = await import('./axios')
      const interceptor = (apiClient.interceptors.response as any).handlers[0]

      await expect(interceptor.rejected(mockError)).rejects.toEqual(mockError)

      expect(authStorage.clearStorage).toHaveBeenCalled()
    })
  })

  describe('Response Interceptor - Other Errors', () => {
    it('should pass through non-401 errors', async () => {
      const mockError = {
        response: {
          status: 500,
          data: { message: 'Server Error' },
        },
        config: {
          url: '/api/test',
        },
      }

      const { default: apiClient } = await import('./axios')
      const interceptor = (apiClient.interceptors.response as any).handlers[0]

      await expect(interceptor.rejected(mockError)).rejects.toEqual(mockError)
      expect(authStorage.refreshAccessToken).not.toHaveBeenCalled()
    })

    it('should handle network errors', async () => {
      const mockError = {
        message: 'Network Error',
        config: {},
      }

      const { default: apiClient } = await import('./axios')
      const interceptor = (apiClient.interceptors.response as any).handlers[0]

      await expect(interceptor.rejected(mockError)).rejects.toEqual(mockError)
    })

    it('should handle errors without config', async () => {
      const mockError = {
        response: {
          status: 401,
        },
        // No config
      }

      const { default: apiClient } = await import('./axios')
      const interceptor = (apiClient.interceptors.response as any).handlers[0]

      await expect(interceptor.rejected(mockError)).rejects.toEqual(mockError)
    })
  })
})
