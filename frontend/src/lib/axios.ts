/**
 * Axios API Client with Automatic Token Refresh
 *
 * Features:
 * - Automatically injects access tokens into requests
 * - Proactively refreshes expired tokens before requests
 * - Handles 401 errors with retry logic
 * - Prevents race conditions during token refresh (centralized in authStorage)
 * - Redirects to login on auth failure
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { authStorage } from './auth-storage'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

/**
 * Request Interceptor
 * Proactively ensures valid token before each request
 */
apiClient.interceptors.request.use(
  async (config) => {
    // Skip token injection for public endpoints
    const publicEndpoints = ['/auth/login', '/auth/register', '/auth/refresh']
    const isPublicEndpoint = publicEndpoints.some((endpoint) =>
      config.url?.includes(endpoint)
    )

    if (!isPublicEndpoint && typeof window !== 'undefined') {
      // Use ensureValidToken which automatically refreshes if needed
      // This prevents race conditions and proactively refreshes expiring tokens
      const token = await authStorage.ensureValidToken()

      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      } else {
        // No valid token available, redirect to login
        window.location.href = '/login'
        return Promise.reject(new Error('No valid authentication token'))
      }
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

/**
 * Response Interceptor
 * Handles 401 errors and retries with refreshed token
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Try to refresh the token using centralized method
        // This has built-in race condition protection
        const refreshed = await authStorage.refreshAccessToken()

        if (refreshed) {
          // Retry original request with new token
          const newToken = authStorage.getAccessToken()
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`
            return apiClient(originalRequest)
          }
        }
      } catch (refreshError) {
        console.error('Token refresh failed during 401 retry:', refreshError)
      }

      // Refresh failed, clear storage and redirect to login
      authStorage.clearStorage()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }

      return Promise.reject(error)
    }

    // Handle other errors
    return Promise.reject(error)
  }
)

export default apiClient
