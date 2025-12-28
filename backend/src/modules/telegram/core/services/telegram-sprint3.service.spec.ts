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

    it('should default to Russian for unverified user without language', async () => {
      const unverifiedCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, is_verified: false, language: undefined },
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

    it('should handle no machines available in English', async () => {
      const enCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN },
      };
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      machinesService.findAllSimple.mockResolvedValue([]);

      await service.handleIncidentCommand(enCtx as any);

      expect(enCtx.reply).toHaveBeenCalledWith('❌ No machines available');
    });

    it('should handle user not found', async () => {
      usersService.findByTelegramId.mockResolvedValue(null);

      await service.handleIncidentCommand(mockCtx as any);

      expect(mockCtx.reply).toHaveBeenCalledWith('❌ Пользователь не найден');
    });

    it('should handle user not found in English', async () => {
      const enCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN },
      };
      usersService.findByTelegramId.mockResolvedValue(null);

      await service.handleIncidentCommand(enCtx as any);

      expect(enCtx.reply).toHaveBeenCalledWith('❌ User not found');
    });

    it('should handle error in incident command', async () => {
      usersService.findByTelegramId.mockRejectedValue(new Error('Database error'));

      await service.handleIncidentCommand(mockCtx as any);

      expect(mockCtx.reply).toHaveBeenCalledWith('❌ Ошибка: Database error');
    });

    it('should handle error in incident command in English', async () => {
      const enCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN },
      };
      usersService.findByTelegramId.mockRejectedValue(new Error('Database error'));

      await service.handleIncidentCommand(enCtx as any);

      expect(enCtx.reply).toHaveBeenCalledWith('❌ Error: Database error');
    });

    it('should show incident type selection keyboard in English', async () => {
      const enCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN },
      };
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      machinesService.findAllSimple.mockResolvedValue([mockMachine as any]);

      await service.handleIncidentCommand(enCtx as any);

      expect(enCtx.reply).toHaveBeenCalled();
      const replyCall = (enCtx.reply as jest.Mock).mock.calls[0][0];
      expect(replyCall).toContain('Create Incident');
    });

    it('should save session state after showing incident selection', async () => {
      const ctxWithSession = {
        ...mockCtx,
        session: {
          state: ConversationState.IDLE,
          context: {} as any,
        },
      };
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      machinesService.findAllSimple.mockResolvedValue([mockMachine as any]);

      await service.handleIncidentCommand(ctxWithSession as any);

      expect(ctxWithSession.session.state).toBe(ConversationState.INCIDENT_TYPE_SELECTION);
      expect((ctxWithSession.session.context as any).tempData?.userId).toBe('user-1');
    });

    it('should handle missing session gracefully', async () => {
      const ctxNoSession = {
        ...mockCtx,
        session: undefined,
      };
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      machinesService.findAllSimple.mockResolvedValue([mockMachine as any]);

      await expect(
        service.handleIncidentCommand(ctxNoSession as any),
      ).resolves.not.toThrow();
    });
  });

  describe('handleStockCommand', () => {
    it('should show machine selection when no machine specified', async () => {
      machinesService.findAllSimple.mockResolvedValue([mockMachine as any]);

      await service.handleStockCommand(mockCtx as any);

      expect(mockCtx.reply).toHaveBeenCalled();
    });

    it('should show machine selection in English', async () => {
      const enCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN },
      };
      machinesService.findAllSimple.mockResolvedValue([mockMachine as any]);

      await service.handleStockCommand(enCtx as any);

      expect(enCtx.reply).toHaveBeenCalled();
      const replyCall = (enCtx.reply as jest.Mock).mock.calls[0][0];
      expect(replyCall).toContain('Machine Inventory');
    });

    it('should return error for unverified user', async () => {
      const unverifiedCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, is_verified: false },
      };

      await service.handleStockCommand(unverifiedCtx as any);

      expect(mockCtx.reply).toHaveBeenCalledWith('not_verified');
    });

    it('should default to Russian for unverified user without language', async () => {
      const unverifiedCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, is_verified: false, language: undefined },
      };

      await service.handleStockCommand(unverifiedCtx as any);

      expect(mockCtx.reply).toHaveBeenCalledWith('not_verified');
    });

    it('should handle no machines available', async () => {
      machinesService.findAllSimple.mockResolvedValue([]);

      await service.handleStockCommand(mockCtx as any);

      expect(mockCtx.reply).toHaveBeenCalledWith('❌ Нет доступных аппаратов');
    });

    it('should handle no machines available in English', async () => {
      const enCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN },
      };
      machinesService.findAllSimple.mockResolvedValue([]);

      await service.handleStockCommand(enCtx as any);

      expect(enCtx.reply).toHaveBeenCalledWith('❌ No machines available');
    });

    it('should find machine by number and show stock', async () => {
      const ctxWithNumber = {
        ...mockCtx,
        message: { text: '/stock M-001' },
      };
      machinesService.findAllSimple.mockResolvedValue([mockMachine as any]);
      machinesService.findOne.mockResolvedValue(mockMachine as any);
      inventoryService.getMachineInventory.mockResolvedValue([]);

      await service.handleStockCommand(ctxWithNumber as any);

      expect(mockCtx.reply).toHaveBeenCalled();
    });

    it('should handle machine not found by number', async () => {
      const ctxWithNumber = {
        ...mockCtx,
        message: { text: '/stock M-999' },
      };
      machinesService.findAllSimple.mockResolvedValue([mockMachine as any]);

      await service.handleStockCommand(ctxWithNumber as any);

      expect(mockCtx.reply).toHaveBeenCalledWith('❌ Аппарат "M-999" не найден');
    });

    it('should handle machine not found by number in English', async () => {
      const ctxWithNumber = {
        ...mockCtx,
        message: { text: '/stock M-999' },
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN },
      };
      machinesService.findAllSimple.mockResolvedValue([mockMachine as any]);

      await service.handleStockCommand(ctxWithNumber as any);

      expect(ctxWithNumber.reply).toHaveBeenCalledWith('❌ Machine "M-999" not found');
    });

    it('should handle error in stock command', async () => {
      machinesService.findAllSimple.mockRejectedValue(new Error('Database error'));

      await service.handleStockCommand(mockCtx as any);

      expect(mockCtx.reply).toHaveBeenCalledWith('❌ Ошибка: Database error');
    });

    it('should handle error in stock command in English', async () => {
      const enCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN },
      };
      machinesService.findAllSimple.mockRejectedValue(new Error('Database error'));

      await service.handleStockCommand(enCtx as any);

      expect(enCtx.reply).toHaveBeenCalledWith('❌ Error: Database error');
    });

    it('should handle message without text property', async () => {
      const ctxNoMessageText = {
        ...mockCtx,
        message: {},
      };
      machinesService.findAllSimple.mockResolvedValue([mockMachine as any]);

      await service.handleStockCommand(ctxNoMessageText as any);

      expect(ctxNoMessageText.reply).toHaveBeenCalled();
    });

    it('should show N/A when machine has no location in stock selection', async () => {
      const machineNoLoc = { ...mockMachine, location: null };
      machinesService.findAllSimple.mockResolvedValue([machineNoLoc as any]);

      await service.handleStockCommand(mockCtx as any);

      expect(mockCtx.reply).toHaveBeenCalled();
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

    it('should return permission denied for non-manager users in English', async () => {
      const enCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN },
      };
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);

      await service.handleStaffCommand(enCtx as any);

      expect(enCtx.reply).toHaveBeenCalledWith(
        '🔒 This command is only available for managers and admins',
      );
    });

    it('should show staff status for manager', async () => {
      const managerUser = { ...mockUser, role: UserRole.MANAGER };
      usersService.findByTelegramId.mockResolvedValue(managerUser as any);
      managerToolsService.getActiveOperatorsStatus.mockResolvedValue([]);

      await service.handleStaffCommand(mockCtx as any);

      expect(mockCtx.replyWithChatAction).toHaveBeenCalledWith('typing');
    });

    it('should show staff status for admin', async () => {
      const adminUser = { ...mockUser, role: UserRole.ADMIN };
      usersService.findByTelegramId.mockResolvedValue(adminUser as any);
      managerToolsService.getActiveOperatorsStatus.mockResolvedValue([]);

      await service.handleStaffCommand(mockCtx as any);

      expect(mockCtx.replyWithChatAction).toHaveBeenCalledWith('typing');
    });

    it('should show staff status for owner', async () => {
      const ownerUser = { ...mockUser, role: UserRole.OWNER };
      usersService.findByTelegramId.mockResolvedValue(ownerUser as any);
      managerToolsService.getActiveOperatorsStatus.mockResolvedValue([]);

      await service.handleStaffCommand(mockCtx as any);

      expect(mockCtx.replyWithChatAction).toHaveBeenCalledWith('typing');
    });

    it('should show no active operators message', async () => {
      const managerUser = { ...mockUser, role: UserRole.MANAGER };
      usersService.findByTelegramId.mockResolvedValue(managerUser as any);
      managerToolsService.getActiveOperatorsStatus.mockResolvedValue([]);

      await service.handleStaffCommand(mockCtx as any);

      expect(mockCtx.reply).toHaveBeenCalledWith('📭 Нет активных операторов');
    });

    it('should show no active operators message in English', async () => {
      const enCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN },
      };
      const managerUser = { ...mockUser, role: UserRole.MANAGER };
      usersService.findByTelegramId.mockResolvedValue(managerUser as any);
      managerToolsService.getActiveOperatorsStatus.mockResolvedValue([]);

      await service.handleStaffCommand(enCtx as any);

      expect(enCtx.reply).toHaveBeenCalledWith('📭 No active operators');
    });

    it('should show operators status list with keyboard', async () => {
      const managerUser = { ...mockUser, role: UserRole.MANAGER };
      usersService.findByTelegramId.mockResolvedValue(managerUser as any);
      managerToolsService.getActiveOperatorsStatus.mockResolvedValue([
        { id: 'op-1', full_name: 'Operator 1', status: 'active' },
      ] as any);
      managerToolsService.formatOperatorsStatusMessage.mockReturnValue('Operators status');

      await service.handleStaffCommand(mockCtx as any);

      expect(managerToolsService.formatOperatorsStatusMessage).toHaveBeenCalled();
      expect(mockCtx.reply).toHaveBeenCalled();
      const replyCall = (mockCtx.reply as jest.Mock).mock.calls[0][0];
      expect(replyCall).toBe('Operators status');
    });

    it('should show operators status list with English keyboard', async () => {
      const enCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN },
      };
      const managerUser = { ...mockUser, role: UserRole.MANAGER };
      usersService.findByTelegramId.mockResolvedValue(managerUser as any);
      managerToolsService.getActiveOperatorsStatus.mockResolvedValue([
        { id: 'op-1', full_name: 'Operator 1', status: 'active' },
      ] as any);
      managerToolsService.formatOperatorsStatusMessage.mockReturnValue('Operators status EN');

      await service.handleStaffCommand(enCtx as any);

      expect(enCtx.reply).toHaveBeenCalled();
    });

    it('should return error for unverified user', async () => {
      const unverifiedCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, is_verified: false },
      };

      await service.handleStaffCommand(unverifiedCtx as any);

      expect(mockCtx.reply).toHaveBeenCalledWith('not_verified');
    });

    it('should default to Russian for unverified user without language', async () => {
      const unverifiedCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, is_verified: false, language: undefined },
      };

      await service.handleStaffCommand(unverifiedCtx as any);

      expect(mockCtx.reply).toHaveBeenCalledWith('not_verified');
    });

    it('should handle user not found', async () => {
      usersService.findByTelegramId.mockResolvedValue(null);

      await service.handleStaffCommand(mockCtx as any);

      expect(mockCtx.reply).toHaveBeenCalledWith('❌ Пользователь не найден');
    });

    it('should handle user not found in English', async () => {
      const enCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN },
      };
      usersService.findByTelegramId.mockResolvedValue(null);

      await service.handleStaffCommand(enCtx as any);

      expect(enCtx.reply).toHaveBeenCalledWith('❌ User not found');
    });

    it('should handle error in staff command', async () => {
      usersService.findByTelegramId.mockRejectedValue(new Error('Database error'));

      await service.handleStaffCommand(mockCtx as any);

      expect(mockCtx.reply).toHaveBeenCalledWith('❌ Ошибка: Database error');
    });

    it('should handle error in staff command in English', async () => {
      const enCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN },
      };
      usersService.findByTelegramId.mockRejectedValue(new Error('Database error'));

      await service.handleStaffCommand(enCtx as any);

      expect(enCtx.reply).toHaveBeenCalledWith('❌ Error: Database error');
    });
  });

  describe('handleReportCommand', () => {
    it('should show daily report for verified user', async () => {
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.findAll.mockResolvedValue([]);

      await service.handleReportCommand(mockCtx as any);

      expect(mockCtx.reply).toHaveBeenCalled();
    });

    it('should show report in English', async () => {
      const enCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN },
      };
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.findAll.mockResolvedValue([]);

      await service.handleReportCommand(enCtx as any);

      expect(enCtx.reply).toHaveBeenCalled();
      const replyCall = (enCtx.reply as jest.Mock).mock.calls[0][0];
      expect(replyCall).toContain("Today's Report");
    });

    it('should return error for unverified user', async () => {
      const unverifiedCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, is_verified: false },
      };

      await service.handleReportCommand(unverifiedCtx as any);

      expect(mockCtx.reply).toHaveBeenCalledWith('not_verified');
    });

    it('should default to Russian for unverified user without language', async () => {
      const unverifiedCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, is_verified: false, language: undefined },
      };

      await service.handleReportCommand(unverifiedCtx as any);

      expect(mockCtx.reply).toHaveBeenCalledWith('not_verified');
    });

    it('should handle user not found', async () => {
      usersService.findByTelegramId.mockResolvedValue(null);

      await service.handleReportCommand(mockCtx as any);

      expect(mockCtx.reply).toHaveBeenCalledWith('❌ Пользователь не найден');
    });

    it('should handle user not found in English', async () => {
      const enCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN },
      };
      usersService.findByTelegramId.mockResolvedValue(null);

      await service.handleReportCommand(enCtx as any);

      expect(enCtx.reply).toHaveBeenCalledWith('❌ User not found');
    });

    it('should show completed tasks with photos in report', async () => {
      const today = new Date();
      const completedTasks = [
        {
          id: 'task-1',
          type_code: TaskType.REFILL,
          status: TaskStatus.COMPLETED,
          completed_at: today,
          has_photo_before: true,
          has_photo_after: true,
        },
        {
          id: 'task-2',
          type_code: TaskType.COLLECTION,
          status: TaskStatus.COMPLETED,
          completed_at: today,
          has_photo_before: false,
          has_photo_after: true,
        },
      ];
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.findAll
        .mockResolvedValueOnce(completedTasks as any)
        .mockResolvedValueOnce([]);

      await service.handleReportCommand(mockCtx as any);

      expect(mockCtx.reply).toHaveBeenCalled();
      const replyCall = (mockCtx.reply as jest.Mock).mock.calls[0][0];
      expect(replyCall).toContain('Выполнено задач:');
      expect(replyCall).toContain('2');
    });

    it('should show report in English with completed tasks', async () => {
      const enCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN },
      };
      const today = new Date();
      const completedTasks = [
        {
          id: 'task-1',
          type_code: TaskType.REFILL,
          status: TaskStatus.COMPLETED,
          completed_at: today,
          has_photo_before: true,
          has_photo_after: true,
        },
      ];
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.findAll
        .mockResolvedValueOnce(completedTasks as any)
        .mockResolvedValueOnce([]);

      await service.handleReportCommand(enCtx as any);

      expect(enCtx.reply).toHaveBeenCalled();
      const replyCall = (enCtx.reply as jest.Mock).mock.calls[0][0];
      expect(replyCall).toContain('Completed tasks:');
    });

    it('should show remaining active tasks', async () => {
      const activeTasks = [
        { id: 'task-1', status: TaskStatus.PENDING },
        { id: 'task-2', status: TaskStatus.ASSIGNED },
        { id: 'task-3', status: TaskStatus.IN_PROGRESS },
      ];
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.findAll
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(activeTasks as any);

      await service.handleReportCommand(mockCtx as any);

      expect(mockCtx.reply).toHaveBeenCalled();
      const replyCall = (mockCtx.reply as jest.Mock).mock.calls[0][0];
      expect(replyCall).toContain('Осталось задач:');
      expect(replyCall).toContain('3');
    });

    it('should show remaining active tasks in English', async () => {
      const enCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN },
      };
      const activeTasks = [
        { id: 'task-1', status: TaskStatus.PENDING },
        { id: 'task-2', status: TaskStatus.ASSIGNED },
      ];
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.findAll
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(activeTasks as any);

      await service.handleReportCommand(enCtx as any);

      expect(enCtx.reply).toHaveBeenCalled();
      const replyCall = (enCtx.reply as jest.Mock).mock.calls[0][0];
      expect(replyCall).toContain('Remaining tasks:');
    });

    it('should show no tasks message when no completed tasks today', async () => {
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.findAll.mockResolvedValue([]);

      await service.handleReportCommand(mockCtx as any);

      expect(mockCtx.reply).toHaveBeenCalled();
      const replyCall = (mockCtx.reply as jest.Mock).mock.calls[0][0];
      expect(replyCall).toContain('Сегодня нет выполненных задач');
    });

    it('should show no tasks message in English when no completed tasks today', async () => {
      const enCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN },
      };
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      tasksService.findAll.mockResolvedValue([]);

      await service.handleReportCommand(enCtx as any);

      expect(enCtx.reply).toHaveBeenCalled();
      const replyCall = (enCtx.reply as jest.Mock).mock.calls[0][0];
      expect(replyCall).toContain('No completed tasks today');
    });

    it('should handle error in report command', async () => {
      usersService.findByTelegramId.mockRejectedValue(new Error('Database error'));

      await service.handleReportCommand(mockCtx as any);

      expect(mockCtx.reply).toHaveBeenCalledWith('❌ Ошибка: Database error');
    });

    it('should handle error in report command in English', async () => {
      const enCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN },
      };
      usersService.findByTelegramId.mockRejectedValue(new Error('Database error'));

      await service.handleReportCommand(enCtx as any);

      expect(enCtx.reply).toHaveBeenCalledWith('❌ Error: Database error');
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

    it('should default to Russian when no language set', async () => {
      const ctxNoLang = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: undefined },
      };
      machinesService.findOne.mockResolvedValue(mockMachine as any);
      inventoryService.getMachineInventory.mockResolvedValue([]);

      await service.handleStockMachineCallback(ctxNoLang as any, 'machine-1');

      expect(ctxNoLang.reply).toHaveBeenCalled();
    });

    it('should handle error in callback', async () => {
      machinesService.findOne.mockRejectedValue(new Error('Database error'));

      await service.handleStockMachineCallback(mockCtx as any, 'machine-1');

      expect(mockCtx.reply).toHaveBeenCalledWith('❌ Ошибка: Database error');
    });

    it('should handle error in callback in English', async () => {
      const enCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN },
      };
      machinesService.findOne.mockRejectedValue(new Error('Database error'));

      await service.handleStockMachineCallback(enCtx as any, 'machine-1');

      expect(enCtx.reply).toHaveBeenCalledWith('❌ Error: Database error');
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

    it('should default to Russian when no language set', async () => {
      const ctxNoLang = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: undefined },
      };
      usersService.findByTelegramId.mockResolvedValue(mockUser as any);
      managerToolsService.getTeamAnalytics.mockResolvedValue({} as any);
      managerToolsService.formatAnalyticsMessage.mockReturnValue('Analytics');

      await service.handleStaffAnalyticsCallback(ctxNoLang as any);

      expect(ctxNoLang.reply).toHaveBeenCalled();
    });

    it('should return early if user not found', async () => {
      usersService.findByTelegramId.mockResolvedValue(null);

      await service.handleStaffAnalyticsCallback(mockCtx as any);

      expect(mockCtx.answerCbQuery).toHaveBeenCalled();
      expect(managerToolsService.getTeamAnalytics).not.toHaveBeenCalled();
    });

    it('should handle error in callback', async () => {
      usersService.findByTelegramId.mockRejectedValue(new Error('Database error'));

      await service.handleStaffAnalyticsCallback(mockCtx as any);

      expect(mockCtx.reply).toHaveBeenCalledWith('❌ Ошибка: Database error');
    });

    it('should handle error in callback in English', async () => {
      const enCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN },
      };
      usersService.findByTelegramId.mockRejectedValue(new Error('Database error'));

      await service.handleStaffAnalyticsCallback(enCtx as any);

      expect(enCtx.reply).toHaveBeenCalledWith('❌ Error: Database error');
    });
  });

  describe('handleIncidentTypeCallback', () => {
    it('should show machine selection after type selection', async () => {
      machinesService.findAllSimple.mockResolvedValue([mockMachine as any]);

      await service.handleIncidentTypeCallback(mockCtx as any, 'breakdown');

      expect(mockCtx.answerCbQuery).toHaveBeenCalled();
      expect(mockCtx.editMessageText).toHaveBeenCalled();
    });

    it('should default to Russian when no language set', async () => {
      const ctxNoLang = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: undefined },
      };
      machinesService.findAllSimple.mockResolvedValue([mockMachine as any]);

      await service.handleIncidentTypeCallback(ctxNoLang as any, 'breakdown');

      expect(ctxNoLang.editMessageText).toHaveBeenCalled();
    });

    it('should show machine selection in English', async () => {
      const enCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN },
      };
      machinesService.findAllSimple.mockResolvedValue([mockMachine as any]);

      await service.handleIncidentTypeCallback(enCtx as any, 'breakdown');

      expect(enCtx.editMessageText).toHaveBeenCalled();
      const editCall = (enCtx.editMessageText as jest.Mock).mock.calls[0][0];
      expect(editCall).toContain('Create Incident');
    });

    it('should handle error silently', async () => {
      machinesService.findAllSimple.mockRejectedValue(new Error('Database error'));

      await expect(
        service.handleIncidentTypeCallback(mockCtx as any, 'breakdown'),
      ).resolves.not.toThrow();

      expect(mockCtx.answerCbQuery).toHaveBeenCalled();
    });

    it('should update session context when session exists', async () => {
      const ctxWithSession = {
        ...mockCtx,
        session: {
          state: ConversationState.IDLE,
          context: { existingData: 'test' } as any,
        },
      };
      machinesService.findAllSimple.mockResolvedValue([mockMachine as any]);

      await service.handleIncidentTypeCallback(ctxWithSession as any, 'breakdown');

      expect(ctxWithSession.session.state).toBe(ConversationState.INCIDENT_MACHINE_SELECTION);
      expect((ctxWithSession.session.context as any).tempData?.incidentType).toBe('breakdown');
    });

    it('should handle missing session gracefully', async () => {
      const ctxNoSession = {
        ...mockCtx,
        session: undefined,
      };
      machinesService.findAllSimple.mockResolvedValue([mockMachine as any]);

      await expect(
        service.handleIncidentTypeCallback(ctxNoSession as any, 'breakdown'),
      ).resolves.not.toThrow();
    });

    it('should show N/A when machine has no location name', async () => {
      const machineNoLoc = { ...mockMachine, location: null };
      machinesService.findAllSimple.mockResolvedValue([machineNoLoc as any]);

      await service.handleIncidentTypeCallback(mockCtx as any, 'breakdown');

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

    it('should prompt for description in English', async () => {
      const ctxWithSession = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN },
        session: {
          ...mockCtx.session,
          context: { tempData: { incidentType: 'breakdown' } },
        },
      };

      await service.handleIncidentMachineCallback(ctxWithSession as any, 'machine-1');

      const editCall = (ctxWithSession.editMessageText as jest.Mock).mock.calls[0][0];
      expect(editCall).toContain('Create Incident');
    });

    it('should default to Russian when no language set', async () => {
      const ctxWithSession = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: undefined },
        session: {
          ...mockCtx.session,
          context: { tempData: { incidentType: 'breakdown' } },
        },
      };

      await service.handleIncidentMachineCallback(ctxWithSession as any, 'machine-1');

      expect(ctxWithSession.editMessageText).toHaveBeenCalled();
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

    it('should return error if no incident type selected in English', async () => {
      const ctxWithEmptySession = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN },
        session: {
          userId: 'user-1',
          state: ConversationState.IDLE,
          context: { tempData: {} },
        },
      };

      await service.handleIncidentMachineCallback(ctxWithEmptySession as any, 'machine-1');

      expect(ctxWithEmptySession.reply).toHaveBeenCalledWith(
        '❌ First select incident type: /incident',
      );
    });

    it('should handle error silently', async () => {
      const ctxWithSession = {
        ...mockCtx,
        session: {
          ...mockCtx.session,
          context: { tempData: { incidentType: 'breakdown' } },
        },
        editMessageText: jest.fn().mockRejectedValue(new Error('Edit error')),
      };

      await expect(
        service.handleIncidentMachineCallback(ctxWithSession as any, 'machine-1'),
      ).resolves.not.toThrow();
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

    it('should cancel incident creation in English', async () => {
      const enCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN },
      };

      await service.handleIncidentCancelCallback(enCtx as any);

      expect(enCtx.editMessageText).toHaveBeenCalledWith(
        '❌ Incident creation cancelled',
      );
    });

    it('should default to Russian when no language set', async () => {
      const ctxNoLang = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, language: undefined },
      };

      await service.handleIncidentCancelCallback(ctxNoLang as any);

      expect(ctxNoLang.editMessageText).toHaveBeenCalledWith(
        '❌ Создание инцидента отменено',
      );
    });

    it('should handle missing session', async () => {
      const ctxNoSession = {
        ...mockCtx,
        session: undefined,
      };

      await service.handleIncidentCancelCallback(ctxNoSession as any);

      expect(ctxNoSession.answerCbQuery).toHaveBeenCalled();
      expect(ctxNoSession.editMessageText).toHaveBeenCalled();
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

    it('should show stock info in English', async () => {
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

      await service.sendMachineStockInfo(mockCtx as any, 'machine-1', TelegramLanguage.EN);

      expect(mockCtx.reply).toHaveBeenCalled();
      const replyCall = (mockCtx.reply as jest.Mock).mock.calls[0][0];
      expect(replyCall).toContain('Stock:');
    });

    it('should show no data message when no inventory', async () => {
      machinesService.findOne.mockResolvedValue(mockMachine as any);
      inventoryService.getMachineInventory.mockResolvedValue([]);

      await service.sendMachineStockInfo(mockCtx as any, 'machine-1', TelegramLanguage.RU);

      expect(mockCtx.reply).toHaveBeenCalled();
      const replyCall = (mockCtx.reply as jest.Mock).mock.calls[0][0];
      expect(replyCall).toContain('Нет данных');
    });

    it('should show no data message in English', async () => {
      machinesService.findOne.mockResolvedValue(mockMachine as any);
      inventoryService.getMachineInventory.mockResolvedValue([]);

      await service.sendMachineStockInfo(mockCtx as any, 'machine-1', TelegramLanguage.EN);

      expect(mockCtx.reply).toHaveBeenCalled();
      const replyCall = (mockCtx.reply as jest.Mock).mock.calls[0][0];
      expect(replyCall).toContain('No inventory data available');
    });

    it('should show machine not found error', async () => {
      machinesService.findOne.mockResolvedValue(undefined as any);

      await service.sendMachineStockInfo(mockCtx as any, 'machine-1', TelegramLanguage.RU);

      expect(mockCtx.reply).toHaveBeenCalledWith('❌ Аппарат не найден');
    });

    it('should show machine not found error in English', async () => {
      machinesService.findOne.mockResolvedValue(undefined as any);

      await service.sendMachineStockInfo(mockCtx as any, 'machine-1', TelegramLanguage.EN);

      expect(mockCtx.reply).toHaveBeenCalledWith('❌ Machine not found');
    });

    it('should show red indicator for low stock (<=20%)', async () => {
      machinesService.findOne.mockResolvedValue(mockMachine as any);
      inventoryService.getMachineInventory.mockResolvedValue([
        {
          nomenclature: { name: 'Coffee' },
          nomenclature_id: 'nom-1',
          current_quantity: 10,
          max_capacity: 100,
          min_stock_level: 5,
        },
      ] as any);

      await service.sendMachineStockInfo(mockCtx as any, 'machine-1', TelegramLanguage.RU);

      const replyCall = (mockCtx.reply as jest.Mock).mock.calls[0][0];
      expect(replyCall).toContain('🔴');
    });

    it('should show yellow indicator for medium stock (20-50%)', async () => {
      machinesService.findOne.mockResolvedValue(mockMachine as any);
      inventoryService.getMachineInventory.mockResolvedValue([
        {
          nomenclature: { name: 'Coffee' },
          nomenclature_id: 'nom-1',
          current_quantity: 30,
          max_capacity: 100,
          min_stock_level: 5,
        },
      ] as any);

      await service.sendMachineStockInfo(mockCtx as any, 'machine-1', TelegramLanguage.RU);

      const replyCall = (mockCtx.reply as jest.Mock).mock.calls[0][0];
      expect(replyCall).toContain('🟡');
    });

    it('should show green indicator for high stock (>50%)', async () => {
      machinesService.findOne.mockResolvedValue(mockMachine as any);
      inventoryService.getMachineInventory.mockResolvedValue([
        {
          nomenclature: { name: 'Coffee' },
          nomenclature_id: 'nom-1',
          current_quantity: 80,
          max_capacity: 100,
          min_stock_level: 5,
        },
      ] as any);

      await service.sendMachineStockInfo(mockCtx as any, 'machine-1', TelegramLanguage.RU);

      const replyCall = (mockCtx.reply as jest.Mock).mock.calls[0][0];
      expect(replyCall).toContain('🟢');
    });

    it('should show low stock warning message', async () => {
      machinesService.findOne.mockResolvedValue(mockMachine as any);
      inventoryService.getMachineInventory.mockResolvedValue([
        {
          nomenclature: { name: 'Coffee' },
          nomenclature_id: 'nom-1',
          current_quantity: 5,
          max_capacity: 100,
          min_stock_level: 10,
        },
        {
          nomenclature: { name: 'Sugar' },
          nomenclature_id: 'nom-2',
          current_quantity: 3,
          max_capacity: 50,
          min_stock_level: 5,
        },
      ] as any);

      await service.sendMachineStockInfo(mockCtx as any, 'machine-1', TelegramLanguage.RU);

      const replyCall = (mockCtx.reply as jest.Mock).mock.calls[0][0];
      expect(replyCall).toContain('Требуется пополнение:');
      expect(replyCall).toContain('2 позиций');
    });

    it('should show low stock warning in English', async () => {
      machinesService.findOne.mockResolvedValue(mockMachine as any);
      inventoryService.getMachineInventory.mockResolvedValue([
        {
          nomenclature: { name: 'Coffee' },
          nomenclature_id: 'nom-1',
          current_quantity: 5,
          max_capacity: 100,
          min_stock_level: 10,
        },
      ] as any);

      await service.sendMachineStockInfo(mockCtx as any, 'machine-1', TelegramLanguage.EN);

      const replyCall = (mockCtx.reply as jest.Mock).mock.calls[0][0];
      expect(replyCall).toContain('Refill needed:');
    });

    it('should limit items to 15 and show more message', async () => {
      machinesService.findOne.mockResolvedValue(mockMachine as any);
      const manyItems = Array.from({ length: 20 }, (_, i) => ({
        nomenclature: { name: `Item ${i}` },
        nomenclature_id: `nom-${i}`,
        current_quantity: 50,
        max_capacity: 100,
        min_stock_level: 0,
      }));
      inventoryService.getMachineInventory.mockResolvedValue(manyItems as any);

      await service.sendMachineStockInfo(mockCtx as any, 'machine-1', TelegramLanguage.RU);

      const replyCall = (mockCtx.reply as jest.Mock).mock.calls[0][0];
      expect(replyCall).toContain('и ещё 5 позиций');
    });

    it('should show more items message in English', async () => {
      machinesService.findOne.mockResolvedValue(mockMachine as any);
      const manyItems = Array.from({ length: 20 }, (_, i) => ({
        nomenclature: { name: `Item ${i}` },
        nomenclature_id: `nom-${i}`,
        current_quantity: 50,
        max_capacity: 100,
        min_stock_level: 0,
      }));
      inventoryService.getMachineInventory.mockResolvedValue(manyItems as any);

      await service.sendMachineStockInfo(mockCtx as any, 'machine-1', TelegramLanguage.EN);

      const replyCall = (mockCtx.reply as jest.Mock).mock.calls[0][0];
      expect(replyCall).toContain('and 5 more items');
    });

    it('should use nomenclature_id when no name', async () => {
      machinesService.findOne.mockResolvedValue(mockMachine as any);
      inventoryService.getMachineInventory.mockResolvedValue([
        {
          nomenclature: null,
          nomenclature_id: 'nom-123',
          current_quantity: 50,
          max_capacity: 100,
          min_stock_level: 0,
        },
      ] as any);

      await service.sendMachineStockInfo(mockCtx as any, 'machine-1', TelegramLanguage.RU);

      const replyCall = (mockCtx.reply as jest.Mock).mock.calls[0][0];
      expect(replyCall).toContain('nom-123');
    });

    it('should handle null max_capacity', async () => {
      machinesService.findOne.mockResolvedValue(mockMachine as any);
      inventoryService.getMachineInventory.mockResolvedValue([
        {
          nomenclature: { name: 'Coffee' },
          nomenclature_id: 'nom-1',
          current_quantity: 50,
          max_capacity: null,
          min_stock_level: 0,
        },
      ] as any);

      await service.sendMachineStockInfo(mockCtx as any, 'machine-1', TelegramLanguage.RU);

      const replyCall = (mockCtx.reply as jest.Mock).mock.calls[0][0];
      expect(replyCall).toContain('50/?');
    });

    it('should handle machine without location name', async () => {
      const machineNoLocation = { ...mockMachine, location: null };
      machinesService.findOne.mockResolvedValue(machineNoLocation as any);
      inventoryService.getMachineInventory.mockResolvedValue([]);

      await service.sendMachineStockInfo(mockCtx as any, 'machine-1', TelegramLanguage.RU);

      const replyCall = (mockCtx.reply as jest.Mock).mock.calls[0][0];
      expect(replyCall).toContain('N/A');
    });

    it('should handle machine with location but no name', async () => {
      const machineNoLocationName = { ...mockMachine, location: { name: null, address: 'Test Address' } };
      machinesService.findOne.mockResolvedValue(machineNoLocationName as any);
      inventoryService.getMachineInventory.mockResolvedValue([]);

      await service.sendMachineStockInfo(mockCtx as any, 'machine-1', TelegramLanguage.RU);

      const replyCall = (mockCtx.reply as jest.Mock).mock.calls[0][0];
      expect(replyCall).toContain('N/A');
    });

    it('should handle machine with location but no name in English', async () => {
      const machineNoLocationName = { ...mockMachine, location: { name: null, address: 'Test Address' } };
      machinesService.findOne.mockResolvedValue(machineNoLocationName as any);
      inventoryService.getMachineInventory.mockResolvedValue([]);

      await service.sendMachineStockInfo(mockCtx as any, 'machine-1', TelegramLanguage.EN);

      const replyCall = (mockCtx.reply as jest.Mock).mock.calls[0][0];
      expect(replyCall).toContain('N/A');
    });
  });

  // ============================================================================
  // Helper method edge cases
  // ============================================================================

  describe('private helper methods', () => {
    it('should return key when helpers not set for t()', async () => {
      const newService = new TelegramSprint3Service(
        { findOne: jest.fn(), save: jest.fn() } as any,
        { create: jest.fn(), save: jest.fn() } as any,
        { getSession: jest.fn(), saveSession: jest.fn() } as any,
        usersService as any,
        machinesService as any,
        inventoryService as any,
        tasksService as any,
        managerToolsService as any,
      );

      const unverifiedCtx = {
        ...mockCtx,
        telegramUser: { ...mockTelegramUser, is_verified: false },
      };

      await newService.handleIncidentCommand(unverifiedCtx as any);

      expect(mockCtx.reply).toHaveBeenCalledWith('not_verified');
    });
  });
});
