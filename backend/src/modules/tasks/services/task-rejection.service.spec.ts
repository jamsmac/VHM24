import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TaskRejectionService } from './task-rejection.service';
import { Task, TaskStatus, TaskType } from '../entities/task.entity';
import { TaskComment } from '../entities/task-comment.entity';
import { MachinesService } from '../../machines/machines.service';
import { InventoryService } from '../../inventory/inventory.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { TransactionsService } from '../../transactions/transactions.service';
import { AuditLogService } from '../../security/services/audit-log.service';
import { UsersService } from '../../users/users.service';
import { UserRole } from '../../users/entities/user.entity';

describe('TaskRejectionService', () => {
  let service: TaskRejectionService;
  let _taskRepository: jest.Mocked<Repository<Task>>;
  let taskCommentRepository: jest.Mocked<Repository<TaskComment>>;
  let machinesService: jest.Mocked<MachinesService>;
  let inventoryService: jest.Mocked<InventoryService>;
  let notificationsService: jest.Mocked<NotificationsService>;
  let transactionsService: jest.Mocked<TransactionsService>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let usersService: jest.Mocked<UsersService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockAdminId = 'admin-123';
  const mockOperatorId = 'operator-456';
  const mockTaskId = 'task-789';
  const mockMachineId = 'machine-012';

  const createMockTask = (overrides: Partial<Task> = {}): Task => ({
    id: mockTaskId,
    machine_id: mockMachineId,
    type_code: TaskType.REFILL,
    status: TaskStatus.COMPLETED,
    assigned_to_user_id: mockOperatorId,
    created_by_user_id: 'creator-user',
    items: [],
    checklist: [],
    machine: {
      id: mockMachineId,
      machine_number: 'M-001',
      current_cash_amount: 0,
    } as any,
    ...overrides,
  } as Task);

  beforeEach(async () => {
    const mockTransactionManager = {
      save: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskRejectionService,
        {
          provide: getRepositoryToken(Task),
          useValue: {
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TaskComment),
          useValue: {
            create: jest.fn().mockReturnValue({}),
            save: jest.fn(),
          },
        },
        {
          provide: MachinesService,
          useValue: {
            findOne: jest.fn().mockResolvedValue({ current_cash_amount: 0 }),
            updateStats: jest.fn(),
          },
        },
        {
          provide: InventoryService,
          useValue: {
            transferMachineToOperator: jest.fn(),
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
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn((callback) => callback(mockTransactionManager)),
          },
        },
      ],
    }).compile();

    service = module.get<TaskRejectionService>(TaskRejectionService);
    _taskRepository = module.get(getRepositoryToken(Task));
    taskCommentRepository = module.get(getRepositoryToken(TaskComment));
    machinesService = module.get(MachinesService);
    inventoryService = module.get(InventoryService);
    notificationsService = module.get(NotificationsService);
    transactionsService = module.get(TransactionsService);
    auditLogService = module.get(AuditLogService);
    usersService = module.get(UsersService);
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('rejectTask', () => {
    it('should throw BadRequestException if task is not completed', async () => {
      const task = createMockTask({ status: TaskStatus.IN_PROGRESS });
      usersService.findOne.mockResolvedValue({ role: UserRole.ADMIN } as any);

      await expect(
        service.rejectTask(task, mockAdminId, 'Test reason'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if user is not admin', async () => {
      const task = createMockTask();
      usersService.findOne.mockResolvedValue({ role: UserRole.OPERATOR } as any);

      await expect(
        service.rejectTask(task, mockOperatorId, 'Test reason'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow SUPER_ADMIN to reject tasks', async () => {
      const task = createMockTask();
      usersService.findOne.mockResolvedValue({ role: UserRole.SUPER_ADMIN } as any);

      await service.rejectTask(task, mockAdminId, 'Test reason');

      expect(task.status).toBe(TaskStatus.REJECTED);
    });

    it('should throw BadRequestException if task was already rejected', async () => {
      const task = createMockTask({
        rejected_at: new Date(),
        rejected_by_user_id: 'previous-admin',
      });
      usersService.findOne.mockResolvedValue({ role: UserRole.ADMIN } as any);

      await expect(
        service.rejectTask(task, mockAdminId, 'Test reason'),
      ).rejects.toThrow('уже была отклонена');
    });

    it('should throw BadRequestException if refill task has no assigned operator', async () => {
      const task = createMockTask({
        type_code: TaskType.REFILL,
        assigned_to_user_id: null,
      });
      usersService.findOne.mockResolvedValue({ role: UserRole.ADMIN } as any);

      await expect(
        service.rejectTask(task, mockAdminId, 'Test reason'),
      ).rejects.toThrow('назначена оператору');
    });

    it('should set rejection fields on task', async () => {
      const task = createMockTask();
      usersService.findOne.mockResolvedValue({ role: UserRole.ADMIN } as any);

      await service.rejectTask(task, mockAdminId, 'Invalid photos');

      expect(task.status).toBe(TaskStatus.REJECTED);
      expect(task.rejected_by_user_id).toBe(mockAdminId);
      expect(task.rejected_at).toBeDefined();
      expect(task.rejection_reason).toBe('Invalid photos');
    });

    it('should create a rejection comment', async () => {
      const task = createMockTask();
      usersService.findOne.mockResolvedValue({ role: UserRole.ADMIN } as any);

      await service.rejectTask(task, mockAdminId, 'Test reason');

      expect(taskCommentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          task_id: task.id,
          user_id: mockAdminId,
          comment: expect.stringContaining('ОТКЛОНЕНА'),
        }),
      );
    });

    it('should log audit event', async () => {
      const task = createMockTask();
      usersService.findOne.mockResolvedValue({ role: UserRole.ADMIN } as any);

      await service.rejectTask(task, mockAdminId, 'Test reason');

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockAdminId,
          description: expect.stringContaining('отклонена'),
        }),
      );
    });

    it('should send notification to operator', async () => {
      const task = createMockTask();
      usersService.findOne.mockResolvedValue({ role: UserRole.ADMIN } as any);

      await service.rejectTask(task, mockAdminId, 'Test reason');

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient_id: mockOperatorId,
          title: expect.stringContaining('отклонена'),
        }),
      );
    });

    it('should emit task.rejected event', async () => {
      const task = createMockTask();
      usersService.findOne.mockResolvedValue({ role: UserRole.ADMIN } as any);

      await service.rejectTask(task, mockAdminId, 'Test reason');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'task.rejected',
        expect.objectContaining({ task }),
      );
    });
  });

  describe('rejectTask - Refill task rollback', () => {
    it('should rollback inventory for refill task', async () => {
      const taskItem = {
        id: 'item-1',
        nomenclature_id: 'nom-1',
        planned_quantity: 10,
        actual_quantity: 8,
        unit_of_measure_code: 'pcs',
      };

      const task = createMockTask({
        type_code: TaskType.REFILL,
        items: [taskItem] as any,
      });

      usersService.findOne.mockResolvedValue({ role: UserRole.ADMIN } as any);

      await service.rejectTask(task, mockAdminId, 'Test reason');

      expect(inventoryService.transferMachineToOperator).toHaveBeenCalledWith(
        expect.objectContaining({
          operator_id: mockOperatorId,
          machine_id: mockMachineId,
          nomenclature_id: 'nom-1',
          quantity: 8,
        }),
        mockAdminId,
      );
    });

    it('should use planned_quantity if actual_quantity is missing', async () => {
      const taskItem = {
        id: 'item-1',
        nomenclature_id: 'nom-1',
        planned_quantity: 10,
        actual_quantity: null,
        unit_of_measure_code: 'pcs',
      };

      const task = createMockTask({
        type_code: TaskType.REFILL,
        items: [taskItem] as any,
      });

      usersService.findOne.mockResolvedValue({ role: UserRole.ADMIN } as any);

      await service.rejectTask(task, mockAdminId, 'Test reason');

      expect(inventoryService.transferMachineToOperator).toHaveBeenCalledWith(
        expect.objectContaining({
          quantity: 10,
        }),
        mockAdminId,
      );
    });

    it('should skip inventory rollback if no items', async () => {
      const task = createMockTask({
        type_code: TaskType.REFILL,
        items: [],
      });

      usersService.findOne.mockResolvedValue({ role: UserRole.ADMIN } as any);

      await service.rejectTask(task, mockAdminId, 'Test reason');

      expect(inventoryService.transferMachineToOperator).not.toHaveBeenCalled();
    });
  });

  describe('rejectTask - Collection task rollback', () => {
    it('should create refund transaction for collection task', async () => {
      const task = createMockTask({
        type_code: TaskType.COLLECTION,
        actual_cash_amount: 1000,
      });

      usersService.findOne.mockResolvedValue({ role: UserRole.ADMIN } as any);

      await service.rejectTask(task, mockAdminId, 'Test reason');

      expect(transactionsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          transaction_type: 'refund',
          machine_id: mockMachineId,
          amount: 1000,
        }),
        mockAdminId,
      );
    });

    it('should restore cash amount in machine', async () => {
      const task = createMockTask({
        type_code: TaskType.COLLECTION,
        actual_cash_amount: 1000,
      });

      machinesService.findOne.mockResolvedValue({
        current_cash_amount: 500,
      } as any);
      usersService.findOne.mockResolvedValue({ role: UserRole.ADMIN } as any);

      await service.rejectTask(task, mockAdminId, 'Test reason');

      expect(machinesService.updateStats).toHaveBeenCalledWith(
        mockMachineId,
        expect.objectContaining({
          current_cash_amount: 1500,
        }),
      );
    });

    it('should skip financial rollback if no cash amount', async () => {
      const task = createMockTask({
        type_code: TaskType.COLLECTION,
        actual_cash_amount: null,
      });

      usersService.findOne.mockResolvedValue({ role: UserRole.ADMIN } as any);

      await service.rejectTask(task, mockAdminId, 'Test reason');

      expect(transactionsService.create).not.toHaveBeenCalled();
    });
  });

  describe('rejectTask - Other task types', () => {
    it('should reject cleaning task without inventory rollback', async () => {
      const task = createMockTask({ type_code: TaskType.CLEANING });
      usersService.findOne.mockResolvedValue({ role: UserRole.ADMIN } as any);

      await service.rejectTask(task, mockAdminId, 'Test reason');

      expect(task.status).toBe(TaskStatus.REJECTED);
      expect(inventoryService.transferMachineToOperator).not.toHaveBeenCalled();
      expect(transactionsService.create).not.toHaveBeenCalled();
    });

    it('should reject inspection task without rollback', async () => {
      const task = createMockTask({ type_code: TaskType.INSPECTION });
      usersService.findOne.mockResolvedValue({ role: UserRole.ADMIN } as any);

      await service.rejectTask(task, mockAdminId, 'Test reason');

      expect(task.status).toBe(TaskStatus.REJECTED);
      expect(inventoryService.transferMachineToOperator).not.toHaveBeenCalled();
    });
  });
});
