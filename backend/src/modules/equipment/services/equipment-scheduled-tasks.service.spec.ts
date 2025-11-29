import { Test, TestingModule } from '@nestjs/testing';
import { EquipmentScheduledTasksService } from './equipment-scheduled-tasks.service';
import { ComponentsService } from './components.service';
import { SparePartsService } from './spare-parts.service';
import { WashingSchedulesService } from './washing-schedules.service';
import { EquipmentNotificationsService } from './equipment-notifications.service';
import { TasksService } from '../../tasks/tasks.service';
import { TaskType, TaskPriority } from '../../tasks/entities/task.entity';

describe('EquipmentScheduledTasksService', () => {
  let service: EquipmentScheduledTasksService;
  let mockComponentsService: any;
  let mockSparePartsService: any;
  let mockWashingSchedulesService: any;
  let mockEquipmentNotificationsService: any;
  let mockTasksService: any;

  const originalEnv = process.env.ENABLE_SCHEDULED_TASKS;

  beforeEach(async () => {
    mockComponentsService = {
      getComponentsNeedingMaintenance: jest.fn().mockResolvedValue([]),
      getComponentsNearingLifetime: jest.fn().mockResolvedValue([]),
      getComponentStats: jest.fn().mockResolvedValue({}),
    };

    mockSparePartsService = {
      getLowStockParts: jest.fn().mockResolvedValue([]),
      getStats: jest.fn().mockResolvedValue({}),
    };

    mockWashingSchedulesService = {
      getOverdueSchedules: jest.fn().mockResolvedValue([]),
      getUpcomingSchedules: jest.fn().mockResolvedValue([]),
      getStats: jest.fn().mockResolvedValue({}),
    };

    mockEquipmentNotificationsService = {
      getMaintenanceTeamUserIds: jest.fn().mockResolvedValue([]),
      notifyComponentNeedsMaintenance: jest.fn().mockResolvedValue(undefined),
      notifyComponentNearingLifetime: jest.fn().mockResolvedValue(undefined),
      notifySparePartLowStock: jest.fn().mockResolvedValue(undefined),
      notifyWashingOverdue: jest.fn().mockResolvedValue(undefined),
      notifyWashingUpcoming: jest.fn().mockResolvedValue(undefined),
    };

    mockTasksService = {
      create: jest.fn().mockResolvedValue({ id: 'task-123' }),
      findAll: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipmentScheduledTasksService,
        { provide: ComponentsService, useValue: mockComponentsService },
        { provide: SparePartsService, useValue: mockSparePartsService },
        { provide: WashingSchedulesService, useValue: mockWashingSchedulesService },
        { provide: EquipmentNotificationsService, useValue: mockEquipmentNotificationsService },
        { provide: TasksService, useValue: mockTasksService },
      ],
    }).compile();

    service = module.get<EquipmentScheduledTasksService>(EquipmentScheduledTasksService);
  });

  afterEach(() => {
    process.env.ENABLE_SCHEDULED_TASKS = originalEnv;
    jest.clearAllMocks();
  });

  describe('checkComponentsNeedingMaintenance', () => {
    it('should do nothing when scheduled tasks are disabled', async () => {
      process.env.ENABLE_SCHEDULED_TASKS = 'false';

      await service.checkComponentsNeedingMaintenance();

      expect(mockComponentsService.getComponentsNeedingMaintenance).not.toHaveBeenCalled();
    });

    it('should check for components needing maintenance', async () => {
      process.env.ENABLE_SCHEDULED_TASKS = 'true';

      const mockComponents = [
        { id: 'comp-1', name: 'Component 1' },
        { id: 'comp-2', name: 'Component 2' },
      ];

      mockComponentsService.getComponentsNeedingMaintenance.mockResolvedValue(mockComponents);
      mockEquipmentNotificationsService.getMaintenanceTeamUserIds.mockResolvedValue(['user-1']);

      await service.checkComponentsNeedingMaintenance();

      expect(mockComponentsService.getComponentsNeedingMaintenance).toHaveBeenCalled();
      expect(
        mockEquipmentNotificationsService.notifyComponentNeedsMaintenance,
      ).toHaveBeenCalledTimes(2);
    });

    it('should not send notifications when no maintenance team', async () => {
      process.env.ENABLE_SCHEDULED_TASKS = 'true';

      mockComponentsService.getComponentsNeedingMaintenance.mockResolvedValue([{ id: 'comp-1' }]);
      mockEquipmentNotificationsService.getMaintenanceTeamUserIds.mockResolvedValue([]);

      await service.checkComponentsNeedingMaintenance();

      expect(
        mockEquipmentNotificationsService.notifyComponentNeedsMaintenance,
      ).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      process.env.ENABLE_SCHEDULED_TASKS = 'true';

      mockComponentsService.getComponentsNeedingMaintenance.mockRejectedValue(
        new Error('DB error'),
      );

      await expect(service.checkComponentsNeedingMaintenance()).resolves.not.toThrow();
    });
  });

  describe('checkComponentsNearingLifetime', () => {
    it('should do nothing when scheduled tasks are disabled', async () => {
      process.env.ENABLE_SCHEDULED_TASKS = 'false';

      await service.checkComponentsNearingLifetime();

      expect(mockComponentsService.getComponentsNearingLifetime).not.toHaveBeenCalled();
    });

    it('should check for components nearing lifetime and calculate percentage', async () => {
      process.env.ENABLE_SCHEDULED_TASKS = 'true';

      const mockComponents = [
        { id: 'comp-1', working_hours: 900, expected_lifetime_hours: 1000 },
        { id: 'comp-2', working_hours: 800, expected_lifetime_hours: null },
      ];

      mockComponentsService.getComponentsNearingLifetime.mockResolvedValue(mockComponents);
      mockEquipmentNotificationsService.getMaintenanceTeamUserIds.mockResolvedValue(['user-1']);

      await service.checkComponentsNearingLifetime();

      expect(
        mockEquipmentNotificationsService.notifyComponentNearingLifetime,
      ).toHaveBeenCalledTimes(2);
      expect(
        mockEquipmentNotificationsService.notifyComponentNearingLifetime,
      ).toHaveBeenNthCalledWith(
        1,
        mockComponents[0],
        ['user-1'],
        90, // 900/1000 * 100
      );
      expect(
        mockEquipmentNotificationsService.notifyComponentNearingLifetime,
      ).toHaveBeenNthCalledWith(
        2,
        mockComponents[1],
        ['user-1'],
        0, // No expected_lifetime_hours
      );
    });

    it('should handle zero expected lifetime hours', async () => {
      process.env.ENABLE_SCHEDULED_TASKS = 'true';

      const mockComponents = [{ id: 'comp-1', working_hours: 100, expected_lifetime_hours: 0 }];

      mockComponentsService.getComponentsNearingLifetime.mockResolvedValue(mockComponents);
      mockEquipmentNotificationsService.getMaintenanceTeamUserIds.mockResolvedValue(['user-1']);

      await service.checkComponentsNearingLifetime();

      expect(mockEquipmentNotificationsService.notifyComponentNearingLifetime).toHaveBeenCalledWith(
        mockComponents[0],
        ['user-1'],
        0,
      );
    });
  });

  describe('checkLowStockSpareParts', () => {
    it('should do nothing when scheduled tasks are disabled', async () => {
      process.env.ENABLE_SCHEDULED_TASKS = 'false';

      await service.checkLowStockSpareParts();

      expect(mockSparePartsService.getLowStockParts).not.toHaveBeenCalled();
    });

    it('should check for low stock spare parts', async () => {
      process.env.ENABLE_SCHEDULED_TASKS = 'true';

      const mockParts = [{ id: 'part-1', name: 'Part 1' }];

      mockSparePartsService.getLowStockParts.mockResolvedValue(mockParts);
      mockEquipmentNotificationsService.getMaintenanceTeamUserIds.mockResolvedValue(['user-1']);

      await service.checkLowStockSpareParts();

      expect(mockEquipmentNotificationsService.notifySparePartLowStock).toHaveBeenCalledWith(
        mockParts[0],
        ['user-1'],
      );
    });
  });

  describe('checkOverdueWashingSchedules', () => {
    it('should do nothing when scheduled tasks are disabled', async () => {
      process.env.ENABLE_SCHEDULED_TASKS = 'false';

      await service.checkOverdueWashingSchedules();

      expect(mockWashingSchedulesService.getOverdueSchedules).not.toHaveBeenCalled();
    });

    it('should check for overdue washing schedules', async () => {
      process.env.ENABLE_SCHEDULED_TASKS = 'true';

      const mockSchedules = [{ id: 'sched-1', name: 'Schedule 1' }];

      mockWashingSchedulesService.getOverdueSchedules.mockResolvedValue(mockSchedules);
      mockEquipmentNotificationsService.getMaintenanceTeamUserIds.mockResolvedValue(['user-1']);

      await service.checkOverdueWashingSchedules();

      expect(mockEquipmentNotificationsService.notifyWashingOverdue).toHaveBeenCalledWith(
        mockSchedules[0],
        ['user-1'],
      );
    });
  });

  describe('checkUpcomingWashingSchedules', () => {
    it('should do nothing when scheduled tasks are disabled', async () => {
      process.env.ENABLE_SCHEDULED_TASKS = 'false';

      await service.checkUpcomingWashingSchedules();

      expect(mockWashingSchedulesService.getUpcomingSchedules).not.toHaveBeenCalled();
    });

    it('should check for upcoming washing schedules and calculate days until', async () => {
      process.env.ENABLE_SCHEDULED_TASKS = 'true';

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);

      const mockSchedules = [{ id: 'sched-1', next_wash_date: futureDate }];

      mockWashingSchedulesService.getUpcomingSchedules.mockResolvedValue(mockSchedules);
      mockEquipmentNotificationsService.getMaintenanceTeamUserIds.mockResolvedValue(['user-1']);

      await service.checkUpcomingWashingSchedules();

      expect(mockWashingSchedulesService.getUpcomingSchedules).toHaveBeenCalledWith(3);
      expect(mockEquipmentNotificationsService.notifyWashingUpcoming).toHaveBeenCalledWith(
        mockSchedules[0],
        ['user-1'],
        expect.any(Number),
      );
    });
  });

  describe('createWashingTasks', () => {
    it('should do nothing when scheduled tasks are disabled', async () => {
      process.env.ENABLE_SCHEDULED_TASKS = 'false';

      await service.createWashingTasks();

      expect(mockWashingSchedulesService.getOverdueSchedules).not.toHaveBeenCalled();
    });

    it('should create tasks for overdue schedules with auto_create_tasks enabled', async () => {
      process.env.ENABLE_SCHEDULED_TASKS = 'true';

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const mockSchedules = [
        {
          id: 'sched-1',
          machine_id: 'machine-1',
          name: 'Daily Wash',
          auto_create_tasks: true,
          next_wash_date: pastDate,
          component_types: ['hopper', 'grinder'],
          required_materials: ['Soap', 'Water'],
          instructions: 'Test instructions',
          last_washed_by_user_id: 'user-123',
          estimated_duration_minutes: 30,
        },
      ];

      mockWashingSchedulesService.getOverdueSchedules.mockResolvedValue(mockSchedules);
      mockTasksService.findAll.mockResolvedValue([]);

      await service.createWashingTasks();

      expect(mockTasksService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type_code: TaskType.CLEANING,
          machine_id: 'machine-1',
          priority: TaskPriority.NORMAL,
          metadata: expect.objectContaining({
            washing_schedule_id: 'sched-1',
            auto_created: true,
          }),
        }),
      );
    });

    it('should skip schedules with auto_create_tasks disabled', async () => {
      process.env.ENABLE_SCHEDULED_TASKS = 'true';

      const mockSchedules = [
        {
          id: 'sched-1',
          auto_create_tasks: false,
        },
      ];

      mockWashingSchedulesService.getOverdueSchedules.mockResolvedValue(mockSchedules);

      await service.createWashingTasks();

      expect(mockTasksService.create).not.toHaveBeenCalled();
    });

    it('should skip if active task already exists', async () => {
      process.env.ENABLE_SCHEDULED_TASKS = 'true';

      const mockSchedules = [
        {
          id: 'sched-1',
          machine_id: 'machine-1',
          auto_create_tasks: true,
          component_types: [],
        },
      ];

      const existingTasks = [{ id: 'task-1', status: 'pending' }];

      mockWashingSchedulesService.getOverdueSchedules.mockResolvedValue(mockSchedules);
      mockTasksService.findAll.mockResolvedValue(existingTasks);

      await service.createWashingTasks();

      expect(mockTasksService.create).not.toHaveBeenCalled();
    });

    it('should create task if existing tasks are completed', async () => {
      process.env.ENABLE_SCHEDULED_TASKS = 'true';

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const mockSchedules = [
        {
          id: 'sched-1',
          machine_id: 'machine-1',
          name: 'Daily Wash',
          auto_create_tasks: true,
          next_wash_date: pastDate,
          component_types: ['hopper'],
          required_materials: [],
          last_washed_by_user_id: null,
        },
      ];

      const existingTasks = [{ id: 'task-1', status: 'completed' }];

      mockWashingSchedulesService.getOverdueSchedules.mockResolvedValue(mockSchedules);
      mockTasksService.findAll.mockResolvedValue(existingTasks);

      await service.createWashingTasks();

      expect(mockTasksService.create).toHaveBeenCalled();
    });

    it('should handle errors in task creation gracefully', async () => {
      process.env.ENABLE_SCHEDULED_TASKS = 'true';

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const mockSchedules = [
        {
          id: 'sched-1',
          machine_id: 'machine-1',
          auto_create_tasks: true,
          next_wash_date: pastDate,
          component_types: ['hopper'],
          required_materials: [],
        },
        {
          id: 'sched-2',
          machine_id: 'machine-2',
          auto_create_tasks: true,
          next_wash_date: pastDate,
          component_types: ['grinder'],
          required_materials: [],
        },
      ];

      mockWashingSchedulesService.getOverdueSchedules.mockResolvedValue(mockSchedules);
      mockTasksService.findAll.mockResolvedValue([]);
      mockTasksService.create
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce({ id: 'task-2' });

      await expect(service.createWashingTasks()).resolves.not.toThrow();
      expect(mockTasksService.create).toHaveBeenCalledTimes(2);
    });

    it('should build correct checklist for washing tasks', async () => {
      process.env.ENABLE_SCHEDULED_TASKS = 'true';

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const mockSchedules = [
        {
          id: 'sched-1',
          machine_id: 'machine-1',
          auto_create_tasks: true,
          next_wash_date: pastDate,
          component_types: ['hopper', 'mixer'],
          required_materials: ['Soap'],
          last_washed_by_user_id: null,
        },
      ];

      mockWashingSchedulesService.getOverdueSchedules.mockResolvedValue(mockSchedules);
      mockTasksService.findAll.mockResolvedValue([]);

      await service.createWashingTasks();

      expect(mockTasksService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          checklist: expect.arrayContaining([
            expect.objectContaining({ item: expect.stringContaining('бункер') }),
            expect.objectContaining({ item: expect.stringContaining('миксер') }),
            expect.objectContaining({ item: expect.stringContaining('моющих средств') }),
            expect.objectContaining({ item: expect.stringContaining('работоспособность') }),
            expect.objectContaining({ item: expect.stringContaining('фото ДО и ПОСЛЕ') }),
          ]),
        }),
      );
    });
  });

  describe('logEquipmentHealthStats', () => {
    it('should do nothing when scheduled tasks are disabled', async () => {
      process.env.ENABLE_SCHEDULED_TASKS = 'false';

      await service.logEquipmentHealthStats();

      expect(mockComponentsService.getComponentStats).not.toHaveBeenCalled();
    });

    it('should log equipment health statistics', async () => {
      process.env.ENABLE_SCHEDULED_TASKS = 'true';

      mockComponentsService.getComponentStats.mockResolvedValue({ total: 100 });
      mockSparePartsService.getStats.mockResolvedValue({ low_stock: 5 });
      mockWashingSchedulesService.getStats.mockResolvedValue({ overdue: 3 });

      await service.logEquipmentHealthStats();

      expect(mockComponentsService.getComponentStats).toHaveBeenCalled();
      expect(mockSparePartsService.getStats).toHaveBeenCalled();
      expect(mockWashingSchedulesService.getStats).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      process.env.ENABLE_SCHEDULED_TASKS = 'true';

      mockComponentsService.getComponentStats.mockRejectedValue(new Error('DB error'));

      await expect(service.logEquipmentHealthStats()).resolves.not.toThrow();
    });
  });
});
