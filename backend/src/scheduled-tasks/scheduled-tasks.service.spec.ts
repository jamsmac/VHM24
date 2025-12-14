import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { ScheduledTasksService } from './scheduled-tasks.service';
import { Task, TaskStatus } from '../modules/tasks/entities/task.entity';
import { MachineInventory } from '../modules/inventory/entities/machine-inventory.entity';
import { WarehouseInventory } from '../modules/inventory/entities/warehouse-inventory.entity';
import {
  Notification,
  NotificationStatus,
} from '../modules/notifications/entities/notification.entity';
import { Machine } from '../modules/machines/entities/machine.entity';
import { Nomenclature } from '../modules/nomenclature/entities/nomenclature.entity';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { MachinesService } from '../modules/machines/machines.service';
import { IncidentsService } from '../modules/incidents/incidents.service';
import { InventoryService } from '../modules/inventory/inventory.service';
import { InventoryCalculationService } from '../modules/inventory/services/inventory-calculation.service';
import { ComplaintsService } from '../modules/complaints/complaints.service';
import { InventoryBatchService } from '../modules/warehouse/services/inventory-batch.service';
import { WarehouseService } from '../modules/warehouse/services/warehouse.service';
import { TransactionsService } from '../modules/transactions/transactions.service';
import { CommissionSchedulerService } from '../modules/counterparty/services/commission-scheduler.service';
import { OperatorRatingsService } from '../modules/operator-ratings/operator-ratings.service';
import {
  IncidentType,
  IncidentStatus,
  IncidentPriority,
} from '../modules/incidents/entities/incident.entity';
import { ComplaintStatus } from '../modules/complaints/entities/complaint.entity';

describe('ScheduledTasksService', () => {
  let service: ScheduledTasksService;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let machineInventoryRepository: jest.Mocked<Repository<MachineInventory>>;
  let warehouseInventoryRepository: jest.Mocked<Repository<WarehouseInventory>>;
  let notificationRepository: jest.Mocked<Repository<Notification>>;
  let machineRepository: jest.Mocked<Repository<Machine>>;
  let nomenclatureRepository: jest.Mocked<Repository<Nomenclature>>;
  let notificationsService: jest.Mocked<NotificationsService>;
  let machinesService: jest.Mocked<MachinesService>;
  let incidentsService: jest.Mocked<IncidentsService>;
  let inventoryService: jest.Mocked<InventoryService>;
  let inventoryCalculationService: jest.Mocked<InventoryCalculationService>;
  let complaintsService: jest.Mocked<ComplaintsService>;
  let inventoryBatchService: jest.Mocked<InventoryBatchService>;
  let warehouseService: jest.Mocked<WarehouseService>;
  let transactionsService: jest.Mocked<TransactionsService>;
  let commissionSchedulerService: jest.Mocked<CommissionSchedulerService>;
  let operatorRatingsService: jest.Mocked<OperatorRatingsService>;

  // Store original env
  const originalEnv = process.env;

  // Mock fixtures
  const mockMachine = {
    id: 'machine-uuid',
    machine_number: 'M-001',
    name: 'Test Machine',
    last_ping_at: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    purchase_price: 100000,
    depreciation_years: 5,
    accumulated_depreciation: 0,
    last_depreciation_date: null,
    location: { id: 'loc-uuid', name: 'Test Location' },
  };

  const mockUser = {
    id: 'user-uuid',
    username: 'testuser',
    full_name: 'Test User',
  };

  const mockTask = {
    id: 'task-uuid',
    type_code: 'refill',
    status: TaskStatus.IN_PROGRESS,
    due_date: new Date(Date.now() - 50 * 60 * 60 * 1000), // 50 hours ago (>48h overdue)
    machine_id: 'machine-uuid',
    assigned_to_user_id: 'user-uuid',
    machine: mockMachine,
    assigned_to: mockUser,
  };

  const mockWarehouse = {
    id: 'warehouse-uuid',
    name: 'Main Warehouse',
    code: 'WH-001',
    is_active: true,
  };

  const mockComplaint = {
    id: 'complaint-uuid',
    complaint_type: 'product_quality',
    status: ComplaintStatus.NEW,
    machine_id: 'machine-uuid',
    submitted_at: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago (>2h SLA breach)
    machine: mockMachine,
  };

  beforeEach(async () => {
    // Reset environment
    process.env = { ...originalEnv };
    process.env.ENABLE_SCHEDULED_TASKS = 'true';

    const mockTaskRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockMachineInventoryRepository = {
      createQueryBuilder: jest.fn(),
    };

    const mockWarehouseInventoryRepository = {
      createQueryBuilder: jest.fn(),
    };

    const mockNotificationRepository = {
      createQueryBuilder: jest.fn(),
    };

    const mockMachineRepository = {
      find: jest.fn(),
      save: jest.fn(),
    };

    const mockNomenclatureRepository = {
      find: jest.fn(),
    };

    const mockNotificationsService = {
      create: jest.fn().mockResolvedValue({}),
      retryFailedNotifications: jest.fn().mockResolvedValue(undefined),
    };

    const mockMachinesService = {
      updateConnectivityStatus: jest.fn(),
      getOfflineMachines: jest.fn(),
    };

    const mockIncidentsService = {
      create: jest.fn().mockResolvedValue({}),
      findAll: jest.fn().mockResolvedValue([]),
    };

    const mockInventoryService = {
      expireOldReservations: jest.fn(),
    };

    const mockInventoryCalculationService = {
      calculateBalance: jest.fn(),
    };

    const mockComplaintsService = {
      findAll: jest.fn(),
    };

    const mockInventoryBatchService = {
      getExpiringBatches: jest.fn(),
      writeOffExpiredStock: jest.fn(),
    };

    const mockWarehouseService = {
      findAll: jest.fn(),
    };

    const mockTransactionsService = {
      create: jest.fn().mockResolvedValue({}),
    };

    const mockCommissionSchedulerService = {
      calculateMonthlyCommissions: jest.fn(),
      checkAndUpdateOverduePayments: jest.fn(),
      getOverduePayments: jest.fn(),
    };

    const mockOperatorRatingsService = {
      calculateRatingsForPeriod: jest.fn(),
      ratingRepository: { save: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduledTasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
        {
          provide: getRepositoryToken(MachineInventory),
          useValue: mockMachineInventoryRepository,
        },
        {
          provide: getRepositoryToken(WarehouseInventory),
          useValue: mockWarehouseInventoryRepository,
        },
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
        {
          provide: getRepositoryToken(Machine),
          useValue: mockMachineRepository,
        },
        {
          provide: getRepositoryToken(Nomenclature),
          useValue: mockNomenclatureRepository,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: MachinesService,
          useValue: mockMachinesService,
        },
        {
          provide: IncidentsService,
          useValue: mockIncidentsService,
        },
        {
          provide: InventoryService,
          useValue: mockInventoryService,
        },
        {
          provide: InventoryCalculationService,
          useValue: mockInventoryCalculationService,
        },
        {
          provide: ComplaintsService,
          useValue: mockComplaintsService,
        },
        {
          provide: InventoryBatchService,
          useValue: mockInventoryBatchService,
        },
        {
          provide: WarehouseService,
          useValue: mockWarehouseService,
        },
        {
          provide: TransactionsService,
          useValue: mockTransactionsService,
        },
        {
          provide: CommissionSchedulerService,
          useValue: mockCommissionSchedulerService,
        },
        {
          provide: OperatorRatingsService,
          useValue: mockOperatorRatingsService,
        },
      ],
    }).compile();

    service = module.get<ScheduledTasksService>(ScheduledTasksService);
    taskRepository = module.get(getRepositoryToken(Task));
    machineInventoryRepository = module.get(getRepositoryToken(MachineInventory));
    warehouseInventoryRepository = module.get(getRepositoryToken(WarehouseInventory));
    notificationRepository = module.get(getRepositoryToken(Notification));
    machineRepository = module.get(getRepositoryToken(Machine));
    nomenclatureRepository = module.get(getRepositoryToken(Nomenclature));
    notificationsService = module.get(NotificationsService);
    machinesService = module.get(MachinesService);
    incidentsService = module.get(IncidentsService);
    inventoryService = module.get(InventoryService);
    inventoryCalculationService = module.get(InventoryCalculationService);
    complaintsService = module.get(ComplaintsService);
    inventoryBatchService = module.get(InventoryBatchService);
    warehouseService = module.get(WarehouseService);
    transactionsService = module.get(TransactionsService);
    commissionSchedulerService = module.get(CommissionSchedulerService);
    operatorRatingsService = module.get(OperatorRatingsService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // SCHEDULED TASKS DISABLED TESTS
  // ============================================================================

  describe('ENABLE_SCHEDULED_TASKS check', () => {
    beforeEach(() => {
      process.env.ENABLE_SCHEDULED_TASKS = 'false';
    });

    it('checkOverdueTasks should return early when disabled', async () => {
      await service.checkOverdueTasks();
      expect(taskRepository.find).not.toHaveBeenCalled();
    });

    it('checkLowStockMachines should return early when disabled', async () => {
      await service.checkLowStockMachines();
      expect(machineInventoryRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('checkLowStockWarehouse should return early when disabled', async () => {
      await service.checkLowStockWarehouse();
      expect(warehouseInventoryRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('retryFailedNotifications should return early when disabled', async () => {
      await service.retryFailedNotifications();
      expect(notificationsService.retryFailedNotifications).not.toHaveBeenCalled();
    });

    it('cleanupOldNotifications should return early when disabled', async () => {
      await service.cleanupOldNotifications();
      expect(notificationRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('monitorMachineConnectivity should return early when disabled', async () => {
      await service.monitorMachineConnectivity();
      expect(machinesService.updateConnectivityStatus).not.toHaveBeenCalled();
    });

    it('createOfflineIncidents should return early when disabled', async () => {
      await service.createOfflineIncidents();
      expect(machinesService.getOfflineMachines).not.toHaveBeenCalled();
    });

    it('expireOldReservations should return early when disabled', async () => {
      await service.expireOldReservations();
      expect(inventoryService.expireOldReservations).not.toHaveBeenCalled();
    });

    it('checkComplaintSLA should return early when disabled', async () => {
      await service.checkComplaintSLA();
      expect(complaintsService.findAll).not.toHaveBeenCalled();
    });

    it('checkExpiringStock should return early when disabled', async () => {
      await service.checkExpiringStock();
      expect(warehouseService.findAll).not.toHaveBeenCalled();
    });

    it('writeOffExpiredStock should return early when disabled', async () => {
      await service.writeOffExpiredStock();
      expect(warehouseService.findAll).not.toHaveBeenCalled();
    });

    it('calculateMonthlyDepreciation should return early when disabled', async () => {
      await service.calculateMonthlyDepreciation();
      expect(machineRepository.find).not.toHaveBeenCalled();
    });

    it('calculateMonthlyCommissions should return early when disabled', async () => {
      await service.calculateMonthlyCommissions();
      expect(commissionSchedulerService.calculateMonthlyCommissions).not.toHaveBeenCalled();
    });

    it('checkOverdueCommissions should return early when disabled', async () => {
      await service.checkOverdueCommissions();
      expect(commissionSchedulerService.checkAndUpdateOverduePayments).not.toHaveBeenCalled();
    });

    it('calculateOperatorRatings should return early when disabled', async () => {
      await service.calculateOperatorRatings();
      expect(operatorRatingsService.calculateRatingsForPeriod).not.toHaveBeenCalled();
    });

    it('preCalculateInventoryBalances should return early when disabled', async () => {
      await service.preCalculateInventoryBalances();
      expect(nomenclatureRepository.find).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // CHECK OVERDUE TASKS TESTS
  // ============================================================================

  describe('checkOverdueTasks', () => {
    it('should find overdue tasks with IN_PROGRESS status', async () => {
      taskRepository.find.mockResolvedValue([]);

      await service.checkOverdueTasks();

      expect(taskRepository.find).toHaveBeenCalledWith({
        where: {
          due_date: expect.any(Object),
          status: TaskStatus.IN_PROGRESS,
        },
        relations: ['assigned_to', 'machine'],
      });
    });

    it('should send notification for overdue tasks with assigned user', async () => {
      const overdueTask = {
        ...mockTask,
        due_date: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      };
      taskRepository.find.mockResolvedValue([overdueTask as Task]);
      incidentsService.findAll.mockResolvedValue([]);

      await service.checkOverdueTasks();

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient_id: 'user-uuid',
          title: expect.stringContaining('Задача просрочена'),
        }),
      );
    });

    it('should create incident for tasks overdue more than 48 hours', async () => {
      const veryOverdueTask = {
        ...mockTask,
        due_date: new Date(Date.now() - 50 * 60 * 60 * 1000), // 50 hours ago
      };
      taskRepository.find.mockResolvedValue([veryOverdueTask as Task]);
      incidentsService.findAll.mockResolvedValue([]);

      await service.checkOverdueTasks();

      expect(incidentsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          incident_type: IncidentType.OTHER,
          priority: expect.any(String),
          machine_id: 'machine-uuid',
          title: expect.stringContaining('Просроченная задача'),
          metadata: expect.objectContaining({
            task_id: 'task-uuid',
            auto_created: true,
          }),
        }),
      );
    });

    it('should set HIGH priority for tasks overdue more than 72 hours', async () => {
      const extremelyOverdueTask = {
        ...mockTask,
        due_date: new Date(Date.now() - 80 * 60 * 60 * 1000), // 80 hours ago
      };
      taskRepository.find.mockResolvedValue([extremelyOverdueTask as Task]);
      incidentsService.findAll.mockResolvedValue([]);

      await service.checkOverdueTasks();

      expect(incidentsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: IncidentPriority.HIGH,
        }),
      );
    });

    it('should not create duplicate incidents for same task', async () => {
      const overdueTask = {
        ...mockTask,
        due_date: new Date(Date.now() - 50 * 60 * 60 * 1000),
      };
      const existingIncident = {
        metadata: { task_id: 'task-uuid' },
      };
      taskRepository.find.mockResolvedValue([overdueTask as Task]);
      incidentsService.findAll.mockResolvedValue([existingIncident as any]);

      await service.checkOverdueTasks();

      expect(incidentsService.create).not.toHaveBeenCalled();
    });

    it('should skip tasks without due_date', async () => {
      const taskWithoutDueDate = { ...mockTask, due_date: null };
      taskRepository.find.mockResolvedValue([taskWithoutDueDate as Task]);

      await service.checkOverdueTasks();

      expect(notificationsService.create).not.toHaveBeenCalled();
    });

    it('should handle notification creation failure gracefully', async () => {
      const overdueTask = {
        ...mockTask,
        due_date: new Date(Date.now() - 2 * 60 * 60 * 1000),
      };
      taskRepository.find.mockResolvedValue([overdueTask as Task]);
      notificationsService.create.mockRejectedValue(new Error('Failed to send'));

      // Should not throw
      await expect(service.checkOverdueTasks()).resolves.not.toThrow();
    });

    it('should handle incident creation failure gracefully', async () => {
      const veryOverdueTask = {
        ...mockTask,
        due_date: new Date(Date.now() - 50 * 60 * 60 * 1000), // 50 hours ago
      };
      taskRepository.find.mockResolvedValue([veryOverdueTask as Task]);
      incidentsService.findAll.mockResolvedValue([]);
      incidentsService.create.mockRejectedValue(new Error('Incident creation failed'));

      // Should not throw
      await expect(service.checkOverdueTasks()).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // CHECK LOW STOCK MACHINES TESTS
  // ============================================================================

  describe('checkLowStockMachines', () => {
    it('should query machine inventory with low stock condition', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      machineInventoryRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.checkLowStockMachines();

      expect(machineInventoryRepository.createQueryBuilder).toHaveBeenCalledWith('inventory');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('inventory.machine', 'machine');
      expect(queryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'inventory.nomenclature',
        'nomenclature',
      );
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'inventory.current_quantity <= inventory.min_stock_level',
      );
    });

    it('should log warning for low stock items per machine (line 223)', async () => {
      const lowStockItems = [
        {
          machine_id: 'machine-1',
          current_quantity: 5,
          min_stock_level: 10,
          machine: { machine_number: 'M-001' },
          nomenclature: { name: 'Coffee' },
        },
      ];

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(lowStockItems),
      };
      machineInventoryRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const warnSpy = jest.spyOn(service['logger'], 'warn');

      await service.checkLowStockMachines();

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Low stock in machine M-001'));
    });

    it('should group low stock items by machine', async () => {
      const lowStockItems = [
        {
          machine_id: 'machine-1',
          current_quantity: 5,
          min_stock_level: 10,
          machine: { machine_number: 'M-001' },
          nomenclature: { name: 'Coffee' },
        },
        {
          machine_id: 'machine-1',
          current_quantity: 2,
          min_stock_level: 10,
          machine: { machine_number: 'M-001' },
          nomenclature: { name: 'Sugar' },
        },
        {
          machine_id: 'machine-2',
          current_quantity: 3,
          min_stock_level: 10,
          machine: { machine_number: 'M-002' },
          nomenclature: { name: 'Cups' },
        },
      ];

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(lowStockItems),
      };
      machineInventoryRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.checkLowStockMachines();

      // Verify items were processed (grouped by machine)
      expect(queryBuilder.getMany).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // CHECK LOW STOCK WAREHOUSE TESTS
  // ============================================================================

  describe('checkLowStockWarehouse', () => {
    it('should query warehouse inventory with low stock condition', async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      warehouseInventoryRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.checkLowStockWarehouse();

      expect(warehouseInventoryRepository.createQueryBuilder).toHaveBeenCalledWith('inventory');
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'inventory.current_quantity <= inventory.min_stock_level',
      );
    });

    it('should log warning when low stock items are found', async () => {
      const lowStockItems = [
        {
          current_quantity: 5,
          min_stock_level: 10,
          nomenclature: { name: 'Coffee' },
        },
        {
          current_quantity: 2,
          min_stock_level: 8,
          nomenclature: { name: 'Sugar' },
        },
      ];

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(lowStockItems),
      };
      warehouseInventoryRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const warnSpy = jest.spyOn(service['logger'], 'warn');

      await service.checkLowStockWarehouse();

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Low stock in warehouse'));
    });
  });

  // ============================================================================
  // RETRY FAILED NOTIFICATIONS TESTS
  // ============================================================================

  describe('retryFailedNotifications', () => {
    it('should call notificationsService.retryFailedNotifications', async () => {
      await service.retryFailedNotifications();

      expect(notificationsService.retryFailedNotifications).toHaveBeenCalled();
    });

    it('should handle retry failure gracefully', async () => {
      notificationsService.retryFailedNotifications.mockRejectedValue(new Error('Retry failed'));

      await expect(service.retryFailedNotifications()).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // CLEANUP OLD NOTIFICATIONS TESTS
  // ============================================================================

  describe('cleanupOldNotifications', () => {
    it('should soft delete read notifications older than 30 days', async () => {
      const queryBuilder = {
        softDelete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 10 }),
      };
      notificationRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.cleanupOldNotifications();

      expect(queryBuilder.softDelete).toHaveBeenCalled();
      expect(queryBuilder.where).toHaveBeenCalledWith('status = :status', {
        status: NotificationStatus.READ,
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('read_at < :date', {
        date: expect.any(Date),
      });
    });
  });

  // ============================================================================
  // MONITOR MACHINE CONNECTIVITY TESTS
  // ============================================================================

  describe('monitorMachineConnectivity', () => {
    it('should update connectivity status for all machines', async () => {
      machinesService.updateConnectivityStatus.mockResolvedValue({
        total: 100,
        online: 90,
        offline: 10,
        updated: 5,
      });

      await service.monitorMachineConnectivity();

      expect(machinesService.updateConnectivityStatus).toHaveBeenCalled();
    });

    it('should handle connectivity update failure gracefully', async () => {
      machinesService.updateConnectivityStatus.mockRejectedValue(new Error('Connection failed'));

      await expect(service.monitorMachineConnectivity()).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // CREATE OFFLINE INCIDENTS TESTS
  // ============================================================================

  describe('createOfflineIncidents', () => {
    it('should get machines offline for more than 30 minutes', async () => {
      machinesService.getOfflineMachines.mockResolvedValue([]);

      await service.createOfflineIncidents();

      expect(machinesService.getOfflineMachines).toHaveBeenCalledWith(30);
    });

    it('should create incident for offline machines without existing open incident', async () => {
      const offlineMachine = {
        id: 'machine-uuid',
        machine_number: 'M-001',
        last_ping_at: new Date(Date.now() - 60 * 60 * 1000),
      };
      machinesService.getOfflineMachines.mockResolvedValue([offlineMachine as any]);
      incidentsService.findAll.mockResolvedValue([]);

      await service.createOfflineIncidents();

      expect(incidentsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          machine_id: 'machine-uuid',
          incident_type: IncidentType.TECHNICAL_FAILURE,
          priority: IncidentPriority.HIGH,
          title: 'Аппарат недоступен',
        }),
      );
    });

    it('should not create duplicate incidents for already reported offline machines', async () => {
      const offlineMachine = {
        id: 'machine-uuid',
        machine_number: 'M-001',
        last_ping_at: new Date(Date.now() - 60 * 60 * 1000),
      };
      const existingIncident = {
        incident_type: IncidentType.TECHNICAL_FAILURE,
        status: IncidentStatus.OPEN,
      };
      machinesService.getOfflineMachines.mockResolvedValue([offlineMachine as any]);
      incidentsService.findAll.mockResolvedValue([existingIncident as any]);

      await service.createOfflineIncidents();

      expect(incidentsService.create).not.toHaveBeenCalled();
    });

    it('should create incident if existing incident is resolved', async () => {
      const offlineMachine = {
        id: 'machine-uuid',
        machine_number: 'M-001',
        last_ping_at: new Date(Date.now() - 60 * 60 * 1000),
      };
      const resolvedIncident = {
        incident_type: IncidentType.TECHNICAL_FAILURE,
        status: IncidentStatus.RESOLVED,
      };
      machinesService.getOfflineMachines.mockResolvedValue([offlineMachine as any]);
      incidentsService.findAll.mockResolvedValue([resolvedIncident as any]);

      await service.createOfflineIncidents();

      expect(incidentsService.create).toHaveBeenCalled();
    });

    it('should handle errors in createOfflineIncidents gracefully', async () => {
      machinesService.getOfflineMachines.mockRejectedValue(new Error('Database connection failed'));

      // Should not throw
      await expect(service.createOfflineIncidents()).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // EXPIRE OLD RESERVATIONS TESTS
  // ============================================================================

  describe('expireOldReservations', () => {
    it('should call inventoryService.expireOldReservations', async () => {
      inventoryService.expireOldReservations.mockResolvedValue(5);

      await service.expireOldReservations();

      expect(inventoryService.expireOldReservations).toHaveBeenCalled();
    });

    it('should handle expiration failure gracefully', async () => {
      inventoryService.expireOldReservations.mockRejectedValue(new Error('Expiration failed'));

      await expect(service.expireOldReservations()).resolves.not.toThrow();
    });

    it('should log debug message when no expired reservations found', async () => {
      inventoryService.expireOldReservations.mockResolvedValue(0);

      const debugSpy = jest.spyOn(service['logger'], 'debug');

      await service.expireOldReservations();

      expect(debugSpy).toHaveBeenCalledWith('No expired reservations found');
    });
  });

  // ============================================================================
  // CHECK COMPLAINT SLA TESTS
  // ============================================================================

  describe('checkComplaintSLA', () => {
    it('should get all NEW complaints', async () => {
      complaintsService.findAll.mockResolvedValue([]);

      await service.checkComplaintSLA();

      expect(complaintsService.findAll).toHaveBeenCalledWith(ComplaintStatus.NEW);
    });

    it('should send notification for complaints breaching SLA (>2 hours)', async () => {
      const slaBreachComplaint = {
        ...mockComplaint,
        submitted_at: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      };
      complaintsService.findAll.mockResolvedValue([slaBreachComplaint as any]);

      await service.checkComplaintSLA();

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('SLA нарушен'),
          data: expect.objectContaining({
            complaint_id: 'complaint-uuid',
            sla_hours: 2,
          }),
        }),
      );
    });

    it('should not send notification for complaints within SLA', async () => {
      const withinSlaComplaint = {
        ...mockComplaint,
        submitted_at: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      };
      complaintsService.findAll.mockResolvedValue([withinSlaComplaint as any]);

      await service.checkComplaintSLA();

      expect(notificationsService.create).not.toHaveBeenCalled();
    });

    it('should log error when notification creation fails (line 477)', async () => {
      const slaBreachComplaint = {
        ...mockComplaint,
        submitted_at: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      };
      complaintsService.findAll.mockResolvedValue([slaBreachComplaint as any]);
      notificationsService.create.mockRejectedValue(new Error('Notification failed'));

      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.checkComplaintSLA();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send SLA violation notification'),
        expect.any(String),
      );
    });

    it('should log top-level error when checkComplaintSLA fails (line 491)', async () => {
      complaintsService.findAll.mockRejectedValue(new Error('Database connection failed'));

      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.checkComplaintSLA();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error checking complaint SLA'),
        expect.any(String),
      );
    });
  });

  // ============================================================================
  // CHECK EXPIRING STOCK TESTS
  // ============================================================================

  describe('checkExpiringStock', () => {
    it('should check all active warehouses for expiring batches', async () => {
      warehouseService.findAll.mockResolvedValue([mockWarehouse as any]);
      inventoryBatchService.getExpiringBatches.mockResolvedValue([]);

      await service.checkExpiringStock();

      expect(warehouseService.findAll).toHaveBeenCalled();
      expect(inventoryBatchService.getExpiringBatches).toHaveBeenCalledWith(
        'warehouse-uuid',
        30, // 30 days threshold
      );
    });

    it('should send notification when expiring batches found', async () => {
      const expiringBatch = {
        id: 'batch-uuid',
        batch_number: 'BATCH-001',
        expiry_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now (urgent)
        current_quantity: 100,
      };
      warehouseService.findAll.mockResolvedValue([mockWarehouse as any]);
      inventoryBatchService.getExpiringBatches.mockResolvedValue([expiringBatch as any]);

      await service.checkExpiringStock();

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Истекает срок годности'),
          data: expect.objectContaining({
            warehouse_id: 'warehouse-uuid',
          }),
        }),
      );
    });

    it('should not send notification when no expiring batches', async () => {
      warehouseService.findAll.mockResolvedValue([mockWarehouse as any]);
      inventoryBatchService.getExpiringBatches.mockResolvedValue([]);

      await service.checkExpiringStock();

      expect(notificationsService.create).not.toHaveBeenCalled();
    });

    it('should log error when checking expiring stock for warehouse fails (line 573)', async () => {
      warehouseService.findAll.mockResolvedValue([mockWarehouse as any]);
      inventoryBatchService.getExpiringBatches.mockRejectedValue(
        new Error('Failed to get expiring batches'),
      );

      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.checkExpiringStock();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to check expiring stock for warehouse'),
        expect.any(String),
      );
    });

    it('should log top-level error when checkExpiringStock fails (line 588)', async () => {
      warehouseService.findAll.mockRejectedValue(new Error('Database connection failed'));

      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.checkExpiringStock();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error checking expiring stock'),
        expect.any(String),
      );
    });
  });

  // ============================================================================
  // WRITE OFF EXPIRED STOCK TESTS
  // ============================================================================

  describe('writeOffExpiredStock', () => {
    it('should call writeOffExpiredStock for each warehouse', async () => {
      warehouseService.findAll.mockResolvedValue([mockWarehouse as any]);
      inventoryBatchService.writeOffExpiredStock.mockResolvedValue({
        batches_processed: 0,
        total_quantity_written_off: 0,
        total_value_written_off: 0,
      });

      await service.writeOffExpiredStock();

      expect(inventoryBatchService.writeOffExpiredStock).toHaveBeenCalledWith('warehouse-uuid');
    });

    it('should send notification when batches are written off', async () => {
      warehouseService.findAll.mockResolvedValue([mockWarehouse as any]);
      inventoryBatchService.writeOffExpiredStock.mockResolvedValue({
        batches_processed: 5,
        total_quantity_written_off: 100,
        total_value_written_off: 5000,
      });

      await service.writeOffExpiredStock();

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Автоматическое списание'),
          data: expect.objectContaining({
            batches_processed: 5,
            quantity_written_off: 100,
            value_written_off: 5000,
          }),
        }),
      );
    });

    it('should log error when writing off expired stock for warehouse fails (line 650)', async () => {
      warehouseService.findAll.mockResolvedValue([mockWarehouse as any]);
      inventoryBatchService.writeOffExpiredStock.mockRejectedValue(
        new Error('Write-off operation failed'),
      );

      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.writeOffExpiredStock();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to write off expired stock for warehouse'),
        expect.any(String),
      );
    });

    it('should log top-level error when writeOffExpiredStock fails (line 663)', async () => {
      warehouseService.findAll.mockRejectedValue(new Error('Database connection failed'));

      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.writeOffExpiredStock();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error writing off expired stock'),
        expect.any(String),
      );
    });
  });

  // ============================================================================
  // CALCULATE MONTHLY DEPRECIATION TESTS
  // ============================================================================

  describe('calculateMonthlyDepreciation', () => {
    it('should find machines with purchase_price and depreciation_years', async () => {
      machineRepository.find.mockResolvedValue([]);

      await service.calculateMonthlyDepreciation();

      expect(machineRepository.find).toHaveBeenCalledWith({
        where: {
          purchase_price: Not(IsNull()),
          depreciation_years: Not(IsNull()),
        },
        relations: ['location'],
      });
    });

    it('should calculate monthly depreciation correctly', async () => {
      const machineWithDepreciation = {
        id: 'machine-uuid',
        machine_number: 'M-001',
        purchase_price: 120000,
        depreciation_years: 5,
        accumulated_depreciation: 0,
        last_depreciation_date: null,
      };
      machineRepository.find.mockResolvedValue([machineWithDepreciation as Machine]);
      machineRepository.save.mockImplementation((machine) => Promise.resolve(machine as Machine));

      await service.calculateMonthlyDepreciation();

      // Monthly depreciation = 120000 / (5 * 12) = 2000
      expect(transactionsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 2000,
          machine_id: 'machine-uuid',
          metadata: expect.objectContaining({
            monthly_amount: 2000,
            auto_generated: true,
          }),
        }),
      );
    });

    it('should skip already depreciated machines this month', async () => {
      const currentDate = new Date();
      const machineDepreciatedThisMonth = {
        id: 'machine-uuid',
        machine_number: 'M-001',
        purchase_price: 120000,
        depreciation_years: 5,
        accumulated_depreciation: 2000,
        last_depreciation_date: currentDate,
      };
      machineRepository.find.mockResolvedValue([machineDepreciatedThisMonth as Machine]);

      await service.calculateMonthlyDepreciation();

      expect(transactionsService.create).not.toHaveBeenCalled();
    });

    it('should skip fully depreciated machines', async () => {
      const fullyDepreciatedMachine = {
        id: 'machine-uuid',
        machine_number: 'M-001',
        purchase_price: 120000,
        depreciation_years: 5,
        accumulated_depreciation: 120000, // Fully depreciated
        last_depreciation_date: null,
      };
      machineRepository.find.mockResolvedValue([fullyDepreciatedMachine as Machine]);

      await service.calculateMonthlyDepreciation();

      expect(transactionsService.create).not.toHaveBeenCalled();
    });

    it('should not exceed purchase price in final depreciation', async () => {
      const almostDepreciatedMachine = {
        id: 'machine-uuid',
        machine_number: 'M-001',
        purchase_price: 120000,
        depreciation_years: 5,
        accumulated_depreciation: 119000, // Only 1000 remaining
        last_depreciation_date: null,
      };
      machineRepository.find.mockResolvedValue([almostDepreciatedMachine as Machine]);
      machineRepository.save.mockImplementation((machine) => Promise.resolve(machine as Machine));

      await service.calculateMonthlyDepreciation();

      // Should only depreciate 1000 (not 2000)
      expect(transactionsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 1000,
        }),
      );
    });

    it('should log error when depreciation calculation for machine fails (line 764)', async () => {
      const machineWithDepreciation = {
        id: 'machine-uuid',
        machine_number: 'M-001',
        purchase_price: 120000,
        depreciation_years: 5,
        accumulated_depreciation: 0,
        last_depreciation_date: null,
      };
      machineRepository.find.mockResolvedValue([machineWithDepreciation as Machine]);
      transactionsService.create.mockRejectedValue(new Error('Transaction creation failed'));

      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.calculateMonthlyDepreciation();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to calculate depreciation for machine'),
        expect.any(String),
      );
    });

    it('should log top-level error when calculateMonthlyDepreciation fails (line 801)', async () => {
      machineRepository.find.mockRejectedValue(new Error('Database connection failed'));

      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.calculateMonthlyDepreciation();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error calculating monthly depreciation'),
        expect.any(String),
      );
    });
  });

  // ============================================================================
  // CALCULATE MONTHLY COMMISSIONS TESTS
  // ============================================================================

  describe('calculateMonthlyCommissions', () => {
    it('should call commissionSchedulerService.calculateMonthlyCommissions', async () => {
      commissionSchedulerService.calculateMonthlyCommissions.mockResolvedValue(5);

      await service.calculateMonthlyCommissions();

      expect(commissionSchedulerService.calculateMonthlyCommissions).toHaveBeenCalled();
    });

    it('should send notification when commissions are calculated', async () => {
      commissionSchedulerService.calculateMonthlyCommissions.mockResolvedValue(5);

      await service.calculateMonthlyCommissions();

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Комиссии'),
          data: expect.objectContaining({
            calculated_count: 5,
          }),
        }),
      );
    });

    it('should not send notification when no commissions calculated', async () => {
      commissionSchedulerService.calculateMonthlyCommissions.mockResolvedValue(0);

      await service.calculateMonthlyCommissions();

      expect(notificationsService.create).not.toHaveBeenCalled();
    });

    it('should log error when calculateMonthlyCommissions fails (line 845)', async () => {
      commissionSchedulerService.calculateMonthlyCommissions.mockRejectedValue(
        new Error('Commission calculation failed'),
      );

      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.calculateMonthlyCommissions();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error calculating monthly commissions'),
        expect.any(String),
      );
    });
  });

  // ============================================================================
  // CHECK OVERDUE COMMISSIONS TESTS
  // ============================================================================

  describe('checkOverdueCommissions', () => {
    it('should call checkAndUpdateOverduePayments', async () => {
      commissionSchedulerService.checkAndUpdateOverduePayments.mockResolvedValue(0);

      await service.checkOverdueCommissions();

      expect(commissionSchedulerService.checkAndUpdateOverduePayments).toHaveBeenCalled();
    });

    it('should send notification when overdue payments found', async () => {
      const overduePayment = {
        commission_amount: 5000,
        contract: { contract_number: 'CTR-001' },
        getDaysUntilDue: jest.fn().mockReturnValue(-5),
      };
      commissionSchedulerService.checkAndUpdateOverduePayments.mockResolvedValue(1);
      commissionSchedulerService.getOverduePayments.mockResolvedValue([overduePayment as any]);

      await service.checkOverdueCommissions();

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Просроченные комиссионные платежи'),
        }),
      );
    });

    it('should log error when checkOverdueCommissions fails (line 898)', async () => {
      commissionSchedulerService.checkAndUpdateOverduePayments.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.checkOverdueCommissions();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error checking overdue commissions'),
        expect.any(String),
      );
    });
  });

  // ============================================================================
  // CALCULATE OPERATOR RATINGS TESTS
  // ============================================================================

  describe('calculateOperatorRatings', () => {
    it('should calculate ratings for previous day', async () => {
      operatorRatingsService.calculateRatingsForPeriod.mockResolvedValue([]);

      await service.calculateOperatorRatings();

      expect(operatorRatingsService.calculateRatingsForPeriod).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date),
      );
    });

    it('should send notification to each rated operator', async () => {
      const rating = {
        id: 'rating-uuid',
        operator_id: 'operator-uuid',
        overall_score: 85,
        rating_grade: 'good',
        rank: 1,
        timeliness_score: 80,
        photo_quality_score: 90,
        data_accuracy_score: 85,
        customer_feedback_score: 80,
        discipline_score: 90,
        notification_sent_at: null,
      };
      operatorRatingsService.calculateRatingsForPeriod.mockResolvedValue([rating as any]);
      (operatorRatingsService as any).ratingRepository = { save: jest.fn() };

      await service.calculateOperatorRatings();

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient_id: 'operator-uuid',
          title: expect.stringContaining('Ваш рейтинг'),
        }),
      );
    });

    it('should send summary to admin when ratings calculated', async () => {
      const ratings = [
        {
          id: 'rating-1',
          operator_id: 'op-1',
          overall_score: 95,
          rating_grade: 'excellent',
          rank: 1,
          timeliness_score: 95,
          photo_quality_score: 95,
          data_accuracy_score: 95,
          customer_feedback_score: 95,
          discipline_score: 95,
          notification_sent_at: null,
        },
        {
          id: 'rating-2',
          operator_id: 'op-2',
          overall_score: 80,
          rating_grade: 'good',
          rank: 2,
          timeliness_score: 80,
          photo_quality_score: 80,
          data_accuracy_score: 80,
          customer_feedback_score: 80,
          discipline_score: 80,
          notification_sent_at: null,
        },
      ];
      operatorRatingsService.calculateRatingsForPeriod.mockResolvedValue(ratings as any);
      (operatorRatingsService as any).ratingRepository = { save: jest.fn() };

      await service.calculateOperatorRatings();

      // Should have individual notifications + admin summary
      expect(notificationsService.create).toHaveBeenCalledTimes(3); // 2 operators + 1 admin
    });

    it('should handle all rating grades (average, poor, very_poor)', async () => {
      const ratings = [
        {
          id: 'rating-average',
          operator_id: 'op-average',
          overall_score: 60,
          rating_grade: 'average',
          rank: 1,
          timeliness_score: 60,
          photo_quality_score: 60,
          data_accuracy_score: 60,
          customer_feedback_score: 60,
          discipline_score: 60,
          notification_sent_at: null,
        },
        {
          id: 'rating-poor',
          operator_id: 'op-poor',
          overall_score: 40,
          rating_grade: 'poor',
          rank: 2,
          timeliness_score: 40,
          photo_quality_score: 40,
          data_accuracy_score: 40,
          customer_feedback_score: 40,
          discipline_score: 40,
          notification_sent_at: null,
        },
        {
          id: 'rating-very-poor',
          operator_id: 'op-very-poor',
          overall_score: 20,
          rating_grade: 'very_poor',
          rank: 3,
          timeliness_score: 20,
          photo_quality_score: 20,
          data_accuracy_score: 20,
          customer_feedback_score: 20,
          discipline_score: 20,
          notification_sent_at: null,
        },
      ];
      operatorRatingsService.calculateRatingsForPeriod.mockResolvedValue(ratings as any);
      (operatorRatingsService as any).ratingRepository = { save: jest.fn() };

      await service.calculateOperatorRatings();

      // Should have individual notifications for all 3 operators + admin summary
      expect(notificationsService.create).toHaveBeenCalledTimes(4);
    });

    it('should handle notification failure for operator gracefully', async () => {
      const rating = {
        id: 'rating-fail',
        operator_id: 'op-fail',
        overall_score: 75,
        rating_grade: 'good',
        rank: 1,
        timeliness_score: 75,
        photo_quality_score: 75,
        data_accuracy_score: 75,
        customer_feedback_score: 75,
        discipline_score: 75,
        notification_sent_at: null,
      };
      operatorRatingsService.calculateRatingsForPeriod.mockResolvedValue([rating as any]);
      (operatorRatingsService as any).ratingRepository = { save: jest.fn() };
      notificationsService.create.mockRejectedValueOnce(new Error('Notification failed'));

      // Should not throw
      await expect(service.calculateOperatorRatings()).resolves.not.toThrow();
    });

    it('should log error when calculateOperatorRatings fails (line 1026)', async () => {
      operatorRatingsService.calculateRatingsForPeriod.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.calculateOperatorRatings();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error calculating operator ratings'),
        expect.any(String),
      );
    });
  });

  // ============================================================================
  // PRE-CALCULATE INVENTORY BALANCES TESTS
  // ============================================================================

  describe('preCalculateInventoryBalances', () => {
    it('should calculate balances for all active nomenclature', async () => {
      nomenclatureRepository.find.mockResolvedValue([
        { id: 'nom-uuid', is_active: true, name: 'Coffee' },
      ] as any);
      warehouseService.findAll.mockResolvedValue([mockWarehouse as any]);
      machineRepository.find.mockResolvedValue([mockMachine as Machine]);

      await service.preCalculateInventoryBalances();

      expect(nomenclatureRepository.find).toHaveBeenCalledWith({
        where: { is_active: true },
      });
      expect(inventoryCalculationService.calculateBalance).toHaveBeenCalled();
    });

    it('should calculate for both warehouse and machine levels', async () => {
      nomenclatureRepository.find.mockResolvedValue([
        { id: 'nom-uuid', is_active: true, name: 'Coffee' },
      ] as any);
      warehouseService.findAll.mockResolvedValue([mockWarehouse as any]);
      machineRepository.find.mockResolvedValue([mockMachine as Machine]);

      await service.preCalculateInventoryBalances();

      // Should be called for warehouse level and machine level
      expect(inventoryCalculationService.calculateBalance).toHaveBeenCalledTimes(2);
    });

    it('should send notification when calculations complete', async () => {
      nomenclatureRepository.find.mockResolvedValue([
        { id: 'nom-uuid', is_active: true, name: 'Coffee' },
      ] as any);
      warehouseService.findAll.mockResolvedValue([mockWarehouse as any]);
      machineRepository.find.mockResolvedValue([mockMachine as Machine]);

      await service.preCalculateInventoryBalances();

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Предрасчёт остатков'),
        }),
      );
    });

    it('should handle calculation errors gracefully', async () => {
      nomenclatureRepository.find.mockResolvedValue([
        { id: 'nom-uuid', is_active: true, name: 'Coffee' },
      ] as any);
      warehouseService.findAll.mockResolvedValue([mockWarehouse as any]);
      machineRepository.find.mockResolvedValue([mockMachine as Machine]);
      inventoryCalculationService.calculateBalance.mockRejectedValue(
        new Error('Calculation failed'),
      );

      // Should not throw
      await expect(service.preCalculateInventoryBalances()).resolves.not.toThrow();
    });

    it('should log error when preCalculateInventoryBalances fails (line 1137)', async () => {
      nomenclatureRepository.find.mockRejectedValue(new Error('Database connection failed'));

      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.preCalculateInventoryBalances();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error pre-calculating inventory balances'),
        expect.any(String),
      );
    });
  });
});
