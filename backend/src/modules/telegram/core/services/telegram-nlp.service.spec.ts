import { Test, TestingModule } from '@nestjs/testing';
import { TelegramNlpService } from './telegram-nlp.service';
import { TelegramUser, TelegramLanguage } from '../../shared/entities/telegram-user.entity';
import { TelegramCacheService } from '../../infrastructure/services/telegram-cache.service';
import { TasksService } from '../../../tasks/tasks.service';
import { UsersService } from '../../../users/users.service';
import { MachinesService } from '../../../machines/machines.service';
import { TransactionsService } from '../../../transactions/transactions.service';
import { InventoryService } from '../../../inventory/inventory.service';
import { IncidentsService } from '../../../incidents/incidents.service';
import { TaskStatus, TaskType } from '../../../tasks/entities/task.entity';
import { MachineStatus } from '../../../machines/entities/machine.entity';
import { IncidentStatus } from '../../../incidents/entities/incident.entity';

describe('TelegramNlpService', () => {
  let service: TelegramNlpService;
  let tasksService: jest.Mocked<TasksService>;
  let usersService: jest.Mocked<UsersService>;
  let machinesService: jest.Mocked<MachinesService>;
  let transactionsService: jest.Mocked<TransactionsService>;
  let inventoryService: jest.Mocked<InventoryService>;
  let incidentsService: jest.Mocked<IncidentsService>;
  let cacheService: jest.Mocked<TelegramCacheService>;

  const mockTelegramUser: Partial<TelegramUser> = {
    id: 'tg-user-1',
    telegram_id: '123456789',
    user_id: 'user-1',
    is_verified: true,
    language: TelegramLanguage.RU,
  };

  const mockUser = {
    id: 'user-1',
    telegram_id: '123456789',
    full_name: 'Test User',
  };

  const mockCtx = {
    from: { id: 123456789 },
    chat: { id: 123456789 },
    telegramUser: mockTelegramUser,
    message: { text: '/ask сколько задач сегодня?' },
    reply: jest.fn().mockResolvedValue(undefined),
    replyWithChatAction: jest.fn().mockResolvedValue(undefined),
    answerCbQuery: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramNlpService,
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
            findByTelegramId: jest.fn(),
          },
        },
        {
          provide: MachinesService,
          useValue: {
            findAllSimple: jest.fn(),
            findOne: jest.fn(),
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
          provide: IncidentsService,
          useValue: {
            findAll: jest.fn(),
          },
        },
        {
          provide: TelegramCacheService,
          useValue: {
            getOrSet: jest.fn().mockImplementation((key, factory) => factory()),
          },
        },
      ],
    }).compile();

    service = module.get<TelegramNlpService>(TelegramNlpService);
    tasksService = module.get(TasksService);
    usersService = module.get(UsersService);
    machinesService = module.get(MachinesService);
    transactionsService = module.get(TransactionsService);
    inventoryService = module.get(InventoryService);
    incidentsService = module.get(IncidentsService);
    cacheService = module.get(TelegramCacheService);

    // Set up helpers
    service.setHelpers({
      t: (lang, key) => key,
      logMessage: jest.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleAskCommand', () => {
    it('should show help when no query provided', async () => {
      const ctx = {
        ...mockCtx,
        message: { text: '/ask' },
      };

      await service.handleAskCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalled();
      const replyCall = ctx.reply.mock.calls[0][0];
      expect(replyCall).toContain('Что можно спросить');
    });

    it('should require verification', async () => {
      const ctx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, is_verified: false },
      };

      await service.handleAskCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalledWith('not_verified');
    });

    it('should process tasks today query', async () => {
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.findAll.mockResolvedValue([
        {
          id: 'task-1',
          status: TaskStatus.COMPLETED,
          task_type: TaskType.REFILL,
          completed_at: new Date(),
        },
      ] as any);

      const ctx = {
        ...mockCtx,
        message: { text: '/ask сколько задач сегодня?' },
      };

      await service.handleAskCommand(ctx as any);

      expect(usersService.findByTelegramId).toHaveBeenCalled();
      expect(tasksService.findAll).toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalled();
    });

    it('should process pending tasks query', async () => {
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.findAll.mockResolvedValue([
        {
          id: 'task-1',
          status: TaskStatus.PENDING,
          task_type: TaskType.REFILL,
          machine: { machine_number: 'M-001' },
        },
        {
          id: 'task-2',
          status: TaskStatus.ASSIGNED,
          task_type: TaskType.COLLECTION,
          machine: { machine_number: 'M-002' },
        },
      ] as any);

      const ctx = {
        ...mockCtx,
        message: { text: '/ask какие задачи осталось сделать?' },
      };

      await service.handleAskCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalled();
    });

    it('should process machines status query', async () => {
      machinesService.findAllSimple.mockResolvedValue([
        { id: 'm1', status: MachineStatus.ACTIVE },
        { id: 'm2', status: MachineStatus.OFFLINE },
      ] as any);

      const ctx = {
        ...mockCtx,
        message: { text: '/ask статус аппаратов' },
      };

      await service.handleAskCommand(ctx as any);

      expect(cacheService.getOrSet).toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalled();
    });

    it('should process machines problems query', async () => {
      machinesService.findAllSimple.mockResolvedValue([
        { id: 'm1', status: MachineStatus.ERROR, machine_number: 'M-001', location: { name: 'Loc1' } },
        { id: 'm2', status: MachineStatus.OFFLINE, machine_number: 'M-002', location: { name: 'Loc2' } },
      ] as any);

      const ctx = {
        ...mockCtx,
        message: { text: '/ask какие аппараты с проблемами?' },
      };

      await service.handleAskCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalled();
    });

    it('should process revenue today query', async () => {
      transactionsService.findAll.mockResolvedValue([
        { id: 't1', amount: 100 },
        { id: 't2', amount: 200 },
      ] as any);

      const ctx = {
        ...mockCtx,
        message: { text: '/ask выручка за сегодня?' },
      };

      await service.handleAskCommand(ctx as any);

      expect(transactionsService.findAll).toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalled();
    });

    it('should process incidents query', async () => {
      incidentsService.findAll.mockResolvedValue([
        {
          id: 'inc-1',
          incident_type: 'breakdown',
          machine: { machine_number: 'M-001' },
          reported_at: new Date(),
        },
      ] as any);

      const ctx = {
        ...mockCtx,
        message: { text: '/ask открытые инциденты?' },
      };

      await service.handleAskCommand(ctx as any);

      expect(incidentsService.findAll).toHaveBeenCalledWith(IncidentStatus.OPEN, undefined);
      expect(ctx.reply).toHaveBeenCalled();
    });

    it('should handle unknown query', async () => {
      const ctx = {
        ...mockCtx,
        message: { text: '/ask какая-то непонятная фраза' },
      };

      await service.handleAskCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalled();
      const replyCall = ctx.reply.mock.calls[0][0];
      expect(replyCall).toContain('Не понял');
    });
  });

  describe('handleAskHelpCallback', () => {
    it('should show help message', async () => {
      const ctx = {
        ...mockCtx,
        answerCbQuery: jest.fn().mockResolvedValue(undefined),
      };

      await service.handleAskHelpCallback(ctx as any);

      expect(ctx.answerCbQuery).toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalled();
    });
  });

  describe('English language support', () => {
    it('should process English query', async () => {
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.findAll.mockResolvedValue([]);

      const ctx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN },
        message: { text: '/ask how many tasks today?' },
      };

      await service.handleAskCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalled();
    });

    it('should process machine problems in English', async () => {
      machinesService.findAllSimple.mockResolvedValue([]);

      const ctx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN },
        message: { text: '/ask which machines have problems?' },
      };

      await service.handleAskCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      usersService.findByTelegramId.mockRejectedValue(new Error('DB error'));

      const ctx = {
        ...mockCtx,
        message: { text: '/ask сколько задач сегодня?' },
      };

      await service.handleAskCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalled();
    });

    it('should handle user not found', async () => {
      usersService.findByTelegramId.mockResolvedValue(null);

      const ctx = {
        ...mockCtx,
        message: { text: '/ask моя статистика?' },
      };

      await service.handleAskCommand(ctx as any);

      expect(ctx.reply).toHaveBeenCalled();
    });
  });
});
