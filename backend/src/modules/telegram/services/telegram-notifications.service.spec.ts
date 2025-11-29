import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TelegramNotificationsService,
  NotificationPayload,
} from './telegram-notifications.service';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramSettingsService } from './telegram-settings.service';
import { TelegramResilientApiService } from './telegram-resilient-api.service';
import { TelegramUser, TelegramUserStatus } from '../entities/telegram-user.entity';
import {
  TelegramMessageLog,
  TelegramMessageStatus,
  TelegramMessageType,
} from '../entities/telegram-message-log.entity';

describe('TelegramNotificationsService', () => {
  let service: TelegramNotificationsService;
  let telegramBotService: jest.Mocked<TelegramBotService>;
  let telegramSettingsService: jest.Mocked<TelegramSettingsService>;
  let resilientApi: jest.Mocked<TelegramResilientApiService>;
  let telegramUserRepository: jest.Mocked<Repository<TelegramUser>>;
  let messageLogRepository: jest.Mocked<Repository<TelegramMessageLog>>;

  const mockTelegramUser: Partial<TelegramUser> = {
    id: 'telegram-user-uuid',
    user_id: 'user-uuid',
    telegram_id: '123456789',
    chat_id: '123456789',
    is_verified: true,
    status: TelegramUserStatus.ACTIVE,
    notification_preferences: {},
  };

  const mockSettings = {
    send_notifications: true,
    is_active: true,
  };

  beforeEach(async () => {
    const mockTelegramBotService = {
      isReady: jest.fn().mockReturnValue(true),
    };

    const mockTelegramSettingsService = {
      getSettings: jest.fn().mockResolvedValue(mockSettings),
    };

    const mockResilientApi = {
      sendText: jest.fn().mockResolvedValue(undefined),
    };

    const mockTelegramUserRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockMessageLogRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramNotificationsService,
        { provide: TelegramBotService, useValue: mockTelegramBotService },
        { provide: TelegramSettingsService, useValue: mockTelegramSettingsService },
        { provide: TelegramResilientApiService, useValue: mockResilientApi },
        { provide: getRepositoryToken(TelegramUser), useValue: mockTelegramUserRepository },
        { provide: getRepositoryToken(TelegramMessageLog), useValue: mockMessageLogRepository },
      ],
    }).compile();

    service = module.get<TelegramNotificationsService>(TelegramNotificationsService);
    telegramBotService = module.get(TelegramBotService);
    telegramSettingsService = module.get(TelegramSettingsService);
    resilientApi = module.get(TelegramResilientApiService);
    telegramUserRepository = module.get(getRepositoryToken(TelegramUser));
    messageLogRepository = module.get(getRepositoryToken(TelegramMessageLog));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendNotification', () => {
    const basePayload: NotificationPayload = {
      userId: 'user-uuid',
      type: 'task_assigned',
      title: 'New Task',
      message: 'You have been assigned a new task',
    };

    it('should send notification to single user', async () => {
      telegramUserRepository.findOne.mockResolvedValue(mockTelegramUser as TelegramUser);
      messageLogRepository.create.mockReturnValue({} as TelegramMessageLog);
      messageLogRepository.save.mockResolvedValue({} as TelegramMessageLog);

      await service.sendNotification(basePayload);

      expect(resilientApi.sendText).toHaveBeenCalledWith(
        '123456789',
        expect.stringContaining('New Task'),
        expect.any(Object),
        expect.objectContaining({
          priority: 1,
          attempts: 5,
        }),
      );
    });

    it('should not send when notifications are disabled', async () => {
      telegramSettingsService.getSettings.mockResolvedValue({
        ...mockSettings,
        send_notifications: false,
      } as any);

      await service.sendNotification(basePayload);

      expect(resilientApi.sendText).not.toHaveBeenCalled();
    });

    it('should not send when bot is not ready', async () => {
      telegramBotService.isReady.mockReturnValue(false);

      await service.sendNotification(basePayload);

      expect(resilientApi.sendText).not.toHaveBeenCalled();
    });

    it('should not send when no target users found', async () => {
      telegramUserRepository.findOne.mockResolvedValue(null);

      await service.sendNotification(basePayload);

      expect(resilientApi.sendText).not.toHaveBeenCalled();
    });

    it('should send to multiple users', async () => {
      const user1 = { ...mockTelegramUser, id: 'user-1', user_id: 'u1', chat_id: '111' };
      const user2 = { ...mockTelegramUser, id: 'user-2', user_id: 'u2', chat_id: '222' };

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([user1, user2]),
      };
      telegramUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      messageLogRepository.create.mockReturnValue({} as TelegramMessageLog);
      messageLogRepository.save.mockResolvedValue({} as TelegramMessageLog);

      await service.sendNotification({
        userIds: ['u1', 'u2'],
        type: 'task_assigned',
        title: 'Test',
        message: 'Test message',
      });

      expect(resilientApi.sendText).toHaveBeenCalledTimes(2);
    });

    it('should send broadcast to all active verified users', async () => {
      const users = [
        { ...mockTelegramUser, id: 'user-1', chat_id: '111' },
        { ...mockTelegramUser, id: 'user-2', chat_id: '222' },
      ];
      telegramUserRepository.find.mockResolvedValue(users as TelegramUser[]);
      messageLogRepository.create.mockReturnValue({} as TelegramMessageLog);
      messageLogRepository.save.mockResolvedValue({} as TelegramMessageLog);

      await service.sendNotification({
        broadcast: true,
        type: 'custom',
        title: 'Announcement',
        message: 'Important announcement',
      });

      expect(telegramUserRepository.find).toHaveBeenCalledWith({
        where: { is_verified: true, status: TelegramUserStatus.ACTIVE },
      });
      expect(resilientApi.sendText).toHaveBeenCalledTimes(2);
    });

    it('should skip user when notification preference is disabled', async () => {
      const userWithPrefs = {
        ...mockTelegramUser,
        notification_preferences: { task_assigned: false },
      };
      telegramUserRepository.findOne.mockResolvedValue(userWithPrefs as TelegramUser);

      await service.sendNotification(basePayload);

      expect(resilientApi.sendText).not.toHaveBeenCalled();
    });

    it('should send notification when preference is not explicitly set', async () => {
      // No preference set for task_assigned, should default to true
      telegramUserRepository.findOne.mockResolvedValue(mockTelegramUser as TelegramUser);
      messageLogRepository.create.mockReturnValue({} as TelegramMessageLog);
      messageLogRepository.save.mockResolvedValue({} as TelegramMessageLog);

      await service.sendNotification(basePayload);

      expect(resilientApi.sendText).toHaveBeenCalled();
    });

    it('should format message with data', async () => {
      telegramUserRepository.findOne.mockResolvedValue(mockTelegramUser as TelegramUser);
      messageLogRepository.create.mockReturnValue({} as TelegramMessageLog);
      messageLogRepository.save.mockResolvedValue({} as TelegramMessageLog);

      await service.sendNotification({
        ...basePayload,
        data: { 'Task ID': 'T-001', Priority: 'High' },
      });

      expect(resilientApi.sendText).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Task ID: T-001'),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should log successful notification', async () => {
      telegramUserRepository.findOne.mockResolvedValue(mockTelegramUser as TelegramUser);
      messageLogRepository.create.mockReturnValue({} as TelegramMessageLog);
      messageLogRepository.save.mockResolvedValue({} as TelegramMessageLog);

      await service.sendNotification(basePayload);

      expect(messageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          telegram_user_id: 'telegram-user-uuid',
          chat_id: '123456789',
          message_type: TelegramMessageType.NOTIFICATION,
          status: TelegramMessageStatus.SENT,
        }),
      );
      expect(messageLogRepository.save).toHaveBeenCalled();
    });

    it('should log failed notification', async () => {
      telegramUserRepository.findOne.mockResolvedValue(mockTelegramUser as TelegramUser);
      resilientApi.sendText.mockRejectedValue(new Error('Network error'));
      messageLogRepository.create.mockReturnValue({} as TelegramMessageLog);
      messageLogRepository.save.mockResolvedValue({} as TelegramMessageLog);

      await service.sendNotification(basePayload);

      expect(messageLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: TelegramMessageStatus.FAILED,
          error_message: 'Network error',
        }),
      );
    });
  });

  describe('notifyMachineOffline', () => {
    it('should send machine offline notification', async () => {
      telegramUserRepository.findOne.mockResolvedValue(mockTelegramUser as TelegramUser);
      messageLogRepository.create.mockReturnValue({} as TelegramMessageLog);
      messageLogRepository.save.mockResolvedValue({} as TelegramMessageLog);

      await service.notifyMachineOffline('user-uuid', 'machine-uuid', 'Coffee Machine 1');

      expect(resilientApi.sendText).toHaveBeenCalledWith(
        '123456789',
        expect.stringContaining('Машина оффлайн'),
        expect.any(Object),
        expect.any(Object),
      );
    });
  });

  describe('notifyLowStock', () => {
    it('should send low stock notification', async () => {
      telegramUserRepository.findOne.mockResolvedValue(mockTelegramUser as TelegramUser);
      messageLogRepository.create.mockReturnValue({} as TelegramMessageLog);
      messageLogRepository.save.mockResolvedValue({} as TelegramMessageLog);

      await service.notifyLowStock('user-uuid', 'machine-uuid', 'Coffee Machine 1', 15);

      expect(resilientApi.sendText).toHaveBeenCalledWith(
        '123456789',
        expect.stringContaining('Низкий запас'),
        expect.any(Object),
        expect.any(Object),
      );
    });
  });

  describe('notifyTaskAssigned', () => {
    it('should send task assigned notification', async () => {
      telegramUserRepository.findOne.mockResolvedValue(mockTelegramUser as TelegramUser);
      messageLogRepository.create.mockReturnValue({} as TelegramMessageLog);
      messageLogRepository.save.mockResolvedValue({} as TelegramMessageLog);

      await service.notifyTaskAssigned('user-uuid', 'task-uuid', 'Refill Coffee Machine');

      expect(resilientApi.sendText).toHaveBeenCalledWith(
        '123456789',
        expect.stringContaining('Новая задача'),
        expect.any(Object),
        expect.any(Object),
      );
    });
  });
});
