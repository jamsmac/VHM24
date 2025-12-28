import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramCallbackHandlerService, CallbackHelpers } from './telegram-callback-handler.service';
import { TelegramUser, TelegramLanguage } from '../../shared/entities/telegram-user.entity';
import { TelegramMessageLog, TelegramMessageType } from '../../shared/entities/telegram-message-log.entity';
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

describe('TelegramCallbackHandlerService', () => {
  let service: TelegramCallbackHandlerService;
  let telegramUserRepository: jest.Mocked<Repository<TelegramUser>>;
  let telegramMessageLogRepository: jest.Mocked<Repository<TelegramMessageLog>>;

  const mockTelegramUser: Partial<TelegramUser> = {
    id: 'tg-user-1',
    telegram_id: '123456789',
    user_id: 'user-1',
    is_verified: true,
    language: TelegramLanguage.RU,
    notification_preferences: {},
  };

  const mockHelpers = {
    t: jest.fn((lang, key) => key),
    getMainMenuKeyboard: jest.fn(() => ({ reply_markup: { inline_keyboard: [] } })),
    getSettingsKeyboard: jest.fn(() => ({ reply_markup: { inline_keyboard: [] } })),
    getNotificationSettingsKeyboard: jest.fn(() => ({ reply_markup: { inline_keyboard: [] } })),
    handleMachinesCommand: jest.fn(),
    handleAlertsCommand: jest.fn(),
    handleStatsCommand: jest.fn(),
    handleTasksCommand: jest.fn(),
    toggleNotification: jest.fn(),
  } as unknown as CallbackHelpers;

  const createMockContext = (overrides: Partial<BotContext> = {}): BotContext =>
    ({
      telegramUser: { ...mockTelegramUser } as TelegramUser,
      chat: { id: 123456789 },
      from: { id: 123456789 },
      answerCbQuery: jest.fn().mockResolvedValue(undefined),
      editMessageText: jest.fn().mockResolvedValue(undefined),
      reply: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    }) as unknown as BotContext;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramCallbackHandlerService,
        {
          provide: getRepositoryToken(TelegramUser),
          useValue: {
            save: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: getRepositoryToken(TelegramMessageLog),
          useValue: {
            create: jest.fn().mockReturnValue({}),
            save: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<TelegramCallbackHandlerService>(TelegramCallbackHandlerService);
    telegramUserRepository = module.get(getRepositoryToken(TelegramUser));
    telegramMessageLogRepository = module.get(getRepositoryToken(TelegramMessageLog));
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
      // No direct way to verify, but subsequent calls should work
      expect(service).toBeDefined();
    });
  });

  // ============================================================================
  // handleLanguageRu
  // ============================================================================

  describe('handleLanguageRu', () => {
    it('should change language to Russian', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();

      await service.handleLanguageRu(ctx);

      expect(ctx.answerCbQuery).toHaveBeenCalledWith('Язык изменен на русский ✓');
      expect(ctx.editMessageText).toHaveBeenCalledWith(
        'Язык изменен на русский 🇷🇺',
        expect.any(Object),
      );
      expect(mockHelpers.getMainMenuKeyboard).toHaveBeenCalledWith(TelegramLanguage.RU);
      expect(telegramUserRepository.save).toHaveBeenCalled();
    });

    it('should update user language in database', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();

      await service.handleLanguageRu(ctx);

      expect(ctx.telegramUser?.language).toBe(TelegramLanguage.RU);
      expect(telegramUserRepository.save).toHaveBeenCalledWith(ctx.telegramUser);
    });

    it('should log callback to database', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();

      await service.handleLanguageRu(ctx);

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith({
        telegram_user_id: 'tg-user-1',
        chat_id: '123456789',
        message_type: TelegramMessageType.CALLBACK,
        command: 'lang_ru',
        message_text: 'Callback: lang_ru',
      });
      expect(telegramMessageLogRepository.save).toHaveBeenCalled();
    });

    it('should do nothing if helpers not set', async () => {
      const ctx = createMockContext();

      await service.handleLanguageRu(ctx);

      expect(ctx.answerCbQuery).not.toHaveBeenCalled();
      expect(telegramUserRepository.save).not.toHaveBeenCalled();
    });

    it('should handle missing telegramUser', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({ telegramUser: undefined });

      await service.handleLanguageRu(ctx);

      expect(ctx.answerCbQuery).toHaveBeenCalled();
      expect(telegramUserRepository.save).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // handleLanguageEn
  // ============================================================================

  describe('handleLanguageEn', () => {
    it('should change language to English', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();

      await service.handleLanguageEn(ctx);

      expect(ctx.answerCbQuery).toHaveBeenCalledWith('Language changed to English ✓');
      expect(ctx.editMessageText).toHaveBeenCalledWith(
        'Language changed to English 🇬🇧',
        expect.any(Object),
      );
      expect(mockHelpers.getMainMenuKeyboard).toHaveBeenCalledWith(TelegramLanguage.EN);
    });

    it('should update user language in database', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();

      await service.handleLanguageEn(ctx);

      expect(ctx.telegramUser?.language).toBe(TelegramLanguage.EN);
      expect(telegramUserRepository.save).toHaveBeenCalledWith(ctx.telegramUser);
    });

    it('should log callback to database', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();

      await service.handleLanguageEn(ctx);

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'lang_en',
        }),
      );
    });

    it('should do nothing if helpers not set', async () => {
      const ctx = createMockContext();

      await service.handleLanguageEn(ctx);

      expect(ctx.answerCbQuery).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // handleMenuMachines
  // ============================================================================

  describe('handleMenuMachines', () => {
    it('should call handleMachinesCommand', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();

      await service.handleMenuMachines(ctx);

      expect(ctx.answerCbQuery).toHaveBeenCalled();
      expect(mockHelpers.handleMachinesCommand).toHaveBeenCalledWith(ctx);
    });

    it('should log callback', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();

      await service.handleMenuMachines(ctx);

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'menu_machines',
        }),
      );
    });

    it('should do nothing if helpers not set', async () => {
      const ctx = createMockContext();

      await service.handleMenuMachines(ctx);

      expect(ctx.answerCbQuery).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // handleMenuAlerts
  // ============================================================================

  describe('handleMenuAlerts', () => {
    it('should call handleAlertsCommand', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();

      await service.handleMenuAlerts(ctx);

      expect(ctx.answerCbQuery).toHaveBeenCalled();
      expect(mockHelpers.handleAlertsCommand).toHaveBeenCalledWith(ctx);
    });

    it('should log callback', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();

      await service.handleMenuAlerts(ctx);

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'menu_alerts',
        }),
      );
    });

    it('should do nothing if helpers not set', async () => {
      const ctx = createMockContext();

      await service.handleMenuAlerts(ctx);

      expect(ctx.answerCbQuery).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // handleMenuStats
  // ============================================================================

  describe('handleMenuStats', () => {
    it('should call handleStatsCommand', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();

      await service.handleMenuStats(ctx);

      expect(ctx.answerCbQuery).toHaveBeenCalled();
      expect(mockHelpers.handleStatsCommand).toHaveBeenCalledWith(ctx);
    });

    it('should log callback', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();

      await service.handleMenuStats(ctx);

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'menu_stats',
        }),
      );
    });

    it('should do nothing if helpers not set', async () => {
      const ctx = createMockContext();

      await service.handleMenuStats(ctx);

      expect(ctx.answerCbQuery).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // handleMenuSettings
  // ============================================================================

  describe('handleMenuSettings', () => {
    it('should show settings menu', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();

      await service.handleMenuSettings(ctx);

      expect(ctx.answerCbQuery).toHaveBeenCalled();
      expect(mockHelpers.t).toHaveBeenCalledWith(TelegramLanguage.RU, 'settings_menu');
      expect(mockHelpers.getSettingsKeyboard).toHaveBeenCalledWith(TelegramLanguage.RU);
      expect(ctx.editMessageText).toHaveBeenCalled();
    });

    it('should use English if user has English language', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN } as TelegramUser,
      });

      await service.handleMenuSettings(ctx);

      expect(mockHelpers.t).toHaveBeenCalledWith(TelegramLanguage.EN, 'settings_menu');
      expect(mockHelpers.getSettingsKeyboard).toHaveBeenCalledWith(TelegramLanguage.EN);
    });

    it('should default to Russian if no telegramUser', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({ telegramUser: undefined });

      await service.handleMenuSettings(ctx);

      expect(mockHelpers.t).toHaveBeenCalledWith(TelegramLanguage.RU, 'settings_menu');
    });

    it('should log callback', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();

      await service.handleMenuSettings(ctx);

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'menu_settings',
        }),
      );
    });

    it('should do nothing if helpers not set', async () => {
      const ctx = createMockContext();

      await service.handleMenuSettings(ctx);

      expect(ctx.answerCbQuery).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // handleBackToMenu
  // ============================================================================

  describe('handleBackToMenu', () => {
    it('should return to main menu', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();

      await service.handleBackToMenu(ctx);

      expect(ctx.answerCbQuery).toHaveBeenCalled();
      expect(mockHelpers.t).toHaveBeenCalledWith(TelegramLanguage.RU, 'main_menu');
      expect(mockHelpers.getMainMenuKeyboard).toHaveBeenCalledWith(TelegramLanguage.RU);
      expect(ctx.editMessageText).toHaveBeenCalled();
    });

    it('should use English if user has English language', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN } as TelegramUser,
      });

      await service.handleBackToMenu(ctx);

      expect(mockHelpers.t).toHaveBeenCalledWith(TelegramLanguage.EN, 'main_menu');
      expect(mockHelpers.getMainMenuKeyboard).toHaveBeenCalledWith(TelegramLanguage.EN);
    });

    it('should default to Russian if no telegramUser', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({ telegramUser: undefined });

      await service.handleBackToMenu(ctx);

      expect(mockHelpers.t).toHaveBeenCalledWith(TelegramLanguage.RU, 'main_menu');
    });

    it('should log callback', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();

      await service.handleBackToMenu(ctx);

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'back_to_menu',
        }),
      );
    });

    it('should do nothing if helpers not set', async () => {
      const ctx = createMockContext();

      await service.handleBackToMenu(ctx);

      expect(ctx.answerCbQuery).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // handleSettingsNotifications
  // ============================================================================

  describe('handleSettingsNotifications', () => {
    it('should show notification settings', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();

      await service.handleSettingsNotifications(ctx);

      expect(ctx.answerCbQuery).toHaveBeenCalled();
      expect(mockHelpers.t).toHaveBeenCalledWith(TelegramLanguage.RU, 'notification_settings');
      expect(mockHelpers.getNotificationSettingsKeyboard).toHaveBeenCalledWith(
        TelegramLanguage.RU,
        ctx.telegramUser,
      );
      expect(ctx.editMessageText).toHaveBeenCalled();
    });

    it('should show not verified message if no telegramUser', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({ telegramUser: undefined });

      await service.handleSettingsNotifications(ctx);

      expect(mockHelpers.t).toHaveBeenCalledWith(TelegramLanguage.RU, 'not_verified');
      expect(ctx.reply).toHaveBeenCalled();
      expect(ctx.editMessageText).not.toHaveBeenCalled();
    });

    it('should use English if user has English language', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN } as TelegramUser,
      });

      await service.handleSettingsNotifications(ctx);

      expect(mockHelpers.t).toHaveBeenCalledWith(TelegramLanguage.EN, 'notification_settings');
    });

    it('should log callback', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();

      await service.handleSettingsNotifications(ctx);

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'settings_notifications',
        }),
      );
    });

    it('should do nothing if helpers not set', async () => {
      const ctx = createMockContext();

      await service.handleSettingsNotifications(ctx);

      expect(ctx.answerCbQuery).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // handleSettingsLanguage
  // ============================================================================

  describe('handleSettingsLanguage', () => {
    it('should show language selection', async () => {
      const ctx = createMockContext();

      await service.handleSettingsLanguage(ctx);

      expect(ctx.answerCbQuery).toHaveBeenCalled();
      expect(ctx.editMessageText).toHaveBeenCalledWith(
        'Choose your language / Выберите язык:',
        expect.any(Object),
      );
    });

    it('should log callback', async () => {
      const ctx = createMockContext();

      await service.handleSettingsLanguage(ctx);

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'settings_language',
        }),
      );
    });

    it('should include language buttons in keyboard', async () => {
      const ctx = createMockContext();
      const { Markup } = require('telegraf');

      await service.handleSettingsLanguage(ctx);

      expect(Markup.button.callback).toHaveBeenCalledWith('🇷🇺 Русский', 'lang_ru');
      expect(Markup.button.callback).toHaveBeenCalledWith('🇬🇧 English', 'lang_en');
      expect(Markup.button.callback).toHaveBeenCalledWith('« Back / Назад', 'back_to_menu');
    });
  });

  // ============================================================================
  // handleNotificationToggle
  // ============================================================================

  describe('handleNotificationToggle', () => {
    it('should call toggleNotification helper', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();

      await service.handleNotificationToggle(ctx, 'machine_offline');

      expect(mockHelpers.toggleNotification).toHaveBeenCalledWith(ctx, 'machine_offline');
    });

    it('should log callback with notification type', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();

      await service.handleNotificationToggle(ctx, 'low_stock');

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'toggle_low_stock',
        }),
      );
    });

    it('should do nothing if helpers not set', async () => {
      const ctx = createMockContext();

      await service.handleNotificationToggle(ctx, 'machine_offline');

      expect(telegramMessageLogRepository.create).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // handleRefreshTasks
  // ============================================================================

  describe('handleRefreshTasks', () => {
    it('should call handleTasksCommand', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();

      await service.handleRefreshTasks(ctx);

      expect(ctx.answerCbQuery).toHaveBeenCalled();
      expect(mockHelpers.handleTasksCommand).toHaveBeenCalledWith(ctx);
    });

    it('should log callback', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();

      await service.handleRefreshTasks(ctx);

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'refresh_tasks',
        }),
      );
    });

    it('should do nothing if helpers not set', async () => {
      const ctx = createMockContext();

      await service.handleRefreshTasks(ctx);

      expect(ctx.answerCbQuery).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // logCallback edge cases
  // ============================================================================

  describe('logCallback edge cases', () => {
    it('should handle null telegramUser in logging', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({ telegramUser: undefined });

      await service.handleLanguageRu(ctx);

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          telegram_user_id: null,
        }),
      );
    });

    it('should handle null chat in logging', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext({ chat: undefined });

      await service.handleLanguageRu(ctx);

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          chat_id: null,
        }),
      );
    });

    it('should continue if logging fails', async () => {
      service.setHelpers(mockHelpers);
      telegramMessageLogRepository.save.mockRejectedValueOnce(new Error('DB error'));
      const ctx = createMockContext();

      // Should not throw
      await expect(service.handleLanguageRu(ctx)).resolves.not.toThrow();
      expect(ctx.answerCbQuery).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // t helper edge cases
  // ============================================================================

  describe('t helper edge cases', () => {
    it('should return key if helpers not set', async () => {
      // Access private method indirectly through handleMenuSettings
      const ctx = createMockContext({ telegramUser: undefined });

      // Without helpers, the method returns early
      await service.handleMenuSettings(ctx);

      // Since helpers not set, editMessageText should not be called
      expect(ctx.editMessageText).not.toHaveBeenCalled();
    });

    it('should pass args to t helper', async () => {
      service.setHelpers(mockHelpers);
      const ctx = createMockContext();

      await service.handleMenuSettings(ctx);

      // t is called with just lang and key for settings_menu
      expect(mockHelpers.t).toHaveBeenCalledWith(TelegramLanguage.RU, 'settings_menu');
    });
  });
});
