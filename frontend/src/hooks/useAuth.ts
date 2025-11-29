'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authStorage, type UserData } from '@/lib/auth-storage'

export function useAuth() {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    // Migrate old localStorage data on first load
    authStorage.migrateFromOldStorage()
  }, [])

  const checkAuth = () => {
    const token = authStorage.getAccessToken()
    const userData = authStorage.getUser()

    if (token && userData) {
      setUser(userData)
    } else if (token && !userData) {
      // Token exists but no user data - invalid state, logout
      logout()
    }

    setLoading(false)
  }

  const login = (token: string, userData: UserData, refreshToken?: string, expiresIn?: number) => {
    // Save tokens and user data to secure storage
    authStorage.setTokens(token, refreshToken, expiresIn)
    authStorage.setUser(userData)
    setUser(userData)
  }

  const logout = () => {
    authStorage.clearStorage()
    setUser(null)
    router.push('/login')
  }

  const isAuthenticated = !!user && !!authStorage.getAccessToken()

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
