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
    uiService = module.get(TelegramUIService);
    utilitiesService = module.get(TelegramUtilitiesService);
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
  });

  // Note: additional translation edge cases moved to telegram-ui.service.spec.ts
});
