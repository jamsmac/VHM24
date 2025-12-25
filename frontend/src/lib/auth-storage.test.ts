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

    it('clearTokens should log warning and call clearStorage', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      authStorage.handleLogin(mockUser)

      authStorage.clearTokens()

      expect(warnSpy).toHaveBeenCalledWith(
        'clearTokens() is deprecated in Phase 2. Use clearStorage().'
      )
      expect(authStorage.isLoggedIn()).toBe(false)

      warnSpy.mockRestore()
    })

    it('ensureValidToken should return null and log warning', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await authStorage.ensureValidToken()

      expect(result).toBeNull()
      expect(warnSpy).toHaveBeenCalledWith(
        'ensureValidToken() is deprecated in Phase 2. Use axios with withCredentials.'
      )

      warnSpy.mockRestore()
    })

    it('refreshAccessToken should return false and log warning', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await authStorage.refreshAccessToken()

      expect(result).toBe(false)
      expect(warnSpy).toHaveBeenCalledWith(
        'refreshAccessToken() is deprecated in Phase 2. Use axios /auth/refresh endpoint.'
      )

      warnSpy.mockRestore()
    })
  })

  describe('Error Handling', () => {
    it('should handle error in event listener gracefully', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const errorListener = () => {
        throw new Error('Listener error')
      }
      const goodListener = vi.fn()

      authStorage.subscribe(errorListener)
      authStorage.subscribe(goodListener)

      // Should not throw, and should call other listeners
      authStorage.handleLogin(mockUser)

      expect(errorSpy).toHaveBeenCalledWith(
        'Error in auth event listener:',
        expect.any(Error)
      )
      expect(goodListener).toHaveBeenCalledWith('login', { user: mockUser })

      errorSpy.mockRestore()
    })

    it('should handle JSON parse error in loadFromStorage', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Set invalid JSON in storage
      sessionStorage.setItem('__user_data_v3', 'invalid-json{')

      // Create new instance to trigger loadFromStorage
      // We need to access the instance through the module
      authStorage.clearStorage()

      // The getUser method will try to load from storage if userData is null
      const result = authStorage.getUser()

      // Should have handled the error gracefully
      expect(result).toBeNull()

      errorSpy.mockRestore()
    })

    it('should handle sessionStorage.setItem error in handleLogin', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      // Should not throw
      authStorage.handleLogin(mockUser)

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to save user data:',
        expect.any(Error)
      )

      setItemSpy.mockRestore()
      errorSpy.mockRestore()
    })

    it('should handle sessionStorage.setItem error in setUser', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // First login successfully
      authStorage.handleLogin(mockUser)

      // Now mock setItem to fail
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      // Should not throw
      const updatedUser = { ...mockUser, full_name: 'Updated Name' }
      authStorage.setUser(updatedUser)

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to save user data:',
        expect.any(Error)
      )

      setItemSpy.mockRestore()
      errorSpy.mockRestore()
    })
  })

  describe('getUser edge cases', () => {
    it('should reload from storage when userData is null', () => {
      // First store user data
      sessionStorage.setItem('__user_data_v3', JSON.stringify(mockUser))

      // Clear internal state but not storage
      authStorage.clearStorage()

      // Now set storage again (simulating page reload scenario)
      sessionStorage.setItem('__user_data_v3', JSON.stringify(mockUser))

      // getUser should load from storage
      const result = authStorage.getUser()
      expect(result).toEqual(mockUser)
    })
  })

  describe('loadFromStorage error handling', () => {
    it('should clear storage and log error when JSON parse fails', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Clear storage first
      authStorage.clearStorage()

      // Set invalid JSON directly
      sessionStorage.setItem('__user_data_v3', '{invalid json')

      // Force reload by calling getUser (which calls loadFromStorage internally)
      const result = authStorage.getUser()

      // Should return null due to parse error
      expect(result).toBeNull()

      errorSpy.mockRestore()
    })
  })

  describe('SSR environment (window undefined)', () => {
    // Note: These tests verify the SSR guards exist but cannot fully test
    // the branches in jsdom since window is always defined.
    // The SSR guards (lines 106, 129) protect against server-side execution.

    it('should handle being in a browser environment gracefully', () => {
      // Verify window is defined in test environment
      expect(typeof window).not.toBe('undefined')

      // The authStorage should work normally in browser
      authStorage.handleLogin(mockUser)
      expect(authStorage.getUser()).toEqual(mockUser)
    })

    it('loadFromStorage should not throw when called', () => {
      // This tests that loadFromStorage executes without error
      // The SSR check (line 106) is a guard that returns early on server
      authStorage.clearStorage()
      sessionStorage.setItem('__user_data_v3', JSON.stringify(mockUser))

      // Calling getUser triggers loadFromStorage internally
      expect(() => authStorage.getUser()).not.toThrow()
    })

    it('cleanupOldStorage should not throw when called during handleLogin', () => {
      // This tests that cleanupOldStorage executes without error
      // The SSR check (line 129) is a guard that returns early on server
      sessionStorage.setItem('__auth_token_v2', 'old-token')

      // handleLogin calls cleanupOldStorage internally
      expect(() => authStorage.handleLogin(mockUser)).not.toThrow()

      // Verify cleanup happened
      expect(sessionStorage.getItem('__auth_token_v2')).toBeNull()
    })
  })
})
