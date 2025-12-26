import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  TelegramNotificationsService,
  NotificationPayload,
} from './telegram-notifications.service';
import { TelegramBotService } from '../../core/services/telegram-bot.service';
import { TelegramSettingsService } from '../../users/services/telegram-settings.service';
import { TelegramResilientApiService } from '../../infrastructure/services/telegram-resilient-api.service';
import { TelegramUser, TelegramUserStatus } from '../../shared/entities/telegram-user.entity';
import {
  TelegramMessageLog,
  TelegramMessageStatus,
  TelegramMessageType,
} from '../../shared/entities/telegram-message-log.entity';

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

  describe('sendNotification edge cases', () => {
    it('should handle error when getting settings fails', async () => {
      telegramSettingsService.getSettings.mockRejectedValue(new Error('DB error'));

      await service.sendNotification({
        userId: 'user-uuid',
        type: 'task_assigned',
        title: 'Test',
        message: 'Test',
      });

      // Should not throw and not send
      expect(resilientApi.sendText).not.toHaveBeenCalled();
    });

    it('should return empty users when no targeting specified', async () => {
      // Payload with no userId, userIds, or broadcast
      await service.sendNotification({
        type: 'custom',
        title: 'Test',
        message: 'Test',
      });

      expect(resilientApi.sendText).not.toHaveBeenCalled();
    });

    it('should send notification for unknown notification type', async () => {
      telegramUserRepository.findOne.mockResolvedValue(mockTelegramUser as TelegramUser);
      messageLogRepository.create.mockReturnValue({} as TelegramMessageLog);
      messageLogRepository.save.mockResolvedValue({} as TelegramMessageLog);

      await service.sendNotification({
        userId: 'user-uuid',
        type: 'unknown_type_xyz',
        title: 'Unknown',
        message: 'Test',
      });

      expect(resilientApi.sendText).toHaveBeenCalled();
    });

    it('should build keyboard with callback_data action', async () => {
      telegramUserRepository.findOne.mockResolvedValue(mockTelegramUser as TelegramUser);
      messageLogRepository.create.mockReturnValue({} as TelegramMessageLog);
      messageLogRepository.save.mockResolvedValue({} as TelegramMessageLog);

      await service.sendNotification({
        userId: 'user-uuid',
        type: 'task_assigned',
        title: 'Test',
        message: 'Test',
        actions: [{ text: 'Action', callback_data: 'action_data' }],
      });

      expect(resilientApi.sendText).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          reply_markup: expect.any(Object),
        }),
        expect.any(Object),
      );
    });

    it('should filter out invalid actions without url or callback_data', async () => {
      telegramUserRepository.findOne.mockResolvedValue(mockTelegramUser as TelegramUser);
      messageLogRepository.create.mockReturnValue({} as TelegramMessageLog);
      messageLogRepository.save.mockResolvedValue({} as TelegramMessageLog);

      await service.sendNotification({
        userId: 'user-uuid',
        type: 'task_assigned',
        title: 'Test',
        message: 'Test',
        actions: [{ text: 'Invalid Action' }], // No url or callback_data
      });

      // Should send without keyboard
      expect(resilientApi.sendText).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          parse_mode: 'HTML',
        }),
        expect.any(Object),
      );
    });

    it('should handle log failure gracefully', async () => {
      telegramUserRepository.findOne.mockResolvedValue(mockTelegramUser as TelegramUser);
      messageLogRepository.create.mockReturnValue({} as TelegramMessageLog);
      messageLogRepository.save.mockRejectedValue(new Error('DB error'));

      // Should not throw
      await service.sendNotification({
        userId: 'user-uuid',
        type: 'task_assigned',
        title: 'Test',
        message: 'Test',
      });

      expect(resilientApi.sendText).toHaveBeenCalled();
    });

    it('should handle user with null notification_preferences', async () => {
      const userWithNullPrefs = {
        ...mockTelegramUser,
        notification_preferences: null,
      };
      telegramUserRepository.findOne.mockResolvedValue(userWithNullPrefs as unknown as TelegramUser);
      messageLogRepository.create.mockReturnValue({} as TelegramMessageLog);
      messageLogRepository.save.mockResolvedValue({} as TelegramMessageLog);

      await service.sendNotification({
        userId: 'user-uuid',
        type: 'task_assigned',
        title: 'Test',
        message: 'Test',
      });

      // Should send (defaults to true when prefs are null)
      expect(resilientApi.sendText).toHaveBeenCalled();
    });

    it('should handle empty data object', async () => {
      telegramUserRepository.findOne.mockResolvedValue(mockTelegramUser as TelegramUser);
      messageLogRepository.create.mockReturnValue({} as TelegramMessageLog);
      messageLogRepository.save.mockResolvedValue({} as TelegramMessageLog);

      await service.sendNotification({
        userId: 'user-uuid',
        type: 'task_assigned',
        title: 'Test',
        message: 'Test',
        data: {}, // Empty data object
      });

      expect(resilientApi.sendText).toHaveBeenCalled();
    });
  });

  describe('sendDirectNotification', () => {
    it('should send direct notification when bot is ready', async () => {
      const result = await service.sendDirectNotification(123456789, 'Test message');

      expect(result).toBe(true);
      expect(resilientApi.sendText).toHaveBeenCalledWith(
        '123456789',
        'Test message',
        { parse_mode: 'Markdown' },
        expect.objectContaining({ priority: 1, attempts: 3 }),
      );
    });

    it('should return false when bot is not ready', async () => {
      telegramBotService.isReady.mockReturnValue(false);

      const result = await service.sendDirectNotification(123456789, 'Test message');

      expect(result).toBe(false);
      expect(resilientApi.sendText).not.toHaveBeenCalled();
    });

    it('should return false when sending fails', async () => {
      resilientApi.sendText.mockRejectedValue(new Error('Network error'));

      const result = await service.sendDirectNotification(123456789, 'Test message');

      expect(result).toBe(false);
    });
  });

  describe('notifyTaskAssignedWithTask', () => {
    const mockTask = {
      id: 'task-uuid',
      type_code: 'refill',
      priority: 'high',
      due_date: new Date('2025-12-25'),
      machine: { machine_number: 'M-001' },
    };

    it('should send task assigned notification with task details', async () => {
      const result = await service.notifyTaskAssignedWithTask(mockTask as any, 123456789);

      expect(result).toBe(true);
      expect(resilientApi.sendText).toHaveBeenCalledWith(
        '123456789',
        expect.stringContaining('Новая задача назначена'),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should handle task without due_date', async () => {
      const taskNoDue = { ...mockTask, due_date: null };

      await service.notifyTaskAssignedWithTask(taskNoDue as any, 123456789);

      expect(resilientApi.sendText).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Не указан'),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should handle task without machine', async () => {
      const taskNoMachine = { ...mockTask, machine: null };

      await service.notifyTaskAssignedWithTask(taskNoMachine as any, 123456789);

      expect(resilientApi.sendText).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('N/A'),
        expect.any(Object),
        expect.any(Object),
      );
    });
  });

  describe('notifyTaskOverdue', () => {
    const mockTask = {
      id: 'task-uuid',
      type_code: 'refill',
      machine: { machine_number: 'M-001' },
    };

    it('should send task overdue notification', async () => {
      const result = await service.notifyTaskOverdue(mockTask as any, 123456789, 5);

      expect(result).toBe(true);
      expect(resilientApi.sendText).toHaveBeenCalledWith(
        '123456789',
        expect.stringContaining('Задача просрочена'),
        expect.any(Object),
        expect.any(Object),
      );
      expect(resilientApi.sendText).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('5 часов'),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should handle task without machine in overdue notification', async () => {
      const taskNoMachine = { ...mockTask, machine: null };

      await service.notifyTaskOverdue(taskNoMachine as any, 123456789, 3);

      expect(resilientApi.sendText).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('N/A'),
        expect.any(Object),
        expect.any(Object),
      );
    });
  });

  describe('getPriorityEmoji (via notifyTaskAssignedWithTask)', () => {
    it('should show correct emoji for low priority', async () => {
      const task = { id: 't', type_code: 'refill', priority: 'low', machine: { machine_number: 'M' } };
      await service.notifyTaskAssignedWithTask(task as any, 123);
      expect(resilientApi.sendText).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('🟢'),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should show correct emoji for normal priority', async () => {
      const task = { id: 't', type_code: 'refill', priority: 'normal', machine: { machine_number: 'M' } };
      await service.notifyTaskAssignedWithTask(task as any, 123);
      expect(resilientApi.sendText).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('🟡'),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should show correct emoji for urgent priority', async () => {
      const task = { id: 't', type_code: 'refill', priority: 'urgent', machine: { machine_number: 'M' } };
      await service.notifyTaskAssignedWithTask(task as any, 123);
      expect(resilientApi.sendText).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('🔴'),
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should show default emoji for unknown priority', async () => {
      const task = { id: 't', type_code: 'refill', priority: 'unknown', machine: { machine_number: 'M' } };
      await service.notifyTaskAssignedWithTask(task as any, 123);
      expect(resilientApi.sendText).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('⚪'),
        expect.any(Object),
        expect.any(Object),
      );
    });
  });
});
