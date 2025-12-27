import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramUtilitiesService } from './telegram-utilities.service';
import { TelegramUser, TelegramLanguage } from '../../shared/entities/telegram-user.entity';
import { TelegramMessageLog, TelegramMessageType } from '../../shared/entities/telegram-message-log.entity';
import { TelegramUIService } from './telegram-ui.service';
import { TelegramAdminCallbackService } from './telegram-admin-callback.service';

describe('TelegramUtilitiesService', () => {
  let service: TelegramUtilitiesService;
  let telegramUserRepository: jest.Mocked<Repository<TelegramUser>>;
  let telegramMessageLogRepository: jest.Mocked<Repository<TelegramMessageLog>>;
  let uiService: jest.Mocked<TelegramUIService>;
  let adminCallbackService: jest.Mocked<TelegramAdminCallbackService>;

  const mockTelegramUser: Partial<TelegramUser> = {
    id: 'tg-user-1',
    telegram_id: '123456789',
    user_id: 'user-1',
    chat_id: '123456789',
    is_verified: true,
    language: TelegramLanguage.RU,
    notification_preferences: {},
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramUtilitiesService,
        {
          provide: getRepositoryToken(TelegramUser),
          useValue: {
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
          provide: TelegramUIService,
          useValue: {
            t: jest.fn((lang, key) => key),
            getNotificationSettingsKeyboard: jest.fn(() => ({
              reply_markup: { inline_keyboard: [] },
            })),
          },
        },
        {
          provide: TelegramAdminCallbackService,
          useValue: {
            handleRejectUserInput: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TelegramUtilitiesService>(TelegramUtilitiesService);
    telegramUserRepository = module.get(getRepositoryToken(TelegramUser));
    telegramMessageLogRepository = module.get(getRepositoryToken(TelegramMessageLog));
    uiService = module.get(TelegramUIService);
    adminCallbackService = module.get(TelegramAdminCallbackService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('updateUserLanguage', () => {
    it('should update user language in repository', async () => {
      const ctx = {
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.RU },
      };
      telegramUserRepository.save.mockResolvedValue(ctx.telegramUser as TelegramUser);

      await service.updateUserLanguage(ctx as any, TelegramLanguage.EN);

      expect(ctx.telegramUser.language).toBe(TelegramLanguage.EN);
      expect(telegramUserRepository.save).toHaveBeenCalledWith(ctx.telegramUser);
    });

    it('should do nothing if telegramUser is not present', async () => {
      const ctx = { telegramUser: undefined };

      await service.updateUserLanguage(ctx as any, TelegramLanguage.EN);

      expect(telegramUserRepository.save).not.toHaveBeenCalled();
    });

    it('should update from EN to RU', async () => {
      const ctx = {
        telegramUser: { ...mockTelegramUser, language: TelegramLanguage.EN },
      };
      telegramUserRepository.save.mockResolvedValue(ctx.telegramUser as TelegramUser);

      await service.updateUserLanguage(ctx as any, TelegramLanguage.RU);

      expect(ctx.telegramUser.language).toBe(TelegramLanguage.RU);
      expect(telegramUserRepository.save).toHaveBeenCalled();
    });
  });

  describe('toggleNotification', () => {
    it('should toggle notification preference from false to true', async () => {
      const ctx = {
        telegramUser: {
          ...mockTelegramUser,
          notification_preferences: { machine_offline: false },
        },
        answerCbQuery: jest.fn(),
        editMessageText: jest.fn(),
      };
      telegramUserRepository.save.mockResolvedValue(ctx.telegramUser as TelegramUser);

      await service.toggleNotification(ctx as any, 'machine_offline');

      expect(ctx.telegramUser.notification_preferences.machine_offline).toBe(true);
      expect(telegramUserRepository.save).toHaveBeenCalled();
      expect(ctx.answerCbQuery).toHaveBeenCalled();
      expect(ctx.editMessageText).toHaveBeenCalled();
    });

    it('should toggle notification preference from true to false', async () => {
      const ctx = {
        telegramUser: {
          ...mockTelegramUser,
          notification_preferences: { low_stock: true },
        },
        answerCbQuery: jest.fn(),
        editMessageText: jest.fn(),
      };
      telegramUserRepository.save.mockResolvedValue(ctx.telegramUser as TelegramUser);

      await service.toggleNotification(ctx as any, 'low_stock');

      expect(ctx.telegramUser.notification_preferences.low_stock).toBe(false);
      expect(telegramUserRepository.save).toHaveBeenCalled();
    });

    it('should do nothing if telegramUser is not present', async () => {
      const ctx = { telegramUser: undefined };

      await service.toggleNotification(ctx as any, 'machine_offline');

      expect(telegramUserRepository.save).not.toHaveBeenCalled();
    });

    it('should add notification preference if not exists', async () => {
      const ctx = {
        telegramUser: {
          ...mockTelegramUser,
          notification_preferences: {},
        },
        answerCbQuery: jest.fn(),
        editMessageText: jest.fn(),
      };
      telegramUserRepository.save.mockResolvedValue(ctx.telegramUser as TelegramUser);

      await service.toggleNotification(ctx as any, 'task_assigned');

      expect((ctx.telegramUser.notification_preferences as any).task_assigned).toBe(true);
    });

    it('should handle undefined notification preferences', async () => {
      const ctx = {
        telegramUser: {
          ...mockTelegramUser,
          notification_preferences: undefined as any,
        },
        answerCbQuery: jest.fn(),
        editMessageText: jest.fn(),
      };
      telegramUserRepository.save.mockResolvedValue(ctx.telegramUser as TelegramUser);

      await service.toggleNotification(ctx as any, 'maintenance_due');

      expect((ctx.telegramUser.notification_preferences as any).maintenance_due).toBe(true);
    });

    it('should call uiService.t for settings_updated message', async () => {
      const ctx = {
        telegramUser: {
          ...mockTelegramUser,
          language: TelegramLanguage.EN,
          notification_preferences: {},
        },
        answerCbQuery: jest.fn(),
        editMessageText: jest.fn(),
      };
      telegramUserRepository.save.mockResolvedValue(ctx.telegramUser as TelegramUser);

      await service.toggleNotification(ctx as any, 'machine_offline');

      expect(uiService.t).toHaveBeenCalledWith(TelegramLanguage.EN, 'settings_updated');
      expect(uiService.t).toHaveBeenCalledWith(TelegramLanguage.EN, 'notification_settings');
    });

    it('should call uiService.getNotificationSettingsKeyboard', async () => {
      const ctx = {
        telegramUser: {
          ...mockTelegramUser,
          notification_preferences: {},
        },
        answerCbQuery: jest.fn(),
        editMessageText: jest.fn(),
      };
      telegramUserRepository.save.mockResolvedValue(ctx.telegramUser as TelegramUser);

      await service.toggleNotification(ctx as any, 'machine_offline');

      expect(uiService.getNotificationSettingsKeyboard).toHaveBeenCalledWith(
        TelegramLanguage.RU,
        ctx.telegramUser,
      );
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

      await service.logMessage(ctx as any, TelegramMessageType.COMMAND, '/start');

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith({
        telegram_user_id: 'tg-user-1',
        chat_id: '123456789',
        message_type: TelegramMessageType.COMMAND,
        command: '/start',
        message_text: 'test message',
      });
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

      await service.logMessage(ctx as any, TelegramMessageType.COMMAND, '/help');

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message_text: '',
        }),
      );
    });

    it('should handle missing telegramUser', async () => {
      const ctx = {
        telegramUser: undefined,
        chat: { id: 123456789 },
        message: { text: 'test' },
      };
      telegramMessageLogRepository.create.mockReturnValue({ id: 'log-1' } as any);
      telegramMessageLogRepository.save.mockResolvedValue({ id: 'log-1' } as any);

      await service.logMessage(ctx as any, TelegramMessageType.CALLBACK);

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          telegram_user_id: null,
        }),
      );
    });

    it('should handle missing chat', async () => {
      const ctx = {
        telegramUser: mockTelegramUser,
        chat: undefined,
        message: { text: 'test' },
      };
      telegramMessageLogRepository.create.mockReturnValue({ id: 'log-1' } as any);
      telegramMessageLogRepository.save.mockResolvedValue({ id: 'log-1' } as any);

      await service.logMessage(ctx as any, TelegramMessageType.COMMAND);

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          chat_id: null,
        }),
      );
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
        service.logMessage(ctx as any, TelegramMessageType.COMMAND, '/start'),
      ).resolves.toBeUndefined();
    });

    it('should handle optional command parameter', async () => {
      const ctx = {
        telegramUser: mockTelegramUser,
        chat: { id: 123456789 },
        message: { text: 'hello' },
      };
      telegramMessageLogRepository.create.mockReturnValue({ id: 'log-1' } as any);
      telegramMessageLogRepository.save.mockResolvedValue({ id: 'log-1' } as any);

      await service.logMessage(ctx as any, TelegramMessageType.MESSAGE);

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          command: null,
        }),
      );
    });

    it('should log different message types', async () => {
      const ctx = {
        telegramUser: mockTelegramUser,
        chat: { id: 123456789 },
        message: { text: 'test' },
      };
      telegramMessageLogRepository.create.mockReturnValue({ id: 'log-1' } as any);
      telegramMessageLogRepository.save.mockResolvedValue({ id: 'log-1' } as any);

      await service.logMessage(ctx as any, TelegramMessageType.CALLBACK, 'menu_machines');

      expect(telegramMessageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          message_type: TelegramMessageType.CALLBACK,
          command: 'menu_machines',
        }),
      );
    });
  });

  describe('handleTextMessage', () => {
    const mockSendMessage = jest.fn();

    it('should ignore messages from unverified users', async () => {
      const ctx = {
        telegramUser: { ...mockTelegramUser, is_verified: false },
        message: { text: 'hello' },
      };

      await service.handleTextMessage(ctx as any, mockSendMessage);

      expect(adminCallbackService.handleRejectUserInput).not.toHaveBeenCalled();
    });

    it('should ignore messages when telegramUser is undefined', async () => {
      const ctx = {
        telegramUser: undefined,
        message: { text: 'hello' },
      };

      await service.handleTextMessage(ctx as any, mockSendMessage);

      expect(adminCallbackService.handleRejectUserInput).not.toHaveBeenCalled();
    });

    it('should delegate to adminCallbackService for rejection handling', async () => {
      const ctx = {
        telegramUser: { ...mockTelegramUser, is_verified: true },
        message: { text: 'rejection reason' },
      };
      adminCallbackService.handleRejectUserInput.mockResolvedValue(true);

      await service.handleTextMessage(ctx as any, mockSendMessage);

      expect(adminCallbackService.handleRejectUserInput).toHaveBeenCalledWith(
        ctx,
        'rejection reason',
        mockSendMessage,
      );
    });

    it('should return early if adminCallbackService handles the message', async () => {
      const ctx = {
        telegramUser: { ...mockTelegramUser, is_verified: true },
        message: { text: 'handled message' },
      };
      adminCallbackService.handleRejectUserInput.mockResolvedValue(true);

      await service.handleTextMessage(ctx as any, mockSendMessage);

      expect(adminCallbackService.handleRejectUserInput).toHaveBeenCalled();
    });

    it('should continue if adminCallbackService does not handle the message', async () => {
      const ctx = {
        telegramUser: { ...mockTelegramUser, is_verified: true },
        message: { text: 'unhandled message' },
      };
      adminCallbackService.handleRejectUserInput.mockResolvedValue(false);

      await service.handleTextMessage(ctx as any, mockSendMessage);

      expect(adminCallbackService.handleRejectUserInput).toHaveBeenCalled();
    });

    it('should handle empty message text', async () => {
      const ctx = {
        telegramUser: { ...mockTelegramUser, is_verified: true },
        message: null,
      };
      adminCallbackService.handleRejectUserInput.mockResolvedValue(false);

      await service.handleTextMessage(ctx as any, mockSendMessage);

      expect(adminCallbackService.handleRejectUserInput).toHaveBeenCalledWith(
        ctx,
        '',
        mockSendMessage,
      );
    });

    it('should handle errors and reply with error message in Russian', async () => {
      const ctx = {
        telegramUser: { ...mockTelegramUser, is_verified: true, language: TelegramLanguage.RU },
        message: { text: 'test' },
        reply: jest.fn(),
      };
      adminCallbackService.handleRejectUserInput.mockRejectedValue(new Error('Test error'));

      await service.handleTextMessage(ctx as any, mockSendMessage);

      expect(ctx.reply).toHaveBeenCalledWith('❌ Ошибка: Test error');
    });

    it('should handle errors and reply with error message in English', async () => {
      const ctx = {
        telegramUser: { ...mockTelegramUser, is_verified: true, language: TelegramLanguage.EN },
        message: { text: 'test' },
        reply: jest.fn(),
      };
      adminCallbackService.handleRejectUserInput.mockRejectedValue(new Error('Test error'));

      await service.handleTextMessage(ctx as any, mockSendMessage);

      expect(ctx.reply).toHaveBeenCalledWith('❌ Error: Test error');
    });
  });
});
