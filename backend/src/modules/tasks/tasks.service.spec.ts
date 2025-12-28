import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, BadRequestException } from '@nestjs/common';
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
  let _taskItemRepository: jest.Mocked<Repository<TaskItem>>;
  let taskCommentRepository: jest.Mocked<Repository<TaskComment>>;
  let _taskComponentRepository: jest.Mocked<Repository<TaskComponent>>;
  let _filesService: jest.Mocked<FilesService>;
  let _machinesService: jest.Mocked<MachinesService>;
  let inventoryService: jest.Mocked<InventoryService>;
  let notificationsService: jest.Mocked<NotificationsService>;
  let _transactionsService: jest.Mocked<TransactionsService>;
  let _incidentsService: jest.Mocked<IncidentsService>;
  let _auditLogService: jest.Mocked<AuditLogService>;
  let _usersService: jest.Mocked<UsersService>;
  let _washingSchedulesService: jest.Mocked<WashingSchedulesService>;
  let _componentMovementsService: jest.Mocked<ComponentMovementsService>;
  let _componentsService: jest.Mocked<ComponentsService>;
  let _eventEmitter: jest.Mocked<EventEmitter2>;
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

  const _mockAdminUser = {
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

  const _mockTaskItem: Partial<TaskItem> = {
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
});
