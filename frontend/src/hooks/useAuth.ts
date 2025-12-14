'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { authStorage, type UserData } from '@/lib/auth-storage'
import { apiClient } from '@/lib/axios'

/**
 * Authentication hook for React components
 *
 * SEC-1 Phase 2: Uses httpOnly cookies for token storage
 * - Tokens are managed by browser via httpOnly cookies
 * - This hook only manages user data state for UI
 * - API calls use axios with withCredentials: true
 */
export function useAuth() {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  /**
   * Logout user
   * Calls backend to clear httpOnly cookies and clears local user data
   */
  const logout = useCallback(async () => {
    try {
      // Call backend to clear httpOnly cookies
      await apiClient.post('/auth/logout')
    } catch (error) {
      // Log but don't block logout on API error
      console.error('Logout API error:', error)
    }

    authStorage.clearStorage()
    setUser(null)
    router.push('/login')
  }, [router])

  /**
   * Check authentication state
   * With httpOnly cookies, we check user data presence
   */
  const checkAuth = useCallback(() => {
    const userData = authStorage.getUser()

    if (userData) {
      setUser(userData)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    checkAuth()

    // Subscribe to auth events
    const unsubscribe = authStorage.subscribe((event) => {
      if (event === 'logout' || event === 'token-expired') {
        setUser(null)
        router.push('/login')
      } else if (event === 'user-updated') {
        const userData = authStorage.getUser()
        if (userData) {
          setUser(userData)
        }
      }
    })

    return () => unsubscribe()
  }, [checkAuth, router])

  /**
   * Handle login
   * Backend sets httpOnly cookies, we just store user data for UI
   *
   * @param userData - User data from login response
   */
  const login = (userData: UserData) => {
    authStorage.handleLogin(userData)
    setUser(userData)
  }

  /**
   * Check if user is authenticated
   * Note: Actual auth validation is done by backend via cookies
   */
  const isAuthenticated = authStorage.isLoggedIn()

  /**
   * Refresh auth state from storage
   */
  const refreshAuth = () => {
    const userData = authStorage.getUser()
    if (userData) {
      setUser(userData)
    }
  }

  return {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    refreshAuth,
  }
}
