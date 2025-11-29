import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAuth } from './useAuth'
import { authStorage } from '@/lib/auth-storage'
import type { UserData } from '@/lib/auth-storage'

// Mock Next.js router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock auth storage
vi.mock('@/lib/auth-storage', () => ({
  authStorage: {
    getAccessToken: vi.fn(),
    getUser: vi.fn(),
    setTokens: vi.fn(),
    setUser: vi.fn(),
    clearStorage: vi.fn(),
    migrateFromOldStorage: vi.fn(),
  },
}))

describe('useAuth', () => {
  const mockUser: UserData = {
    id: '123',
    email: 'test@example.com',
    full_name: 'Test User',
    role: 'admin',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockClear()
  })

  describe('initialization', () => {
    it('should start with loading state', () => {
      vi.mocked(authStorage.getAccessToken).mockReturnValue(null)
      vi.mocked(authStorage.getUser).mockReturnValue(null)

      const { result } = renderHook(() => useAuth())

      expect(result.current.loading).toBe(true)
    })

    it('should load user from storage if token exists', async () => {
      vi.mocked(authStorage.getAccessToken).mockReturnValue('test-token')
      vi.mocked(authStorage.getUser).mockReturnValue(mockUser)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('should set user to null if no token exists', async () => {
      vi.mocked(authStorage.getAccessToken).mockReturnValue(null)
      vi.mocked(authStorage.getUser).mockReturnValue(null)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('should migrate old storage on mount', async () => {
      vi.mocked(authStorage.getAccessToken).mockReturnValue(null)
      vi.mocked(authStorage.getUser).mockReturnValue(null)

      renderHook(() => useAuth())

      await waitFor(() => {
        expect(authStorage.migrateFromOldStorage).toHaveBeenCalled()
      })
    })
  })

  describe('login', () => {
    it('should set user and tokens on successful login', async () => {
      vi.mocked(authStorage.getAccessToken).mockReturnValue(null)
      vi.mocked(authStorage.getUser).mockReturnValue(null)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.login('test-token', mockUser, 'refresh-token', 900)
      })

      expect(authStorage.setTokens).toHaveBeenCalledWith('test-token', 'refresh-token', 900)
      expect(authStorage.setUser).toHaveBeenCalledWith(mockUser)
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('should handle login without refresh token', async () => {
      vi.mocked(authStorage.getAccessToken).mockReturnValue(null)
      vi.mocked(authStorage.getUser).mockReturnValue(null)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.login('test-token', mockUser)
      })

      expect(authStorage.setTokens).toHaveBeenCalledWith('test-token', undefined, undefined)
      expect(result.current.user).toEqual(mockUser)
    })
  })

  describe('logout', () => {
    it('should clear storage and redirect to login', async () => {
      vi.mocked(authStorage.getAccessToken).mockReturnValue('test-token')
      vi.mocked(authStorage.getUser).mockReturnValue(mockUser)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.logout()
      })

      expect(authStorage.clearStorage).toHaveBeenCalled()
      expect(result.current.user).toBeNull()
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  describe('refreshAuth', () => {
    it('should refresh user data from storage', async () => {
      vi.mocked(authStorage.getAccessToken).mockReturnValue('test-token')
      vi.mocked(authStorage.getUser).mockReturnValue(mockUser)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const updatedUser = { ...mockUser, full_name: 'Updated User' }
      vi.mocked(authStorage.getUser).mockReturnValue(updatedUser)

      act(() => {
        result.current.refreshAuth()
      })

      expect(result.current.user).toEqual(updatedUser)
    })

    it('should handle missing user data', async () => {
      vi.mocked(authStorage.getAccessToken).mockReturnValue('test-token')
      vi.mocked(authStorage.getUser).mockReturnValue(mockUser)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      vi.mocked(authStorage.getUser).mockReturnValue(null)

      act(() => {
        result.current.refreshAuth()
      })

      // User should remain unchanged if no data in storage
      expect(result.current.user).toEqual(mockUser)
    })
  })

  describe('edge cases', () => {
    it('should logout if token exists but no user data', async () => {
      vi.mocked(authStorage.getAccessToken).mockReturnValue('test-token')
      vi.mocked(authStorage.getUser).mockReturnValue(null)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(authStorage.clearStorage).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/login')
    })

    it('should handle isAuthenticated correctly', async () => {
      // Case 1: No user, no token
      vi.mocked(authStorage.getAccessToken).mockReturnValue(null)
      vi.mocked(authStorage.getUser).mockReturnValue(null)

      const { result: result1 } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result1.current.loading).toBe(false)
      })

      expect(result1.current.isAuthenticated).toBe(false)

      // Case 2: User exists, token exists
      vi.mocked(authStorage.getAccessToken).mockReturnValue('test-token')
      vi.mocked(authStorage.getUser).mockReturnValue(mockUser)

      const { result: result2 } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result2.current.loading).toBe(false)
      })

      expect(result2.current.isAuthenticated).toBe(true)
    })
  })
})
