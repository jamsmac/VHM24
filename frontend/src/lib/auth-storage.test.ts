import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { authStorage, type UserData } from './auth-storage'

describe('AuthStorage', () => {
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

  describe('Token Management', () => {
    it('should store and retrieve access token', () => {
      const token = 'test-access-token'
      authStorage.setTokens(token, undefined, 3600)

      expect(authStorage.getAccessToken()).toBe(token)
    })

    it('should store refresh token', () => {
      authStorage.setTokens('access-token', 'refresh-token', 3600)

      expect(authStorage.getRefreshToken()).toBe('refresh-token')
    })

    it('should return null for expired token', () => {
      // Set token that expires immediately
      authStorage.setTokens('expired-token', undefined, -1)

      // Wait a tick for expiration
      expect(authStorage.getAccessToken()).toBeNull()
    })

    it('should check if token is expired', () => {
      // Fresh token (1 hour)
      authStorage.setTokens('fresh-token', undefined, 3600)
      expect(authStorage.isTokenExpired()).toBe(false)

      // Expired token
      authStorage.setTokens('expired-token', undefined, -1)
      expect(authStorage.isTokenExpired()).toBe(true)
    })

    it('should clear tokens', () => {
      authStorage.setTokens('token', 'refresh', 3600)
      authStorage.clearTokens()

      expect(authStorage.getAccessToken()).toBeNull()
      expect(authStorage.getRefreshToken()).toBeNull()
    })
  })

  describe('User Data Management', () => {
    it('should store and retrieve user data', () => {
      authStorage.setUser(mockUser)

      const retrieved = authStorage.getUser()
      expect(retrieved).toEqual(mockUser)
    })

    it('should clear user data', () => {
      authStorage.setUser(mockUser)
      authStorage.clearStorage()

      expect(authStorage.getUser()).toBeNull()
    })
  })

  describe('Storage Persistence', () => {
    it('should persist tokens in sessionStorage', () => {
      authStorage.setTokens('test-token', 'refresh-token', 3600)

      // Check for v2 keys (encrypted storage)
      const stored = sessionStorage.getItem('__auth_token_v2')
      expect(stored).toBeTruthy()

      // Verify token can be retrieved (decrypted)
      expect(authStorage.getAccessToken()).toBe('test-token')
      expect(authStorage.getRefreshToken()).toBe('refresh-token')
    })

    it('should persist user data in sessionStorage', () => {
      authStorage.setUser(mockUser)

      // Check for v2 key (encrypted storage)
      const stored = sessionStorage.getItem('__user_data_v2')
      expect(stored).toBeTruthy()

      // Verify user can be retrieved (decrypted)
      const retrieved = authStorage.getUser()
      expect(retrieved).toEqual(mockUser)
    })

    it('should persist data across page reloads (via sessionStorage)', () => {
      // Set tokens and user
      authStorage.setTokens('persistent-token', 'refresh-token', 3600)
      authStorage.setUser(mockUser)

      // Verify data is in sessionStorage (v2 keys)
      const tokenData = sessionStorage.getItem('__auth_token_v2')
      const userData = sessionStorage.getItem('__user_data_v2')
      const refreshToken = sessionStorage.getItem('__refresh_token_v2')

      expect(tokenData).toBeTruthy()
      expect(userData).toBeTruthy()
      expect(refreshToken).toBeTruthy()

      // Verify we can retrieve it (decrypted)
      expect(authStorage.getAccessToken()).toBe('persistent-token')
      expect(authStorage.getUser()).toEqual(mockUser)
    })
  })

  describe('Migration from localStorage', () => {
    it('should migrate old localStorage data', () => {
      // Set old format data
      localStorage.setItem('auth_token', 'old-token')
      localStorage.setItem('user_data', JSON.stringify(mockUser))

      authStorage.migrateFromOldStorage()

      // Check migrated
      expect(authStorage.getAccessToken()).toBe('old-token')
      expect(authStorage.getUser()).toEqual(mockUser)

      // Check old data cleared
      expect(localStorage.getItem('auth_token')).toBeNull()
      expect(localStorage.getItem('user_data')).toBeNull()
    })

    it('should handle migration errors gracefully', () => {
      localStorage.setItem('auth_token', 'token')
      localStorage.setItem('user_data', 'invalid-json')

      expect(() => {
        authStorage.migrateFromOldStorage()
      }).not.toThrow()
    })
  })

  describe('Security Features', () => {
    it('should use sessionStorage instead of localStorage', () => {
      authStorage.setTokens('token', 'refresh', 3600)

      // Check sessionStorage has it (v2 key)
      expect(sessionStorage.getItem('__auth_token_v2')).toBeTruthy()

      // Check localStorage doesn't have new data
      expect(localStorage.getItem('__auth_token_v2')).toBeNull()
      expect(localStorage.getItem('__auth_token')).toBeNull()
    })

    it('should clear all storage on clearStorage', () => {
      authStorage.setTokens('token', 'refresh', 3600)
      authStorage.setUser(mockUser)

      // Set old format too
      localStorage.setItem('auth_token', 'old')
      localStorage.setItem('user_data', 'old')

      authStorage.clearStorage()

      // Check everything cleared
      expect(sessionStorage.getItem('__auth_token')).toBeNull()
      expect(sessionStorage.getItem('__user_data')).toBeNull()
      expect(localStorage.getItem('auth_token')).toBeNull()
      expect(localStorage.getItem('user_data')).toBeNull()
    })
  })

  describe('Token Expiration Buffer', () => {
    it('should consider token expired 5 minutes before actual expiry', () => {
      // Token expires in 4 minutes (less than 5-minute buffer)
      const fourMinutes = 4 * 60
      authStorage.setTokens('soon-expired', undefined, fourMinutes)

      expect(authStorage.isTokenExpired()).toBe(true)
    })

    it('should not consider token expired if more than 5 minutes left', () => {
      // Token expires in 10 minutes (more than 5-minute buffer)
      const tenMinutes = 10 * 60
      authStorage.setTokens('still-valid', undefined, tenMinutes)

      expect(authStorage.isTokenExpired()).toBe(false)
    })
  })
})
