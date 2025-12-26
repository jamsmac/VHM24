import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TaskCompletionService } from './task-completion.service';
import { Task, TaskStatus, TaskType } from '../entities/task.entity';
import { TaskItem } from '../entities/task-item.entity';
import { TaskComment } from '../entities/task-comment.entity';
import { FilesService } from '../../files/files.service';
import { MachinesService } from '../../machines/machines.service';
import { InventoryService } from '../../inventory/inventory.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { TransactionsService } from '../../transactions/transactions.service';
import { IncidentsService } from '../../incidents/incidents.service';
import { AuditLogService } from '../../security/services/audit-log.service';
import { UsersService } from '../../users/users.service';
import { WashingSchedulesService } from '../../equipment/services/washing-schedules.service';
import { ComponentMovementsService } from '../../equipment/services/component-movements.service';
import { UserRole } from '../../users/entities/user.entity';

describe('TaskCompletionService', () => {
  let service: TaskCompletionService;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let taskItemRepository: jest.Mocked<Repository<TaskItem>>;
  let taskCommentRepository: jest.Mocked<Repository<TaskComment>>;
  let filesService: jest.Mocked<FilesService>;
  let machinesService: jest.Mocked<MachinesService>;
  let inventoryService: jest.Mocked<InventoryService>;
  let notificationsService: jest.Mocked<NotificationsService>;
  let transactionsService: jest.Mocked<TransactionsService>;
  let incidentsService: jest.Mocked<IncidentsService>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let usersService: jest.Mocked<UsersService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockUserId = 'user-123';
  const mockTaskId = 'task-456';
  const mockMachineId = 'machine-789';

  const createMockTask = (overrides: Partial<Task> = {}): Task => ({
    id: mockTaskId,
    machine_id: mockMachineId,
    type_code: TaskType.REFILL,
    status: TaskStatus.IN_PROGRESS,
    assigned_to_user_id: mockUserId,
    created_by_user_id: 'creator-user',
    items: [],
    checklist: [],
    machine: {
      id: mockMachineId,
      machine_number: 'M-001',
      current_cash_amount: 1000,
    } as any,
    ...overrides,
  } as Task);

  beforeEach(async () => {
    const mockRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskCompletionService,
        {
          provide: getRepositoryToken(Task),
          useValue: { ...mockRepository },
        },
        {
          provide: getRepositoryToken(TaskItem),
          useValue: { ...mockRepository },
        },
        {
          provide: getRepositoryToken(TaskComment),
          useValue: { ...mockRepository },
        },
        {
          provide: FilesService,
          useValue: {
            validateTaskPhotos: jest.fn(),
          },
        },
        {
          provide: MachinesService,
          useValue: {
            updateStats: jest.fn(),
          },
        },
        {
          provide: InventoryService,
          useValue: {
            fulfillReservation: jest.fn(),
            transferOperatorToMachine: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: TransactionsService,
          useValue: {
            recordCollection: jest.fn(),
          },
        },
        {
          provide: IncidentsService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            log: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: WashingSchedulesService,
          useValue: {
            completeWashing: jest.fn(),
          },
        },
        {
          provide: ComponentMovementsService,
          useValue: {
            createMovement: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn((callback) => callback()),
          },
        },
      ],
    }).compile();

    service = module.get<TaskCompletionService>(TaskCompletionService);
    taskRepository = module.get(getRepositoryToken(Task));
    taskItemRepository = module.get(getRepositoryToken(TaskItem));
    taskCommentRepository = module.get(getRepositoryToken(TaskComment));
    filesService = module.get(FilesService);
    machinesService = module.get(MachinesService);
    inventoryService = module.get(InventoryService);
    notificationsService = module.get(NotificationsService);
    transactionsService = module.get(TransactionsService);
    incidentsService = module.get(IncidentsService);
    auditLogService = module.get(AuditLogService);
    usersService = module.get(UsersService);
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('completeTask', () => {
    it('should throw ForbiddenException if user is not assigned to task', async () => {
      const task = createMockTask({ assigned_to_user_id: 'other-user' });

      await expect(
        service.completeTask(task, mockUserId, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if task is not in IN_PROGRESS status', async () => {
      const task = createMockTask({ status: TaskStatus.PENDING });

      await expect(
        service.completeTask(task, mockUserId, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if photos are missing', async () => {
      const task = createMockTask();
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: false,
        hasPhotoAfter: false,
        photosBefore: [],
        photosAfter: [],
      });

      await expect(
        service.completeTask(task, mockUserId, {}),
      ).rejects.toThrow(BadRequestException);
      expect(filesService.validateTaskPhotos).toHaveBeenCalledWith(task.id);
    });

    it('should throw BadRequestException if only photo before is missing', async () => {
      const task = createMockTask();
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: false,
        hasPhotoAfter: true,
        photosBefore: [],
        photosAfter: [],
      });

      await expect(
        service.completeTask(task, mockUserId, {}),
      ).rejects.toThrow('фото ДО');
    });

    it('should throw BadRequestException if only photo after is missing', async () => {
      const task = createMockTask();
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: false,
        photosBefore: [],
        photosAfter: [],
      });

      await expect(
        service.completeTask(task, mockUserId, {}),
      ).rejects.toThrow('фото ПОСЛЕ');
    });

    it('should allow skip_photos for admin users', async () => {
      const task = createMockTask();
      usersService.findOne.mockResolvedValue({ role: UserRole.ADMIN } as any);
      taskRepository.save.mockResolvedValue(task);

      const result = await service.completeTask(task, mockUserId, {
        skip_photos: true,
      });

      expect(result.pending_photos).toBe(true);
      expect(result.offline_completed).toBe(true);
      expect(filesService.validateTaskPhotos).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if non-admin tries to skip photos', async () => {
      const task = createMockTask();
      usersService.findOne.mockResolvedValue({ role: UserRole.OPERATOR } as any);

      await expect(
        service.completeTask(task, mockUserId, { skip_photos: true }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if checklist is incomplete', async () => {
      const task = createMockTask({
        checklist: [
          { item: 'Step 1', completed: true },
          { item: 'Step 2', completed: false },
        ],
      });
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [],
        photosAfter: [],
      });

      await expect(
        service.completeTask(task, mockUserId, {}),
      ).rejects.toThrow('чек-листа');
    });

    it('should complete task successfully with valid photos', async () => {
      const task = createMockTask();
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [],
        photosAfter: [],
      });
      taskRepository.save.mockResolvedValue({
        ...task,
        status: TaskStatus.COMPLETED,
        has_photo_before: true,
        has_photo_after: true,
      });

      const result = await service.completeTask(task, mockUserId, {});

      expect(result.status).toBe(TaskStatus.COMPLETED);
      expect(result.has_photo_before).toBe(true);
      expect(result.has_photo_after).toBe(true);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'task.completed',
        expect.any(Object),
      );
    });

    it('should save completion notes as a comment', async () => {
      const task = createMockTask();
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [],
        photosAfter: [],
      });
      taskRepository.save.mockResolvedValue(task);
      taskCommentRepository.create.mockReturnValue({} as any);
      taskCommentRepository.save.mockResolvedValue({} as any);

      await service.completeTask(task, mockUserId, {
        completion_notes: 'Task completed successfully',
      });

      expect(taskCommentRepository.create).toHaveBeenCalledWith({
        task_id: task.id,
        user_id: mockUserId,
        comment: 'Task completed successfully',
        is_internal: false,
      });
      expect(taskCommentRepository.save).toHaveBeenCalled();
    });

    it('should send notification to task creator', async () => {
      const task = createMockTask({ created_by_user_id: 'different-creator' });
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [],
        photosAfter: [],
      });
      taskRepository.save.mockResolvedValue(task);

      await service.completeTask(task, mockUserId, {});

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient_id: 'different-creator',
          title: 'Задача завершена',
        }),
      );
    });

    it('should not send notification if creator is the same as completer', async () => {
      const task = createMockTask({ created_by_user_id: mockUserId });
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [],
        photosAfter: [],
      });
      taskRepository.save.mockResolvedValue(task);

      await service.completeTask(task, mockUserId, {});

      expect(notificationsService.create).not.toHaveBeenCalled();
    });
  });

  describe('completeTask - Collection task', () => {
    it('should throw BadRequestException if actual_cash_amount is missing', async () => {
      const task = createMockTask({ type_code: TaskType.COLLECTION });
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [],
        photosAfter: [],
      });

      await expect(
        service.completeTask(task, mockUserId, {}),
      ).rejects.toThrow('actual_cash_amount');
    });

    it('should record collection and update machine stats', async () => {
      const task = createMockTask({ type_code: TaskType.COLLECTION });
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [],
        photosAfter: [],
      });
      taskRepository.save.mockResolvedValue(task);

      await service.completeTask(task, mockUserId, {
        actual_cash_amount: 950,
      });

      expect(transactionsService.recordCollection).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 950,
          machine_id: mockMachineId,
        }),
      );
      expect(machinesService.updateStats).toHaveBeenCalledWith(
        mockMachineId,
        expect.objectContaining({
          current_cash_amount: 0,
        }),
      );
    });

    it('should create incident for large cash discrepancy', async () => {
      const task = createMockTask({
        type_code: TaskType.COLLECTION,
        machine: {
          id: mockMachineId,
          machine_number: 'M-001',
          current_cash_amount: 1000,
        } as any,
      });
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [],
        photosAfter: [],
      });
      taskRepository.save.mockResolvedValue(task);

      // 15% discrepancy (expected 1000, actual 850)
      await service.completeTask(task, mockUserId, {
        actual_cash_amount: 850,
      });

      expect(incidentsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          machine_id: mockMachineId,
          title: expect.stringContaining('Расхождение'),
        }),
      );
    });

    it('should not create incident for small cash discrepancy', async () => {
      const task = createMockTask({
        type_code: TaskType.COLLECTION,
        machine: {
          id: mockMachineId,
          machine_number: 'M-001',
          current_cash_amount: 1000,
        } as any,
      });
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [],
        photosAfter: [],
      });
      taskRepository.save.mockResolvedValue(task);

      // 5% discrepancy (expected 1000, actual 950)
      await service.completeTask(task, mockUserId, {
        actual_cash_amount: 950,
      });

      expect(incidentsService.create).not.toHaveBeenCalled();
    });
  });

  describe('completeTask - Refill task', () => {
    it('should update task items with actual quantities', async () => {
      const taskItem = {
        id: 'item-1',
        nomenclature_id: 'nom-1',
        planned_quantity: 10,
        actual_quantity: 0,
        unit_of_measure_code: 'pcs',
      } as TaskItem;

      const task = createMockTask({
        type_code: TaskType.REFILL,
        items: [taskItem],
      });

      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [],
        photosAfter: [],
      });
      taskRepository.save.mockResolvedValue(task);
      taskItemRepository.save.mockResolvedValue([taskItem] as any);

      await service.completeTask(task, mockUserId, {
        items: [{ nomenclature_id: 'nom-1', actual_quantity: 8 }],
      });

      expect(taskItemRepository.save).toHaveBeenCalledWith([
        expect.objectContaining({ actual_quantity: 8 }),
      ]);
    });

    it('should transfer inventory from operator to machine', async () => {
      const taskItem = {
        id: 'item-1',
        nomenclature_id: 'nom-1',
        planned_quantity: 10,
        actual_quantity: 10,
        unit_of_measure_code: 'pcs',
      } as TaskItem;

      const task = createMockTask({
        type_code: TaskType.REFILL,
        items: [taskItem],
      });

      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [],
        photosAfter: [],
      });
      taskRepository.save.mockResolvedValue(task);

      await service.completeTask(task, mockUserId, {});

      expect(inventoryService.transferOperatorToMachine).toHaveBeenCalledWith(
        expect.objectContaining({
          operator_id: mockUserId,
          machine_id: mockMachineId,
          nomenclature_id: 'nom-1',
          quantity: 10,
        }),
        mockUserId,
      );
    });
  });

  describe('uploadPendingPhotos', () => {
    it('should throw if task has no pending photos', async () => {
      const task = createMockTask({ pending_photos: false });

      await expect(
        service.uploadPendingPhotos(task, mockUserId),
      ).rejects.toThrow('нет ожидающих фото');
    });

    it('should throw if task is not completed', async () => {
      const task = createMockTask({
        pending_photos: true,
        status: TaskStatus.IN_PROGRESS,
      });

      await expect(
        service.uploadPendingPhotos(task, mockUserId),
      ).rejects.toThrow('только для завершенных задач');
    });

    it('should update task when photos are uploaded', async () => {
      const task = createMockTask({
        pending_photos: true,
        status: TaskStatus.COMPLETED,
      });
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [],
        photosAfter: [],
      });
      taskRepository.save.mockResolvedValue({
        ...task,
        pending_photos: false,
        has_photo_before: true,
        has_photo_after: true,
      });

      const result = await service.uploadPendingPhotos(task, mockUserId);

      expect(result.pending_photos).toBe(false);
      expect(result.has_photo_before).toBe(true);
      expect(result.has_photo_after).toBe(true);
      expect(auditLogService.log).toHaveBeenCalled();
    });

    it('should throw if photos are still missing', async () => {
      const task = createMockTask({
        pending_photos: true,
        status: TaskStatus.COMPLETED,
      });
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: false,
        photosBefore: [],
        photosAfter: [],
      });

      await expect(
        service.uploadPendingPhotos(task, mockUserId),
      ).rejects.toThrow('Фото еще не загружены');
    });
  });

  describe('getPendingPhotosTasks', () => {
    it('should return tasks with pending photos', async () => {
      const mockTasks = [
        createMockTask({ pending_photos: true, status: TaskStatus.COMPLETED }),
      ];

      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockTasks),
      };
      taskRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

      const result = await service.getPendingPhotosTasks();

      expect(result).toEqual(mockTasks);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'task.pending_photos = :pending',
        { pending: true },
      );
    });

    it('should filter by userId when provided', async () => {
      const queryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      taskRepository.createQueryBuilder = jest.fn().mockReturnValue(queryBuilder);

      await service.getPendingPhotosTasks(mockUserId);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'task.assigned_to_user_id = :userId',
        { userId: mockUserId },
      );
    });
  });

  describe('completeTask - Cleaning task', () => {
    let washingSchedulesService: jest.Mocked<WashingSchedulesService>;

    beforeEach(() => {
      washingSchedulesService = (service as any).washingSchedulesService;
    });

    it('should complete cleaning task without washing schedule', async () => {
      const task = createMockTask({
        type_code: TaskType.CLEANING,
        metadata: {},
      });
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [],
        photosAfter: [],
      });
      taskRepository.save.mockResolvedValue({
        ...task,
        status: TaskStatus.COMPLETED,
      });

      const result = await service.completeTask(task, mockUserId, {});

      expect(result.status).toBe(TaskStatus.COMPLETED);
      expect(washingSchedulesService.completeWashing).not.toHaveBeenCalled();
    });

    it('should update washing schedule when completing cleaning task', async () => {
      const washingScheduleId = 'washing-123';
      const task = createMockTask({
        type_code: TaskType.CLEANING,
        metadata: { washing_schedule_id: washingScheduleId },
      });
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [],
        photosAfter: [],
      });
      taskRepository.save.mockResolvedValue({
        ...task,
        status: TaskStatus.COMPLETED,
      });

      await service.completeTask(task, mockUserId, {
        completion_notes: 'Cleaned thoroughly',
      });

      expect(washingSchedulesService.completeWashing).toHaveBeenCalledWith(
        washingScheduleId,
        {
          performed_by_user_id: mockUserId,
          task_id: task.id,
          notes: 'Cleaned thoroughly',
        },
      );
    });

    it('should handle error when updating washing schedule fails', async () => {
      const washingScheduleId = 'washing-123';
      const task = createMockTask({
        type_code: TaskType.CLEANING,
        metadata: { washing_schedule_id: washingScheduleId },
      });
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [],
        photosAfter: [],
      });
      taskRepository.save.mockResolvedValue({
        ...task,
        status: TaskStatus.COMPLETED,
      });
      washingSchedulesService.completeWashing.mockRejectedValue(new Error('DB error'));

      // Should not throw - errors are caught and logged
      const result = await service.completeTask(task, mockUserId, {});

      expect(result.status).toBe(TaskStatus.COMPLETED);
    });
  });

  describe('completeTask - Component replacement tasks', () => {
    let componentMovementsService: jest.Mocked<ComponentMovementsService>;

    beforeEach(() => {
      componentMovementsService = (service as any).componentMovementsService;
    });

    it('should complete hopper replacement task without components', async () => {
      const task = createMockTask({
        type_code: TaskType.REPLACE_HOPPER,
        components: [],
      });
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [],
        photosAfter: [],
      });
      taskRepository.save.mockResolvedValue({
        ...task,
        status: TaskStatus.COMPLETED,
      });

      const result = await service.completeTask(task, mockUserId, {});

      expect(result.status).toBe(TaskStatus.COMPLETED);
      expect(componentMovementsService.createMovement).not.toHaveBeenCalled();
    });

    it('should complete grinder replacement task with component movements', async () => {
      const oldComponent = { component_id: 'old-comp-1', role: 'old', notes: 'Worn out' } as any;
      const newComponent = { component_id: 'new-comp-1', role: 'new', notes: 'Fresh' } as any;

      const task = createMockTask({
        type_code: TaskType.REPLACE_GRINDER,
        components: [oldComponent, newComponent],
      });
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [],
        photosAfter: [],
      });
      taskRepository.save.mockResolvedValue({
        ...task,
        status: TaskStatus.COMPLETED,
      });

      const result = await service.completeTask(task, mockUserId, {});

      expect(result.status).toBe(TaskStatus.COMPLETED);
      // Should create removal movement for old component
      expect(componentMovementsService.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          componentId: 'old-comp-1',
          movementType: 'remove',
          relatedMachineId: mockMachineId,
        }),
      );
      // Should create install movement for new component
      expect(componentMovementsService.createMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          componentId: 'new-comp-1',
          movementType: 'install',
          relatedMachineId: mockMachineId,
        }),
      );
      // Should log audit event
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          description: expect.stringContaining('Замена компонентов'),
        }),
      );
    });

    it('should complete brew unit replacement task', async () => {
      const task = createMockTask({
        type_code: TaskType.REPLACE_BREW_UNIT,
        components: [],
      });
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [],
        photosAfter: [],
      });
      taskRepository.save.mockResolvedValue({
        ...task,
        status: TaskStatus.COMPLETED,
      });

      const result = await service.completeTask(task, mockUserId, {});

      expect(result.status).toBe(TaskStatus.COMPLETED);
    });

    it('should complete mixer replacement task', async () => {
      const task = createMockTask({
        type_code: TaskType.REPLACE_MIXER,
        components: [],
      });
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [],
        photosAfter: [],
      });
      taskRepository.save.mockResolvedValue({
        ...task,
        status: TaskStatus.COMPLETED,
      });

      const result = await service.completeTask(task, mockUserId, {});

      expect(result.status).toBe(TaskStatus.COMPLETED);
    });

    it('should handle error when creating component removal movement fails', async () => {
      const oldComponent = { component_id: 'old-comp-1', role: 'old', notes: '' } as any;

      const task = createMockTask({
        type_code: TaskType.REPLACE_HOPPER,
        components: [oldComponent],
      });
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [],
        photosAfter: [],
      });
      taskRepository.save.mockResolvedValue({
        ...task,
        status: TaskStatus.COMPLETED,
      });
      componentMovementsService.createMovement.mockRejectedValue(new Error('Movement failed'));

      // Should not throw - errors are caught and logged
      const result = await service.completeTask(task, mockUserId, {});

      expect(result.status).toBe(TaskStatus.COMPLETED);
    });

    it('should handle error when creating component install movement fails', async () => {
      const newComponent = { component_id: 'new-comp-1', role: 'new', notes: '' } as any;

      const task = createMockTask({
        type_code: TaskType.REPLACE_GRINDER,
        components: [newComponent],
      });
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [],
        photosAfter: [],
      });
      taskRepository.save.mockResolvedValue({
        ...task,
        status: TaskStatus.COMPLETED,
      });
      componentMovementsService.createMovement.mockRejectedValue(new Error('Movement failed'));

      // Should not throw - errors are caught and logged
      const result = await service.completeTask(task, mockUserId, {});

      expect(result.status).toBe(TaskStatus.COMPLETED);
    });
  });

  describe('completeTask - Inspection task', () => {
    it('should complete inspection task and log audit', async () => {
      const task = createMockTask({
        type_code: TaskType.INSPECTION,
        checklist: [
          { item: 'Check doors', completed: true },
          { item: 'Check display', completed: true },
        ],
      });
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [],
        photosAfter: [],
      });
      taskRepository.save.mockResolvedValue({
        ...task,
        status: TaskStatus.COMPLETED,
      });

      const result = await service.completeTask(task, mockUserId, {
        completion_notes: 'All items checked',
      });

      expect(result.status).toBe(TaskStatus.COMPLETED);
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          description: expect.stringContaining('Проведена проверка'),
          metadata: expect.objectContaining({
            task_id: task.id,
            machine_id: mockMachineId,
            inspection_notes: 'All items checked',
            checklist_completed: true,
          }),
        }),
      );
    });

    it('should handle empty checklist array in inspection audit', async () => {
      const task = createMockTask({
        type_code: TaskType.INSPECTION,
        checklist: [], // Empty checklist
      });
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [],
        photosAfter: [],
      });
      taskRepository.save.mockResolvedValue({
        ...task,
        status: TaskStatus.COMPLETED,
      });

      const result = await service.completeTask(task, mockUserId, {});

      expect(result.status).toBe(TaskStatus.COMPLETED);
      // Empty array every() returns true, so checklist_completed should be true
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            checklist_completed: true,
          }),
        }),
      );
    });

    it('should complete inspection task without checklist', async () => {
      const task = createMockTask({
        type_code: TaskType.INSPECTION,
        checklist: null,
      });
      filesService.validateTaskPhotos.mockResolvedValue({
        hasPhotoBefore: true,
        hasPhotoAfter: true,
        photosBefore: [],
        photosAfter: [],
      });
      taskRepository.save.mockResolvedValue({
        ...task,
        status: TaskStatus.COMPLETED,
      });

      const result = await service.completeTask(task, mockUserId, {});

      expect(result.status).toBe(TaskStatus.COMPLETED);
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            checklist_completed: false,
          }),
        }),
      );
    });
  });
});
