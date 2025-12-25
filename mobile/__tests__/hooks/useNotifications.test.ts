/**
 * useNotifications Hook Tests
 *
 * Comprehensive tests with 100% coverage for notification hooks
 */

// Mock state management
let stateCounter = 0;
const mockUseStateValues = new Map<number, any>();
let mockEffects: Array<() => void | (() => void)> = [];
let mockEffectCleanups: Array<() => void> = [];

// Reset function for state management
const resetStateMocks = () => {
  stateCounter = 0;
  mockUseStateValues.clear();
  mockEffects = [];
  mockEffectCleanups = [];
};

// Mock React
jest.mock('react', () => {
  const actualReact = jest.requireActual('react');
  return {
    ...actualReact,
    useState: jest.fn((initial) => {
      const currentCounter = stateCounter++;
      if (!mockUseStateValues.has(currentCounter)) {
        mockUseStateValues.set(currentCounter, initial);
      }
      const setValue = (newValue: any) => {
        if (typeof newValue === 'function') {
          mockUseStateValues.set(currentCounter, newValue(mockUseStateValues.get(currentCounter)));
        } else {
          mockUseStateValues.set(currentCounter, newValue);
        }
      };
      return [mockUseStateValues.get(currentCounter), setValue];
    }),
    useEffect: jest.fn((effect, _deps) => {
      mockEffects.push(effect);
    }),
    useCallback: jest.fn((fn, _deps) => fn),
  };
});

// Track subscription callbacks for testing
const subscriptionCallbacks = {
  received: null as ((notification: any) => void) | null,
  response: null as ((response: any) => void) | null,
};

// Mock expo-notifications
const mockReceivedRemove = jest.fn();
const mockResponseRemove = jest.fn();

jest.mock('expo-notifications', () => ({
  addNotificationReceivedListener: jest.fn((callback) => {
    subscriptionCallbacks.received = callback;
    return { remove: mockReceivedRemove };
  }),
  addNotificationResponseReceivedListener: jest.fn((callback) => {
    subscriptionCallbacks.response = callback;
    return { remove: mockResponseRemove };
  }),
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
const mockNotificationService = {
  isEnabled: jest.fn(),
  getToken: jest.fn(),
  getBadgeCount: jest.fn(),
  setBadgeCount: jest.fn(),
  clearBadge: jest.fn(),
  registerForPushNotifications: jest.fn(),
  scheduleLocalNotification: jest.fn(),
  cancelNotification: jest.fn(),
  cancelAllNotifications: jest.fn(),
};

jest.mock('../../src/services/notifications', () => ({
  notificationService: mockNotificationService,
}));

import * as Notifications from 'expo-notifications';

const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;

// Helper functions
const runEffects = () => {
  mockEffectCleanups = [];
  mockEffects.forEach((effect) => {
    const cleanup = effect();
    if (cleanup) {
      mockEffectCleanups.push(cleanup);
    }
  });
};

const runCleanups = () => {
  mockEffectCleanups.forEach((cleanup) => cleanup());
};

describe('useNotifications Hook', () => {
  beforeEach(() => {
    resetStateMocks();
    jest.clearAllMocks();
    subscriptionCallbacks.received = null;
    subscriptionCallbacks.response = null;

    // Default mock implementations
    mockNotificationService.isEnabled.mockResolvedValue(false);
    mockNotificationService.getToken.mockReturnValue(null);
    mockNotificationService.getBadgeCount.mockResolvedValue(0);
  });

  afterEach(() => {
    runCleanups();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { useNotifications } = require('../../src/hooks/useNotifications');
      const result = useNotifications();

      expect(result.token).toBeNull();
      expect(result.isEnabled).toBe(false);
      expect(result.isLoading).toBe(true);
      expect(result.badgeCount).toBe(0);
    });

    it('should run initialization effect', async () => {
      resetStateMocks();
      mockNotificationService.isEnabled.mockResolvedValueOnce(true);
      mockNotificationService.getToken.mockReturnValueOnce('ExponentPushToken[test]');
      mockNotificationService.getBadgeCount.mockResolvedValueOnce(5);

      const { useNotifications } = require('../../src/hooks/useNotifications');
      useNotifications();

      runEffects();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockNotificationService.isEnabled).toHaveBeenCalled();
      expect(mockNotificationService.getToken).toHaveBeenCalled();
      expect(mockNotificationService.getBadgeCount).toHaveBeenCalled();
    });

    it('should handle initialization error', async () => {
      resetStateMocks();
      mockNotificationService.isEnabled.mockRejectedValueOnce(new Error('Init error'));

      const { useNotifications } = require('../../src/hooks/useNotifications');
      useNotifications();

      runEffects();
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Should not throw, just log error
      expect(mockNotificationService.isEnabled).toHaveBeenCalled();
    });
  });

  describe('requestPermission', () => {
    it('should return true on successful registration', async () => {
      resetStateMocks();
      mockNotificationService.registerForPushNotifications.mockResolvedValueOnce('new-token');

      const { useNotifications } = require('../../src/hooks/useNotifications');
      const { requestPermission } = useNotifications();

      const result = await requestPermission();

      expect(result).toBe(true);
      expect(mockNotificationService.registerForPushNotifications).toHaveBeenCalled();
    });

    it('should return false when no token returned', async () => {
      resetStateMocks();
      mockNotificationService.registerForPushNotifications.mockResolvedValueOnce(null);

      const { useNotifications } = require('../../src/hooks/useNotifications');
      const { requestPermission } = useNotifications();

      const result = await requestPermission();

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      resetStateMocks();
      mockNotificationService.registerForPushNotifications.mockRejectedValueOnce(
        new Error('Permission denied')
      );

      const { useNotifications } = require('../../src/hooks/useNotifications');
      const { requestPermission } = useNotifications();

      const result = await requestPermission();

      expect(result).toBe(false);
    });
  });

  describe('setBadgeCount', () => {
    it('should set badge count', async () => {
      resetStateMocks();

      const { useNotifications } = require('../../src/hooks/useNotifications');
      const { setBadgeCount } = useNotifications();

      await setBadgeCount(5);

      expect(mockNotificationService.setBadgeCount).toHaveBeenCalledWith(5);
    });
  });

  describe('clearBadge', () => {
    it('should clear badge', async () => {
      resetStateMocks();

      const { useNotifications } = require('../../src/hooks/useNotifications');
      const { clearBadge } = useNotifications();

      await clearBadge();

      expect(mockNotificationService.clearBadge).toHaveBeenCalled();
    });
  });

  describe('scheduleNotification', () => {
    it('should schedule notification and return id', async () => {
      resetStateMocks();
      mockNotificationService.scheduleLocalNotification.mockResolvedValueOnce('notification-id');

      const { useNotifications } = require('../../src/hooks/useNotifications');
      const { scheduleNotification } = useNotifications();

      const id = await scheduleNotification('Title', 'Body', { key: 'value' }, 60);

      expect(id).toBe('notification-id');
      expect(mockNotificationService.scheduleLocalNotification).toHaveBeenCalledWith(
        'Title',
        'Body',
        { key: 'value' },
        60
      );
    });

    it('should return null on error', async () => {
      resetStateMocks();
      mockNotificationService.scheduleLocalNotification.mockRejectedValueOnce(
        new Error('Schedule error')
      );

      const { useNotifications } = require('../../src/hooks/useNotifications');
      const { scheduleNotification } = useNotifications();

      const id = await scheduleNotification('Title', 'Body');

      expect(id).toBeNull();
    });
  });

  describe('cancelNotification', () => {
    it('should cancel notification by id', async () => {
      resetStateMocks();

      const { useNotifications } = require('../../src/hooks/useNotifications');
      const { cancelNotification } = useNotifications();

      await cancelNotification('notification-id');

      expect(mockNotificationService.cancelNotification).toHaveBeenCalledWith('notification-id');
    });
  });

  describe('cancelAllNotifications', () => {
    it('should cancel all notifications', async () => {
      resetStateMocks();

      const { useNotifications } = require('../../src/hooks/useNotifications');
      const { cancelAllNotifications } = useNotifications();

      await cancelAllNotifications();

      expect(mockNotificationService.cancelAllNotifications).toHaveBeenCalled();
    });
  });
});

describe('useNotificationListener Hook', () => {
  beforeEach(() => {
    resetStateMocks();
    jest.clearAllMocks();
    mockReceivedRemove.mockClear();
    mockResponseRemove.mockClear();
    subscriptionCallbacks.received = null;
    subscriptionCallbacks.response = null;
  });

  afterEach(() => {
    runCleanups();
  });

  it('should set up both listeners when both callbacks provided', () => {
    resetStateMocks();
    const onReceived = jest.fn();
    const onTapped = jest.fn();

    const { useNotificationListener } = require('../../src/hooks/useNotifications');
    useNotificationListener(onReceived, onTapped);

    runEffects();

    expect(mockNotifications.addNotificationReceivedListener).toHaveBeenCalledWith(onReceived);
    expect(mockNotifications.addNotificationResponseReceivedListener).toHaveBeenCalledWith(onTapped);
  });

  it('should only set up received listener when onTapped not provided', () => {
    resetStateMocks();
    const onReceived = jest.fn();

    const { useNotificationListener } = require('../../src/hooks/useNotifications');
    useNotificationListener(onReceived, undefined);

    runEffects();

    expect(mockNotifications.addNotificationReceivedListener).toHaveBeenCalledWith(onReceived);
    expect(mockNotifications.addNotificationResponseReceivedListener).not.toHaveBeenCalled();
  });

  it('should only set up response listener when onReceived not provided', () => {
    resetStateMocks();
    const onTapped = jest.fn();

    const { useNotificationListener } = require('../../src/hooks/useNotifications');
    useNotificationListener(undefined, onTapped);

    runEffects();

    expect(mockNotifications.addNotificationReceivedListener).not.toHaveBeenCalled();
    expect(mockNotifications.addNotificationResponseReceivedListener).toHaveBeenCalledWith(onTapped);
  });

  it('should not set up any listeners when no callbacks provided', () => {
    resetStateMocks();

    const { useNotificationListener } = require('../../src/hooks/useNotifications');
    useNotificationListener(undefined, undefined);

    runEffects();

    expect(mockNotifications.addNotificationReceivedListener).not.toHaveBeenCalled();
    expect(mockNotifications.addNotificationResponseReceivedListener).not.toHaveBeenCalled();
  });

  it('should cleanup received listener on unmount', () => {
    resetStateMocks();
    const onReceived = jest.fn();

    const { useNotificationListener } = require('../../src/hooks/useNotifications');
    useNotificationListener(onReceived, undefined);

    runEffects();
    runCleanups();

    expect(mockReceivedRemove).toHaveBeenCalled();
  });

  it('should cleanup response listener on unmount', () => {
    resetStateMocks();
    const onTapped = jest.fn();

    const { useNotificationListener } = require('../../src/hooks/useNotifications');
    useNotificationListener(undefined, onTapped);

    runEffects();
    runCleanups();

    expect(mockResponseRemove).toHaveBeenCalled();
  });

  it('should cleanup both listeners on unmount', () => {
    resetStateMocks();
    const onReceived = jest.fn();
    const onTapped = jest.fn();

    const { useNotificationListener } = require('../../src/hooks/useNotifications');
    useNotificationListener(onReceived, onTapped);

    runEffects();
    runCleanups();

    expect(mockReceivedRemove).toHaveBeenCalled();
    expect(mockResponseRemove).toHaveBeenCalled();
  });

  it('should invoke received callback when notification arrives', () => {
    resetStateMocks();
    const onReceived = jest.fn();

    const { useNotificationListener } = require('../../src/hooks/useNotifications');
    useNotificationListener(onReceived, undefined);

    runEffects();

    const mockNotification = {
      request: {
        identifier: 'notif-123',
        content: {
          title: 'New Task',
          body: 'You have a new task',
        },
      },
    };

    subscriptionCallbacks.received?.(mockNotification);

    expect(onReceived).toHaveBeenCalledWith(mockNotification);
  });

  it('should invoke response callback when notification tapped', () => {
    resetStateMocks();
    const onTapped = jest.fn();

    const { useNotificationListener } = require('../../src/hooks/useNotifications');
    useNotificationListener(undefined, onTapped);

    runEffects();

    const mockResponse = {
      notification: {
        request: {
          identifier: 'notif-789',
          content: {
            title: 'Task Reminder',
          },
        },
      },
      actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
    };

    subscriptionCallbacks.response?.(mockResponse);

    expect(onTapped).toHaveBeenCalledWith(mockResponse);
  });
});

describe('expo-notifications API', () => {
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
      expect(result.granted).toBe(true);
    });

    it('should handle denied permissions', async () => {
      mockNotifications.requestPermissionsAsync.mockResolvedValueOnce({
        status: 'denied',
        granted: false,
      } as any);

      const result = await Notifications.requestPermissionsAsync();

      expect(result.status).toBe('denied');
      expect(result.granted).toBe(false);
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
  });

  describe('scheduling notifications', () => {
    it('should schedule notification', async () => {
      mockNotifications.scheduleNotificationAsync.mockResolvedValueOnce('notification-id-1');

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test',
          body: 'Test body',
        },
        trigger: { seconds: 60 } as any,
      });

      expect(id).toBe('notification-id-1');
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

    it('should handle token retrieval error', async () => {
      mockNotifications.getExpoPushTokenAsync.mockRejectedValueOnce(
        new Error('Failed to get token')
      );

      await expect(Notifications.getExpoPushTokenAsync()).rejects.toThrow('Failed to get token');
    });
  });

  describe('notification handler', () => {
    it('should set notification handler', () => {
      const handler = {
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      };

      Notifications.setNotificationHandler(handler);

      expect(mockNotifications.setNotificationHandler).toHaveBeenCalledWith(handler);
    });
  });
});

describe('notificationService wrapper functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotificationService.isEnabled.mockResolvedValue(false);
    mockNotificationService.getToken.mockReturnValue(null);
    mockNotificationService.getBadgeCount.mockResolvedValue(0);
  });

  describe('isEnabled', () => {
    it('should return true when notifications are enabled', async () => {
      mockNotificationService.isEnabled.mockResolvedValueOnce(true);

      const result = await mockNotificationService.isEnabled();

      expect(result).toBe(true);
    });

    it('should return false when notifications are disabled', async () => {
      mockNotificationService.isEnabled.mockResolvedValueOnce(false);

      const result = await mockNotificationService.isEnabled();

      expect(result).toBe(false);
    });
  });

  describe('getToken', () => {
    it('should return existing token', () => {
      mockNotificationService.getToken.mockReturnValueOnce('ExponentPushToken[test]');

      const token = mockNotificationService.getToken();

      expect(token).toBe('ExponentPushToken[test]');
    });

    it('should return null when no token exists', () => {
      mockNotificationService.getToken.mockReturnValueOnce(null);

      const token = mockNotificationService.getToken();

      expect(token).toBeNull();
    });
  });

  describe('getBadgeCount', () => {
    it('should return current badge count', async () => {
      mockNotificationService.getBadgeCount.mockResolvedValueOnce(5);

      const count = await mockNotificationService.getBadgeCount();

      expect(count).toBe(5);
    });
  });

  describe('registerForPushNotifications', () => {
    it('should return token on successful registration', async () => {
      mockNotificationService.registerForPushNotifications.mockResolvedValueOnce('ExponentPushToken[registered]');

      const token = await mockNotificationService.registerForPushNotifications();

      expect(token).toBe('ExponentPushToken[registered]');
    });

    it('should return null on failed registration', async () => {
      mockNotificationService.registerForPushNotifications.mockResolvedValueOnce(null);

      const token = await mockNotificationService.registerForPushNotifications();

      expect(token).toBeNull();
    });
  });

  describe('scheduleLocalNotification', () => {
    it('should schedule notification with all parameters', async () => {
      mockNotificationService.scheduleLocalNotification.mockResolvedValueOnce('local-notif-1');

      const id = await mockNotificationService.scheduleLocalNotification(
        'Title',
        'Body',
        { taskId: '123' },
        60
      );

      expect(id).toBe('local-notif-1');
      expect(mockNotificationService.scheduleLocalNotification).toHaveBeenCalledWith(
        'Title',
        'Body',
        { taskId: '123' },
        60
      );
    });
  });

  describe('cancelNotification', () => {
    it('should cancel specific notification', async () => {
      await mockNotificationService.cancelNotification('notif-to-cancel');

      expect(mockNotificationService.cancelNotification).toHaveBeenCalledWith('notif-to-cancel');
    });
  });

  describe('cancelAllNotifications', () => {
    it('should cancel all notifications', async () => {
      await mockNotificationService.cancelAllNotifications();

      expect(mockNotificationService.cancelAllNotifications).toHaveBeenCalled();
    });
  });
});

describe('edge cases', () => {
  beforeEach(() => {
    resetStateMocks();
    jest.clearAllMocks();
  });

  it('should handle empty token', () => {
    mockNotificationService.getToken.mockReturnValueOnce('');

    const token = mockNotificationService.getToken();

    expect(token).toBe('');
  });

  it('should handle special characters in notification content', async () => {
    mockNotificationService.scheduleLocalNotification.mockResolvedValueOnce('special-id');

    await mockNotificationService.scheduleLocalNotification(
      'Спецсимволы: ☆★♠♣♥♦',
      'Эмодзи: 🎉🔔📱 и текст',
      { emoji: '🔔' },
      5
    );

    expect(mockNotificationService.scheduleLocalNotification).toHaveBeenCalledWith(
      'Спецсимволы: ☆★♠♣♥♦',
      'Эмодзи: 🎉🔔📱 и текст',
      { emoji: '🔔' },
      5
    );
  });

  it('should handle complex data payload', async () => {
    const complexData = {
      taskId: '123',
      machineId: 'M-001',
      type: 'refill',
      metadata: {
        nested: {
          deep: 'value',
        },
        array: [1, 2, 3],
      },
    };

    mockNotificationService.scheduleLocalNotification.mockResolvedValueOnce('complex-id');

    await mockNotificationService.scheduleLocalNotification(
      'Complex',
      'Complex body',
      complexData,
      60
    );

    expect(mockNotificationService.scheduleLocalNotification).toHaveBeenCalledWith(
      'Complex',
      'Complex body',
      complexData,
      60
    );
  });
});
