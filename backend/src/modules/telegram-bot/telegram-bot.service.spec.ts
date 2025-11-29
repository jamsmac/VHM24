import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { Repository } from 'typeorm';
import { TelegramBotService } from './telegram-bot.service';
import { User } from '../users/entities/user.entity';
import { Task, TaskStatus, TaskPriority, TaskType } from '../tasks/entities/task.entity';
import { Contract, ContractStatus, CommissionType } from '../counterparty/entities/contract.entity';
import {
  CommissionCalculation,
  PaymentStatus,
} from '../counterparty/entities/commission-calculation.entity';

// Mock Telegraf
jest.mock('telegraf', () => ({
  Telegraf: jest.fn().mockImplementation(() => ({
    command: jest.fn(),
    on: jest.fn(),
    catch: jest.fn(),
    launch: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn(),
    telegram: {
      sendMessage: jest.fn().mockResolvedValue(true),
    },
  })),
  Markup: {
    inlineKeyboard: jest.fn().mockReturnValue({}),
    button: {
      callback: jest.fn().mockReturnValue({}),
    },
  },
}));

describe('TelegramBotService', () => {
  let service: TelegramBotService;
  let mockUserRepository: jest.Mocked<Repository<User>>;
  let mockTaskRepository: jest.Mocked<Repository<Task>>;
  let mockContractRepository: jest.Mocked<Repository<Contract>>;
  let mockCommissionRepository: jest.Mocked<Repository<CommissionCalculation>>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockCommissionQueue: any;

  const mockUser: Partial<User> = {
    id: 'user-123',
    username: 'testuser',
    full_name: 'Test User',
    email: 'test@example.com',
    telegram_user_id: '123456789',
    role: 'OPERATOR' as any,
  };

  const mockTask: Partial<Task> = {
    id: 'task-123',
    type_code: TaskType.REFILL,
    status: TaskStatus.IN_PROGRESS,
    priority: TaskPriority.HIGH,
    machine_id: 'machine-123',
    assigned_to_user_id: 'user-123',
    due_date: new Date('2025-01-15'),
    description: 'Test task description',
    machine: {
      id: 'machine-123',
      machine_number: 'M-001',
    } as any,
    assigned_to: mockUser as User,
    items: [],
  };

  const mockContract: Partial<Contract> = {
    id: 'contract-123',
    contract_number: 'C-001',
    status: ContractStatus.ACTIVE,
    commission_type: CommissionType.PERCENTAGE,
    start_date: new Date('2025-01-01'),
    end_date: null,
    counterparty: {
      id: 'cp-123',
      name: 'Test Counterparty',
    } as any,
  };

  const mockCommission: Partial<CommissionCalculation> = {
    id: 'comm-123',
    contract_id: 'contract-123',
    commission_amount: 150000,
    payment_status: PaymentStatus.OVERDUE,
    payment_due_date: new Date('2025-01-01'),
    contract: mockContract as Contract,
  };

  beforeEach(async () => {
    mockUserRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as any;

    mockTaskRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
    } as any;

    mockContractRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    } as any;

    mockCommissionRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ sum: '500000' }),
      }),
    } as any;

    mockConfigService = {
      get: jest.fn(),
    } as any;

    mockCommissionQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-123' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramBotService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
        {
          provide: getRepositoryToken(Contract),
          useValue: mockContractRepository,
        },
        {
          provide: getRepositoryToken(CommissionCalculation),
          useValue: mockCommissionRepository,
        },
        {
          provide: getQueueToken('commission-calculations'),
          useValue: mockCommissionQueue,
        },
      ],
    }).compile();

    service = module.get<TelegramBotService>(TelegramBotService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should log warning when TELEGRAM_BOT_TOKEN is not configured', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue(undefined);
      const loggerWarnSpy = jest.spyOn((service as any).logger, 'warn');

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockConfigService.get).toHaveBeenCalledWith('TELEGRAM_BOT_TOKEN');
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'TELEGRAM_BOT_TOKEN not configured. Bot is disabled.',
      );
    });

    it('should initialize and launch bot when token is configured', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue('test-token-123');
      const loggerLogSpy = jest.spyOn((service as any).logger, 'log');

      // Act
      await service.onModuleInit();

      // Assert
      expect(mockConfigService.get).toHaveBeenCalledWith('TELEGRAM_BOT_TOKEN');
      expect(loggerLogSpy).toHaveBeenCalledWith('Telegram Bot launched successfully');
    });

    it('should log error when bot launch fails', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue('test-token-123');
      const { Telegraf } = require('telegraf');
      Telegraf.mockImplementationOnce(() => ({
        command: jest.fn(),
        on: jest.fn(),
        catch: jest.fn(),
        launch: jest.fn().mockRejectedValue(new Error('Network error')),
        stop: jest.fn(),
      }));

      // Re-create service with failing bot
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TelegramBotService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: getRepositoryToken(User), useValue: mockUserRepository },
          { provide: getRepositoryToken(Task), useValue: mockTaskRepository },
          { provide: getRepositoryToken(Contract), useValue: mockContractRepository },
          {
            provide: getRepositoryToken(CommissionCalculation),
            useValue: mockCommissionRepository,
          },
          { provide: getQueueToken('commission-calculations'), useValue: mockCommissionQueue },
        ],
      }).compile();

      const failingService = module.get<TelegramBotService>(TelegramBotService);
      const loggerErrorSpy = jest.spyOn((failingService as any).logger, 'error');

      // Act
      await failingService.onModuleInit();

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to launch Telegram Bot'),
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('should stop bot when it exists', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue('test-token-123');
      await service.onModuleInit();
      const loggerLogSpy = jest.spyOn((service as any).logger, 'log');

      // Act
      await service.onModuleDestroy();

      // Assert
      expect(loggerLogSpy).toHaveBeenCalledWith('Telegram Bot stopped');
    });

    it('should do nothing when bot does not exist', async () => {
      // Arrange - bot not initialized (no token)
      mockConfigService.get.mockReturnValue(undefined);
      await service.onModuleInit();

      // Act & Assert - should not throw
      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });
  });

  describe('handleMyTasks', () => {
    let mockCtx: any;

    beforeEach(() => {
      mockCtx = {
        reply: jest.fn().mockResolvedValue(undefined),
        from: { id: 123456789 },
      };
    });

    it('should return error message when user account is not linked', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(null);

      // Act
      await (service as any).handleMyTasks(mockCtx, 123456789);

      // Assert
      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Аккаунт не привязан'));
    });

    it('should return success message when no active tasks', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(mockUser as User);
      mockTaskRepository.find.mockResolvedValue([]);

      // Act
      await (service as any).handleMyTasks(mockCtx, 123456789);

      // Assert
      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('нет активных задач'));
    });

    it('should display list of active tasks for linked user', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(mockUser as User);
      mockTaskRepository.find.mockResolvedValue([mockTask as Task]);

      // Act
      await (service as any).handleMyTasks(mockCtx, 123456789);

      // Assert
      expect(mockTaskRepository.find).toHaveBeenCalledWith({
        where: {
          assigned_to_user_id: mockUser.id,
          status: TaskStatus.IN_PROGRESS,
        },
        relations: ['machine'],
        order: { due_date: 'ASC' },
      });
      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Ваши активные задачи'), {
        parse_mode: 'Markdown',
      });
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockUserRepository.findOne.mockRejectedValue(new Error('Database error'));
      const loggerErrorSpy = jest.spyOn((service as any).logger, 'error');

      // Act
      await (service as any).handleMyTasks(mockCtx, 123456789);

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalledWith(expect.stringContaining('handleMyTasks error'));
      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Ошибка'));
    });
  });

  describe('handleTaskDetails', () => {
    let mockCtx: any;

    beforeEach(() => {
      mockCtx = {
        reply: jest.fn().mockResolvedValue(undefined),
      };
    });

    it('should return error when task not found', async () => {
      // Arrange
      mockTaskRepository.findOne.mockResolvedValue(null);

      // Act
      await (service as any).handleTaskDetails(mockCtx, 'non-existent-id');

      // Assert
      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Задача не найдена'));
    });

    it('should display task details when found', async () => {
      // Arrange
      mockTaskRepository.findOne.mockResolvedValue(mockTask as Task);

      // Act
      await (service as any).handleTaskDetails(mockCtx, 'task-123');

      // Assert
      expect(mockTaskRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'task-123' },
        relations: ['machine', 'assigned_to', 'items'],
      });
      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Задача'), {
        parse_mode: 'Markdown',
      });
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockTaskRepository.findOne.mockRejectedValue(new Error('Database error'));
      const loggerErrorSpy = jest.spyOn((service as any).logger, 'error');

      // Act
      await (service as any).handleTaskDetails(mockCtx, 'task-123');

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalled();
      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Ошибка'));
    });
  });

  describe('handleStats', () => {
    let mockCtx: any;

    beforeEach(() => {
      mockCtx = {
        reply: jest.fn().mockResolvedValue(undefined),
        from: { id: 123456789 },
      };
    });

    it('should return error when user not linked', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(null);

      // Act
      await (service as any).handleStats(mockCtx, 123456789);

      // Assert
      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Аккаунт не привязан'));
    });

    it('should display user statistics', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(mockUser as User);
      mockTaskRepository.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(75) // completed
        .mockResolvedValueOnce(10) // in_progress
        .mockResolvedValueOnce(15); // pending

      // Act
      await (service as any).handleStats(mockCtx, 123456789);

      // Assert
      expect(mockTaskRepository.count).toHaveBeenCalledTimes(4);
      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Ваша статистика'), {
        parse_mode: 'Markdown',
      });
    });

    it('should calculate completion rate correctly', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(mockUser as User);
      mockTaskRepository.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(75) // completed
        .mockResolvedValueOnce(10) // in_progress
        .mockResolvedValueOnce(15); // pending

      // Act
      await (service as any).handleStats(mockCtx, 123456789);

      // Assert
      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('75.0%'), {
        parse_mode: 'Markdown',
      });
    });

    it('should handle zero tasks gracefully', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(mockUser as User);
      mockTaskRepository.count.mockResolvedValue(0);

      // Act
      await (service as any).handleStats(mockCtx, 123456789);

      // Assert
      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('0%'), {
        parse_mode: 'Markdown',
      });
    });
  });

  describe('handleCommissions', () => {
    let mockCtx: any;

    beforeEach(() => {
      mockCtx = {
        reply: jest.fn().mockResolvedValue(undefined),
        from: { id: 123456789 },
      };
    });

    it('should return error when user not linked', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(null);

      // Act
      await (service as any).handleCommissions(mockCtx, 123456789);

      // Assert
      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Аккаунт не привязан'));
    });

    it('should display commission statistics', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(mockUser as User);
      mockCommissionRepository.count
        .mockResolvedValueOnce(5) // pending
        .mockResolvedValueOnce(10) // paid
        .mockResolvedValueOnce(2) // overdue
        .mockResolvedValueOnce(17); // total

      // Act
      await (service as any).handleCommissions(mockCtx, 123456789);

      // Assert
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Статус комиссий'),
        expect.objectContaining({ parse_mode: 'Markdown' }),
      );
    });
  });

  describe('handleOverduePayments', () => {
    let mockCtx: any;

    beforeEach(() => {
      mockCtx = {
        reply: jest.fn().mockResolvedValue(undefined),
        from: { id: 123456789 },
      };
    });

    it('should return error when user not linked', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(null);

      // Act
      await (service as any).handleOverduePayments(mockCtx, 123456789);

      // Assert
      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Аккаунт не привязан'));
    });

    it('should return success message when no overdue payments', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(mockUser as User);
      mockCommissionRepository.find.mockResolvedValue([]);

      // Act
      await (service as any).handleOverduePayments(mockCtx, 123456789);

      // Assert
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Нет просроченных платежей'),
      );
    });

    it('should display overdue payments list', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(mockUser as User);
      mockCommissionRepository.find.mockResolvedValue([mockCommission as CommissionCalculation]);

      // Act
      await (service as any).handleOverduePayments(mockCtx, 123456789);

      // Assert
      expect(mockCommissionRepository.find).toHaveBeenCalledWith({
        where: { payment_status: PaymentStatus.OVERDUE },
        relations: ['contract', 'contract.counterparty'],
        order: { payment_due_date: 'ASC' },
        take: 10,
      });
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Просроченные платежи'),
        expect.objectContaining({ parse_mode: 'Markdown' }),
      );
    });
  });

  describe('handleCalculateCommissions', () => {
    let mockCtx: any;

    beforeEach(() => {
      mockCtx = {
        reply: jest.fn().mockResolvedValue(undefined),
        from: { id: 123456789 },
      };
    });

    it('should return error when user not linked', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(null);

      // Act
      await (service as any).handleCalculateCommissions(mockCtx, 123456789);

      // Assert
      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Аккаунт не привязан'));
    });

    it('should display period selection keyboard', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(mockUser as User);

      // Act
      await (service as any).handleCalculateCommissions(mockCtx, 123456789);

      // Assert
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Запуск расчета комиссий'),
        expect.objectContaining({ parse_mode: 'Markdown' }),
      );
    });
  });

  describe('handleContracts', () => {
    let mockCtx: any;

    beforeEach(() => {
      mockCtx = {
        reply: jest.fn().mockResolvedValue(undefined),
        from: { id: 123456789 },
      };
    });

    it('should return error when user not linked', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(null);

      // Act
      await (service as any).handleContracts(mockCtx, 123456789);

      // Assert
      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Аккаунт не привязан'));
    });

    it('should return message when no active contracts', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(mockUser as User);
      mockContractRepository.find.mockResolvedValue([]);

      // Act
      await (service as any).handleContracts(mockCtx, 123456789);

      // Assert
      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Нет активных договоров'));
    });

    it('should display active contracts list', async () => {
      // Arrange
      mockUserRepository.findOne.mockResolvedValue(mockUser as User);
      mockContractRepository.find.mockResolvedValue([mockContract as Contract]);

      // Act
      await (service as any).handleContracts(mockCtx, 123456789);

      // Assert
      expect(mockContractRepository.find).toHaveBeenCalledWith({
        where: { status: ContractStatus.ACTIVE },
        relations: ['counterparty'],
        order: { created_at: 'DESC' },
        take: 10,
      });
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Активные договоры'),
        expect.objectContaining({ parse_mode: 'Markdown' }),
      );
    });
  });

  describe('handleCallbackQuery', () => {
    let mockCtx: any;

    beforeEach(() => {
      mockCtx = {
        reply: jest.fn().mockResolvedValue(undefined),
        answerCbQuery: jest.fn().mockResolvedValue(undefined),
        from: { id: 123456789 },
        callbackQuery: { data: '' },
      };
    });

    it('should do nothing when callbackData is undefined', async () => {
      // Arrange
      mockCtx.callbackQuery = undefined;

      // Act
      await (service as any).handleCallbackQuery(mockCtx);

      // Assert
      expect(mockCtx.answerCbQuery).not.toHaveBeenCalled();
    });

    it('should answer callback query and handle refresh_commissions', async () => {
      // Arrange
      mockCtx.callbackQuery = { data: 'refresh_commissions' };
      mockUserRepository.findOne.mockResolvedValue(mockUser as User);
      mockCommissionRepository.count.mockResolvedValue(0);

      // Act
      await (service as any).handleCallbackQuery(mockCtx);

      // Assert
      expect(mockCtx.answerCbQuery).toHaveBeenCalled();
    });

    it('should handle view_overdue callback', async () => {
      // Arrange
      mockCtx.callbackQuery = { data: 'view_overdue' };
      mockUserRepository.findOne.mockResolvedValue(mockUser as User);
      mockCommissionRepository.find.mockResolvedValue([]);

      // Act
      await (service as any).handleCallbackQuery(mockCtx);

      // Assert
      expect(mockCtx.answerCbQuery).toHaveBeenCalled();
    });

    it('should handle calc_daily callback and trigger calculation', async () => {
      // Arrange
      mockCtx.callbackQuery = { data: 'calc_daily' };

      // Act
      await (service as any).handleCallbackQuery(mockCtx);

      // Assert
      expect(mockCommissionQueue.add).toHaveBeenCalledWith('calculate-manual', { period: 'daily' });
    });

    it('should handle send_reminders callback', async () => {
      // Arrange
      mockCtx.callbackQuery = { data: 'send_reminders' };

      // Act
      await (service as any).handleCallbackQuery(mockCtx);

      // Assert
      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Напоминания отправлены'));
    });

    it('should handle cancel callback', async () => {
      // Arrange
      mockCtx.callbackQuery = { data: 'cancel' };

      // Act
      await (service as any).handleCallbackQuery(mockCtx);

      // Assert
      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Отменено'));
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockCtx.callbackQuery = { data: 'view_contracts' };
      mockUserRepository.findOne.mockRejectedValue(new Error('Database error'));
      const loggerErrorSpy = jest.spyOn((service as any).logger, 'error');

      // Act
      await (service as any).handleCallbackQuery(mockCtx);

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalled();
      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Ошибка'));
    });
  });

  describe('sendNotification', () => {
    beforeEach(async () => {
      mockConfigService.get.mockReturnValue('test-token-123');
      await service.onModuleInit();
    });

    it('should return false when bot is not enabled', async () => {
      // Arrange
      mockConfigService.get.mockReturnValue(undefined);
      const disabledService = new TelegramBotService(
        mockConfigService as any,
        mockUserRepository as any,
        mockTaskRepository as any,
        mockContractRepository as any,
        mockCommissionRepository as any,
        mockCommissionQueue,
      );

      // Act
      const result = await disabledService.sendNotification(123456789, 'Test message');

      // Assert
      expect(result).toBe(false);
    });

    it('should send notification successfully', async () => {
      // Act
      const result = await service.sendNotification(123456789, 'Test message');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false and log error on failure', async () => {
      // Arrange
      const { Telegraf } = require('telegraf');
      Telegraf.mockImplementationOnce(() => ({
        command: jest.fn(),
        on: jest.fn(),
        catch: jest.fn(),
        launch: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn(),
        telegram: {
          sendMessage: jest.fn().mockRejectedValue(new Error('Send failed')),
        },
      }));

      // Re-create service with failing telegram
      mockConfigService.get.mockReturnValue('test-token-123');
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          TelegramBotService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: getRepositoryToken(User), useValue: mockUserRepository },
          { provide: getRepositoryToken(Task), useValue: mockTaskRepository },
          { provide: getRepositoryToken(Contract), useValue: mockContractRepository },
          {
            provide: getRepositoryToken(CommissionCalculation),
            useValue: mockCommissionRepository,
          },
          { provide: getQueueToken('commission-calculations'), useValue: mockCommissionQueue },
        ],
      }).compile();

      const failingService = module.get<TelegramBotService>(TelegramBotService);
      await failingService.onModuleInit();

      // Act
      const result = await failingService.sendNotification(123456789, 'Test message');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('notifyTaskAssigned', () => {
    beforeEach(async () => {
      mockConfigService.get.mockReturnValue('test-token-123');
      await service.onModuleInit();
    });

    it('should send task assignment notification', async () => {
      // Arrange
      const task = {
        ...mockTask,
        machine: { machine_number: 'M-001' },
      } as Task;

      // Act
      const result = await service.notifyTaskAssigned(task, 123456789);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('notifyTaskOverdue', () => {
    beforeEach(async () => {
      mockConfigService.get.mockReturnValue('test-token-123');
      await service.onModuleInit();
    });

    it('should send task overdue notification', async () => {
      // Arrange
      const task = {
        ...mockTask,
        machine: { machine_number: 'M-001' },
      } as Task;

      // Act
      const result = await service.notifyTaskOverdue(task, 123456789, 24);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('Helper methods', () => {
    describe('getPriorityEmoji', () => {
      it('should return green emoji for low priority', () => {
        const result = (service as any).getPriorityEmoji('low');
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });

      it('should return yellow emoji for normal priority', () => {
        const result = (service as any).getPriorityEmoji('normal');
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });

      it('should return orange emoji for high priority', () => {
        const result = (service as any).getPriorityEmoji('high');
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });

      it('should return red emoji for urgent priority', () => {
        const result = (service as any).getPriorityEmoji('urgent');
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });

      it('should return default emoji for unknown priority', () => {
        const result = (service as any).getPriorityEmoji('unknown');
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });
    });

    describe('getStatusEmoji', () => {
      it('should return emoji for pending status', () => {
        const result = (service as any).getStatusEmoji(TaskStatus.PENDING);
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });

      it('should return emoji for in_progress status', () => {
        const result = (service as any).getStatusEmoji(TaskStatus.IN_PROGRESS);
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });

      it('should return emoji for completed status', () => {
        const result = (service as any).getStatusEmoji(TaskStatus.COMPLETED);
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });

      it('should return emoji for cancelled status', () => {
        const result = (service as any).getStatusEmoji(TaskStatus.CANCELLED);
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });
    });

    describe('formatCurrency', () => {
      it('should format currency correctly in UZS', () => {
        const result = (service as any).formatCurrency(150000);
        expect(result).toContain('150');
        expect(result).toContain('000');
      });

      it('should format zero amount', () => {
        const result = (service as any).formatCurrency(0);
        expect(result).toContain('0');
      });

      it('should format large amounts', () => {
        const result = (service as any).formatCurrency(1000000000);
        expect(result).toBeDefined();
      });
    });
  });

  describe('triggerCalculation', () => {
    let mockCtx: any;

    beforeEach(() => {
      mockCtx = {
        reply: jest.fn().mockResolvedValue(undefined),
      };
    });

    it('should add job to commission queue', async () => {
      // Act
      await (service as any).triggerCalculation(mockCtx, 'daily');

      // Assert
      expect(mockCommissionQueue.add).toHaveBeenCalledWith('calculate-manual', { period: 'daily' });
      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Расчет'), {
        parse_mode: 'Markdown',
      });
    });

    it('should handle queue errors gracefully', async () => {
      // Arrange
      mockCommissionQueue.add.mockRejectedValue(new Error('Queue error'));
      const loggerErrorSpy = jest.spyOn((service as any).logger, 'error');

      // Act
      await (service as any).triggerCalculation(mockCtx, 'monthly');

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalled();
      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('Ошибка'));
    });

    it('should use correct period label for weekly', async () => {
      // Act
      await (service as any).triggerCalculation(mockCtx, 'weekly');

      // Assert
      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('недельных'), {
        parse_mode: 'Markdown',
      });
    });

    it('should use correct period label for all', async () => {
      // Act
      await (service as any).triggerCalculation(mockCtx, 'all');

      // Assert
      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining('всех'), {
        parse_mode: 'Markdown',
      });
    });
  });

  describe('sendOverdueSummary', () => {
    beforeEach(async () => {
      mockConfigService.get.mockReturnValue('test-token-123');
      await service.onModuleInit();
    });

    it('should return early when no overdue commissions', async () => {
      // Arrange
      mockCommissionRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.sendOverdueSummary(123456789);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should send summary when overdue commissions exist', async () => {
      // Arrange
      mockCommissionRepository.find.mockResolvedValue([
        {
          ...mockCommission,
          contract: {
            ...mockContract,
            counterparty: { name: 'Test Counterparty' },
          },
        } as CommissionCalculation,
      ]);

      // Act
      const result = await service.sendOverdueSummary(123456789);

      // Assert
      expect(result).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockCommissionRepository.find.mockRejectedValue(new Error('Database error'));
      const loggerErrorSpy = jest.spyOn((service as any).logger, 'error');

      // Act
      const result = await service.sendOverdueSummary(123456789);

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe('notifyCalculationCompleted', () => {
    beforeEach(async () => {
      mockConfigService.get.mockReturnValue('test-token-123');
      await service.onModuleInit();
    });

    it('should send calculation completed notification', async () => {
      // Act
      const result = await service.notifyCalculationCompleted('job-123', 'daily', 10, 123456789);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('notifyCalculationFailed', () => {
    beforeEach(async () => {
      mockConfigService.get.mockReturnValue('test-token-123');
      await service.onModuleInit();
    });

    it('should send calculation failed notification', async () => {
      // Act
      const result = await service.notifyCalculationFailed(
        'job-123',
        'daily',
        'Processing error',
        123456789,
      );

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('notifyOverduePayment', () => {
    beforeEach(async () => {
      mockConfigService.get.mockReturnValue('test-token-123');
      await service.onModuleInit();
    });

    it('should send overdue payment notification', async () => {
      // Arrange
      const commission = {
        ...mockCommission,
        contract: {
          counterparty: { name: 'Test Counterparty' },
        },
      } as CommissionCalculation;

      // Act
      const result = await service.notifyOverduePayment(commission, 123456789);

      // Assert
      expect(result).toBe(true);
    });
  });
});
