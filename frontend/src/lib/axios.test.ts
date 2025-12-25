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

      const config = {
        url: '/api/users',
        headers: {} as Record<string, string>,
      }
      type ConfigType = typeof config
      const interceptor = (apiClient.interceptors.request as unknown as { handlers: Array<{ fulfilled: (config: ConfigType) => Promise<ConfigType> }> }).handlers[0]

      const result = await interceptor.fulfilled(config)

      // In Phase 2, no Authorization header is added - cookies handle auth
      expect(result.headers.Authorization).toBeUndefined()
    })

    it('should pass through config for public endpoints', async () => {
      const { apiClient } = await import('./axios')

      const config = {
        url: '/auth/login',
        headers: {} as Record<string, string>,
      }
      type ConfigType = typeof config
      const interceptor = (apiClient.interceptors.request as unknown as { handlers: Array<{ fulfilled: (config: ConfigType) => Promise<ConfigType> }> }).handlers[0]

      const result = await interceptor.fulfilled(config)

      expect(result.url).toBe('/auth/login')
    })

    it('should reject errors in request interceptor', async () => {
      const { apiClient } = await import('./axios')

      const mockError = new Error('Request interceptor error')

      type InterceptorHandler = {
        fulfilled: (config: unknown) => Promise<unknown>
        rejected: (error: unknown) => Promise<never>
      }
      const interceptor = (apiClient.interceptors.request as unknown as { handlers: Array<InterceptorHandler> }).handlers[0]

      await expect(interceptor.rejected(mockError)).rejects.toThrow('Request interceptor error')
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
      const interceptor = (apiClient.interceptors.response as unknown as { handlers: Array<{ fulfilled: (response: typeof mockResponse) => typeof mockResponse; rejected: (error: unknown) => Promise<never> }> }).handlers[0]

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
      const interceptor = (apiClient.interceptors.response as unknown as { handlers: Array<{ fulfilled: (response: unknown) => unknown; rejected: (error: unknown) => Promise<never> }> }).handlers[0]

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
      const interceptor = (apiClient.interceptors.response as unknown as { handlers: Array<{ fulfilled: (response: unknown) => unknown; rejected: (error: unknown) => Promise<never> }> }).handlers[0]

      await expect(interceptor.rejected(mockError)).rejects.toEqual(mockError)
    })

    it('should retry original request after successful token refresh', async () => {
      vi.resetModules()

      const mockRetryResponse = {
        status: 200,
        data: { message: 'Retry successful' },
      }

      // Mock axios.create to return a controllable instance
      const mockAxiosInstance = {
        defaults: {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
          timeout: 30000,
        },
        interceptors: {
          request: { use: vi.fn(), handlers: [] as unknown[] },
          response: { use: vi.fn(), handlers: [] as unknown[] },
        },
        post: vi.fn(),
        get: vi.fn(),
        request: vi.fn(),
      }

      // Capture the interceptor callbacks
      type InterceptorCallback = (...args: unknown[]) => unknown
      let _requestInterceptor: { fulfilled: InterceptorCallback; rejected: InterceptorCallback }
      let responseInterceptor: { fulfilled: InterceptorCallback; rejected: InterceptorCallback }

      mockAxiosInstance.interceptors.request.use = vi.fn((fulfilled, rejected) => {
        _requestInterceptor = { fulfilled, rejected }
        mockAxiosInstance.interceptors.request.handlers.push({ fulfilled, rejected })
      })

      mockAxiosInstance.interceptors.response.use = vi.fn((fulfilled, rejected) => {
        responseInterceptor = { fulfilled, rejected }
        mockAxiosInstance.interceptors.response.handlers.push({ fulfilled, rejected })
      })

      // Make the instance callable (axios instances are callable)
      const callableInstance = Object.assign(
        vi.fn().mockResolvedValue(mockRetryResponse),
        mockAxiosInstance
      )

      // Mock axios.create
      vi.doMock('axios', () => ({
        default: {
          create: vi.fn(() => callableInstance),
        },
        AxiosError: Error,
      }))

      // Now import our module which will use the mocked axios
      const { apiClient: _apiClient } = await import('./axios')

      // Set up the post mock for refresh
      callableInstance.post.mockResolvedValueOnce({ status: 200, data: {} })

      const mockError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
        config: {
          url: '/api/protected-resource',
          headers: {},
          method: 'GET',
        },
      }

      // Call the response interceptor's error handler
      const result = await responseInterceptor!.rejected(mockError)

      // Verify refresh was called
      expect(callableInstance.post).toHaveBeenCalledWith('/auth/refresh', {})

      // Verify the retry was called (the callable instance)
      expect(callableInstance).toHaveBeenCalled()

      // Result should be the retry response
      expect(result).toEqual(mockRetryResponse)

      vi.doUnmock('axios')
    })

    it('should clear storage and redirect when refresh returns non-200 status', async () => {
      vi.resetModules()

      // Mock window.location
      const mockLocation = { href: '' }
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      })

      // Mock axios.create to return a controllable instance
      const mockAxiosInstance = {
        defaults: {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
          timeout: 30000,
        },
        interceptors: {
          request: { use: vi.fn(), handlers: [] as unknown[] },
          response: { use: vi.fn(), handlers: [] as unknown[] },
        },
        post: vi.fn(),
        get: vi.fn(),
        request: vi.fn(),
      }

      // Capture the interceptor callbacks
      type InterceptorFn = (...args: unknown[]) => unknown
      let responseInterceptor: { fulfilled: InterceptorFn; rejected: InterceptorFn }

      mockAxiosInstance.interceptors.request.use = vi.fn((fulfilled, rejected) => {
        mockAxiosInstance.interceptors.request.handlers.push({ fulfilled, rejected })
      })

      mockAxiosInstance.interceptors.response.use = vi.fn((fulfilled, rejected) => {
        responseInterceptor = { fulfilled, rejected }
        mockAxiosInstance.interceptors.response.handlers.push({ fulfilled, rejected })
      })

      // Make the instance callable
      const callableInstance = Object.assign(
        vi.fn(),
        mockAxiosInstance
      )

      // Mock axios.create
      vi.doMock('axios', () => ({
        default: {
          create: vi.fn(() => callableInstance),
        },
        AxiosError: Error,
      }))

      // Now import our module which will use the mocked axios
      await import('./axios')

      // Set up the post mock for refresh to return 204 (not 200)
      callableInstance.post.mockResolvedValueOnce({ status: 204, data: {} })

      const mockError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
        config: {
          url: '/api/protected-resource',
          headers: {},
          method: 'GET',
        },
      }

      // Call the response interceptor's error handler
      try {
        await responseInterceptor!.rejected(mockError)
      } catch {
        // Expected to reject
      }

      // Verify refresh was called
      expect(callableInstance.post).toHaveBeenCalledWith('/auth/refresh', {})

      // Should clear storage and redirect since status was not 200
      expect(authStorage.clearStorage).toHaveBeenCalled()
      expect(mockLocation.href).toBe('/login')

      vi.doUnmock('axios')
    })

    it('should clear storage and redirect on auth failure', async () => {
      // Mock window.location
      const mockLocation = { href: '' }
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      })

      const { apiClient } = await import('./axios')

      // Mock the refresh endpoint to fail
      const postSpy = vi.spyOn(apiClient, 'post').mockRejectedValueOnce(new Error('Refresh failed'))

      const mockError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
        config: {
          url: '/api/test',
          headers: {},
          // No _retry - this is a fresh 401, interceptor will try to refresh
        },
      }

      const interceptor = (apiClient.interceptors.response as unknown as { handlers: Array<{ fulfilled: (response: unknown) => unknown; rejected: (error: unknown) => Promise<never> }> }).handlers[0]

      try {
        await interceptor.rejected(mockError)
      } catch {
        // Expected to reject
      }

      // After failed refresh, should clear storage and redirect
      expect(authStorage.clearStorage).toHaveBeenCalled()
      expect(mockLocation.href).toBe('/login')

      postSpy.mockRestore()
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
      const interceptor = (apiClient.interceptors.response as unknown as { handlers: Array<{ fulfilled: (response: unknown) => unknown; rejected: (error: unknown) => Promise<never> }> }).handlers[0]

      await expect(interceptor.rejected(mockError)).rejects.toEqual(mockError)
    })

    it('should handle network errors', async () => {
      const mockError = {
        message: 'Network Error',
        config: {},
      }

      const { apiClient } = await import('./axios')
      const interceptor = (apiClient.interceptors.response as unknown as { handlers: Array<{ fulfilled: (response: unknown) => unknown; rejected: (error: unknown) => Promise<never> }> }).handlers[0]

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
      const interceptor = (apiClient.interceptors.response as unknown as { handlers: Array<{ fulfilled: (response: unknown) => unknown; rejected: (error: unknown) => Promise<never> }> }).handlers[0]

      await expect(interceptor.rejected(mockError)).rejects.toEqual(mockError)
    })
  })
})
