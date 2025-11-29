import { Test, TestingModule } from '@nestjs/testing';
import { TelegramLocationService } from './telegram-location.service';

describe('TelegramLocationService', () => {
  let service: TelegramLocationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TelegramLocationService],
    }).compile();

    service = module.get<TelegramLocationService>(TelegramLocationService);
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      // Tashkent City Center to Tashkent Airport (approximately 6.7 km)
      const distance = service.calculateDistance(41.2995, 69.2401, 41.2579, 69.2811);

      expect(distance).toBeGreaterThan(5000);
      expect(distance).toBeLessThan(8000);
    });

    it('should return 0 for same coordinates', () => {
      const distance = service.calculateDistance(41.2995, 69.2401, 41.2995, 69.2401);

      expect(distance).toBe(0);
    });

    it('should handle coordinates across equator', () => {
      // North to south
      const distance = service.calculateDistance(1, 0, -1, 0);

      expect(distance).toBeGreaterThan(200000); // ~222 km
    });

    it('should handle coordinates across prime meridian', () => {
      // East to west
      const distance = service.calculateDistance(0, 1, 0, -1);

      expect(distance).toBeGreaterThan(200000); // ~222 km
    });

    it('should calculate short distances accurately', () => {
      // Very close points (about 100m apart)
      const distance = service.calculateDistance(41.2995, 69.2401, 41.2996, 69.2413);

      expect(distance).toBeGreaterThan(50);
      expect(distance).toBeLessThan(200);
    });
  });

  describe('formatDistance', () => {
    it('should format meters for Russian', () => {
      expect(service.formatDistance(120, 'ru')).toBe('120м');
      expect(service.formatDistance(999, 'ru')).toBe('999м');
    });

    it('should format kilometers for Russian', () => {
      expect(service.formatDistance(1000, 'ru')).toBe('1.0км');
      expect(service.formatDistance(1500, 'ru')).toBe('1.5км');
      expect(service.formatDistance(10000, 'ru')).toBe('10.0км');
    });

    it('should format meters for English', () => {
      expect(service.formatDistance(120, 'en')).toBe('120m');
      expect(service.formatDistance(999, 'en')).toBe('999m');
    });

    it('should format kilometers for English', () => {
      expect(service.formatDistance(1000, 'en')).toBe('1.0km');
      expect(service.formatDistance(1500, 'en')).toBe('1.5km');
    });

    it('should default to Russian', () => {
      expect(service.formatDistance(120)).toBe('120м');
      expect(service.formatDistance(1500)).toBe('1.5км');
    });
  });

  describe('validateCoordinates', () => {
    it('should validate correct coordinates', () => {
      const result = service.validateCoordinates(41.2995, 69.2401);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject NaN latitude', () => {
      const result = service.validateCoordinates(NaN, 69.2401);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Coordinates must be numbers');
    });

    it('should reject NaN longitude', () => {
      const result = service.validateCoordinates(41.2995, NaN);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Coordinates must be numbers');
    });

    it('should reject latitude < -90', () => {
      const result = service.validateCoordinates(-91, 69.2401);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Latitude must be between -90 and 90');
    });

    it('should reject latitude > 90', () => {
      const result = service.validateCoordinates(91, 69.2401);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Latitude must be between -90 and 90');
    });

    it('should reject longitude < -180', () => {
      const result = service.validateCoordinates(41.2995, -181);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Longitude must be between -180 and 180');
    });

    it('should reject longitude > 180', () => {
      const result = service.validateCoordinates(41.2995, 181);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Longitude must be between -180 and 180');
    });

    it('should validate coordinates outside Uzbekistan (with warning)', () => {
      // Moscow coordinates
      const result = service.validateCoordinates(55.7558, 37.6173);

      expect(result.isValid).toBe(true);
    });

    it('should validate edge case coordinates', () => {
      expect(service.validateCoordinates(-90, -180).isValid).toBe(true);
      expect(service.validateCoordinates(90, 180).isValid).toBe(true);
      expect(service.validateCoordinates(0, 0).isValid).toBe(true);
    });
  });

  describe('calculateOptimalRoute', () => {
    it('should return empty route for no tasks', () => {
      const result = service.calculateOptimalRoute(41.2995, 69.2401, []);

      expect(result.orderedTasks).toEqual([]);
      expect(result.totalDistance).toBe(0);
    });

    it('should handle single task', () => {
      const tasks = [{ id: 'task-1', machine: { latitude: 41.3, longitude: 69.25 } }];

      const result = service.calculateOptimalRoute(41.2995, 69.2401, tasks);

      expect(result.orderedTasks).toHaveLength(1);
      expect(result.orderedTasks[0].id).toBe('task-1');
      expect(result.totalDistance).toBeGreaterThan(0);
    });

    it('should order tasks by distance (nearest first)', () => {
      const startLat = 41.2995;
      const startLon = 69.2401;

      const tasks = [
        { id: 'task-far', machine: { latitude: 41.35, longitude: 69.3 } },
        { id: 'task-near', machine: { latitude: 41.3, longitude: 69.24 } },
        { id: 'task-mid', machine: { latitude: 41.32, longitude: 69.27 } },
      ];

      const result = service.calculateOptimalRoute(startLat, startLon, tasks);

      expect(result.orderedTasks).toHaveLength(3);
      expect(result.orderedTasks[0].id).toBe('task-near');
    });

    it('should calculate total distance correctly', () => {
      const tasks = [
        { id: 'task-1', machine: { latitude: 41.3, longitude: 69.24 } },
        { id: 'task-2', machine: { latitude: 41.31, longitude: 69.25 } },
      ];

      const result = service.calculateOptimalRoute(41.2995, 69.2401, tasks);

      expect(result.totalDistance).toBeGreaterThan(0);
      expect(result.orderedTasks[0].distance).toBeGreaterThan(0);
      expect(result.orderedTasks[1].distance).toBeGreaterThan(0);
    });

    it('should work with multiple tasks', () => {
      const tasks = [
        { id: 'task-1', machine: { latitude: 41.3, longitude: 69.24 } },
        { id: 'task-2', machine: { latitude: 41.32, longitude: 69.26 } },
        { id: 'task-3', machine: { latitude: 41.34, longitude: 69.28 } },
        { id: 'task-4', machine: { latitude: 41.28, longitude: 69.22 } },
        { id: 'task-5', machine: { latitude: 41.33, longitude: 69.27 } },
      ];

      const result = service.calculateOptimalRoute(41.2995, 69.2401, tasks);

      expect(result.orderedTasks).toHaveLength(5);
      expect(result.totalDistance).toBeGreaterThan(0);
    });
  });

  describe('findNearbyTasks', () => {
    it('should return empty array (placeholder implementation)', async () => {
      const result = await service.findNearbyTasks('user-1', 41.2995, 69.2401, 1000);

      expect(result).toEqual([]);
    });

    it('should handle default radius', async () => {
      const result = await service.findNearbyTasks('user-1', 41.2995, 69.2401);

      expect(result).toEqual([]);
    });
  });

  describe('verifyTaskLocation', () => {
    it('should return verification result (placeholder implementation)', async () => {
      const result = await service.verifyTaskLocation('task-1', 41.2995, 69.2401);

      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('distance');
      expect(result).toHaveProperty('threshold');
      expect(result.threshold).toBe(100); // TASK_VERIFICATION_RADIUS
    });
  });

  describe('storeTaskLocation', () => {
    it('should return success (placeholder implementation)', async () => {
      const result = await service.storeTaskLocation('task-1', 41.2995, 69.2401);

      expect(result).toBe(true);
    });
  });
});
