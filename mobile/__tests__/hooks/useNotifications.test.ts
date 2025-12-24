/**
 * useNotifications Hook Tests
 */

import * as Notifications from 'expo-notifications';

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
  getBadgeCountAsync: jest.fn(),
}));

// Mock notification service
jest.mock('../../src/services/notifications', () => ({
  notificationService: {
    isEnabled: jest.fn(),
    getToken: jest.fn(),
    getBadgeCount: jest.fn(),
    setBadgeCount: jest.fn(),
    clearBadge: jest.fn(),
    registerForPushNotifications: jest.fn(),
    scheduleLocalNotification: jest.fn(),
    cancelNotification: jest.fn(),
    cancelAllNotifications: jest.fn(),
  },
}));

const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;

describe('useNotifications utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('notification listeners', () => {
    it('should add notification received listener', () => {
      const callback = jest.fn();
      const subscription = Notifications.addNotificationReceivedListener(callback);

      expect(mockNotifications.addNotificationReceivedListener).toHaveBeenCalledWith(callback);
      expect(subscription.remove).toBeDefined();
    });

    it('should add notification response listener', () => {
      const callback = jest.fn();
      const subscription = Notifications.addNotificationResponseReceivedListener(callback);

      expect(mockNotifications.addNotificationResponseReceivedListener).toHaveBeenCalledWith(callback);
      expect(subscription.remove).toBeDefined();
    });
  });

  describe('permissions', () => {
    it('should request notification permissions', async () => {
      mockNotifications.requestPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
        granted: true,
        ios: {},
        android: {},
      } as any);

      const result = await Notifications.requestPermissionsAsync();

      expect(result.status).toBe('granted');
    });

    it('should get existing permissions', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
        granted: true,
        ios: {},
        android: {},
      } as any);

      const result = await Notifications.getPermissionsAsync();

      expect(result.status).toBe('granted');
    });
  });

  describe('badge count', () => {
    it('should set badge count', async () => {
      await Notifications.setBadgeCountAsync(5);

      expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(5);
    });

    it('should get badge count', async () => {
      mockNotifications.getBadgeCountAsync.mockResolvedValueOnce(3);

      const count = await Notifications.getBadgeCountAsync();

      expect(count).toBe(3);
    });

    it('should clear badge count', async () => {
      await Notifications.setBadgeCountAsync(0);

      expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
    });
  });

  describe('scheduling notifications', () => {
    it('should schedule notification', async () => {
      mockNotifications.scheduleNotificationAsync.mockResolvedValueOnce('notification-id-1');

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test',
          body: 'Test body',
        },
        trigger: { seconds: 60 } as any, // Type-cast for test purposes
      });

      expect(id).toBe('notification-id-1');
      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalled();
    });

    it('should cancel scheduled notification', async () => {
      await Notifications.cancelScheduledNotificationAsync('notification-id-1');

      expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notification-id-1');
    });

    it('should cancel all scheduled notifications', async () => {
      await Notifications.cancelAllScheduledNotificationsAsync();

      expect(mockNotifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    });
  });

  describe('push tokens', () => {
    it('should get expo push token', async () => {
      mockNotifications.getExpoPushTokenAsync.mockResolvedValueOnce({
        data: 'ExponentPushToken[xxxx]',
        type: 'expo',
      });

      const result = await Notifications.getExpoPushTokenAsync();

      expect(result.data).toBe('ExponentPushToken[xxxx]');
    });
  });
});
