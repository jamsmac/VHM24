import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenException } from '@nestjs/common';
import { TelegramManagerToolsService } from './telegram-manager-tools.service';
import { TelegramResilientApiService } from './telegram-resilient-api.service';
import { TelegramI18nService } from './telegram-i18n.service';
import { TelegramUser, TelegramUserStatus, TelegramLanguage } from '../entities/telegram-user.entity';
import { User, UserRole, UserStatus } from '../../users/entities/user.entity';
import { Task, TaskStatus, TaskType, TaskPriority } from '../../tasks/entities/task.entity';
import { UsersService } from '../../users/users.service';
import { TasksService } from '../../tasks/tasks.service';
import { FilesService } from '../../files/files.service';

describe('TelegramManagerToolsService', () => {
  let service: TelegramManagerToolsService;
  let telegramUserRepository: jest.Mocked<Repository<TelegramUser>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let resilientApi: jest.Mocked<TelegramResilientApiService>;
  let _i18nService: jest.Mocked<TelegramI18nService>;
  let _usersService: jest.Mocked<UsersService>;
  let tasksService: jest.Mocked<TasksService>;
  let filesService: jest.Mocked<FilesService>;

  const mockManager: Partial<User> = {
    id: 'manager-id',
    full_name: 'Test Manager',
    email: 'manager@test.com',
    role: UserRole.MANAGER,
    status: UserStatus.ACTIVE,
  };

  const mockAdmin: Partial<User> = {
    id: 'admin-id',
    full_name: 'Test Admin',
    email: 'admin@test.com',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
  };

  const mockOperator: Partial<User> = {
    id: 'operator-id',
    full_name: 'Test Operator',
    email: 'operator@test.com',
    role: UserRole.OPERATOR,
    status: UserStatus.ACTIVE,
  };

  const mockTelegramUser: Partial<TelegramUser> = {
    id: 'telegram-user-id',
    user_id: 'operator-id',
    telegram_id: '123456789',
    chat_id: '123456789',
    is_verified: true,
    status: TelegramUserStatus.ACTIVE,
    language: TelegramLanguage.RU,
    first_name: 'Test',
    last_interaction_at: new Date(),
    user: mockOperator as User,
  };

  const mockTask: Partial<Task> = {
    id: 'task-id',
    type_code: TaskType.REFILL,
    status: TaskStatus.PENDING,
    priority: TaskPriority.NORMAL,
    machine_id: 'machine-id',
    assigned_to_user_id: null,
    created_at: new Date(),
    machine: {
      id: 'machine-id',
      machine_number: 'M-001',
      name: 'Test Machine',
      location: {
        id: 'location-id',
        name: 'Test Location',
        address: '123 Test St',
      },
    } as any,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramManagerToolsService,
        {
          provide: getRepositoryToken(TelegramUser),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Task),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: TelegramResilientApiService,
          useValue: {
            sendText: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: TelegramI18nService,
          useValue: {
            t: jest.fn().mockImplementation((lang, key) => key),
            getFixedT: jest.fn().mockReturnValue((key: string) => key),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn(),
            findOneEntity: jest.fn(),
          },
        },
        {
          provide: TasksService,
          useValue: {
            findOne: jest.fn(),
            assignTask: jest.fn(),
          },
        },
        {
          provide: FilesService,
          useValue: {
            findByEntity: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<TelegramManagerToolsService>(TelegramManagerToolsService);
    telegramUserRepository = module.get(getRepositoryToken(TelegramUser));
    userRepository = module.get(getRepositoryToken(User));
    taskRepository = module.get(getRepositoryToken(Task));
    resilientApi = module.get(TelegramResilientApiService);
    _i18nService = module.get(TelegramI18nService);
    _usersService = module.get(UsersService);
    tasksService = module.get(TasksService);
    filesService = module.get(FilesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyManagerAccess', () => {
    it('should allow access for managers', async () => {
      userRepository.findOne.mockResolvedValue(mockManager as User);

      const result = await service.verifyManagerAccess('manager-id');

      expect(result).toEqual(mockManager);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'manager-id' },
      });
    });

    it('should allow access for admins', async () => {
      userRepository.findOne.mockResolvedValue(mockAdmin as User);

      const result = await service.verifyManagerAccess('admin-id');

      expect(result).toEqual(mockAdmin);
    });

    it('should throw ForbiddenException for operators', async () => {
      userRepository.findOne.mockResolvedValue(mockOperator as User);

      await expect(service.verifyManagerAccess('operator-id')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.verifyManagerAccess('unknown-id')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if user is inactive', async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockManager,
        status: UserStatus.INACTIVE,
      } as User);

      await expect(service.verifyManagerAccess('manager-id')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getAvailableOperators', () => {
    it('should return list of available operators', async () => {
      userRepository.findOne.mockResolvedValue(mockManager as User);
      telegramUserRepository.find.mockResolvedValue([mockTelegramUser as TelegramUser]);
      taskRepository.count.mockResolvedValue(2);

      const result = await service.getAvailableOperators('manager-id');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'operator-id',
        name: 'Test Operator',
        chatId: '123456789',
        status: 'active',
        tasksInProgress: 2,
        lastActive: mockTelegramUser.last_interaction_at,
      });
    });

    it('should filter out non-operator roles', async () => {
      userRepository.findOne.mockResolvedValue(mockManager as User);
      telegramUserRepository.find.mockResolvedValue([
        { ...mockTelegramUser, user: mockManager } as unknown as TelegramUser,
      ]);

      const result = await service.getAvailableOperators('manager-id');

      expect(result).toHaveLength(0);
    });

    it('should sort operators by task count', async () => {
      userRepository.findOne.mockResolvedValue(mockManager as User);
      const operator1 = {
        ...mockTelegramUser,
        user_id: 'op1',
        user: { ...mockOperator, id: 'op1', full_name: 'Operator A' },
      };
      const operator2 = {
        ...mockTelegramUser,
        user_id: 'op2',
        user: { ...mockOperator, id: 'op2', full_name: 'Operator B' },
      };
      telegramUserRepository.find.mockResolvedValue([
        operator1 as unknown as TelegramUser,
        operator2 as unknown as TelegramUser,
      ]);
      taskRepository.count
        .mockResolvedValueOnce(5) // op1 has 5 tasks
        .mockResolvedValueOnce(1); // op2 has 1 task

      const result = await service.getAvailableOperators('manager-id');

      expect(result[0].name).toBe('Operator B'); // Fewer tasks first
      expect(result[1].name).toBe('Operator A');
    });
  });

  describe('getUnassignedTasks', () => {
    it('should return list of unassigned tasks', async () => {
      userRepository.findOne.mockResolvedValue(mockManager as User);
      taskRepository.find.mockResolvedValue([mockTask as Task]);

      const result = await service.getUnassignedTasks('manager-id');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'task-id',
        type: TaskType.REFILL,
        machineNumber: 'M-001',
        machineName: 'Test Machine',
        location: 'Test Location',
        priority: TaskPriority.NORMAL,
        createdAt: mockTask.created_at,
      });
    });

    it('should verify manager access before querying', async () => {
      userRepository.findOne.mockResolvedValue(mockOperator as User);

      await expect(service.getUnassignedTasks('operator-id')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('assignTask', () => {
    it('should assign task and send notification', async () => {
      userRepository.findOne.mockResolvedValue(mockManager as User);
      tasksService.findOne.mockResolvedValue(mockTask as Task);
      tasksService.assignTask.mockResolvedValue(mockTask as Task);
      telegramUserRepository.findOne.mockResolvedValue(mockTelegramUser as TelegramUser);

      const result = await service.assignTask('manager-id', 'task-id', 'operator-id');

      expect(result.success).toBe(true);
      expect(result.notificationSent).toBe(true);
      expect(tasksService.assignTask).toHaveBeenCalledWith('task-id', 'operator-id');
      expect(resilientApi.sendText).toHaveBeenCalled();
    });

    it('should return error if task not found', async () => {
      userRepository.findOne.mockResolvedValue(mockManager as User);
      tasksService.findOne.mockRejectedValue(new Error('Task not found'));

      const result = await service.assignTask('manager-id', 'task-id', 'operator-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Task not found');
    });

    it('should return error if task is already completed', async () => {
      userRepository.findOne.mockResolvedValue(mockManager as User);
      tasksService.findOne.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.COMPLETED,
      } as Task);

      const result = await service.assignTask('manager-id', 'task-id', 'operator-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot assign a completed task');
    });

    it('should succeed but not notify if operator has no Telegram', async () => {
      userRepository.findOne.mockResolvedValue(mockManager as User);
      tasksService.findOne.mockResolvedValue(mockTask as Task);
      tasksService.assignTask.mockResolvedValue(mockTask as Task);
      telegramUserRepository.findOne.mockResolvedValue(null);

      const result = await service.assignTask('manager-id', 'task-id', 'operator-id');

      expect(result.success).toBe(true);
      expect(result.notificationSent).toBe(false);
      expect(result.error).toBe('Operator does not have Telegram linked');
    });
  });

  describe('broadcastMessage', () => {
    it('should send message to all operators', async () => {
      userRepository.findOne.mockResolvedValue(mockManager as User);
      telegramUserRepository.find.mockResolvedValue([mockTelegramUser as TelegramUser]);

      const result = await service.broadcastMessage(
        'manager-id',
        'Test broadcast message',
      );

      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.total).toBe(1);
      expect(resilientApi.sendText).toHaveBeenCalled();
    });

    it('should track failed deliveries', async () => {
      userRepository.findOne.mockResolvedValue(mockManager as User);
      telegramUserRepository.find.mockResolvedValue([mockTelegramUser as TelegramUser]);
      resilientApi.sendText.mockRejectedValue(new Error('Send failed'));

      const result = await service.broadcastMessage(
        'manager-id',
        'Test broadcast message',
      );

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.failedRecipients).toContain('operator-id');
    });

    it('should add urgent prefix when urgent option is set', async () => {
      userRepository.findOne.mockResolvedValue(mockManager as User);
      telegramUserRepository.find.mockResolvedValue([mockTelegramUser as TelegramUser]);

      await service.broadcastMessage('manager-id', 'Urgent message', {
        urgent: true,
      });

      expect(resilientApi.sendText).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('🚨'),
        expect.any(Object),
        expect.objectContaining({ priority: 2 }),
      );
    });
  });

  describe('getTeamAnalytics', () => {
    it('should return team analytics for today', async () => {
      userRepository.findOne.mockResolvedValue(mockManager as User);
      taskRepository.find.mockResolvedValue([
        {
          ...mockTask,
          status: TaskStatus.COMPLETED,
          completed_at: new Date(),
          started_at: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
          assigned_to: mockOperator,
          assigned_to_user_id: 'operator-id',
        } as Task,
      ]);
      taskRepository.count.mockResolvedValue(5);
      telegramUserRepository.count.mockResolvedValueOnce(10).mockResolvedValueOnce(8);

      const result = await service.getTeamAnalytics('manager-id', 'today');

      expect(result.tasksCompleted).toBe(1);
      expect(result.tasksInProgress).toBe(5);
      expect(result.totalOperators).toBe(10);
      expect(result.activeOperators).toBe(8);
      expect(result.topPerformers).toHaveLength(1);
      expect(result.topPerformers[0].name).toBe('Test Operator');
    });

    it('should calculate average completion time', async () => {
      userRepository.findOne.mockResolvedValue(mockManager as User);
      const completedAt = new Date();
      const startedAt = new Date(completedAt.getTime() - 60 * 60 * 1000); // 1 hour ago
      taskRepository.find.mockResolvedValue([
        {
          ...mockTask,
          status: TaskStatus.COMPLETED,
          completed_at: completedAt,
          started_at: startedAt,
        } as Task,
      ]);
      taskRepository.count.mockResolvedValue(0);
      telegramUserRepository.count.mockResolvedValue(0);

      const result = await service.getTeamAnalytics('manager-id', 'today');

      expect(result.avgCompletionTimeMinutes).toBe(60);
    });
  });

  describe('getActiveOperatorsStatus', () => {
    it('should return operators with their current status', async () => {
      userRepository.findOne.mockResolvedValue(mockManager as User);
      telegramUserRepository.find.mockResolvedValue([mockTelegramUser as TelegramUser]);
      taskRepository.findOne.mockResolvedValue(null);
      taskRepository.count.mockResolvedValue(3);

      const result = await service.getActiveOperatorsStatus('manager-id');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Operator');
      expect(result[0].status).toBe('idle');
      expect(result[0].tasksCompletedToday).toBe(3);
    });

    it('should mark operator as working when they have active task', async () => {
      userRepository.findOne.mockResolvedValue(mockManager as User);
      telegramUserRepository.find.mockResolvedValue([mockTelegramUser as TelegramUser]);
      taskRepository.findOne.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
        started_at: new Date(),
      } as Task);
      taskRepository.count.mockResolvedValue(0);

      const result = await service.getActiveOperatorsStatus('manager-id');

      expect(result[0].status).toBe('working');
      expect(result[0].currentTask).toBeDefined();
      expect(result[0].currentTask!.type).toBe(TaskType.REFILL);
    });

    it('should mark operator as offline when not recently active', async () => {
      userRepository.findOne.mockResolvedValue(mockManager as User);
      const oldInteraction = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      telegramUserRepository.find.mockResolvedValue([
        { ...mockTelegramUser, last_interaction_at: oldInteraction } as TelegramUser,
      ]);
      taskRepository.findOne.mockResolvedValue(null);
      taskRepository.count.mockResolvedValue(0);

      const result = await service.getActiveOperatorsStatus('manager-id');

      expect(result[0].status).toBe('offline');
    });
  });

  describe('getPendingApprovals', () => {
    it('should return tasks pending approval', async () => {
      userRepository.findOne.mockResolvedValue(mockManager as User);
      taskRepository.find.mockResolvedValue([
        {
          ...mockTask,
          status: TaskStatus.COMPLETED,
          completed_at: new Date(),
          pending_photos: true,
          assigned_to: mockOperator,
        } as Task,
      ]);
      filesService.findByEntity.mockResolvedValue([{ id: 'file-1' }, { id: 'file-2' }] as any);

      const result = await service.getPendingApprovals('manager-id');

      expect(result).toHaveLength(1);
      expect(result[0].taskId).toBe('task-id');
      expect(result[0].photosCount).toBe(2);
      expect(result[0].requiresReview).toBe(true);
    });
  });

  describe('approveTask', () => {
    it('should approve task and notify operator', async () => {
      userRepository.findOne.mockResolvedValue(mockManager as User);
      tasksService.findOne.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.COMPLETED,
        assigned_to_user_id: 'operator-id',
      } as Task);
      telegramUserRepository.findOne.mockResolvedValue(mockTelegramUser as TelegramUser);
      taskRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.approveTask(
        'manager-id',
        'task-id',
        true,
        'Good work!',
      );

      expect(result.success).toBe(true);
      expect(result.notifiedOperator).toBe(true);
      expect(taskRepository.update).toHaveBeenCalledWith('task-id', expect.objectContaining({
        pending_photos: false,
        metadata: expect.objectContaining({
          approved: true,
          review_comment: 'Good work!',
        }),
      }));
    });

    it('should reject task and notify operator', async () => {
      userRepository.findOne.mockResolvedValue(mockManager as User);
      tasksService.findOne.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.COMPLETED,
        assigned_to_user_id: 'operator-id',
      } as Task);
      telegramUserRepository.findOne.mockResolvedValue(mockTelegramUser as TelegramUser);
      taskRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.approveTask(
        'manager-id',
        'task-id',
        false,
        'Please retake photos',
      );

      expect(result.success).toBe(true);
      expect(taskRepository.update).toHaveBeenCalledWith('task-id', expect.objectContaining({
        metadata: expect.objectContaining({
          approved: false,
          review_comment: 'Please retake photos',
        }),
      }));
    });

    it('should return failure if task is not completed', async () => {
      userRepository.findOne.mockResolvedValue(mockManager as User);
      tasksService.findOne.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
      } as Task);

      const result = await service.approveTask('manager-id', 'task-id', true);

      expect(result.success).toBe(false);
    });
  });

  describe('formatAnalyticsMessage', () => {
    it('should format analytics as Telegram message', () => {
      const analytics = {
        tasksCompleted: 15,
        tasksInProgress: 5,
        activeOperators: 8,
        totalOperators: 10,
        avgCompletionTimeMinutes: 45,
        topPerformers: [
          { name: 'John', tasksCompleted: 5 },
          { name: 'Jane', tasksCompleted: 4 },
        ],
        tasksByType: {
          [TaskType.REFILL]: 10,
          [TaskType.COLLECTION]: 5,
        },
      };

      const message = service.formatAnalyticsMessage(analytics, 'ru');

      expect(message).toContain('📊');
      expect(message).toContain('15');
      expect(message).toContain('8/10');
      expect(message).toContain('🥇');
      expect(message).toContain('John');
    });
  });

  describe('formatOperatorsStatusMessage', () => {
    it('should format operators status as Telegram message', () => {
      const operators = [
        {
          name: 'Operator 1',
          status: 'working' as const,
          currentTask: { type: TaskType.REFILL, machineNumber: 'M-001' },
          tasksCompletedToday: 3,
        },
        {
          name: 'Operator 2',
          status: 'idle' as const,
          tasksCompletedToday: 2,
        },
        {
          name: 'Operator 3',
          status: 'offline' as const,
          tasksCompletedToday: 0,
        },
      ];

      const message = service.formatOperatorsStatusMessage(operators, 'ru');

      expect(message).toContain('👥');
      expect(message).toContain('🟢');
      expect(message).toContain('🟡');
      expect(message).toContain('⚫');
      expect(message).toContain('Operator 1');
      expect(message).toContain('M-001');
    });
  });
});
