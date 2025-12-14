import { describe, it, expect, beforeEach, vi } from 'vitest'
import { authStorage } from './auth-storage'

// Mock auth storage
vi.mock('./auth-storage', () => ({
  authStorage: {
    clearStorage: vi.fn(),
  },
}))

/**
 * Axios Client Tests - Phase 2 (httpOnly Cookies)
 *
 * In Phase 2, tokens are stored in httpOnly cookies.
 * - Request interceptor no longer injects Authorization header
 * - Browser sends cookies automatically (withCredentials: true)
 * - 401 handling calls /auth/refresh endpoint directly
 */
describe('Axios Client - Phase 2', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('Client Configuration', () => {
    it('should have withCredentials set to true', async () => {
      const { apiClient } = await import('./axios')

      expect(apiClient.defaults.withCredentials).toBe(true)
    })

    it('should have correct Content-Type header', async () => {
      const { apiClient } = await import('./axios')

      expect(apiClient.defaults.headers['Content-Type']).toBe('application/json')
    })

    it('should have timeout configured', async () => {
      const { apiClient } = await import('./axios')

      expect(apiClient.defaults.timeout).toBe(30000)
    })
  })

  describe('Request Interceptor', () => {
    it('should not add Authorization header for protected endpoints', async () => {
      const { apiClient } = await import('./axios')

      const config: any = {
        url: '/api/users',
        headers: {},
      }
      const interceptor = (apiClient.interceptors.request as any).handlers[0]

      const result = await interceptor.fulfilled(config)

      // In Phase 2, no Authorization header is added - cookies handle auth
      expect(result.headers.Authorization).toBeUndefined()
    })

    it('should pass through config for public endpoints', async () => {
      const { apiClient } = await import('./axios')

      const config: any = {
        url: '/auth/login',
        headers: {},
      }
      const interceptor = (apiClient.interceptors.request as any).handlers[0]

      const result = await interceptor.fulfilled(config)

      expect(result.url).toBe('/auth/login')
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

      const { apiClient } = await import('./axios')
      const interceptor = (apiClient.interceptors.response as any).handlers[0]

      const result = interceptor.fulfilled(mockResponse)

      expect(result).toEqual(mockResponse)
    })
  })

  describe('Response Interceptor - 401 Error Handling', () => {
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

      const { apiClient } = await import('./axios')
      const interceptor = (apiClient.interceptors.response as any).handlers[0]

      await expect(interceptor.rejected(mockError)).rejects.toEqual(mockError)
    })

    it('should not retry for auth endpoints', async () => {
      const mockError = {
        response: {
          status: 401,
          data: { message: 'Invalid credentials' },
        },
        config: {
          url: '/auth/login',
          headers: {},
        },
      }

      const { apiClient } = await import('./axios')
      const interceptor = (apiClient.interceptors.response as any).handlers[0]

      await expect(interceptor.rejected(mockError)).rejects.toEqual(mockError)
    })

    it('should clear storage and redirect on auth failure', async () => {
      // Mock window.location
      const mockLocation = { href: '' }
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      })

      const mockError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
        config: {
          url: '/api/test',
          headers: {},
          _retry: true, // Already retried, so will clear and redirect
        },
      }

      const { apiClient } = await import('./axios')
      const interceptor = (apiClient.interceptors.response as any).handlers[0]

      try {
        await interceptor.rejected(mockError)
      } catch {
        // Expected to reject
      }

      // After failed retry, should clear storage
      expect(authStorage.clearStorage).toHaveBeenCalled()
      expect(mockLocation.href).toBe('/login')
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

      const { apiClient } = await import('./axios')
      const interceptor = (apiClient.interceptors.response as any).handlers[0]

      await expect(interceptor.rejected(mockError)).rejects.toEqual(mockError)
    })

    it('should handle network errors', async () => {
      const mockError = {
        message: 'Network Error',
        config: {},
      }

      const { apiClient } = await import('./axios')
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

      const { apiClient } = await import('./axios')
      const interceptor = (apiClient.interceptors.response as any).handlers[0]

      await expect(interceptor.rejected(mockError)).rejects.toEqual(mockError)
    })
  })
})
