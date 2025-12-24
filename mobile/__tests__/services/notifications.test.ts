/**
 * NotificationService Tests
 *
 * Comprehensive tests for the push notification service
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Store original Platform.OS
const originalPlatformOS = Platform.OS;

// Mock react-native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

// Mock expo-notifications
const mockRemove = jest.fn();
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: mockRemove })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: mockRemove })),
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

// Mock expo-device with getter for isDevice
let mockIsDevice = true;
jest.mock('expo-device', () => ({
  get isDevice() {
    return mockIsDevice;
  },
  deviceName: 'Test Device',
  modelName: 'Test Model',
  osVersion: '16.0',
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
const mockPost = jest.fn().mockResolvedValue({ data: {} });
jest.mock('../../src/services/api', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => ({
      post: mockPost,
    })),
  },
}));

const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;

describe('NotificationService', () => {
  let notificationService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsDevice = true;
    mockRemove.mockClear();
    mockPost.mockClear();

    // Reset module to get fresh instance
    jest.resetModules();

    // Re-apply mocks after resetModules
    jest.doMock('expo-notifications', () => ({
      setNotificationHandler: jest.fn(),
      addNotificationReceivedListener: jest.fn(() => ({ remove: mockRemove })),
      addNotificationResponseReceivedListener: jest.fn(() => ({ remove: mockRemove })),
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

    // Import fresh instance
    const { notificationService: ns } = require('../../src/services/notifications');
    notificationService = ns;
  });

  describe('initialize', () => {
    it('should initialize the service successfully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await notificationService.initialize();

      expect(consoleSpy).toHaveBeenCalledWith('[NotificationService] Initializing...');
      expect(consoleSpy).toHaveBeenCalledWith('[NotificationService] Initialized successfully');

      consoleSpy.mockRestore();
    });

    it('should not re-initialize if already initialized', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await notificationService.initialize();
      await notificationService.initialize();

      expect(consoleSpy).toHaveBeenCalledWith('[NotificationService] Already initialized');

      consoleSpy.mockRestore();
    });

    it('should setup notification listeners during initialization', async () => {
      const Notif = require('expo-notifications');

      await notificationService.initialize();

      expect(Notif.addNotificationReceivedListener).toHaveBeenCalled();
      expect(Notif.addNotificationResponseReceivedListener).toHaveBeenCalled();
    });
  });

  describe('registerForPushNotifications', () => {
    it('should return null on non-physical device', async () => {
      mockIsDevice = false;
      jest.resetModules();
      const { notificationService: ns } = require('../../src/services/notifications');

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await ns.registerForPushNotifications();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[NotificationService] Push notifications only work on physical devices'
      );

      consoleSpy.mockRestore();
    });

    it('should request permissions if not granted', async () => {
      const Notif = require('expo-notifications');
      Notif.getPermissionsAsync.mockResolvedValueOnce({ status: 'undetermined' });
      Notif.requestPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
      Notif.getExpoPushTokenAsync.mockResolvedValueOnce({ data: 'ExponentPushToken[test123]' });

      const result = await notificationService.registerForPushNotifications();

      expect(Notif.requestPermissionsAsync).toHaveBeenCalled();
      expect(result).toBe('ExponentPushToken[test123]');
    });

    it('should return null if permissions denied', async () => {
      const Notif = require('expo-notifications');
      Notif.getPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
      Notif.requestPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await notificationService.registerForPushNotifications();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('[NotificationService] Permission not granted');

      consoleSpy.mockRestore();
    });

    it('should get push token when permissions granted', async () => {
      const Notif = require('expo-notifications');
      Notif.getPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
      Notif.getExpoPushTokenAsync.mockResolvedValueOnce({ data: 'ExponentPushToken[abc123]' });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await notificationService.registerForPushNotifications();

      expect(result).toBe('ExponentPushToken[abc123]');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[NotificationService] Got push token:',
        'ExponentPushToken[abc123]'
      );

      consoleSpy.mockRestore();
    });

    it('should register device with backend after getting token', async () => {
      const Notif = require('expo-notifications');
      Notif.getPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
      Notif.getExpoPushTokenAsync.mockResolvedValueOnce({ data: 'ExponentPushToken[xyz789]' });

      jest.spyOn(console, 'log').mockImplementation();

      await notificationService.registerForPushNotifications();

      expect(mockPost).toHaveBeenCalledWith('/devices/register', {
        token: 'ExponentPushToken[xyz789]',
        platform: 'ios',
        device_name: 'Test Device',
        device_model: 'Test Model',
        os_version: '16.0',
      });
    });

    it('should handle errors gracefully', async () => {
      const Notif = require('expo-notifications');
      Notif.getPermissionsAsync.mockRejectedValueOnce(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await notificationService.registerForPushNotifications();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        '[NotificationService] Failed to get push token:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle backend registration failure without throwing', async () => {
      const Notif = require('expo-notifications');
      Notif.getPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
      Notif.getExpoPushTokenAsync.mockResolvedValueOnce({ data: 'ExponentPushToken[test]' });
      mockPost.mockRejectedValueOnce(new Error('Backend error'));

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await notificationService.registerForPushNotifications();

      // Should still return the token even if backend registration fails
      expect(result).toBe('ExponentPushToken[test]');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[NotificationService] Failed to register device with backend:',
        expect.any(Error)
      );

      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('scheduleLocalNotification', () => {
    it('should schedule immediate notification', async () => {
      const Notif = require('expo-notifications');
      Notif.scheduleNotificationAsync.mockResolvedValueOnce('notif-id-123');

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await notificationService.scheduleLocalNotification(
        'Test Title',
        'Test Body',
        { type: 'task', id: 'task-1' }
      );

      expect(result).toBe('notif-id-123');
      expect(Notif.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Test Title',
          body: 'Test Body',
          data: { type: 'task', id: 'task-1' },
          sound: 'default',
        },
        trigger: null,
      });

      consoleSpy.mockRestore();
    });

    it('should schedule delayed notification', async () => {
      const Notif = require('expo-notifications');
      Notif.scheduleNotificationAsync.mockResolvedValueOnce('notif-delayed-456');

      jest.spyOn(console, 'log').mockImplementation();

      const result = await notificationService.scheduleLocalNotification(
        'Delayed Title',
        'Delayed Body',
        { type: 'system' },
        60
      );

      expect(result).toBe('notif-delayed-456');
      expect(Notif.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Delayed Title',
          body: 'Delayed Body',
          data: { type: 'system' },
          sound: 'default',
        },
        trigger: {
          type: 'timeInterval',
          seconds: 60,
        },
      });
    });

    it('should schedule notification without data', async () => {
      const Notif = require('expo-notifications');
      Notif.scheduleNotificationAsync.mockResolvedValueOnce('notif-no-data');

      jest.spyOn(console, 'log').mockImplementation();

      await notificationService.scheduleLocalNotification('Simple', 'Notification');

      expect(Notif.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Simple',
          body: 'Notification',
          data: undefined,
          sound: 'default',
        },
        trigger: null,
      });
    });
  });

  describe('cancelNotification', () => {
    it('should cancel a specific notification', async () => {
      const Notif = require('expo-notifications');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await notificationService.cancelNotification('notif-to-cancel');

      expect(Notif.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-to-cancel');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[NotificationService] Notification cancelled:',
        'notif-to-cancel'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('cancelAllNotifications', () => {
    it('should cancel all scheduled notifications', async () => {
      const Notif = require('expo-notifications');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await notificationService.cancelAllNotifications();

      expect(Notif.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('[NotificationService] All notifications cancelled');

      consoleSpy.mockRestore();
    });
  });

  describe('badge management', () => {
    it('should get badge count', async () => {
      const Notif = require('expo-notifications');
      Notif.getBadgeCountAsync.mockResolvedValueOnce(5);

      const count = await notificationService.getBadgeCount();

      expect(count).toBe(5);
      expect(Notif.getBadgeCountAsync).toHaveBeenCalled();
    });

    it('should set badge count', async () => {
      const Notif = require('expo-notifications');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await notificationService.setBadgeCount(10);

      expect(Notif.setBadgeCountAsync).toHaveBeenCalledWith(10);
      expect(consoleSpy).toHaveBeenCalledWith('[NotificationService] Badge count set to:', 10);

      consoleSpy.mockRestore();
    });

    it('should clear badge', async () => {
      const Notif = require('expo-notifications');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await notificationService.clearBadge();

      expect(Notif.setBadgeCountAsync).toHaveBeenCalledWith(0);

      consoleSpy.mockRestore();
    });
  });

  describe('isEnabled', () => {
    it('should return true when permissions granted on device', async () => {
      const Notif = require('expo-notifications');
      Notif.getPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });

      const result = await notificationService.isEnabled();

      expect(result).toBe(true);
    });

    it('should return false when permissions denied', async () => {
      const Notif = require('expo-notifications');
      Notif.getPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });

      const result = await notificationService.isEnabled();

      expect(result).toBe(false);
    });

    it('should return false on non-physical device', async () => {
      mockIsDevice = false;
      jest.resetModules();
      const { notificationService: ns } = require('../../src/services/notifications');

      const result = await ns.isEnabled();

      expect(result).toBe(false);
    });
  });

  describe('getToken', () => {
    it('should return null initially', () => {
      const token = notificationService.getToken();

      expect(token).toBeNull();
    });

    it('should return token after registration', async () => {
      const Notif = require('expo-notifications');
      Notif.getPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
      Notif.getExpoPushTokenAsync.mockResolvedValueOnce({ data: 'ExponentPushToken[stored]' });

      jest.spyOn(console, 'log').mockImplementation();

      await notificationService.registerForPushNotifications();
      const token = notificationService.getToken();

      expect(token).toBe('ExponentPushToken[stored]');
    });
  });

  describe('cleanup', () => {
    it('should remove notification listeners', async () => {
      await notificationService.initialize();

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      notificationService.cleanup();

      expect(mockRemove).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith('[NotificationService] Cleaned up');

      consoleSpy.mockRestore();
    });

    it('should handle cleanup when listeners not set', () => {
      // Fresh service without initialization
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Should not throw
      notificationService.cleanup();

      expect(consoleSpy).toHaveBeenCalledWith('[NotificationService] Cleaned up');

      consoleSpy.mockRestore();
    });
  });
});

describe('Notification handler configuration', () => {
  it('should configure notification handler on module load', () => {
    jest.resetModules();

    // Re-mock before importing
    jest.doMock('expo-notifications', () => ({
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
      AndroidImportance: { HIGH: 4, MAX: 5, LOW: 2 },
      SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
    }));

    // Import triggers the module-level setNotificationHandler call
    require('../../src/services/notifications');
    const Notif = require('expo-notifications');

    expect(Notif.setNotificationHandler).toHaveBeenCalledWith(
      expect.objectContaining({
        handleNotification: expect.any(Function),
      })
    );
  });

  it('should return correct notification handling options', async () => {
    jest.resetModules();

    let capturedHandler: any = null;

    jest.doMock('expo-notifications', () => ({
      setNotificationHandler: jest.fn((handler) => {
        capturedHandler = handler;
      }),
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
      AndroidImportance: { HIGH: 4, MAX: 5, LOW: 2 },
      SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
    }));

    require('../../src/services/notifications');

    expect(capturedHandler).not.toBeNull();
    if (capturedHandler) {
      const result = await capturedHandler.handleNotification();
      expect(result).toEqual({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      });
    }
  });
});

describe('Expo Notifications API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  describe('scheduling', () => {
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

  describe('listeners', () => {
    it('should add notification received listener', () => {
      const callback = jest.fn();
      const subscription = Notifications.addNotificationReceivedListener(callback);

      expect(mockNotifications.addNotificationReceivedListener).toHaveBeenCalledWith(callback);
      expect(subscription.remove).toBeDefined();
    });

    it('should add notification response listener', () => {
      const callback = jest.fn();
      const subscription = Notifications.addNotificationResponseReceivedListener(callback);

      expect(mockNotifications.addNotificationResponseReceivedListener).toHaveBeenCalledWith(
        callback
      );
      expect(subscription.remove).toBeDefined();
    });
  });

  describe('Android channels', () => {
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
});

describe('Android platform specific tests', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('should setup Android channels on Android platform', async () => {
    // Mock Platform.OS as android
    jest.doMock('react-native', () => ({
      Platform: {
        OS: 'android',
      },
    }));

    jest.doMock('expo-notifications', () => ({
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
      AndroidImportance: { HIGH: 4, MAX: 5, LOW: 2 },
      SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
    }));

    const { notificationService } = require('../../src/services/notifications');
    const Notif = require('expo-notifications');

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await notificationService.initialize();

    // Should create 3 channels: default, urgent, silent
    expect(Notif.setNotificationChannelAsync).toHaveBeenCalledTimes(3);
    expect(Notif.setNotificationChannelAsync).toHaveBeenCalledWith('default', expect.objectContaining({
      name: 'Уведомления',
      importance: 4, // HIGH
    }));
    expect(Notif.setNotificationChannelAsync).toHaveBeenCalledWith('urgent', expect.objectContaining({
      name: 'Срочные задачи',
      importance: 5, // MAX
    }));
    expect(Notif.setNotificationChannelAsync).toHaveBeenCalledWith('silent', expect.objectContaining({
      name: 'Фоновые обновления',
      importance: 2, // LOW
    }));

    expect(consoleSpy).toHaveBeenCalledWith('[NotificationService] Android channels created');

    consoleSpy.mockRestore();
  });

  it('should skip Android channels on iOS', async () => {
    // Mock Platform.OS as ios
    jest.doMock('react-native', () => ({
      Platform: {
        OS: 'ios',
      },
    }));

    jest.doMock('expo-notifications', () => ({
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
      AndroidImportance: { HIGH: 4, MAX: 5, LOW: 2 },
      SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
    }));

    const { notificationService } = require('../../src/services/notifications');
    const Notif = require('expo-notifications');

    jest.spyOn(console, 'log').mockImplementation();

    await notificationService.initialize();

    // Should NOT create channels on iOS
    expect(Notif.setNotificationChannelAsync).not.toHaveBeenCalled();
  });
});

describe('Notification listener callbacks', () => {
  let notificationReceivedCallback: any;
  let notificationResponseCallback: any;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    notificationReceivedCallback = null;
    notificationResponseCallback = null;

    jest.doMock('react-native', () => ({
      Platform: {
        OS: 'ios',
      },
    }));

    jest.doMock('expo-notifications', () => ({
      setNotificationHandler: jest.fn(),
      addNotificationReceivedListener: jest.fn((callback) => {
        notificationReceivedCallback = callback;
        return { remove: jest.fn() };
      }),
      addNotificationResponseReceivedListener: jest.fn((callback) => {
        notificationResponseCallback = callback;
        return { remove: jest.fn() };
      }),
      getPermissionsAsync: jest.fn(),
      requestPermissionsAsync: jest.fn(),
      getExpoPushTokenAsync: jest.fn(),
      scheduleNotificationAsync: jest.fn(),
      cancelScheduledNotificationAsync: jest.fn(),
      cancelAllScheduledNotificationsAsync: jest.fn(),
      setBadgeCountAsync: jest.fn(),
      getBadgeCountAsync: jest.fn(),
      setNotificationChannelAsync: jest.fn(),
      AndroidImportance: { HIGH: 4, MAX: 5, LOW: 2 },
      SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
    }));

    jest.doMock('expo-device', () => ({
      get isDevice() { return true; },
      deviceName: 'Test Device',
      modelName: 'Test Model',
      osVersion: '16.0',
    }));

    jest.doMock('expo-constants', () => ({
      expoConfig: { extra: { eas: { projectId: 'test-project-id' } } },
    }));

    jest.doMock('../../src/services/api', () => ({
      __esModule: true,
      default: { getInstance: jest.fn(() => ({ post: jest.fn().mockResolvedValue({}) })) },
    }));
  });

  it('should handle notification received with task type', async () => {
    const { notificationService } = require('../../src/services/notifications');

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await notificationService.initialize();

    expect(notificationReceivedCallback).not.toBeNull();

    // Simulate receiving a task notification
    const mockNotification = {
      request: {
        content: {
          data: { type: 'task', id: 'task-123' },
        },
      },
    };

    notificationReceivedCallback(mockNotification);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[NotificationService] Notification received:',
      mockNotification
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      '[NotificationService] Task notification received, ID:',
      'task-123'
    );

    consoleSpy.mockRestore();
  });

  it('should handle notification received with non-task type', async () => {
    const { notificationService } = require('../../src/services/notifications');

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await notificationService.initialize();

    const mockNotification = {
      request: {
        content: {
          data: { type: 'system', message: 'Update available' },
        },
      },
    };

    notificationReceivedCallback(mockNotification);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[NotificationService] Notification received:',
      mockNotification
    );
    // Should NOT log task-specific message
    expect(consoleSpy).not.toHaveBeenCalledWith(
      '[NotificationService] Task notification received, ID:',
      expect.anything()
    );

    consoleSpy.mockRestore();
  });

  it('should handle notification tapped for task type', async () => {
    const { notificationService } = require('../../src/services/notifications');

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await notificationService.initialize();

    expect(notificationResponseCallback).not.toBeNull();

    const mockResponse = {
      notification: {
        request: {
          content: {
            data: { type: 'task', id: 'task-456' },
          },
        },
      },
    };

    notificationResponseCallback(mockResponse);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[NotificationService] Notification tapped:',
      mockResponse
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      '[NotificationService] Navigate to task:',
      'task-456'
    );

    consoleSpy.mockRestore();
  });

  it('should handle notification tapped for incident type', async () => {
    const { notificationService } = require('../../src/services/notifications');

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await notificationService.initialize();

    const mockResponse = {
      notification: {
        request: {
          content: {
            data: { type: 'incident', id: 'incident-789' },
          },
        },
      },
    };

    notificationResponseCallback(mockResponse);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[NotificationService] Navigate to incident:',
      'incident-789'
    );

    consoleSpy.mockRestore();
  });

  it('should handle notification tapped for system type', async () => {
    const { notificationService } = require('../../src/services/notifications');

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await notificationService.initialize();

    const mockResponse = {
      notification: {
        request: {
          content: {
            data: { type: 'system' },
          },
        },
      },
    };

    notificationResponseCallback(mockResponse);

    expect(consoleSpy).toHaveBeenCalledWith('[NotificationService] System notification');

    consoleSpy.mockRestore();
  });

  it('should handle notification tapped for unknown type', async () => {
    const { notificationService } = require('../../src/services/notifications');

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await notificationService.initialize();

    const mockResponse = {
      notification: {
        request: {
          content: {
            data: { type: 'unknown_type' },
          },
        },
      },
    };

    notificationResponseCallback(mockResponse);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[NotificationService] Unknown notification type:',
      'unknown_type'
    );

    consoleSpy.mockRestore();
  });

  it('should handle notification tapped with no data', async () => {
    const { notificationService } = require('../../src/services/notifications');

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await notificationService.initialize();

    const mockResponse = {
      notification: {
        request: {
          content: {
            data: null,
          },
        },
      },
    };

    // Should not throw
    notificationResponseCallback(mockResponse);

    expect(consoleSpy).toHaveBeenCalledWith(
      '[NotificationService] Notification tapped:',
      mockResponse
    );
    // Should return early without logging navigation
    expect(consoleSpy).not.toHaveBeenCalledWith(
      '[NotificationService] Navigate to task:',
      expect.anything()
    );

    consoleSpy.mockRestore();
  });

  it('should handle task notification without id', async () => {
    const { notificationService } = require('../../src/services/notifications');

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await notificationService.initialize();

    const mockResponse = {
      notification: {
        request: {
          content: {
            data: { type: 'task' }, // No id
          },
        },
      },
    };

    notificationResponseCallback(mockResponse);

    // Should not log navigation since there's no id
    expect(consoleSpy).not.toHaveBeenCalledWith(
      '[NotificationService] Navigate to task:',
      expect.anything()
    );

    consoleSpy.mockRestore();
  });

  it('should handle incident notification without id', async () => {
    const { notificationService } = require('../../src/services/notifications');

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await notificationService.initialize();

    const mockResponse = {
      notification: {
        request: {
          content: {
            data: { type: 'incident' }, // No id
          },
        },
      },
    };

    notificationResponseCallback(mockResponse);

    // Should not log navigation since there's no id
    expect(consoleSpy).not.toHaveBeenCalledWith(
      '[NotificationService] Navigate to incident:',
      expect.anything()
    );

    consoleSpy.mockRestore();
  });
});

describe('Edge cases with null device properties', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('should use fallback values when device properties are null', async () => {
    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
    }));

    jest.doMock('expo-device', () => ({
      get isDevice() { return true; },
      deviceName: null,
      modelName: null,
      osVersion: null,
    }));

    jest.doMock('expo-constants', () => ({
      expoConfig: { extra: { eas: { projectId: 'test-project' } } },
    }));

    const mockPostFn = jest.fn().mockResolvedValue({});
    jest.doMock('../../src/services/api', () => ({
      __esModule: true,
      default: { getInstance: jest.fn(() => ({ post: mockPostFn })) },
    }));

    jest.doMock('expo-notifications', () => ({
      setNotificationHandler: jest.fn(),
      addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
      addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
      getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
      requestPermissionsAsync: jest.fn(),
      getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[test]' }),
      scheduleNotificationAsync: jest.fn(),
      cancelScheduledNotificationAsync: jest.fn(),
      cancelAllScheduledNotificationsAsync: jest.fn(),
      setBadgeCountAsync: jest.fn(),
      getBadgeCountAsync: jest.fn(),
      setNotificationChannelAsync: jest.fn(),
      AndroidImportance: { HIGH: 4, MAX: 5, LOW: 2 },
      SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
    }));

    const { notificationService } = require('../../src/services/notifications');

    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    await notificationService.registerForPushNotifications();

    // Should use fallback values for null device properties
    expect(mockPostFn).toHaveBeenCalledWith('/devices/register', {
      token: 'ExponentPushToken[test]',
      platform: 'ios',
      device_name: 'Unknown Device',
      device_model: 'Unknown Model',
      os_version: 'Unknown',
    });
  });

  it('should handle missing projectId gracefully', async () => {
    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
    }));

    jest.doMock('expo-device', () => ({
      get isDevice() { return true; },
      deviceName: 'Test Device',
      modelName: 'Test Model',
      osVersion: '16.0',
    }));

    // projectId is undefined
    jest.doMock('expo-constants', () => ({
      expoConfig: { extra: {} },
    }));

    const mockPostFn = jest.fn().mockResolvedValue({});
    jest.doMock('../../src/services/api', () => ({
      __esModule: true,
      default: { getInstance: jest.fn(() => ({ post: mockPostFn })) },
    }));

    const mockGetToken = jest.fn().mockResolvedValue({ data: 'ExponentPushToken[noproject]' });
    jest.doMock('expo-notifications', () => ({
      setNotificationHandler: jest.fn(),
      addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
      addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
      getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
      requestPermissionsAsync: jest.fn(),
      getExpoPushTokenAsync: mockGetToken,
      scheduleNotificationAsync: jest.fn(),
      cancelScheduledNotificationAsync: jest.fn(),
      cancelAllScheduledNotificationsAsync: jest.fn(),
      setBadgeCountAsync: jest.fn(),
      getBadgeCountAsync: jest.fn(),
      setNotificationChannelAsync: jest.fn(),
      AndroidImportance: { HIGH: 4, MAX: 5, LOW: 2 },
      SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
    }));

    const { notificationService } = require('../../src/services/notifications');

    jest.spyOn(console, 'log').mockImplementation();

    const result = await notificationService.registerForPushNotifications();

    expect(result).toBe('ExponentPushToken[noproject]');
    // getExpoPushTokenAsync should be called with undefined projectId
    expect(mockGetToken).toHaveBeenCalledWith({ projectId: undefined });
  });

  it('should handle null expoConfig', async () => {
    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios' },
    }));

    jest.doMock('expo-device', () => ({
      get isDevice() { return true; },
      deviceName: 'Test',
      modelName: 'Test',
      osVersion: '16',
    }));

    // expoConfig is null
    jest.doMock('expo-constants', () => ({
      expoConfig: null,
    }));

    const mockPostFn = jest.fn().mockResolvedValue({});
    jest.doMock('../../src/services/api', () => ({
      __esModule: true,
      default: { getInstance: jest.fn(() => ({ post: mockPostFn })) },
    }));

    const mockGetToken = jest.fn().mockResolvedValue({ data: 'ExponentPushToken[nullconfig]' });
    jest.doMock('expo-notifications', () => ({
      setNotificationHandler: jest.fn(),
      addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
      addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
      getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
      requestPermissionsAsync: jest.fn(),
      getExpoPushTokenAsync: mockGetToken,
      scheduleNotificationAsync: jest.fn(),
      cancelScheduledNotificationAsync: jest.fn(),
      cancelAllScheduledNotificationsAsync: jest.fn(),
      setBadgeCountAsync: jest.fn(),
      getBadgeCountAsync: jest.fn(),
      setNotificationChannelAsync: jest.fn(),
      AndroidImportance: { HIGH: 4, MAX: 5, LOW: 2 },
      SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
    }));

    const { notificationService } = require('../../src/services/notifications');

    jest.spyOn(console, 'log').mockImplementation();

    const result = await notificationService.registerForPushNotifications();

    expect(result).toBe('ExponentPushToken[nullconfig]');
    expect(mockGetToken).toHaveBeenCalledWith({ projectId: undefined });
  });
});
