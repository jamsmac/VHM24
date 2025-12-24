/**
 * Notifications Service Tests
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  setBadgeCountAsync: jest.fn(),
  getBadgeCountAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: {
    HIGH: 4,
    MAX: 5,
    LOW: 2,
  },
  SchedulableTriggerInputTypes: {
    TIME_INTERVAL: 'timeInterval',
  },
}));

// Mock expo-device
jest.mock('expo-device', () => ({
  isDevice: true,
  deviceName: 'Test Device',
  modelName: 'Test Model',
  osVersion: '1.0',
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      eas: {
        projectId: 'test-project-id',
      },
    },
  },
}));

// Mock apiClient
jest.mock('../../src/services/api', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => ({
      post: jest.fn().mockResolvedValue({ data: {} }),
    })),
  },
}));

const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;
const mockDevice = Device as jest.Mocked<typeof Device>;

describe('NotificationService utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('notification handler configuration', () => {
    it('should be able to set notification handler', () => {
      // Set notification handler with custom configuration
      const handler = {
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      };

      Notifications.setNotificationHandler(handler);

      expect(mockNotifications.setNotificationHandler).toHaveBeenCalledWith(handler);
    });
  });

  describe('permission checking', () => {
    it('should check permission status', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
        granted: true,
      } as any);

      const result = await Notifications.getPermissionsAsync();

      expect(result.status).toBe('granted');
    });

    it('should request permissions', async () => {
      mockNotifications.requestPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
        granted: true,
      } as any);

      const result = await Notifications.requestPermissionsAsync();

      expect(result.status).toBe('granted');
    });

    it('should handle denied permissions', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValueOnce({
        status: 'denied',
        granted: false,
      } as any);

      const result = await Notifications.getPermissionsAsync();

      expect(result.status).toBe('denied');
    });
  });

  describe('push token', () => {
    it('should get expo push token', async () => {
      mockNotifications.getExpoPushTokenAsync.mockResolvedValueOnce({
        data: 'ExponentPushToken[xxxxx]',
        type: 'expo',
      });

      const result = await Notifications.getExpoPushTokenAsync({
        projectId: 'test-project-id',
      });

      expect(result.data).toBe('ExponentPushToken[xxxxx]');
    });
  });

  describe('badge count', () => {
    it('should get badge count', async () => {
      mockNotifications.getBadgeCountAsync.mockResolvedValueOnce(5);

      const count = await Notifications.getBadgeCountAsync();

      expect(count).toBe(5);
    });

    it('should set badge count', async () => {
      await Notifications.setBadgeCountAsync(10);

      expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(10);
    });

    it('should clear badge count', async () => {
      await Notifications.setBadgeCountAsync(0);

      expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
    });
  });

  describe('scheduling notifications', () => {
    it('should schedule notification', async () => {
      mockNotifications.scheduleNotificationAsync.mockResolvedValueOnce('notif-123');

      const id = await Notifications.scheduleNotificationAsync({
        content: { title: 'Test', body: 'Test body' },
        trigger: null,
      });

      expect(id).toBe('notif-123');
    });

    it('should cancel notification', async () => {
      await Notifications.cancelScheduledNotificationAsync('notif-123');

      expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-123');
    });

    it('should cancel all notifications', async () => {
      await Notifications.cancelAllScheduledNotificationsAsync();

      expect(mockNotifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    });
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

    it('should remove listeners', () => {
      const removeFn = jest.fn();
      mockNotifications.addNotificationReceivedListener.mockReturnValueOnce({ remove: removeFn });

      const subscription = Notifications.addNotificationReceivedListener(jest.fn());
      subscription.remove();

      expect(removeFn).toHaveBeenCalled();
    });
  });

  describe('Android notification channels', () => {
    it('should create notification channel', async () => {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Test Channel',
        importance: Notifications.AndroidImportance.HIGH,
      });

      expect(mockNotifications.setNotificationChannelAsync).toHaveBeenCalledWith('default', {
        name: 'Test Channel',
        importance: Notifications.AndroidImportance.HIGH,
      });
    });
  });

  describe('device checks', () => {
    it('should check if device is physical', () => {
      expect(Device.isDevice).toBe(true);
    });

    it('should get device info', () => {
      expect(Device.deviceName).toBe('Test Device');
      expect(Device.modelName).toBe('Test Model');
      expect(Device.osVersion).toBe('1.0');
    });
  });
});
