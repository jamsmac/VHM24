import { Test, TestingModule } from '@nestjs/testing';
import { TelegramDataCommandsService } from './telegram-data-commands.service';
import { TelegramUser, TelegramLanguage } from '../../shared/entities/telegram-user.entity';
import { TelegramMessageType } from '../../shared/entities/telegram-message-log.entity';
import { TasksService } from '../../../tasks/tasks.service';
import { UsersService } from '../../../users/users.service';
import { MachinesService } from '../../../machines/machines.service';
import { IncidentsService } from '../../../incidents/incidents.service';
import { TransactionsService } from '../../../transactions/transactions.service';
import { InventoryService } from '../../../inventory/inventory.service';
import { TelegramCacheService } from '../../infrastructure/services/telegram-cache.service';
import { MachineStatus } from '../../../machines/entities/machine.entity';
import { IncidentStatus } from '../../../incidents/entities/incident.entity';
import { TaskStatus, TaskType } from '../../../tasks/entities/task.entity';
import { UserRole } from '../../../users/entities/user.entity';

describe('TelegramDataCommandsService', () => {
  let service: TelegramDataCommandsService;
  let tasksService: jest.Mocked<TasksService>;
  let usersService: jest.Mocked<UsersService>;
  let machinesService: jest.Mocked<MachinesService>;
  let incidentsService: jest.Mocked<IncidentsService>;
  let transactionsService: jest.Mocked<TransactionsService>;
  let inventoryService: jest.Mocked<InventoryService>;
  let cacheService: jest.Mocked<TelegramCacheService>;

  const mockTelegramUser: Partial<TelegramUser> = {
    id: 'tg-user-1',
    telegram_id: '123456789',
    user_id: 'user-1',
    chat_id: '123456789',
    is_verified: true,
    language: TelegramLanguage.RU,
    notification_preferences: {},
  };

  const mockUnverifiedTelegramUser: Partial<TelegramUser> = {
    ...mockTelegramUser,
    is_verified: false,
  };

  const mockUser = {
    id: 'user-1',
    telegram_id: '123456789',
    full_name: 'Test Operator',
    role: UserRole.OPERATOR,
  };

  const mockMachine = {
    id: 'machine-1',
    machine_number: 'M-001',
    name: 'Test Machine',
    status: MachineStatus.ACTIVE,
    location: { name: 'Test Location', address: '123 Test St' },
  };

  const mockIncident = {
    id: 'incident-1',
    incident_type: 'malfunction',
    reported_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    machine: mockMachine,
  };

  const mockTask = {
    id: 'task-1',
    task_type: TaskType.REFILL,
    status: TaskStatus.ASSIGNED,
    machine: mockMachine,
    assigned_to: mockUser,
    created_at: new Date(),
  };

  const mockTransaction = {
    id: 'transaction-1',
    amount: 150,
    created_at: new Date(),
    machine: mockMachine,
  };

  const mockLowStockItem = {
    machine_id: 'machine-1',
    product_name: 'Coffee',
    quantity: 2,
    min_stock: 10,
  };

  const createMockCtx = (telegramUser = mockTelegramUser, isCallback = false) => ({
    from: { id: 123456789 },
    chat: { id: 123456789 },
    telegramUser,
    message: { text: '/test' },
    callbackQuery: isCallback ? { data: 'test' } : undefined,
    reply: jest.fn().mockResolvedValue(undefined),
    editMessageText: jest.fn().mockResolvedValue(undefined),
    answerCbQuery: jest.fn().mockResolvedValue(undefined),
    replyWithChatAction: jest.fn().mockResolvedValue(undefined),
  });

  const mockHelpers = {
    t: jest.fn((lang, key, ..._args) => key),
    logMessage: jest.fn().mockResolvedValue(undefined),
    formatMachinesMessage: jest.fn((machines, _lang) => `Machines: ${machines.length}`),
    formatAlertsMessage: jest.fn((alerts, _lang) => `Alerts: ${alerts.length}`),
    formatStatsMessage: jest.fn((stats, _lang) => `Stats: ${JSON.stringify(stats)}`),
    formatTasksMessage: jest.fn((tasks, _lang) => `Tasks: ${tasks.length}`),
    getMachinesKeyboard: jest.fn(() => ({ reply_markup: {} })),
    getAlertsKeyboard: jest.fn(() => ({ reply_markup: {} })),
    getTasksKeyboard: jest.fn(() => ({ reply_markup: {} })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramDataCommandsService,
        {
          provide: TasksService,
          useValue: {
            findAll: jest.fn(),
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
            findOne: jest.fn(),
            findAllSimple: jest.fn(),
          },
        },
        {
          provide: IncidentsService,
          useValue: {
            findAll: jest.fn(),
          },
        },
        {
          provide: TransactionsService,
          useValue: {
            findAll: jest.fn(),
          },
        },
        {
          provide: InventoryService,
          useValue: {
            getMachinesLowStock: jest.fn(),
          },
        },
        {
          provide: TelegramCacheService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
            invalidate: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<TelegramDataCommandsService>(TelegramDataCommandsService);
    tasksService = module.get(TasksService);
    usersService = module.get(UsersService);
    machinesService = module.get(MachinesService);
    incidentsService = module.get(IncidentsService);
    transactionsService = module.get(TransactionsService);
    inventoryService = module.get(InventoryService);
    cacheService = module.get(TelegramCacheService);

    // Initialize helpers
    service.setHelpers(mockHelpers);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // setHelpers tests
  // ============================================================================

  describe('setHelpers', () => {
    it('should set helpers successfully', () => {
      const newService = new TelegramDataCommandsService(
        tasksService,
        usersService,
        machinesService,
        incidentsService,
        transactionsService,
        inventoryService,
        cacheService,
      );
      expect(() => newService.setHelpers(mockHelpers)).not.toThrow();
    });
  });

  // ============================================================================
  // handleMachinesCommand tests
  // ============================================================================

  describe('handleMachinesCommand', () => {
    it('should deny access to unverified users', async () => {
      const ctx = createMockCtx(mockUnverifiedTelegramUser);
      await service.handleMachinesCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalledWith('not_verified');
      expect(machinesService.findAllSimple).not.toHaveBeenCalled();
    });

    it('should handle user without telegramUser', async () => {
      const ctx = createMockCtx(undefined as any);
      (ctx as any).telegramUser = undefined;
      await service.handleMachinesCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalledWith('not_verified');
    });

    it('should display machines list for verified users', async () => {
      const ctx = createMockCtx();
      machinesService.findAllSimple.mockResolvedValue([mockMachine as any]);

      await service.handleMachinesCommand(ctx as any);

      expect(ctx.replyWithChatAction).toHaveBeenCalledWith('typing');
      expect(machinesService.findAllSimple).toHaveBeenCalled();
      expect(mockHelpers.formatMachinesMessage).toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalled();
    });

    it('should edit message when triggered from callback', async () => {
      const ctx = createMockCtx(mockTelegramUser, true);
      machinesService.findAllSimple.mockResolvedValue([mockMachine as any]);

      await service.handleMachinesCommand(ctx as any);

      expect(ctx.editMessageText).toHaveBeenCalled();
      expect(ctx.reply).not.toHaveBeenCalled();
    });

    it('should handle empty machines list', async () => {
      const ctx = createMockCtx();
      machinesService.findAllSimple.mockResolvedValue([]);

      await service.handleMachinesCommand(ctx as any);

      expect(mockHelpers.formatMachinesMessage).toHaveBeenCalledWith([], TelegramLanguage.RU);
    });

    it('should handle service not initialized', async () => {
      const newService = new TelegramDataCommandsService(
        tasksService,
        usersService,
        machinesService,
        incidentsService,
        transactionsService,
        inventoryService,
        cacheService,
      );
      const ctx = createMockCtx();
      machinesService.findAllSimple.mockResolvedValue([mockMachine as any]);

      await newService.handleMachinesCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalledWith('Service not initialized');
    });

    it('should format machine with location name', async () => {
      const ctx = createMockCtx();
      const machineWithName = {
        ...mockMachine,
        location: { name: 'Main Lobby', address: null },
      };
      machinesService.findAllSimple.mockResolvedValue([machineWithName as any]);

      await service.handleMachinesCommand(ctx as any);

      expect(mockHelpers.formatMachinesMessage).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ location: 'Main Lobby' }),
        ]),
        TelegramLanguage.RU,
      );
    });

    it('should format machine with location address when no name', async () => {
      const ctx = createMockCtx();
      const machineWithAddress = {
        ...mockMachine,
        location: { name: null, address: '456 Main St' },
      };
      machinesService.findAllSimple.mockResolvedValue([machineWithAddress as any]);

      await service.handleMachinesCommand(ctx as any);

      expect(mockHelpers.formatMachinesMessage).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ location: '456 Main St' }),
        ]),
        TelegramLanguage.RU,
      );
    });

    it('should format machine with Unknown location when no location data', async () => {
      const ctx = createMockCtx();
      const machineNoLocation = {
        ...mockMachine,
        location: null,
      };
      machinesService.findAllSimple.mockResolvedValue([machineNoLocation as any]);

      await service.handleMachinesCommand(ctx as any);

      expect(mockHelpers.formatMachinesMessage).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ location: 'Unknown' }),
        ]),
        TelegramLanguage.RU,
      );
    });

    it('should map active status to online', async () => {
      const ctx = createMockCtx();
      const activeM = { ...mockMachine, status: 'active' };
      machinesService.findAllSimple.mockResolvedValue([activeM as any]);

      await service.handleMachinesCommand(ctx as any);

      expect(mockHelpers.formatMachinesMessage).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ status: 'online' }),
        ]),
        TelegramLanguage.RU,
      );
    });

    it('should keep non-active status as is', async () => {
      const ctx = createMockCtx();
      const offlineM = { ...mockMachine, status: 'offline' };
      machinesService.findAllSimple.mockResolvedValue([offlineM as any]);

      await service.handleMachinesCommand(ctx as any);

      expect(mockHelpers.formatMachinesMessage).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ status: 'offline' }),
        ]),
        TelegramLanguage.RU,
      );
    });

    it('should log command', async () => {
      const ctx = createMockCtx();
      machinesService.findAllSimple.mockResolvedValue([]);

      await service.handleMachinesCommand(ctx as any);

      expect(mockHelpers.logMessage).toHaveBeenCalledWith(
        ctx,
        TelegramMessageType.COMMAND,
        '/machines',
      );
    });

    it('should work with English language user', async () => {
      const ctx = createMockCtx({
        ...mockTelegramUser,
        language: TelegramLanguage.EN,
      });
      machinesService.findAllSimple.mockResolvedValue([mockMachine as any]);

      await service.handleMachinesCommand(ctx as any);

      expect(mockHelpers.formatMachinesMessage).toHaveBeenCalledWith(
        expect.any(Array),
        TelegramLanguage.EN,
      );
    });
  });

  // ============================================================================
  // handleAlertsCommand tests
  // ============================================================================

  describe('handleAlertsCommand', () => {
    it('should deny access to unverified users', async () => {
      const ctx = createMockCtx(mockUnverifiedTelegramUser);
      await service.handleAlertsCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalledWith('not_verified');
      expect(incidentsService.findAll).not.toHaveBeenCalled();
    });

    it('should default to Russian for unverified users without language', async () => {
      const ctx = createMockCtx({
        ...mockUnverifiedTelegramUser,
        language: undefined,
      });
      await service.handleAlertsCommand(ctx as any);

      expect(mockHelpers.t).toHaveBeenCalledWith(TelegramLanguage.RU, 'not_verified');
    });

    it('should display alerts for verified users', async () => {
      const ctx = createMockCtx();
      incidentsService.findAll.mockResolvedValue([mockIncident as any]);
      inventoryService.getMachinesLowStock.mockResolvedValue([]);

      await service.handleAlertsCommand(ctx as any);

      expect(incidentsService.findAll).toHaveBeenCalledWith(IncidentStatus.OPEN, undefined);
      expect(mockHelpers.formatAlertsMessage).toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalled();
    });

    it('should edit message when triggered from callback', async () => {
      const ctx = createMockCtx(mockTelegramUser, true);
      incidentsService.findAll.mockResolvedValue([]);
      inventoryService.getMachinesLowStock.mockResolvedValue([]);

      await service.handleAlertsCommand(ctx as any);

      expect(ctx.editMessageText).toHaveBeenCalled();
      expect(ctx.reply).not.toHaveBeenCalled();
    });

    it('should handle empty alerts', async () => {
      const ctx = createMockCtx();
      incidentsService.findAll.mockResolvedValue([]);
      inventoryService.getMachinesLowStock.mockResolvedValue([]);

      await service.handleAlertsCommand(ctx as any);

      expect(mockHelpers.formatAlertsMessage).toHaveBeenCalledWith([], TelegramLanguage.RU);
    });

    it('should include low stock alerts', async () => {
      const ctx = createMockCtx();
      incidentsService.findAll.mockResolvedValue([]);
      inventoryService.getMachinesLowStock.mockResolvedValue([mockLowStockItem as any]);
      machinesService.findOne.mockResolvedValue(mockMachine as any);

      await service.handleAlertsCommand(ctx as any);

      expect(inventoryService.getMachinesLowStock).toHaveBeenCalled();
      expect(mockHelpers.formatAlertsMessage).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ type: 'low_stock' }),
        ]),
        TelegramLanguage.RU,
      );
    });

    it('should aggregate low stock items by machine', async () => {
      const ctx = createMockCtx();
      incidentsService.findAll.mockResolvedValue([]);
      inventoryService.getMachinesLowStock.mockResolvedValue([
        { machine_id: 'machine-1', product_name: 'Coffee' },
        { machine_id: 'machine-1', product_name: 'Sugar' },
        { machine_id: 'machine-1', product_name: 'Milk' },
      ] as any);
      machinesService.findOne.mockResolvedValue(mockMachine as any);

      await service.handleAlertsCommand(ctx as any);

      // Should only add one low_stock alert for machine-1 with count 3
      expect(mockHelpers.formatAlertsMessage).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'low_stock',
            machine: 'M-001',
            time: '3 item(s)',
          }),
        ]),
        TelegramLanguage.RU,
      );
    });

    it('should handle service not initialized', async () => {
      const newService = new TelegramDataCommandsService(
        tasksService,
        usersService,
        machinesService,
        incidentsService,
        transactionsService,
        inventoryService,
        cacheService,
      );
      const ctx = createMockCtx();
      incidentsService.findAll.mockResolvedValue([]);
      inventoryService.getMachinesLowStock.mockResolvedValue([]);

      await newService.handleAlertsCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalledWith('Service not initialized');
    });

    it('should format incident time correctly for hours', async () => {
      const ctx = createMockCtx();
      const incidentHoursAgo = {
        ...mockIncident,
        reported_at: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      };
      incidentsService.findAll.mockResolvedValue([incidentHoursAgo as any]);
      inventoryService.getMachinesLowStock.mockResolvedValue([]);

      await service.handleAlertsCommand(ctx as any);

      expect(mockHelpers.formatAlertsMessage).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ time: expect.stringContaining('h') }),
        ]),
        TelegramLanguage.RU,
      );
    });

    it('should format incident time correctly for minutes only', async () => {
      const ctx = createMockCtx();
      const incidentMinutesAgo = {
        ...mockIncident,
        reported_at: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      };
      incidentsService.findAll.mockResolvedValue([incidentMinutesAgo as any]);
      inventoryService.getMachinesLowStock.mockResolvedValue([]);

      await service.handleAlertsCommand(ctx as any);

      expect(mockHelpers.formatAlertsMessage).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ time: expect.stringMatching(/^\d+m ago$/) }),
        ]),
        TelegramLanguage.RU,
      );
    });

    it('should handle incident with no machine', async () => {
      const ctx = createMockCtx();
      const incidentNoMachine = {
        ...mockIncident,
        machine: null,
      };
      incidentsService.findAll.mockResolvedValue([incidentNoMachine as any]);
      inventoryService.getMachinesLowStock.mockResolvedValue([]);

      await service.handleAlertsCommand(ctx as any);

      expect(mockHelpers.formatAlertsMessage).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ machine: 'Unknown' }),
        ]),
        TelegramLanguage.RU,
      );
    });

    it('should handle incident with no type', async () => {
      const ctx = createMockCtx();
      const incidentNoType = {
        ...mockIncident,
        incident_type: null,
      };
      incidentsService.findAll.mockResolvedValue([incidentNoType as any]);
      inventoryService.getMachinesLowStock.mockResolvedValue([]);

      await service.handleAlertsCommand(ctx as any);

      expect(mockHelpers.formatAlertsMessage).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ type: 'incident' }),
        ]),
        TelegramLanguage.RU,
      );
    });

    it('should limit incidents to 5', async () => {
      const ctx = createMockCtx();
      const manyIncidents = Array.from({ length: 10 }, (_, i) => ({
        ...mockIncident,
        id: `incident-${i}`,
      }));
      incidentsService.findAll.mockResolvedValue(manyIncidents as any);
      inventoryService.getMachinesLowStock.mockResolvedValue([]);

      await service.handleAlertsCommand(ctx as any);

      const callArgs = mockHelpers.formatAlertsMessage.mock.calls[0][0];
      expect(callArgs.length).toBeLessThanOrEqual(5);
    });

    it('should limit low stock items to 5', async () => {
      const ctx = createMockCtx();
      incidentsService.findAll.mockResolvedValue([]);
      const manyLowStockItems = Array.from({ length: 10 }, (_, i) => ({
        machine_id: `machine-${i}`,
        product_name: `Product ${i}`,
      }));
      inventoryService.getMachinesLowStock.mockResolvedValue(manyLowStockItems as any);
      machinesService.findOne.mockResolvedValue(mockMachine as any);

      await service.handleAlertsCommand(ctx as any);

      // Should process max 5 low stock items
      expect(machinesService.findOne).toHaveBeenCalledTimes(5);
    });

    it('should handle unknown machine for low stock', async () => {
      const ctx = createMockCtx();
      incidentsService.findAll.mockResolvedValue([]);
      inventoryService.getMachinesLowStock.mockResolvedValue([mockLowStockItem as any]);
      machinesService.findOne.mockResolvedValue(null as any);

      await service.handleAlertsCommand(ctx as any);

      expect(mockHelpers.formatAlertsMessage).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ machine: 'Unknown' }),
        ]),
        TelegramLanguage.RU,
      );
    });

    it('should log command', async () => {
      const ctx = createMockCtx();
      incidentsService.findAll.mockResolvedValue([]);
      inventoryService.getMachinesLowStock.mockResolvedValue([]);

      await service.handleAlertsCommand(ctx as any);

      expect(mockHelpers.logMessage).toHaveBeenCalledWith(
        ctx,
        TelegramMessageType.COMMAND,
        '/alerts',
      );
    });
  });

  // ============================================================================
  // handleStatsCommand tests
  // ============================================================================

  describe('handleStatsCommand', () => {
    beforeEach(() => {
      machinesService.findAllSimple.mockResolvedValue([mockMachine as any]);
      transactionsService.findAll.mockResolvedValue([mockTransaction as any]);
      tasksService.findAll.mockResolvedValue([mockTask as any]);
    });

    it('should deny access to unverified users', async () => {
      const ctx = createMockCtx(mockUnverifiedTelegramUser);
      await service.handleStatsCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalledWith('not_verified');
      expect(machinesService.findAllSimple).not.toHaveBeenCalled();
    });

    it('should default to Russian for unverified users without language', async () => {
      const ctx = createMockCtx({
        ...mockUnverifiedTelegramUser,
        language: undefined,
      });
      await service.handleStatsCommand(ctx as any);

      expect(mockHelpers.t).toHaveBeenCalledWith(TelegramLanguage.RU, 'not_verified');
    });

    it('should display stats for verified users', async () => {
      const ctx = createMockCtx();

      await service.handleStatsCommand(ctx as any);

      expect(ctx.replyWithChatAction).toHaveBeenCalledWith('typing');
      expect(machinesService.findAllSimple).toHaveBeenCalled();
      expect(transactionsService.findAll).toHaveBeenCalled();
      expect(tasksService.findAll).toHaveBeenCalled();
      expect(mockHelpers.formatStatsMessage).toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalled();
    });

    it('should edit message when triggered from callback', async () => {
      const ctx = createMockCtx(mockTelegramUser, true);

      await service.handleStatsCommand(ctx as any);

      expect(ctx.editMessageText).toHaveBeenCalled();
      expect(ctx.reply).not.toHaveBeenCalled();
    });

    it('should calculate correct machine counts', async () => {
      const ctx = createMockCtx();
      machinesService.findAllSimple.mockResolvedValue([
        { ...mockMachine, status: MachineStatus.ACTIVE },
        { ...mockMachine, id: '2', status: MachineStatus.ACTIVE },
        { ...mockMachine, id: '3', status: MachineStatus.OFFLINE },
        { ...mockMachine, id: '4', status: MachineStatus.ERROR },
        { ...mockMachine, id: '5', status: MachineStatus.MAINTENANCE },
      ] as any);

      await service.handleStatsCommand(ctx as any);

      expect(mockHelpers.formatStatsMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          total_machines: 5,
          online: 2,
          offline: 3,
        }),
        TelegramLanguage.RU,
      );
    });

    it('should calculate today sales correctly', async () => {
      const ctx = createMockCtx();
      transactionsService.findAll.mockResolvedValue([
        { ...mockTransaction, amount: 100 },
        { ...mockTransaction, id: '2', amount: 200 },
        { ...mockTransaction, id: '3', amount: 50 },
      ] as any);

      await service.handleStatsCommand(ctx as any);

      expect(mockHelpers.formatStatsMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          today_sales: 3,
          today_revenue: 350,
        }),
        TelegramLanguage.RU,
      );
    });

    it('should count pending tasks correctly', async () => {
      const ctx = createMockCtx();
      tasksService.findAll.mockResolvedValue([
        { ...mockTask, status: TaskStatus.PENDING },
        { ...mockTask, id: '2', status: TaskStatus.ASSIGNED },
        { ...mockTask, id: '3', status: TaskStatus.COMPLETED },
        { ...mockTask, id: '4', status: TaskStatus.IN_PROGRESS },
      ] as any);

      await service.handleStatsCommand(ctx as any);

      expect(mockHelpers.formatStatsMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          pending_tasks: 2, // PENDING and ASSIGNED only
        }),
        TelegramLanguage.RU,
      );
    });

    it('should handle service not initialized', async () => {
      const newService = new TelegramDataCommandsService(
        tasksService,
        usersService,
        machinesService,
        incidentsService,
        transactionsService,
        inventoryService,
        cacheService,
      );
      const ctx = createMockCtx();

      await newService.handleStatsCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalledWith('Service not initialized');
    });

    it('should handle empty data', async () => {
      const ctx = createMockCtx();
      machinesService.findAllSimple.mockResolvedValue([]);
      transactionsService.findAll.mockResolvedValue([]);
      tasksService.findAll.mockResolvedValue([]);

      await service.handleStatsCommand(ctx as any);

      expect(mockHelpers.formatStatsMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          total_machines: 0,
          online: 0,
          offline: 0,
          today_sales: 0,
          today_revenue: 0,
          pending_tasks: 0,
        }),
        TelegramLanguage.RU,
      );
    });

    it('should log command', async () => {
      const ctx = createMockCtx();

      await service.handleStatsCommand(ctx as any);

      expect(mockHelpers.logMessage).toHaveBeenCalledWith(
        ctx,
        TelegramMessageType.COMMAND,
        '/stats',
      );
    });

    it('should handle transactions with null amounts', async () => {
      const ctx = createMockCtx();
      transactionsService.findAll.mockResolvedValue([
        { ...mockTransaction, amount: null },
        { ...mockTransaction, id: '2', amount: 100 },
      ] as any);

      await service.handleStatsCommand(ctx as any);

      expect(mockHelpers.formatStatsMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          today_revenue: 100,
        }),
        TelegramLanguage.RU,
      );
    });

    it('should round today_revenue', async () => {
      const ctx = createMockCtx();
      transactionsService.findAll.mockResolvedValue([
        { ...mockTransaction, amount: 99.99 },
        { ...mockTransaction, id: '2', amount: 50.50 },
      ] as any);

      await service.handleStatsCommand(ctx as any);

      expect(mockHelpers.formatStatsMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          today_revenue: 150, // Rounded from 150.49
        }),
        TelegramLanguage.RU,
      );
    });
  });

  // ============================================================================
  // handleTasksCommand tests
  // ============================================================================

  describe('handleTasksCommand', () => {
    it('should deny access to unverified users', async () => {
      const ctx = createMockCtx(mockUnverifiedTelegramUser);
      await service.handleTasksCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalledWith('not_verified');
      expect(usersService.findByTelegramId).not.toHaveBeenCalled();
    });

    it('should default to Russian for unverified users without language', async () => {
      const ctx = createMockCtx({
        ...mockUnverifiedTelegramUser,
        language: undefined,
      });
      await service.handleTasksCommand(ctx as any);

      expect(mockHelpers.t).toHaveBeenCalledWith(TelegramLanguage.RU, 'not_verified');
    });

    it('should display tasks for verified users', async () => {
      const ctx = createMockCtx();
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.findAll.mockResolvedValue([mockTask as any]);

      await service.handleTasksCommand(ctx as any);

      expect(ctx.replyWithChatAction).toHaveBeenCalledWith('typing');
      expect(usersService.findByTelegramId).toHaveBeenCalledWith('123456789');
      expect(tasksService.findAll).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined,
        'user-1',
      );
      expect(mockHelpers.formatTasksMessage).toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalled();
    });

    it('should handle user not found', async () => {
      const ctx = createMockCtx();
      usersService.findByTelegramId.mockResolvedValue(null);

      await service.handleTasksCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('не найден'),
      );
    });

    it('should handle user not found in English', async () => {
      const ctx = createMockCtx({
        ...mockTelegramUser,
        language: TelegramLanguage.EN,
      });
      usersService.findByTelegramId.mockResolvedValue(null);

      await service.handleTasksCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('not found'),
      );
    });

    it('should show message when no active tasks', async () => {
      const ctx = createMockCtx();
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.findAll.mockResolvedValue([]);

      await service.handleTasksCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('нет активных задач'),
      );
    });

    it('should show message when no active tasks in English', async () => {
      const ctx = createMockCtx({
        ...mockTelegramUser,
        language: TelegramLanguage.EN,
      });
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.findAll.mockResolvedValue([]);

      await service.handleTasksCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('no active tasks'),
      );
    });

    it('should filter only active tasks', async () => {
      const ctx = createMockCtx();
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.findAll.mockResolvedValue([
        { ...mockTask, status: TaskStatus.PENDING },
        { ...mockTask, id: '2', status: TaskStatus.ASSIGNED },
        { ...mockTask, id: '3', status: TaskStatus.IN_PROGRESS },
        { ...mockTask, id: '4', status: TaskStatus.COMPLETED },
        { ...mockTask, id: '5', status: TaskStatus.CANCELLED },
      ] as any);

      await service.handleTasksCommand(ctx as any);

      expect(mockHelpers.formatTasksMessage).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ status: TaskStatus.PENDING }),
          expect.objectContaining({ status: TaskStatus.ASSIGNED }),
          expect.objectContaining({ status: TaskStatus.IN_PROGRESS }),
        ]),
        TelegramLanguage.RU,
      );

      const calledTasks = mockHelpers.formatTasksMessage.mock.calls[0][0];
      expect(calledTasks.length).toBe(3);
    });

    it('should handle service not initialized', async () => {
      const newService = new TelegramDataCommandsService(
        tasksService,
        usersService,
        machinesService,
        incidentsService,
        transactionsService,
        inventoryService,
        cacheService,
      );
      const ctx = createMockCtx();
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.findAll.mockResolvedValue([mockTask as any]);

      await newService.handleTasksCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalledWith('Service not initialized');
    });

    it('should handle error and show user-friendly message in Russian', async () => {
      const ctx = createMockCtx();
      usersService.findByTelegramId.mockRejectedValue(new Error('Database error'));

      await service.handleTasksCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Не удалось загрузить'),
        expect.objectContaining({ parse_mode: 'HTML' }),
      );
    });

    it('should handle error and show user-friendly message in English', async () => {
      const ctx = createMockCtx({
        ...mockTelegramUser,
        language: TelegramLanguage.EN,
      });
      usersService.findByTelegramId.mockRejectedValue(new Error('Database error'));

      await service.handleTasksCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Could not load task list'),
        expect.objectContaining({ parse_mode: 'HTML' }),
      );
    });

    it('should log command', async () => {
      const ctx = createMockCtx();
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.findAll.mockResolvedValue([]);

      await service.handleTasksCommand(ctx as any);

      expect(mockHelpers.logMessage).toHaveBeenCalledWith(
        ctx,
        TelegramMessageType.COMMAND,
        '/tasks',
      );
    });
  });

  // ============================================================================
  // t (translation helper) tests
  // ============================================================================

  describe('translation helper', () => {
    it('should return key when helpers not set', async () => {
      const newService = new TelegramDataCommandsService(
        tasksService,
        usersService,
        machinesService,
        incidentsService,
        transactionsService,
        inventoryService,
        cacheService,
      );
      const ctx = createMockCtx(mockUnverifiedTelegramUser);

      await newService.handleMachinesCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalledWith('not_verified');
    });
  });

  // ============================================================================
  // logMessage helper tests
  // ============================================================================

  describe('logMessage helper', () => {
    it('should not log when helpers not set', async () => {
      const newService = new TelegramDataCommandsService(
        tasksService,
        usersService,
        machinesService,
        incidentsService,
        transactionsService,
        inventoryService,
        cacheService,
      );
      const ctx = createMockCtx(mockUnverifiedTelegramUser);

      // Should not throw when helpers not set
      await expect(newService.handleMachinesCommand(ctx as any)).resolves.not.toThrow();
    });
  });
});
