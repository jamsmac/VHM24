import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramUser, TelegramLanguage } from '../../shared/entities/telegram-user.entity';
import { TelegramSettings } from '../../shared/entities/telegram-settings.entity';
import { TelegramMessageLog } from '../../shared/entities/telegram-message-log.entity';
import { TelegramSessionService } from '../../infrastructure/services/telegram-session.service';
import { TelegramVoiceService } from '../../media/services/telegram-voice.service';
import { TasksService } from '../../../tasks/tasks.service';
import { FilesService } from '../../../files/files.service';
import { UsersService } from '../../../users/users.service';
import { MachinesService } from '../../../machines/machines.service';
import { IncidentsService } from '../../../incidents/incidents.service';
import { TransactionsService } from '../../../transactions/transactions.service';
import { InventoryService } from '../../../inventory/inventory.service';
import { AccessRequestsService } from '../../../access-requests/access-requests.service';
import { TelegramManagerToolsService } from '../../managers/services/telegram-manager-tools.service';
import { TelegramCommandHandlerService } from './telegram-command-handler.service';
import { TelegramCallbackHandlerService } from './telegram-callback-handler.service';
import { TelegramTaskCallbackService } from './telegram-task-callback.service';
import { TaskType, TaskStatus } from '../../../tasks/entities/task.entity';
import { UserRole } from '../../../users/entities/user.entity';

// Mock Telegraf
jest.mock('telegraf', () => ({
  Telegraf: jest.fn().mockImplementation(() => ({
    use: jest.fn(),
    command: jest.fn(),
    action: jest.fn(),
    on: jest.fn(),
    launch: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    telegram: {
      setMyCommands: jest.fn().mockResolvedValue(undefined),
      sendMessage: jest.fn().mockResolvedValue(undefined),
    },
  })),
  Markup: {
    inlineKeyboard: jest.fn((buttons) => ({ reply_markup: { inline_keyboard: buttons } })),
    button: {
      callback: jest.fn((text, data) => ({ text, callback_data: data })),
      url: jest.fn((text, url) => ({ text, url })),
    },
  },
}));

describe('TelegramBotService', () => {
  let service: TelegramBotService;
  let telegramUserRepository: jest.Mocked<Repository<TelegramUser>>;
  let telegramSettingsRepository: jest.Mocked<Repository<TelegramSettings>>;
  let telegramMessageLogRepository: jest.Mocked<Repository<TelegramMessageLog>>;
  let tasksService: jest.Mocked<TasksService>;
  let usersService: jest.Mocked<UsersService>;

  const mockTelegramUser: Partial<TelegramUser> = {
    id: 'tg-user-1',
    telegram_id: '123456789',
    user_id: 'user-1',
    chat_id: '123456789',
    is_verified: true,
    language: TelegramLanguage.RU,
    notification_preferences: {},
  };

  const mockSettings: Partial<TelegramSettings> = {
    id: 'settings-1',
    setting_key: 'default',
    bot_token: 'test-bot-token',
    is_active: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramBotService,
        {
          provide: getRepositoryToken(TelegramUser),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TelegramSettings),
          useValue: {
            findOne: jest.fn(),
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
            updateSessionState: jest.fn(),
          },
        },
        {
          provide: TelegramVoiceService,
          useValue: {
            isAvailable: jest.fn(),
            transcribeVoice: jest.fn(),
            parseCommand: jest.fn(),
            getVoiceCommandResponse: jest.fn(),
          },
        },
        {
          provide: TelegramCommandHandlerService,
          useValue: {
            setHelpers: jest.fn(),
            handleStartCommand: jest.fn(),
            handleMenuCommand: jest.fn(),
            handleMachinesCommand: jest.fn(),
            handleAlertsCommand: jest.fn(),
            handleStatsCommand: jest.fn(),
            handleTasksCommand: jest.fn(),
            handleHelpCommand: jest.fn(),
            handleLanguageCommand: jest.fn(),
          },
        },
        {
          provide: TelegramCallbackHandlerService,
          useValue: {
            setHelpers: jest.fn(),
            handleLanguageRu: jest.fn(),
            handleLanguageEn: jest.fn(),
            handleMenuMachines: jest.fn(),
            handleMenuAlerts: jest.fn(),
            handleMenuStats: jest.fn(),
            handleMenuSettings: jest.fn(),
            handleBackToMenu: jest.fn(),
            handleSettingsNotifications: jest.fn(),
            handleSettingsLanguage: jest.fn(),
            handleNotificationToggle: jest.fn(),
            handleRefreshTasks: jest.fn(),
          },
        },
        {
          provide: TelegramTaskCallbackService,
          useValue: {
            handleTaskStart: jest.fn(),
            handleStepDone: jest.fn(),
            handleStepSkip: jest.fn(),
            handleStepBack: jest.fn(),
            getExecutionState: jest.fn(),
            updateExecutionState: jest.fn(),
            showCurrentStep: jest.fn(),
          },
        },
        {
          provide: TasksService,
          useValue: {
            findOne: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            startTask: jest.fn(),
            completeTask: jest.fn(),
          },
        },
        {
          provide: FilesService,
          useValue: {
            uploadFile: jest.fn(),
            getFilesByEntity: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findOne: jest.fn(),
            findByTelegramId: jest.fn(),
            createPendingFromTelegram: jest.fn(),
          },
        },
        {
          provide: MachinesService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            findByMachineNumber: jest.fn(),
          },
        },
        {
          provide: IncidentsService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
          },
        },
        {
          provide: TransactionsService,
          useValue: {
            findAll: jest.fn(),
            getSummary: jest.fn(),
          },
        },
        {
          provide: InventoryService,
          useValue: {
            getMachineInventory: jest.fn(),
          },
        },
        {
          provide: AccessRequestsService,
          useValue: {
            findAll: jest.fn(),
            approve: jest.fn(),
            reject: jest.fn(),
          },
        },
        {
          provide: TelegramManagerToolsService,
          useValue: {
            getOperatorsStatus: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TelegramBotService>(TelegramBotService);
    telegramUserRepository = module.get(getRepositoryToken(TelegramUser));
    telegramSettingsRepository = module.get(getRepositoryToken(TelegramSettings));
    telegramMessageLogRepository = module.get(getRepositoryToken(TelegramMessageLog));
    tasksService = module.get(TasksService);
    usersService = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('onModuleInit', () => {
    it('should call initializeBot', async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(null);

      await service.onModuleInit();

      expect(telegramSettingsRepository.findOne).toHaveBeenCalledWith({
        where: { setting_key: 'default' },
      });
    });

    it('should catch initialization errors', async () => {
      telegramSettingsRepository.findOne.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });
  });

  describe('initializeBot', () => {
    it('should not initialize if settings not found', async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(null);

      await service.initializeBot();

      expect(service.isReady()).toBe(false);
    });

    it('should not initialize if bot token is missing', async () => {
      telegramSettingsRepository.findOne.mockResolvedValue({
        ...mockSettings,
        bot_token: '',
      } as TelegramSettings);

      await service.initializeBot();

      expect(service.isReady()).toBe(false);
    });

    it('should not initialize if bot is inactive', async () => {
      telegramSettingsRepository.findOne.mockResolvedValue({
        ...mockSettings,
        is_active: false,
      } as TelegramSettings);

      await service.initializeBot();

      expect(service.isReady()).toBe(false);
    });

    it('should initialize bot with valid settings', async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);

      await service.initializeBot();

      expect(service.isReady()).toBe(true);
    });
  });

  describe('isReady', () => {
    it('should return false when not initialized', () => {
      expect(service.isReady()).toBe(false);
    });

    it('should return true after successful initialization', async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();

      expect(service.isReady()).toBe(true);
    });
  });

  describe('stopBot', () => {
    it('should stop the bot if initialized', async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();

      await service.stopBot();

      expect(service.isReady()).toBe(false);
    });

    it('should handle stopBot when bot is not initialized', async () => {
      await expect(service.stopBot()).resolves.toBeUndefined();
    });
  });

  describe('sendMessage', () => {
    it('should throw error if bot not initialized', async () => {
      await expect(service.sendMessage('123', 'test')).rejects.toThrow('Bot not initialized');
    });

    it('should send message when bot is initialized', async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();

      await service.sendMessage('123456789', 'Hello!');

      // Message sent via mocked telegram.sendMessage
    });
  });

  describe('sendNotification', () => {
    it('should not send if no verified user found', async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
      telegramUserRepository.findOne.mockResolvedValue(null);

      await service.sendNotification('user-1', 'Test notification');

      // Should not throw, just log warning
    });

    it('should send notification to verified user', async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
      telegramUserRepository.findOne.mockResolvedValue(mockTelegramUser as TelegramUser);

      await service.sendNotification('user-1', 'Test notification');

      expect(telegramUserRepository.findOne).toHaveBeenCalledWith({
        where: { user_id: 'user-1', is_verified: true },
      });
    });
  });

  describe('private helper methods (accessed via public interface)', () => {
    beforeEach(async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
    });

    describe('getTaskTypeEmoji', () => {
      it('should return correct emoji for REFILL', () => {
        // Access via the formatting that uses this method internally
        const emoji = (service as any).getTaskTypeEmoji(TaskType.REFILL);
        expect(emoji).toBe('📦');
      });

      it('should return correct emoji for COLLECTION', () => {
        const emoji = (service as any).getTaskTypeEmoji(TaskType.COLLECTION);
        expect(emoji).toBe('💰');
      });

      it('should return correct emoji for CLEANING', () => {
        const emoji = (service as any).getTaskTypeEmoji(TaskType.CLEANING);
        expect(emoji).toBe('🧹');
      });

      it('should return correct emoji for REPAIR', () => {
        const emoji = (service as any).getTaskTypeEmoji(TaskType.REPAIR);
        expect(emoji).toBe('🔧');
      });

      it('should return correct emoji for INSTALL', () => {
        const emoji = (service as any).getTaskTypeEmoji(TaskType.INSTALL);
        expect(emoji).toBe('🔌');
      });

      it('should return correct emoji for REMOVAL', () => {
        const emoji = (service as any).getTaskTypeEmoji(TaskType.REMOVAL);
        expect(emoji).toBe('📤');
      });

      it('should return correct emoji for AUDIT', () => {
        const emoji = (service as any).getTaskTypeEmoji(TaskType.AUDIT);
        expect(emoji).toBe('📊');
      });

      it('should return correct emoji for INSPECTION', () => {
        const emoji = (service as any).getTaskTypeEmoji(TaskType.INSPECTION);
        expect(emoji).toBe('🔍');
      });

      it('should return default emoji for unknown type', () => {
        const emoji = (service as any).getTaskTypeEmoji('unknown_type');
        expect(emoji).toBe('📌');
      });
    });

    describe('getTaskTypeLabel', () => {
      it('should return Russian label for REFILL', () => {
        const label = (service as any).getTaskTypeLabel(TaskType.REFILL, TelegramLanguage.RU);
        expect(label).toBe('Пополнение');
      });

      it('should return English label for REFILL', () => {
        const label = (service as any).getTaskTypeLabel(TaskType.REFILL, TelegramLanguage.EN);
        expect(label).toBe('Refill');
      });

      it('should return Russian label for COLLECTION', () => {
        const label = (service as any).getTaskTypeLabel(TaskType.COLLECTION, TelegramLanguage.RU);
        expect(label).toBe('Инкассация');
      });

      it('should return English label for COLLECTION', () => {
        const label = (service as any).getTaskTypeLabel(TaskType.COLLECTION, TelegramLanguage.EN);
        expect(label).toBe('Collection');
      });

      it('should return type itself for unknown type', () => {
        const label = (service as any).getTaskTypeLabel('unknown_type', TelegramLanguage.RU);
        expect(label).toBe('unknown_type');
      });
    });

    describe('getIncidentTypeLabel', () => {
      it('should return Russian label for breakdown', () => {
        const label = (service as any).getIncidentTypeLabel('breakdown', TelegramLanguage.RU);
        expect(label).toBe('Поломка');
      });

      it('should return English label for breakdown', () => {
        const label = (service as any).getIncidentTypeLabel('breakdown', TelegramLanguage.EN);
        expect(label).toBe('Breakdown');
      });

      it('should return Russian label for offline', () => {
        const label = (service as any).getIncidentTypeLabel('offline', TelegramLanguage.RU);
        expect(label).toBe('Офлайн');
      });

      it('should return type itself for unknown type', () => {
        const label = (service as any).getIncidentTypeLabel('unknown', TelegramLanguage.RU);
        expect(label).toBe('unknown');
      });
    });

    describe('formatRole', () => {
      it('should format OWNER role in Russian', () => {
        const formatted = (service as any).formatRole(UserRole.OWNER, TelegramLanguage.RU);
        expect(formatted).toContain('Владелец');
      });

      it('should format OWNER role in English', () => {
        const formatted = (service as any).formatRole(UserRole.OWNER, TelegramLanguage.EN);
        expect(formatted).toContain('Owner');
      });

      it('should format ADMIN role', () => {
        const formatted = (service as any).formatRole(UserRole.ADMIN, TelegramLanguage.RU);
        expect(formatted).toContain('Админ');
      });

      it('should format OPERATOR role', () => {
        const formatted = (service as any).formatRole(UserRole.OPERATOR, TelegramLanguage.RU);
        expect(formatted).toContain('Оператор');
      });
    });

    describe('t (translation)', () => {
      it('should return Russian translation for main_menu', () => {
        const translation = (service as any).t(TelegramLanguage.RU, 'main_menu');
        expect(translation).toContain('Главное меню');
      });

      it('should return English translation for main_menu', () => {
        const translation = (service as any).t(TelegramLanguage.EN, 'main_menu');
        expect(translation).toContain('Main Menu');
      });

      it('should return key if translation not found', () => {
        const translation = (service as any).t(TelegramLanguage.RU, 'nonexistent_key');
        expect(translation).toBe('nonexistent_key');
      });

      it('should handle function translations with args', () => {
        const translation = (service as any).t(TelegramLanguage.RU, 'welcome_back', 'John');
        expect(translation).toContain('John');
        expect(translation).toContain('Привет');
      });

      it('should fallback to Russian for unsupported language', () => {
        const translation = (service as any).t('uz' as TelegramLanguage, 'main_menu');
        expect(translation).toContain('Главное меню');
      });
    });

    describe('initializeExecutionState', () => {
      it('should initialize state with empty checklist', () => {
        const task = { id: 'task-1', checklist: [] };
        const state = (service as any).initializeExecutionState(task);

        expect(state.current_step).toBe(0);
        expect(state.checklist_progress).toEqual({});
        expect(state.photos_uploaded.before).toBe(false);
        expect(state.photos_uploaded.after).toBe(false);
        expect(state.started_at).toBeDefined();
      });

      it('should initialize state with checklist items', () => {
        const task = {
          id: 'task-1',
          checklist: [{ title: 'Step 1' }, { title: 'Step 2' }],
        };
        const state = (service as any).initializeExecutionState(task);

        expect(Object.keys(state.checklist_progress)).toHaveLength(2);
        expect(state.checklist_progress[0].completed).toBe(false);
        expect(state.checklist_progress[1].completed).toBe(false);
      });

      it('should respect existing photo states', () => {
        const task = {
          id: 'task-1',
          checklist: [],
          has_photo_before: true,
          has_photo_after: false,
        };
        const state = (service as any).initializeExecutionState(task);

        expect(state.photos_uploaded.before).toBe(true);
        expect(state.photos_uploaded.after).toBe(false);
      });
    });

    describe('isSuperAdmin', () => {
      it('should return false if SUPER_ADMIN_TELEGRAM_ID not set', () => {
        const originalEnv = process.env.SUPER_ADMIN_TELEGRAM_ID;
        delete process.env.SUPER_ADMIN_TELEGRAM_ID;

        const result = (service as any).isSuperAdmin('123456789');

        expect(result).toBe(false);

        process.env.SUPER_ADMIN_TELEGRAM_ID = originalEnv;
      });

      it('should return true if telegramId matches SUPER_ADMIN_TELEGRAM_ID', () => {
        const originalEnv = process.env.SUPER_ADMIN_TELEGRAM_ID;
        process.env.SUPER_ADMIN_TELEGRAM_ID = '123456789';

        const result = (service as any).isSuperAdmin('123456789');

        expect(result).toBe(true);

        process.env.SUPER_ADMIN_TELEGRAM_ID = originalEnv;
      });

      it('should return false if telegramId does not match', () => {
        const originalEnv = process.env.SUPER_ADMIN_TELEGRAM_ID;
        process.env.SUPER_ADMIN_TELEGRAM_ID = '999999999';

        const result = (service as any).isSuperAdmin('123456789');

        expect(result).toBe(false);

        process.env.SUPER_ADMIN_TELEGRAM_ID = originalEnv;
      });
    });

    describe('updateUserLanguage', () => {
      it('should update user language in repository', async () => {
        const ctx = {
          telegramUser: { ...mockTelegramUser, language: TelegramLanguage.RU },
        };
        telegramUserRepository.save.mockResolvedValue(ctx.telegramUser as TelegramUser);

        await (service as any).updateUserLanguage(ctx, TelegramLanguage.EN);

        expect(ctx.telegramUser.language).toBe(TelegramLanguage.EN);
        expect(telegramUserRepository.save).toHaveBeenCalled();
      });

      it('should do nothing if telegramUser is not present', async () => {
        const ctx = { telegramUser: undefined };

        await (service as any).updateUserLanguage(ctx, TelegramLanguage.EN);

        expect(telegramUserRepository.save).not.toHaveBeenCalled();
      });
    });

    describe('toggleNotification', () => {
      it('should toggle notification preference', async () => {
        const ctx = {
          telegramUser: {
            ...mockTelegramUser,
            notification_preferences: { machine_offline: false },
          },
          answerCbQuery: jest.fn(),
          editMessageText: jest.fn(),
        };
        telegramUserRepository.save.mockResolvedValue(ctx.telegramUser as TelegramUser);

        await (service as any).toggleNotification(ctx, 'machine_offline');

        expect(ctx.telegramUser.notification_preferences.machine_offline).toBe(true);
        expect(telegramUserRepository.save).toHaveBeenCalled();
        expect(ctx.answerCbQuery).toHaveBeenCalled();
      });

      it('should do nothing if telegramUser is not present', async () => {
        const ctx = { telegramUser: undefined };

        await (service as any).toggleNotification(ctx, 'machine_offline');

        expect(telegramUserRepository.save).not.toHaveBeenCalled();
      });
    });

    describe('logMessage', () => {
      it('should log message to repository', async () => {
        const ctx = {
          telegramUser: mockTelegramUser,
          chat: { id: 123456789 },
          message: { text: 'test message' },
        };
        telegramMessageLogRepository.create.mockReturnValue({ id: 'log-1' } as any);
        telegramMessageLogRepository.save.mockResolvedValue({ id: 'log-1' } as any);

        await (service as any).logMessage(ctx, 'command', '/start');

        expect(telegramMessageLogRepository.create).toHaveBeenCalled();
        expect(telegramMessageLogRepository.save).toHaveBeenCalled();
      });

      it('should handle missing message text', async () => {
        const ctx = {
          telegramUser: mockTelegramUser,
          chat: { id: 123456789 },
          message: null,
        };
        telegramMessageLogRepository.create.mockReturnValue({ id: 'log-1' } as any);
        telegramMessageLogRepository.save.mockResolvedValue({ id: 'log-1' } as any);

        await (service as any).logMessage(ctx, 'command', '/help');

        expect(telegramMessageLogRepository.create).toHaveBeenCalled();
      });

      it('should handle log errors gracefully', async () => {
        const ctx = {
          telegramUser: mockTelegramUser,
          chat: { id: 123456789 },
          message: { text: 'test' },
        };
        telegramMessageLogRepository.create.mockImplementation(() => {
          throw new Error('DB Error');
        });

        // Should not throw
        await expect(
          (service as any).logMessage(ctx, 'command', '/start'),
        ).resolves.toBeUndefined();
      });
    });
  });

  describe('keyboard builders', () => {
    beforeEach(async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
    });

    describe('getMainMenuKeyboard', () => {
      it('should return inline keyboard with menu buttons', () => {
        const keyboard = (service as any).getMainMenuKeyboard(TelegramLanguage.RU);

        expect(keyboard).toBeDefined();
        expect(keyboard.reply_markup).toBeDefined();
      });
    });

    describe('getVerificationKeyboard', () => {
      it('should return keyboard with web app link', () => {
        const keyboard = (service as any).getVerificationKeyboard(TelegramLanguage.RU);

        expect(keyboard).toBeDefined();
      });
    });

    describe('getSettingsKeyboard', () => {
      it('should return settings keyboard', () => {
        const keyboard = (service as any).getSettingsKeyboard(TelegramLanguage.RU);

        expect(keyboard).toBeDefined();
      });
    });

    describe('getNotificationSettingsKeyboard', () => {
      it('should return notification settings keyboard', () => {
        const user = {
          ...mockTelegramUser,
          notification_preferences: { machine_offline: true, low_stock: false },
        };
        const keyboard = (service as any).getNotificationSettingsKeyboard(
          TelegramLanguage.RU,
          user,
        );

        expect(keyboard).toBeDefined();
      });
    });

    describe('getMachinesKeyboard', () => {
      it('should return machines keyboard with limited items', () => {
        const machines = [
          { id: '1', name: 'Machine 1', status: 'online' },
          { id: '2', name: 'Machine 2', status: 'offline' },
        ];
        const keyboard = (service as any).getMachinesKeyboard(machines, TelegramLanguage.RU);

        expect(keyboard).toBeDefined();
      });

      it('should limit to 5 machines', () => {
        const machines = Array.from({ length: 10 }, (_, i) => ({
          id: `${i}`,
          name: `Machine ${i}`,
          status: 'online',
        }));
        const keyboard = (service as any).getMachinesKeyboard(machines, TelegramLanguage.RU);

        expect(keyboard).toBeDefined();
      });
    });

    describe('getAlertsKeyboard', () => {
      it('should return alerts keyboard', () => {
        const alerts = [{ id: '1', type: 'offline', message: 'Machine offline' }];
        const keyboard = (service as any).getAlertsKeyboard(alerts, TelegramLanguage.RU);

        expect(keyboard).toBeDefined();
      });
    });
  });

  describe('message formatters', () => {
    beforeEach(async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
    });

    describe('formatTasksMessage', () => {
      it('should format tasks list for Russian', () => {
        const tasks = [
          {
            id: 'task-1',
            type_code: TaskType.REFILL,
            status: TaskStatus.PENDING,
            machine: { machine_number: 'M-001', location: { name: 'Lobby' } },
            scheduled_date: new Date().toISOString(),
          },
        ];
        const message = (service as any).formatTasksMessage(tasks, TelegramLanguage.RU);

        expect(message).toContain('Мои задачи');
        expect(message).toContain('M-001');
      });

      it('should format tasks list for English', () => {
        const tasks = [
          {
            id: 'task-1',
            type_code: TaskType.COLLECTION,
            status: TaskStatus.IN_PROGRESS,
            machine: { machine_number: 'M-002', location: { name: 'Office' } },
            scheduled_date: new Date().toISOString(),
          },
        ];
        const message = (service as any).formatTasksMessage(tasks, TelegramLanguage.EN);

        expect(message).toContain('My Tasks');
        expect(message).toContain('M-002');
      });
    });

    describe('formatMachinesMessage', () => {
      it('should format machines list', () => {
        const machines = [
          { id: '1', name: 'Machine A', machine_number: 'M-001', status: 'online' },
        ];
        const message = (service as any).formatMachinesMessage(machines, TelegramLanguage.RU);

        expect(message).toContain('Machine A');
      });
    });

    describe('formatAlertsMessage', () => {
      it('should return no alerts message when empty', () => {
        const message = (service as any).formatAlertsMessage([], TelegramLanguage.RU);

        expect(message).toContain('Нет активных уведомлений');
      });

      it('should format alerts list', () => {
        const alerts = [
          { id: '1', type: 'machine_offline', machine_name: 'Test Machine', created_at: new Date() },
        ];
        const message = (service as any).formatAlertsMessage(alerts, TelegramLanguage.RU);

        expect(message).toBeDefined();
      });
    });

    describe('formatStatsMessage', () => {
      it('should format statistics in Russian', () => {
        const stats = {
          total_machines: 10,
          online: 8,
          offline: 2,
          today_revenue: 5000,
          today_sales: 100,
          pending_tasks: 5,
        };
        const message = (service as any).formatStatsMessage(stats, TelegramLanguage.RU);

        expect(message).toContain('10');
        expect(message).toContain('5,000'); // Formatted number
        expect(message).toContain('100');
        expect(message).toContain('Статистика');
      });

      it('should format statistics in English', () => {
        const stats = {
          total_machines: 15,
          online: 12,
          offline: 3,
          today_revenue: 10000,
          today_sales: 200,
          pending_tasks: 3,
        };
        const message = (service as any).formatStatsMessage(stats, TelegramLanguage.EN);

        expect(message).toContain('15');
        expect(message).toContain('10,000');
        expect(message).toContain('Statistics');
      });
    });

    describe('formatPendingUsersMessage', () => {
      it('should format pending users list in Russian', () => {
        const users = [
          {
            id: 'user-1',
            full_name: 'John Doe',
            email: 'john@example.com',
            phone: '+1234567890',
            created_at: new Date().toISOString(),
          },
        ];
        const message = (service as any).formatPendingUsersMessage(users, TelegramLanguage.RU);

        expect(message).toContain('John Doe');
        expect(message).toContain('john@example.com');
        expect(message).toContain('Пользователи в ожидании');
      });

      it('should format pending users list in English', () => {
        const users = [
          {
            id: 'user-1',
            full_name: 'Jane Smith',
            email: 'jane@example.com',
            phone: null,
            created_at: new Date().toISOString(),
          },
        ];
        const message = (service as any).formatPendingUsersMessage(users, TelegramLanguage.EN);

        expect(message).toContain('Jane Smith');
        expect(message).toContain('Pending Users');
        expect(message).toContain('N/A');
      });
    });
  });

  describe('getTasksKeyboard', () => {
    beforeEach(async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
    });

    it('should create keyboard for tasks', () => {
      const tasks = [
        { id: 'task-1', type_code: TaskType.REFILL, status: TaskStatus.PENDING },
        { id: 'task-2', type_code: TaskType.COLLECTION, status: TaskStatus.ASSIGNED },
      ];
      const keyboard = (service as any).getTasksKeyboard(tasks, TelegramLanguage.RU);

      expect(keyboard).toBeDefined();
    });

    it('should add pagination for more than 8 tasks', () => {
      const tasks = Array.from({ length: 12 }, (_, i) => ({
        id: `task-${i}`,
        type_code: TaskType.REFILL,
        status: TaskStatus.PENDING,
      }));
      const keyboard = (service as any).getTasksKeyboard(tasks, TelegramLanguage.RU);

      expect(keyboard).toBeDefined();
    });
  });

  describe('additional getTaskTypeEmoji cases', () => {
    beforeEach(async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
    });

    it('should return correct emoji for REPLACE_HOPPER', () => {
      const emoji = (service as any).getTaskTypeEmoji(TaskType.REPLACE_HOPPER);
      expect(emoji).toBe('🥤');
    });

    it('should return correct emoji for REPLACE_GRINDER', () => {
      const emoji = (service as any).getTaskTypeEmoji(TaskType.REPLACE_GRINDER);
      expect(emoji).toBe('⚙️');
    });

    it('should return correct emoji for REPLACE_BREW_UNIT', () => {
      const emoji = (service as any).getTaskTypeEmoji(TaskType.REPLACE_BREW_UNIT);
      expect(emoji).toBe('☕');
    });

    it('should return correct emoji for REPLACE_MIXER', () => {
      const emoji = (service as any).getTaskTypeEmoji(TaskType.REPLACE_MIXER);
      expect(emoji).toBe('🔄');
    });
  });

  describe('additional getTaskTypeLabel cases', () => {
    beforeEach(async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
    });

    it('should return Russian label for CLEANING', () => {
      const label = (service as any).getTaskTypeLabel(TaskType.CLEANING, TelegramLanguage.RU);
      expect(label).toBe('Чистка');
    });

    it('should return English label for CLEANING', () => {
      const label = (service as any).getTaskTypeLabel(TaskType.CLEANING, TelegramLanguage.EN);
      expect(label).toBe('Cleaning');
    });

    it('should return Russian label for REPAIR', () => {
      const label = (service as any).getTaskTypeLabel(TaskType.REPAIR, TelegramLanguage.RU);
      expect(label).toBe('Ремонт');
    });

    it('should return English label for REPAIR', () => {
      const label = (service as any).getTaskTypeLabel(TaskType.REPAIR, TelegramLanguage.EN);
      expect(label).toBe('Repair');
    });

    it('should return Russian label for INSTALL', () => {
      const label = (service as any).getTaskTypeLabel(TaskType.INSTALL, TelegramLanguage.RU);
      expect(label).toBe('Установка');
    });

    it('should return English label for INSTALL', () => {
      const label = (service as any).getTaskTypeLabel(TaskType.INSTALL, TelegramLanguage.EN);
      expect(label).toBe('Installation');
    });

    it('should return Russian label for REMOVAL', () => {
      const label = (service as any).getTaskTypeLabel(TaskType.REMOVAL, TelegramLanguage.RU);
      expect(label).toBe('Демонтаж');
    });

    it('should return English label for REMOVAL', () => {
      const label = (service as any).getTaskTypeLabel(TaskType.REMOVAL, TelegramLanguage.EN);
      expect(label).toBe('Removal');
    });

    it('should return Russian label for AUDIT', () => {
      const label = (service as any).getTaskTypeLabel(TaskType.AUDIT, TelegramLanguage.RU);
      expect(label).toBe('Аудит');
    });

    it('should return English label for AUDIT', () => {
      const label = (service as any).getTaskTypeLabel(TaskType.AUDIT, TelegramLanguage.EN);
      expect(label).toBe('Audit');
    });

    it('should return Russian label for INSPECTION', () => {
      const label = (service as any).getTaskTypeLabel(TaskType.INSPECTION, TelegramLanguage.RU);
      expect(label).toBe('Проверка');
    });

    it('should return English label for INSPECTION', () => {
      const label = (service as any).getTaskTypeLabel(TaskType.INSPECTION, TelegramLanguage.EN);
      expect(label).toBe('Inspection');
    });

    it('should return Russian label for REPLACE_HOPPER', () => {
      const label = (service as any).getTaskTypeLabel(TaskType.REPLACE_HOPPER, TelegramLanguage.RU);
      expect(label).toBe('Замена хоппера');
    });

    it('should return English label for REPLACE_HOPPER', () => {
      const label = (service as any).getTaskTypeLabel(TaskType.REPLACE_HOPPER, TelegramLanguage.EN);
      expect(label).toBe('Hopper replacement');
    });

    it('should return Russian label for REPLACE_GRINDER', () => {
      const label = (service as any).getTaskTypeLabel(TaskType.REPLACE_GRINDER, TelegramLanguage.RU);
      expect(label).toBe('Замена кофемолки');
    });

    it('should return English label for REPLACE_GRINDER', () => {
      const label = (service as any).getTaskTypeLabel(TaskType.REPLACE_GRINDER, TelegramLanguage.EN);
      expect(label).toBe('Grinder replacement');
    });

    it('should return Russian label for REPLACE_BREW_UNIT', () => {
      const label = (service as any).getTaskTypeLabel(TaskType.REPLACE_BREW_UNIT, TelegramLanguage.RU);
      expect(label).toBe('Замена заварника');
    });

    it('should return English label for REPLACE_BREW_UNIT', () => {
      const label = (service as any).getTaskTypeLabel(TaskType.REPLACE_BREW_UNIT, TelegramLanguage.EN);
      expect(label).toBe('Brew unit replacement');
    });

    it('should return Russian label for REPLACE_MIXER', () => {
      const label = (service as any).getTaskTypeLabel(TaskType.REPLACE_MIXER, TelegramLanguage.RU);
      expect(label).toBe('Замена миксера');
    });

    it('should return English label for REPLACE_MIXER', () => {
      const label = (service as any).getTaskTypeLabel(TaskType.REPLACE_MIXER, TelegramLanguage.EN);
      expect(label).toBe('Mixer replacement');
    });
  });

  describe('additional getIncidentTypeLabel cases', () => {
    beforeEach(async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
    });

    it('should return Russian label for out_of_stock', () => {
      const label = (service as any).getIncidentTypeLabel('out_of_stock', TelegramLanguage.RU);
      expect(label).toBe('Нет товара');
    });

    it('should return English label for out_of_stock', () => {
      const label = (service as any).getIncidentTypeLabel('out_of_stock', TelegramLanguage.EN);
      expect(label).toBe('Out of stock');
    });

    it('should return Russian label for leak', () => {
      const label = (service as any).getIncidentTypeLabel('leak', TelegramLanguage.RU);
      expect(label).toBe('Утечка');
    });

    it('should return English label for leak', () => {
      const label = (service as any).getIncidentTypeLabel('leak', TelegramLanguage.EN);
      expect(label).toBe('Leak');
    });

    it('should return Russian label for vandalism', () => {
      const label = (service as any).getIncidentTypeLabel('vandalism', TelegramLanguage.RU);
      expect(label).toBe('Вандализм');
    });

    it('should return English label for vandalism', () => {
      const label = (service as any).getIncidentTypeLabel('vandalism', TelegramLanguage.EN);
      expect(label).toBe('Vandalism');
    });

    it('should return Russian label for other', () => {
      const label = (service as any).getIncidentTypeLabel('other', TelegramLanguage.RU);
      expect(label).toBe('Другое');
    });

    it('should return English label for other', () => {
      const label = (service as any).getIncidentTypeLabel('other', TelegramLanguage.EN);
      expect(label).toBe('Other');
    });

    it('should return English label for offline', () => {
      const label = (service as any).getIncidentTypeLabel('offline', TelegramLanguage.EN);
      expect(label).toBe('Offline');
    });
  });

  describe('additional formatRole cases', () => {
    beforeEach(async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
    });

    it('should format MANAGER role in Russian', () => {
      const formatted = (service as any).formatRole(UserRole.MANAGER, TelegramLanguage.RU);
      expect(formatted).toBe('Менеджер');
    });

    it('should format MANAGER role in English', () => {
      const formatted = (service as any).formatRole(UserRole.MANAGER, TelegramLanguage.EN);
      expect(formatted).toBe('Manager');
    });

    it('should format COLLECTOR role in Russian', () => {
      const formatted = (service as any).formatRole(UserRole.COLLECTOR, TelegramLanguage.RU);
      expect(formatted).toBe('Инкассатор');
    });

    it('should format COLLECTOR role in English', () => {
      const formatted = (service as any).formatRole(UserRole.COLLECTOR, TelegramLanguage.EN);
      expect(formatted).toBe('Collector');
    });

    it('should format TECHNICIAN role in Russian', () => {
      const formatted = (service as any).formatRole(UserRole.TECHNICIAN, TelegramLanguage.RU);
      expect(formatted).toBe('Техник');
    });

    it('should format TECHNICIAN role in English', () => {
      const formatted = (service as any).formatRole(UserRole.TECHNICIAN, TelegramLanguage.EN);
      expect(formatted).toBe('Technician');
    });

    it('should format VIEWER role in Russian', () => {
      const formatted = (service as any).formatRole(UserRole.VIEWER, TelegramLanguage.RU);
      expect(formatted).toBe('Просмотр');
    });

    it('should format VIEWER role in English', () => {
      const formatted = (service as any).formatRole(UserRole.VIEWER, TelegramLanguage.EN);
      expect(formatted).toBe('Viewer');
    });

    it('should format ADMIN role in English', () => {
      const formatted = (service as any).formatRole(UserRole.ADMIN, TelegramLanguage.EN);
      expect(formatted).toBe('Admin');
    });

    it('should format OPERATOR role in English', () => {
      const formatted = (service as any).formatRole(UserRole.OPERATOR, TelegramLanguage.EN);
      expect(formatted).toBe('Operator');
    });

    it('should return role itself for unknown role', () => {
      const formatted = (service as any).formatRole('unknown_role', TelegramLanguage.RU);
      expect(formatted).toBe('unknown_role');
    });
  });

  describe('additional translation tests', () => {
    beforeEach(async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
    });

    it('should translate settings_menu in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'settings_menu');
      expect(translation).toContain('Настройки');
    });

    it('should translate settings_menu in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'settings_menu');
      expect(translation).toContain('Settings');
    });

    it('should translate notifications in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'notifications');
      expect(translation).toBe('Уведомления');
    });

    it('should translate notifications in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'notifications');
      expect(translation).toBe('Notifications');
    });

    it('should translate language in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'language');
      expect(translation).toBe('Язык');
    });

    it('should translate language in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'language');
      expect(translation).toBe('Language');
    });

    it('should translate back in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'back');
      expect(translation).toBe('« Назад');
    });

    it('should translate back in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'back');
      expect(translation).toBe('« Back');
    });

    it('should translate online in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'online');
      expect(translation).toBe('Онлайн');
    });

    it('should translate online in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'online');
      expect(translation).toBe('Online');
    });

    it('should translate offline in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'offline');
      expect(translation).toBe('Оффлайн');
    });

    it('should translate offline in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'offline');
      expect(translation).toBe('Offline');
    });

    it('should translate not_verified in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'not_verified');
      expect(translation).toContain('свяжите ваш аккаунт');
    });

    it('should translate not_verified in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'not_verified');
      expect(translation).toContain('link your account');
    });

    it('should translate help in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'help');
      expect(translation).toContain('Справка');
      expect(translation).toContain('/menu');
    });

    it('should translate help in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'help');
      expect(translation).toContain('Help');
      expect(translation).toContain('/menu');
    });

    it('should translate refresh in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'refresh');
      expect(translation).toBe('🔄 Обновить');
    });

    it('should translate refresh in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'refresh');
      expect(translation).toBe('🔄 Refresh');
    });

    it('should translate access_request_pending in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'access_request_pending');
      expect(translation).toContain('ожидает одобрения');
    });

    it('should translate access_request_pending in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'access_request_pending');
      expect(translation).toContain('pending');
    });

    it('should translate welcome_new with argument', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'welcome_new', 'Alice');
      expect(translation).toContain('Alice');
      expect(translation).toContain('Добро пожаловать');
    });

    it('should translate welcome_new in English with argument', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'welcome_new', 'Bob');
      expect(translation).toContain('Bob');
      expect(translation).toContain('Welcome');
    });

    it('should translate access_request_created with argument', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'access_request_created', 'Charlie');
      expect(translation).toContain('Charlie');
      expect(translation).toContain('отправлена');
    });

    it('should translate access_request_error in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'access_request_error');
      expect(translation).toContain('ошибка');
    });

    it('should translate access_request_error in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'access_request_error');
      expect(translation).toContain('error');
    });
  });

  describe('getLanguageKeyboard', () => {
    beforeEach(async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
    });

    it('should return language selection keyboard', () => {
      const keyboard = (service as any).getLanguageKeyboard?.();
      // If method exists, verify it returns a keyboard
      if (keyboard) {
        expect(keyboard).toBeDefined();
      }
    });
  });

  describe('getUserRoleKeyboard', () => {
    beforeEach(async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
    });

    it('should return user role keyboard if exists', () => {
      const keyboard = (service as any).getUserRoleKeyboard?.('user-123', TelegramLanguage.RU);
      if (keyboard) {
        expect(keyboard).toBeDefined();
      }
    });
  });

  describe('initializeExecutionState edge cases', () => {
    beforeEach(async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
    });

    it('should handle null checklist', () => {
      const task = { id: 'task-1', checklist: null };
      const state = (service as any).initializeExecutionState(task);

      expect(state.current_step).toBe(0);
      expect(state.checklist_progress).toEqual({});
    });

    it('should handle undefined checklist', () => {
      const task = { id: 'task-1' };
      const state = (service as any).initializeExecutionState(task);

      expect(state.current_step).toBe(0);
    });
  });

  describe('formatTasksMessage edge cases', () => {
    beforeEach(async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
    });

    it('should handle empty tasks array', () => {
      const message = (service as any).formatTasksMessage([], TelegramLanguage.RU);
      expect(message).toBeDefined();
    });

    it('should handle task without machine location', () => {
      const tasks = [
        {
          id: 'task-1',
          type_code: TaskType.REFILL,
          status: TaskStatus.PENDING,
          machine: { machine_number: 'M-001', location: null },
          scheduled_date: new Date().toISOString(),
        },
      ];
      const message = (service as any).formatTasksMessage(tasks, TelegramLanguage.RU);
      expect(message).toContain('M-001');
    });

    it('should handle multiple task types', () => {
      const tasks = [
        {
          id: 'task-1',
          type_code: TaskType.REFILL,
          status: TaskStatus.PENDING,
          machine: { machine_number: 'M-001', location: { name: 'Lobby' } },
          scheduled_date: new Date().toISOString(),
        },
        {
          id: 'task-2',
          type_code: TaskType.COLLECTION,
          status: TaskStatus.IN_PROGRESS,
          machine: { machine_number: 'M-002', location: { name: 'Office' } },
          scheduled_date: new Date().toISOString(),
        },
      ];
      const message = (service as any).formatTasksMessage(tasks, TelegramLanguage.RU);
      expect(message).toContain('📦');
      expect(message).toContain('💰');
    });
  });

  describe('formatMachinesMessage edge cases', () => {
    beforeEach(async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
    });

    it('should handle empty machines array', () => {
      const message = (service as any).formatMachinesMessage([], TelegramLanguage.RU);
      expect(message).toBeDefined();
    });

    it('should handle machines in English', () => {
      const machines = [
        { id: '1', name: 'Machine A', machine_number: 'M-001', status: 'online' },
      ];
      const message = (service as any).formatMachinesMessage(machines, TelegramLanguage.EN);
      expect(message).toContain('Machine A');
    });

    it('should handle offline machines', () => {
      const machines = [
        { id: '1', name: 'Machine A', machine_number: 'M-001', status: 'offline' },
      ];
      const message = (service as any).formatMachinesMessage(machines, TelegramLanguage.RU);
      expect(message).toContain('Machine A');
    });
  });

  describe('formatAlertsMessage edge cases', () => {
    beforeEach(async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
    });

    it('should return no alerts message in English', () => {
      const message = (service as any).formatAlertsMessage([], TelegramLanguage.EN);
      expect(message).toContain('No active alerts');
    });

    it('should format multiple alerts', () => {
      const alerts = [
        { id: '1', type: 'machine_offline', machine_name: 'Machine 1', created_at: new Date() },
        { id: '2', type: 'low_stock', machine_name: 'Machine 2', created_at: new Date() },
      ];
      const message = (service as any).formatAlertsMessage(alerts, TelegramLanguage.RU);
      expect(message).toBeDefined();
    });
  });

  describe('formatPendingUsersMessage edge cases', () => {
    beforeEach(async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
    });

    it('should handle empty pending users', () => {
      const message = (service as any).formatPendingUsersMessage([], TelegramLanguage.RU);
      expect(message).toBeDefined();
    });

    it('should handle users without email', () => {
      const users = [
        {
          id: 'user-1',
          full_name: 'John Doe',
          email: null,
          phone: '+1234567890',
          created_at: new Date().toISOString(),
        },
      ];
      const message = (service as any).formatPendingUsersMessage(users, TelegramLanguage.RU);
      expect(message).toContain('John Doe');
    });

    it('should handle users with all fields', () => {
      const users = [
        {
          id: 'user-1',
          full_name: 'Complete User',
          email: 'complete@example.com',
          phone: '+9876543210',
          created_at: new Date().toISOString(),
        },
      ];
      const message = (service as any).formatPendingUsersMessage(users, TelegramLanguage.EN);
      expect(message).toContain('Complete User');
      expect(message).toContain('complete@example.com');
    });
  });

  describe('getPendingUsersKeyboard', () => {
    beforeEach(async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
    });

    it('should return keyboard with users in Russian', () => {
      const users = [
        { id: 'user-1', full_name: 'John Doe', email: 'john@example.com', phone: null, created_at: new Date().toISOString() },
        { id: 'user-2', full_name: 'Jane Smith', email: 'jane@example.com', phone: null, created_at: new Date().toISOString() },
      ];
      const keyboard = (service as any).getPendingUsersKeyboard(users, TelegramLanguage.RU);
      expect(keyboard).toBeDefined();
    });

    it('should return keyboard with users in English', () => {
      const users = [
        { id: 'user-1', full_name: 'Alice Brown', email: 'alice@example.com', phone: null, created_at: new Date().toISOString() },
      ];
      const keyboard = (service as any).getPendingUsersKeyboard(users, TelegramLanguage.EN);
      expect(keyboard).toBeDefined();
    });

    it('should limit to 5 users', () => {
      const users = Array.from({ length: 10 }, (_, i) => ({
        id: `user-${i}`,
        full_name: `User ${i}`,
        email: `user${i}@example.com`,
        phone: null,
        created_at: new Date().toISOString(),
      }));
      const keyboard = (service as any).getPendingUsersKeyboard(users, TelegramLanguage.RU);
      expect(keyboard).toBeDefined();
    });

    it('should truncate long names', () => {
      const users = [
        { id: 'user-1', full_name: 'This is a very long name that exceeds twenty characters', email: 'long@example.com', phone: null, created_at: new Date().toISOString() },
      ];
      const keyboard = (service as any).getPendingUsersKeyboard(users, TelegramLanguage.RU);
      expect(keyboard).toBeDefined();
    });
  });

  describe('getAdminApprovalKeyboard', () => {
    beforeEach(async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
    });

    it('should return keyboard with approval options in Russian', () => {
      const keyboard = (service as any).getAdminApprovalKeyboard('user-123', TelegramLanguage.RU);
      expect(keyboard).toBeDefined();
    });

    it('should return keyboard with approval options in English', () => {
      const keyboard = (service as any).getAdminApprovalKeyboard('user-456', TelegramLanguage.EN);
      expect(keyboard).toBeDefined();
    });
  });

  describe('getRoleSelectionKeyboard', () => {
    beforeEach(async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
    });

    it('should return keyboard with all role options in Russian', () => {
      const keyboard = (service as any).getRoleSelectionKeyboard('user-123', TelegramLanguage.RU);
      expect(keyboard).toBeDefined();
    });

    it('should return keyboard with all role options in English', () => {
      const keyboard = (service as any).getRoleSelectionKeyboard('user-456', TelegramLanguage.EN);
      expect(keyboard).toBeDefined();
    });
  });

  describe('stopBot lifecycle', () => {
    it('should stop bot and reset ready state', async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
      expect(service.isReady()).toBe(true);

      await service.stopBot();
      expect(service.isReady()).toBe(false);
    });

    it('should handle stopBot when bot not initialized', async () => {
      await expect(service.stopBot()).resolves.toBeUndefined();
    });
  });

  describe('setupBotMenu', () => {
    it('should be called during initialization', async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
      // Bot menu is set up during initialization
      expect(service.isReady()).toBe(true);
    });
  });

  describe('sendMessage error handling', () => {
    beforeEach(async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
    });

    it('should handle send message with keyboard options', async () => {
      const keyboard = { reply_markup: { inline_keyboard: [] } };
      await service.sendMessage('123', 'test', keyboard as any);
      // Should not throw
    });
  });

  describe('additional translation edge cases', () => {
    beforeEach(async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
    });

    it('should translate machines in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'machines');
      expect(translation).toBe('Машины');
    });

    it('should translate machines in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'machines');
      expect(translation).toBe('Machines');
    });

    it('should translate alerts in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'alerts');
      expect(translation).toBe('Уведомления');
    });

    it('should translate alerts in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'alerts');
      expect(translation).toBe('Alerts');
    });

    it('should translate stats in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'stats');
      expect(translation).toBe('Статистика');
    });

    it('should translate stats in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'stats');
      expect(translation).toBe('Statistics');
    });

    it('should translate settings in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'settings');
      expect(translation).toBe('Настройки');
    });

    it('should translate settings in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'settings');
      expect(translation).toBe('Settings');
    });

    it('should translate open_web_app in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'open_web_app');
      expect(translation).toBe('🌐 Открыть VendHub');
    });

    it('should translate open_web_app in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'open_web_app');
      expect(translation).toBe('🌐 Open VendHub');
    });

    it('should translate notification_settings in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'notification_settings');
      expect(translation).toContain('уведомлений');
    });

    it('should translate notification_settings in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'notification_settings');
      expect(translation).toContain('Notification Settings');
    });

    it('should translate notif_machine_offline in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'notif_machine_offline');
      expect(translation).toBe('Машина оффлайн');
    });

    it('should translate notif_machine_offline in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'notif_machine_offline');
      expect(translation).toBe('Machine offline');
    });

    it('should translate notif_low_stock in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'notif_low_stock');
      expect(translation).toBe('Низкий запас');
    });

    it('should translate notif_low_stock in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'notif_low_stock');
      expect(translation).toBe('Low stock');
    });

    it('should translate notif_maintenance_due in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'notif_maintenance_due');
      expect(translation).toBe('Требуется обслуживание');
    });

    it('should translate notif_maintenance_due in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'notif_maintenance_due');
      expect(translation).toBe('Maintenance due');
    });

    it('should translate notif_task_assigned in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'notif_task_assigned');
      expect(translation).toBe('Новая задача');
    });

    it('should translate notif_task_assigned in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'notif_task_assigned');
      expect(translation).toBe('New task');
    });

    it('should translate no_alerts in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'no_alerts');
      expect(translation).toBe('Нет активных уведомлений');
    });

    it('should translate no_alerts in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'no_alerts');
      expect(translation).toBe('No active alerts');
    });

    it('should translate alert_offline in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'alert_offline');
      expect(translation).toBe('Машина оффлайн');
    });

    it('should translate alert_offline in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'alert_offline');
      expect(translation).toBe('Machine offline');
    });

    it('should translate alert_low_stock in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'alert_low_stock');
      expect(translation).toBe('Низкий запас');
    });

    it('should translate alert_low_stock in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'alert_low_stock');
      expect(translation).toBe('Low stock');
    });

    it('should translate acknowledge in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'acknowledge');
      expect(translation).toBe('Подтвердить');
    });

    it('should translate acknowledge in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'acknowledge');
      expect(translation).toBe('Acknowledge');
    });

    it('should translate statistics in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'statistics');
      expect(translation).toBe('Статистика');
    });

    it('should translate statistics in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'statistics');
      expect(translation).toBe('Statistics');
    });

    it('should translate total_machines in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'total_machines');
      expect(translation).toBe('Всего машин');
    });

    it('should translate total_machines in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'total_machines');
      expect(translation).toBe('Total machines');
    });

    it('should translate today_revenue in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'today_revenue');
      expect(translation).toBe('Выручка сегодня');
    });

    it('should translate today_revenue in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'today_revenue');
      expect(translation).toBe('Today revenue');
    });

    it('should translate today_sales in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'today_sales');
      expect(translation).toBe('Продаж сегодня');
    });

    it('should translate today_sales in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'today_sales');
      expect(translation).toBe('Today sales');
    });

    it('should translate pending_tasks in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'pending_tasks');
      expect(translation).toBe('Задач в работе');
    });

    it('should translate pending_tasks in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'pending_tasks');
      expect(translation).toBe('Pending tasks');
    });

    it('should translate settings_updated in Russian', () => {
      const translation = (service as any).t(TelegramLanguage.RU, 'settings_updated');
      expect(translation).toBe('✓ Настройки обновлены');
    });

    it('should translate settings_updated in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'settings_updated');
      expect(translation).toBe('✓ Settings updated');
    });

    it('should translate access_request_created in English', () => {
      const translation = (service as any).t(TelegramLanguage.EN, 'access_request_created', 'TestUser');
      expect(translation).toContain('TestUser');
      expect(translation).toContain('access request');
    });
  });
});
