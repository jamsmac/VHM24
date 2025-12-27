import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramUser, TelegramLanguage } from '../../shared/entities/telegram-user.entity';
import { TelegramSettings } from '../../shared/entities/telegram-settings.entity';
import { TelegramSessionService } from '../../infrastructure/services/telegram-session.service';
import { TelegramCommandHandlerService } from './telegram-command-handler.service';
import { TelegramCallbackHandlerService } from './telegram-callback-handler.service';
import { TelegramTaskCallbackService } from './telegram-task-callback.service';
import { TelegramAdminCallbackService } from './telegram-admin-callback.service';
import { TelegramSprint3Service } from './telegram-sprint3.service';
import { TelegramTaskOperationsService } from './telegram-task-operations.service';
import { TelegramDataCommandsService } from './telegram-data-commands.service';
import { TelegramUIService } from './telegram-ui.service';
import { TelegramUtilitiesService } from './telegram-utilities.service';

// Capture handlers for testing
const capturedHandlers: {
  middleware: ((ctx: any, next: () => Promise<void>) => Promise<void>)[];
  commands: Map<string, (ctx: any) => Promise<void>>;
  actions: Map<string | RegExp, (ctx: any) => Promise<void>>;
  events: Map<string, (ctx: any) => Promise<void>>;
} = {
  middleware: [],
  commands: new Map(),
  actions: new Map(),
  events: new Map(),
};

// Reset captured handlers
const resetCapturedHandlers = () => {
  capturedHandlers.middleware = [];
  capturedHandlers.commands.clear();
  capturedHandlers.actions.clear();
  capturedHandlers.events.clear();
};

// Mock Telegraf with handler capture
const mockTelegram = {
  setMyCommands: jest.fn().mockResolvedValue(undefined),
  sendMessage: jest.fn().mockResolvedValue(undefined),
};

jest.mock('telegraf', () => ({
  Telegraf: jest.fn().mockImplementation(() => ({
    use: jest.fn((handler) => {
      capturedHandlers.middleware.push(handler);
    }),
    command: jest.fn((name, handler) => {
      capturedHandlers.commands.set(name, handler);
    }),
    action: jest.fn((pattern, handler) => {
      capturedHandlers.actions.set(pattern, handler);
    }),
    on: jest.fn((event, handler) => {
      capturedHandlers.events.set(event, handler);
    }),
    launch: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    telegram: mockTelegram,
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
  let sessionService: jest.Mocked<TelegramSessionService>;
  let commandHandlerService: jest.Mocked<TelegramCommandHandlerService>;
  let callbackHandlerService: jest.Mocked<TelegramCallbackHandlerService>;
  let taskCallbackService: jest.Mocked<TelegramTaskCallbackService>;
  let adminCallbackService: jest.Mocked<TelegramAdminCallbackService>;
  let sprint3Service: jest.Mocked<TelegramSprint3Service>;
  let taskOperationsService: jest.Mocked<TelegramTaskOperationsService>;
  let dataCommandsService: jest.Mocked<TelegramDataCommandsService>;
  let uiService: jest.Mocked<TelegramUIService>;
  let utilitiesService: jest.Mocked<TelegramUtilitiesService>;

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
          provide: TelegramSessionService,
          useValue: {
            getSession: jest.fn(),
            saveSession: jest.fn(),
            updateSessionState: jest.fn(),
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
          provide: TelegramAdminCallbackService,
          useValue: {
            handleExpandUser: jest.fn(),
            handleApproveUser: jest.fn(),
            handleRejectUser: jest.fn(),
            handleRefreshPendingUsers: jest.fn(),
            handleRejectUserInput: jest.fn().mockResolvedValue(false),
            isSuperAdmin: jest.fn(),
            notifyAdminAboutNewUser: jest.fn(),
            handlePendingUsersCommand: jest.fn(),
            getAdminApprovalKeyboard: jest.fn(),
          },
        },
        {
          provide: TelegramSprint3Service,
          useValue: {
            setHelpers: jest.fn(),
            handleStockMachineCallback: jest.fn(),
            handleStaffRefreshCallback: jest.fn(),
            handleStaffAnalyticsCallback: jest.fn(),
            handleIncidentTypeCallback: jest.fn(),
            handleIncidentMachineCallback: jest.fn(),
            handleIncidentCancelCallback: jest.fn(),
            handleIncidentCommand: jest.fn(),
            handleStockCommand: jest.fn(),
            handleStaffCommand: jest.fn(),
            handleReportCommand: jest.fn(),
            sendMachineStockInfo: jest.fn(),
            getTaskTypeEmoji: jest.fn(),
            getTaskTypeLabel: jest.fn(),
            getIncidentTypeLabel: jest.fn(),
          },
        },
        {
          provide: TelegramTaskOperationsService,
          useValue: {
            setHelpers: jest.fn(),
            handleStartTaskCommand: jest.fn(),
            handleCompleteTaskCommand: jest.fn(),
            handlePhotoUpload: jest.fn(),
            handleVoiceMessage: jest.fn(),
            validatePhotoUpload: jest.fn(),
            initializeExecutionState: jest.fn(),
          },
        },
        {
          provide: TelegramDataCommandsService,
          useValue: {
            setHelpers: jest.fn(),
            handleMachinesCommand: jest.fn(),
            handleAlertsCommand: jest.fn(),
            handleStatsCommand: jest.fn(),
            handleTasksCommand: jest.fn(),
          },
        },
        {
          provide: TelegramUIService,
          useValue: {
            t: jest.fn((lang, key) => key),
            getMainMenuKeyboard: jest.fn(() => ({ reply_markup: { inline_keyboard: [] } })),
            getVerificationKeyboard: jest.fn(() => ({ reply_markup: { inline_keyboard: [] } })),
            getSettingsKeyboard: jest.fn(() => ({ reply_markup: { inline_keyboard: [] } })),
            getNotificationSettingsKeyboard: jest.fn(() => ({ reply_markup: { inline_keyboard: [] } })),
            getMachinesKeyboard: jest.fn(() => ({ reply_markup: { inline_keyboard: [] } })),
            getAlertsKeyboard: jest.fn(() => ({ reply_markup: { inline_keyboard: [] } })),
            getTasksKeyboard: jest.fn(() => ({ reply_markup: { inline_keyboard: [] } })),
            formatTasksMessage: jest.fn(() => 'Tasks message'),
            formatMachinesMessage: jest.fn(() => 'Machines message'),
            formatAlertsMessage: jest.fn(() => 'Alerts message'),
            formatStatsMessage: jest.fn(() => 'Stats message'),
          },
        },
        {
          provide: TelegramUtilitiesService,
          useValue: {
            updateUserLanguage: jest.fn(),
            toggleNotification: jest.fn(),
            logMessage: jest.fn(),
            handleTextMessage: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TelegramBotService>(TelegramBotService);
    telegramUserRepository = module.get(getRepositoryToken(TelegramUser));
    telegramSettingsRepository = module.get(getRepositoryToken(TelegramSettings));
    sessionService = module.get(TelegramSessionService);
    commandHandlerService = module.get(TelegramCommandHandlerService);
    callbackHandlerService = module.get(TelegramCallbackHandlerService);
    taskCallbackService = module.get(TelegramTaskCallbackService);
    adminCallbackService = module.get(TelegramAdminCallbackService);
    sprint3Service = module.get(TelegramSprint3Service);
    taskOperationsService = module.get(TelegramTaskOperationsService);
    dataCommandsService = module.get(TelegramDataCommandsService);
    uiService = module.get(TelegramUIService);
    utilitiesService = module.get(TelegramUtilitiesService);

    // Reset captured handlers before each test
    resetCapturedHandlers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockTelegram.setMyCommands.mockClear();
    mockTelegram.sendMessage.mockClear();
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

  // Note: All private helper methods tests moved to specialized services:
  // - getTaskTypeEmoji, getTaskTypeLabel, getIncidentTypeLabel → telegram-sprint3.service.spec.ts
  // - formatRole → telegram-admin-callback.service.spec.ts
  // - t() translation → telegram-ui.service.spec.ts
  // - initializeExecutionState → telegram-task-operations.service.spec.ts
  // - isSuperAdmin → telegram-admin-callback.service.spec.ts
  // - updateUserLanguage, toggleNotification, logMessage, handleTextMessage → telegram-utilities.service.spec.ts

  // Note: keyboard builders tests moved to telegram-ui.service.spec.ts
  // (getMainMenuKeyboard, getVerificationKeyboard, getSettingsKeyboard,
  // getNotificationSettingsKeyboard, getMachinesKeyboard, getAlertsKeyboard)

  // Note: message formatters tests moved to telegram-ui.service.spec.ts
  // (formatTasksMessage, formatMachinesMessage, formatAlertsMessage, formatStatsMessage)
  // Note: getTasksKeyboard tests moved to telegram-ui.service.spec.ts

  // Note: all translation tests (t()) moved to telegram-ui.service.spec.ts
  // Note: all keyboard tests (getLanguageKeyboard, etc.) moved to telegram-ui.service.spec.ts
  // Note: all formatMessage edge cases moved to telegram-ui.service.spec.ts
  // Note: initializeExecutionState edge cases moved to telegram-task-operations.service.spec.ts
  // Note: formatPendingUsersMessage, getPendingUsersKeyboard, getAdminApprovalKeyboard,
  // and getRoleSelectionKeyboard tests moved to telegram-admin-callback.service.spec.ts

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

    it('should throw and log error when telegram.sendMessage fails', async () => {
      mockTelegram.sendMessage.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.sendMessage('123', 'test')).rejects.toThrow('Network error');
    });
  });

  describe('setupBotMenu error handling', () => {
    it('should handle setMyCommands failure gracefully', async () => {
      mockTelegram.setMyCommands.mockRejectedValueOnce(new Error('API error'));
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);

      // Should not throw
      await expect(service.initializeBot()).resolves.toBeUndefined();
    });
  });

  describe('middleware', () => {
    beforeEach(async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
    });

    it('should register middleware during initialization', () => {
      expect(capturedHandlers.middleware.length).toBeGreaterThan(0);
    });

    it('should load telegram user when ctx.from exists', async () => {
      const middleware = capturedHandlers.middleware[0];
      const mockNext = jest.fn().mockResolvedValue(undefined);
      const ctx = {
        from: { id: 123456789 },
        chat: { id: 123456789 },
      };

      telegramUserRepository.findOne.mockResolvedValue(null);

      await middleware(ctx, mockNext);

      expect(telegramUserRepository.findOne).toHaveBeenCalledWith({
        where: { telegram_id: '123456789' },
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set telegramUser on context when found', async () => {
      const middleware = capturedHandlers.middleware[0];
      const mockNext = jest.fn().mockResolvedValue(undefined);
      const ctx: any = {
        from: { id: 123456789 },
        chat: { id: 123456789 },
      };

      telegramUserRepository.findOne.mockResolvedValue({
        ...mockTelegramUser,
        is_verified: false,
      } as TelegramUser);

      await middleware(ctx, mockNext);

      expect(ctx.telegramUser).toBeDefined();
      expect(ctx.telegramUser.telegram_id).toBe('123456789');
    });

    it('should load session for verified user', async () => {
      const middleware = capturedHandlers.middleware[0];
      const mockNext = jest.fn().mockResolvedValue(undefined);
      const ctx: any = {
        from: { id: 123456789 },
        chat: { id: 123456789 },
      };

      telegramUserRepository.findOne.mockResolvedValue(mockTelegramUser as TelegramUser);
      sessionService.getSession.mockResolvedValue({ userId: 'user-1' } as any);

      await middleware(ctx, mockNext);

      expect(sessionService.getSession).toHaveBeenCalledWith('user-1');
      expect(ctx.session).toBeDefined();
    });

    it('should create new session if not exists', async () => {
      const middleware = capturedHandlers.middleware[0];
      const mockNext = jest.fn().mockResolvedValue(undefined);
      const ctx: any = {
        from: { id: 123456789 },
        chat: { id: 123456789 },
      };

      telegramUserRepository.findOne.mockResolvedValue(mockTelegramUser as TelegramUser);
      sessionService.getSession
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ userId: 'user-1' } as any);

      await middleware(ctx, mockNext);

      expect(sessionService.saveSession).toHaveBeenCalled();
    });

    it('should save session after handler completes', async () => {
      const middleware = capturedHandlers.middleware[0];
      const mockNext = jest.fn().mockResolvedValue(undefined);
      const mockSession = { userId: 'user-1' };
      const ctx: any = {
        from: { id: 123456789 },
        chat: { id: 123456789 },
      };

      telegramUserRepository.findOne.mockResolvedValue(mockTelegramUser as TelegramUser);
      sessionService.getSession.mockResolvedValue(mockSession as any);

      await middleware(ctx, mockNext);

      // Session should be saved after next() completes
      expect(sessionService.saveSession).toHaveBeenCalledWith('user-1', mockSession);
    });

    it('should not load session for unverified user', async () => {
      const middleware = capturedHandlers.middleware[0];
      const mockNext = jest.fn().mockResolvedValue(undefined);
      const ctx: any = {
        from: { id: 123456789 },
        chat: { id: 123456789 },
      };

      telegramUserRepository.findOne.mockResolvedValue({
        ...mockTelegramUser,
        is_verified: false,
      } as TelegramUser);

      await middleware(ctx, mockNext);

      expect(sessionService.getSession).not.toHaveBeenCalled();
    });

    it('should handle ctx without from', async () => {
      const middleware = capturedHandlers.middleware[0];
      const mockNext = jest.fn().mockResolvedValue(undefined);
      const ctx: any = { chat: { id: 123456789 } };

      await middleware(ctx, mockNext);

      expect(telegramUserRepository.findOne).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('command handlers', () => {
    beforeEach(async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
    });

    it('should register all expected commands', () => {
      const expectedCommands = [
        'start', 'menu', 'machines', 'alerts', 'stats', 'help', 'language',
        'pending_users', 'tasks', 'start_task', 'complete_task',
        'incident', 'stock', 'staff', 'report',
      ];

      expectedCommands.forEach((cmd) => {
        expect(capturedHandlers.commands.has(cmd)).toBe(true);
      });
    });

    it('should delegate start command to commandHandlerService', async () => {
      const handler = capturedHandlers.commands.get('start');
      const ctx = {};

      await handler!(ctx);

      expect(commandHandlerService.handleStartCommand).toHaveBeenCalledWith(ctx);
    });

    it('should delegate menu command to commandHandlerService', async () => {
      const handler = capturedHandlers.commands.get('menu');
      const ctx = {};

      await handler!(ctx);

      expect(commandHandlerService.handleMenuCommand).toHaveBeenCalledWith(ctx);
    });

    it('should delegate machines command to commandHandlerService', async () => {
      const handler = capturedHandlers.commands.get('machines');
      const ctx = {};

      await handler!(ctx);

      expect(commandHandlerService.handleMachinesCommand).toHaveBeenCalledWith(ctx);
    });

    it('should delegate alerts command to commandHandlerService', async () => {
      const handler = capturedHandlers.commands.get('alerts');
      const ctx = {};

      await handler!(ctx);

      expect(commandHandlerService.handleAlertsCommand).toHaveBeenCalledWith(ctx);
    });

    it('should delegate stats command to commandHandlerService', async () => {
      const handler = capturedHandlers.commands.get('stats');
      const ctx = {};

      await handler!(ctx);

      expect(commandHandlerService.handleStatsCommand).toHaveBeenCalledWith(ctx);
    });

    it('should delegate help command to commandHandlerService', async () => {
      const handler = capturedHandlers.commands.get('help');
      const ctx = {};

      await handler!(ctx);

      expect(commandHandlerService.handleHelpCommand).toHaveBeenCalledWith(ctx);
    });

    it('should delegate language command to commandHandlerService', async () => {
      const handler = capturedHandlers.commands.get('language');
      const ctx = {};

      await handler!(ctx);

      expect(commandHandlerService.handleLanguageCommand).toHaveBeenCalledWith(ctx);
    });

    it('should delegate tasks command to commandHandlerService', async () => {
      const handler = capturedHandlers.commands.get('tasks');
      const ctx = {};

      await handler!(ctx);

      expect(commandHandlerService.handleTasksCommand).toHaveBeenCalledWith(ctx);
    });

    it('should delegate pending_users command to adminCallbackService', async () => {
      const handler = capturedHandlers.commands.get('pending_users');
      const ctx = {};

      await handler!(ctx);

      expect(adminCallbackService.handlePendingUsersCommand).toHaveBeenCalled();
    });

    it('should delegate start_task command to taskOperationsService', async () => {
      const handler = capturedHandlers.commands.get('start_task');
      const ctx = {};

      await handler!(ctx);

      expect(taskOperationsService.handleStartTaskCommand).toHaveBeenCalledWith(ctx);
    });

    it('should delegate complete_task command to taskOperationsService', async () => {
      const handler = capturedHandlers.commands.get('complete_task');
      const ctx = {};

      await handler!(ctx);

      expect(taskOperationsService.handleCompleteTaskCommand).toHaveBeenCalledWith(ctx);
    });

    it('should delegate incident command to sprint3Service', async () => {
      const handler = capturedHandlers.commands.get('incident');
      const ctx = {};

      await handler!(ctx);

      expect(sprint3Service.handleIncidentCommand).toHaveBeenCalledWith(ctx);
    });

    it('should delegate stock command to sprint3Service', async () => {
      const handler = capturedHandlers.commands.get('stock');
      const ctx = {};

      await handler!(ctx);

      expect(sprint3Service.handleStockCommand).toHaveBeenCalledWith(ctx);
    });

    it('should delegate staff command to sprint3Service', async () => {
      const handler = capturedHandlers.commands.get('staff');
      const ctx = {};

      await handler!(ctx);

      expect(sprint3Service.handleStaffCommand).toHaveBeenCalledWith(ctx);
    });

    it('should delegate report command to sprint3Service', async () => {
      const handler = capturedHandlers.commands.get('report');
      const ctx = {};

      await handler!(ctx);

      expect(sprint3Service.handleReportCommand).toHaveBeenCalledWith(ctx);
    });
  });

  describe('event handlers', () => {
    beforeEach(async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
    });

    it('should register photo handler', () => {
      expect(capturedHandlers.events.has('photo')).toBe(true);
    });

    it('should register voice handler', () => {
      expect(capturedHandlers.events.has('voice')).toBe(true);
    });

    it('should delegate photo upload to taskOperationsService', async () => {
      const handler = capturedHandlers.events.get('photo');
      const ctx = {};

      await handler!(ctx);

      expect(taskOperationsService.handlePhotoUpload).toHaveBeenCalledWith(ctx);
    });

    it('should delegate voice message to taskOperationsService', async () => {
      const handler = capturedHandlers.events.get('voice');
      const ctx = {};

      await handler!(ctx);

      expect(taskOperationsService.handleVoiceMessage).toHaveBeenCalledWith(ctx);
    });
  });

  describe('callback action handlers', () => {
    beforeEach(async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
    });

    it('should register language callbacks', () => {
      expect(capturedHandlers.actions.has('lang_ru')).toBe(true);
      expect(capturedHandlers.actions.has('lang_en')).toBe(true);
    });

    it('should delegate lang_ru to callbackHandlerService', async () => {
      const handler = capturedHandlers.actions.get('lang_ru');
      const ctx = {};

      await handler!(ctx);

      expect(callbackHandlerService.handleLanguageRu).toHaveBeenCalledWith(ctx);
    });

    it('should delegate lang_en to callbackHandlerService', async () => {
      const handler = capturedHandlers.actions.get('lang_en');
      const ctx = {};

      await handler!(ctx);

      expect(callbackHandlerService.handleLanguageEn).toHaveBeenCalledWith(ctx);
    });

    it('should delegate menu_machines to callbackHandlerService', async () => {
      const handler = capturedHandlers.actions.get('menu_machines');
      const ctx = {};

      await handler!(ctx);

      expect(callbackHandlerService.handleMenuMachines).toHaveBeenCalledWith(ctx);
    });

    it('should delegate menu_alerts to callbackHandlerService', async () => {
      const handler = capturedHandlers.actions.get('menu_alerts');
      const ctx = {};

      await handler!(ctx);

      expect(callbackHandlerService.handleMenuAlerts).toHaveBeenCalledWith(ctx);
    });

    it('should delegate menu_stats to callbackHandlerService', async () => {
      const handler = capturedHandlers.actions.get('menu_stats');
      const ctx = {};

      await handler!(ctx);

      expect(callbackHandlerService.handleMenuStats).toHaveBeenCalledWith(ctx);
    });

    it('should delegate menu_settings to callbackHandlerService', async () => {
      const handler = capturedHandlers.actions.get('menu_settings');
      const ctx = {};

      await handler!(ctx);

      expect(callbackHandlerService.handleMenuSettings).toHaveBeenCalledWith(ctx);
    });

    it('should delegate back_to_menu to callbackHandlerService', async () => {
      const handler = capturedHandlers.actions.get('back_to_menu');
      const ctx = {};

      await handler!(ctx);

      expect(callbackHandlerService.handleBackToMenu).toHaveBeenCalledWith(ctx);
    });

    it('should delegate settings_notifications to callbackHandlerService', async () => {
      const handler = capturedHandlers.actions.get('settings_notifications');
      const ctx = {};

      await handler!(ctx);

      expect(callbackHandlerService.handleSettingsNotifications).toHaveBeenCalledWith(ctx);
    });

    it('should delegate settings_language to callbackHandlerService', async () => {
      const handler = capturedHandlers.actions.get('settings_language');
      const ctx = {};

      await handler!(ctx);

      expect(callbackHandlerService.handleSettingsLanguage).toHaveBeenCalledWith(ctx);
    });

    it('should delegate refresh_tasks to callbackHandlerService', async () => {
      const handler = capturedHandlers.actions.get('refresh_tasks');
      const ctx = {};

      await handler!(ctx);

      expect(callbackHandlerService.handleRefreshTasks).toHaveBeenCalledWith(ctx);
    });

    it('should delegate refresh_pending_users to adminCallbackService', async () => {
      const handler = capturedHandlers.actions.get('refresh_pending_users');
      const ctx = {};

      await handler!(ctx);

      expect(adminCallbackService.handleRefreshPendingUsers).toHaveBeenCalledWith(ctx);
    });

    it('should delegate staff_refresh to sprint3Service', async () => {
      const handler = capturedHandlers.actions.get('staff_refresh');
      const ctx = {};

      await handler!(ctx);

      expect(sprint3Service.handleStaffRefreshCallback).toHaveBeenCalledWith(ctx);
    });

    it('should delegate staff_analytics to sprint3Service', async () => {
      const handler = capturedHandlers.actions.get('staff_analytics');
      const ctx = {};

      await handler!(ctx);

      expect(sprint3Service.handleStaffAnalyticsCallback).toHaveBeenCalledWith(ctx);
    });

    it('should delegate incident_cancel to sprint3Service', async () => {
      const handler = capturedHandlers.actions.get('incident_cancel');
      const ctx = {};

      await handler!(ctx);

      expect(sprint3Service.handleIncidentCancelCallback).toHaveBeenCalledWith(ctx);
    });
  });

  describe('regex callback action handlers', () => {
    beforeEach(async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
    });

    it('should handle task_start regex callback', async () => {
      // Find the regex handler for task_start
      let handler: ((ctx: any) => Promise<void>) | undefined;
      capturedHandlers.actions.forEach((h, pattern) => {
        if (pattern instanceof RegExp && pattern.source.includes('task_start')) {
          handler = h;
        }
      });

      expect(handler).toBeDefined();

      const ctx = { match: ['task_start_abc123', 'abc123'] };
      await handler!(ctx);

      expect(taskCallbackService.handleTaskStart).toHaveBeenCalledWith(ctx, 'abc123');
    });

    it('should handle step_done regex callback', async () => {
      let handler: ((ctx: any) => Promise<void>) | undefined;
      capturedHandlers.actions.forEach((h, pattern) => {
        if (pattern instanceof RegExp && pattern.source.includes('step_done')) {
          handler = h;
        }
      });

      expect(handler).toBeDefined();

      const ctx = { match: ['step_done_task123_2', 'task123', '2'] };
      await handler!(ctx);

      expect(taskCallbackService.handleStepDone).toHaveBeenCalledWith(ctx, 'task123', 2);
    });

    it('should handle step_skip regex callback', async () => {
      let handler: ((ctx: any) => Promise<void>) | undefined;
      capturedHandlers.actions.forEach((h, pattern) => {
        if (pattern instanceof RegExp && pattern.source.includes('step_skip')) {
          handler = h;
        }
      });

      expect(handler).toBeDefined();

      const ctx = { match: ['step_skip_task456_3', 'task456', '3'] };
      await handler!(ctx);

      expect(taskCallbackService.handleStepSkip).toHaveBeenCalledWith(ctx, 'task456', 3);
    });

    it('should handle step_back regex callback', async () => {
      let handler: ((ctx: any) => Promise<void>) | undefined;
      capturedHandlers.actions.forEach((h, pattern) => {
        if (pattern instanceof RegExp && pattern.source.includes('step_back')) {
          handler = h;
        }
      });

      expect(handler).toBeDefined();

      const ctx = { match: ['step_back_task789', 'task789'] };
      await handler!(ctx);

      expect(taskCallbackService.handleStepBack).toHaveBeenCalledWith(ctx, 'task789');
    });

    it('should handle expand_user regex callback', async () => {
      let handler: ((ctx: any) => Promise<void>) | undefined;
      capturedHandlers.actions.forEach((h, pattern) => {
        if (pattern instanceof RegExp && pattern.source.includes('expand_user')) {
          handler = h;
        }
      });

      expect(handler).toBeDefined();

      const ctx = { match: ['expand_user_user123', 'user123'] };
      await handler!(ctx);

      expect(adminCallbackService.handleExpandUser).toHaveBeenCalledWith(ctx, 'user123');
    });

    it('should handle approve_user_role regex callback', async () => {
      let handler: ((ctx: any) => Promise<void>) | undefined;
      capturedHandlers.actions.forEach((h, pattern) => {
        if (pattern instanceof RegExp && pattern.source.includes('approve_user')) {
          handler = h;
        }
      });

      expect(handler).toBeDefined();

      const ctx = { match: ['approve_user_user123_role_operator', 'user123', 'operator'] };
      await handler!(ctx);

      expect(adminCallbackService.handleApproveUser).toHaveBeenCalled();
    });

    it('should handle reject_user regex callback', async () => {
      let handler: ((ctx: any) => Promise<void>) | undefined;
      capturedHandlers.actions.forEach((h, pattern) => {
        if (pattern instanceof RegExp && pattern.source.includes('reject_user')) {
          handler = h;
        }
      });

      expect(handler).toBeDefined();

      const ctx = { match: ['reject_user_user456', 'user456'] };
      await handler!(ctx);

      expect(adminCallbackService.handleRejectUser).toHaveBeenCalledWith(ctx, 'user456');
    });

    it('should handle stock_machine regex callback', async () => {
      let handler: ((ctx: any) => Promise<void>) | undefined;
      capturedHandlers.actions.forEach((h, pattern) => {
        if (pattern instanceof RegExp && pattern.source.includes('stock_machine')) {
          handler = h;
        }
      });

      expect(handler).toBeDefined();

      const ctx = { match: ['stock_machine:machine123', 'machine123'] };
      await handler!(ctx);

      expect(sprint3Service.handleStockMachineCallback).toHaveBeenCalledWith(ctx, 'machine123');
    });

    it('should handle incident_type regex callback', async () => {
      let handler: ((ctx: any) => Promise<void>) | undefined;
      capturedHandlers.actions.forEach((h, pattern) => {
        if (pattern instanceof RegExp && pattern.source.includes('incident_type')) {
          handler = h;
        }
      });

      expect(handler).toBeDefined();

      const ctx = { match: ['incident_type:malfunction', 'malfunction'] };
      await handler!(ctx);

      expect(sprint3Service.handleIncidentTypeCallback).toHaveBeenCalledWith(ctx, 'malfunction');
    });

    it('should handle incident_machine regex callback', async () => {
      let handler: ((ctx: any) => Promise<void>) | undefined;
      capturedHandlers.actions.forEach((h, pattern) => {
        if (pattern instanceof RegExp && pattern.source.includes('incident_machine')) {
          handler = h;
        }
      });

      expect(handler).toBeDefined();

      const ctx = { match: ['incident_machine:machine456', 'machine456'] };
      await handler!(ctx);

      expect(sprint3Service.handleIncidentMachineCallback).toHaveBeenCalledWith(ctx, 'machine456');
    });
  });

  describe('notification toggle callbacks', () => {
    beforeEach(async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();
    });

    it('should register toggle callbacks for all notification types', () => {
      const notificationTypes = [
        'toggle_machine_offline',
        'toggle_machine_online',
        'toggle_low_stock',
        'toggle_maintenance_due',
        'toggle_equipment_needs_maintenance',
        'toggle_task_assigned',
      ];

      notificationTypes.forEach((toggle) => {
        expect(capturedHandlers.actions.has(toggle)).toBe(true);
      });
    });

    it('should delegate toggle_machine_offline to callbackHandlerService', async () => {
      const handler = capturedHandlers.actions.get('toggle_machine_offline');
      const ctx = {};

      await handler!(ctx);

      expect(callbackHandlerService.handleNotificationToggle).toHaveBeenCalledWith(ctx, 'machine_offline');
    });

    it('should delegate toggle_low_stock to callbackHandlerService', async () => {
      const handler = capturedHandlers.actions.get('toggle_low_stock');
      const ctx = {};

      await handler!(ctx);

      expect(callbackHandlerService.handleNotificationToggle).toHaveBeenCalledWith(ctx, 'low_stock');
    });

    it('should delegate toggle_task_assigned to callbackHandlerService', async () => {
      const handler = capturedHandlers.actions.get('toggle_task_assigned');
      const ctx = {};

      await handler!(ctx);

      expect(callbackHandlerService.handleNotificationToggle).toHaveBeenCalledWith(ctx, 'task_assigned');
    });
  });

  describe('helper initialization', () => {
    it('should set helpers on commandHandlerService during initialization', async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();

      expect(commandHandlerService.setHelpers).toHaveBeenCalledWith(
        expect.objectContaining({
          t: expect.any(Function),
          getMainMenuKeyboard: expect.any(Function),
          getVerificationKeyboard: expect.any(Function),
        }),
      );
    });

    it('should set helpers on callbackHandlerService during initialization', async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();

      expect(callbackHandlerService.setHelpers).toHaveBeenCalledWith(
        expect.objectContaining({
          t: expect.any(Function),
          getMainMenuKeyboard: expect.any(Function),
          handleMachinesCommand: expect.any(Function),
          toggleNotification: expect.any(Function),
        }),
      );
    });

    it('should set helpers on sprint3Service during initialization', async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();

      expect(sprint3Service.setHelpers).toHaveBeenCalledWith(
        expect.objectContaining({
          t: expect.any(Function),
          logMessage: expect.any(Function),
        }),
      );
    });

    it('should set helpers on taskOperationsService during initialization', async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();

      expect(taskOperationsService.setHelpers).toHaveBeenCalledWith(
        expect.objectContaining({
          t: expect.any(Function),
          logMessage: expect.any(Function),
          handleTasksCommand: expect.any(Function),
        }),
      );
    });

    it('should set helpers on dataCommandsService during initialization', async () => {
      telegramSettingsRepository.findOne.mockResolvedValue(mockSettings as TelegramSettings);
      await service.initializeBot();

      expect(dataCommandsService.setHelpers).toHaveBeenCalledWith(
        expect.objectContaining({
          t: expect.any(Function),
          logMessage: expect.any(Function),
          formatMachinesMessage: expect.any(Function),
        }),
      );
    });
  });

  // Note: additional translation edge cases moved to telegram-ui.service.spec.ts
});
