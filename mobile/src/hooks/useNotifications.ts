/**
 * VendHub Mobile - Notifications Hook
 *
 * Custom hook for managing push notifications in components
 */

import { useState, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { notificationService } from '../services/notifications';

interface UseNotificationsReturn {
  // State
  token: string | null;
  isEnabled: boolean;
  isLoading: boolean;
  badgeCount: number;

  // Actions
  requestPermission: () => Promise<boolean>;
  setBadgeCount: (count: number) => Promise<void>;
  clearBadge: () => Promise<void>;
  scheduleNotification: (
    title: string,
    body: string,
    data?: any,
    delaySeconds?: number
  ) => Promise<string | null>;
  cancelNotification: (id: string) => Promise<void>;
  cancelAllNotifications: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [token, setToken] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [badgeCount, setBadgeCountState] = useState(0);

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        // Check if notifications are enabled
        const enabled = await notificationService.isEnabled();
        setIsEnabled(enabled);

        // Get existing token
        const existingToken = notificationService.getToken();
        setToken(existingToken);

        // Get badge count
        const count = await notificationService.getBadgeCount();
        setBadgeCountState(count);
      } catch (error) {
        console.error('[useNotifications] Init error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  // Request permission and register
  const requestPermission = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const newToken = await notificationService.registerForPushNotifications();
      if (newToken) {
        setToken(newToken);
        setIsEnabled(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[useNotifications] Permission request error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Set badge count
  const setBadgeCount = useCallback(async (count: number): Promise<void> => {
    await notificationService.setBadgeCount(count);
    setBadgeCountState(count);
  }, []);

  // Clear badge
  const clearBadge = useCallback(async (): Promise<void> => {
    await notificationService.clearBadge();
    setBadgeCountState(0);
  }, []);

  // Schedule notification
  const scheduleNotification = useCallback(
    async (
      title: string,
      body: string,
      data?: any,
      delaySeconds?: number
    ): Promise<string | null> => {
      try {
        const id = await notificationService.scheduleLocalNotification(
          title,
          body,
          data,
          delaySeconds
        );
        return id;
      } catch (error) {
        console.error('[useNotifications] Schedule error:', error);
        return null;
      }
    },
    []
  );

  // Cancel notification
  const cancelNotification = useCallback(async (id: string): Promise<void> => {
    await notificationService.cancelNotification(id);
  }, []);

  // Cancel all notifications
  const cancelAllNotifications = useCallback(async (): Promise<void> => {
    await notificationService.cancelAllNotifications();
  }, []);

  return {
    token,
    isEnabled,
    isLoading,
    badgeCount,
    requestPermission,
    setBadgeCount,
    clearBadge,
    scheduleNotification,
    cancelNotification,
    cancelAllNotifications,
  };
}

/**
 * Hook to listen for notification events
 */
export function useNotificationListener(
  onReceived?: (notification: Notifications.Notification) => void,
  onTapped?: (response: Notifications.NotificationResponse) => void
): void {
  useEffect(() => {
    let receivedSubscription: Notifications.Subscription | null = null;
    let responseSubscription: Notifications.Subscription | null = null;

    if (onReceived) {
      receivedSubscription = Notifications.addNotificationReceivedListener(
        onReceived
      );
    }

    if (onTapped) {
      responseSubscription = Notifications.addNotificationResponseReceivedListener(
        onTapped
      );
    }

    return () => {
      if (receivedSubscription) {
        receivedSubscription.remove();
      }
      if (responseSubscription) {
        responseSubscription.remove();
      }
    };
  }, [onReceived, onTapped]);
}

export default useNotifications;
