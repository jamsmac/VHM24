/**
 * Axios API Client with httpOnly Cookie Authentication (SEC-1)
 *
 * SECURITY ARCHITECTURE (Phase 2):
 * - Access tokens: httpOnly cookies (XSS immune)
 * - Refresh tokens: httpOnly cookies (XSS immune)
 * - Browser automatically sends cookies with requests
 * - No tokens stored in JavaScript memory or localStorage
 *
 * Features:
 * - Cookies sent automatically via withCredentials: true
 * - 401 handling triggers /auth/refresh (cookies updated server-side)
 * - Redirects to login on auth failure
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { authStorage } from './auth-storage'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'

// Create axios instance with cookie support
export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  // SEC-1: Essential for httpOnly cookies to be sent with requests
  withCredentials: true,
})

// Endpoints that don't require authentication
const PUBLIC_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/password-reset']

/**
 * Request Interceptor
 * With httpOnly cookies, we don't need to inject Authorization headers.
 * Browser sends cookies automatically.
 */
apiClient.interceptors.request.use(
  async (config) => {
    // For public endpoints, no special handling needed
    const isPublicEndpoint = PUBLIC_ENDPOINTS.some((endpoint) =>
      config.url?.includes(endpoint)
    )

    if (isPublicEndpoint) {
      return config
    }

    // For protected endpoints, cookies are sent automatically
    // No need to manually inject Authorization header

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

/**
 * Response Interceptor
 * Handles 401 errors by calling /auth/refresh endpoint.
 * Server will set new httpOnly cookies automatically.
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    // Handle 401 Unauthorized - try to refresh token
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Skip refresh for auth endpoints
      const isAuthEndpoint = PUBLIC_ENDPOINTS.some((endpoint) =>
        originalRequest.url?.includes(endpoint)
      )

      if (isAuthEndpoint) {
        return Promise.reject(error)
      }

      originalRequest._retry = true

      try {
        // Call refresh endpoint - server will set new cookies automatically
        const refreshResponse = await apiClient.post('/auth/refresh', {})

        if (refreshResponse.status === 200) {
          // Retry original request - new cookies will be sent automatically
          return apiClient(originalRequest)
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)
      }

      // Refresh failed, clear local state and redirect to login
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
