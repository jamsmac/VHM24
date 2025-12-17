/**
 * React Hook for Auth Events
 *
 * Subscribe to authentication events in React components
 */

'use client'

import { useEffect } from 'react'
import { authStorage, AuthEvent, AuthEventListener } from '@/lib/auth-storage'

/**
 * Subscribe to authentication events
 *
 * @param callback - Function to call when auth events occur
 *
 * @example
 * useAuthEvents((event, data) => {
 *   if (event === 'logout') {
 *     router.push('/login')
 *   }
 *   if (event === 'token-refreshed') {
 *     console.log('Token refreshed successfully')
 *   }
 * })
 */
export function useAuthEvents(callback: AuthEventListener) {
  useEffect(() => {
    const unsubscribe = authStorage.subscribe(callback)
    return unsubscribe
  }, [callback])
}

/**
 * Subscribe to a specific authentication event
 *
 * @param event - The event to listen for
 * @param callback - Function to call when the event occurs
 *
 * @example
 * useAuthEvent('logout', () => {
 *   router.push('/login')
 * })
 */
export function useAuthEvent(
  event: AuthEvent,
  callback: (data?: unknown) => void
) {
  useEffect(() => {
    const listener: AuthEventListener = (e, data) => {
      if (e === event) {
        callback(data)
      }
    }

    const unsubscribe = authStorage.subscribe(listener)
    return unsubscribe
  }, [event, callback])
}
