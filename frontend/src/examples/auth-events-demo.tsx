 
/**
 * Auth Events Demo Components
 *
 * Examples showing how to use the authentication event system
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthEvents, useAuthEvent } from '@/hooks/useAuthEvents'
import { authStorage } from '@/lib/auth-storage'

/**
 * Example 1: Global Auth Event Logger
 *
 * Logs all authentication events to console and displays them
 */
export function AuthEventLogger() {
  const [events, setEvents] = useState<Array<{ time: string; event: string; data?: unknown }>>([])

  useAuthEvents((event, data) => {
    const logEntry = {
      time: new Date().toLocaleTimeString(),
      event,
      data,
    }
    setEvents((prev) => [logEntry, ...prev].slice(0, 20)) // Keep last 20 events
    console.log('[Auth Event]', event, data)
  })

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold mb-3">Auth Event Log</h3>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {events.length === 0 ? (
          <p className="text-gray-500 text-sm">No events yet</p>
        ) : (
          events.map((event, index) => (
            <div key={index} className="text-sm font-mono border-b border-gray-100 pb-1">
              <span className="text-gray-500">[{event.time}]</span>{' '}
              <span className="font-semibold text-blue-600">{event.event}</span>
              {event.data !== undefined && (
                <span className="text-gray-600 ml-2">
                  {JSON.stringify(event.data)}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/**
 * Example 2: Logout Redirect Handler
 *
 * Automatically redirects to login when user logs out
 */
export function LogoutRedirectHandler() {
  const router = useRouter()

  useAuthEvent('logout', () => {
    console.log('User logged out, redirecting to login...')
    router.push('/login')
  })

  return null // This is a non-visual component
}

/**
 * Example 3: Token Refresh Notification
 *
 * Shows a toast notification when token is refreshed
 */
export function TokenRefreshNotification() {
  const [showNotification, setShowNotification] = useState(false)

  useAuthEvent('token-refreshed', () => {
    setShowNotification(true)
    setTimeout(() => setShowNotification(false), 3000)
  })

  if (!showNotification) {return null}

  return (
    <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
      ✓ Token refreshed successfully
    </div>
  )
}

/**
 * Example 4: Session Expiry Warning
 *
 * Shows warning when token expires and refresh fails
 */
export function SessionExpiryWarning() {
  const [expired, setExpired] = useState(false)
  const router = useRouter()

  useAuthEvent('token-expired', () => {
    setExpired(true)
  })

  if (!expired) {return null}

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md">
        <h2 className="text-xl font-bold text-red-600 mb-2">Session Expired</h2>
        <p className="text-gray-700 mb-4">
          Your session has expired. Please log in again to continue.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Go to Login
        </button>
      </div>
    </div>
  )
}

/**
 * Example 5: User Profile Sync
 *
 * Syncs user profile when user data is updated
 */
export function UserProfileSync() {
  const [userName, setUserName] = useState<string>('')

  useEffect(() => {
    // Initialize with current user
    const user = authStorage.getUser()
    if (user) {
      setUserName(user.full_name)
    }
  }, [])

  useAuthEvent('user-updated', (data) => {
    const userData = data as { user?: { full_name: string } } | undefined
    if (userData?.user) {
      setUserName(userData.user.full_name)
      console.log('User profile updated:', userData.user)
    }
  })

  useAuthEvent('login', () => {
    const user = authStorage.getUser()
    if (user) {
      setUserName(user.full_name)
    }
  })

  useAuthEvent('logout', () => {
    setUserName('')
  })

  if (!userName) {return null}

  return (
    <div className="text-sm text-gray-600">
      Logged in as: <span className="font-semibold">{userName}</span>
    </div>
  )
}

/**
 * Example 6: Complete Auth Event Handler
 *
 * Comprehensive example handling all auth events
 */
export function ComprehensiveAuthHandler() {
  const router = useRouter()
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)

  const showNotification = useCallback(
    (type: 'success' | 'error' | 'info', message: string) => {
      setNotification({ type, message })
      setTimeout(() => setNotification(null), 3000)
    },
    []
  )

  useAuthEvents(
    useCallback(
      (event, data) => {
        switch (event) {
          case 'login':
            showNotification('success', 'Successfully logged in')
            break

          case 'logout':
            showNotification('info', 'You have been logged out')
            router.push('/login')
            break

          case 'token-refreshed':
            console.log('Token refreshed silently')
            // Usually no notification needed for this
            break

          case 'token-expired':
            showNotification('error', 'Session expired. Please log in again.')
            setTimeout(() => router.push('/login'), 2000)
            break

          case 'user-updated':
            showNotification('success', 'Profile updated')
            break

          default:
            console.log('Unknown auth event:', event)
        }
      },
      [router, showNotification]
    )
  )

  if (!notification) {return null}

  const bgColor =
    notification.type === 'success'
      ? 'bg-green-500'
      : notification.type === 'error'
        ? 'bg-red-500'
        : 'bg-blue-500'

  return (
    <div
      className={`fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50`}
    >
      {notification.message}
    </div>
  )
}

/**
 * Example 7: Analytics Tracking
 *
 * Track authentication events for analytics
 */
export function AuthAnalytics() {
  useAuthEvents((event, data) => {
    // Send to analytics service
    if (typeof window !== 'undefined' && (window as Window & { gtag?: (...args: unknown[]) => void }).gtag) {
      ;(window as Window & { gtag?: (...args: unknown[]) => void }).gtag?.('event', 'auth_event', {
        event_category: 'Authentication',
        event_label: event,
        value: data ? JSON.stringify(data) : undefined,
      })
    }

    // Or send to your custom analytics
    console.log('[Analytics] Auth event:', event, data)
  })

  return null
}

/**
 * Example 8: Multi-tab Sync Warning
 *
 * Warn user when logged out in another tab
 */
export function MultiTabSyncWarning() {
  const [showWarning, setShowWarning] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Listen for storage events from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === '__auth_token' && !e.newValue && e.oldValue) {
        // Token was removed in another tab
        setShowWarning(true)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  useAuthEvent('logout', () => {
    setShowWarning(true)
  })

  if (!showWarning) {return null}

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-500 text-white px-6 py-3 rounded-lg shadow-lg">
      <p className="font-semibold mb-2">Session ended</p>
      <p className="text-sm mb-3">You were logged out in another tab</p>
      <button
        onClick={() => router.push('/login')}
        className="bg-white text-yellow-600 px-4 py-1 rounded text-sm font-semibold"
      >
        Log in again
      </button>
    </div>
  )
}
