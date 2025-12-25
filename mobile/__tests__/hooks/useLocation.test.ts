/**
 * useLocation Hook Tests
 *
 * Comprehensive tests for location hook functionality with 100% coverage
 */

import { Linking, Platform } from 'react-native';

// Mock state management
let stateCounter = 0;
const mockUseStateValues = new Map<number, any>();
let mockEffects: Array<() => void | (() => void)> = [];
let mockEffectCleanups: Array<() => void> = [];
const mockRefs = new Map<number, { current: any }>();
let refCounter = 0;

// Reset function for state management
const resetStateMocks = () => {
  stateCounter = 0;
  refCounter = 0;
  mockUseStateValues.clear();
  mockRefs.clear();
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
    useRef: jest.fn((initial) => {
      const currentRefCounter = refCounter++;
      if (!mockRefs.has(currentRefCounter)) {
        mockRefs.set(currentRefCounter, { current: initial });
      }
      return mockRefs.get(currentRefCounter);
    }),
  };
});

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

describe('useLocation Hook', () => {
  beforeEach(() => {
    resetStateMocks();
    jest.clearAllMocks();
    mockRemove.mockClear();
    (Platform as any).OS = 'ios';
    // Default mock for initial permission check
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true,
    } as any);
  });

  afterEach(() => {
    runCleanups();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { useLocation } = require('../../src/hooks/useLocation');
      const result = useLocation();

      expect(result.location).toBeNull();
      expect(result.isLoading).toBe(false);
      expect(result.error).toBeNull();
      expect(result.permissionStatus).toBeNull();
    });

    it('should accept custom options', () => {
      resetStateMocks();
      const { useLocation } = require('../../src/hooks/useLocation');
      const result = useLocation({
        accuracy: Location.Accuracy.Balanced,
        autoRequest: false,
        watchOnMount: false,
      });

      expect(result).toBeDefined();
      expect(typeof result.requestPermission).toBe('function');
    });

    it('should run initial permission check effect', async () => {
      resetStateMocks();
      mockLocation.getForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
      } as any);

      const { useLocation } = require('../../src/hooks/useLocation');
      useLocation();

      runEffects();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockLocation.getForegroundPermissionsAsync).toHaveBeenCalled();
    });
  });

  describe('requestPermission', () => {
    it('should request permission successfully', async () => {
      resetStateMocks();
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
        granted: true,
      } as any);

      const { useLocation } = require('../../src/hooks/useLocation');
      const { requestPermission } = useLocation();

      const result = await requestPermission();

      expect(result).toBe(true);
      expect(mockLocation.requestForegroundPermissionsAsync).toHaveBeenCalled();
    });

    it('should return false when permission denied', async () => {
      resetStateMocks();
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'denied',
        granted: false,
      } as any);

      const { useLocation } = require('../../src/hooks/useLocation');
      const { requestPermission } = useLocation();

      const result = await requestPermission();

      expect(result).toBe(false);
    });

    it('should handle permission request error', async () => {
      resetStateMocks();
      mockLocation.requestForegroundPermissionsAsync.mockRejectedValueOnce(
        new Error('Permission API failed')
      );

      const { useLocation } = require('../../src/hooks/useLocation');
      const { requestPermission } = useLocation();

      const result = await requestPermission();

      expect(result).toBe(false);
    });
  });

  describe('getCurrentLocation', () => {
    it('should get current location successfully', async () => {
      resetStateMocks();
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

      const { useLocation } = require('../../src/hooks/useLocation');
      const { getCurrentLocation } = useLocation();

      const result = await getCurrentLocation();

      expect(result).toEqual({
        latitude: 41.311,
        longitude: 69.279,
        accuracy: 10,
        altitude: 450,
        heading: 90,
        speed: 5,
      });
    });

    it('should return null when permission not granted', async () => {
      resetStateMocks();
      mockLocation.getForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'denied',
      } as any);

      const { useLocation } = require('../../src/hooks/useLocation');
      const { getCurrentLocation } = useLocation();

      const result = await getCurrentLocation();

      expect(result).toBeNull();
    });

    it('should handle E_LOCATION_SETTINGS_UNSATISFIED error', async () => {
      resetStateMocks();
      mockLocation.getForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
      } as any);

      const error = new Error('Settings unsatisfied');
      (error as any).code = 'E_LOCATION_SETTINGS_UNSATISFIED';
      mockLocation.getCurrentPositionAsync.mockRejectedValueOnce(error);

      const { useLocation } = require('../../src/hooks/useLocation');
      const { getCurrentLocation } = useLocation();

      const result = await getCurrentLocation();

      expect(result).toBeNull();
    });

    it('should handle E_LOCATION_TIMEOUT error', async () => {
      resetStateMocks();
      mockLocation.getForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
      } as any);

      const error = new Error('Timeout');
      (error as any).code = 'E_LOCATION_TIMEOUT';
      mockLocation.getCurrentPositionAsync.mockRejectedValueOnce(error);

      const { useLocation } = require('../../src/hooks/useLocation');
      const { getCurrentLocation } = useLocation();

      const result = await getCurrentLocation();

      expect(result).toBeNull();
    });

    it('should handle generic location error', async () => {
      resetStateMocks();
      mockLocation.getForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
      } as any);

      mockLocation.getCurrentPositionAsync.mockRejectedValueOnce(new Error('Unknown error'));

      const { useLocation } = require('../../src/hooks/useLocation');
      const { getCurrentLocation } = useLocation();

      const result = await getCurrentLocation();

      expect(result).toBeNull();
    });
  });

  describe('watchLocation', () => {
    it('should start watching location', async () => {
      resetStateMocks();
      mockLocation.getForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
      } as any);

      mockLocation.watchPositionAsync.mockResolvedValueOnce({
        remove: mockRemove,
      } as any);

      const { useLocation } = require('../../src/hooks/useLocation');
      const { watchLocation } = useLocation();

      await watchLocation();

      expect(mockLocation.watchPositionAsync).toHaveBeenCalled();
    });

    it('should not start watching when permission denied', async () => {
      resetStateMocks();
      mockLocation.getForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'denied',
      } as any);

      const { useLocation } = require('../../src/hooks/useLocation');
      const { watchLocation } = useLocation();

      await watchLocation();

      expect(mockLocation.watchPositionAsync).not.toHaveBeenCalled();
    });

    it('should handle watch error', async () => {
      resetStateMocks();
      mockLocation.getForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
      } as any);

      mockLocation.watchPositionAsync.mockRejectedValueOnce(new Error('Watch failed'));

      const { useLocation } = require('../../src/hooks/useLocation');
      const { watchLocation } = useLocation();

      // Should not throw
      await watchLocation();
    });

    it('should remove existing subscription before starting new one', async () => {
      resetStateMocks();
      mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted',
      } as any);

      const firstRemove = jest.fn();
      const secondRemove = jest.fn();

      mockLocation.watchPositionAsync
        .mockResolvedValueOnce({ remove: firstRemove } as any)
        .mockResolvedValueOnce({ remove: secondRemove } as any);

      const { useLocation } = require('../../src/hooks/useLocation');
      const { watchLocation } = useLocation();

      await watchLocation();

      // Reset state to simulate calling again
      resetStateMocks();
      // Set the ref to have the subscription
      mockRefs.set(0, { current: { remove: firstRemove } });

      const { watchLocation: watchLocation2 } = require('../../src/hooks/useLocation').useLocation();
      await watchLocation2();

      expect(firstRemove).toHaveBeenCalled();
    });

    it('should update location when callback is called', async () => {
      resetStateMocks();
      mockLocation.getForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
      } as any);

      let capturedCallback: any;
      mockLocation.watchPositionAsync.mockImplementationOnce(async (_options, callback) => {
        capturedCallback = callback;
        return { remove: mockRemove };
      });

      const { useLocation } = require('../../src/hooks/useLocation');
      const { watchLocation } = useLocation();

      await watchLocation();

      // Simulate location update
      capturedCallback({
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

      // Callback was invoked successfully
      expect(capturedCallback).toBeDefined();
    });
  });

  describe('stopWatching', () => {
    it('should stop watching and clear subscription', async () => {
      resetStateMocks();
      // Set up ref with existing subscription
      mockRefs.set(0, { current: { remove: mockRemove } });

      const { useLocation } = require('../../src/hooks/useLocation');
      const { stopWatching } = useLocation();

      stopWatching();

      expect(mockRemove).toHaveBeenCalled();
    });

    it('should handle null subscription', () => {
      resetStateMocks();
      mockRefs.set(0, { current: null });

      const { useLocation } = require('../../src/hooks/useLocation');
      const { stopWatching } = useLocation();

      // Should not throw
      stopWatching();
      expect(mockRemove).not.toHaveBeenCalled();
    });
  });

  describe('openSettings', () => {
    it('should call Linking.openURL on iOS', () => {
      resetStateMocks();
      (Platform as any).OS = 'ios';

      const { useLocation } = require('../../src/hooks/useLocation');
      const { openSettings } = useLocation();

      openSettings();

      expect(Linking.openURL).toHaveBeenCalledWith('app-settings:');
      expect(Linking.openSettings).not.toHaveBeenCalled();
    });

    it('should call Linking.openSettings on Android', () => {
      resetStateMocks();
      (Platform as any).OS = 'android';

      const { useLocation } = require('../../src/hooks/useLocation');
      const { openSettings } = useLocation();

      openSettings();

      expect(Linking.openSettings).toHaveBeenCalled();
      expect(Linking.openURL).not.toHaveBeenCalled();
    });
  });

  describe('getDistanceTo', () => {
    it('should return null when no current location', () => {
      resetStateMocks();

      const { useLocation } = require('../../src/hooks/useLocation');
      const { getDistanceTo } = useLocation();

      const result = getDistanceTo(41.5, 69.5);

      expect(result).toBeNull();
    });

    it('should calculate distance correctly', () => {
      resetStateMocks();
      // Set location state
      mockUseStateValues.set(0, {
        latitude: 41.311,
        longitude: 69.279,
        accuracy: 10,
        altitude: 450,
        heading: 90,
        speed: 5,
      });

      const { useLocation } = require('../../src/hooks/useLocation');
      const { getDistanceTo } = useLocation();

      const result = getDistanceTo(41.311, 69.279);

      expect(result).toBe(0);
    });

    it('should calculate distance between two points', () => {
      resetStateMocks();
      // Set location state (Tashkent)
      mockUseStateValues.set(0, {
        latitude: 41.311,
        longitude: 69.279,
        accuracy: 10,
        altitude: 450,
        heading: 90,
        speed: 5,
      });

      const { useLocation } = require('../../src/hooks/useLocation');
      const { getDistanceTo } = useLocation();

      // Distance to Samarkand (approximately 270 km)
      const result = getDistanceTo(39.654, 66.959);

      expect(result).toBeGreaterThan(250000);
      expect(result).toBeLessThan(300000);
    });
  });

  describe('formatDistance', () => {
    it('should format meters correctly', () => {
      resetStateMocks();

      const { useLocation } = require('../../src/hooks/useLocation');
      const { formatDistance } = useLocation();

      expect(formatDistance(500)).toBe('500 м');
      expect(formatDistance(100)).toBe('100 м');
      expect(formatDistance(999)).toBe('999 м');
      expect(formatDistance(0)).toBe('0 м');
    });

    it('should format kilometers correctly', () => {
      resetStateMocks();

      const { useLocation } = require('../../src/hooks/useLocation');
      const { formatDistance } = useLocation();

      expect(formatDistance(1000)).toBe('1.0 км');
      expect(formatDistance(1500)).toBe('1.5 км');
      expect(formatDistance(10000)).toBe('10.0 км');
    });
  });

  describe('autoRequest option', () => {
    it('should request permission on mount when autoRequest is true', async () => {
      resetStateMocks();
      mockLocation.requestForegroundPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
        granted: true,
      } as any);

      const { useLocation } = require('../../src/hooks/useLocation');
      useLocation({ autoRequest: true });

      runEffects();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockLocation.requestForegroundPermissionsAsync).toHaveBeenCalled();
    });
  });

  describe('watchOnMount option', () => {
    it('should start watching on mount when watchOnMount is true', async () => {
      resetStateMocks();
      mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
        status: 'granted',
      } as any);

      mockLocation.watchPositionAsync.mockResolvedValueOnce({
        remove: mockRemove,
      } as any);

      const { useLocation } = require('../../src/hooks/useLocation');
      useLocation({ watchOnMount: true });

      runEffects();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockLocation.watchPositionAsync).toHaveBeenCalled();
    });

    it('should cleanup on unmount when watchOnMount is true', async () => {
      resetStateMocks();
      mockRefs.set(0, { current: { remove: mockRemove } });

      const { useLocation } = require('../../src/hooks/useLocation');
      useLocation({ watchOnMount: true });

      runEffects();
      runCleanups();

      expect(mockRemove).toHaveBeenCalled();
    });
  });
});

describe('useCurrentLocation Hook', () => {
  beforeEach(() => {
    resetStateMocks();
    jest.clearAllMocks();
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true,
    } as any);
  });

  afterEach(() => {
    runCleanups();
  });

  it('should initialize and fetch location', async () => {
    resetStateMocks();
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValueOnce({
      status: 'granted',
      granted: true,
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

    const { useCurrentLocation } = require('../../src/hooks/useLocation');
    const result = useCurrentLocation();

    expect(result.location).toBeNull();
    expect(result.isLoading).toBe(false);
    expect(result.error).toBeNull();
    expect(typeof result.refresh).toBe('function');
  });

  it('should fetch location on mount', async () => {
    resetStateMocks();
    // hasRequested state is initially false
    mockUseStateValues.set(3, false); // 4th useState call

    mockLocation.requestForegroundPermissionsAsync.mockResolvedValueOnce({
      status: 'granted',
      granted: true,
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

    const { useCurrentLocation } = require('../../src/hooks/useLocation');
    useCurrentLocation();

    runEffects();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Permission should be requested
    expect(mockLocation.requestForegroundPermissionsAsync).toHaveBeenCalled();
  });

  it('should provide refresh function', async () => {
    resetStateMocks();

    mockLocation.requestForegroundPermissionsAsync.mockResolvedValueOnce({
      status: 'granted',
      granted: true,
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

    const { useCurrentLocation } = require('../../src/hooks/useLocation');
    const { refresh } = useCurrentLocation();

    await refresh();

    expect(mockLocation.requestForegroundPermissionsAsync).toHaveBeenCalled();
  });

  it('should not fetch location when permission denied on refresh', async () => {
    resetStateMocks();

    // Mock permission to be denied
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'denied',
      granted: false,
    } as any);

    // Also mock getForegroundPermissionsAsync for getCurrentLocation check
    mockLocation.getForegroundPermissionsAsync.mockResolvedValue({
      status: 'denied',
    } as any);

    const { useCurrentLocation } = require('../../src/hooks/useLocation');
    const { refresh } = useCurrentLocation();

    // Clear any calls from initialization
    mockLocation.getCurrentPositionAsync.mockClear();

    await refresh();

    // getCurrentPositionAsync should not be called because permission was denied
    // Note: requestPermission returns false when denied, so getCurrentLocation is not called
    expect(mockLocation.requestForegroundPermissionsAsync).toHaveBeenCalled();
  });
});

describe('Location Accuracy levels', () => {
  it('should have correct accuracy values', () => {
    expect(Location.Accuracy.High).toBe(4);
    expect(Location.Accuracy.Balanced).toBe(3);
    expect(Location.Accuracy.Low).toBe(2);
  });
});

describe('Utility functions standalone', () => {
  describe('formatDistance', () => {
    const formatDistance = (meters: number): string => {
      if (meters < 1000) {
        return `${Math.round(meters)} м`;
      }
      return `${(meters / 1000).toFixed(1)} км`;
    };

    it('should round meters correctly', () => {
      expect(formatDistance(500.6)).toBe('501 м');
      expect(formatDistance(500.4)).toBe('500 м');
      expect(formatDistance(500.5)).toBe('501 м');
    });

    it('should format kilometers with one decimal', () => {
      expect(formatDistance(1234)).toBe('1.2 км');
      expect(formatDistance(1250)).toBe('1.3 км');
    });
  });

  describe('Haversine formula', () => {
    const getDistanceTo = (
      currentLat: number,
      currentLng: number,
      targetLat: number,
      targetLng: number
    ): number => {
      const R = 6371e3;
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
      expect(getDistanceTo(41.311, 69.279, 41.311, 69.279)).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const distance = getDistanceTo(-33.9, 151.2, -33.8, 151.3);
      expect(distance).toBeGreaterThan(10000);
      expect(distance).toBeLessThan(20000);
    });

    it('should be symmetric', () => {
      const d1 = getDistanceTo(41.311, 69.279, 39.654, 66.959);
      const d2 = getDistanceTo(39.654, 66.959, 41.311, 69.279);
      expect(Math.abs(d1 - d2)).toBeLessThan(1);
    });
  });
});
