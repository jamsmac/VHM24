import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramSprint3Service } from './telegram-sprint3.service';
import { TelegramUser, TelegramLanguage } from '../../shared/entities/telegram-user.entity';
import { TelegramMessageLog, TelegramMessageType } from '../../shared/entities/telegram-message-log.entity';
import { TelegramSessionService, ConversationState } from '../../infrastructure/services/telegram-session.service';
import { TelegramManagerToolsService } from '../../managers/services/telegram-manager-tools.service';
import { UsersService } from '../../../users/users.service';
import { UserRole } from '../../../users/entities/user.entity';
import { MachinesService } from '../../../machines/machines.service';
import { InventoryService } from '../../../inventory/inventory.service';
import { TasksService } from '../../../tasks/tasks.service';
import { TaskType, TaskStatus } from '../../../tasks/entities/task.entity';

describe('TelegramSprint3Service', () => {
  let service: TelegramSprint3Service;
  let usersService: jest.Mocked<UsersService>;
  let machinesService: jest.Mocked<MachinesService>;
  let inventoryService: jest.Mocked<InventoryService>;
  let tasksService: jest.Mocked<TasksService>;
  let managerToolsService: jest.Mocked<TelegramManagerToolsService>;

  const mockTelegramUser: Partial<TelegramUser> = {
    id: 'tg-user-1',
    telegram_id: '123456789',
    user_id: 'user-1',
    chat_id: '123456789',
    is_verified: true,
    language: TelegramLanguage.RU,
    notification_preferences: {},
  };

  const mockUser = {
    id: 'user-1',
    telegram_id: '123456789',
    full_name: 'Test User',
    role: UserRole.OPERATOR,
  };

  const mockMachine = {
    id: 'machine-1',
    machine_number: 'M-001',
    name: 'Test Machine',
    location: { name: 'Test Location' },
  };

  const mockCtx = {
    from: { id: 123456789 },
    chat: { id: 123456789 },
    telegramUser: mockTelegramUser,
    session: {
      userId: 'user-1',
      state: ConversationState.IDLE,
      context: {},
    },
    message: { text: '/test' },
    reply: jest.fn().mockResolvedValue(undefined),
    editMessageText: jest.fn().mockResolvedValue(undefined),
    answerCbQuery: jest.fn().mockResolvedValue(undefined),
    replyWithChatAction: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramSprint3Service,
        {
          provide: getRepositoryToken(TelegramUser),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TelegramMessageLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: TelegramSessionService,
          useValue: {
            getSession: jest.fn(),
            saveSession: jest.fn(),
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
          provide: InventoryService,
          useValue: {
            getMachineInventory: jest.fn(),
          },
        },
        {
          provide: TasksService,
          useValue: {
            findAll: jest.fn(),
          },
        },
        {
          provide: TelegramManagerToolsService,
          useValue: {
            getActiveOperatorsStatus: jest.fn(),
            formatOperatorsStatusMessage: jest.fn(),
            getTeamAnalytics: jest.fn(),
            formatAnalyticsMessage: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TelegramSprint3Service>(TelegramSprint3Service);
    usersService = module.get(UsersService);
    machinesService = module.get(MachinesService);
    inventoryService = module.get(InventoryService);
    tasksService = module.get(TasksService);
    managerToolsService = module.get(TelegramManagerToolsService);

    // Initialize helpers
    service.setHelpers({
      t: (lang, key) => key,
      logMessage: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // getTaskTypeEmoji tests
  // ============================================================================

  describe('getTaskTypeEmoji', () => {
    it('should return correct emoji for REFILL', () => {
      const emoji = service.getTaskTypeEmoji(TaskType.REFILL);
      expect(emoji).toBe('📦');
    });

    it('should return correct emoji for COLLECTION', () => {
      const emoji = service.getTaskTypeEmoji(TaskType.COLLECTION);
      expect(emoji).toBe('💰');
    });

    it('should return correct emoji for CLEANING', () => {
      const emoji = service.getTaskTypeEmoji(TaskType.CLEANING);
      expect(emoji).toBe('🧹');
    });

    it('should return correct emoji for REPAIR', () => {
      const emoji = service.getTaskTypeEmoji(TaskType.REPAIR);
      expect(emoji).toBe('🔧');
    });

    it('should return correct emoji for INSTALL', () => {
      const emoji = service.getTaskTypeEmoji(TaskType.INSTALL);
      expect(emoji).toBe('🔌');
    });

    it('should return correct emoji for REMOVAL', () => {
      const emoji = service.getTaskTypeEmoji(TaskType.REMOVAL);
      expect(emoji).toBe('📤');
    });

    it('should return correct emoji for AUDIT', () => {
      const emoji = service.getTaskTypeEmoji(TaskType.AUDIT);
      expect(emoji).toBe('📊');
    });

    it('should return correct emoji for INSPECTION', () => {
      const emoji = service.getTaskTypeEmoji(TaskType.INSPECTION);
      expect(emoji).toBe('🔍');
    });

    it('should return correct emoji for REPLACE_HOPPER', () => {
      const emoji = service.getTaskTypeEmoji(TaskType.REPLACE_HOPPER);
      expect(emoji).toBe('🥤');
    });

    it('should return correct emoji for REPLACE_GRINDER', () => {
      const emoji = service.getTaskTypeEmoji(TaskType.REPLACE_GRINDER);
      expect(emoji).toBe('⚙️');
    });

    it('should return correct emoji for REPLACE_BREW_UNIT', () => {
      const emoji = service.getTaskTypeEmoji(TaskType.REPLACE_BREW_UNIT);
      expect(emoji).toBe('☕');
    });

    it('should return correct emoji for REPLACE_MIXER', () => {
      const emoji = service.getTaskTypeEmoji(TaskType.REPLACE_MIXER);
      expect(emoji).toBe('🔄');
    });

    it('should return default emoji for unknown type', () => {
      const emoji = service.getTaskTypeEmoji('unknown_type' as TaskType);
      expect(emoji).toBe('📌');
    });
  });

  // ============================================================================
  // getTaskTypeLabel tests
  // ============================================================================

  describe('getTaskTypeLabel', () => {
    it('should return Russian label for REFILL', () => {
      const label = service.getTaskTypeLabel(TaskType.REFILL, TelegramLanguage.RU);
      expect(label).toBe('Пополнение');
    });

    it('should return English label for REFILL', () => {
      const label = service.getTaskTypeLabel(TaskType.REFILL, TelegramLanguage.EN);
      expect(label).toBe('Refill');
    });

    it('should return Russian label for COLLECTION', () => {
      const label = service.getTaskTypeLabel(TaskType.COLLECTION, TelegramLanguage.RU);
      expect(label).toBe('Инкассация');
    });

    it('should return English label for COLLECTION', () => {
      const label = service.getTaskTypeLabel(TaskType.COLLECTION, TelegramLanguage.EN);
      expect(label).toBe('Collection');
    });

    it('should return Russian label for CLEANING', () => {
      const label = service.getTaskTypeLabel(TaskType.CLEANING, TelegramLanguage.RU);
      expect(label).toBe('Чистка');
    });

    it('should return English label for CLEANING', () => {
      const label = service.getTaskTypeLabel(TaskType.CLEANING, TelegramLanguage.EN);
      expect(label).toBe('Cleaning');
    });

    it('should return Russian label for REPAIR', () => {
      const label = service.getTaskTypeLabel(TaskType.REPAIR, TelegramLanguage.RU);
      expect(label).toBe('Ремонт');
    });

    it('should return English label for REPAIR', () => {
      const label = service.getTaskTypeLabel(TaskType.REPAIR, TelegramLanguage.EN);
      expect(label).toBe('Repair');
    });

    it('should return Russian label for INSTALL', () => {
      const label = service.getTaskTypeLabel(TaskType.INSTALL, TelegramLanguage.RU);
      expect(label).toBe('Установка');
    });

    it('should return English label for INSTALL', () => {
      const label = service.getTaskTypeLabel(TaskType.INSTALL, TelegramLanguage.EN);
      expect(label).toBe('Installation');
    });

    it('should return Russian label for REMOVAL', () => {
      const label = service.getTaskTypeLabel(TaskType.REMOVAL, TelegramLanguage.RU);
      expect(label).toBe('Демонтаж');
    });

    it('should return English label for REMOVAL', () => {
      const label = service.getTaskTypeLabel(TaskType.REMOVAL, TelegramLanguage.EN);
      expect(label).toBe('Removal');
    });

    it('should return Russian label for AUDIT', () => {
      const label = service.getTaskTypeLabel(TaskType.AUDIT, TelegramLanguage.RU);
      expect(label).toBe('Аудит');
    });

    it('should return English label for AUDIT', () => {
      const label = service.getTaskTypeLabel(TaskType.AUDIT, TelegramLanguage.EN);
      expect(label).toBe('Audit');
    });

    it('should return Russian label for INSPECTION', () => {
      const label = service.getTaskTypeLabel(TaskType.INSPECTION, TelegramLanguage.RU);
      expect(label).toBe('Проверка');
    });

    it('should return English label for INSPECTION', () => {
      const label = service.getTaskTypeLabel(TaskType.INSPECTION, TelegramLanguage.EN);
      expect(label).toBe('Inspection');
    });

    it('should return Russian label for REPLACE_HOPPER', () => {
      const label = service.getTaskTypeLabel(TaskType.REPLACE_HOPPER, TelegramLanguage.RU);
      expect(label).toBe('Замена хоппера');
    });

    it('should return English label for REPLACE_HOPPER', () => {
      const label = service.getTaskTypeLabel(TaskType.REPLACE_HOPPER, TelegramLanguage.EN);
      expect(label).toBe('Hopper replacement');
    });

    it('should return Russian label for REPLACE_GRINDER', () => {
      const label = service.getTaskTypeLabel(TaskType.REPLACE_GRINDER, TelegramLanguage.RU);
      expect(label).toBe('Замена кофемолки');
    });

    it('should return English label for REPLACE_GRINDER', () => {
      const label = service.getTaskTypeLabel(TaskType.REPLACE_GRINDER, TelegramLanguage.EN);
      expect(label).toBe('Grinder replacement');
    });

    it('should return Russian label for REPLACE_BREW_UNIT', () => {
      const label = service.getTaskTypeLabel(TaskType.REPLACE_BREW_UNIT, TelegramLanguage.RU);
      expect(label).toBe('Замена заварника');
    });

    it('should return English label for REPLACE_BREW_UNIT', () => {
      const label = service.getTaskTypeLabel(TaskType.REPLACE_BREW_UNIT, TelegramLanguage.EN);
      expect(label).toBe('Brew unit replacement');
    });

    it('should return Russian label for REPLACE_MIXER', () => {
      const label = service.getTaskTypeLabel(TaskType.REPLACE_MIXER, TelegramLanguage.RU);
      expect(label).toBe('Замена миксера');
    });

    it('should return English label for REPLACE_MIXER', () => {
      const label = service.getTaskTypeLabel(TaskType.REPLACE_MIXER, TelegramLanguage.EN);
      expect(label).toBe('Mixer replacement');
    });

    it('should return type itself for unknown type', () => {
      const label = service.getTaskTypeLabel('unknown_type' as TaskType, TelegramLanguage.RU);
      expect(label).toBe('unknown_type');
    });
  });

  // ============================================================================
  // getIncidentTypeLabel tests
  // ============================================================================

  describe('getIncidentTypeLabel', () => {
    it('should return Russian label for breakdown', () => {
      const label = service.getIncidentTypeLabel('breakdown', TelegramLanguage.RU);
      expect(label).toBe('Поломка');
    });

    it('should return English label for breakdown', () => {
      const label = service.getIncidentTypeLabel('breakdown', TelegramLanguage.EN);
      expect(label).toBe('Breakdown');
    });

    it('should return Russian label for offline', () => {
      const label = service.getIncidentTypeLabel('offline', TelegramLanguage.RU);
      expect(label).toBe('Офлайн');
    });

    it('should return English label for offline', () => {
      const label = service.getIncidentTypeLabel('offline', TelegramLanguage.EN);
      expect(label).toBe('Offline');
    });

    it('should return Russian label for out_of_stock', () => {
      const label = service.getIncidentTypeLabel('out_of_stock', TelegramLanguage.RU);
      expect(label).toBe('Нет товара');
    });

    it('should return English label for out_of_stock', () => {
      const label = service.getIncidentTypeLabel('out_of_stock', TelegramLanguage.EN);
      expect(label).toBe('Out of stock');
    });

    it('should return Russian label for leak', () => {
      const label = service.getIncidentTypeLabel('leak', TelegramLanguage.RU);
      expect(label).toBe('Утечка');
    });

    it('should return English label for leak', () => {
      const label = service.getIncidentTypeLabel('leak', TelegramLanguage.EN);
      expect(label).toBe('Leak');
    });

    it('should return Russian label for vandalism', () => {
      const label = service.getIncidentTypeLabel('vandalism', TelegramLanguage.RU);
      expect(label).toBe('Вандализм');
    });

    it('should return English label for vandalism', () => {
      const label = service.getIncidentTypeLabel('vandalism', TelegramLanguage.EN);
      expect(label).toBe('Vandalism');
    });

    it('should return Russian label for other', () => {
      const label = service.getIncidentTypeLabel('other', TelegramLanguage.RU);
      expect(label).toBe('Другое');
    });

    it('should return English label for other', () => {
      const label = service.getIncidentTypeLabel('other', TelegramLanguage.EN);
      expect(label).toBe('Other');
    });

    it('should return type itself for unknown type', () => {
      const label = service.getIncidentTypeLabel('unknown', TelegramLanguage.RU);
      expect(label).toBe('unknown');
    });
  });

  // ============================================================================
  // Command handler tests
  // ============================================================================

  describe('handleIncidentCommand', () => {
    it('should show incident type selection for verified user', async () => {
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      machinesService.findAllSimple.mockResolvedValue([mockMachine as any]);

      await service.handleIncidentCommand(mockCtx as any);

      expect(mockCtx.reply).toHaveBeenCalled();
      expect(usersService.findByTelegramId).toHaveBeenCalledWith('123456789');
    });

    it('should return error for unverified user', async () => {
      const unverifiedCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, is_verified: false },
      };

      await service.handleIncidentCommand(unverifiedCtx as any);

      expect(mockCtx.reply).toHaveBeenCalledWith('not_verified');
    });

    it('should handle no machines available', async () => {
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      machinesService.findAllSimple.mockResolvedValue([]);

      await service.handleIncidentCommand(mockCtx as any);

      expect(mockCtx.reply).toHaveBeenCalledWith('❌ Нет доступных аппаратов');
    });
  });

  describe('handleStockCommand', () => {
    it('should show machine selection when no machine specified', async () => {
      machinesService.findAllSimple.mockResolvedValue([mockMachine as any]);

      await service.handleStockCommand(mockCtx as any);

      expect(mockCtx.reply).toHaveBeenCalled();
    });

    it('should return error for unverified user', async () => {
      const unverifiedCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, is_verified: false },
      };

      await service.handleStockCommand(unverifiedCtx as any);

      expect(mockCtx.reply).toHaveBeenCalledWith('not_verified');
    });
  });

  describe('handleStaffCommand', () => {
    it('should return permission denied for non-manager users', async () => {
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);

      await service.handleStaffCommand(mockCtx as any);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        '🔒 Эта команда доступна только для менеджеров и администраторов',
      );
    });

    it('should show staff status for manager', async () => {
      const managerUser = { ...mockUser, role: UserRole.MANAGER };
      usersService.findByTelegramId.mockResolvedValue(managerUser as any);
      managerToolsService.getActiveOperatorsStatus.mockResolvedValue([]);

      await service.handleStaffCommand(mockCtx as any);

      expect(mockCtx.replyWithChatAction).toHaveBeenCalledWith('typing');
    });

    it('should return error for unverified user', async () => {
      const unverifiedCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, is_verified: false },
      };

      await service.handleStaffCommand(unverifiedCtx as any);

      expect(mockCtx.reply).toHaveBeenCalledWith('not_verified');
    });
  });

  describe('handleReportCommand', () => {
    it('should show daily report for verified user', async () => {
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.findAll.mockResolvedValue([]);

      await service.handleReportCommand(mockCtx as any);

      expect(mockCtx.reply).toHaveBeenCalled();
    });

    it('should return error for unverified user', async () => {
      const unverifiedCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, is_verified: false },
      };

      await service.handleReportCommand(unverifiedCtx as any);

      expect(mockCtx.reply).toHaveBeenCalledWith('not_verified');
    });
  });

  // ============================================================================
  // Callback handler tests
  // ============================================================================

  describe('handleStockMachineCallback', () => {
    it('should send machine stock info', async () => {
      machinesService.findOne.mockResolvedValue(mockMachine as any);
      inventoryService.getMachineInventory.mockResolvedValue([]);

      await service.handleStockMachineCallback(mockCtx as any, 'machine-1');

      expect(mockCtx.answerCbQuery).toHaveBeenCalled();
      expect(mockCtx.reply).toHaveBeenCalled();
    });
  });

  describe('handleStaffRefreshCallback', () => {
    it('should refresh staff status', async () => {
      usersService.findByTelegramId.mockResolvedValue({
        ...mockUser,
        role: UserRole.MANAGER,
      } as any);
      managerToolsService.getActiveOperatorsStatus.mockResolvedValue([]);

      await service.handleStaffRefreshCallback(mockCtx as any);

      expect(mockCtx.answerCbQuery).toHaveBeenCalled();
    });
  });

  describe('handleStaffAnalyticsCallback', () => {
    it('should show analytics', async () => {
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      managerToolsService.getTeamAnalytics.mockResolvedValue({
        tasksCompleted: 10,
        tasksInProgress: 5,
        activeOperators: 3,
        totalOperators: 5,
        avgCompletionTimeMinutes: 30,
        topPerformers: [],
        tasksByType: {},
      });
      managerToolsService.formatAnalyticsMessage.mockReturnValue('Analytics');

      await service.handleStaffAnalyticsCallback(mockCtx as any);

      expect(mockCtx.answerCbQuery).toHaveBeenCalled();
      expect(mockCtx.reply).toHaveBeenCalled();
    });
  });

  describe('handleIncidentTypeCallback', () => {
    it('should show machine selection after type selection', async () => {
      machinesService.findAllSimple.mockResolvedValue([mockMachine as any]);

      await service.handleIncidentTypeCallback(mockCtx as any, 'breakdown');

      expect(mockCtx.answerCbQuery).toHaveBeenCalled();
      expect(mockCtx.editMessageText).toHaveBeenCalled();
    });
  });

  describe('handleIncidentMachineCallback', () => {
    it('should prompt for description after machine selection', async () => {
      const ctxWithSession = {
        ...mockCtx,
        session: {
          ...mockCtx.session,
          context: { tempData: { incidentType: 'breakdown' } },
        },
      };

      await service.handleIncidentMachineCallback(ctxWithSession as any, 'machine-1');

      expect(mockCtx.answerCbQuery).toHaveBeenCalled();
      expect(mockCtx.editMessageText).toHaveBeenCalled();
    });

    it('should return error if no incident type selected', async () => {
      const ctxWithEmptySession = {
        ...mockCtx,
        session: {
          userId: 'user-1',
          state: ConversationState.IDLE,
          context: { tempData: {} },
        },
      };

      await service.handleIncidentMachineCallback(ctxWithEmptySession as any, 'machine-1');

      expect(ctxWithEmptySession.answerCbQuery).toHaveBeenCalled();
      expect(ctxWithEmptySession.reply).toHaveBeenCalledWith(
        '❌ Сначала выберите тип инцидента: /incident',
      );
    });
  });

  describe('handleIncidentCancelCallback', () => {
    it('should cancel incident creation', async () => {
      await service.handleIncidentCancelCallback(mockCtx as any);

      expect(mockCtx.answerCbQuery).toHaveBeenCalled();
      expect(mockCtx.editMessageText).toHaveBeenCalledWith(
        '❌ Создание инцидента отменено',
      );
      expect(mockCtx.session?.state).toBe(ConversationState.IDLE);
    });
  });

  // ============================================================================
  // sendMachineStockInfo tests
  // ============================================================================

  describe('sendMachineStockInfo', () => {
    it('should show stock info for machine', async () => {
      machinesService.findOne.mockResolvedValue(mockMachine as any);
      inventoryService.getMachineInventory.mockResolvedValue([
        {
          nomenclature: { name: 'Coffee' },
          nomenclature_id: 'nom-1',
          current_quantity: 50,
          max_capacity: 100,
          min_stock_level: 10,
        },
      ] as any);

      await service.sendMachineStockInfo(mockCtx as any, 'machine-1', TelegramLanguage.RU);

      expect(mockCtx.reply).toHaveBeenCalled();
    });

    it('should show no data message when no inventory', async () => {
      machinesService.findOne.mockResolvedValue(mockMachine as any);
      inventoryService.getMachineInventory.mockResolvedValue([]);

      await service.sendMachineStockInfo(mockCtx as any, 'machine-1', TelegramLanguage.RU);

      expect(mockCtx.reply).toHaveBeenCalled();
      const replyCall = (mockCtx.reply as jest.Mock).mock.calls[0][0];
      expect(replyCall).toContain('Нет данных');
    });

    it('should show machine not found error', async () => {
      machinesService.findOne.mockResolvedValue(undefined as any);

      await service.sendMachineStockInfo(mockCtx as any, 'machine-1', TelegramLanguage.RU);

      expect(mockCtx.reply).toHaveBeenCalledWith('❌ Аппарат не найден');
    });
  });
});
