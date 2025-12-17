/**
 * VendHub Mobile - Push Notifications Service
 *
 * Handles push notification registration, permissions, and handling
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import apiClient from './api';
import { NotificationPayload } from '../types';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  private expoPushToken: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  private isInitialized = false;

  /**
   * Initialize the notification service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[NotificationService] Already initialized');
      return;
    }

    console.log('[NotificationService] Initializing...');

    // Setup Android notification channel
    await this.setupAndroidChannel();

    // Setup notification listeners
    this.setupListeners();

    this.isInitialized = true;
    console.log('[NotificationService] Initialized successfully');
  }

  /**
   * Register for push notifications and get token
   */
  async registerForPushNotifications(): Promise<string | null> {
    // Only works on physical devices
    if (!Device.isDevice) {
      console.warn('[NotificationService] Push notifications only work on physical devices');
      return null;
    }

    try {
      // Check existing permission status
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('[NotificationService] Permission not granted');
        return null;
      }

      // Get Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId || undefined,
      });

      this.expoPushToken = tokenData.data;
      console.log('[NotificationService] Got push token:', this.expoPushToken);

      // Register token with backend
      await this.registerDeviceWithBackend(this.expoPushToken);

      return this.expoPushToken;
    } catch (error: any) {
      console.error('[NotificationService] Failed to get push token:', error);
      return null;
    }
  }

  /**
   * Register device token with backend
   */
  private async registerDeviceWithBackend(token: string): Promise<void> {
    try {
      await apiClient.getInstance().post('/devices/register', {
        token,
        platform: Platform.OS,
        device_name: Device.deviceName || 'Unknown Device',
        device_model: Device.modelName || 'Unknown Model',
        os_version: Device.osVersion || 'Unknown',
      });
      console.log('[NotificationService] Device registered with backend');
    } catch (error: any) {
      console.error('[NotificationService] Failed to register device with backend:', error);
      // Don't throw - registration failure shouldn't block app usage
    }
  }

  /**
   * Setup Android notification channel
   */
  private async setupAndroidChannel(): Promise<void> {
    if (Platform.OS !== 'android') return;

    // Default channel for general notifications
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Уведомления',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3b82f6',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    // High priority channel for urgent tasks
    await Notifications.setNotificationChannelAsync('urgent', {
      name: 'Срочные задачи',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      lightColor: '#ef4444',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    // Silent channel for background updates
    await Notifications.setNotificationChannelAsync('silent', {
      name: 'Фоновые обновления',
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      enableVibrate: false,
      showBadge: false,
    });

    console.log('[NotificationService] Android channels created');
  }

  /**
   * Setup notification listeners
   */
  private setupListeners(): void {
    // Handle notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[NotificationService] Notification received:', notification);
        this.handleNotificationReceived(notification);
      }
    );

    // Handle notification taps (user interaction)
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('[NotificationService] Notification tapped:', response);
        this.handleNotificationTapped(response);
      }
    );
  }

  /**
   * Handle notification received in foreground
   */
  private handleNotificationReceived(
    notification: Notifications.Notification
  ): void {
    const data = notification.request.content.data as NotificationPayload['data'];

    // You can add custom logic here, e.g., refresh task list
    if (data?.type === 'task') {
      console.log('[NotificationService] Task notification received, ID:', data.id);
    }
  }

  /**
   * Handle notification tap - navigate to relevant screen
   */
  private handleNotificationTapped(
    response: Notifications.NotificationResponse
  ): void {
    const data = response.notification.request.content.data as NotificationPayload['data'];

    if (!data) return;

    switch (data.type) {
      case 'task':
        if (data.id) {
          // Navigate to task detail
          // Note: This requires expo-router or navigation reference
          console.log('[NotificationService] Navigate to task:', data.id);
          // navigation.navigate('TaskDetail', { taskId: data.id });
        }
        break;

      case 'incident':
        if (data.id) {
          console.log('[NotificationService] Navigate to incident:', data.id);
          // navigation.navigate('IncidentDetail', { incidentId: data.id });
        }
        break;

      case 'system':
        console.log('[NotificationService] System notification');
        break;

      default:
        console.log('[NotificationService] Unknown notification type:', data.type);
    }
  }

  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data?: NotificationPayload['data'],
    triggerSeconds: number = 0
  ): Promise<string> {
    const trigger: Notifications.NotificationTriggerInput = triggerSeconds > 0
      ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: triggerSeconds }
      : null;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
      },
      trigger,
    });

    console.log('[NotificationService] Local notification scheduled:', notificationId);
    return notificationId;
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log('[NotificationService] Notification cancelled:', notificationId);
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('[NotificationService] All notifications cancelled');
  }

  /**
   * Get badge count
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
    console.log('[NotificationService] Badge count set to:', count);
  }

  /**
   * Clear badge
   */
  async clearBadge(): Promise<void> {
    await this.setBadgeCount(0);
  }

  /**
   * Check if push notifications are enabled
   */
  async isEnabled(): Promise<boolean> {
    if (!Device.isDevice) return false;
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  }

  /**
   * Get current push token
   */
  getToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Cleanup listeners on app close
   */
  cleanup(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
    console.log('[NotificationService] Cleaned up');
  }
}

// Singleton instance
export const notificationService = new NotificationService();

export default notificationService;
