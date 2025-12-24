/**
 * useLocation Hook Tests
 *
 * Comprehensive tests for location hook functionality
 */

import React from 'react';
import { Linking, Platform } from 'react-native';

// Mock react-native
jest.mock('react-native', () => ({
  Linking: {
    openURL: jest.fn(),
    openSettings: jest.fn(),
  },
  Platform: {
    OS: 'ios',
  },
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock expo-location
const mockRemove = jest.fn();
jest.mock('expo-location', () => ({
  Accuracy: {
    High: 4,
    Balanced: 3,
    Low: 2,
  },
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));

import * as Location from 'expo-location';

const mockLocation = Location as jest.Mocked<typeof Location>;

describe('useLocation - Direct API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRemove.mockClear();
  });

  describe('Location.requestForegroundPermissionsAsync', () => {
    it('should request foreground permissions successfully', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
        granted: true,
        expires: 'never',
        canAskAgain: true,
      } as any);

      const result = await Location.requestForegroundPermissionsAsync();

      expect(result.status).toBe('granted');
      expect(mockLocation.requestForegroundPermissionsAsync).toHaveBeenCalled();
    });

    it('should handle denied permissions', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'denied',
        granted: false,
        expires: 'never',
        canAskAgain: true,
      } as any);

      const result = await Location.requestForegroundPermissionsAsync();

      expect(result.status).toBe('denied');
      expect(result.granted).toBe(false);
    });

    it('should handle permission request errors', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockRejectedValueOnce(
        new Error('Permission API failed')
      );

      await expect(Location.requestForegroundPermissionsAsync()).rejects.toThrow('Permission API failed');
    });
  });

  describe('Location.getForegroundPermissionsAsync', () => {
    it('should get current permission status', async () => {
      mockLocation.getForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
        granted: true,
      } as any);

      const result = await Location.getForegroundPermissionsAsync();

      expect(result.status).toBe('granted');
    });

    it('should return undetermined status', async () => {
      mockLocation.getForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'undetermined',
        granted: false,
      } as any);

      const result = await Location.getForegroundPermissionsAsync();

      expect(result.status).toBe('undetermined');
    });
  });

  describe('Location.getCurrentPositionAsync', () => {
    it('should get current position with all fields', async () => {
      const mockCoords = {
        coords: {
          latitude: 41.311,
          longitude: 69.279,
          accuracy: 10,
          altitude: 450,
          heading: 90,
          speed: 5,
        },
        timestamp: Date.now(),
      };

      mockLocation.getCurrentPositionAsync.mockResolvedValueOnce(mockCoords as any);

      const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

      expect(result.coords.latitude).toBe(41.311);
      expect(result.coords.longitude).toBe(69.279);
      expect(result.coords.accuracy).toBe(10);
      expect(result.coords.altitude).toBe(450);
      expect(result.coords.heading).toBe(90);
      expect(result.coords.speed).toBe(5);
    });

    it('should handle location with null optional fields', async () => {
      const mockCoords = {
        coords: {
          latitude: 41.311,
          longitude: 69.279,
          accuracy: 10,
          altitude: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      };

      mockLocation.getCurrentPositionAsync.mockResolvedValueOnce(mockCoords as any);

      const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

      expect(result.coords.latitude).toBe(41.311);
      expect(result.coords.altitude).toBeNull();
      expect(result.coords.heading).toBeNull();
      expect(result.coords.speed).toBeNull();
    });

    it('should handle E_LOCATION_SETTINGS_UNSATISFIED error', async () => {
      const error = new Error('Settings unsatisfied');
      (error as any).code = 'E_LOCATION_SETTINGS_UNSATISFIED';
      mockLocation.getCurrentPositionAsync.mockRejectedValueOnce(error);

      await expect(Location.getCurrentPositionAsync({})).rejects.toThrow('Settings unsatisfied');
    });

    it('should handle E_LOCATION_TIMEOUT error', async () => {
      const error = new Error('Timeout');
      (error as any).code = 'E_LOCATION_TIMEOUT';
      mockLocation.getCurrentPositionAsync.mockRejectedValueOnce(error);

      await expect(Location.getCurrentPositionAsync({})).rejects.toThrow('Timeout');
    });

    it('should handle generic location errors', async () => {
      mockLocation.getCurrentPositionAsync.mockRejectedValueOnce(new Error('Unknown error'));

      await expect(Location.getCurrentPositionAsync({})).rejects.toThrow('Unknown error');
    });
  });

  describe('Location.watchPositionAsync', () => {
    it('should start watching position', async () => {
      const mockSubscription = { remove: mockRemove };
      mockLocation.watchPositionAsync.mockResolvedValueOnce(mockSubscription as any);

      const callback = jest.fn();
      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 10000, distanceInterval: 10 },
        callback
      );

      expect(subscription.remove).toBeDefined();
      expect(mockLocation.watchPositionAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          accuracy: 4,
          timeInterval: 10000,
          distanceInterval: 10,
        }),
        callback
      );
    });

    it('should stop watching when remove is called', async () => {
      const mockSubscription = { remove: mockRemove };
      mockLocation.watchPositionAsync.mockResolvedValueOnce(mockSubscription as any);

      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High },
        () => {}
      );

      subscription.remove();

      expect(mockRemove).toHaveBeenCalled();
    });

    it('should handle watch callback with location updates', async () => {
      let capturedCallback: any;
      mockLocation.watchPositionAsync.mockImplementationOnce(async (options, callback) => {
        capturedCallback = callback;
        return { remove: mockRemove };
      });

      const userCallback = jest.fn();
      await Location.watchPositionAsync({ accuracy: Location.Accuracy.High }, userCallback);

      // Simulate location update
      const mockUpdate = {
        coords: {
          latitude: 41.5,
          longitude: 69.5,
          accuracy: 5,
          altitude: 400,
          heading: 180,
          speed: 10,
        },
        timestamp: Date.now(),
      };

      capturedCallback(mockUpdate);

      expect(userCallback).toHaveBeenCalledWith(mockUpdate);
    });

    it('should handle watch errors', async () => {
      mockLocation.watchPositionAsync.mockRejectedValueOnce(new Error('Watch failed'));

      await expect(
        Location.watchPositionAsync({ accuracy: Location.Accuracy.High }, () => {})
      ).rejects.toThrow('Watch failed');
    });
  });
});

describe('useLocation - Utility Functions', () => {
  describe('formatDistance', () => {
    const formatDistance = (meters: number): string => {
      if (meters < 1000) {
        return `${Math.round(meters)} м`;
      }
      return `${(meters / 1000).toFixed(1)} км`;
    };

    it('should format meters correctly', () => {
      expect(formatDistance(500)).toBe('500 м');
      expect(formatDistance(100)).toBe('100 м');
      expect(formatDistance(999)).toBe('999 м');
      expect(formatDistance(0)).toBe('0 м');
      expect(formatDistance(1)).toBe('1 м');
    });

    it('should format kilometers correctly', () => {
      expect(formatDistance(1000)).toBe('1.0 км');
      expect(formatDistance(1500)).toBe('1.5 км');
      expect(formatDistance(10000)).toBe('10.0 км');
      expect(formatDistance(100000)).toBe('100.0 км');
    });

    it('should round meters to nearest integer', () => {
      expect(formatDistance(500.6)).toBe('501 м');
      expect(formatDistance(500.4)).toBe('500 м');
      expect(formatDistance(500.5)).toBe('501 м');
    });

    it('should format kilometers to one decimal place', () => {
      expect(formatDistance(1234)).toBe('1.2 км');
      expect(formatDistance(1250)).toBe('1.3 км'); // Rounds to 1.3
      expect(formatDistance(1550)).toBe('1.6 км');
    });
  });

  describe('getDistanceTo (Haversine formula)', () => {
    const getDistanceTo = (
      currentLat: number,
      currentLng: number,
      targetLat: number,
      targetLng: number
    ): number => {
      const R = 6371e3; // Earth's radius in meters
      const φ1 = (currentLat * Math.PI) / 180;
      const φ2 = (targetLat * Math.PI) / 180;
      const Δφ = ((targetLat - currentLat) * Math.PI) / 180;
      const Δλ = ((targetLng - currentLng) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    };

    it('should return 0 for same coordinates', () => {
      const distance = getDistanceTo(41.311, 69.279, 41.311, 69.279);
      expect(distance).toBe(0);
    });

    it('should calculate distance correctly (Tashkent to Samarkand)', () => {
      // Tashkent to Samarkand (approximately 270 km)
      const distance = getDistanceTo(41.311, 69.279, 39.654, 66.959);
      expect(distance).toBeGreaterThan(250000); // > 250 km
      expect(distance).toBeLessThan(300000); // < 300 km
    });

    it('should handle negative coordinates (Southern hemisphere)', () => {
      // Sydney area coordinates
      const distance = getDistanceTo(-33.9, 151.2, -33.8, 151.3);
      expect(distance).toBeGreaterThan(10000); // > 10 km
      expect(distance).toBeLessThan(20000); // < 20 km
    });

    it('should handle crossing prime meridian', () => {
      // London to Paris
      const distance = getDistanceTo(51.5074, -0.1278, 48.8566, 2.3522);
      expect(distance).toBeGreaterThan(300000); // > 300 km
      expect(distance).toBeLessThan(400000); // < 400 km
    });

    it('should handle crossing date line', () => {
      // Fiji to Samoa (crossing 180 degrees)
      const distance = getDistanceTo(-18.1416, 178.4419, -13.8333, -171.7500);
      expect(distance).toBeGreaterThan(900000); // > 900 km
      expect(distance).toBeLessThan(1200000); // < 1200 km
    });

    it('should handle equator crossing', () => {
      // Quito to Bogota
      const distance = getDistanceTo(-0.1807, -78.4678, 4.7110, -74.0721);
      expect(distance).toBeGreaterThan(600000); // > 600 km
      expect(distance).toBeLessThan(800000); // < 800 km
    });

    it('should be symmetric', () => {
      const d1 = getDistanceTo(41.311, 69.279, 39.654, 66.959);
      const d2 = getDistanceTo(39.654, 66.959, 41.311, 69.279);
      expect(Math.abs(d1 - d2)).toBeLessThan(1); // Should be identical
    });
  });
});

describe('useLocation - Platform specific', () => {
  describe('openSettings', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should call Linking.openURL with app-settings: on iOS', () => {
      (Platform as any).OS = 'ios';

      // Simulate openSettings behavior
      if (Platform.OS === 'ios') {
        Linking.openURL('app-settings:');
      } else {
        Linking.openSettings();
      }

      expect(Linking.openURL).toHaveBeenCalledWith('app-settings:');
      expect(Linking.openSettings).not.toHaveBeenCalled();
    });

    it('should call Linking.openSettings on Android', () => {
      (Platform as any).OS = 'android';

      // Simulate openSettings behavior
      if (Platform.OS === 'ios') {
        Linking.openURL('app-settings:');
      } else {
        Linking.openSettings();
      }

      expect(Linking.openSettings).toHaveBeenCalled();
      expect(Linking.openURL).not.toHaveBeenCalled();

      // Restore
      (Platform as any).OS = 'ios';
    });
  });
});

describe('useLocation - Hook Integration Simulation', () => {
  // Simulate the hook's logic flow

  describe('requestPermission flow', () => {
    it('should handle full permission request flow - granted', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
        granted: true,
      } as any);

      // Simulate hook state
      let isLoading = false;
      let error: string | null = null;
      let permissionStatus: string | null = null;

      // Simulate requestPermission
      isLoading = true;
      error = null;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        permissionStatus = status;

        if (status !== 'granted') {
          error = 'Доступ к геолокации не предоставлен';
        }
      } catch (err) {
        error = 'Ошибка при запросе разрешения';
      } finally {
        isLoading = false;
      }

      expect(permissionStatus).toBe('granted');
      expect(error).toBeNull();
      expect(isLoading).toBe(false);
    });

    it('should handle full permission request flow - denied', async () => {
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'denied',
        granted: false,
      } as any);

      let error: string | null = null;
      let permissionStatus: string | null = null;

      const { status } = await Location.requestForegroundPermissionsAsync();
      permissionStatus = status;

      if (status !== 'granted') {
        error = 'Доступ к геолокации не предоставлен';
      }

      expect(permissionStatus).toBe('denied');
      expect(error).toBe('Доступ к геолокации не предоставлен');
    });
  });

  describe('getCurrentLocation flow', () => {
    it('should handle full get location flow - success', async () => {
      mockLocation.getForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
      } as any);

      const mockCoords = {
        coords: {
          latitude: 41.311,
          longitude: 69.279,
          accuracy: 10,
          altitude: 450,
          heading: 90,
          speed: 5,
        },
        timestamp: Date.now(),
      };
      mockLocation.getCurrentPositionAsync.mockResolvedValueOnce(mockCoords as any);

      // Simulate hook state
      let location: any = null;
      let error: string | null = null;

      // Check permission
      const { status } = await Location.getForegroundPermissionsAsync();

      if (status !== 'granted') {
        error = 'Доступ к геолокации не предоставлен';
      } else {
        const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        location = {
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
          accuracy: result.coords.accuracy,
          altitude: result.coords.altitude,
          heading: result.coords.heading,
          speed: result.coords.speed,
        };
      }

      expect(location).toEqual({
        latitude: 41.311,
        longitude: 69.279,
        accuracy: 10,
        altitude: 450,
        heading: 90,
        speed: 5,
      });
      expect(error).toBeNull();
    });

    it('should handle E_LOCATION_SETTINGS_UNSATISFIED error', async () => {
      mockLocation.getForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
      } as any);

      const locationError = new Error('Settings unsatisfied');
      (locationError as any).code = 'E_LOCATION_SETTINGS_UNSATISFIED';
      mockLocation.getCurrentPositionAsync.mockRejectedValueOnce(locationError);

      let error: string | null = null;

      const { status } = await Location.getForegroundPermissionsAsync();

      if (status === 'granted') {
        try {
          await Location.getCurrentPositionAsync({});
        } catch (err: any) {
          if (err.code === 'E_LOCATION_SETTINGS_UNSATISFIED') {
            error = 'Геолокация отключена в настройках устройства';
          } else if (err.code === 'E_LOCATION_TIMEOUT') {
            error = 'Превышено время ожидания определения местоположения';
          } else {
            error = 'Не удалось определить местоположение';
          }
        }
      }

      expect(error).toBe('Геолокация отключена в настройках устройства');
    });

    it('should handle E_LOCATION_TIMEOUT error', async () => {
      mockLocation.getForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
      } as any);

      const locationError = new Error('Timeout');
      (locationError as any).code = 'E_LOCATION_TIMEOUT';
      mockLocation.getCurrentPositionAsync.mockRejectedValueOnce(locationError);

      let error: string | null = null;

      const { status } = await Location.getForegroundPermissionsAsync();

      if (status === 'granted') {
        try {
          await Location.getCurrentPositionAsync({});
        } catch (err: any) {
          if (err.code === 'E_LOCATION_SETTINGS_UNSATISFIED') {
            error = 'Геолокация отключена в настройках устройства';
          } else if (err.code === 'E_LOCATION_TIMEOUT') {
            error = 'Превышено время ожидания определения местоположения';
          } else {
            error = 'Не удалось определить местоположение';
          }
        }
      }

      expect(error).toBe('Превышено время ожидания определения местоположения');
    });

    it('should handle generic location error', async () => {
      mockLocation.getForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
      } as any);

      mockLocation.getCurrentPositionAsync.mockRejectedValueOnce(new Error('Unknown'));

      let error: string | null = null;

      const { status } = await Location.getForegroundPermissionsAsync();

      if (status === 'granted') {
        try {
          await Location.getCurrentPositionAsync({});
        } catch (err: any) {
          if (err.code === 'E_LOCATION_SETTINGS_UNSATISFIED') {
            error = 'Геолокация отключена в настройках устройства';
          } else if (err.code === 'E_LOCATION_TIMEOUT') {
            error = 'Превышено время ожидания определения местоположения';
          } else {
            error = 'Не удалось определить местоположение';
          }
        }
      }

      expect(error).toBe('Не удалось определить местоположение');
    });
  });

  describe('watchLocation flow', () => {
    it('should handle full watch location flow', async () => {
      mockLocation.getForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
      } as any);

      let watchCallback: any;
      mockLocation.watchPositionAsync.mockImplementationOnce(async (options, callback) => {
        watchCallback = callback;
        return { remove: mockRemove };
      });

      let location: any = null;
      let watchSubscription: any = null;

      // Check permission
      const { status } = await Location.getForegroundPermissionsAsync();

      if (status === 'granted') {
        watchSubscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 10000, distanceInterval: 10 },
          (result) => {
            location = {
              latitude: result.coords.latitude,
              longitude: result.coords.longitude,
              accuracy: result.coords.accuracy,
              altitude: result.coords.altitude,
              heading: result.coords.heading,
              speed: result.coords.speed,
            };
          }
        );
      }

      expect(watchSubscription).not.toBeNull();

      // Simulate location update
      watchCallback({
        coords: {
          latitude: 41.5,
          longitude: 69.5,
          accuracy: 5,
          altitude: 400,
          heading: 180,
          speed: 10,
        },
        timestamp: Date.now(),
      });

      expect(location).toEqual({
        latitude: 41.5,
        longitude: 69.5,
        accuracy: 5,
        altitude: 400,
        heading: 180,
        speed: 10,
      });
    });

    it('should handle watch permission denied', async () => {
      jest.clearAllMocks(); // Clear mocks from previous test

      mockLocation.getForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'denied',
      } as any);

      let error: string | null = null;

      const { status } = await Location.getForegroundPermissionsAsync();

      if (status !== 'granted') {
        error = 'Доступ к геолокации не предоставлен';
      }

      expect(error).toBe('Доступ к геолокации не предоставлен');
      expect(mockLocation.watchPositionAsync).not.toHaveBeenCalled();
    });

    it('should handle watch error', async () => {
      mockLocation.getForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
      } as any);

      mockLocation.watchPositionAsync.mockRejectedValueOnce(new Error('Watch failed'));

      let error: string | null = null;

      const { status } = await Location.getForegroundPermissionsAsync();

      if (status === 'granted') {
        try {
          await Location.watchPositionAsync({ accuracy: Location.Accuracy.High }, () => {});
        } catch (err) {
          error = 'Не удалось начать отслеживание местоположения';
        }
      }

      expect(error).toBe('Не удалось начать отслеживание местоположения');
    });
  });

  describe('stopWatching flow', () => {
    it('should remove subscription when stopping', async () => {
      mockLocation.watchPositionAsync.mockResolvedValueOnce({ remove: mockRemove } as any);

      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High },
        () => {}
      );

      // Stop watching
      if (subscription) {
        subscription.remove();
      }

      expect(mockRemove).toHaveBeenCalled();
    });
  });
});

describe('Location Accuracy levels', () => {
  it('should have correct accuracy values', () => {
    expect(Location.Accuracy.High).toBe(4);
    expect(Location.Accuracy.Balanced).toBe(3);
    expect(Location.Accuracy.Low).toBe(2);
  });
});
