import { Test, TestingModule } from '@nestjs/testing';
import { RouteOptimizationService } from './route-optimization.service';

interface Location {
  id: string;
  lat: number;
  lng: number;
  priority?: number;
}

describe('RouteOptimizationService', () => {
  let service: RouteOptimizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RouteOptimizationService],
    }).compile();

    service = module.get<RouteOptimizationService>(RouteOptimizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('optimizeRoute', () => {
    const start: Location = { id: 'start', lat: 41.311081, lng: 69.240562 }; // Tashkent

    it('should return empty array for empty locations', () => {
      const result = service.optimizeRoute(start, []);
      expect(result).toEqual([]);
    });

    it('should return single location for single location input', () => {
      const location: Location = { id: 'loc-1', lat: 41.312, lng: 69.241 };
      const result = service.optimizeRoute(start, [location]);
      expect(result).toEqual([location]);
    });

    it('should optimize route based on distance', () => {
      const locations: Location[] = [
        { id: 'far', lat: 41.4, lng: 69.4 }, // Further
        { id: 'near', lat: 41.3115, lng: 69.241 }, // Closer
      ];

      const result = service.optimizeRoute(start, locations);

      // Nearest location should be first
      expect(result[0].id).toBe('near');
      expect(result[1].id).toBe('far');
    });

    it('should consider priority when optimizing', () => {
      const locations: Location[] = [
        { id: 'low-priority', lat: 41.3112, lng: 69.2407, priority: 1 }, // Very close, low priority
        { id: 'high-priority', lat: 41.315, lng: 69.245, priority: 10 }, // Further, high priority
      ];

      const result = service.optimizeRoute(start, locations);

      // High priority should be weighted in the score calculation
      expect(result).toHaveLength(2);
    });

    it('should handle multiple locations', () => {
      const locations: Location[] = [
        { id: 'loc-1', lat: 41.32, lng: 69.25 },
        { id: 'loc-2', lat: 41.315, lng: 69.245 },
        { id: 'loc-3', lat: 41.312, lng: 69.241 },
        { id: 'loc-4', lat: 41.33, lng: 69.26 },
      ];

      const result = service.optimizeRoute(start, locations);

      expect(result).toHaveLength(4);
      // Should include all locations
      expect(result.map((l) => l.id).sort()).toEqual(['loc-1', 'loc-2', 'loc-3', 'loc-4']);
    });

    it('should use default priority of 1 when not specified', () => {
      const locations: Location[] = [
        { id: 'loc-1', lat: 41.315, lng: 69.245 },
        { id: 'loc-2', lat: 41.312, lng: 69.241 },
      ];

      const result = service.optimizeRoute(start, locations);

      // Nearest should be first
      expect(result[0].id).toBe('loc-2');
    });
  });

  describe('calculateDistance', () => {
    it('should return 0 for same location', () => {
      const location: Location = { id: 'loc', lat: 41.311081, lng: 69.240562 };
      const result = service.calculateDistance(location, location);
      expect(result).toBe(0);
    });

    it('should calculate correct distance between two points', () => {
      const tashkent: Location = { id: 'tashkent', lat: 41.311081, lng: 69.240562 };
      const samarkand: Location = { id: 'samarkand', lat: 39.65422, lng: 66.959722 };

      const result = service.calculateDistance(tashkent, samarkand);

      // Distance should be approximately 270-280 km
      expect(result).toBeGreaterThan(260);
      expect(result).toBeLessThan(290);
    });

    it('should return positive distance regardless of order', () => {
      const loc1: Location = { id: 'loc1', lat: 41.311081, lng: 69.240562 };
      const loc2: Location = { id: 'loc2', lat: 41.4, lng: 69.3 };

      const distance1 = service.calculateDistance(loc1, loc2);
      const distance2 = service.calculateDistance(loc2, loc1);

      expect(distance1).toBeCloseTo(distance2, 10);
    });

    it('should handle negative coordinates', () => {
      const newYork: Location = { id: 'ny', lat: 40.7128, lng: -74.006 };
      const london: Location = { id: 'london', lat: 51.5074, lng: -0.1278 };

      const result = service.calculateDistance(newYork, london);

      // Distance should be approximately 5570 km
      expect(result).toBeGreaterThan(5500);
      expect(result).toBeLessThan(5700);
    });

    it('should handle equator crossing', () => {
      const north: Location = { id: 'north', lat: 10, lng: 0 };
      const south: Location = { id: 'south', lat: -10, lng: 0 };

      const result = service.calculateDistance(north, south);

      // Distance should be approximately 2220 km (20 degrees latitude)
      expect(result).toBeGreaterThan(2200);
      expect(result).toBeLessThan(2300);
    });
  });

  describe('calculateTotalDistance', () => {
    it('should return 0 for empty route', () => {
      const result = service.calculateTotalDistance([]);
      expect(result).toBe(0);
    });

    it('should return 0 for single location route', () => {
      const route: Location[] = [{ id: 'loc', lat: 41.311081, lng: 69.240562 }];
      const result = service.calculateTotalDistance(route);
      expect(result).toBe(0);
    });

    it('should calculate total distance for multiple locations', () => {
      const route: Location[] = [
        { id: 'loc1', lat: 41.311081, lng: 69.240562 },
        { id: 'loc2', lat: 41.32, lng: 69.25 },
        { id: 'loc3', lat: 41.33, lng: 69.26 },
      ];

      const result = service.calculateTotalDistance(route);

      // Should be sum of all segment distances
      const segment1 = service.calculateDistance(route[0], route[1]);
      const segment2 = service.calculateDistance(route[1], route[2]);

      expect(result).toBeCloseTo(segment1 + segment2, 10);
    });
  });

  describe('estimateTravelTime', () => {
    it('should estimate travel time with default speed', () => {
      const distanceKm = 40;
      const result = service.estimateTravelTime(distanceKm);

      // At 40 km/h, 40 km takes 60 minutes
      expect(result).toBe(60);
    });

    it('should estimate travel time with custom speed', () => {
      const distanceKm = 60;
      const avgSpeedKmh = 60;
      const result = service.estimateTravelTime(distanceKm, avgSpeedKmh);

      // At 60 km/h, 60 km takes 60 minutes
      expect(result).toBe(60);
    });

    it('should round up to nearest minute', () => {
      const distanceKm = 41;
      const result = service.estimateTravelTime(distanceKm);

      // At 40 km/h, 41 km takes 61.5 minutes, rounded up to 62
      expect(result).toBe(62);
    });

    it('should return 0 for 0 distance', () => {
      const result = service.estimateTravelTime(0);
      expect(result).toBe(0);
    });

    it('should handle short distances', () => {
      const distanceKm = 1;
      const result = service.estimateTravelTime(distanceKm);

      // At 40 km/h, 1 km takes 1.5 minutes, rounded up to 2
      expect(result).toBe(2);
    });
  });
});
