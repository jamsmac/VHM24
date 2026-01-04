import { Test, TestingModule } from '@nestjs/testing';
import { TelegramLocationService } from './telegram-location.service';
import { TelegramUser, TelegramLanguage } from '../../shared/entities/telegram-user.entity';
import { TelegramCacheService } from '../../infrastructure/services/telegram-cache.service';
import { TasksService } from '../../../tasks/tasks.service';
import { UsersService } from '../../../users/users.service';
import { MachinesService } from '../../../machines/machines.service';
import { LocationsService } from '../../../locations/locations.service';
import { TaskStatus, TaskType } from '../../../tasks/entities/task.entity';
import { MachineStatus } from '../../../machines/entities/machine.entity';

describe('TelegramLocationService', () => {
  let service: TelegramLocationService;
  let tasksService: jest.Mocked<TasksService>;
  let usersService: jest.Mocked<UsersService>;
  let machinesService: jest.Mocked<MachinesService>;
  let locationsService: jest.Mocked<LocationsService>;
  let cacheService: jest.Mocked<TelegramCacheService>;

  const mockTelegramUser: Partial<TelegramUser> = {
    id: 'tg-user-1',
    telegram_id: '123456789',
    user_id: 'user-1',
    is_verified: true,
    language: TelegramLanguage.RU,
  };

  const mockUser = {
    id: 'user-1',
    telegram_id: '123456789',
    full_name: 'Test User',
  };

  // Moscow coordinates for testing
  const mockUserLocation = {
    latitude: 55.7558,
    longitude: 37.6173,
  };

  // Nearby location (~500m away)
  const nearbyLocation = {
    latitude: 55.7590,
    longitude: 37.6200,
  };

  // Far location (~10km away)
  const farLocation = {
    latitude: 55.8500,
    longitude: 37.7000,
  };

  const mockCtx = {
    from: { id: 123456789 },
    chat: { id: 123456789 },
    telegramUser: mockTelegramUser,
    message: {
      location: mockUserLocation,
    },
    reply: jest.fn().mockResolvedValue(undefined),
    replyWithChatAction: jest.fn().mockResolvedValue(undefined),
    answerCbQuery: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramLocationService,
        {
          provide: TasksService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findByTelegramId: jest.fn(),
          },
        },
        {
          provide: MachinesService,
          useValue: {
            findAllSimple: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: LocationsService,
          useValue: {
            findAll: jest.fn(),
          },
        },
        {
          provide: TelegramCacheService,
          useValue: {
            getOrSet: jest.fn().mockImplementation((key, factory) => factory()),
          },
        },
      ],
    }).compile();

    service = module.get<TelegramLocationService>(TelegramLocationService);
    tasksService = module.get(TasksService);
    usersService = module.get(UsersService);
    machinesService = module.get(MachinesService);
    locationsService = module.get(LocationsService);
    cacheService = module.get(TelegramCacheService);

    // Set up helpers
    service.setHelpers({
      t: (lang, key) => key,
      logMessage: jest.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      const distance = service.calculateDistance(mockUserLocation, nearbyLocation);
      // Should be approximately 400-600 meters
      expect(distance).toBeGreaterThan(300);
      expect(distance).toBeLessThan(700);
    });

    it('should return 0 for same coordinates', () => {
      const distance = service.calculateDistance(mockUserLocation, mockUserLocation);
      expect(distance).toBe(0);
    });

    it('should calculate longer distances correctly', () => {
      const distance = service.calculateDistance(mockUserLocation, farLocation);
      // Should be approximately 10km
      expect(distance).toBeGreaterThan(8000);
      expect(distance).toBeLessThan(15000);
    });
  });

  describe('findNearbyTasks', () => {
    it('should find tasks within radius', async () => {
      tasksService.findAll.mockResolvedValue([
        {
          id: 'task-1',
          status: TaskStatus.PENDING,
          task_type: TaskType.REFILL,
          machine: {
            machine_number: 'M-001',
            name: 'Machine 1',
            location: {
              name: 'Location 1',
              latitude: nearbyLocation.latitude,
              longitude: nearbyLocation.longitude,
            },
          },
        },
        {
          id: 'task-2',
          status: TaskStatus.ASSIGNED,
          task_type: TaskType.COLLECTION,
          machine: {
            machine_number: 'M-002',
            name: 'Machine 2',
            location: {
              name: 'Location 2',
              latitude: farLocation.latitude,
              longitude: farLocation.longitude,
            },
          },
        },
      ] as any);

      const nearbyTasks = await service.findNearbyTasks(
        'user-1',
        mockUserLocation,
        1000, // 1km radius
      );

      expect(nearbyTasks).toHaveLength(1);
      expect(nearbyTasks[0].machineNumber).toBe('M-001');
    });

    it('should sort tasks by distance', async () => {
      tasksService.findAll.mockResolvedValue([
        {
          id: 'task-1',
          status: TaskStatus.PENDING,
          task_type: TaskType.REFILL,
          machine: {
            machine_number: 'M-001',
            location: {
              latitude: 55.7600,
              longitude: 37.6250,
            },
          },
        },
        {
          id: 'task-2',
          status: TaskStatus.PENDING,
          task_type: TaskType.COLLECTION,
          machine: {
            machine_number: 'M-002',
            location: nearbyLocation,
          },
        },
      ] as any);

      const nearbyTasks = await service.findNearbyTasks(
        'user-1',
        mockUserLocation,
        5000,
      );

      expect(nearbyTasks.length).toBeGreaterThan(0);
      // First task should be closer
      if (nearbyTasks.length > 1) {
        expect(nearbyTasks[0].distance).toBeLessThanOrEqual(nearbyTasks[1].distance);
      }
    });

    it('should return empty array when no tasks in radius', async () => {
      tasksService.findAll.mockResolvedValue([
        {
          id: 'task-1',
          status: TaskStatus.PENDING,
          machine: {
            location: farLocation,
          },
        },
      ] as any);

      const nearbyTasks = await service.findNearbyTasks(
        'user-1',
        mockUserLocation,
        100, // Very small radius
      );

      expect(nearbyTasks).toHaveLength(0);
    });

    it('should filter only pending/assigned/in_progress tasks', async () => {
      tasksService.findAll.mockResolvedValue([
        {
          id: 'task-1',
          status: TaskStatus.COMPLETED,
          machine: { location: nearbyLocation },
        },
        {
          id: 'task-2',
          status: TaskStatus.PENDING,
          task_type: TaskType.REFILL,
          machine: {
            machine_number: 'M-002',
            location: {
              ...nearbyLocation,
              name: 'Loc',
            },
          },
        },
      ] as any);

      const nearbyTasks = await service.findNearbyTasks(
        'user-1',
        mockUserLocation,
        5000,
      );

      expect(nearbyTasks).toHaveLength(1);
      expect(nearbyTasks[0].taskId).toBe('task-2');
    });
  });

  describe('findNearbyMachines', () => {
    it('should find machines within radius', async () => {
      machinesService.findAllSimple.mockResolvedValue([
        {
          id: 'm-1',
          machine_number: 'M-001',
          name: 'Machine 1',
          status: MachineStatus.ACTIVE,
          location: {
            name: 'Location 1',
            ...nearbyLocation,
          },
        },
        {
          id: 'm-2',
          machine_number: 'M-002',
          name: 'Machine 2',
          status: MachineStatus.ACTIVE,
          location: {
            name: 'Location 2',
            ...farLocation,
          },
        },
      ] as any);

      tasksService.findAll.mockResolvedValue([]);

      const nearbyMachines = await service.findNearbyMachines(
        mockUserLocation,
        1000,
      );

      expect(nearbyMachines).toHaveLength(1);
      expect(nearbyMachines[0].machineNumber).toBe('M-001');
    });

    it('should indicate machines with pending tasks', async () => {
      machinesService.findAllSimple.mockResolvedValue([
        {
          id: 'm-1',
          machine_number: 'M-001',
          location: nearbyLocation,
        },
      ] as any);

      tasksService.findAll.mockResolvedValue([
        {
          machine_id: 'm-1',
          status: TaskStatus.PENDING,
        },
      ] as any);

      const nearbyMachines = await service.findNearbyMachines(
        mockUserLocation,
        5000,
      );

      expect(nearbyMachines[0].hasPendingTasks).toBe(true);
    });
  });

  describe('validateLocationForTask', () => {
    it('should validate when user is close enough', async () => {
      tasksService.findOne.mockResolvedValue({
        id: 'task-1',
        machine: {
          location: nearbyLocation,
        },
      } as any);

      const result = await service.validateLocationForTask(
        mockUserLocation,
        'task-1',
      );

      expect(result.valid).toBe(true);
      expect(result.distance).toBeLessThan(result.threshold);
    });

    it('should invalidate when user is too far', async () => {
      tasksService.findOne.mockResolvedValue({
        id: 'task-1',
        machine: {
          location: farLocation,
        },
      } as any);

      const result = await service.validateLocationForTask(
        mockUserLocation,
        'task-1',
      );

      expect(result.valid).toBe(false);
      expect(result.distance).toBeGreaterThan(result.threshold);
    });

    it('should return valid when task has no location', async () => {
      tasksService.findOne.mockResolvedValue({
        id: 'task-1',
        machine: {
          location: null,
        },
      } as any);

      const result = await service.validateLocationForTask(
        mockUserLocation,
        'task-1',
      );

      expect(result.valid).toBe(true);
    });
  });

  describe('handleLocationMessage', () => {
    it('should require verification', async () => {
      const ctx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, is_verified: false },
      };

      await service.handleLocationMessage(ctx as any);

      expect(ctx.reply).toHaveBeenCalledWith('not_verified');
    });

    it('should find nearby tasks when user shares location', async () => {
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.findAll.mockResolvedValue([
        {
          id: 'task-1',
          status: TaskStatus.PENDING,
          task_type: TaskType.REFILL,
          machine: {
            machine_number: 'M-001',
            name: 'Machine 1',
            location: {
              name: 'Location 1',
              ...nearbyLocation,
            },
          },
        },
      ] as any);

      await service.handleLocationMessage(mockCtx as any);

      expect(usersService.findByTelegramId).toHaveBeenCalled();
      expect(tasksService.findAll).toHaveBeenCalled();
      expect(mockCtx.reply).toHaveBeenCalled();
    });

    it('should show machines when no nearby tasks', async () => {
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.findAll.mockResolvedValue([]);
      machinesService.findAllSimple.mockResolvedValue([
        {
          id: 'm-1',
          machine_number: 'M-001',
          location: nearbyLocation,
        },
      ] as any);

      await service.handleLocationMessage(mockCtx as any);

      expect(machinesService.findAllSimple).toHaveBeenCalled();
    });
  });

  describe('handleNearbyCommand', () => {
    it('should request location from user', async () => {
      await service.handleNearbyCommand(mockCtx as any);

      expect(mockCtx.reply).toHaveBeenCalled();
      const replyCall = mockCtx.reply.mock.calls[0][0];
      expect(replyCall).toContain('местоположение');
    });
  });

  describe('handleRouteCommand', () => {
    it('should request location for route building', async () => {
      await service.handleRouteCommand(mockCtx as any);

      expect(mockCtx.reply).toHaveBeenCalled();
      const replyCall = mockCtx.reply.mock.calls[0][0];
      expect(replyCall).toContain('маршрут');
    });
  });

  describe('formatDistance', () => {
    it('should format meters correctly', () => {
      const result = service.formatDistance(500, TelegramLanguage.RU);
      expect(result).toBe('500м');
    });

    it('should format kilometers correctly', () => {
      const result = service.formatDistance(2500, TelegramLanguage.RU);
      expect(result).toBe('2.5км');
    });

    it('should use English units', () => {
      const result = service.formatDistance(500, TelegramLanguage.EN);
      expect(result).toBe('500m');
    });
  });

  describe('getGoogleMapsUrl', () => {
    it('should generate correct Google Maps URL', () => {
      const url = service.getGoogleMapsUrl(mockUserLocation);
      expect(url).toContain('google.com/maps');
      expect(url).toContain(String(mockUserLocation.latitude));
      expect(url).toContain(String(mockUserLocation.longitude));
    });
  });

  describe('getYandexMapsUrl', () => {
    it('should generate correct Yandex Maps URL', () => {
      const url = service.getYandexMapsUrl(mockUserLocation);
      expect(url).toContain('yandex.ru/maps');
      expect(url).toContain(String(mockUserLocation.latitude));
      expect(url).toContain(String(mockUserLocation.longitude));
    });
  });

  describe('handleStartNearestCallback', () => {
    it('should show navigation to task', async () => {
      const ctx = {
        ...mockCtx,
        answerCbQuery: jest.fn().mockResolvedValue(undefined),
      };

      tasksService.findOne.mockResolvedValue({
        id: 'task-1',
        task_type: TaskType.REFILL,
        machine: {
          machine_number: 'M-001',
          location: {
            name: 'Test Location',
            ...nearbyLocation,
          },
        },
      } as any);

      await service.handleStartNearestCallback(ctx as any, 'task-1');

      expect(ctx.answerCbQuery).toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalled();
      const replyCall = ctx.reply.mock.calls[0][0];
      expect(replyCall).toContain('google.com/maps');
    });

    it('should handle task not found', async () => {
      const ctx = {
        ...mockCtx,
        answerCbQuery: jest.fn().mockResolvedValue(undefined),
      };

      tasksService.findOne.mockResolvedValue(null as any);

      await service.handleStartNearestCallback(ctx as any, 'task-1');

      expect(ctx.reply).toHaveBeenCalled();
      const replyCall = ctx.reply.mock.calls[0][0];
      expect(replyCall).toContain('не найдена');
    });
  });
});
