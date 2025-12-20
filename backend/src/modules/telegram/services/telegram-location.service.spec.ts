import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramLocationService } from './telegram-location.service';
import { Task, TaskStatus, TaskType, TaskPriority } from '../../tasks/entities/task.entity';
import { MachineStatus } from '../../machines/entities/machine.entity';

describe('TelegramLocationService', () => {
  let service: TelegramLocationService;
  let taskRepository: jest.Mocked<Repository<Task>>;

  const mockUserId = 'user-uuid-123';

  // Tashkent coordinates for testing
  const tashkentCenter = { lat: 41.2995, lon: 69.2401 };
  const tashkentAirport = { lat: 41.2579, lon: 69.2811 }; // ~6.7km from center
  const nearbyLocation = { lat: 41.3000, lon: 69.2405 }; // ~60m from center

  const createMockTask = (
    id: string,
    latitude: number,
    longitude: number,
    status: TaskStatus = TaskStatus.ASSIGNED,
  ): Partial<Task> => ({
    id,
    type_code: TaskType.REFILL,
    status,
    priority: TaskPriority.NORMAL,
    scheduled_date: new Date(),
    assigned_to_user_id: mockUserId,
    has_photo_before: false,
    has_photo_after: false,
    metadata: null,
    machine: {
      id: `machine-${id}`,
      machine_number: `M-${id}`,
      name: `Machine ${id}`,
      status: MachineStatus.ACTIVE,
      location: {
        id: `loc-${id}`,
        name: `Location ${id}`,
        latitude,
        longitude,
      },
    } as any,
  });

  beforeEach(async () => {
    const mockTaskRepository = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramLocationService,
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
      ],
    }).compile();

    service = module.get<TelegramLocationService>(TelegramLocationService);
    taskRepository = module.get(getRepositoryToken(Task));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateDistance', () => {
    it('should calculate distance between Tashkent center and airport correctly', () => {
      const distance = service.calculateDistance(
        tashkentCenter.lat,
        tashkentCenter.lon,
        tashkentAirport.lat,
        tashkentAirport.lon,
      );

      // Should be approximately 5-7 km (accounting for algorithm precision)
      expect(distance).toBeGreaterThan(5000);
      expect(distance).toBeLessThan(8000);
    });

    it('should return 0 for same coordinates', () => {
      const distance = service.calculateDistance(
        tashkentCenter.lat,
        tashkentCenter.lon,
        tashkentCenter.lat,
        tashkentCenter.lon,
      );

      expect(distance).toBe(0);
    });

    it('should calculate small distances accurately', () => {
      const distance = service.calculateDistance(
        tashkentCenter.lat,
        tashkentCenter.lon,
        nearbyLocation.lat,
        nearbyLocation.lon,
      );

      // Should be approximately 60-100 meters
      expect(distance).toBeGreaterThan(50);
      expect(distance).toBeLessThan(150);
    });
  });

  describe('formatDistance', () => {
    it('should format meters in Russian', () => {
      expect(service.formatDistance(120, 'ru')).toBe('120м');
      expect(service.formatDistance(500, 'ru')).toBe('500м');
      expect(service.formatDistance(999, 'ru')).toBe('999м');
    });

    it('should format kilometers in Russian', () => {
      expect(service.formatDistance(1000, 'ru')).toBe('1.0км');
      expect(service.formatDistance(1500, 'ru')).toBe('1.5км');
      expect(service.formatDistance(10000, 'ru')).toBe('10.0км');
    });

    it('should format meters in English', () => {
      expect(service.formatDistance(120, 'en')).toBe('120m');
      expect(service.formatDistance(500, 'en')).toBe('500m');
    });

    it('should format kilometers in English', () => {
      expect(service.formatDistance(1500, 'en')).toBe('1.5km');
      expect(service.formatDistance(10000, 'en')).toBe('10.0km');
    });

    it('should default to Russian', () => {
      expect(service.formatDistance(120)).toBe('120м');
      expect(service.formatDistance(1500)).toBe('1.5км');
    });
  });

  describe('validateCoordinates', () => {
    it('should accept valid Uzbekistan coordinates', () => {
      const result = service.validateCoordinates(41.2995, 69.2401);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid latitude', () => {
      const result = service.validateCoordinates(100, 69.2401);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Latitude');
    });

    it('should reject invalid longitude', () => {
      const result = service.validateCoordinates(41.2995, 200);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Longitude');
    });

    it('should reject NaN values', () => {
      const result = service.validateCoordinates(NaN, 69.2401);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('numbers');
    });

    it('should accept coordinates outside Uzbekistan with warning', () => {
      // London coordinates
      const result = service.validateCoordinates(51.5074, -0.1278);
      expect(result.isValid).toBe(true);
    });
  });

  describe('findNearbyTasks', () => {
    it('should find tasks within radius', async () => {
      const mockTasks = [
        createMockTask('1', nearbyLocation.lat, nearbyLocation.lon),
        createMockTask('2', tashkentAirport.lat, tashkentAirport.lon),
      ];

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockTasks),
      };

      taskRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.findNearbyTasks(
        mockUserId,
        tashkentCenter.lat,
        tashkentCenter.lon,
        1000, // 1km radius
      );

      // Only nearby task should be included
      expect(result).toHaveLength(1);
      expect(result[0].task.id).toBe('1');
      expect(result[0].distance).toBeLessThan(1000);
    });

    it('should return empty array when no tasks found', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      taskRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.findNearbyTasks(
        mockUserId,
        tashkentCenter.lat,
        tashkentCenter.lon,
      );

      expect(result).toHaveLength(0);
    });

    it('should sort tasks by distance (nearest first)', async () => {
      const task1 = createMockTask('far', 41.32, 69.26); // farther
      const task2 = createMockTask('near', nearbyLocation.lat, nearbyLocation.lon); // closer

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([task1, task2]),
      };

      taskRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.findNearbyTasks(
        mockUserId,
        tashkentCenter.lat,
        tashkentCenter.lon,
        10000, // 10km to include both
      );

      expect(result).toHaveLength(2);
      expect(result[0].task.id).toBe('near');
      expect(result[1].task.id).toBe('far');
      expect(result[0].distance).toBeLessThan(result[1].distance);
    });

    it('should handle errors gracefully', async () => {
      taskRepository.createQueryBuilder.mockImplementation(() => {
        throw new Error('DB error');
      });

      const result = await service.findNearbyTasks(
        mockUserId,
        tashkentCenter.lat,
        tashkentCenter.lon,
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('verifyTaskLocation', () => {
    it('should verify operator is at correct location', async () => {
      const task = createMockTask('1', nearbyLocation.lat, nearbyLocation.lon);
      taskRepository.findOne.mockResolvedValue(task as Task);

      const result = await service.verifyTaskLocation(
        'task-1',
        tashkentCenter.lat,
        tashkentCenter.lon,
      );

      expect(result.isValid).toBe(true);
      expect(result.distance).toBeLessThan(100);
      expect(result.threshold).toBe(100);
      expect(result.machineName).toBe('Machine 1');
      expect(result.locationName).toBe('Location 1');
    });

    it('should reject operator too far from location', async () => {
      const task = createMockTask('1', tashkentAirport.lat, tashkentAirport.lon);
      taskRepository.findOne.mockResolvedValue(task as Task);

      const result = await service.verifyTaskLocation(
        'task-1',
        tashkentCenter.lat,
        tashkentCenter.lon,
      );

      expect(result.isValid).toBe(false);
      expect(result.distance).toBeGreaterThan(100);
    });

    it('should handle task not found', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      const result = await service.verifyTaskLocation(
        'non-existent',
        tashkentCenter.lat,
        tashkentCenter.lon,
      );

      expect(result.isValid).toBe(false);
      expect(result.distance).toBe(0);
    });

    it('should handle machine without location', async () => {
      const task = {
        id: '1',
        machine: {
          id: 'machine-1',
          name: 'Machine 1',
          location: null,
        },
      };
      taskRepository.findOne.mockResolvedValue(task as any);

      const result = await service.verifyTaskLocation(
        'task-1',
        tashkentCenter.lat,
        tashkentCenter.lon,
      );

      expect(result.isValid).toBe(false);
      expect(result.machineName).toBe('Machine 1');
    });
  });

  describe('storeTaskLocation', () => {
    it('should store location for active task', async () => {
      const task = createMockTask('1', nearbyLocation.lat, nearbyLocation.lon, TaskStatus.IN_PROGRESS);
      taskRepository.findOne.mockResolvedValue(task as Task);
      taskRepository.save.mockResolvedValue(task as Task);

      const result = await service.storeTaskLocation(
        'task-1',
        tashkentCenter.lat,
        tashkentCenter.lon,
      );

      expect(result).toBe(true);
      expect(taskRepository.save).toHaveBeenCalled();
    });

    it('should reject storing location for completed task', async () => {
      const task = createMockTask('1', nearbyLocation.lat, nearbyLocation.lon, TaskStatus.COMPLETED);
      taskRepository.findOne.mockResolvedValue(task as Task);

      const result = await service.storeTaskLocation(
        'task-1',
        tashkentCenter.lat,
        tashkentCenter.lon,
      );

      expect(result).toBe(false);
      expect(taskRepository.save).not.toHaveBeenCalled();
    });

    it('should handle task not found', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      const result = await service.storeTaskLocation(
        'non-existent',
        tashkentCenter.lat,
        tashkentCenter.lon,
      );

      expect(result).toBe(false);
    });

    it('should append to location history', async () => {
      const task = {
        id: '1',
        status: TaskStatus.IN_PROGRESS,
        metadata: {
          location_history: [
            { latitude: 41.1, longitude: 69.1, timestamp: '2025-01-01T10:00:00Z' },
          ],
        },
      };
      taskRepository.findOne.mockResolvedValue(task as any);
      taskRepository.save.mockImplementation(async (t) => t as Task);

      await service.storeTaskLocation('task-1', tashkentCenter.lat, tashkentCenter.lon);

      expect(taskRepository.save).toHaveBeenCalled();
      const savedTask = taskRepository.save.mock.calls[0][0];
      expect(savedTask.metadata?.location_history).toHaveLength(2);
      expect(savedTask.metadata?.last_operator_location).toBeDefined();
    });
  });

  describe('getLastTaskLocation', () => {
    it('should return last location from metadata', async () => {
      const task = {
        id: '1',
        metadata: {
          last_operator_location: {
            latitude: tashkentCenter.lat,
            longitude: tashkentCenter.lon,
            timestamp: '2025-01-15T10:00:00Z',
          },
        },
      };
      taskRepository.findOne.mockResolvedValue(task as any);

      const result = await service.getLastTaskLocation('task-1');

      expect(result).not.toBeNull();
      expect(result?.latitude).toBe(tashkentCenter.lat);
      expect(result?.longitude).toBe(tashkentCenter.lon);
    });

    it('should return null if no location stored', async () => {
      const task = { id: '1', metadata: null };
      taskRepository.findOne.mockResolvedValue(task as any);

      const result = await service.getLastTaskLocation('task-1');

      expect(result).toBeNull();
    });
  });

  describe('calculateOptimalRoute', () => {
    it('should return empty for no tasks', () => {
      const result = service.calculateOptimalRoute(tashkentCenter.lat, tashkentCenter.lon, []);

      expect(result.orderedTasks).toHaveLength(0);
      expect(result.totalDistance).toBe(0);
    });

    it('should order tasks by nearest first', () => {
      const tasks = [
        { id: 'far', machine: { latitude: 41.35, longitude: 69.30 } },
        { id: 'near', machine: { latitude: nearbyLocation.lat, longitude: nearbyLocation.lon } },
        { id: 'mid', machine: { latitude: 41.31, longitude: 69.25 } },
      ];

      const result = service.calculateOptimalRoute(
        tashkentCenter.lat,
        tashkentCenter.lon,
        tasks,
      );

      expect(result.orderedTasks).toHaveLength(3);
      expect(result.orderedTasks[0].id).toBe('near');
      expect(result.totalDistance).toBeGreaterThan(0);
    });

    it('should calculate total distance correctly', () => {
      const tasks = [
        { id: '1', machine: { latitude: nearbyLocation.lat, longitude: nearbyLocation.lon } },
      ];

      const result = service.calculateOptimalRoute(
        tashkentCenter.lat,
        tashkentCenter.lon,
        tasks,
      );

      expect(result.orderedTasks[0].distance).toBeLessThan(150);
      expect(result.totalDistance).toBe(result.orderedTasks[0].distance);
    });
  });

  describe('findNearbyTasksWithOptimalRoute', () => {
    it('should return empty for no nearby tasks', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      taskRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.findNearbyTasksWithOptimalRoute(
        mockUserId,
        tashkentCenter.lat,
        tashkentCenter.lon,
      );

      expect(result.tasks).toHaveLength(0);
      expect(result.totalDistance).toBe(0);
      expect(result.totalDistanceFormatted).toBe('0м');
    });

    it('should return tasks in optimal order with total distance', async () => {
      const mockTasks = [
        createMockTask('far', 41.31, 69.25),
        createMockTask('near', nearbyLocation.lat, nearbyLocation.lon),
      ];

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockTasks),
      };

      taskRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.findNearbyTasksWithOptimalRoute(
        mockUserId,
        tashkentCenter.lat,
        tashkentCenter.lon,
        10000, // 10km
      );

      expect(result.tasks).toHaveLength(2);
      expect(result.tasks[0].task.id).toBe('near');
      expect(result.totalDistance).toBeGreaterThan(0);
      expect(result.totalDistanceFormatted).toBeDefined();
    });
  });
});
