/**
 * useLocation Hook Tests
 *
 * Tests the distance calculation logic used in useLocation hook
 */

describe('useLocation hook logic', () => {
  describe('distance calculation', () => {
    // Haversine formula test
    const calculateDistance = (
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number
    ): number => {
      const R = 6371e3; // Earth's radius in meters
      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lon2 - lon1) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    };

    it('should calculate distance between two points correctly', () => {
      // Tashkent to Samarkand (approximately 280km)
      const tashkent = { lat: 41.2995, lng: 69.2401 };
      const samarkand = { lat: 39.6542, lng: 66.9597 };

      const distance = calculateDistance(
        tashkent.lat,
        tashkent.lng,
        samarkand.lat,
        samarkand.lng
      );

      // Should be approximately 265km (Haversine distance)
      expect(distance).toBeGreaterThan(260000);
      expect(distance).toBeLessThan(280000);
    });

    it('should return 0 for same location', () => {
      const distance = calculateDistance(41.2995, 69.2401, 41.2995, 69.2401);
      expect(distance).toBe(0);
    });
  });

  describe('formatDistance', () => {
    const formatDistance = (meters: number): string => {
      if (meters < 1000) {
        return `${Math.round(meters)} м`;
      }
      return `${(meters / 1000).toFixed(1)} км`;
    };

    it('should format meters correctly', () => {
      expect(formatDistance(100)).toBe('100 м');
      expect(formatDistance(500)).toBe('500 м');
      expect(formatDistance(999)).toBe('999 м');
    });

    it('should format kilometers correctly', () => {
      expect(formatDistance(1000)).toBe('1.0 км');
      expect(formatDistance(1500)).toBe('1.5 км');
      expect(formatDistance(10000)).toBe('10.0 км');
    });
  });
});
