import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { authStorage, type UserData } from './auth-storage'

/**
 * Auth Storage Tests - Phase 2 (httpOnly Cookies)
 *
 * In Phase 2, tokens are stored in httpOnly cookies (managed by browser).
 * This test file tests the user data storage and auth state management.
 */
describe('AuthStorage - Phase 2 (httpOnly Cookies)', () => {
  const mockUser: UserData = {
    id: '123',
    email: 'test@example.com',
    full_name: 'Test User',
    role: 'admin',
  }

  beforeEach(() => {
    // Clear storage before each test
    sessionStorage.clear()
    localStorage.clear()
    authStorage.clearStorage()
  })

  afterEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  describe('User Data Management', () => {
    it('should store and retrieve user data via handleLogin', () => {
      authStorage.handleLogin(mockUser)

      const retrieved = authStorage.getUser()
      expect(retrieved).toEqual(mockUser)
    })

    it('should update user data via setUser', () => {
      authStorage.handleLogin(mockUser)

      const updatedUser = { ...mockUser, full_name: 'Updated Name' }
      authStorage.setUser(updatedUser)

      expect(authStorage.getUser()).toEqual(updatedUser)
    })

    it('should clear user data on clearStorage', () => {
      authStorage.handleLogin(mockUser)
      authStorage.clearStorage()

      expect(authStorage.getUser()).toBeNull()
    })

    it('should set isLoggedIn to true after handleLogin', () => {
      expect(authStorage.isLoggedIn()).toBe(false)

      authStorage.handleLogin(mockUser)

      expect(authStorage.isLoggedIn()).toBe(true)
    })

    it('should set isLoggedIn to false after clearStorage', () => {
      authStorage.handleLogin(mockUser)
      expect(authStorage.isLoggedIn()).toBe(true)

      authStorage.clearStorage()

      expect(authStorage.isLoggedIn()).toBe(false)
    })
  })

  describe('Storage Persistence', () => {
    it('should persist user data in sessionStorage', () => {
      authStorage.handleLogin(mockUser)

      // Check for v3 key (Phase 2)
      const stored = sessionStorage.getItem('__user_data_v3')
      expect(stored).toBeTruthy()

      // Verify user can be retrieved
      const retrieved = authStorage.getUser()
      expect(retrieved).toEqual(mockUser)
    })

    it('should not use localStorage for user data', () => {
      authStorage.handleLogin(mockUser)

      // Check localStorage is not used
      expect(localStorage.getItem('__user_data_v3')).toBeNull()
      expect(localStorage.getItem('user_data')).toBeNull()
    })
  })

  describe('Auth Events', () => {
    it('should notify listeners on login', () => {
      const listener = vi.fn()
      const unsubscribe = authStorage.subscribe(listener)

      authStorage.handleLogin(mockUser)

      expect(listener).toHaveBeenCalledWith('login', { user: mockUser })

      unsubscribe()
    })

    it('should notify listeners on logout', () => {
      const listener = vi.fn()
      authStorage.handleLogin(mockUser)

      const unsubscribe = authStorage.subscribe(listener)
      authStorage.clearStorage()

      expect(listener).toHaveBeenCalledWith('logout', undefined)

      unsubscribe()
    })

    it('should notify listeners on user update', () => {
      const listener = vi.fn()
      authStorage.handleLogin(mockUser)

      const unsubscribe = authStorage.subscribe(listener)

      const updatedUser = { ...mockUser, full_name: 'New Name' }
      authStorage.setUser(updatedUser)

      expect(listener).toHaveBeenCalledWith('user-updated', { user: updatedUser })

      unsubscribe()
    })

    it('should notify listeners on token refresh', () => {
      const listener = vi.fn()
      const unsubscribe = authStorage.subscribe(listener)

      authStorage.handleTokenRefresh()

      expect(listener).toHaveBeenCalledWith('token-refreshed', undefined)

      unsubscribe()
    })

    it('should notify listeners on auth failure', () => {
      const listener = vi.fn()
      authStorage.handleLogin(mockUser)

      const unsubscribe = authStorage.subscribe(listener)
      authStorage.handleAuthFailure()

      // handleAuthFailure calls clearStorage() first (which fires 'logout'), then fires 'token-expired'
      expect(listener).toHaveBeenCalledWith('logout', undefined)
      expect(listener).toHaveBeenLastCalledWith('token-expired', undefined)

      unsubscribe()
    })

    it('should allow unsubscribing from events', () => {
      const listener = vi.fn()
      const unsubscribe = authStorage.subscribe(listener)

      unsubscribe()
      authStorage.handleLogin(mockUser)

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('Old Storage Cleanup', () => {
    it('should clean up Phase 1 storage keys', () => {
      // Set old format data
      sessionStorage.setItem('__auth_token_v2', 'old-token')
      sessionStorage.setItem('__refresh_token_v2', 'old-refresh')
      sessionStorage.setItem('__user_data_v2', JSON.stringify(mockUser))
      sessionStorage.setItem('__session_fp', 'fingerprint')
      localStorage.setItem('auth_token', 'old-token')
      localStorage.setItem('user_data', JSON.stringify(mockUser))

      // handleLogin should clean up old keys
      authStorage.handleLogin(mockUser)

      // Old keys should be removed
      expect(sessionStorage.getItem('__auth_token_v2')).toBeNull()
      expect(sessionStorage.getItem('__refresh_token_v2')).toBeNull()
      expect(sessionStorage.getItem('__user_data_v2')).toBeNull()
      expect(localStorage.getItem('auth_token')).toBeNull()
      expect(localStorage.getItem('user_data')).toBeNull()
    })
  })

  describe('Security Info', () => {
    it('should return correct security info', () => {
      const info = authStorage.getSecurityInfo()

      expect(info.phase).toBe('Phase 2 - httpOnly Cookie Authentication')
      expect(info.tokenStorage).toBe('httpOnly cookies (browser-managed)')
      expect(info.xssProtection).toBe('Full (tokens not accessible to JavaScript)')
      expect(info.csrfProtection).toBe('SameSite=Strict cookies')
    })

    it('should reflect authentication state in security info', () => {
      expect(authStorage.getSecurityInfo().isAuthenticated).toBe(false)
      expect(authStorage.getSecurityInfo().hasUserData).toBe(false)

      authStorage.handleLogin(mockUser)

      expect(authStorage.getSecurityInfo().isAuthenticated).toBe(true)
      expect(authStorage.getSecurityInfo().hasUserData).toBe(true)
    })
  })

  describe('Deprecated Methods (Backward Compatibility)', () => {
    it('getAccessToken should return null and log warning', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = authStorage.getAccessToken()

      expect(result).toBeNull()
      expect(warnSpy).toHaveBeenCalledWith(
        'getAccessToken() is deprecated in Phase 2. Tokens are in httpOnly cookies.'
      )

      warnSpy.mockRestore()
    })

    it('getRefreshToken should return null and log warning', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = authStorage.getRefreshToken()

      expect(result).toBeNull()
      expect(warnSpy).toHaveBeenCalledWith(
        'getRefreshToken() is deprecated in Phase 2. Tokens are in httpOnly cookies.'
      )

      warnSpy.mockRestore()
    })

    it('setTokens should log warning and do nothing', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      authStorage.setTokens()

      expect(warnSpy).toHaveBeenCalledWith(
        'setTokens() is deprecated in Phase 2. Backend sets httpOnly cookies.'
      )

      warnSpy.mockRestore()
    })

    it('isTokenExpired should return false and log warning', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = authStorage.isTokenExpired()

      expect(result).toBe(false)
      expect(warnSpy).toHaveBeenCalledWith(
        'isTokenExpired() is deprecated in Phase 2. Cookie expiry is browser-managed.'
      )

      warnSpy.mockRestore()
    })
  })
})
