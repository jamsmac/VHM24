# Authentication Storage - Usage Guide

This guide explains how to use the automatic token refresh functionality in the VendHub frontend.

## Table of Contents

1. [Overview](#overview)
2. [Basic Usage](#basic-usage)
3. [API Client Usage](#api-client-usage)
4. [React Hooks Integration](#react-hooks-integration)
5. [Authentication Events](#authentication-events)
6. [Manual Token Refresh](#manual-token-refresh)
7. [Error Handling](#error-handling)
8. [Testing](#testing)

---

## Overview

The authentication storage system now includes:

- ✅ **Automatic token refresh** - Tokens are refreshed before they expire
- ✅ **Race condition protection** - Multiple simultaneous requests trigger only one refresh
- ✅ **Transparent retry logic** - Failed requests due to expired tokens are automatically retried
- ✅ **Session storage** - More secure than localStorage (cleared on tab close)
- ✅ **In-memory caching** - Reduces storage access overhead

---

## Basic Usage

### 1. Using the API Client (Recommended)

The easiest way to make authenticated requests is using the pre-configured axios client:

```typescript
import apiClient from '@/lib/axios'

// Automatic token injection and refresh
const response = await apiClient.get('/machines')
const machines = response.data

// POST request
const newMachine = await apiClient.post('/machines', {
  machine_number: 'M-001',
  name: 'Coffee Machine',
  location_id: 'uuid-here',
})

// PATCH request
await apiClient.patch(`/machines/${id}`, {
  status: 'maintenance',
})

// DELETE request
await apiClient.delete(`/machines/${id}`)
```

**What happens automatically:**

1. Before each request, `ensureValidToken()` is called
2. If token is about to expire (within 5 minutes), it's refreshed
3. Valid token is injected into `Authorization` header
4. If request fails with 401, token is refreshed and request is retried
5. If refresh fails, user is redirected to login

---

## API Client Usage

### Component Example

```typescript
'use client'

import { useState, useEffect } from 'react'
import apiClient from '@/lib/axios'
import { Machine } from '@/types'

export function MachineList() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMachines() {
      try {
        setLoading(true)
        const response = await apiClient.get('/machines')
        setMachines(response.data)
        setError(null)
      } catch (err) {
        setError('Failed to load machines')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchMachines()
  }, [])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <ul>
      {machines.map((machine) => (
        <li key={machine.id}>{machine.name}</li>
      ))}
    </ul>
  )
}
```

### Form Submission Example

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import apiClient from '@/lib/axios'

export function CreateMachineForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)

    try {
      const formData = new FormData(e.currentTarget)

      await apiClient.post('/machines', {
        machine_number: formData.get('machine_number'),
        name: formData.get('name'),
        location_id: formData.get('location_id'),
      })

      router.push('/machines')
    } catch (error) {
      alert('Failed to create machine')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Machine'}
      </button>
    </form>
  )
}
```

---

## React Hooks Integration

### Custom Hook for API Calls

Create a reusable hook for data fetching:

```typescript
// hooks/useApi.ts
import { useState, useEffect } from 'react'
import apiClient from '@/lib/axios'

export function useApi<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function fetchData() {
      try {
        setLoading(true)
        const response = await apiClient.get(url)

        if (isMounted) {
          setData(response.data)
          setError(null)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'An error occurred')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [url])

  return { data, loading, error }
}

// Usage
function MachineDetails({ id }: { id: string }) {
  const { data: machine, loading, error } = useApi<Machine>(`/machines/${id}`)

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!machine) return <div>Not found</div>

  return <div>{machine.name}</div>
}
```

---

## Authentication Events

The auth storage system emits events for important authentication state changes. You can subscribe to these events to react to auth changes across your application.

### Available Events

- `login` - User successfully logged in
- `logout` - User logged out
- `token-refreshed` - Access token was refreshed
- `token-expired` - Token expired and refresh failed
- `user-updated` - User data was updated

### Using the React Hooks

**Listen to all events:**

```typescript
import { useAuthEvents } from '@/hooks/useAuthEvents'
import { useRouter } from 'next/navigation'

function AuthHandler() {
  const router = useRouter()

  useAuthEvents((event, data) => {
    console.log('Auth event:', event, data)

    if (event === 'logout') {
      router.push('/login')
    }
  })

  return null
}
```

**Listen to specific event:**

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

### Common Patterns

**Auto-redirect on logout:**

```typescript
export function RootLayout({ children }) {
  const router = useRouter()

  useAuthEvent('logout', () => {
    router.push('/login')
  })

  useAuthEvent('token-expired', () => {
    router.push('/login?reason=expired')
  })

  return children
}
```

**Show notifications:**

```typescript
import { toast } from 'react-hot-toast'

export function AuthNotifications() {
  useAuthEvents((event) => {
    switch (event) {
      case 'login':
        toast.success('Welcome back!')
        break
      case 'logout':
        toast.info('Logged out successfully')
        break
      case 'token-expired':
        toast.error('Session expired')
        break
    }
  })

  return null
}
```

**For complete examples and advanced patterns, see [AUTH_EVENTS_GUIDE.md](./AUTH_EVENTS_GUIDE.md)**

---

## Manual Token Refresh

If you need to manually check or refresh tokens:

```typescript
import { authStorage } from '@/lib/auth-storage'

// Check if token is expired
const isExpired = authStorage.isTokenExpired()

// Get current access token (may be expired)
const token = authStorage.getAccessToken()

// Ensure valid token (refreshes if needed)
const validToken = await authStorage.ensureValidToken()

// Manually refresh token
const success = await authStorage.refreshAccessToken()
if (success) {
  console.log('Token refreshed successfully')
} else {
  console.log('Refresh failed, user needs to login')
}
```

---

## Error Handling

### Handle Authentication Errors

```typescript
import apiClient from '@/lib/axios'
import { authStorage } from '@/lib/auth-storage'
import { useRouter } from 'next/navigation'

export function useAuthenticatedRequest() {
  const router = useRouter()

  async function makeRequest<T>(
    method: 'get' | 'post' | 'patch' | 'delete',
    url: string,
    data?: any
  ): Promise<T | null> {
    try {
      const response = await apiClient[method](url, data)
      return response.data
    } catch (error) {
      // Check if authentication error
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        authStorage.clearStorage()
        router.push('/login')
        return null
      }

      // Handle other errors
      throw error
    }
  }

  return { makeRequest }
}
```

### Global Error Handler

```typescript
// lib/error-handler.ts
import { AxiosError } from 'axios'
import { authStorage } from './auth-storage'

export function handleApiError(error: unknown) {
  if (error instanceof AxiosError) {
    const status = error.response?.status

    switch (status) {
      case 401:
        authStorage.clearStorage()
        window.location.href = '/login'
        return 'Authentication failed'

      case 403:
        return 'You do not have permission to perform this action'

      case 404:
        return 'Resource not found'

      case 422:
        return error.response?.data?.message || 'Validation failed'

      case 500:
        return 'Server error. Please try again later'

      default:
        return 'An unexpected error occurred'
    }
  }

  return 'An error occurred'
}
```

---

## Testing

### Testing Components with API Client

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import { MachineList } from './MachineList'
import apiClient from '@/lib/axios'

// Mock the API client
jest.mock('@/lib/axios')
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>

describe('MachineList', () => {
  it('should load and display machines', async () => {
    const mockMachines = [
      { id: '1', name: 'Machine 1', machine_number: 'M-001' },
      { id: '2', name: 'Machine 2', machine_number: 'M-002' },
    ]

    mockedApiClient.get.mockResolvedValueOnce({ data: mockMachines })

    render(<MachineList />)

    await waitFor(() => {
      expect(screen.getByText('Machine 1')).toBeInTheDocument()
      expect(screen.getByText('Machine 2')).toBeInTheDocument()
    })
  })

  it('should handle authentication errors', async () => {
    const authError = {
      response: { status: 401 },
      isAxiosError: true,
    }

    mockedApiClient.get.mockRejectedValueOnce(authError)

    render(<MachineList />)

    // Component should handle the error gracefully
    // Interceptor will redirect to login
  })
})
```

### Testing Auth Storage

```typescript
import { authStorage } from '@/lib/auth-storage'

describe('AuthStorage Token Refresh', () => {
  beforeEach(() => {
    authStorage.clearStorage()
  })

  it('should refresh token when expired', async () => {
    // Set expired token
    authStorage.setTokens('old-token', 'refresh-token', -3600)

    // Mock fetch for refresh endpoint
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'new-token',
            refresh_token: 'new-refresh-token',
          }),
      })
    ) as jest.Mock

    const validToken = await authStorage.ensureValidToken()

    expect(validToken).toBe('new-token')
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh'),
      expect.any(Object)
    )
  })

  it('should handle race conditions', async () => {
    authStorage.setTokens('old-token', 'refresh-token', -3600)

    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'new-token',
            refresh_token: 'new-refresh-token',
          }),
      })
    ) as jest.Mock

    // Trigger 10 simultaneous refresh attempts
    const promises = Array(10)
      .fill(null)
      .map(() => authStorage.ensureValidToken())

    await Promise.all(promises)

    // Should only call refresh once
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
```

---

## Migration Checklist

If you're updating existing code to use the new auth system:

- [ ] Replace manual `fetch` calls with `apiClient`
- [ ] Remove manual `Authorization` header injection
- [ ] Remove manual token refresh logic
- [ ] Update error handling to rely on interceptors
- [ ] Test token expiration scenarios
- [ ] Verify redirect to login works correctly
- [ ] Check that protected routes are still protected

---

## Environment Variables

Required in `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## Security Notes

⚠️ **Current Implementation**: Uses sessionStorage (cleared on tab close)

🔒 **Recommended for Production**: Migrate to httpOnly cookies

- sessionStorage is vulnerable to XSS attacks
- httpOnly cookies cannot be accessed by JavaScript
- Requires backend changes to set cookies on login/refresh

See the main security advisory in the auth-storage.ts file for migration guide.

---

## Troubleshooting

### Token refresh fails immediately

**Check:**
- Backend `/auth/refresh` endpoint is accessible
- `NEXT_PUBLIC_API_URL` environment variable is correct
- Refresh token is valid and not expired

### User redirected to login unexpectedly

**Check:**
- Token expiration time is correct (default 15 minutes)
- Browser sessionStorage is enabled
- No CORS issues blocking refresh requests

### Multiple refresh requests

**Check:**
- All requests use the same `apiClient` instance
- Not importing `authStorage` directly in components (use `apiClient` instead)

---

## Best Practices

✅ **DO:**
- Use `apiClient` for all authenticated requests
- Let the interceptor handle token refresh automatically
- Handle errors at the component level
- Clear sensitive data on logout

❌ **DON'T:**
- Manually inject `Authorization` headers
- Manually refresh tokens in components
- Store tokens in localStorage
- Skip error handling

---

For questions or issues, check the VendHub backend API documentation or contact the development team.
