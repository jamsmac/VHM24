import { Test, TestingModule } from '@nestjs/testing';
import { TelegramWorkflowService } from './telegram-workflow.service';
import { TelegramNotificationsService } from '../../notifications/services/telegram-notifications.service';
import { TasksService } from '../../../tasks/tasks.service';
import { UsersService } from '../../../users/users.service';
import { MachinesService } from '../../../machines/machines.service';
import { TaskStatus, TaskType } from '../../../tasks/entities/task.entity';
import { MachineStatus } from '../../../machines/entities/machine.entity';
import { UserRole } from '../../../users/entities/user.entity';

describe('TelegramWorkflowService', () => {
  let service: TelegramWorkflowService;
  let notificationsService: jest.Mocked<TelegramNotificationsService>;
  let tasksService: jest.Mocked<TasksService>;
  let usersService: jest.Mocked<UsersService>;
  let machinesService: jest.Mocked<MachinesService>;

  const mockUser = {
    id: 'user-1',
    telegram_user_id: '123456789',
    full_name: 'Test User',
  };

  const mockManager = {
    id: 'manager-1',
    telegram_user_id: '987654321',
    full_name: 'Manager User',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramWorkflowService,
        {
          provide: TelegramNotificationsService,
          useValue: {
            sendNotification: jest.fn().mockResolvedValue(undefined),
          },
        },
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
            findOne: jest.fn(),
            findByRole: jest.fn(),
          },
        },
        {
          provide: MachinesService,
          useValue: {
            findAllSimple: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TelegramWorkflowService>(TelegramWorkflowService);
    notificationsService = module.get(TelegramNotificationsService);
    tasksService = module.get(TasksService);
    usersService = module.get(UsersService);
    machinesService = module.get(MachinesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWorkflows', () => {
    it('should return list of workflows', () => {
      const workflows = service.getWorkflows();

      expect(Array.isArray(workflows)).toBe(true);
      expect(workflows.length).toBeGreaterThan(0);
      expect(workflows[0]).toHaveProperty('id');
      expect(workflows[0]).toHaveProperty('name');
      expect(workflows[0]).toHaveProperty('enabled');
    });

    it('should include task reminder workflow', () => {
      const workflows = service.getWorkflows();
      const taskReminder = workflows.find((w) => w.id === 'task_reminder_2h');

      expect(taskReminder).toBeDefined();
      expect(taskReminder!.enabled).toBe(true);
    });

    it('should include morning briefing workflow', () => {
      const workflows = service.getWorkflows();
      const briefing = workflows.find((w) => w.id === 'morning_briefing');

      expect(briefing).toBeDefined();
      expect(briefing!.enabled).toBe(true);
    });
  });

  describe('setWorkflowEnabled', () => {
    it('should enable workflow', () => {
      service.setWorkflowEnabled('task_reminder_2h', false);
      const workflows = service.getWorkflows();
      const workflow = workflows.find((w) => w.id === 'task_reminder_2h');

      expect(workflow!.enabled).toBe(false);

      // Re-enable
      service.setWorkflowEnabled('task_reminder_2h', true);
      expect(workflows.find((w) => w.id === 'task_reminder_2h')!.enabled).toBe(true);
    });

    it('should return false for unknown workflow', () => {
      const result = service.setWorkflowEnabled('unknown_workflow', true);
      expect(result).toBe(false);
    });

    it('should return true for valid workflow', () => {
      const result = service.setWorkflowEnabled('task_reminder_2h', true);
      expect(result).toBe(true);
    });
  });

  describe('checkOverdueTasks', () => {
    it('should not run if workflow is disabled', async () => {
      service.setWorkflowEnabled('task_reminder_2h', false);

      await service.checkOverdueTasks();

      expect(tasksService.findAll).not.toHaveBeenCalled();

      // Re-enable
      service.setWorkflowEnabled('task_reminder_2h', true);
    });

    it('should send reminders for overdue tasks', async () => {
      const overdueDate = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago

      tasksService.findAll.mockResolvedValue([
        {
          id: 'task-1',
          status: TaskStatus.ASSIGNED,
          task_type: TaskType.REFILL,
          scheduled_date: overdueDate,
          assigned_to_user_id: 'user-1',
          machine: { machine_number: 'M-001' },
        },
      ] as any);

      usersService.findOne.mockResolvedValue(mockUser as any);

      await service.checkOverdueTasks();

      expect(tasksService.findAll).toHaveBeenCalled();
      expect(usersService.findOne).toHaveBeenCalledWith('user-1');
      expect(notificationsService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: 'task_reminder',
        }),
      );
    });

    it('should skip tasks without assigned user', async () => {
      const overdueDate = new Date(Date.now() - 3 * 60 * 60 * 1000);

      tasksService.findAll.mockResolvedValue([
        {
          id: 'task-1',
          status: TaskStatus.ASSIGNED,
          scheduled_date: overdueDate,
          assigned_to_user_id: null,
        },
      ] as any);

      await service.checkOverdueTasks();

      expect(notificationsService.sendNotification).not.toHaveBeenCalled();
    });

    it('should skip users without telegram_user_id', async () => {
      const overdueDate = new Date(Date.now() - 3 * 60 * 60 * 1000);

      tasksService.findAll.mockResolvedValue([
        {
          id: 'task-1',
          status: TaskStatus.ASSIGNED,
          scheduled_date: overdueDate,
          assigned_to_user_id: 'user-1',
        },
      ] as any);

      usersService.findOne.mockResolvedValue({ id: 'user-1', telegram_user_id: null } as any);

      await service.checkOverdueTasks();

      expect(notificationsService.sendNotification).not.toHaveBeenCalled();
    });

    it('should filter only active tasks', async () => {
      const overdueDate = new Date(Date.now() - 3 * 60 * 60 * 1000);

      tasksService.findAll.mockResolvedValue([
        {
          id: 'task-1',
          status: TaskStatus.COMPLETED,
          scheduled_date: overdueDate,
          assigned_to_user_id: 'user-1',
        },
        {
          id: 'task-2',
          status: TaskStatus.CANCELLED,
          scheduled_date: overdueDate,
          assigned_to_user_id: 'user-1',
        },
      ] as any);

      await service.checkOverdueTasks();

      expect(notificationsService.sendNotification).not.toHaveBeenCalled();
    });
  });

  describe('sendMorningBriefing', () => {
    it('should not run if workflow is disabled', async () => {
      service.setWorkflowEnabled('morning_briefing', false);

      await service.sendMorningBriefing();

      expect(tasksService.findAll).not.toHaveBeenCalled();

      // Re-enable
      service.setWorkflowEnabled('morning_briefing', true);
    });

    it('should send briefing to operators with pending tasks', async () => {
      tasksService.findAll.mockResolvedValue([
        {
          id: 'task-1',
          status: TaskStatus.ASSIGNED,
          task_type: TaskType.REFILL,
          assigned_to_user_id: 'user-1',
          machine: { machine_number: 'M-001' },
        },
        {
          id: 'task-2',
          status: TaskStatus.ASSIGNED,
          task_type: TaskType.COLLECTION,
          assigned_to_user_id: 'user-1',
          machine: { machine_number: 'M-002' },
        },
      ] as any);

      usersService.findOne.mockResolvedValue(mockUser as any);

      await service.sendMorningBriefing();

      expect(tasksService.findAll).toHaveBeenCalledWith(TaskStatus.ASSIGNED);
      expect(notificationsService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: 'briefing',
        }),
      );
    });

    it('should group tasks by operator', async () => {
      tasksService.findAll.mockResolvedValue([
        {
          id: 'task-1',
          status: TaskStatus.ASSIGNED,
          task_type: TaskType.REFILL,
          assigned_to_user_id: 'user-1',
          machine: { machine_number: 'M-001' },
        },
        {
          id: 'task-2',
          status: TaskStatus.ASSIGNED,
          task_type: TaskType.COLLECTION,
          assigned_to_user_id: 'user-2',
          machine: { machine_number: 'M-002' },
        },
      ] as any);

      usersService.findOne.mockImplementation((id) => {
        if (id === 'user-1') return Promise.resolve(mockUser as any);
        if (id === 'user-2')
          return Promise.resolve({ ...mockUser, id: 'user-2', telegram_user_id: '111' } as any);
        return Promise.resolve(null);
      });

      await service.sendMorningBriefing();

      // Should send 2 briefings
      expect(notificationsService.sendNotification).toHaveBeenCalledTimes(2);
    });
  });

  describe('checkMachineStatus', () => {
    it('should not run if workflow is disabled', async () => {
      service.setWorkflowEnabled('machine_offline_alert', false);

      await service.checkMachineStatus();

      expect(machinesService.findAllSimple).not.toHaveBeenCalled();

      // Re-enable
      service.setWorkflowEnabled('machine_offline_alert', true);
    });

    it('should notify managers about problem machines', async () => {
      machinesService.findAllSimple.mockResolvedValue([
        {
          id: 'm-1',
          machine_number: 'M-001',
          status: MachineStatus.OFFLINE,
          location: { name: 'Location 1' },
        },
        {
          id: 'm-2',
          machine_number: 'M-002',
          status: MachineStatus.ERROR,
          location: { name: 'Location 2' },
        },
      ] as any);

      usersService.findByRole.mockResolvedValue([mockManager] as any);

      await service.checkMachineStatus();

      expect(machinesService.findAllSimple).toHaveBeenCalled();
      expect(usersService.findByRole).toHaveBeenCalledWith(UserRole.MANAGER);
      expect(notificationsService.sendNotification).toHaveBeenCalled();
    });

    it('should not notify if no problem machines', async () => {
      machinesService.findAllSimple.mockResolvedValue([
        {
          id: 'm-1',
          machine_number: 'M-001',
          status: MachineStatus.ACTIVE,
          location: { name: 'Location 1' },
        },
      ] as any);

      await service.checkMachineStatus();

      expect(notificationsService.sendNotification).not.toHaveBeenCalled();
    });

    it('should filter maintenance, offline, and error machines', async () => {
      machinesService.findAllSimple.mockResolvedValue([
        { id: 'm-1', status: MachineStatus.ACTIVE },
        { id: 'm-2', status: MachineStatus.OFFLINE, machine_number: 'M-002' },
        { id: 'm-3', status: MachineStatus.ERROR, machine_number: 'M-003' },
        { id: 'm-4', status: MachineStatus.MAINTENANCE, machine_number: 'M-004' },
        { id: 'm-5', status: MachineStatus.LOW_STOCK },
      ] as any);

      usersService.findByRole.mockResolvedValue([mockManager] as any);

      await service.checkMachineStatus();

      expect(notificationsService.sendNotification).toHaveBeenCalled();
    });
  });

  describe('triggerWorkflow', () => {
    it('should trigger task reminder workflow', async () => {
      tasksService.findAll.mockResolvedValue([]);

      await service.triggerWorkflow('task_reminder_2h');

      expect(tasksService.findAll).toHaveBeenCalled();
    });

    it('should trigger morning briefing workflow', async () => {
      tasksService.findAll.mockResolvedValue([]);

      await service.triggerWorkflow('morning_briefing');

      expect(tasksService.findAll).toHaveBeenCalledWith(TaskStatus.ASSIGNED);
    });

    it('should trigger machine status workflow', async () => {
      machinesService.findAllSimple.mockResolvedValue([]);

      await service.triggerWorkflow('machine_offline_alert');

      expect(machinesService.findAllSimple).toHaveBeenCalled();
    });

    it('should handle unknown workflow', async () => {
      // Should not throw
      await expect(service.triggerWorkflow('unknown')).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle errors in checkOverdueTasks gracefully', async () => {
      tasksService.findAll.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect(service.checkOverdueTasks()).resolves.not.toThrow();
    });

    it('should handle errors in sendMorningBriefing gracefully', async () => {
      tasksService.findAll.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect(service.sendMorningBriefing()).resolves.not.toThrow();
    });

    it('should handle errors in checkMachineStatus gracefully', async () => {
      machinesService.findAllSimple.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect(service.checkMachineStatus()).resolves.not.toThrow();
    });

    it('should continue processing other reminders if one fails', async () => {
      const overdueDate = new Date(Date.now() - 3 * 60 * 60 * 1000);

      tasksService.findAll.mockResolvedValue([
        {
          id: 'task-1',
          status: TaskStatus.ASSIGNED,
          task_type: TaskType.REFILL,
          scheduled_date: overdueDate,
          assigned_to_user_id: 'user-1',
          machine: { machine_number: 'M-001' },
        },
        {
          id: 'task-2',
          status: TaskStatus.ASSIGNED,
          task_type: TaskType.COLLECTION,
          scheduled_date: overdueDate,
          assigned_to_user_id: 'user-2',
          machine: { machine_number: 'M-002' },
        },
      ] as any);

      usersService.findOne.mockImplementation((id) => {
        if (id === 'user-1') return Promise.resolve(mockUser as any);
        if (id === 'user-2')
          return Promise.resolve({ ...mockUser, id: 'user-2', telegram_user_id: '222' } as any);
        return Promise.resolve(null);
      });

      // First notification fails
      notificationsService.sendNotification
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(undefined);

      await service.checkOverdueTasks();

      // Should still attempt to send second notification
      expect(notificationsService.sendNotification).toHaveBeenCalledTimes(2);
    });
  });
});
