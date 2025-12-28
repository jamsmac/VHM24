import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramCommandHandlerService, BotHelpers } from './telegram-command-handler.service';
import { TelegramMessageLog, TelegramMessageType } from '../../shared/entities/telegram-message-log.entity';
import { TelegramLanguage } from '../../shared/entities/telegram-user.entity';
import { TasksService } from '../../../tasks/tasks.service';
import { UsersService } from '../../../users/users.service';
import { MachinesService } from '../../../machines/machines.service';
import { IncidentsService } from '../../../incidents/incidents.service';
import { TransactionsService } from '../../../transactions/transactions.service';
import { InventoryService } from '../../../inventory/inventory.service';
import { TaskStatus } from '../../../tasks/entities/task.entity';
import { IncidentStatus } from '../../../incidents/entities/incident.entity';
import { BotContext } from '../../shared/types/telegram.types';

// Mock Telegraf Markup
jest.mock('telegraf', () => ({
  Markup: {
    inlineKeyboard: jest.fn((buttons) => ({ reply_markup: { inline_keyboard: buttons } })),
    button: {
      callback: jest.fn((text, data) => ({ text, callback_data: data })),
    },
  },
}));

describe('TelegramCommandHandlerService', () => {
  let service: TelegramCommandHandlerService;
  let telegramMessageLogRepository: jest.Mocked<Repository<TelegramMessageLog>>;
  let tasksService: jest.Mocked<TasksService>;
  let usersService: jest.Mocked<UsersService>;
  let machinesService: jest.Mocked<MachinesService>;
  let incidentsService: jest.Mocked<IncidentsService>;
  let transactionsService: jest.Mocked<TransactionsService>;
  let inventoryService: jest.Mocked<InventoryService>;

  const mockTelegramUser = {
    id: 'tg-user-1',
    telegram_id: '123456789',
    user_id: 'user-1',
    is_verified: true,
    language: TelegramLanguage.RU,
  };

  const mockHelpers = {
    t: jest.fn((lang, key) => key),
    getMainMenuKeyboard: jest.fn(() => ({ reply_markup: { inline_keyboard: [] } })),
    getVerificationKeyboard: jest.fn(() => ({ reply_markup: { inline_keyboard: [] } })),
    formatTasksMessage: jest.fn(() => 'Tasks message'),
    formatMachinesMessage: jest.fn(() => 'Machines message'),
    formatAlertsMessage: jest.fn(() => 'Alerts message'),
    formatStatsMessage: jest.fn(() => 'Stats message'),
    getTasksKeyboard: jest.fn(() => ({ reply_markup: { inline_keyboard: [] } })),
    getMachinesKeyboard: jest.fn(() => ({ reply_markup: { inline_keyboard: [] } })),
    getAlertsKeyboard: jest.fn(() => ({ reply_markup: { inline_keyboard: [] } })),
    notifyAdminAboutNewUser: jest.fn(),
  } as unknown as BotHelpers;

  const createMockContext = (overrides: Partial<BotContext> = {}): BotContext =>
    ({
      telegramUser: { ...mockTelegramUser },
      chat: { id: 123456789 },
      from: { id: 123456789, first_name: 'John', username: 'johndoe' },
      message: { text: '/start' },
      answerCbQuery: jest.fn().mockResolvedValue(undefined),
      editMessageText: jest.fn().mockResolvedValue(undefined),
      reply: jest.fn().mockResolvedValue(undefined),
      replyWithChatAction: jest.fn().mockResolvedValue(undefined),
      callbackQuery: undefined,
      ...overrides,
    }) as unknown as BotContext;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramCommandHandlerService,
        {
          provide: getRepositoryToken(TelegramMessageLog),
          useValue: {
            create: jest.fn().mockReturnValue({}),
            save: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: TasksService,
          useValue: {
            findAll: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findByTelegramId: jest.fn(),
            createPendingFromTelegram: jest.fn(),
          },
        },
        {
          provide: MachinesService,
          useValue: {
            findAllSimple: jest.fn().mockResolvedValue([]),
            findOne: jest.fn(),
          },
        },
        {
          provide: IncidentsService,
          useValue: {
            findAll: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: TransactionsService,
          useValue: {
            findAll: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: InventoryService,
          useValue: {
            getMachinesLowStock: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    service = module.get<TelegramCommandHandlerService>(TelegramCommandHandlerService);
    telegramMessageLogRepository = module.get(getRepositoryToken(TelegramMessageLog));
    tasksService = module.get(TasksService);
    usersService = module.get(UsersService);
    machinesService = module.get(MachinesService);
    incidentsService = module.get(IncidentsService);
    transactionsService = module.get(TransactionsService);
    inventoryService = module.get(InventoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // setHelpers
  // ============================================================================

  describe('setHelpers', () => {
    it('should set helpers', () => {
      service.setHelpers(mockHelpers);
      expect(service).toBeDefined();
    });
  });

  // ============================================================================
  // handleStartCommand
  // ============================================================================

  describe('handleStartCommand', () => {
    it('should do nothing if helpers not set', async () => {
      const ctx = createMockContext();

      await service.handleStartCommand(ctx);

      expect(ctx.reply).not.toHaveBeenCalled();
    });

    it('should show main menu for verified user', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();

      await service.handleStartCommand(ctx);

      expect(mockHelpers.t).toHaveBeenCalledWith(TelegramLanguage.RU, 'welcome_back', 'John');
      expect(mockHelpers.getMainMenuKeyboard).toHaveBeenCalledWith(TelegramLanguage.RU);
      expect(ctx.reply).toHaveBeenCalled();
    });

    it('should show pending message for unverified user', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({
        telegramUser: { ...mockTelegramUser, is_verified: false } as any,
      });

      await service.handleStartCommand(ctx);

      expect(mockHelpers.t).toHaveBeenCalledWith(TelegramLanguage.RU, 'access_request_pending');
      expect(mockHelpers.getVerificationKeyboard).toHaveBeenCalled();
    });

    it('should create pending user for new user', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({ telegramUser: undefined });
      usersService.createPendingFromTelegram.mockResolvedValue({ id: 'new-user-1' } as any);

      await service.handleStartCommand(ctx);

      expect(usersService.createPendingFromTelegram).toHaveBeenCalledWith({
        telegram_id: '123456789',
        telegram_username: 'johndoe',
        telegram_first_name: 'John',
        telegram_last_name: undefined,
      });
      expect(mockHelpers.notifyAdminAboutNewUser).toHaveBeenCalled();
    });

    it('should show pending message if user already exists', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({ telegramUser: undefined });
      usersService.createPendingFromTelegram.mockRejectedValue(
        new Error('User уже существует'),
      );

      await service.handleStartCommand(ctx);

      expect(mockHelpers.t).toHaveBeenCalledWith(TelegramLanguage.RU, 'access_request_pending');
    });

    it('should show pending message if user already exists (English)', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({ telegramUser: undefined });
      usersService.createPendingFromTelegram.mockRejectedValue(
        new Error('User already exists'),
      );

      await service.handleStartCommand(ctx);

      expect(mockHelpers.t).toHaveBeenCalledWith(TelegramLanguage.RU, 'access_request_pending');
    });

    it('should show error message on other errors', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({ telegramUser: undefined });
      usersService.createPendingFromTelegram.mockRejectedValue(new Error('Database error'));

      await service.handleStartCommand(ctx);

      expect(mockHelpers.t).toHaveBeenCalledWith(TelegramLanguage.RU, 'access_request_error');
    });

    it('should show welcome for new user without from', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({ telegramUser: undefined, from: undefined });

      await service.handleStartCommand(ctx);

      expect(mockHelpers.t).toHaveBeenCalledWith(TelegramLanguage.RU, 'welcome_new', 'User');
    });

    it('should log command to database', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();

      await service.handleStartCommand(ctx);

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          command: '/start',
          message_type: TelegramMessageType.COMMAND,
        }),
      );
    });

    it('should use English if user has English language', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN } as any,
      });

      await service.handleStartCommand(ctx);

      expect(mockHelpers.t).toHaveBeenCalledWith(TelegramLanguage.EN, 'welcome_back', 'John');
    });

    it('should default to RU if no telegramUser language', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({
        telegramUser: { ...mockTelegramUser, language: undefined } as any,
      });

      await service.handleStartCommand(ctx);

      expect(mockHelpers.t).toHaveBeenCalledWith(TelegramLanguage.RU, 'welcome_back', 'John');
    });
  });

  // ============================================================================
  // handleMenuCommand
  // ============================================================================

  describe('handleMenuCommand', () => {
    it('should do nothing if helpers not set', async () => {
      const ctx = createMockContext();

      await service.handleMenuCommand(ctx);

      expect(ctx.reply).not.toHaveBeenCalled();
    });

    it('should show not verified for unverified user', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({
        telegramUser: { ...mockTelegramUser, is_verified: false } as any,
      });

      await service.handleMenuCommand(ctx);

      expect(mockHelpers.t).toHaveBeenCalledWith(TelegramLanguage.RU, 'not_verified');
      expect(mockHelpers.getVerificationKeyboard).toHaveBeenCalled();
    });

    it('should show main menu for verified user', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();

      await service.handleMenuCommand(ctx);

      expect(mockHelpers.t).toHaveBeenCalledWith(TelegramLanguage.RU, 'main_menu');
      expect(mockHelpers.getMainMenuKeyboard).toHaveBeenCalledWith(TelegramLanguage.RU);
    });

    it('should log command to database', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();

      await service.handleMenuCommand(ctx);

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          command: '/menu',
        }),
      );
    });
  });

  // ============================================================================
  // handleMachinesCommand
  // ============================================================================

  describe('handleMachinesCommand', () => {
    it('should do nothing if helpers not set', async () => {
      const ctx = createMockContext();

      await service.handleMachinesCommand(ctx);

      expect(ctx.reply).not.toHaveBeenCalled();
    });

    it('should show not verified for unverified user', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({
        telegramUser: { ...mockTelegramUser, is_verified: false } as any,
      });

      await service.handleMachinesCommand(ctx);

      expect(mockHelpers.t).toHaveBeenCalledWith(TelegramLanguage.RU, 'not_verified');
    });

    it('should show machines list for verified user', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();
      machinesService.findAllSimple.mockResolvedValue([
        { id: 'm1', machine_number: 'M-001', status: 'active', location: { name: 'Lobby' } },
        { id: 'm2', machine_number: 'M-002', status: 'offline', location: { address: '123 St' } },
      ] as any);

      await service.handleMachinesCommand(ctx);

      expect(ctx.replyWithChatAction).toHaveBeenCalledWith('typing');
      expect(mockHelpers.formatMachinesMessage).toHaveBeenCalled();
      expect(mockHelpers.getMachinesKeyboard).toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith('Machines message', expect.any(Object));
    });

    it('should edit message if called from callback', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({ callbackQuery: { id: 'cb-1' } as any });
      machinesService.findAllSimple.mockResolvedValue([]);

      await service.handleMachinesCommand(ctx);

      expect(ctx.editMessageText).toHaveBeenCalled();
      expect(ctx.reply).not.toHaveBeenCalled();
    });

    it('should handle machine with no location', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();
      machinesService.findAllSimple.mockResolvedValue([
        { id: 'm1', machine_number: 'M-001', status: 'active', location: null },
      ] as any);

      await service.handleMachinesCommand(ctx);

      expect(mockHelpers.formatMachinesMessage).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ location: 'Unknown' }),
        ]),
        TelegramLanguage.RU,
      );
    });

    it('should log command to database', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();
      machinesService.findAllSimple.mockResolvedValue([]);

      await service.handleMachinesCommand(ctx);

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          command: '/machines',
        }),
      );
    });
  });

  // ============================================================================
  // handleAlertsCommand
  // ============================================================================

  describe('handleAlertsCommand', () => {
    it('should do nothing if helpers not set', async () => {
      const ctx = createMockContext();

      await service.handleAlertsCommand(ctx);

      expect(ctx.reply).not.toHaveBeenCalled();
    });

    it('should show not verified for unverified user', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({
        telegramUser: { ...mockTelegramUser, is_verified: false } as any,
      });

      await service.handleAlertsCommand(ctx);

      expect(mockHelpers.t).toHaveBeenCalledWith(TelegramLanguage.RU, 'not_verified');
    });

    it('should show alerts for verified user', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();
      incidentsService.findAll.mockResolvedValue([
        {
          id: 'inc-1',
          incident_type: 'error',
          machine: { machine_number: 'M-001' },
          reported_at: new Date(),
        },
      ] as any);
      inventoryService.getMachinesLowStock.mockResolvedValue([]);

      await service.handleAlertsCommand(ctx);

      expect(mockHelpers.formatAlertsMessage).toHaveBeenCalled();
      expect(mockHelpers.getAlertsKeyboard).toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith('Alerts message', expect.any(Object));
    });

    it('should include low stock alerts', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();
      incidentsService.findAll.mockResolvedValue([]);
      inventoryService.getMachinesLowStock.mockResolvedValue([
        { machine_id: 'm1', quantity: 2 },
        { machine_id: 'm1', quantity: 1 },
        { machine_id: 'm2', quantity: 3 },
      ] as any);
      machinesService.findOne.mockImplementation((id) =>
        Promise.resolve({ machine_number: id === 'm1' ? 'M-001' : 'M-002' } as any),
      );

      await service.handleAlertsCommand(ctx);

      expect(mockHelpers.formatAlertsMessage).toHaveBeenCalled();
    });

    it('should edit message if called from callback', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({ callbackQuery: { id: 'cb-1' } as any });
      incidentsService.findAll.mockResolvedValue([]);
      inventoryService.getMachinesLowStock.mockResolvedValue([]);

      await service.handleAlertsCommand(ctx);

      expect(ctx.editMessageText).toHaveBeenCalled();
    });

    it('should handle incident with no machine', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();
      incidentsService.findAll.mockResolvedValue([
        {
          id: 'inc-1',
          incident_type: null,
          machine: null,
          reported_at: new Date(),
        },
      ] as any);
      inventoryService.getMachinesLowStock.mockResolvedValue([]);

      await service.handleAlertsCommand(ctx);

      expect(mockHelpers.formatAlertsMessage).toHaveBeenCalled();
    });

    it('should format time correctly for incidents over 1 hour old', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      incidentsService.findAll.mockResolvedValue([
        {
          id: 'inc-1',
          incident_type: 'error',
          machine: { machine_number: 'M-001' },
          reported_at: twoHoursAgo,
        },
      ] as any);
      inventoryService.getMachinesLowStock.mockResolvedValue([]);

      await service.handleAlertsCommand(ctx);

      expect(mockHelpers.formatAlertsMessage).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            time: expect.stringContaining('h'),
          }),
        ]),
        TelegramLanguage.RU,
      );
    });

    it('should log command to database', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();
      incidentsService.findAll.mockResolvedValue([]);
      inventoryService.getMachinesLowStock.mockResolvedValue([]);

      await service.handleAlertsCommand(ctx);

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          command: '/alerts',
        }),
      );
    });
  });

  // ============================================================================
  // handleStatsCommand
  // ============================================================================

  describe('handleStatsCommand', () => {
    it('should do nothing if helpers not set', async () => {
      const ctx = createMockContext();

      await service.handleStatsCommand(ctx);

      expect(ctx.reply).not.toHaveBeenCalled();
    });

    it('should show not verified for unverified user', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({
        telegramUser: { ...mockTelegramUser, is_verified: false } as any,
      });

      await service.handleStatsCommand(ctx);

      expect(mockHelpers.t).toHaveBeenCalledWith(TelegramLanguage.RU, 'not_verified');
    });

    it('should show stats for verified user', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();
      machinesService.findAllSimple.mockResolvedValue([
        { status: 'active' },
        { status: 'active' },
        { status: 'offline' },
      ] as any);
      transactionsService.findAll.mockResolvedValue([
        { amount: 100 },
        { amount: 50 },
      ] as any);
      tasksService.findAll.mockResolvedValue([{ status: TaskStatus.PENDING }] as any);

      await service.handleStatsCommand(ctx);

      expect(ctx.replyWithChatAction).toHaveBeenCalledWith('typing');
      expect(mockHelpers.formatStatsMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          total_machines: 3,
          online: 2,
          offline: 1,
          today_revenue: 150,
          today_sales: 2,
          pending_tasks: 1,
        }),
        TelegramLanguage.RU,
      );
    });

    it('should edit message if called from callback', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({ callbackQuery: { id: 'cb-1' } as any });
      machinesService.findAllSimple.mockResolvedValue([]);

      await service.handleStatsCommand(ctx);

      expect(ctx.editMessageText).toHaveBeenCalled();
    });

    it('should handle transaction fetch error', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();
      machinesService.findAllSimple.mockResolvedValue([]);
      transactionsService.findAll.mockRejectedValue(new Error('DB error'));

      await service.handleStatsCommand(ctx);

      expect(mockHelpers.formatStatsMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          today_revenue: 0,
          today_sales: 0,
        }),
        TelegramLanguage.RU,
      );
    });

    it('should handle tasks fetch error', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();
      machinesService.findAllSimple.mockResolvedValue([]);
      tasksService.findAll.mockRejectedValue(new Error('DB error'));

      await service.handleStatsCommand(ctx);

      expect(mockHelpers.formatStatsMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          pending_tasks: 0,
        }),
        TelegramLanguage.RU,
      );
    });

    it('should count disabled machines as offline', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();
      machinesService.findAllSimple.mockResolvedValue([
        { status: 'disabled' },
      ] as any);

      await service.handleStatsCommand(ctx);

      expect(mockHelpers.formatStatsMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          offline: 1,
        }),
        TelegramLanguage.RU,
      );
    });

    it('should log command to database', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();
      machinesService.findAllSimple.mockResolvedValue([]);

      await service.handleStatsCommand(ctx);

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          command: '/stats',
        }),
      );
    });
  });

  // ============================================================================
  // handleTasksCommand
  // ============================================================================

  describe('handleTasksCommand', () => {
    it('should do nothing if helpers not set', async () => {
      const ctx = createMockContext();

      await service.handleTasksCommand(ctx);

      expect(ctx.reply).not.toHaveBeenCalled();
    });

    it('should show not verified for unverified user', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({
        telegramUser: { ...mockTelegramUser, is_verified: false } as any,
      });

      await service.handleTasksCommand(ctx);

      expect(mockHelpers.t).toHaveBeenCalledWith(TelegramLanguage.RU, 'not_verified');
    });

    it('should show user not found if user lookup fails', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();
      usersService.findByTelegramId.mockResolvedValue(null);

      await service.handleTasksCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Пользователь не найден'),
      );
    });

    it('should show user not found in English', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN } as any,
      });
      usersService.findByTelegramId.mockResolvedValue(null);

      await service.handleTasksCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('User not found'),
      );
    });

    it('should show no active tasks message', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();
      usersService.findByTelegramId.mockResolvedValue({ id: 'user-1' } as any);
      tasksService.findAll.mockResolvedValue([]);

      await service.handleTasksCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('нет активных задач'),
      );
    });

    it('should show no active tasks in English', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN } as any,
      });
      usersService.findByTelegramId.mockResolvedValue({ id: 'user-1' } as any);
      tasksService.findAll.mockResolvedValue([]);

      await service.handleTasksCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('no active tasks'),
      );
    });

    it('should show active tasks', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();
      usersService.findByTelegramId.mockResolvedValue({ id: 'user-1' } as any);
      tasksService.findAll.mockResolvedValue([
        { id: 't1', status: TaskStatus.PENDING },
        { id: 't2', status: TaskStatus.IN_PROGRESS },
        { id: 't3', status: TaskStatus.COMPLETED },
      ] as any);

      await service.handleTasksCommand(ctx);

      expect(ctx.replyWithChatAction).toHaveBeenCalledWith('typing');
      expect(mockHelpers.formatTasksMessage).toHaveBeenCalled();
      expect(mockHelpers.getTasksKeyboard).toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith('Tasks message', expect.any(Object));
    });

    it('should filter out completed tasks', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();
      usersService.findByTelegramId.mockResolvedValue({ id: 'user-1' } as any);
      tasksService.findAll.mockResolvedValue([
        { id: 't1', status: TaskStatus.COMPLETED },
        { id: 't2', status: TaskStatus.CANCELLED },
      ] as any);

      await service.handleTasksCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('нет активных задач'),
      );
    });

    it('should handle error and show error message', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();
      usersService.findByTelegramId.mockRejectedValue(new Error('DB error'));

      await service.handleTasksCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Не удалось загрузить'),
        expect.any(Object),
      );
    });

    it('should show error message in English', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN } as any,
      });
      usersService.findByTelegramId.mockRejectedValue(new Error('DB error'));

      await service.handleTasksCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Could not load task list'),
        expect.any(Object),
      );
    });

    it('should log command to database', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();
      usersService.findByTelegramId.mockResolvedValue({ id: 'user-1' } as any);
      tasksService.findAll.mockResolvedValue([]);

      await service.handleTasksCommand(ctx);

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          command: '/tasks',
        }),
      );
    });
  });

  // ============================================================================
  // handleHelpCommand
  // ============================================================================

  describe('handleHelpCommand', () => {
    it('should show help message', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();

      await service.handleHelpCommand(ctx);

      expect(mockHelpers.t).toHaveBeenCalledWith(TelegramLanguage.RU, 'help');
      expect(ctx.reply).toHaveBeenCalledWith('help', { parse_mode: 'HTML' });
    });

    it('should show help in English', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN } as any,
      });

      await service.handleHelpCommand(ctx);

      expect(mockHelpers.t).toHaveBeenCalledWith(TelegramLanguage.EN, 'help');
    });

    it('should default to Russian if no telegramUser', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({ telegramUser: undefined });

      await service.handleHelpCommand(ctx);

      expect(mockHelpers.t).toHaveBeenCalledWith(TelegramLanguage.RU, 'help');
    });
  });

  // ============================================================================
  // handleLanguageCommand
  // ============================================================================

  describe('handleLanguageCommand', () => {
    it('should show language selection', async () => {
      const ctx = createMockContext();

      await service.handleLanguageCommand(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        'Choose your language / Выберите язык:',
        expect.any(Object),
      );
    });

    it('should include language buttons', async () => {
      const ctx = createMockContext();
      const { Markup } = require('telegraf');

      await service.handleLanguageCommand(ctx);

      expect(Markup.button.callback).toHaveBeenCalledWith('🇷🇺 Русский', 'lang_ru');
      expect(Markup.button.callback).toHaveBeenCalledWith('🇬🇧 English', 'lang_en');
    });
  });

  // ============================================================================
  // logMessage edge cases
  // ============================================================================

  describe('logMessage edge cases', () => {
    it('should handle null telegramUser', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({ telegramUser: undefined });

      await service.handleMenuCommand(ctx);

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          telegram_user_id: null,
        }),
      );
    });

    it('should handle null chat', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({ chat: undefined });

      await service.handleMenuCommand(ctx);

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          chat_id: null,
        }),
      );
    });

    it('should handle missing message text', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({ message: undefined });

      await service.handleMenuCommand(ctx);

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message_text: '',
        }),
      );
    });

    it('should continue if logging fails', async () => {
      service.setHelpers(mockHelpers);
      telegramMessageLogRepository.save.mockRejectedValueOnce(new Error('DB error'));
      const ctx = createMockContext();

      await expect(service.handleMenuCommand(ctx)).resolves.not.toThrow();
      expect(ctx.reply).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // t helper edge cases
  // ============================================================================

  describe('t helper edge cases', () => {
    it('should return key if helpers not set', async () => {
      const ctx = createMockContext();

      // handleHelpCommand doesn't check for helpers, so it will call t without helpers
      await service.handleHelpCommand(ctx);

      // t returns the key when helpers not set
      expect(ctx.reply).toHaveBeenCalledWith('help', expect.any(Object));
    });
  });
});
