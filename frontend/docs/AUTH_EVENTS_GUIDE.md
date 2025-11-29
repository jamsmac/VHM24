# Authentication Events System - Complete Guide

**Version**: 2.0
**Date**: 2025-11-22
**Status**: ✅ Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Available Events](#available-events)
3. [Basic Usage](#basic-usage)
4. [React Hooks](#react-hooks)
5. [Common Patterns](#common-patterns)
6. [Advanced Examples](#advanced-examples)
7. [Best Practices](#best-practices)
8. [Testing](#testing)

---

## Overview

The authentication event system allows components and services to react to authentication state changes in real-time. This enables:

- ✅ Automatic logout handling
- ✅ User session monitoring
- ✅ Analytics tracking
- ✅ UI updates on auth changes
- ✅ Multi-tab synchronization
- ✅ Custom business logic triggers

**Key Benefits:**
- Decoupled architecture (components don't need to poll auth state)
- Real-time updates across the application
- Type-safe event handling
- Easy to test and debug

---

## Available Events

### Event Types

```typescript
type AuthEvent =
  | 'login'           // User successfully logged in
  | 'logout'          // User logged out
  | 'token-refreshed' // Access token was refreshed
  | 'token-expired'   // Token expired and refresh failed
  | 'user-updated'    // User data was updated
```

### Event Details

#### `login`
**When**: User successfully logs in or tokens are set for the first time

**Data**:
```typescript
{ accessToken: string }
```

**Use Cases:**
- Redirect to dashboard
- Initialize user session
- Track login analytics
- Load user preferences

---

#### `logout`
**When**: User logs out or `clearStorage()` is called

**Data**: None

**Use Cases:**
- Redirect to login page
- Clear user-specific data
- Close WebSocket connections
- Track logout analytics

---

#### `token-refreshed`
**When**: Access token is successfully refreshed

**Data**:
```typescript
{ accessToken: string }
```

**Use Cases:**
- Update session expiry display
- Track token refresh metrics
- Debug authentication issues
- Silent logging (usually no UI needed)

---

#### `token-expired`
**When**: Token refresh fails (expired refresh token, network error, etc.)

**Data**: None

**Use Cases:**
- Show session expiry modal
- Redirect to login
- Save user's work before logout
- Track session timeout analytics

---

#### `user-updated`
**When**: User profile data is updated via `setUser()`

**Data**:
```typescript
{ user: UserData }
```

**Use Cases:**
- Update UI with new user info
- Refresh user avatar/name
- Sync profile changes
- Broadcast updates to other tabs

---

## Basic Usage

### Direct Subscription

```typescript
import { authStorage } from '@/lib/auth-storage'

// Subscribe to all events
const unsubscribe = authStorage.subscribe((event, data) => {
  console.log('Auth event:', event, data)

  if (event === 'logout') {
    // Handle logout
    window.location.href = '/login'
  }
})

// Later: cleanup
unsubscribe()
```

### Error Handling

Event listeners are automatically wrapped in try-catch:

```typescript
authStorage.subscribe((event, data) => {
  // Even if this throws, other listeners will still execute
  throw new Error('Oops!')
})
```

---

## React Hooks

### `useAuthEvents` - Listen to All Events

```typescript
import { useAuthEvents } from '@/hooks/useAuthEvents'

function MyComponent() {
  useAuthEvents((event, data) => {
    console.log('Auth event:', event, data)
  })

  return <div>Component content</div>
}
```

### `useAuthEvent` - Listen to Specific Event

```typescript
import { useAuthEvent } from '@/hooks/useAuthEvents'
import { useRouter } from 'next/navigation'

function LogoutHandler() {
  const router = useRouter()

  useAuthEvent('logout', () => {
    router.push('/login')
  })

  return null
}
```

**Important**: Both hooks automatically cleanup on unmount.

---

## Common Patterns

### Pattern 1: Logout Redirect

```typescript
'use client'

import { useAuthEvent } from '@/hooks/useAuthEvents'
import { useRouter } from 'next/navigation'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useAuthEvent('logout', () => {
    router.push('/login')
  })

  useAuthEvent('token-expired', () => {
    router.push('/login?reason=expired')
  })

  return <>{children}</>
}
```

### Pattern 2: Session Monitoring

```typescript
'use client'

import { useState } from 'react'
import { useAuthEvents } from '@/hooks/useAuthEvents'

export function SessionMonitor() {
  const [sessionInfo, setSessionInfo] = useState({
    isLoggedIn: false,
    lastRefresh: null as Date | null,
  })

  useAuthEvents((event) => {
    switch (event) {
      case 'login':
        setSessionInfo({ isLoggedIn: true, lastRefresh: new Date() })
        break
      case 'logout':
        setSessionInfo({ isLoggedIn: false, lastRefresh: null })
        break
      case 'token-refreshed':
        setSessionInfo((prev) => ({ ...prev, lastRefresh: new Date() }))
        break
    }
  })

  return (
    <div>
      <p>Status: {sessionInfo.isLoggedIn ? 'Logged In' : 'Logged Out'}</p>
      {sessionInfo.lastRefresh && (
        <p>Last refresh: {sessionInfo.lastRefresh.toLocaleTimeString()}</p>
      )}
    </div>
  )
}
```

### Pattern 3: Toast Notifications

```typescript
'use client'

import { useCallback } from 'react'
import { useAuthEvents } from '@/hooks/useAuthEvents'
import { toast } from 'react-hot-toast' // or your toast library

export function AuthNotifications() {
  useAuthEvents(
    useCallback((event) => {
      switch (event) {
        case 'login':
          toast.success('Welcome back!')
          break
        case 'logout':
          toast.info('You have been logged out')
          break
        case 'token-expired':
          toast.error('Session expired. Please log in again.')
          break
      }
    }, [])
  )

  return null
}
```

### Pattern 4: Analytics Tracking

```typescript
'use client'

import { useAuthEvents } from '@/hooks/useAuthEvents'

export function AuthAnalytics() {
  useAuthEvents((event, data) => {
    // Google Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', event, {
        event_category: 'Authentication',
        timestamp: new Date().toISOString(),
      })
    }

    // Custom analytics
    fetch('/api/analytics/auth', {
      method: 'POST',
      body: JSON.stringify({ event, timestamp: Date.now() }),
    }).catch(console.error)
  })

  return null
}
```

### Pattern 5: User Profile Sync

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useAuthEvent } from '@/hooks/useAuthEvents'
import { authStorage } from '@/lib/auth-storage'

export function UserProfile() {
  const [user, setUser] = useState(authStorage.getUser())

  useAuthEvent('login', () => {
    setUser(authStorage.getUser())
  })

  useAuthEvent('user-updated', (data) => {
    setUser(data?.user || null)
  })

  useAuthEvent('logout', () => {
    setUser(null)
  })

  if (!user) return <div>Not logged in</div>

  return (
    <div>
      <h2>{user.full_name}</h2>
      <p>{user.email}</p>
      <p>Role: {user.role}</p>
    </div>
  )
}
```

---

## Advanced Examples

### Example 1: Multi-Tab Synchronization

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useAuthEvent } from '@/hooks/useAuthEvents'
import { authStorage } from '@/lib/auth-storage'

export function MultiTabSync() {
  const [tabLoggedOut, setTabLoggedOut] = useState(false)

  useEffect(() => {
    // Listen for storage changes in other tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === '__auth_token' && !e.newValue && e.oldValue) {
        // Token removed in another tab
        setTabLoggedOut(true)
        authStorage.clearStorage() // Sync this tab
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  useAuthEvent('logout', () => {
    setTabLoggedOut(true)
  })

  if (!tabLoggedOut) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-2">Logged Out</h2>
        <p>You were logged out in another tab.</p>
        <button onClick={() => window.location.href = '/login'}>
          Log In Again
        </button>
      </div>
    </div>
  )
}
```

### Example 2: Auto-Save Before Logout

```typescript
'use client'

import { useRef, useCallback } from 'react'
import { useAuthEvent } from '@/hooks/useAuthEvents'

export function AutoSaveForm() {
  const formDataRef = useRef<any>({})
  const saveInProgress = useRef(false)

  const saveFormData = useCallback(async () => {
    if (saveInProgress.current) return

    saveInProgress.current = true
    try {
      await fetch('/api/drafts', {
        method: 'POST',
        body: JSON.stringify(formDataRef.current),
      })
      console.log('Form auto-saved')
    } finally {
      saveInProgress.current = false
    }
  }, [])

  // Save before logout
  useAuthEvent('logout', () => {
    saveFormData()
  })

  // Save before token expiry
  useAuthEvent('token-expired', () => {
    saveFormData()
  })

  return (
    <form onChange={(e) => {
      // Track form changes
      const formData = new FormData(e.currentTarget)
      formDataRef.current = Object.fromEntries(formData)
    }}>
      {/* Form fields */}
    </form>
  )
}
```

### Example 3: Real-time Session Timer

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useAuthEvent } from '@/hooks/useAuthEvents'
import { authStorage } from '@/lib/auth-storage'

export function SessionTimer() {
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      const token = authStorage.getAccessToken()
      if (token) {
        // Calculate time until expiry
        const tokenData = (authStorage as any).tokenData
        if (tokenData) {
          const remaining = Math.floor((tokenData.expiresAt - Date.now()) / 1000)
          setTimeLeft(remaining > 0 ? remaining : 0)
        }
      } else {
        setTimeLeft(null)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  useAuthEvent('token-refreshed', () => {
    // Reset timer when token refreshes
    setTimeLeft(900) // 15 minutes
  })

  useAuthEvent('logout', () => {
    setTimeLeft(null)
  })

  if (timeLeft === null) return null

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  return (
    <div className={timeLeft < 60 ? 'text-red-600' : 'text-gray-600'}>
      Session: {minutes}:{seconds.toString().padStart(2, '0')}
    </div>
  )
}
```

### Example 4: Conditional Feature Access

```typescript
'use client'

import { useState, useEffect } from 'react'
import { useAuthEvents } from '@/hooks/useAuthEvents'
import { authStorage } from '@/lib/auth-storage'

export function PremiumFeature() {
  const [hasAccess, setHasAccess] = useState(false)

  const checkAccess = () => {
    const user = authStorage.getUser()
    setHasAccess(user?.role === 'ADMIN' || user?.role === 'MANAGER')
  }

  useEffect(() => {
    checkAccess()
  }, [])

  useAuthEvents((event) => {
    if (event === 'login' || event === 'user-updated') {
      checkAccess()
    } else if (event === 'logout') {
      setHasAccess(false)
    }
  })

  if (!hasAccess) {
    return <div>Premium feature - Access denied</div>
  }

  return <div>Premium content here</div>
}
```

---

## Best Practices

### ✅ DO

1. **Use `useCallback` with `useAuthEvents`**
   ```typescript
   const callback = useCallback((event) => {
     // Handler logic
   }, [dependencies])

   useAuthEvents(callback)
   ```

2. **Cleanup subscriptions**
   ```typescript
   useEffect(() => {
     const unsubscribe = authStorage.subscribe(handler)
     return unsubscribe // Cleanup on unmount
   }, [])
   ```

3. **Handle all events explicitly**
   ```typescript
   useAuthEvents((event) => {
     switch (event) {
       case 'login': /* ... */ break
       case 'logout': /* ... */ break
       // Handle all cases
       default:
         console.warn('Unhandled event:', event)
     }
   })
   ```

4. **Use event data defensively**
   ```typescript
   useAuthEvent('user-updated', (data) => {
     if (data?.user) {
       updateUI(data.user)
     }
   })
   ```

### ❌ DON'T

1. **Don't forget to unsubscribe**
   ```typescript
   // ❌ BAD - Memory leak
   authStorage.subscribe(handler)

   // ✅ GOOD
   const unsubscribe = authStorage.subscribe(handler)
   return unsubscribe
   ```

2. **Don't subscribe in render**
   ```typescript
   // ❌ BAD
   function MyComponent() {
     authStorage.subscribe(handler) // New subscription every render!
     return <div>...</div>
   }

   // ✅ GOOD
   function MyComponent() {
     useAuthEvents(handler)
     return <div>...</div>
   }
   ```

3. **Don't throw errors in listeners**
   ```typescript
   // ❌ BAD - Will be caught but logged
   useAuthEvents((event) => {
     throw new Error('Oops!')
   })

   // ✅ GOOD
   useAuthEvents((event) => {
     try {
       // Risky operation
     } catch (error) {
       console.error('Event handler error:', error)
     }
   })
   ```

4. **Don't use inline functions**
   ```typescript
   // ❌ BAD - New function every render
   useAuthEvents((event) => {
     if (event === 'logout') router.push('/login')
   })

   // ✅ GOOD
   const handleAuthEvent = useCallback((event) => {
     if (event === 'logout') router.push('/login')
   }, [router])

   useAuthEvents(handleAuthEvent)
   ```

---

## Testing

### Testing Event Listeners

```typescript
import { authStorage } from '@/lib/auth-storage'

describe('Auth Events', () => {
  it('should trigger login event when tokens are set', () => {
    const listener = jest.fn()
    const unsubscribe = authStorage.subscribe(listener)

    authStorage.setTokens('access-token', 'refresh-token')

    expect(listener).toHaveBeenCalledWith('login', { accessToken: 'access-token' })

    unsubscribe()
  })

  it('should trigger logout event when storage is cleared', () => {
    const listener = jest.fn()
    const unsubscribe = authStorage.subscribe(listener)

    authStorage.clearStorage()

    expect(listener).toHaveBeenCalledWith('logout')

    unsubscribe()
  })
})
```

### Testing React Components with Events

```typescript
import { render, screen } from '@testing-library/react'
import { authStorage } from '@/lib/auth-storage'
import { LogoutHandler } from './LogoutHandler'

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

describe('LogoutHandler', () => {
  it('should redirect on logout event', () => {
    const { unmount } = render(<LogoutHandler />)

    // Trigger logout
    authStorage.clearStorage()

    // Verify redirect
    expect(mockRouter.push).toHaveBeenCalledWith('/login')

    unmount()
  })
})
```

---

## Summary

The authentication event system provides:

- ✅ **Real-time auth state updates** across your app
- ✅ **Type-safe event handling** with TypeScript
- ✅ **Easy React integration** with custom hooks
- ✅ **Automatic cleanup** to prevent memory leaks
- ✅ **Error isolation** - one listener's error doesn't affect others
- ✅ **Flexible architecture** for custom business logic

Use events to build responsive, real-time authentication UX! 🚀

---

## See Also

- [Auth Storage Usage Guide](./AUTH_STORAGE_USAGE.md)
- [Token Refresh Changelog](../CHANGELOG_TOKEN_REFRESH.md)
- [Auth Examples](../src/examples/auth-events-demo.tsx)
- [Auth Hooks](../src/hooks/useAuthEvents.ts)

---

**Questions or Issues?** Check the VendHub documentation or contact the dev team.
