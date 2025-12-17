import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { TaskEscalationService } from './task-escalation.service';
import { Task, TaskStatus, TaskType } from '../entities/task.entity';
import { IncidentsService } from '../../incidents/incidents.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { AuditLogService } from '../../security/services/audit-log.service';
import { IncidentType, IncidentPriority } from '../../incidents/entities/incident.entity';

describe('TaskEscalationService', () => {
  let service: TaskEscalationService;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let incidentsService: jest.Mocked<IncidentsService>;
  let notificationsService: jest.Mocked<NotificationsService>;
  let auditLogService: jest.Mocked<AuditLogService>;

  const mockMachineId = 'machine-123';
  const mockUserId = 'user-456';
  const mockTaskId = 'task-789';
  const mockCreatorId = 'creator-user';

  const createMockTask = (overrides: Partial<Task> = {}): Task =>
    ({
      id: mockTaskId,
      machine_id: mockMachineId,
      type_code: TaskType.REFILL,
      status: TaskStatus.PENDING,
      assigned_to_user_id: mockUserId,
      created_by_user_id: mockCreatorId,
      due_date: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      description: 'Test task description',
      priority: 'medium',
      machine: {
        id: mockMachineId,
        machine_number: 'M-001',
      } as any,
      assigned_to: {
        id: mockUserId,
        full_name: 'Test Operator',
      } as any,
      ...overrides,
    }) as Task;

  const createMockQueryBuilder = () => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getCount: jest.fn().mockResolvedValue(0),
      getRawMany: jest.fn().mockResolvedValue([]),
      clone: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<SelectQueryBuilder<Task>>;
    return qb;
  };

  beforeEach(async () => {
    const mockQueryBuilder = createMockQueryBuilder();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskEscalationService,
        {
          provide: getRepositoryToken(Task),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: IncidentsService,
          useValue: {
            findAll: jest.fn().mockResolvedValue([]),
            create: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            create: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            log: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<TaskEscalationService>(TaskEscalationService);
    taskRepository = module.get(getRepositoryToken(Task));
    incidentsService = module.get(IncidentsService);
    notificationsService = module.get(NotificationsService);
    auditLogService = module.get(AuditLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStats', () => {
    it('should return task statistics', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount.mockResolvedValue(10);
      mockQb.getRawMany
        .mockResolvedValueOnce([
          { status: TaskStatus.PENDING, count: '5' },
          { status: TaskStatus.COMPLETED, count: '3' },
          { status: TaskStatus.IN_PROGRESS, count: '2' },
        ])
        .mockResolvedValueOnce([
          { type: TaskType.REFILL, count: '6' },
          { type: TaskType.COLLECTION, count: '4' },
        ]);

      taskRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getStats();

      expect(result.total).toBe(10);
      expect(result.by_status).toEqual({
        [TaskStatus.PENDING]: 5,
        [TaskStatus.COMPLETED]: 3,
        [TaskStatus.IN_PROGRESS]: 2,
      });
      expect(result.by_type).toEqual({
        [TaskType.REFILL]: 6,
        [TaskType.COLLECTION]: 4,
      });
    });

    it('should filter by machineId when provided', async () => {
      const mockQb = createMockQueryBuilder();
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.getStats(mockMachineId);

      expect(mockQb.andWhere).toHaveBeenCalledWith('task.machine_id = :machineId', {
        machineId: mockMachineId,
      });
    });

    it('should filter by userId when provided', async () => {
      const mockQb = createMockQueryBuilder();
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.getStats(undefined, mockUserId);

      expect(mockQb.andWhere).toHaveBeenCalledWith('task.assigned_to_user_id = :userId', {
        userId: mockUserId,
      });
    });

    it('should count overdue tasks', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getCount
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3); // overdue

      taskRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getStats();

      expect(result.overdue).toBe(3);
    });
  });

  describe('getOverdueTasks', () => {
    it('should return overdue tasks ordered by due date', async () => {
      const overdueTasks = [
        createMockTask({ id: 'task-1', due_date: new Date(Date.now() - 2 * 60 * 60 * 1000) }),
        createMockTask({ id: 'task-2', due_date: new Date(Date.now() - 5 * 60 * 60 * 1000) }),
      ];

      const mockQb = createMockQueryBuilder();
      mockQb.getMany.mockResolvedValue(overdueTasks);
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getOverdueTasks();

      expect(result).toHaveLength(2);
      expect(mockQb.leftJoinAndSelect).toHaveBeenCalledWith('task.machine', 'machine');
      expect(mockQb.leftJoinAndSelect).toHaveBeenCalledWith('task.assigned_to', 'assigned_to');
      expect(mockQb.orderBy).toHaveBeenCalledWith('task.due_date', 'ASC');
    });

    it('should exclude completed and cancelled tasks', async () => {
      const mockQb = createMockQueryBuilder();
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.getOverdueTasks();

      expect(mockQb.andWhere).toHaveBeenCalledWith('task.status != :completed', {
        completed: TaskStatus.COMPLETED,
      });
      expect(mockQb.andWhere).toHaveBeenCalledWith('task.status != :cancelled', {
        cancelled: TaskStatus.CANCELLED,
      });
    });
  });

  describe('escalateOverdueTasks', () => {
    it('should escalate tasks overdue by more than 4 hours', async () => {
      const overdueTask = createMockTask({
        due_date: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      });

      const mockQb = createMockQueryBuilder();
      mockQb.getMany.mockResolvedValue([overdueTask]);
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);
      incidentsService.findAll.mockResolvedValue([]);

      const result = await service.escalateOverdueTasks();

      expect(result.escalated_count).toBe(1);
      expect(result.incidents_created).toBe(1);
      expect(incidentsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          incident_type: IncidentType.OTHER,
          machine_id: mockMachineId,
          title: expect.stringContaining('Просроченная задача'),
        }),
      );
    });

    it('should set high priority for tasks overdue by more than 24 hours', async () => {
      const overdueTask = createMockTask({
        due_date: new Date(Date.now() - 30 * 60 * 60 * 1000), // 30 hours ago
      });

      const mockQb = createMockQueryBuilder();
      mockQb.getMany.mockResolvedValue([overdueTask]);
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);
      incidentsService.findAll.mockResolvedValue([]);

      await service.escalateOverdueTasks();

      expect(incidentsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: IncidentPriority.HIGH,
        }),
      );
    });

    it('should set medium priority for tasks overdue by less than 24 hours', async () => {
      const overdueTask = createMockTask({
        due_date: new Date(Date.now() - 10 * 60 * 60 * 1000), // 10 hours ago
      });

      const mockQb = createMockQueryBuilder();
      mockQb.getMany.mockResolvedValue([overdueTask]);
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);
      incidentsService.findAll.mockResolvedValue([]);

      await service.escalateOverdueTasks();

      expect(incidentsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: IncidentPriority.MEDIUM,
        }),
      );
    });

    it('should not create duplicate incident for already escalated task', async () => {
      const overdueTask = createMockTask();

      const mockQb = createMockQueryBuilder();
      mockQb.getMany.mockResolvedValue([overdueTask]);
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);

      // Existing incident for this task
      incidentsService.findAll.mockResolvedValue([
        {
          incident_type: IncidentType.OTHER,
          metadata: { task_id: mockTaskId },
        } as any,
      ]);

      const result = await service.escalateOverdueTasks();

      expect(result.incidents_created).toBe(0);
      expect(incidentsService.create).not.toHaveBeenCalled();
    });

    it('should notify manager about overdue task', async () => {
      const overdueTask = createMockTask();

      const mockQb = createMockQueryBuilder();
      mockQb.getMany.mockResolvedValue([overdueTask]);
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);
      incidentsService.findAll.mockResolvedValue([]);

      await service.escalateOverdueTasks();

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient_id: mockCreatorId,
          title: 'Создан инцидент: просроченная задача',
        }),
      );
    });

    it('should log escalation event', async () => {
      const overdueTask = createMockTask();

      const mockQb = createMockQueryBuilder();
      mockQb.getMany.mockResolvedValue([overdueTask]);
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);
      incidentsService.findAll.mockResolvedValue([]);

      await service.escalateOverdueTasks();

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('Автоматическая эскалация'),
          metadata: expect.objectContaining({
            task_id: mockTaskId,
            machine_id: mockMachineId,
          }),
        }),
      );
    });

    it('should skip tasks without due date', async () => {
      const overdueTask = createMockTask({ due_date: undefined });

      const mockQb = createMockQueryBuilder();
      mockQb.getMany.mockResolvedValue([overdueTask]);
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.escalateOverdueTasks();

      expect(result.incidents_created).toBe(0);
    });
  });

  describe('getTasksByPriority', () => {
    it('should group tasks by priority', async () => {
      const tasks = [
        createMockTask({ id: 'task-1', priority: 'critical' }),
        createMockTask({ id: 'task-2', priority: 'high' }),
        createMockTask({ id: 'task-3', priority: 'high' }),
        createMockTask({ id: 'task-4', priority: 'medium' }),
        createMockTask({ id: 'task-5', priority: 'low' }),
      ];

      const mockQb = createMockQueryBuilder();
      mockQb.getMany.mockResolvedValue(tasks);
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getTasksByPriority();

      expect(result.critical).toHaveLength(1);
      expect(result.high).toHaveLength(2);
      expect(result.medium).toHaveLength(1);
      expect(result.low).toHaveLength(1);
    });

    it('should filter by userId when provided', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getMany.mockResolvedValue([]);
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.getTasksByPriority(mockUserId);

      expect(mockQb.andWhere).toHaveBeenCalledWith('task.assigned_to_user_id = :userId', {
        userId: mockUserId,
      });
    });

    it('should exclude completed, cancelled, and rejected tasks', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getMany.mockResolvedValue([]);
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.getTasksByPriority();

      expect(mockQb.where).toHaveBeenCalledWith('task.status NOT IN (:...statuses)', {
        statuses: [TaskStatus.COMPLETED, TaskStatus.CANCELLED, TaskStatus.REJECTED],
      });
    });
  });

  describe('getAttentionRequiredTasks', () => {
    it('should return overdue tasks', async () => {
      const overdueTasks = [createMockTask({ status: TaskStatus.PENDING })];

      const mockQb = createMockQueryBuilder();
      mockQb.getMany.mockResolvedValueOnce(overdueTasks);
      mockQb.getMany.mockResolvedValueOnce([]);
      mockQb.getMany.mockResolvedValueOnce([]);
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getAttentionRequiredTasks();

      expect(result.overdue).toHaveLength(1);
    });

    it('should return tasks due within 24 hours', async () => {
      const dueSoonTasks = [
        createMockTask({
          status: TaskStatus.ASSIGNED,
          due_date: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
        }),
      ];

      const mockQb = createMockQueryBuilder();
      mockQb.getMany.mockResolvedValueOnce([]); // overdue
      mockQb.getMany.mockResolvedValueOnce(dueSoonTasks); // due_soon
      mockQb.getMany.mockResolvedValueOnce([]); // pending_photos
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getAttentionRequiredTasks();

      expect(result.due_soon).toHaveLength(1);
    });

    it('should return tasks with pending photos', async () => {
      const pendingPhotosTasks = [
        createMockTask({
          status: TaskStatus.COMPLETED,
          pending_photos: true,
        }),
      ];

      const mockQb = createMockQueryBuilder();
      mockQb.getMany.mockResolvedValueOnce([]); // overdue
      mockQb.getMany.mockResolvedValueOnce([]); // due_soon
      mockQb.getMany.mockResolvedValueOnce(pendingPhotosTasks); // pending_photos
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getAttentionRequiredTasks();

      expect(result.pending_photos).toHaveLength(1);
    });

    it('should filter all categories by userId when provided', async () => {
      const mockQb = createMockQueryBuilder();
      mockQb.getMany.mockResolvedValue([]);
      taskRepository.createQueryBuilder.mockReturnValue(mockQb);

      await service.getAttentionRequiredTasks(mockUserId);

      // Should be called multiple times for different queries
      expect(mockQb.andWhere).toHaveBeenCalledWith('task.assigned_to_user_id = :userId', {
        userId: mockUserId,
      });
    });
  });
});
