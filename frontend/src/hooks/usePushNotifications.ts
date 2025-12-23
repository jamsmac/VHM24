'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/axios'

interface PushNotificationState {
  isSupported: boolean
  permission: NotificationPermission | 'unsupported'
  isSubscribed: boolean
  isLoading: boolean
  error: string | null
}

interface UsePushNotificationsReturn extends PushNotificationState {
  subscribe: () => Promise<boolean>
  unsubscribe: () => Promise<boolean>
  sendTestNotification: () => Promise<boolean>
}

/**
 * Hook for managing Web Push notifications
 * Handles subscription, permissions, and test notifications
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'unsupported',
    isSubscribed: false,
    isLoading: true,
    error: null,
  })

  // Check if push notifications are supported
  const checkSupport = useCallback((): boolean => {
    if (typeof window === 'undefined') return false
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  }, [])

  // Get current permission status
  const getPermission = useCallback((): NotificationPermission | 'unsupported' => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported'
    }
    return Notification.permission
  }, [])

  // Check if user is already subscribed
  const checkSubscription = useCallback(async (): Promise<boolean> => {
    try {
      if (!checkSupport()) return false

      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      return !!subscription
    } catch {
      return false
    }
  }, [checkSupport])

  // Initialize state on mount
  useEffect(() => {
    const init = async () => {
      const isSupported = checkSupport()
      const permission = getPermission()
      const isSubscribed = await checkSubscription()

      setState({
        isSupported,
        permission,
        isSubscribed,
        isLoading: false,
        error: null,
      })
    }

    init()
  }, [checkSupport, getPermission, checkSubscription])

  // Convert URL base64 to Uint8Array for push subscription
  const urlBase64ToUint8Array = useCallback((base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }, [])

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      if (!checkSupport()) {
        throw new Error('Push notifications are not supported in this browser')
      }

      // Request notification permission
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState((prev) => ({
          ...prev,
          permission,
          isLoading: false,
          error: 'Notification permission denied',
        }))
        return false
      }

      // Get VAPID public key from server
      const { data: vapidData } = await apiClient.get('/web-push/public-key')
      const vapidPublicKey = vapidData.publicKey

      if (!vapidPublicKey) {
        throw new Error('Push notifications are not configured on server')
      }

      // Register service worker if not already registered
      const registration = await navigator.serviceWorker.ready

      // Subscribe to push manager
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      })

      // Send subscription to server
      const subscriptionJson = subscription.toJSON()
      await apiClient.post('/web-push/subscribe', {
        endpoint: subscriptionJson.endpoint,
        keys: {
          p256dh: subscriptionJson.keys?.p256dh,
          auth: subscriptionJson.keys?.auth,
        },
        user_agent: navigator.userAgent,
      })

      setState((prev) => ({
        ...prev,
        permission: 'granted',
        isSubscribed: true,
        isLoading: false,
        error: null,
      }))

      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to subscribe'
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }))
      return false
    }
  }, [checkSupport, urlBase64ToUint8Array])

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe()

        // Remove subscription from server
        const endpoint = btoa(subscription.endpoint)
        await apiClient.delete(`/web-push/unsubscribe/${endpoint}`)
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
        error: null,
      }))

      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to unsubscribe'
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }))
      return false
    }
  }, [])

  // Send a test notification
  const sendTestNotification = useCallback(async (): Promise<boolean> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      await apiClient.post('/web-push/test')

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: null,
      }))

      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send test notification'
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }))
      return false
    }
  }, [])

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendTestNotification,
  }
}
