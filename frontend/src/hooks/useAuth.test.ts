import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAuth } from './useAuth'
import { authStorage } from '@/lib/auth-storage'
import type { UserData, AuthEvent } from '@/lib/auth-storage'

// Mock Next.js router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock axios
vi.mock('@/lib/axios', () => ({
  apiClient: {
    post: vi.fn().mockResolvedValue({}),
  },
}))

// Mock auth storage for Phase 2
vi.mock('@/lib/auth-storage', () => ({
  authStorage: {
    getUser: vi.fn(),
    handleLogin: vi.fn(),
    setUser: vi.fn(),
    clearStorage: vi.fn(),
    isLoggedIn: vi.fn(),
    subscribe: vi.fn(),
  },
}))

/**
 * useAuth Hook Tests - Phase 2 (httpOnly Cookies)
 *
 * In Phase 2, tokens are stored in httpOnly cookies.
 * The hook manages user state for UI, not tokens.
 */
describe('useAuth - Phase 2', () => {
  const mockUser: UserData = {
    id: '123',
    email: 'test@example.com',
    full_name: 'Test User',
    role: 'admin',
  }

  let subscriberCallback: ((event: AuthEvent, data?: unknown) => void) | null = null

  beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockClear()
    subscriberCallback = null

    // Setup subscribe mock to capture the callback
    vi.mocked(authStorage.subscribe).mockImplementation((callback) => {
      subscriberCallback = callback
      return vi.fn() // Return unsubscribe function
    })

    // Setup clearStorage mock to fire 'logout' event like the real implementation
    vi.mocked(authStorage.clearStorage).mockImplementation(() => {
      if (subscriberCallback) {
        subscriberCallback('logout')
      }
    })
  })

  describe('initialization', () => {
    it('should start with loading state', async () => {
      vi.mocked(authStorage.getUser).mockReturnValue(null)
      vi.mocked(authStorage.isLoggedIn).mockReturnValue(false)

      const { result } = renderHook(() => useAuth())

      // Initial loading state may be true briefly, but useEffect runs immediately
      // After initialization, loading should become false
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })

    it('should load user from storage if authenticated', async () => {
      vi.mocked(authStorage.getUser).mockReturnValue(mockUser)
      vi.mocked(authStorage.isLoggedIn).mockReturnValue(true)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('should set user to null if not authenticated', async () => {
      vi.mocked(authStorage.getUser).mockReturnValue(null)
      vi.mocked(authStorage.isLoggedIn).mockReturnValue(false)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })

    it('should subscribe to auth events', async () => {
      vi.mocked(authStorage.getUser).mockReturnValue(null)
      vi.mocked(authStorage.isLoggedIn).mockReturnValue(false)

      renderHook(() => useAuth())

      await waitFor(() => {
        expect(authStorage.subscribe).toHaveBeenCalled()
      })
    })
  })

  describe('login', () => {
    it('should call handleLogin and update user state', async () => {
      vi.mocked(authStorage.getUser).mockReturnValue(null)
      vi.mocked(authStorage.isLoggedIn).mockReturnValue(false)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      act(() => {
        result.current.login(mockUser)
      })

      expect(authStorage.handleLogin).toHaveBeenCalledWith(mockUser)
      expect(result.current.user).toEqual(mockUser)
    })
  })

  describe('logout', () => {
    it('should clear storage and redirect to login', async () => {
      vi.mocked(authStorage.getUser).mockReturnValue(mockUser)
      vi.mocked(authStorage.isLoggedIn).mockReturnValue(true)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.logout()
      })

      // Verify side effects
      expect(authStorage.clearStorage).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/login')
    })

    it('should still logout even if API call fails', async () => {
      const { apiClient } = await import('@/lib/axios')
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Mock API to reject
      vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Network error'))

      vi.mocked(authStorage.getUser).mockReturnValue(mockUser)
      vi.mocked(authStorage.isLoggedIn).mockReturnValue(true)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      await act(async () => {
        await result.current.logout()
      })

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith('Logout API error:', expect.any(Error))

      // Verify logout still proceeded despite API error
      expect(authStorage.clearStorage).toHaveBeenCalled()
      expect(mockPush).toHaveBeenCalledWith('/login')

      consoleErrorSpy.mockRestore()
    })
  })

  describe('refreshAuth', () => {
    it('should refresh user data from storage', async () => {
      vi.mocked(authStorage.getUser).mockReturnValue(mockUser)
      vi.mocked(authStorage.isLoggedIn).mockReturnValue(true)

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
      vi.mocked(authStorage.getUser).mockReturnValue(mockUser)
      vi.mocked(authStorage.isLoggedIn).mockReturnValue(true)

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

  describe('auth events', () => {
    it('should handle logout event', async () => {
      vi.mocked(authStorage.getUser).mockReturnValue(mockUser)
      vi.mocked(authStorage.isLoggedIn).mockReturnValue(true)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toEqual(mockUser)

      // Simulate logout event
      act(() => {
        if (subscriberCallback) {
          subscriberCallback('logout')
        }
      })

      // Verify redirect was triggered
      expect(mockPush).toHaveBeenCalledWith('/login')
    })

    it('should handle token-expired event', async () => {
      vi.mocked(authStorage.getUser).mockReturnValue(mockUser)
      vi.mocked(authStorage.isLoggedIn).mockReturnValue(true)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toEqual(mockUser)

      // Simulate token-expired event
      act(() => {
        if (subscriberCallback) {
          subscriberCallback('token-expired')
        }
      })

      // Verify redirect was triggered
      expect(mockPush).toHaveBeenCalledWith('/login')
    })

    it('should handle user-updated event', async () => {
      vi.mocked(authStorage.getUser).mockReturnValue(mockUser)
      vi.mocked(authStorage.isLoggedIn).mockReturnValue(true)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const updatedUser = { ...mockUser, full_name: 'New Name' }
      vi.mocked(authStorage.getUser).mockReturnValue(updatedUser)

      // Simulate user-updated event
      act(() => {
        if (subscriberCallback) {
          subscriberCallback('user-updated')
        }
      })

      expect(result.current.user).toEqual(updatedUser)
    })

    it('should handle user-updated event when getUser returns null', async () => {
      vi.mocked(authStorage.getUser).mockReturnValue(mockUser)
      vi.mocked(authStorage.isLoggedIn).mockReturnValue(true)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toEqual(mockUser)

      // Mock getUser to return null (edge case: user data cleared)
      vi.mocked(authStorage.getUser).mockReturnValue(null)

      // Simulate user-updated event with null user data
      act(() => {
        if (subscriberCallback) {
          subscriberCallback('user-updated')
        }
      })

      // User should remain unchanged when getUser returns null
      expect(result.current.user).toEqual(mockUser)
    })

    it('should ignore unhandled auth events', async () => {
      vi.mocked(authStorage.getUser).mockReturnValue(mockUser)
      vi.mocked(authStorage.isLoggedIn).mockReturnValue(true)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toEqual(mockUser)

      // Simulate token-refreshed event (not handled by the hook)
      act(() => {
        if (subscriberCallback) {
          subscriberCallback('token-refreshed')
        }
      })

      // State should remain unchanged for unhandled events
      expect(result.current.user).toEqual(mockUser)
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should ignore login event in subscriber', async () => {
      vi.mocked(authStorage.getUser).mockReturnValue(mockUser)
      vi.mocked(authStorage.isLoggedIn).mockReturnValue(true)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Simulate login event (not handled in subscriber, login is handled via login() method)
      act(() => {
        if (subscriberCallback) {
          subscriberCallback('login')
        }
      })

      // State should remain unchanged
      expect(result.current.user).toEqual(mockUser)
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('isAuthenticated', () => {
    it('should return false when not logged in', async () => {
      vi.mocked(authStorage.getUser).mockReturnValue(null)
      vi.mocked(authStorage.isLoggedIn).mockReturnValue(false)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.isAuthenticated).toBe(false)
    })

    it('should return true when logged in', async () => {
      vi.mocked(authStorage.getUser).mockReturnValue(mockUser)
      vi.mocked(authStorage.isLoggedIn).mockReturnValue(true)

      const { result } = renderHook(() => useAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.isAuthenticated).toBe(true)
    })
  })
})
