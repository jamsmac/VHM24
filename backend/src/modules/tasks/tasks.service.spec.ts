import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Task, TaskStatus, TaskType, TaskPriority } from './entities/task.entity';
import { TaskItem } from './entities/task-item.entity';
import { TaskComment } from './entities/task-comment.entity';
import { TaskComponent, ComponentRole } from './entities/task-component.entity';
import { FilesService } from '../files/files.service';
import { MachinesService } from '../machines/machines.service';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TransactionsService } from '../transactions/transactions.service';
import { IncidentsService } from '../incidents/incidents.service';
import { AuditLogService } from '../security/services/audit-log.service';
import { UsersService } from '../users/users.service';
import { WashingSchedulesService } from '../equipment/services/washing-schedules.service';
import { ComponentMovementsService } from '../equipment/services/component-movements.service';
import { ComponentsService } from '../equipment/services/components.service';
import { UserRole } from '../users/entities/user.entity';
import { TaskCompletionService } from './services/task-completion.service';
import { TaskRejectionService } from './services/task-rejection.service';
import { TaskEscalationService } from './services/task-escalation.service';

describe('TasksService', () => {
  let service: TasksService;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let taskItemRepository: jest.Mocked<Repository<TaskItem>>;
  let taskCommentRepository: jest.Mocked<Repository<TaskComment>>;
  let _taskComponentRepository: jest.Mocked<Repository<TaskComponent>>;
  let filesService: jest.Mocked<FilesService>;
  let machinesService: jest.Mocked<MachinesService>;
  let inventoryService: jest.Mocked<InventoryService>;
  let notificationsService: jest.Mocked<NotificationsService>;
  let transactionsService: jest.Mocked<TransactionsService>;
  let incidentsService: jest.Mocked<IncidentsService>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let usersService: jest.Mocked<UsersService>;
  let washingSchedulesService: jest.Mocked<WashingSchedulesService>;
  let componentMovementsService: jest.Mocked<ComponentMovementsService>;
  let _componentsService: jest.Mocked<ComponentsService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let dataSource: jest.Mocked<DataSource>;

  // Mock data fixtures
  const mockMachine = {
    id: 'machine-uuid',
    machine_number: 'M-001',
    name: 'Test Machine',
    current_cash_amount: 50000,
    location: { id: 'loc-uuid', name: 'Test Location' },
  };

  const mockUser = {
    id: 'user-uuid',
    username: 'testuser',
    full_name: 'Test User',
    role: UserRole.OPERATOR,
    email: 'test@example.com',
  };

  const mockAdminUser = {
    id: 'admin-uuid',
    username: 'admin',
    full_name: 'Admin User',
    role: UserRole.ADMIN,
    email: 'admin@example.com',
  };

  const mockTask: Partial<Task> = {
    id: 'task-uuid',
    type_code: TaskType.REFILL,
    status: TaskStatus.PENDING,
    priority: TaskPriority.NORMAL,
    machine_id: 'machine-uuid',
    assigned_to_user_id: 'user-uuid',
    created_by_user_id: 'manager-uuid',
    description: 'Test task description',
    machine: mockMachine as any,
    assigned_to: mockUser as any,
    items: [],
    comments: [],
    components: [],
  };

  const mockTaskItem: Partial<TaskItem> = {
    id: 'item-uuid',
    task_id: 'task-uuid',
    nomenclature_id: 'nom-uuid',
    planned_quantity: 10,
    actual_quantity: null,
    unit_of_measure_code: 'pcs',
  };

  // Create mock repositories
  const createMockTaskRepository = () => ({
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
    softRemove: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
  });

  const createMockTaskItemRepository = () => ({
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  });

  const createMockTaskCommentRepository = () => ({
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  });

  const createMockTaskComponentRepository = () => ({
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  });

  // Create query builder mock
  const createQueryBuilderMock = (results: any[] = []) => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(results),
    getCount: jest.fn().mockResolvedValue(results.length),
    getRawMany: jest.fn().mockResolvedValue(results),
    getRawOne: jest.fn().mockResolvedValue(results[0] || null),
  });

  // Create transaction manager mock
  const createTransactionManagerMock = () => ({
    create: jest.fn((Entity, data) => data),
    save: jest.fn(async (Entity, data) => ({ id: 'task-uuid', ...data })),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
  });

  beforeEach(async () => {
    const mockTaskRepo = createMockTaskRepository();
    const mockTaskItemRepo = createMockTaskItemRepository();
    const mockTaskCommentRepo = createMockTaskCommentRepository();
    const mockTaskComponentRepo = createMockTaskComponentRepository();

    const mockFilesService = {
      findOne: jest.fn(),
      validateTaskPhotos: jest.fn(),
    };

    const mockMachinesService = {
      findOne: jest.fn(),
      updateStats: jest.fn(),
    };

    const mockInventoryService = {
      createReservation: jest.fn().mockResolvedValue(undefined),
      cancelReservation: jest.fn().mockResolvedValue(undefined),
      fulfillReservation: jest.fn().mockResolvedValue(undefined),
      transferOperatorToMachine: jest.fn().mockResolvedValue(undefined),
      transferMachineToOperator: jest.fn().mockResolvedValue(undefined),
    };

    const mockNotificationsService = {
      create: jest.fn().mockResolvedValue({}),
    };

    const mockTransactionsService = {
      create: jest.fn().mockResolvedValue({}),
      recordCollection: jest.fn().mockResolvedValue({}),
    };

    const mockIncidentsService = {
      create: jest.fn().mockResolvedValue({}),
      findAll: jest.fn().mockResolvedValue([]),
    };

    const mockAuditLogService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const mockUsersService = {
      findOne: jest.fn(),
    };

    const mockWashingSchedulesService = {
      findOne: jest.fn(),
      completeWashing: jest.fn().mockResolvedValue(undefined),
    };

    const mockComponentMovementsService = {
      createMovement: jest.fn().mockResolvedValue({}),
    };

    const mockComponentsService = {
      findOne: jest.fn(),
    };

    const mockTaskCompletionService = {
      completeTask: jest.fn().mockResolvedValue({}),
      validateTaskForCompletion: jest.fn().mockResolvedValue(true),
      getPendingPhotosTasks: jest.fn().mockResolvedValue([]),
      uploadPendingPhotos: jest.fn().mockResolvedValue({}),
    };

    const mockTaskRejectionService = {
      rejectTask: jest.fn().mockResolvedValue({}),
    };

    const mockTaskEscalationService = {
      escalateTask: jest.fn().mockResolvedValue({}),
      getOverdueTasks: jest.fn().mockResolvedValue([]),
      escalateOverdueTasks: jest.fn().mockResolvedValue({ escalated_count: 0, incidents_created: 0 }),
      getStats: jest.fn().mockResolvedValue({ total: 0, pending: 0, in_progress: 0, completed: 0 }),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const mockDataSource = {
      transaction: jest.fn(async (callback) => {
        const mockTransactionManager = createTransactionManagerMock();
        return callback(mockTransactionManager);
      }),
      createQueryRunner: jest.fn(() => ({
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: createTransactionManagerMock(),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepo,
        },
        {
          provide: getRepositoryToken(TaskItem),
          useValue: mockTaskItemRepo,
        },
        {
          provide: getRepositoryToken(TaskComment),
          useValue: mockTaskCommentRepo,
        },
        {
          provide: getRepositoryToken(TaskComponent),
          useValue: mockTaskComponentRepo,
        },
        {
          provide: FilesService,
          useValue: mockFilesService,
        },
        {
          provide: MachinesService,
          useValue: mockMachinesService,
        },
        {
          provide: InventoryService,
          useValue: mockInventoryService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: TransactionsService,
          useValue: mockTransactionsService,
        },
        {
          provide: IncidentsService,
          useValue: mockIncidentsService,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: WashingSchedulesService,
          useValue: mockWashingSchedulesService,
        },
        {
          provide: ComponentMovementsService,
          useValue: mockComponentMovementsService,
        },
        {
          provide: ComponentsService,
          useValue: mockComponentsService,
        },
        {
          provide: TaskCompletionService,
          useValue: mockTaskCompletionService,
        },
        {
          provide: TaskRejectionService,
          useValue: mockTaskRejectionService,
        },
        {
          provide: TaskEscalationService,
          useValue: mockTaskEscalationService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    taskRepository = module.get(getRepositoryToken(Task));
    taskItemRepository = module.get(getRepositoryToken(TaskItem));
    taskCommentRepository = module.get(getRepositoryToken(TaskComment));
    _taskComponentRepository = module.get(getRepositoryToken(TaskComponent));
    filesService = module.get(FilesService);
    machinesService = module.get(MachinesService);
    inventoryService = module.get(InventoryService);
    notificationsService = module.get(NotificationsService);
    transactionsService = module.get(TransactionsService);
    incidentsService = module.get(IncidentsService);
    auditLogService = module.get(AuditLogService);
    usersService = module.get(UsersService);
    washingSchedulesService = module.get(WashingSchedulesService);
    componentMovementsService = module.get(ComponentMovementsService);
    _componentsService = module.get(ComponentsService);
    eventEmitter = module.get(EventEmitter2);
    dataSource = module.get(DataSource);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // CREATE TASK TESTS
  // ============================================================================

  describe('create', () => {
    const createTaskDto = {
      type_code: TaskType.REFILL,
      machine_id: 'machine-uuid',
      assigned_to_user_id: 'operator-uuid',
      created_by_user_id: 'manager-uuid',
      due_date: new Date().toISOString(),
      description: 'Refill machine',
      items: [
        {
          nomenclature_id: 'nom-uuid',
          planned_quantity: 10,
          unit_of_measure_code: 'pcs',
        },
      ],
    };

    it('should create a new task successfully', async () => {
      const mockTaskWithRelations = {
        id: 'task-uuid',
        ...createTaskDto,
        status: TaskStatus.PENDING,
        machine: mockMachine,
        assigned_to: null,
        created_by: null,
        items: [],
        comments: [],
        components: [],
      };

      taskRepository.find.mockResolvedValueOnce([]); // No existing active tasks
      taskRepository.findOne.mockResolvedValueOnce(mockTaskWithRelations as any);

      const result = await service.create(createTaskDto);

      expect(result).toEqual(mockTaskWithRelations);
      expect(taskRepository.find).toHaveBeenCalled();
      expect(dataSource.transaction).toHaveBeenCalled();
    });

    it('should throw BadRequestException if active task already exists on machine', async () => {
      const existingActiveTask = {
        id: 'existing-task-uuid',
        machine_id: 'machine-uuid',
        status: TaskStatus.IN_PROGRESS,
      };

      taskRepository.find.mockResolvedValue([existingActiveTask as Task]);

      await expect(service.create(createTaskDto)).rejects.toThrow(BadRequestException);
      taskRepository.find.mockResolvedValue([existingActiveTask as Task]);
      await expect(service.create(createTaskDto)).rejects.toThrow(
        /Невозможно создать задачу: на аппарате уже есть активная задача/,
      );
    });

    it('should create task without items', async () => {
      const dtoWithoutItems = {
        type_code: TaskType.INSPECTION,
        machine_id: 'machine-uuid',
        assigned_to_user_id: 'operator-uuid',
        created_by_user_id: 'manager-uuid',
      };

      const mockTaskWithRelations = {
        id: 'task-uuid',
        ...dtoWithoutItems,
        status: TaskStatus.PENDING,
        machine: mockMachine,
        items: [],
        components: [],
      };

      taskRepository.find.mockResolvedValueOnce([]);
      taskRepository.findOne.mockResolvedValueOnce(mockTaskWithRelations as any);

      const result = await service.create(dtoWithoutItems);

      expect(result.id).toBe('task-uuid');
    });

    it('should create inventory reservation for REFILL task with assigned operator', async () => {
      const mockTaskWithRelations = {
        id: 'task-uuid',
        ...createTaskDto,
        status: TaskStatus.PENDING,
        machine: mockMachine,
        items: [],
      };

      taskRepository.find.mockResolvedValueOnce([]);
      taskRepository.findOne.mockResolvedValueOnce(mockTaskWithRelations as any);

      await service.create(createTaskDto);

      // Verify that reservation is called inside the transaction
      expect(inventoryService.createReservation).toHaveBeenCalledWith(
        'task-uuid',
        'operator-uuid',
        [{ nomenclature_id: 'nom-uuid', quantity: 10 }],
        24,
      );
    });

    it('should create task with components for replacement tasks', async () => {
      const dtoWithComponents = {
        type_code: TaskType.REPLACE_GRINDER,
        machine_id: 'machine-uuid',
        assigned_to_user_id: 'operator-uuid',
        created_by_user_id: 'manager-uuid',
        components: [
          { component_id: 'old-comp-uuid', role: ComponentRole.OLD, notes: 'Worn grinder' },
          { component_id: 'new-comp-uuid', role: ComponentRole.NEW, notes: 'New grinder' },
        ],
      };

      const mockTaskWithRelations = {
        id: 'task-uuid',
        ...dtoWithComponents,
        status: TaskStatus.PENDING,
        machine: mockMachine,
        components: [],
      };

      taskRepository.find.mockResolvedValueOnce([]);
      taskRepository.findOne.mockResolvedValueOnce(mockTaskWithRelations as any);

      const result = await service.create(dtoWithComponents);

      expect(result.id).toBe('task-uuid');
    });

    it('should allow creating task when existing tasks on machine are COMPLETED', async () => {
      const _completedTask = {
        id: 'completed-task-uuid',
        machine_id: 'machine-uuid',
        status: TaskStatus.COMPLETED,
      };

      taskRepository.find.mockResolvedValueOnce([]); // find checks only active statuses
      taskRepository.findOne.mockResolvedValueOnce({
        id: 'task-uuid',
        ...createTaskDto,
        status: TaskStatus.PENDING,
      } as any);

      const result = await service.create(createTaskDto);

      expect(result.id).toBe('task-uuid');
    });
  });

  // ============================================================================
  // FIND ALL TESTS
  // ============================================================================

  describe('findAll', () => {
    it('should return array of tasks without filters', async () => {
      const mockTasks = [
        { id: 'task-1', type_code: TaskType.REFILL },
        { id: 'task-2', type_code: TaskType.COLLECTION },
      ];

      const queryBuilder = createQueryBuilderMock(mockTasks);
      taskRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.findAll();

      expect(result).toEqual(mockTasks);
      expect(queryBuilder.getMany).toHaveBeenCalled();
    });

    it('should filter by status', async () => {
      const queryBuilder = createQueryBuilderMock([]);
      taskRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findAll(TaskStatus.PENDING);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('task.status = :status', {
        status: TaskStatus.PENDING,
      });
    });

    it('should filter by task type', async () => {
      const queryBuilder = createQueryBuilderMock([]);
      taskRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findAll(undefined, TaskType.REFILL);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('task.type_code = :type', {
        type: TaskType.REFILL,
      });
    });

    it('should filter by machine ID', async () => {
      const queryBuilder = createQueryBuilderMock([]);
      taskRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findAll(undefined, undefined, 'machine-uuid');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('task.machine_id = :machineId', {
        machineId: 'machine-uuid',
      });
    });

    it('should filter by assigned operator', async () => {
      const queryBuilder = createQueryBuilderMock([]);
      taskRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findAll(undefined, undefined, undefined, 'operator-uuid');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'task.assigned_to_user_id = :assignedToUserId',
        { assignedToUserId: 'operator-uuid' },
      );
    });

    it('should filter by priority', async () => {
      const queryBuilder = createQueryBuilderMock([]);
      taskRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findAll(undefined, undefined, undefined, undefined, TaskPriority.HIGH);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('task.priority = :priority', {
        priority: TaskPriority.HIGH,
      });
    });

    it('should filter by date range', async () => {
      const queryBuilder = createQueryBuilderMock([]);
      taskRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findAll(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        '2025-01-01',
        '2025-01-31',
      );

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'task.scheduled_date BETWEEN :dateFrom AND :dateTo',
        { dateFrom: '2025-01-01', dateTo: '2025-01-31' },
      );
    });

    it('should apply multiple filters together', async () => {
      const queryBuilder = createQueryBuilderMock([]);
      taskRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findAll(
        TaskStatus.IN_PROGRESS,
        TaskType.REFILL,
        'machine-uuid',
        'operator-uuid',
        TaskPriority.URGENT,
      );

      expect(queryBuilder.andWhere).toHaveBeenCalledTimes(6);
    });

    it('should order by priority DESC and scheduled_date ASC', async () => {
      const queryBuilder = createQueryBuilderMock([]);
      taskRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findAll();

      expect(queryBuilder.orderBy).toHaveBeenCalledWith('task.priority', 'DESC');
      expect(queryBuilder.addOrderBy).toHaveBeenCalledWith('task.scheduled_date', 'ASC');
    });
  });

  // ============================================================================
  // FIND ONE TESTS
  // ============================================================================

  describe('findOne', () => {
    it('should return a task by ID with basic relations', async () => {
      taskRepository.findOne.mockResolvedValue(mockTask as Task);

      const result = await service.findOne('task-uuid');

      expect(result).toEqual(mockTask);
      expect(taskRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'task-uuid' },
        relations: ['machine', 'assigned_to'],
      });
    });

    it('should throw NotFoundException if task not found', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-uuid')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('invalid-uuid')).rejects.toThrow(
        /Задача с ID invalid-uuid не найдена/,
      );
    });
  });

  // ============================================================================
  // UPDATE TESTS
  // ============================================================================

  describe('update', () => {
    it('should update task successfully', async () => {
      const updateDto = { description: 'Updated description' };
      const updatedTask = { ...mockTask, ...updateDto };

      taskRepository.findOne.mockResolvedValue(mockTask as Task);
      taskRepository.save.mockResolvedValue(updatedTask as Task);

      const result = await service.update('task-uuid', updateDto);

      expect(result.description).toBe('Updated description');
      expect(taskRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if task not found', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.update('invalid-uuid', {})).rejects.toThrow(NotFoundException);
    });

    it('should validate status transition', async () => {
      const taskInProgress = { ...mockTask, status: TaskStatus.IN_PROGRESS };
      taskRepository.findOne.mockResolvedValue(taskInProgress as Task);

      // Invalid transition: IN_PROGRESS -> PENDING
      await expect(service.update('task-uuid', { status: TaskStatus.PENDING })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow valid status transition PENDING -> ASSIGNED', async () => {
      const pendingTask = { ...mockTask, status: TaskStatus.PENDING };
      taskRepository.findOne.mockResolvedValue(pendingTask as Task);
      taskRepository.save.mockResolvedValue({
        ...pendingTask,
        status: TaskStatus.ASSIGNED,
      } as Task);

      const result = await service.update('task-uuid', { status: TaskStatus.ASSIGNED });

      expect(result.status).toBe(TaskStatus.ASSIGNED);
    });

    it('should not allow transition from COMPLETED status', async () => {
      const completedTask = { ...mockTask, status: TaskStatus.COMPLETED };
      taskRepository.findOne.mockResolvedValue(completedTask as Task);

      await expect(service.update('task-uuid', { status: TaskStatus.IN_PROGRESS })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should not allow transition from CANCELLED status', async () => {
      const cancelledTask = { ...mockTask, status: TaskStatus.CANCELLED };
      taskRepository.findOne.mockResolvedValue(cancelledTask as Task);

      await expect(service.update('task-uuid', { status: TaskStatus.PENDING })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ============================================================================
  // REMOVE TESTS
  // ============================================================================

  describe('remove', () => {
    it('should soft delete task', async () => {
      const pendingTask = { ...mockTask, status: TaskStatus.PENDING };
      taskRepository.findOne.mockResolvedValue(pendingTask as Task);
      taskRepository.softRemove.mockResolvedValue(pendingTask as Task);

      await service.remove('task-uuid');

      expect(inventoryService.cancelReservation).toHaveBeenCalledWith('task-uuid');
      expect(taskRepository.softRemove).toHaveBeenCalledWith(pendingTask);
    });

    it('should throw BadRequestException when deleting completed task', async () => {
      const completedTask = { ...mockTask, status: TaskStatus.COMPLETED };
      taskRepository.findOne.mockResolvedValue(completedTask as Task);

      await expect(service.remove('task-uuid')).rejects.toThrow(BadRequestException);
      await expect(service.remove('task-uuid')).rejects.toThrow(
        /Нельзя удалить завершенную задачу/,
      );
    });

    it('should throw NotFoundException if task not found', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('invalid-uuid')).rejects.toThrow(NotFoundException);
    });

    it('should not fail if reservation cancellation fails', async () => {
      const pendingTask = { ...mockTask, status: TaskStatus.PENDING };
      taskRepository.findOne.mockResolvedValue(pendingTask as Task);
      inventoryService.cancelReservation.mockRejectedValue(new Error('No reservation'));
      taskRepository.softRemove.mockResolvedValue(pendingTask as Task);

      // Should not throw even if cancelReservation fails
      await expect(service.remove('task-uuid')).resolves.not.toThrow();
      expect(taskRepository.softRemove).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // ASSIGN TASK TESTS
  // ============================================================================

  describe('assignTask', () => {
    it('should assign task to operator and send notification', async () => {
      const pendingTask = { ...mockTask, status: TaskStatus.PENDING, assigned_to_user_id: null };
      taskRepository.findOne.mockResolvedValue(pendingTask as Task);
      taskRepository.save.mockResolvedValue({
        ...pendingTask,
        assigned_to_user_id: 'operator-uuid',
        status: TaskStatus.ASSIGNED,
      } as any);

      const result = await service.assignTask('task-uuid', 'operator-uuid');

      expect(result.assigned_to_user_id).toBe('operator-uuid');
      expect(result.status).toBe(TaskStatus.ASSIGNED);
      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient_id: 'operator-uuid',
          title: 'Новая задача назначена',
        }),
      );
    });

    it('should throw BadRequestException when reassigning completed task', async () => {
      const completedTask = { ...mockTask, status: TaskStatus.COMPLETED };
      taskRepository.findOne.mockResolvedValue(completedTask as Task);

      await expect(service.assignTask('task-uuid', 'operator-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if task not found', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.assignTask('invalid-uuid', 'operator-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================================================
  // START TASK TESTS
  // ============================================================================

  describe('startTask', () => {
    it('should start assigned task successfully', async () => {
      const assignedTask = {
        ...mockTask,
        status: TaskStatus.ASSIGNED,
        assigned_to_user_id: 'user-uuid',
      };
      taskRepository.findOne.mockResolvedValue(assignedTask as Task);
      taskRepository.save.mockResolvedValue({
        ...assignedTask,
        status: TaskStatus.IN_PROGRESS,
        started_at: new Date(),
      } as any);

      const result = await service.startTask('task-uuid', 'user-uuid');

      expect(result.status).toBe(TaskStatus.IN_PROGRESS);
      expect(taskRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if user is not assigned operator', async () => {
      const assignedTask = {
        ...mockTask,
        status: TaskStatus.ASSIGNED,
        assigned_to_user_id: 'other-user-uuid',
      };
      taskRepository.findOne.mockResolvedValue(assignedTask as Task);

      await expect(service.startTask('task-uuid', 'user-uuid')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if task is not in ASSIGNED or PENDING status', async () => {
      const completedTask = {
        ...mockTask,
        status: TaskStatus.COMPLETED,
        assigned_to_user_id: 'user-uuid',
      };
      taskRepository.findOne.mockResolvedValue(completedTask as Task);

      await expect(service.startTask('task-uuid', 'user-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow starting PENDING task', async () => {
      const pendingTask = {
        ...mockTask,
        status: TaskStatus.PENDING,
        assigned_to_user_id: 'user-uuid',
      };
      taskRepository.findOne.mockResolvedValue(pendingTask as Task);
      taskRepository.save.mockResolvedValue({
        ...pendingTask,
        status: TaskStatus.IN_PROGRESS,
      } as any);

      const result = await service.startTask('task-uuid', 'user-uuid');

      expect(result.status).toBe(TaskStatus.IN_PROGRESS);
    });
  });

  // ============================================================================
  // COMPLETE TASK TESTS - CRITICAL PHOTO VALIDATION
  // ============================================================================

  /**
   * NOTE: Detailed completeTask tests are skipped because they test implementation
   * details now handled by TaskCompletionService. TasksService.completeTask is now
   * a simple delegation method. Comprehensive tests are in task-completion.service.spec.ts.
   */
  describe.skip('completeTask', () => {
    const completeTaskDto = {
      items: [],
      completion_notes: 'Completed successfully',
    };

    beforeEach(() => {
      usersService.findOne.mockResolvedValue(mockUser as any);
    });

    it('should throw BadRequestException if no photo BEFORE provided', async () => {
      const inProgressTask = {
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
        assigned_to_user_id: 'user-uuid',
      };
      taskRepository.findOne.mockResolvedValue(inProgressTask as Task);
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: false,
        hasPhotoAfter: false,
        photosBefore: [],
        photosAfter: [],
      });

      await expect(service.completeTask('task-uuid', 'user-uuid', completeTaskDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.completeTask('task-uuid', 'user-uuid', completeTaskDto)).rejects.toThrow(
        /отсутствует фото ДО выполнения/,
      );
    });

    it('should throw BadRequestException if no photo AFTER provided', async () => {
      const inProgressTask = {
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
        assigned_to_user_id: 'user-uuid',
      };
      taskRepository.findOne.mockResolvedValue(inProgressTask as Task);
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: false,
        photosBefore: [{ id: 'photo-1' }] as any,
        photosAfter: [],
      });

      await expect(service.completeTask('task-uuid', 'user-uuid', completeTaskDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.completeTask('task-uuid', 'user-uuid', completeTaskDto)).rejects.toThrow(
        /отсутствует фото ПОСЛЕ выполнения/,
      );
    });

    it('should complete task with valid photos', async () => {
      const inProgressTask = {
        ...mockTask,
        type_code: TaskType.INSPECTION, // Simple task type
        status: TaskStatus.IN_PROGRESS,
        assigned_to_user_id: 'user-uuid',
        items: [],
      };
      const completedTask = {
        ...inProgressTask,
        status: TaskStatus.COMPLETED,
        completed_at: new Date(),
        has_photo_before: true,
        has_photo_after: true,
      };

      taskRepository.findOne.mockResolvedValue(inProgressTask as Task);
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [{ id: 'photo-1' }] as any,
        photosAfter: [{ id: 'photo-2' }] as any,
      });
      taskRepository.save.mockResolvedValue(completedTask as any);

      const result = await service.completeTask('task-uuid', 'user-uuid', completeTaskDto);

      expect(result.status).toBe(TaskStatus.COMPLETED);
      expect(eventEmitter.emit).toHaveBeenCalledWith('task.completed', expect.any(Object));
    });

    it('should throw ForbiddenException if user is not assigned operator', async () => {
      const inProgressTask = {
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
        assigned_to_user_id: 'other-user-uuid',
      };
      taskRepository.findOne.mockResolvedValue(inProgressTask as Task);

      await expect(service.completeTask('task-uuid', 'user-uuid', completeTaskDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if task is not IN_PROGRESS', async () => {
      const pendingTask = {
        ...mockTask,
        status: TaskStatus.PENDING,
        assigned_to_user_id: 'user-uuid',
      };
      taskRepository.findOne.mockResolvedValue(pendingTask as Task);

      await expect(service.completeTask('task-uuid', 'user-uuid', completeTaskDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow admin to skip photo validation with skip_photos flag', async () => {
      const inProgressTask = {
        ...mockTask,
        type_code: TaskType.INSPECTION,
        status: TaskStatus.IN_PROGRESS,
        assigned_to_user_id: 'admin-uuid',
        items: [],
      };
      const completedTask = {
        ...inProgressTask,
        status: TaskStatus.COMPLETED,
        pending_photos: true,
        offline_completed: true,
      };

      taskRepository.findOne.mockResolvedValue(inProgressTask as Task);
      usersService.findOne.mockResolvedValue(mockAdminUser as any);
      taskRepository.save.mockResolvedValue(completedTask as Task);

      const result = await service.completeTask('task-uuid', 'admin-uuid', {
        ...completeTaskDto,
        skip_photos: true,
      });

      expect(result.pending_photos).toBe(true);
      expect(result.offline_completed).toBe(true);
      expect(filesService.validateTaskPhotos).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if non-admin tries to skip photos', async () => {
      const inProgressTask = {
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
        assigned_to_user_id: 'user-uuid',
      };
      taskRepository.findOne.mockResolvedValue(inProgressTask as Task);
      usersService.findOne.mockResolvedValue(mockUser as any); // Regular operator

      await expect(
        service.completeTask('task-uuid', 'user-uuid', {
          ...completeTaskDto,
          skip_photos: true,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if checklist items are not completed', async () => {
      const inProgressTask = {
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
        assigned_to_user_id: 'user-uuid',
        checklist: [
          { item: 'Check water level', completed: true },
          { item: 'Check beans level', completed: false },
        ],
      };
      taskRepository.findOne.mockResolvedValue(inProgressTask as Task);
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [{ id: 'photo-1' }] as any,
        photosAfter: [{ id: 'photo-2' }] as any,
      });

      await expect(service.completeTask('task-uuid', 'user-uuid', completeTaskDto)).rejects.toThrow(
        /не все пункты чек-листа выполнены/,
      );
    });

    it('should update inventory when completing REFILL task', async () => {
      const refillTask = {
        ...mockTask,
        type_code: TaskType.REFILL,
        status: TaskStatus.IN_PROGRESS,
        assigned_to_user_id: 'user-uuid',
        items: [
          {
            id: 'item-uuid',
            nomenclature_id: 'nom-uuid',
            planned_quantity: 10,
            actual_quantity: null,
            unit_of_measure_code: 'pcs',
          },
        ],
      };

      taskRepository.findOne.mockResolvedValue(refillTask as Task);
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [{ id: 'photo-1' }] as any,
        photosAfter: [{ id: 'photo-2' }] as any,
      });
      taskRepository.save.mockResolvedValue({
        ...refillTask,
        status: TaskStatus.COMPLETED,
      } as any);

      await service.completeTask('task-uuid', 'user-uuid', completeTaskDto);

      expect(inventoryService.fulfillReservation).toHaveBeenCalledWith('task-uuid');
      expect(inventoryService.transferOperatorToMachine).toHaveBeenCalled();
      expect(machinesService.updateStats).toHaveBeenCalledWith(
        'machine-uuid',
        expect.objectContaining({ last_refill_date: expect.any(Date) }),
      );
    });

    it('should require actual_cash_amount for COLLECTION task', async () => {
      const collectionTask = {
        ...mockTask,
        type_code: TaskType.COLLECTION,
        status: TaskStatus.IN_PROGRESS,
        assigned_to_user_id: 'user-uuid',
        items: [],
        machine: { ...mockMachine, current_cash_amount: 50000 },
      };

      taskRepository.findOne.mockResolvedValue(collectionTask as any);
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [{ id: 'photo-1' }] as any,
        photosAfter: [{ id: 'photo-2' }] as any,
      });

      await expect(service.completeTask('task-uuid', 'user-uuid', completeTaskDto)).rejects.toThrow(
        /необходимо указать фактическую сумму/,
      );
    });

    it('should record transaction and update machine stats for COLLECTION task', async () => {
      const collectionTask = {
        ...mockTask,
        type_code: TaskType.COLLECTION,
        status: TaskStatus.IN_PROGRESS,
        assigned_to_user_id: 'user-uuid',
        items: [],
        machine: { ...mockMachine, current_cash_amount: 50000 },
      };

      taskRepository.findOne.mockResolvedValue(collectionTask as any);
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [{ id: 'photo-1' }] as any,
        photosAfter: [{ id: 'photo-2' }] as any,
      });
      taskRepository.save.mockResolvedValue({
        ...collectionTask,
        status: TaskStatus.COMPLETED,
        actual_cash_amount: 48000,
      } as any);

      await service.completeTask('task-uuid', 'user-uuid', {
        ...completeTaskDto,
        actual_cash_amount: 48000,
      });

      expect(transactionsService.recordCollection).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 48000,
          machine_id: 'machine-uuid',
        }),
      );
      expect(machinesService.updateStats).toHaveBeenCalledWith(
        'machine-uuid',
        expect.objectContaining({
          current_cash_amount: 0,
          last_collection_date: expect.any(Date),
        }),
      );
    });

    it('should create incident for cash discrepancy over 10%', async () => {
      const collectionTask = {
        ...mockTask,
        type_code: TaskType.COLLECTION,
        status: TaskStatus.IN_PROGRESS,
        assigned_to_user_id: 'user-uuid',
        items: [],
        machine: { ...mockMachine, current_cash_amount: 50000 },
      };

      taskRepository.findOne.mockResolvedValue(collectionTask as any);
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [{ id: 'photo-1' }] as any,
        photosAfter: [{ id: 'photo-2' }] as any,
      });
      taskRepository.save.mockResolvedValue({
        ...collectionTask,
        status: TaskStatus.COMPLETED,
        actual_cash_amount: 40000, // 20% discrepancy
      } as any);

      await service.completeTask('task-uuid', 'user-uuid', {
        ...completeTaskDto,
        actual_cash_amount: 40000,
      });

      expect(incidentsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Расхождение в инкассации'),
        }),
      );
    });

    it('should update washing schedule when completing CLEANING task', async () => {
      const cleaningTask = {
        ...mockTask,
        type_code: TaskType.CLEANING,
        status: TaskStatus.IN_PROGRESS,
        assigned_to_user_id: 'user-uuid',
        items: [],
        metadata: { washing_schedule_id: 'wash-schedule-uuid' },
      };

      taskRepository.findOne.mockResolvedValue(cleaningTask as Task);
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [{ id: 'photo-1' }] as any,
        photosAfter: [{ id: 'photo-2' }] as any,
      });
      taskRepository.save.mockResolvedValue({
        ...cleaningTask,
        status: TaskStatus.COMPLETED,
      } as any);

      await service.completeTask('task-uuid', 'user-uuid', completeTaskDto);

      expect(washingSchedulesService.completeWashing).toHaveBeenCalledWith(
        'wash-schedule-uuid',
        expect.objectContaining({
          performed_by_user_id: 'user-uuid',
          task_id: 'task-uuid',
        }),
      );
    });

    it('should create component movements for replacement tasks', async () => {
      const replaceTask = {
        ...mockTask,
        type_code: TaskType.REPLACE_GRINDER,
        status: TaskStatus.IN_PROGRESS,
        assigned_to_user_id: 'user-uuid',
        items: [],
        components: [
          { component_id: 'old-comp', role: ComponentRole.OLD, notes: 'Worn' },
          { component_id: 'new-comp', role: ComponentRole.NEW, notes: 'New' },
        ],
      };

      taskRepository.findOne.mockResolvedValue(replaceTask as any);
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [{ id: 'photo-1' }] as any,
        photosAfter: [{ id: 'photo-2' }] as any,
      });
      taskRepository.save.mockResolvedValue({
        ...replaceTask,
        status: TaskStatus.COMPLETED,
      } as any);

      await service.completeTask('task-uuid', 'user-uuid', completeTaskDto);

      expect(componentMovementsService.createMovement).toHaveBeenCalledTimes(2);
    });

    it('should save completion notes as comment', async () => {
      const inProgressTask = {
        ...mockTask,
        type_code: TaskType.INSPECTION,
        status: TaskStatus.IN_PROGRESS,
        assigned_to_user_id: 'user-uuid',
        items: [],
      };

      taskRepository.findOne.mockResolvedValue(inProgressTask as Task);
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [{ id: 'photo-1' }] as any,
        photosAfter: [{ id: 'photo-2' }] as any,
      });
      taskRepository.save.mockResolvedValue({
        ...inProgressTask,
        status: TaskStatus.COMPLETED,
      } as any);
      taskCommentRepository.create.mockReturnValue({
        task_id: 'task-uuid',
        comment: 'Completed successfully',
      } as any);
      taskCommentRepository.save.mockResolvedValue({} as any);

      await service.completeTask('task-uuid', 'user-uuid', {
        items: [],
        completion_notes: 'Completed successfully',
      });

      expect(taskCommentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          task_id: 'task-uuid',
          comment: 'Completed successfully',
        }),
      );
      expect(taskCommentRepository.save).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // CANCEL TASK TESTS
  // ============================================================================

  describe('cancelTask', () => {
    it('should cancel task with reason', async () => {
      const pendingTask = { ...mockTask, status: TaskStatus.PENDING };
      taskRepository.findOne.mockResolvedValue(pendingTask as Task);
      taskRepository.save.mockResolvedValue({
        ...pendingTask,
        status: TaskStatus.CANCELLED,
      } as Task);
      taskCommentRepository.create.mockReturnValue({} as any);
      taskCommentRepository.save.mockResolvedValue({} as any);

      const result = await service.cancelTask('task-uuid', 'Not needed anymore', 'user-uuid');

      expect(result.status).toBe(TaskStatus.CANCELLED);
      expect(inventoryService.cancelReservation).toHaveBeenCalledWith('task-uuid');
      expect(taskCommentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          comment: expect.stringContaining('Not needed anymore'),
        }),
      );
    });

    it('should throw BadRequestException when canceling completed task', async () => {
      const completedTask = { ...mockTask, status: TaskStatus.COMPLETED };
      taskRepository.findOne.mockResolvedValue(completedTask as Task);

      await expect(service.cancelTask('task-uuid', 'Reason', 'user-uuid')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should not fail if reservation cancellation fails', async () => {
      const pendingTask = { ...mockTask, status: TaskStatus.PENDING };
      taskRepository.findOne.mockResolvedValue(pendingTask as Task);
      inventoryService.cancelReservation.mockRejectedValue(new Error('No reservation'));
      taskRepository.save.mockResolvedValue({
        ...pendingTask,
        status: TaskStatus.CANCELLED,
      } as Task);
      taskCommentRepository.create.mockReturnValue({} as any);
      taskCommentRepository.save.mockResolvedValue({} as any);

      const result = await service.cancelTask('task-uuid', 'Reason', 'user-uuid');

      expect(result.status).toBe(TaskStatus.CANCELLED);
    });
  });

  // ============================================================================
  // REJECT TASK TESTS
  // ============================================================================

  /**
   * NOTE: Detailed rejectTask tests are skipped because they test implementation
   * details now handled by TaskRejectionService. TasksService.rejectTask is now
   * a simple delegation method. Comprehensive tests are in task-rejection.service.spec.ts.
   */
  describe.skip('rejectTask', () => {
    it('should reject completed task with compensation transactions', async () => {
      const completedRefillTask = {
        ...mockTask,
        type_code: TaskType.REFILL,
        status: TaskStatus.COMPLETED,
        assigned_to_user_id: 'user-uuid',
        items: [{ ...mockTaskItem, actual_quantity: 10 }],
      };

      taskRepository.findOne
        .mockResolvedValueOnce(completedRefillTask as Task)
        .mockResolvedValueOnce({
          ...completedRefillTask,
          status: TaskStatus.REJECTED,
        } as Task);
      usersService.findOne.mockResolvedValue(mockAdminUser as any);

      const result = await service.rejectTask('task-uuid', 'admin-uuid', 'Quality issue');

      expect(result.status).toBe(TaskStatus.REJECTED);
      expect(inventoryService.transferMachineToOperator).toHaveBeenCalled();
      expect(auditLogService.log).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('task.rejected', expect.any(Object));
    });

    it('should throw BadRequestException when rejecting non-completed task', async () => {
      const inProgressTask = { ...mockTask, status: TaskStatus.IN_PROGRESS };
      taskRepository.findOne.mockResolvedValue(inProgressTask as Task);

      await expect(service.rejectTask('task-uuid', 'admin-uuid', 'Reason')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException when non-admin tries to reject', async () => {
      const completedTask = { ...mockTask, status: TaskStatus.COMPLETED };
      taskRepository.findOne.mockResolvedValue(completedTask as Task);
      usersService.findOne.mockResolvedValue(mockUser as any);

      await expect(service.rejectTask('task-uuid', 'user-uuid', 'Reason')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if task was already rejected', async () => {
      const rejectedTask = {
        ...mockTask,
        status: TaskStatus.COMPLETED,
        rejected_at: new Date(),
        rejected_by_user_id: 'other-admin',
      };
      taskRepository.findOne.mockResolvedValue(rejectedTask as Task);
      usersService.findOne.mockResolvedValue(mockAdminUser as any);

      await expect(service.rejectTask('task-uuid', 'admin-uuid', 'Reason')).rejects.toThrow(
        /уже была отклонена/,
      );
    });

    it('should restore cash for rejected COLLECTION task', async () => {
      const completedCollectionTask = {
        ...mockTask,
        type_code: TaskType.COLLECTION,
        status: TaskStatus.COMPLETED,
        actual_cash_amount: 45000,
        assigned_to_user_id: 'user-uuid',
        items: [],
      };

      taskRepository.findOne
        .mockResolvedValueOnce(completedCollectionTask as Task)
        .mockResolvedValueOnce({
          ...completedCollectionTask,
          status: TaskStatus.REJECTED,
        } as Task);
      usersService.findOne.mockResolvedValue(mockAdminUser as any);
      machinesService.findOne.mockResolvedValue({ ...mockMachine, current_cash_amount: 0 } as any);

      await service.rejectTask('task-uuid', 'admin-uuid', 'Wrong amount');

      expect(transactionsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 45000,
        }),
        'admin-uuid',
      );
      expect(machinesService.updateStats).toHaveBeenCalledWith(
        'machine-uuid',
        expect.objectContaining({ current_cash_amount: 45000 }),
      );
    });
  });

  // ============================================================================
  // POSTPONE TASK TESTS
  // ============================================================================

  describe('postponeTask', () => {
    it('should postpone task to new date', async () => {
      const pendingTask = { ...mockTask, status: TaskStatus.PENDING };
      const newDate = new Date('2025-12-31');
      taskRepository.findOne.mockResolvedValue(pendingTask as Task);
      taskRepository.save.mockResolvedValue({
        ...pendingTask,
        status: TaskStatus.POSTPONED,
        scheduled_date: newDate,
      } as Task);
      taskCommentRepository.create.mockReturnValue({} as any);
      taskCommentRepository.save.mockResolvedValue({} as any);

      const result = await service.postponeTask(
        'task-uuid',
        newDate,
        'Equipment unavailable',
        'user-uuid',
      );

      expect(result.status).toBe(TaskStatus.POSTPONED);
      expect(result.scheduled_date).toEqual(newDate);
    });

    it('should throw BadRequestException when postponing completed task', async () => {
      const completedTask = { ...mockTask, status: TaskStatus.COMPLETED };
      taskRepository.findOne.mockResolvedValue(completedTask as Task);

      await expect(
        service.postponeTask('task-uuid', new Date(), 'Reason', 'user-uuid'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ============================================================================
  // ADD COMMENT TESTS
  // ============================================================================

  describe('addComment', () => {
    it('should add comment to task', async () => {
      taskRepository.findOne.mockResolvedValue(mockTask as Task);
      taskCommentRepository.create.mockReturnValue({
        task_id: 'task-uuid',
        user_id: 'user-uuid',
        comment: 'Test comment',
        is_internal: false,
      } as any);
      taskCommentRepository.save.mockResolvedValue({
        id: 'comment-uuid',
        task_id: 'task-uuid',
        comment: 'Test comment',
      } as any);

      const result = await service.addComment('task-uuid', 'user-uuid', 'Test comment');

      expect(result.comment).toBe('Test comment');
      expect(taskCommentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          task_id: 'task-uuid',
          user_id: 'user-uuid',
          comment: 'Test comment',
          is_internal: false,
        }),
      );
    });

    it('should add internal comment when flag is true', async () => {
      taskRepository.findOne.mockResolvedValue(mockTask as Task);
      taskCommentRepository.create.mockReturnValue({
        task_id: 'task-uuid',
        is_internal: true,
      } as any);
      taskCommentRepository.save.mockResolvedValue({ id: 'comment-uuid' } as any);

      await service.addComment('task-uuid', 'user-uuid', 'Internal note', true);

      expect(taskCommentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ is_internal: true }),
      );
    });

    it('should throw NotFoundException if task not found', async () => {
      taskRepository.findOne.mockResolvedValue(null);

      await expect(service.addComment('invalid-uuid', 'user-uuid', 'Comment')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ============================================================================
  // GET COMMENTS TESTS
  // ============================================================================

  describe('getComments', () => {
    it('should return public comments by default', async () => {
      const mockComments = [{ id: 'c1', comment: 'Public comment', is_internal: false }];
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockComments),
      };
      taskCommentRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.getComments('task-uuid');

      expect(result).toEqual(mockComments);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('comment.is_internal = :isInternal', {
        isInternal: false,
      });
    });

    it('should include internal comments when flag is true', async () => {
      const mockComments = [
        { id: 'c1', comment: 'Public', is_internal: false },
        { id: 'c2', comment: 'Internal', is_internal: true },
      ];
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockComments),
      };
      taskCommentRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.getComments('task-uuid', true);

      expect(result).toEqual(mockComments);
      expect(queryBuilder.andWhere).not.toHaveBeenCalledWith(
        'comment.is_internal = :isInternal',
        expect.anything(),
      );
    });
  });

  // ============================================================================
  // GET STATS TESTS
  // ============================================================================

  /**
   * NOTE: Skipped - getStats is now delegated to TaskEscalationService.
   * See task-escalation.service.spec.ts for comprehensive tests.
   */
  describe.skip('getStats', () => {
    it('should return task statistics', async () => {
      const countQueryBuilder = createQueryBuilderMock([]);
      countQueryBuilder.getCount.mockResolvedValue(100);

      const statusQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { status: TaskStatus.PENDING, count: '30' },
          { status: TaskStatus.COMPLETED, count: '50' },
          { status: TaskStatus.IN_PROGRESS, count: '20' },
        ]),
      };

      const typeQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { type: TaskType.REFILL, count: '60' },
          { type: TaskType.COLLECTION, count: '40' },
        ]),
      };

      const overdueQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(5),
      };

      taskRepository.createQueryBuilder
        .mockReturnValueOnce(countQueryBuilder as any)
        .mockReturnValueOnce(statusQueryBuilder as any)
        .mockReturnValueOnce(typeQueryBuilder as any)
        .mockReturnValueOnce(overdueQueryBuilder as any);

      const result = await service.getStats();

      expect(result.total).toBe(100);
      expect(result.by_status[TaskStatus.PENDING]).toBe(30);
      expect(result.by_type[TaskType.REFILL]).toBe(60);
      expect(result.overdue).toBe(5);
    });

    it('should filter by machine ID', async () => {
      const queryBuilder = createQueryBuilderMock([]);
      taskRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.getStats('machine-uuid');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('task.machine_id = :machineId', {
        machineId: 'machine-uuid',
      });
    });

    it('should filter by user ID', async () => {
      const queryBuilder = createQueryBuilderMock([]);
      taskRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.getStats(undefined, 'user-uuid');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('task.assigned_to_user_id = :userId', {
        userId: 'user-uuid',
      });
    });
  });

  // ============================================================================
  // GET OVERDUE TASKS TESTS
  // ============================================================================

  /**
   * NOTE: Skipped - getOverdueTasks is now delegated to TaskEscalationService.
   * See task-escalation.service.spec.ts for comprehensive tests.
   */
  describe.skip('getOverdueTasks', () => {
    it('should return tasks past their due date that are not completed or cancelled', async () => {
      const overdueTasks = [
        {
          id: 'task-1',
          due_date: new Date('2024-01-01'),
          status: TaskStatus.PENDING,
        },
        {
          id: 'task-2',
          due_date: new Date('2024-01-02'),
          status: TaskStatus.IN_PROGRESS,
        },
      ];
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(overdueTasks),
      };
      taskRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.getOverdueTasks();

      expect(result).toEqual(overdueTasks);
      expect(queryBuilder.where).toHaveBeenCalledWith('task.due_date < :now', {
        now: expect.any(Date),
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('task.status != :completed', {
        completed: TaskStatus.COMPLETED,
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('task.status != :cancelled', {
        cancelled: TaskStatus.CANCELLED,
      });
    });
  });

  // ============================================================================
  // ESCALATE OVERDUE TASKS TESTS
  // ============================================================================

  /**
   * NOTE: Skipped - escalateOverdueTasks is now delegated to TaskEscalationService.
   * See task-escalation.service.spec.ts for comprehensive tests.
   */
  describe.skip('escalateOverdueTasks', () => {
    it('should create incidents for tasks overdue more than 4 hours', async () => {
      const fourHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000); // 5 hours ago
      const overdueTasks = [
        {
          id: 'task-1',
          type_code: TaskType.REFILL,
          due_date: fourHoursAgo,
          status: TaskStatus.PENDING,
          machine_id: 'machine-uuid',
          machine: mockMachine,
          assigned_to: mockUser,
          created_by_user_id: 'manager-uuid',
        },
      ];
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(overdueTasks),
      };
      taskRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);
      incidentsService.findAll.mockResolvedValue([]);

      const result = await service.escalateOverdueTasks();

      expect(result.escalated_count).toBe(1);
      expect(result.incidents_created).toBe(1);
      expect(incidentsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Просроченная задача'),
          machine_id: 'machine-uuid',
        }),
      );
      expect(notificationsService.create).toHaveBeenCalled();
    });

    it('should not create duplicate incidents for already escalated tasks', async () => {
      const overdueTasks = [
        {
          id: 'task-1',
          type_code: TaskType.REFILL,
          due_date: new Date(Date.now() - 5 * 60 * 60 * 1000),
          status: TaskStatus.PENDING,
          machine_id: 'machine-uuid',
          machine: mockMachine,
        },
      ];
      const existingIncident = {
        metadata: { task_id: 'task-1' },
        incident_type: 'other',
      };
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(overdueTasks),
      };
      taskRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);
      incidentsService.findAll.mockResolvedValue([existingIncident] as any);

      const result = await service.escalateOverdueTasks();

      expect(result.incidents_created).toBe(0);
      expect(incidentsService.create).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // UPLOAD PENDING PHOTOS TESTS
  // ============================================================================

  /**
   * NOTE: Skipped - uploadPendingPhotos is now delegated to TaskCompletionService.
   * See task-completion.service.spec.ts for comprehensive tests.
   */
  describe.skip('uploadPendingPhotos', () => {
    it('should update task when all photos are uploaded', async () => {
      const taskWithPendingPhotos = {
        ...mockTask,
        status: TaskStatus.COMPLETED,
        pending_photos: true,
      };
      taskRepository.findOne.mockResolvedValue(taskWithPendingPhotos as Task);
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [] as any,
        photosAfter: [] as any,
      });
      taskRepository.save.mockResolvedValue({
        ...taskWithPendingPhotos,
        pending_photos: false,
        has_photo_before: true,
        has_photo_after: true,
      } as any);

      const result = await service.uploadPendingPhotos('task-uuid', 'user-uuid');

      expect(result.pending_photos).toBe(false);
      expect(auditLogService.log).toHaveBeenCalled();
    });

    it('should throw BadRequestException if task has no pending photos', async () => {
      const taskWithoutPendingPhotos = {
        ...mockTask,
        status: TaskStatus.COMPLETED,
        pending_photos: false,
      };
      taskRepository.findOne.mockResolvedValue(taskWithoutPendingPhotos as Task);

      await expect(service.uploadPendingPhotos('task-uuid', 'user-uuid')).rejects.toThrow(
        /нет ожидающих фото/,
      );
    });

    it('should throw BadRequestException if task is not completed', async () => {
      const inProgressTask = {
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
        pending_photos: true,
      };
      taskRepository.findOne.mockResolvedValue(inProgressTask as Task);

      await expect(service.uploadPendingPhotos('task-uuid', 'user-uuid')).rejects.toThrow(
        /только для завершенных задач/,
      );
    });

    it('should throw BadRequestException if photos are not yet uploaded', async () => {
      const taskWithPendingPhotos = {
        ...mockTask,
        status: TaskStatus.COMPLETED,
        pending_photos: true,
      };
      taskRepository.findOne.mockResolvedValue(taskWithPendingPhotos as Task);
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: false,
        photosBefore: [] as any,
        photosAfter: [] as any,
      });

      await expect(service.uploadPendingPhotos('task-uuid', 'user-uuid')).rejects.toThrow(
        /Фото еще не загружены/,
      );
    });
  });

  // ============================================================================
  // GET PENDING PHOTOS TASKS TESTS
  // ============================================================================

  /**
   * NOTE: Skipped - getPendingPhotosTasks is now delegated to TaskCompletionService.
   * See task-completion.service.spec.ts for comprehensive tests.
   */
  describe.skip('getPendingPhotosTasks', () => {
    it('should return completed tasks with pending photos', async () => {
      const tasksWithPendingPhotos = [
        { id: 'task-1', pending_photos: true, status: TaskStatus.COMPLETED },
        { id: 'task-2', pending_photos: true, status: TaskStatus.COMPLETED },
      ];
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(tasksWithPendingPhotos),
      };
      taskRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.getPendingPhotosTasks();

      expect(result).toEqual(tasksWithPendingPhotos);
      expect(queryBuilder.where).toHaveBeenCalledWith('task.pending_photos = :pending', {
        pending: true,
      });
    });

    it('should filter by user ID when provided', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      taskRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.getPendingPhotosTasks('user-uuid');

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('task.assigned_to_user_id = :userId', {
        userId: 'user-uuid',
      });
    });
  });

  // ============================================================================
  // ADDITIONAL BRANCH COVERAGE TESTS
  // ============================================================================

  /**
   * NOTE: Skipped - these tests are for implementation details now in TaskCompletionService.
   */
  describe.skip('completeTask - additional branch coverage', () => {
    const completeTaskDto = {
      completion_notes: 'Test completion notes',
    };

    it('should throw BadRequestException if COLLECTION task has no machine data', async () => {
      const collectionTaskNoMachine = {
        ...mockTask,
        type_code: TaskType.COLLECTION,
        status: TaskStatus.IN_PROGRESS,
        assigned_to_user_id: 'user-uuid',
        items: [],
        machine: null, // No machine data
      };

      taskRepository.findOne.mockResolvedValue(collectionTaskNoMachine as any);
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [{ id: 'photo-1' }] as any,
        photosAfter: [{ id: 'photo-2' }] as any,
      });

      await expect(
        service.completeTask('task-uuid', 'user-uuid', {
          ...completeTaskDto,
          actual_cash_amount: 50000,
        }),
      ).rejects.toThrow('Machine data not found in task');
    });

    it('should handle failed reservation fulfillment gracefully for REFILL task', async () => {
      const refillTask = {
        ...mockTask,
        type_code: TaskType.REFILL,
        status: TaskStatus.IN_PROGRESS,
        assigned_to_user_id: 'user-uuid',
        items: [
          {
            id: 'item-uuid',
            nomenclature_id: 'nom-uuid',
            planned_quantity: 10,
            actual_quantity: null,
            unit_of_measure_code: 'pcs',
          },
        ],
      };

      taskRepository.findOne.mockResolvedValue(refillTask as Task);
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [{ id: 'photo-1' }] as any,
        photosAfter: [{ id: 'photo-2' }] as any,
      });
      inventoryService.fulfillReservation.mockRejectedValue(new Error('Reservation not found'));
      taskRepository.save.mockResolvedValue({
        ...refillTask,
        status: TaskStatus.COMPLETED,
      } as any);

      // Should not throw - error is caught and logged
      const result = await service.completeTask('task-uuid', 'user-uuid', completeTaskDto);
      expect(result.status).toBe(TaskStatus.COMPLETED);
    });

    it('should throw ForbiddenException if REFILL task operator does not match user', async () => {
      // The check for assigned_to_user_id !== userId happens BEFORE the check for null assignment
      // So we need to test the case where user doesn't match the assigned operator
      const refillTaskOtherOperator = {
        ...mockTask,
        type_code: TaskType.REFILL,
        status: TaskStatus.IN_PROGRESS,
        assigned_to_user_id: 'other-operator-uuid', // Different operator assigned
        items: [
          {
            id: 'item-uuid',
            nomenclature_id: 'nom-uuid',
            planned_quantity: 10,
            actual_quantity: null,
            unit_of_measure_code: 'pcs',
          },
        ],
      };

      taskRepository.findOne.mockResolvedValue(refillTaskOtherOperator as any);

      await expect(service.completeTask('task-uuid', 'user-uuid', completeTaskDto)).rejects.toThrow(
        /Только назначенный оператор/,
      );
    });

    it('should handle failed washing schedule update gracefully for CLEANING task', async () => {
      const cleaningTask = {
        ...mockTask,
        type_code: TaskType.CLEANING,
        status: TaskStatus.IN_PROGRESS,
        assigned_to_user_id: 'user-uuid',
        items: [],
        metadata: { washing_schedule_id: 'wash-schedule-uuid' },
      };

      taskRepository.findOne.mockResolvedValue(cleaningTask as Task);
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [{ id: 'photo-1' }] as any,
        photosAfter: [{ id: 'photo-2' }] as any,
      });
      washingSchedulesService.completeWashing.mockRejectedValue(
        new Error('Washing schedule update failed'),
      );
      taskRepository.save.mockResolvedValue({
        ...cleaningTask,
        status: TaskStatus.COMPLETED,
      } as any);

      // Should not throw - error is caught and logged
      const result = await service.completeTask('task-uuid', 'user-uuid', completeTaskDto);
      expect(result.status).toBe(TaskStatus.COMPLETED);
    });

    it('should warn when REPLACE task has no components', async () => {
      const replaceTask = {
        ...mockTask,
        type_code: TaskType.REPLACE_HOPPER,
        status: TaskStatus.IN_PROGRESS,
        assigned_to_user_id: 'user-uuid',
        items: [],
        components: [], // No components
      };

      taskRepository.findOne.mockResolvedValue(replaceTask as any);
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [{ id: 'photo-1' }] as any,
        photosAfter: [{ id: 'photo-2' }] as any,
      });
      taskRepository.save.mockResolvedValue({
        ...replaceTask,
        status: TaskStatus.COMPLETED,
      } as any);

      const result = await service.completeTask('task-uuid', 'user-uuid', completeTaskDto);

      expect(result.status).toBe(TaskStatus.COMPLETED);
      // Component movements should not be created
      expect(componentMovementsService.createMovement).not.toHaveBeenCalled();
    });

    it('should handle component movement errors gracefully for REPLACE task', async () => {
      const replaceTask = {
        ...mockTask,
        type_code: TaskType.REPLACE_GRINDER,
        status: TaskStatus.IN_PROGRESS,
        assigned_to_user_id: 'user-uuid',
        items: [],
        components: [
          {
            id: 'tc-1',
            component_id: 'comp-old',
            role: ComponentRole.OLD,
            notes: 'Old component',
          },
          {
            id: 'tc-2',
            component_id: 'comp-new',
            role: ComponentRole.NEW,
            notes: 'New component',
          },
        ],
      };

      taskRepository.findOne.mockResolvedValue(replaceTask as any);
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [{ id: 'photo-1' }] as any,
        photosAfter: [{ id: 'photo-2' }] as any,
      });
      componentMovementsService.createMovement.mockRejectedValue(
        new Error('Component movement failed'),
      );
      taskRepository.save.mockResolvedValue({
        ...replaceTask,
        status: TaskStatus.COMPLETED,
      } as any);

      // Should not throw - errors are caught and logged
      const result = await service.completeTask('task-uuid', 'user-uuid', completeTaskDto);
      expect(result.status).toBe(TaskStatus.COMPLETED);
    });

    it('should complete INSPECTION task and log checklist status', async () => {
      const inspectionTask = {
        ...mockTask,
        type_code: TaskType.INSPECTION,
        status: TaskStatus.IN_PROGRESS,
        assigned_to_user_id: 'user-uuid',
        items: [],
        checklist: [
          { item: 'Check water level', completed: true },
          { item: 'Check beans level', completed: true },
        ],
      };

      taskRepository.findOne.mockResolvedValue(inspectionTask as Task);
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [{ id: 'photo-1' }] as any,
        photosAfter: [{ id: 'photo-2' }] as any,
      });
      taskRepository.save.mockResolvedValue({
        ...inspectionTask,
        status: TaskStatus.COMPLETED,
      } as any);

      await service.completeTask('task-uuid', 'user-uuid', completeTaskDto);

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('Проведена проверка'),
          metadata: expect.objectContaining({
            checklist_completed: true,
          }),
        }),
      );
    });

    it('should log false checklist_completed when not all items completed in INSPECTION', async () => {
      const inspectionTask = {
        ...mockTask,
        type_code: TaskType.INSPECTION,
        status: TaskStatus.IN_PROGRESS,
        assigned_to_user_id: 'user-uuid',
        items: [],
        checklist: null, // No checklist
      };

      taskRepository.findOne.mockResolvedValue(inspectionTask as Task);
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [{ id: 'photo-1' }] as any,
        photosAfter: [{ id: 'photo-2' }] as any,
      });
      taskRepository.save.mockResolvedValue({
        ...inspectionTask,
        status: TaskStatus.COMPLETED,
      } as any);

      await service.completeTask('task-uuid', 'user-uuid', completeTaskDto);

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            checklist_completed: false, // No checklist = false
          }),
        }),
      );
    });

    it('should update item quantities from DTO for REFILL task', async () => {
      const refillTask = {
        ...mockTask,
        type_code: TaskType.REFILL,
        status: TaskStatus.IN_PROGRESS,
        assigned_to_user_id: 'user-uuid',
        items: [
          {
            id: 'item-1',
            nomenclature_id: 'nom-1',
            planned_quantity: 10,
            actual_quantity: null,
            unit_of_measure_code: 'pcs',
          },
          {
            id: 'item-2',
            nomenclature_id: 'nom-2',
            planned_quantity: 20,
            actual_quantity: null,
            unit_of_measure_code: 'pcs',
          },
        ],
      };

      taskRepository.findOne.mockResolvedValue(refillTask as Task);
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [{ id: 'photo-1' }] as any,
        photosAfter: [{ id: 'photo-2' }] as any,
      });
      taskRepository.save.mockResolvedValue({
        ...refillTask,
        status: TaskStatus.COMPLETED,
      } as any);

      await service.completeTask('task-uuid', 'user-uuid', {
        ...completeTaskDto,
        items: [
          { nomenclature_id: 'nom-1', actual_quantity: 8 },
          { nomenclature_id: 'nom-2', actual_quantity: 18 },
        ],
      });

      expect(taskItemRepository.save).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // REJECT TASK BRANCH COVERAGE TESTS
  // ============================================================================

  /**
   * NOTE: Skipped - these tests are for implementation details now in TaskRejectionService.
   */
  describe.skip('rejectTask - branch coverage', () => {
    it('should throw BadRequestException if REFILL reject task is not assigned to operator', async () => {
      const completedRefillTask = {
        ...mockTask,
        type_code: TaskType.REFILL,
        status: TaskStatus.COMPLETED,
        assigned_to_user_id: null, // Not assigned
        items: [
          {
            id: 'item-uuid',
            nomenclature_id: 'nom-uuid',
            planned_quantity: 10,
            actual_quantity: 10,
            unit_of_measure_code: 'pcs',
          },
        ],
      };

      taskRepository.findOne.mockResolvedValue(completedRefillTask as any);
      usersService.findOne.mockResolvedValue(mockAdminUser as any);

      await expect(service.rejectTask('task-uuid', 'admin-uuid', 'Test rejection')).rejects.toThrow(
        /Задача должна быть назначена оператору для отката инвентаря/,
      );
    });

    it('should successfully reject COLLECTION task and create compensating transaction', async () => {
      const completedCollectionTask = {
        ...mockTask,
        type_code: TaskType.COLLECTION,
        status: TaskStatus.COMPLETED,
        assigned_to_user_id: 'user-uuid',
        actual_cash_amount: 50000,
        items: [],
        machine: { ...mockMachine },
      };

      taskRepository.findOne.mockResolvedValue(completedCollectionTask as any);
      usersService.findOne.mockResolvedValue(mockAdminUser as any);
      // Mock machinesService.findOne to return the machine (used in rejectTask to get current_cash_amount)
      machinesService.findOne.mockResolvedValue({
        ...mockMachine,
        current_cash_amount: 0, // After collection, cash was set to 0
      } as any);
      taskRepository.save.mockResolvedValue({
        ...completedCollectionTask,
        status: TaskStatus.REJECTED,
      } as any);

      const result = await service.rejectTask('task-uuid', 'admin-uuid', 'Test rejection');

      expect(result.status).toBe(TaskStatus.REJECTED);
      // The transaction is recorded as a positive refund, not negative
      expect(transactionsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 50000, // Refund is positive
          description: expect.stringContaining('ОТКАТ инкассации'),
        }),
        'admin-uuid',
      );
      expect(machinesService.updateStats).toHaveBeenCalledWith(
        'machine-uuid',
        expect.objectContaining({
          current_cash_amount: 50000, // Should be restored to the collected amount
        }),
      );
    });
  });
});
