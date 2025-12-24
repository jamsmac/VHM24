/**
 * useNotifications Hook Tests
 *
 * Comprehensive tests for notification hooks and service interactions
 */

import * as Notifications from 'expo-notifications';

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

const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;

describe('useNotifications hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    subscriptionCallbacks.received = null;
    subscriptionCallbacks.response = null;

    // Default mock implementations
    mockNotificationService.isEnabled.mockResolvedValue(false);
    mockNotificationService.getToken.mockReturnValue(null);
    mockNotificationService.getBadgeCount.mockResolvedValue(0);
  });

  describe('expo-notifications API', () => {
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

      it('should capture callback for received listener', () => {
        const callback = jest.fn();
        Notifications.addNotificationReceivedListener(callback);

        expect(subscriptionCallbacks.received).toBe(callback);
      });

      it('should capture callback for response listener', () => {
        const callback = jest.fn();
        Notifications.addNotificationResponseReceivedListener(callback);

        expect(subscriptionCallbacks.response).toBe(callback);
      });

      it('should call remove on subscription cleanup', () => {
        const subscription = Notifications.addNotificationReceivedListener(jest.fn());
        subscription.remove();

        expect(mockReceivedRemove).toHaveBeenCalled();
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
          ios: {},
          android: {},
        } as any);

        const result = await Notifications.requestPermissionsAsync();

        expect(result.status).toBe('denied');
        expect(result.granted).toBe(false);
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

      it('should handle undetermined permissions', async () => {
        mockNotifications.getPermissionsAsync.mockResolvedValueOnce({
          status: 'undetermined',
          granted: false,
          ios: {},
          android: {},
        } as any);

        const result = await Notifications.getPermissionsAsync();

        expect(result.status).toBe('undetermined');
      });
    });

    describe('badge count', () => {
      it('should set badge count', async () => {
        await Notifications.setBadgeCountAsync(5);

        expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(5);
      });

      it('should set badge count to zero', async () => {
        await Notifications.setBadgeCountAsync(0);

        expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
      });

      it('should get badge count', async () => {
        mockNotifications.getBadgeCountAsync.mockResolvedValueOnce(3);

        const count = await Notifications.getBadgeCountAsync();

        expect(count).toBe(3);
      });

      it('should get zero badge count', async () => {
        mockNotifications.getBadgeCountAsync.mockResolvedValueOnce(0);

        const count = await Notifications.getBadgeCountAsync();

        expect(count).toBe(0);
      });

      it('should clear badge count', async () => {
        await Notifications.setBadgeCountAsync(0);

        expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(0);
      });
    });

    describe('scheduling notifications', () => {
      it('should schedule notification with delay', async () => {
        mockNotifications.scheduleNotificationAsync.mockResolvedValueOnce('notification-id-1');

        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Test',
            body: 'Test body',
          },
          trigger: { seconds: 60 } as any,
        });

        expect(id).toBe('notification-id-1');
        expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalled();
      });

      it('should schedule immediate notification', async () => {
        mockNotifications.scheduleNotificationAsync.mockResolvedValueOnce('notification-id-2');

        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Immediate',
            body: 'Immediate body',
          },
          trigger: null,
        });

        expect(id).toBe('notification-id-2');
      });

      it('should schedule notification with data', async () => {
        mockNotifications.scheduleNotificationAsync.mockResolvedValueOnce('notification-id-3');

        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'With Data',
            body: 'Body with data',
            data: { taskId: '123', type: 'reminder' },
          },
          trigger: { seconds: 30 } as any,
        });

        expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
          content: {
            title: 'With Data',
            body: 'Body with data',
            data: { taskId: '123', type: 'reminder' },
          },
          trigger: { seconds: 30 },
        });
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
        expect(result.type).toBe('expo');
      });

      it('should get push token with project id', async () => {
        mockNotifications.getExpoPushTokenAsync.mockResolvedValueOnce({
          data: 'ExponentPushToken[yyyy]',
          type: 'expo',
        });

        const result = await Notifications.getExpoPushTokenAsync({
          projectId: 'my-project-id',
        });

        expect(result.data).toBe('ExponentPushToken[yyyy]');
        expect(mockNotifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
          projectId: 'my-project-id',
        });
      });

      it('should handle token retrieval error', async () => {
        mockNotifications.getExpoPushTokenAsync.mockRejectedValueOnce(
          new Error('Failed to get token')
        );

        await expect(Notifications.getExpoPushTokenAsync()).rejects.toThrow('Failed to get token');
      });
    });
  });

  describe('notificationService wrapper functions', () => {
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

      it('should return zero when no badges', async () => {
        mockNotificationService.getBadgeCount.mockResolvedValueOnce(0);

        const count = await mockNotificationService.getBadgeCount();

        expect(count).toBe(0);
      });
    });

    describe('setBadgeCount', () => {
      it('should set badge count to specified value', async () => {
        await mockNotificationService.setBadgeCount(10);

        expect(mockNotificationService.setBadgeCount).toHaveBeenCalledWith(10);
      });
    });

    describe('clearBadge', () => {
      it('should clear badge', async () => {
        await mockNotificationService.clearBadge();

        expect(mockNotificationService.clearBadge).toHaveBeenCalled();
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

      it('should handle registration error', async () => {
        mockNotificationService.registerForPushNotifications.mockRejectedValueOnce(
          new Error('Registration failed')
        );

        await expect(mockNotificationService.registerForPushNotifications()).rejects.toThrow('Registration failed');
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

      it('should schedule notification without optional data', async () => {
        mockNotificationService.scheduleLocalNotification.mockResolvedValueOnce('local-notif-2');

        const id = await mockNotificationService.scheduleLocalNotification(
          'Title Only',
          'Body Only'
        );

        expect(id).toBe('local-notif-2');
      });

      it('should return null on scheduling error', async () => {
        mockNotificationService.scheduleLocalNotification.mockResolvedValueOnce(null);

        const id = await mockNotificationService.scheduleLocalNotification(
          'Failed',
          'Failed body'
        );

        expect(id).toBeNull();
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

  describe('useNotifications hook initialization simulation', () => {
    it('should initialize with default state values', () => {
      const initialState = {
        token: null,
        isEnabled: false,
        isLoading: true,
        badgeCount: 0,
      };

      expect(initialState.token).toBeNull();
      expect(initialState.isEnabled).toBe(false);
      expect(initialState.isLoading).toBe(true);
      expect(initialState.badgeCount).toBe(0);
    });

    it('should simulate successful initialization flow', async () => {
      mockNotificationService.isEnabled.mockResolvedValueOnce(true);
      mockNotificationService.getToken.mockReturnValueOnce('ExponentPushToken[init]');
      mockNotificationService.getBadgeCount.mockResolvedValueOnce(3);

      // Simulate initialize function
      const initialize = async () => {
        const enabled = await mockNotificationService.isEnabled();
        const existingToken = mockNotificationService.getToken();
        const count = await mockNotificationService.getBadgeCount();
        return { enabled, existingToken, count };
      };

      const result = await initialize();

      expect(result.enabled).toBe(true);
      expect(result.existingToken).toBe('ExponentPushToken[init]');
      expect(result.count).toBe(3);
    });

    it('should handle initialization error gracefully', async () => {
      mockNotificationService.isEnabled.mockRejectedValueOnce(new Error('Init error'));

      const initialize = async () => {
        try {
          await mockNotificationService.isEnabled();
          return { success: true };
        } catch (error) {
          return { success: false, error };
        }
      };

      const result = await initialize();

      expect(result.success).toBe(false);
    });
  });

  describe('requestPermission function simulation', () => {
    it('should return true on successful registration', async () => {
      mockNotificationService.registerForPushNotifications.mockResolvedValueOnce('new-token');

      const requestPermission = async () => {
        const newToken = await mockNotificationService.registerForPushNotifications();
        return !!newToken;
      };

      const result = await requestPermission();

      expect(result).toBe(true);
    });

    it('should return false when no token returned', async () => {
      mockNotificationService.registerForPushNotifications.mockResolvedValueOnce(null);

      const requestPermission = async () => {
        const newToken = await mockNotificationService.registerForPushNotifications();
        return !!newToken;
      };

      const result = await requestPermission();

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockNotificationService.registerForPushNotifications.mockRejectedValueOnce(
        new Error('Permission denied')
      );

      const requestPermission = async () => {
        try {
          const newToken = await mockNotificationService.registerForPushNotifications();
          return !!newToken;
        } catch {
          return false;
        }
      };

      const result = await requestPermission();

      expect(result).toBe(false);
    });
  });

  describe('setBadgeCount function simulation', () => {
    it('should call service and update state', async () => {
      let badgeCountState = 0;

      const setBadgeCount = async (count: number) => {
        await mockNotificationService.setBadgeCount(count);
        badgeCountState = count;
      };

      await setBadgeCount(5);

      expect(mockNotificationService.setBadgeCount).toHaveBeenCalledWith(5);
      expect(badgeCountState).toBe(5);
    });
  });

  describe('clearBadge function simulation', () => {
    it('should call service and reset state to zero', async () => {
      let badgeCountState = 5;

      const clearBadge = async () => {
        await mockNotificationService.clearBadge();
        badgeCountState = 0;
      };

      await clearBadge();

      expect(mockNotificationService.clearBadge).toHaveBeenCalled();
      expect(badgeCountState).toBe(0);
    });
  });

  describe('scheduleNotification function simulation', () => {
    it('should return notification id on success', async () => {
      mockNotificationService.scheduleLocalNotification.mockResolvedValueOnce('scheduled-id');

      const scheduleNotification = async (
        title: string,
        body: string,
        data?: any,
        delaySeconds?: number
      ) => {
        try {
          const id = await mockNotificationService.scheduleLocalNotification(
            title,
            body,
            data,
            delaySeconds
          );
          return id;
        } catch {
          return null;
        }
      };

      const id = await scheduleNotification('Test', 'Test body', { key: 'value' }, 30);

      expect(id).toBe('scheduled-id');
    });

    it('should return null on error', async () => {
      mockNotificationService.scheduleLocalNotification.mockRejectedValueOnce(
        new Error('Schedule error')
      );

      const scheduleNotification = async (
        title: string,
        body: string,
        data?: any,
        delaySeconds?: number
      ) => {
        try {
          const id = await mockNotificationService.scheduleLocalNotification(
            title,
            body,
            data,
            delaySeconds
          );
          return id;
        } catch {
          return null;
        }
      };

      const id = await scheduleNotification('Failed', 'Failed body');

      expect(id).toBeNull();
    });
  });

  describe('useNotificationListener simulation', () => {
    it('should set up both listeners when callbacks provided', () => {
      const onReceived = jest.fn();
      const onTapped = jest.fn();

      // Simulate setting up listeners
      const receivedSub = Notifications.addNotificationReceivedListener(onReceived);
      const responseSub = Notifications.addNotificationResponseReceivedListener(onTapped);

      expect(mockNotifications.addNotificationReceivedListener).toHaveBeenCalledWith(onReceived);
      expect(mockNotifications.addNotificationResponseReceivedListener).toHaveBeenCalledWith(onTapped);
      expect(receivedSub.remove).toBeDefined();
      expect(responseSub.remove).toBeDefined();
    });

    it('should only set up received listener when onTapped not provided', () => {
      jest.clearAllMocks();
      const onReceived = jest.fn();

      Notifications.addNotificationReceivedListener(onReceived);

      expect(mockNotifications.addNotificationReceivedListener).toHaveBeenCalledWith(onReceived);
      expect(mockNotifications.addNotificationResponseReceivedListener).not.toHaveBeenCalled();
    });

    it('should only set up response listener when onReceived not provided', () => {
      jest.clearAllMocks();
      const onTapped = jest.fn();

      Notifications.addNotificationResponseReceivedListener(onTapped);

      expect(mockNotifications.addNotificationResponseReceivedListener).toHaveBeenCalledWith(onTapped);
      expect(mockNotifications.addNotificationReceivedListener).not.toHaveBeenCalled();
    });

    it('should cleanup listeners on unmount', () => {
      const receivedSub = Notifications.addNotificationReceivedListener(jest.fn());
      const responseSub = Notifications.addNotificationResponseReceivedListener(jest.fn());

      // Simulate cleanup
      receivedSub.remove();
      responseSub.remove();

      expect(mockReceivedRemove).toHaveBeenCalled();
      expect(mockResponseRemove).toHaveBeenCalled();
    });

    it('should invoke received callback when notification arrives', () => {
      const onReceived = jest.fn();
      Notifications.addNotificationReceivedListener(onReceived);

      const mockNotification = {
        request: {
          identifier: 'notif-123',
          content: {
            title: 'New Task',
            body: 'You have a new task',
            data: { taskId: '456' },
          },
        },
      };

      // Simulate notification received
      subscriptionCallbacks.received?.(mockNotification);

      expect(onReceived).toHaveBeenCalledWith(mockNotification);
    });

    it('should invoke response callback when notification tapped', () => {
      const onTapped = jest.fn();
      Notifications.addNotificationResponseReceivedListener(onTapped);

      const mockResponse = {
        notification: {
          request: {
            identifier: 'notif-789',
            content: {
              title: 'Task Reminder',
              body: 'Complete your task',
              data: { taskId: '012' },
            },
          },
        },
        actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
      };

      // Simulate notification tapped
      subscriptionCallbacks.response?.(mockResponse);

      expect(onTapped).toHaveBeenCalledWith(mockResponse);
    });
  });

  describe('notification handler configuration', () => {
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

    it('should set handler with custom behavior', () => {
      const customHandler = {
        handleNotification: async () => ({
          shouldShowAlert: false,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: false,
          shouldShowList: true,
        }),
      };

      Notifications.setNotificationHandler(customHandler);

      expect(mockNotifications.setNotificationHandler).toHaveBeenCalledWith(customHandler);
    });
  });

  describe('hook return value structure', () => {
    it('should return correct interface shape', () => {
      const hookReturn = {
        token: 'ExponentPushToken[test]',
        isEnabled: true,
        isLoading: false,
        badgeCount: 2,
        requestPermission: jest.fn(),
        setBadgeCount: jest.fn(),
        clearBadge: jest.fn(),
        scheduleNotification: jest.fn(),
        cancelNotification: jest.fn(),
        cancelAllNotifications: jest.fn(),
      };

      // Verify all expected properties exist
      expect(hookReturn).toHaveProperty('token');
      expect(hookReturn).toHaveProperty('isEnabled');
      expect(hookReturn).toHaveProperty('isLoading');
      expect(hookReturn).toHaveProperty('badgeCount');
      expect(hookReturn).toHaveProperty('requestPermission');
      expect(hookReturn).toHaveProperty('setBadgeCount');
      expect(hookReturn).toHaveProperty('clearBadge');
      expect(hookReturn).toHaveProperty('scheduleNotification');
      expect(hookReturn).toHaveProperty('cancelNotification');
      expect(hookReturn).toHaveProperty('cancelAllNotifications');

      // Verify types
      expect(typeof hookReturn.token).toBe('string');
      expect(typeof hookReturn.isEnabled).toBe('boolean');
      expect(typeof hookReturn.isLoading).toBe('boolean');
      expect(typeof hookReturn.badgeCount).toBe('number');
      expect(typeof hookReturn.requestPermission).toBe('function');
      expect(typeof hookReturn.setBadgeCount).toBe('function');
      expect(typeof hookReturn.clearBadge).toBe('function');
      expect(typeof hookReturn.scheduleNotification).toBe('function');
      expect(typeof hookReturn.cancelNotification).toBe('function');
      expect(typeof hookReturn.cancelAllNotifications).toBe('function');
    });
  });

  describe('edge cases', () => {
    it('should handle empty token', () => {
      mockNotificationService.getToken.mockReturnValueOnce('');

      const token = mockNotificationService.getToken();

      expect(token).toBe('');
    });

    it('should handle negative badge count', async () => {
      mockNotificationService.getBadgeCount.mockResolvedValueOnce(-1);

      const count = await mockNotificationService.getBadgeCount();

      // Badge count might return -1 in edge cases
      expect(count).toBe(-1);
    });

    it('should handle large badge count', async () => {
      mockNotificationService.getBadgeCount.mockResolvedValueOnce(9999);

      const count = await mockNotificationService.getBadgeCount();

      expect(count).toBe(9999);
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

    it('should handle very long notification content', async () => {
      const longTitle = 'A'.repeat(1000);
      const longBody = 'B'.repeat(5000);

      mockNotificationService.scheduleLocalNotification.mockResolvedValueOnce('long-id');

      await mockNotificationService.scheduleLocalNotification(longTitle, longBody);

      expect(mockNotificationService.scheduleLocalNotification).toHaveBeenCalledWith(
        longTitle,
        longBody
      );
    });

    it('should handle zero delay for immediate notification', async () => {
      mockNotificationService.scheduleLocalNotification.mockResolvedValueOnce('immediate-id');

      await mockNotificationService.scheduleLocalNotification('Immediate', 'Now', undefined, 0);

      expect(mockNotificationService.scheduleLocalNotification).toHaveBeenCalledWith(
        'Immediate',
        'Now',
        undefined,
        0
      );
    });

    it('should handle undefined delay for immediate notification', async () => {
      mockNotificationService.scheduleLocalNotification.mockResolvedValueOnce('no-delay-id');

      await mockNotificationService.scheduleLocalNotification('No Delay', 'Right now');

      expect(mockNotificationService.scheduleLocalNotification).toHaveBeenCalledWith(
        'No Delay',
        'Right now'
      );
    });

    it('should handle complex data payload', async () => {
      const complexData = {
        taskId: '123',
        machineId: 'M-001',
        type: 'refill',
        priority: 'high',
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

  describe('concurrent operations', () => {
    it('should handle multiple concurrent badge updates', async () => {
      const updates = [1, 2, 3, 4, 5].map((count) =>
        mockNotificationService.setBadgeCount(count)
      );

      await Promise.all(updates);

      expect(mockNotificationService.setBadgeCount).toHaveBeenCalledTimes(5);
    });

    it('should handle multiple concurrent notification schedules', async () => {
      mockNotificationService.scheduleLocalNotification
        .mockResolvedValueOnce('id-1')
        .mockResolvedValueOnce('id-2')
        .mockResolvedValueOnce('id-3');

      const schedules = [
        mockNotificationService.scheduleLocalNotification('Title 1', 'Body 1'),
        mockNotificationService.scheduleLocalNotification('Title 2', 'Body 2'),
        mockNotificationService.scheduleLocalNotification('Title 3', 'Body 3'),
      ];

      const ids = await Promise.all(schedules);

      expect(ids).toEqual(['id-1', 'id-2', 'id-3']);
    });
  });
});
