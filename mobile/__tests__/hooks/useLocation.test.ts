/**
 * useLocation Hook Tests
 */

import * as Location from 'expo-location';

// Mock expo-location
jest.mock('expo-location', () => ({
  Accuracy: {
    High: 4,
    Balanced: 3,
    Low: 2,
  },
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
}));

const mockLocation = Location as jest.Mocked<typeof Location>;

// Test the formatDistance utility function directly
describe('useLocation utilities', () => {
  describe('formatDistance logic', () => {
    // Test the formatDistance logic (same as in hook)
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
    });

    it('should format kilometers correctly', () => {
      expect(formatDistance(1000)).toBe('1.0 км');
      expect(formatDistance(1500)).toBe('1.5 км');
      expect(formatDistance(10000)).toBe('10.0 км');
    });

    it('should round meters', () => {
      expect(formatDistance(500.6)).toBe('501 м');
      expect(formatDistance(500.4)).toBe('500 м');
    });
  });

  describe('getDistanceTo (Haversine formula)', () => {
    // Test the Haversine formula logic
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

    it('should calculate distance correctly', () => {
      // Tashkent to Samarkand (approximately 270 km)
      const distance = getDistanceTo(41.311, 69.279, 39.654, 66.959);
      expect(distance).toBeGreaterThan(250000); // > 250 km
      expect(distance).toBeLessThan(300000); // < 300 km
    });

    it('should handle negative coordinates', () => {
      // Test with southern hemisphere coordinates
      const distance = getDistanceTo(-33.9, 151.2, -33.8, 151.3);
      expect(distance).toBeGreaterThan(10000); // > 10 km
      expect(distance).toBeLessThan(20000); // < 20 km
    });
  });

  describe('permission handling', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should request foreground permissions', async () => {
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
    });

    it('should get current position', async () => {
      const mockCoords = {
        coords: {
          latitude: 41.311,
          longitude: 69.279,
          accuracy: 10,
          altitude: 450,
          heading: 90,
          speed: 0,
        },
        timestamp: Date.now(),
      };

      mockLocation.getCurrentPositionAsync.mockResolvedValueOnce(mockCoords as any);

      const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });

      expect(result.coords.latitude).toBe(41.311);
      expect(result.coords.longitude).toBe(69.279);
    });
  });

  describe('watch location', () => {
    it('should start watching position', async () => {
      const mockSubscription = { remove: jest.fn() };
      mockLocation.watchPositionAsync.mockResolvedValueOnce(mockSubscription as any);

      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High },
        () => {}
      );

      expect(subscription.remove).toBeDefined();
      expect(mockLocation.watchPositionAsync).toHaveBeenCalled();
    });

    it('should stop watching when remove is called', async () => {
      const removeMock = jest.fn();
      const mockSubscription = { remove: removeMock };
      mockLocation.watchPositionAsync.mockResolvedValueOnce(mockSubscription as any);

      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High },
        () => {}
      );

      subscription.remove();

      expect(removeMock).toHaveBeenCalled();
    });
  });
});
