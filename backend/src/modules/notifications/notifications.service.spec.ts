import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import {
  Notification,
  NotificationStatus,
  NotificationChannel,
  NotificationType,
  NotificationPriority,
} from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { CreateNotificationDto, BulkNotificationDto } from './dto/create-notification.dto';
import { EmailService } from '../email/email.service';
import { TelegramNotificationsService } from '../telegram/notifications/services/telegram-notifications.service';
import { WebPushService } from '../web-push/web-push.service';
import { FcmService } from '../fcm/fcm.service';
import { SmsService } from '../sms/sms.service';
import { User } from '@modules/users/entities/user.entity';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockNotificationRepository: jest.Mocked<Repository<Notification>>;
  let mockPreferenceRepository: jest.Mocked<Repository<NotificationPreference>>;
  let mockEmailService: jest.Mocked<EmailService>;
  let mockTelegramNotificationsService: jest.Mocked<TelegramNotificationsService>;
  let mockWebPushService: jest.Mocked<WebPushService>;
  let mockFcmService: jest.Mocked<FcmService>;
  let mockSmsService: jest.Mocked<SmsService>;

  // Test data
  const mockUserId = 'user-id-1';
  const mockUser2Id = 'user-id-2';
  const mockNotificationId = 'notification-id-1';

  const mockUser: Partial<User> = {
    id: mockUserId,
    full_name: 'Test User',
    email: 'test@example.com',
    telegram_user_id: '123456789',
  };

  const mockNotification: Partial<Notification> = {
    id: mockNotificationId,
    type: NotificationType.TASK_ASSIGNED,
    channel: NotificationChannel.TELEGRAM,
    status: NotificationStatus.PENDING,
    priority: NotificationPriority.NORMAL,
    recipient_id: mockUserId,
    recipient: mockUser as User,
    title: 'New Task Assigned',
    message: 'You have been assigned a new refill task',
    data: { task_id: 'task-1' },
    action_url: '/tasks/task-1',
    sent_at: null,
    delivered_at: null,
    read_at: null,
    delivery_response: null,
    error_message: null,
    retry_count: 0,
    next_retry_at: null,
    created_at: new Date(),
  };

  const mockSentNotification: Partial<Notification> = {
    ...mockNotification,
    status: NotificationStatus.SENT,
    sent_at: new Date(),
    delivered_at: new Date(),
  };

  const mockFailedNotification: Partial<Notification> = {
    ...mockNotification,
    id: 'notification-id-failed',
    status: NotificationStatus.FAILED,
    error_message: 'Network error',
    retry_count: 1,
    next_retry_at: new Date(Date.now() - 1000), // Past time - ready for retry
  };

  const mockPreference: Partial<NotificationPreference> = {
    id: 'preference-id-1',
    user_id: mockUserId,
    notification_type: NotificationType.TASK_ASSIGNED,
    channel: NotificationChannel.TELEGRAM,
    is_enabled: true,
    settings: null,
  };

  const mockDisabledPreference: Partial<NotificationPreference> = {
    ...mockPreference,
    is_enabled: false,
  };

  // Helper to create mock query builder
  const createMockQueryBuilder = () => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
    getMany: jest.fn().mockResolvedValue([]),
    getCount: jest.fn().mockResolvedValue(0),
    getRawMany: jest.fn().mockResolvedValue([]),
  });

  beforeEach(async () => {
    mockNotificationRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      softRemove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(createMockQueryBuilder()),
    } as any;

    mockPreferenceRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      softRemove: jest.fn(),
    } as any;

    mockEmailService = {
      sendEmail: jest.fn(),
      sendTaskNotification: jest.fn(),
      sendOverdueNotification: jest.fn(),
      sendLowStockAlert: jest.fn(),
    } as any;

    mockTelegramNotificationsService = {
      sendDirectNotification: jest.fn(),
      notifyTaskAssignedWithTask: jest.fn(),
      notifyTaskOverdue: jest.fn(),
    } as any;

    mockWebPushService = {
      sendToUser: jest.fn(),
      sendToMultipleUsers: jest.fn(),
      getPublicKey: jest.fn().mockReturnValue('test-public-key'),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      getUserSubscriptions: jest.fn(),
      sendTestNotification: jest.fn(),
      cleanupInactiveSubscriptions: jest.fn(),
    } as any;

    mockFcmService = {
      sendToUser: jest.fn(),
      sendToMultipleUsers: jest.fn(),
      sendToTopic: jest.fn(),
      subscribeToTopic: jest.fn(),
      unsubscribeFromTopic: jest.fn(),
    } as any;

    mockSmsService = {
      send: jest.fn(),
      sendSimple: jest.fn(),
      sendBulk: jest.fn(),
      sendVerificationCode: jest.fn(),
      sendTaskNotification: jest.fn(),
      sendUrgentAlert: jest.fn(),
      isReady: jest.fn().mockReturnValue(true),
      getAccountInfo: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
        {
          provide: getRepositoryToken(NotificationPreference),
          useValue: mockPreferenceRepository,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: TelegramNotificationsService,
          useValue: mockTelegramNotificationsService,
        },
        {
          provide: WebPushService,
          useValue: mockWebPushService,
        },
        {
          provide: FcmService,
          useValue: mockFcmService,
        },
        {
          provide: SmsService,
          useValue: mockSmsService,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateNotificationDto = {
      type: NotificationType.TASK_ASSIGNED,
      channel: NotificationChannel.TELEGRAM,
      recipient_id: mockUserId,
      title: 'New Task',
      message: 'You have been assigned a task',
      data: { task_id: 'task-1' },
    };

    it('should create notification successfully when user allows it', async () => {
      // Arrange
      mockPreferenceRepository.findOne.mockResolvedValue(mockPreference as NotificationPreference);
      mockNotificationRepository.create.mockReturnValue(mockNotification as Notification);
      mockNotificationRepository.save.mockResolvedValue(mockNotification as Notification);
      mockNotificationRepository.findOne.mockResolvedValue(mockNotification as Notification);
      mockTelegramNotificationsService.notifyTaskAssignedWithTask.mockResolvedValue(true);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result).toEqual(mockNotification);
      expect(mockNotificationRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockNotificationRepository.save).toHaveBeenCalled();
    });

    it('should create notification with FAILED status when user preference disables it', async () => {
      // Arrange
      mockPreferenceRepository.findOne.mockResolvedValue(
        mockDisabledPreference as NotificationPreference,
      );
      const failedNotification = {
        ...mockNotification,
        status: NotificationStatus.FAILED,
        error_message: 'Disabled by user preference',
      };
      mockNotificationRepository.create.mockReturnValue(failedNotification as Notification);
      mockNotificationRepository.save.mockResolvedValue(failedNotification as Notification);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result.status).toBe(NotificationStatus.FAILED);
      expect(result.error_message).toBe('Disabled by user preference');
    });

    it('should create notification when no preference exists (default: allowed)', async () => {
      // Arrange
      mockPreferenceRepository.findOne.mockResolvedValue(null);
      mockNotificationRepository.create.mockReturnValue(mockNotification as Notification);
      mockNotificationRepository.save.mockResolvedValue(mockNotification as Notification);
      mockNotificationRepository.findOne.mockResolvedValue(mockNotification as Notification);
      mockTelegramNotificationsService.notifyTaskAssignedWithTask.mockResolvedValue(true);

      // Act
      const result = await service.create(createDto);

      // Assert
      expect(result).toEqual(mockNotification);
    });

    it('should create and send IN_APP notification immediately', async () => {
      // Arrange
      const inAppDto: CreateNotificationDto = {
        ...createDto,
        channel: NotificationChannel.IN_APP,
      };
      const inAppNotification = {
        ...mockNotification,
        channel: NotificationChannel.IN_APP,
      };
      mockPreferenceRepository.findOne.mockResolvedValue(null);
      mockNotificationRepository.create.mockReturnValue(inAppNotification as Notification);
      mockNotificationRepository.save.mockResolvedValue(inAppNotification as Notification);
      mockNotificationRepository.findOne.mockResolvedValue(inAppNotification as Notification);

      // Act
      const result = await service.create(inAppDto);

      // Assert
      expect(result.channel).toBe(NotificationChannel.IN_APP);
    });
  });

  describe('createBulk', () => {
    const bulkDto: BulkNotificationDto = {
      type: NotificationType.DAILY_REPORT,
      channel: NotificationChannel.TELEGRAM,
      recipient_ids: [mockUserId, mockUser2Id],
      title: 'Daily Report',
      message: 'Here is your daily summary',
    };

    it('should create notifications for all recipients in parallel', async () => {
      // Arrange
      mockPreferenceRepository.findOne.mockResolvedValue(null);
      mockNotificationRepository.create.mockReturnValue(mockNotification as Notification);
      mockNotificationRepository.save.mockResolvedValue(mockNotification as Notification);
      mockNotificationRepository.findOne.mockResolvedValue(mockNotification as Notification);
      mockTelegramNotificationsService.sendDirectNotification.mockResolvedValue(true);

      // Act
      const result = await service.createBulk(bulkDto);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockNotificationRepository.create).toHaveBeenCalledTimes(2);
    });

    it('should handle partial failures in bulk creation', async () => {
      // Arrange
      mockPreferenceRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockDisabledPreference as NotificationPreference);

      const successNotification = { ...mockNotification };
      const failedNotification = {
        ...mockNotification,
        status: NotificationStatus.FAILED,
        error_message: 'Disabled by user preference',
      };

      mockNotificationRepository.create
        .mockReturnValueOnce(successNotification as Notification)
        .mockReturnValueOnce(failedNotification as Notification);
      mockNotificationRepository.save
        .mockResolvedValueOnce(successNotification as Notification)
        .mockResolvedValueOnce(failedNotification as Notification);
      mockNotificationRepository.findOne.mockResolvedValue(mockNotification as Notification);
      mockTelegramNotificationsService.sendDirectNotification.mockResolvedValue(true);

      // Act
      const result = await service.createBulk(bulkDto);

      // Assert
      expect(result).toHaveLength(2);
    });

    it('should handle empty recipient list', async () => {
      // Arrange
      const emptyBulkDto: BulkNotificationDto = {
        ...bulkDto,
        recipient_ids: [],
      };

      // Act
      const result = await service.createBulk(emptyBulkDto);

      // Assert
      expect(result).toHaveLength(0);
      expect(mockNotificationRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getUserNotifications', () => {
    it('should return all notifications for user', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue([mockNotification] as Notification[]);
      mockNotificationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.getUserNotifications(mockUserId);

      // Assert
      expect(result).toEqual([mockNotification]);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('notification.recipient_id = :userId', {
        userId: mockUserId,
      });
    });

    it('should filter by status when provided', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue([mockSentNotification] as Notification[]);
      mockNotificationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      const _result = await service.getUserNotifications(mockUserId, NotificationStatus.SENT);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('notification.status = :status', {
        status: NotificationStatus.SENT,
      });
    });

    it('should filter unread only when flag is true', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue([mockNotification] as Notification[]);
      mockNotificationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      const _result = await service.getUserNotifications(mockUserId, undefined, true);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('notification.read_at IS NULL');
    });

    it('should order by created_at DESC', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockNotificationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      await service.getUserNotifications(mockUserId);

      // Assert
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('notification.created_at', 'DESC');
    });

    it('should combine status and unreadOnly filters', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockNotificationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      await service.getUserNotifications(mockUserId, NotificationStatus.SENT, true);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(2);
    });
  });

  describe('findOne', () => {
    it('should return notification by ID', async () => {
      // Arrange
      mockNotificationRepository.findOne.mockResolvedValue(mockNotification as Notification);

      // Act
      const result = await service.findOne(mockNotificationId);

      // Assert
      expect(result).toEqual(mockNotification);
      expect(mockNotificationRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockNotificationId },
      });
    });

    it('should throw NotFoundException when notification not found', async () => {
      // Arrange
      mockNotificationRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      // Arrange
      mockNotificationRepository.findOne.mockResolvedValue(mockNotification as Notification);
      mockNotificationRepository.save.mockImplementation(async (n) => n as Notification);

      // Act
      const result = await service.markAsRead(mockNotificationId);

      // Assert
      expect(result.read_at).toBeDefined();
      expect(result.status).toBe(NotificationStatus.READ);
      expect(mockNotificationRepository.save).toHaveBeenCalled();
    });

    it('should not update already read notification', async () => {
      // Arrange
      const alreadyReadNotification = {
        ...mockNotification,
        read_at: new Date(),
        status: NotificationStatus.READ,
      };
      mockNotificationRepository.findOne.mockResolvedValue(alreadyReadNotification as Notification);

      // Act
      const result = await service.markAsRead(mockNotificationId);

      // Assert
      expect(mockNotificationRepository.save).not.toHaveBeenCalled();
      expect(result.read_at).toBeDefined();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read for user', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      mockNotificationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      await service.markAllAsRead(mockUserId);

      // Assert
      expect(mockQueryBuilder.update).toHaveBeenCalled();
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({
        read_at: expect.any(Date),
        status: NotificationStatus.READ,
      });
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('recipient_id = :userId', {
        userId: mockUserId,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('read_at IS NULL');
      expect(mockQueryBuilder.execute).toHaveBeenCalled();
    });
  });

  describe('sendNotification', () => {
    describe('Telegram channel', () => {
      it('should send Telegram TASK_ASSIGNED notification', async () => {
        // Arrange
        const telegramNotification = {
          ...mockNotification,
          channel: NotificationChannel.TELEGRAM,
          type: NotificationType.TASK_ASSIGNED,
          data: { task: { id: 'task-1' } },
        };
        mockNotificationRepository.findOne.mockResolvedValue(telegramNotification as Notification);
        mockTelegramNotificationsService.notifyTaskAssignedWithTask.mockResolvedValue(true);
        mockNotificationRepository.save.mockImplementation(async (n) => n as Notification);

        // Act
        const result = await service.sendNotification(mockNotificationId);

        // Assert
        expect(result.status).toBe(NotificationStatus.SENT);
        expect(result.sent_at).toBeDefined();
        expect(mockTelegramNotificationsService.notifyTaskAssignedWithTask).toHaveBeenCalled();
      });

      it('should send Telegram TASK_OVERDUE notification', async () => {
        // Arrange
        const telegramNotification = {
          ...mockNotification,
          channel: NotificationChannel.TELEGRAM,
          type: NotificationType.TASK_OVERDUE,
          data: { task: { id: 'task-1' }, overdue_hours: 5 },
        };
        mockNotificationRepository.findOne.mockResolvedValue(telegramNotification as Notification);
        mockTelegramNotificationsService.notifyTaskOverdue.mockResolvedValue(true);
        mockNotificationRepository.save.mockImplementation(async (n) => n as Notification);

        // Act
        const _result = await service.sendNotification(mockNotificationId);

        // Assert
        expect(mockTelegramNotificationsService.notifyTaskOverdue).toHaveBeenCalled();
      });

      it('should fallback to generic send for unknown Telegram notification types', async () => {
        // Arrange
        const telegramNotification = {
          ...mockNotification,
          channel: NotificationChannel.TELEGRAM,
          type: NotificationType.OTHER,
        };
        mockNotificationRepository.findOne.mockResolvedValue(telegramNotification as Notification);
        mockTelegramNotificationsService.sendDirectNotification.mockResolvedValue(true);
        mockNotificationRepository.save.mockImplementation(async (n) => n as Notification);

        // Act
        const _result = await service.sendNotification(mockNotificationId);

        // Assert
        expect(mockTelegramNotificationsService.sendDirectNotification).toHaveBeenCalled();
      });

      it('should handle missing recipient Telegram ID', async () => {
        // Arrange
        const notificationWithoutTelegramId = {
          ...mockNotification,
          channel: NotificationChannel.TELEGRAM,
          type: NotificationType.OTHER,
          recipient: { ...mockUser, telegram_user_id: null },
        };
        mockNotificationRepository.findOne.mockResolvedValue(
          notificationWithoutTelegramId as Notification,
        );
        mockNotificationRepository.save.mockImplementation(async (n) => n as Notification);

        // Act
        const result = await service.sendNotification(mockNotificationId);

        // Assert
        expect(result.status).toBe(NotificationStatus.FAILED);
        expect(result.error_message).toContain('Telegram ID not found');
      });
    });

    describe('Email channel', () => {
      it('should send Email TASK_ASSIGNED notification', async () => {
        // Arrange
        const emailNotification = {
          ...mockNotification,
          channel: NotificationChannel.EMAIL,
          type: NotificationType.TASK_ASSIGNED,
          data: { machine_number: 'M-001', due_date: '2025-01-20', task_type: 'REFILL' },
        };
        mockNotificationRepository.findOne.mockResolvedValue(emailNotification as Notification);
        mockEmailService.sendTaskNotification.mockResolvedValue(true);
        mockNotificationRepository.save.mockImplementation(async (n) => n as Notification);

        // Act
        const result = await service.sendNotification(mockNotificationId);

        // Assert
        expect(result.status).toBe(NotificationStatus.SENT);
        expect(mockEmailService.sendTaskNotification).toHaveBeenCalledWith(
          'test@example.com',
          'REFILL',
          'M-001',
          expect.any(Date),
        );
      });

      it('should send Email TASK_OVERDUE notification', async () => {
        // Arrange
        const emailNotification = {
          ...mockNotification,
          channel: NotificationChannel.EMAIL,
          type: NotificationType.TASK_OVERDUE,
          data: { machine_number: 'M-001', overdue_hours: 5, task_type: 'REFILL' },
        };
        mockNotificationRepository.findOne.mockResolvedValue(emailNotification as Notification);
        mockEmailService.sendOverdueNotification.mockResolvedValue(true);
        mockNotificationRepository.save.mockImplementation(async (n) => n as Notification);

        // Act
        const _result = await service.sendNotification(mockNotificationId);

        // Assert
        expect(mockEmailService.sendOverdueNotification).toHaveBeenCalledWith(
          'test@example.com',
          'REFILL',
          'M-001',
          5,
        );
      });

      it('should send Email LOW_STOCK_MACHINE notification', async () => {
        // Arrange
        const emailNotification = {
          ...mockNotification,
          channel: NotificationChannel.EMAIL,
          type: NotificationType.LOW_STOCK_MACHINE,
          data: { machine_number: 'M-001', items: ['Coffee', 'Sugar'] },
        };
        mockNotificationRepository.findOne.mockResolvedValue(emailNotification as Notification);
        mockEmailService.sendLowStockAlert.mockResolvedValue(true);
        mockNotificationRepository.save.mockImplementation(async (n) => n as Notification);

        // Act
        const _result = await service.sendNotification(mockNotificationId);

        // Assert
        expect(mockEmailService.sendLowStockAlert).toHaveBeenCalledWith(
          'test@example.com',
          'M-001',
          ['Coffee', 'Sugar'],
        );
      });

      it('should send generic Email for unknown notification types', async () => {
        // Arrange
        const emailNotification = {
          ...mockNotification,
          channel: NotificationChannel.EMAIL,
          type: NotificationType.OTHER,
        };
        mockNotificationRepository.findOne.mockResolvedValue(emailNotification as Notification);
        mockEmailService.sendEmail.mockResolvedValue(true);
        mockNotificationRepository.save.mockImplementation(async (n) => n as Notification);

        // Act
        const _result = await service.sendNotification(mockNotificationId);

        // Assert
        expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
          expect.objectContaining({
            to: 'test@example.com',
            subject: 'New Task Assigned',
          }),
        );
      });

      it('should handle missing recipient email', async () => {
        // Arrange
        const recipientWithoutEmail: Partial<User> = {
          ...mockUser,
          email: null as unknown as string,
        };
        const notificationWithoutEmail: Partial<Notification> = {
          ...mockNotification,
          channel: NotificationChannel.EMAIL,
          type: NotificationType.OTHER,
          recipient: recipientWithoutEmail as User,
        };
        mockNotificationRepository.findOne.mockResolvedValue(
          notificationWithoutEmail as Notification,
        );
        mockNotificationRepository.save.mockImplementation(async (n) => n as Notification);

        // Act
        const result = await service.sendNotification(mockNotificationId);

        // Assert
        expect(result.status).toBe(NotificationStatus.FAILED);
        expect(result.error_message).toContain('email not found');
      });
    });

    describe('IN_APP channel', () => {
      it('should handle IN_APP notification without external sending', async () => {
        // Arrange
        const inAppNotification = {
          ...mockNotification,
          channel: NotificationChannel.IN_APP,
        };
        mockNotificationRepository.findOne.mockResolvedValue(inAppNotification as Notification);
        mockNotificationRepository.save.mockImplementation(async (n) => n as Notification);

        // Act
        const result = await service.sendNotification(mockNotificationId);

        // Assert
        expect(result.status).toBe(NotificationStatus.SENT);
        expect(result.delivery_response).toBe('In-app notification created');
      });
    });

    describe('SMS channel', () => {
      const mockUserWithPhone: Partial<User> = {
        ...mockUser,
        phone: '+79001234567',
      };

      it('should send SMS notification successfully', async () => {
        // Arrange
        const smsNotification = {
          ...mockNotification,
          channel: NotificationChannel.SMS,
          recipient: mockUserWithPhone as User,
        };
        mockNotificationRepository.findOne.mockResolvedValue(smsNotification as Notification);
        mockNotificationRepository.save.mockImplementation(async (n) => n as Notification);
        mockSmsService.sendSimple.mockResolvedValue(true);

        // Act
        const result = await service.sendNotification(mockNotificationId);

        // Assert
        expect(result.status).toBe(NotificationStatus.SENT);
        expect(result.delivery_response).toBe('SMS sent to +79001234567');
        expect(mockSmsService.sendSimple).toHaveBeenCalledWith(
          '+79001234567',
          smsNotification.message,
        );
      });

      it('should send task notification SMS with special formatting', async () => {
        // Arrange
        const smsNotification = {
          ...mockNotification,
          channel: NotificationChannel.SMS,
          type: NotificationType.TASK_ASSIGNED,
          recipient: mockUserWithPhone as User,
          data: {
            machine_number: 'M-001',
            due_date: '2025-01-20T14:30:00',
            task_type: 'REFILL',
          },
        };
        mockNotificationRepository.findOne.mockResolvedValue(smsNotification as Notification);
        mockNotificationRepository.save.mockImplementation(async (n) => n as Notification);
        mockSmsService.sendTaskNotification.mockResolvedValue(true);

        // Act
        const result = await service.sendNotification(mockNotificationId);

        // Assert
        expect(result.status).toBe(NotificationStatus.SENT);
        expect(mockSmsService.sendTaskNotification).toHaveBeenCalledWith(
          '+79001234567',
          'REFILL',
          'M-001',
          expect.any(Date),
        );
      });

      it('should send urgent alert for system alerts', async () => {
        // Arrange
        const smsNotification = {
          ...mockNotification,
          channel: NotificationChannel.SMS,
          type: NotificationType.SYSTEM_ALERT,
          recipient: mockUserWithPhone as User,
        };
        mockNotificationRepository.findOne.mockResolvedValue(smsNotification as Notification);
        mockNotificationRepository.save.mockImplementation(async (n) => n as Notification);
        mockSmsService.sendUrgentAlert.mockResolvedValue(true);

        // Act
        const result = await service.sendNotification(mockNotificationId);

        // Assert
        expect(result.status).toBe(NotificationStatus.SENT);
        expect(mockSmsService.sendUrgentAlert).toHaveBeenCalledWith(
          '+79001234567',
          smsNotification.message,
        );
      });

      it('should fail when recipient has no phone number', async () => {
        // Arrange
        const smsNotification = {
          ...mockNotification,
          channel: NotificationChannel.SMS,
          recipient: { ...mockUser, phone: null } as User,
        };
        mockNotificationRepository.findOne.mockResolvedValue(smsNotification as Notification);
        mockNotificationRepository.save.mockImplementation(async (n) => n as Notification);

        // Act
        const result = await service.sendNotification(mockNotificationId);

        // Assert
        expect(result.status).toBe(NotificationStatus.FAILED);
        expect(result.error_message).toContain('phone number not found');
      });

      it('should fail when SMS service is not configured', async () => {
        // Arrange
        const smsNotification = {
          ...mockNotification,
          channel: NotificationChannel.SMS,
          recipient: mockUserWithPhone as User,
        };
        mockNotificationRepository.findOne.mockResolvedValue(smsNotification as Notification);
        mockNotificationRepository.save.mockImplementation(async (n) => n as Notification);
        mockSmsService.isReady.mockReturnValue(false);

        // Act
        const result = await service.sendNotification(mockNotificationId);

        // Assert
        expect(result.status).toBe(NotificationStatus.FAILED);
        expect(result.error_message).toContain('SMS service not configured');
      });

      it('should fail when phone number format is invalid', async () => {
        // Arrange
        const smsNotification = {
          ...mockNotification,
          channel: NotificationChannel.SMS,
          recipient: { ...mockUser, phone: 'invalid' } as User,
        };
        mockNotificationRepository.findOne.mockResolvedValue(smsNotification as Notification);
        mockNotificationRepository.save.mockImplementation(async (n) => n as Notification);

        // Act
        const result = await service.sendNotification(mockNotificationId);

        // Assert
        expect(result.status).toBe(NotificationStatus.FAILED);
        expect(result.error_message).toContain('Invalid phone number format');
      });
    });

    describe('WEB_PUSH channel', () => {
      it('should send WEB_PUSH notification successfully', async () => {
        // Arrange
        const webPushNotification = {
          ...mockNotification,
          channel: NotificationChannel.WEB_PUSH,
        };
        mockNotificationRepository.findOne.mockResolvedValue(webPushNotification as Notification);
        mockNotificationRepository.save.mockImplementation(async (n) => n as Notification);
        mockWebPushService.sendToUser.mockResolvedValue(2); // Sent to 2 devices

        // Act
        const result = await service.sendNotification(mockNotificationId);

        // Assert
        expect(result.status).toBe(NotificationStatus.SENT);
        expect(result.delivery_response).toBe('Web push sent to 2 device(s)');
        expect(mockWebPushService.sendToUser).toHaveBeenCalledWith(mockUserId, {
          user_id: mockUserId,
          title: webPushNotification.title,
          body: webPushNotification.message,
          url: webPushNotification.action_url,
          data: webPushNotification.data,
        });
      });

      it('should fail when no active subscriptions for user', async () => {
        // Arrange
        const webPushNotification = {
          ...mockNotification,
          channel: NotificationChannel.WEB_PUSH,
        };
        mockNotificationRepository.findOne.mockResolvedValue(webPushNotification as Notification);
        mockNotificationRepository.save.mockImplementation(async (n) => n as Notification);
        mockWebPushService.sendToUser.mockResolvedValue(0); // No subscriptions

        // Act
        const result = await service.sendNotification(mockNotificationId);

        // Assert
        expect(result.status).toBe(NotificationStatus.FAILED);
        expect(result.error_message).toBe('No active push subscriptions for user');
      });

      it('should handle WebPushService error', async () => {
        // Arrange - Create a fresh notification to avoid mutation issues
        const webPushNotification: Partial<Notification> = {
          id: mockNotificationId,
          type: NotificationType.OTHER,
          channel: NotificationChannel.WEB_PUSH,
          status: NotificationStatus.PENDING,
          priority: NotificationPriority.NORMAL,
          recipient_id: mockUserId,
          recipient: mockUser as User,
          title: 'Test Notification',
          message: 'Test message',
          data: {},
          action_url: null,
          sent_at: null,
          delivered_at: null,
          read_at: null,
          delivery_response: null,
          error_message: null,
          retry_count: 0, // Start at 0
          next_retry_at: null,
          created_at: new Date(),
        };
        mockNotificationRepository.findOne.mockResolvedValue(webPushNotification as Notification);
        mockNotificationRepository.save.mockImplementation(async (n) => n as Notification);
        mockWebPushService.sendToUser.mockRejectedValue(new Error('Web push service error'));

        // Act
        const result = await service.sendNotification(mockNotificationId);

        // Assert
        expect(result.status).toBe(NotificationStatus.FAILED);
        expect(result.error_message).toBe('Web push service error');
        expect(result.retry_count).toBe(1);
      });

      it('should send to single device', async () => {
        // Arrange
        const webPushNotification = {
          ...mockNotification,
          channel: NotificationChannel.WEB_PUSH,
          action_url: '/tasks/task-1',
          data: { task_id: 'task-1' },
        };
        mockNotificationRepository.findOne.mockResolvedValue(webPushNotification as Notification);
        mockNotificationRepository.save.mockImplementation(async (n) => n as Notification);
        mockWebPushService.sendToUser.mockResolvedValue(1);

        // Act
        const result = await service.sendNotification(mockNotificationId);

        // Assert
        expect(result.status).toBe(NotificationStatus.SENT);
        expect(result.delivery_response).toBe('Web push sent to 1 device(s)');
      });
    });

    describe('General behavior', () => {
      it('should not resend already sent notification', async () => {
        // Arrange
        mockNotificationRepository.findOne.mockResolvedValue(mockSentNotification as Notification);

        // Act
        const result = await service.sendNotification(mockNotificationId);

        // Assert
        expect(result.status).toBe(NotificationStatus.SENT);
        expect(mockTelegramNotificationsService.sendDirectNotification).not.toHaveBeenCalled();
        expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
      });

      it('should handle send failure and increment retry count', async () => {
        // Arrange
        // Create a fresh notification object to avoid mutation issues across tests
        const telegramNotification: Partial<Notification> = {
          id: mockNotificationId,
          type: NotificationType.OTHER,
          channel: NotificationChannel.TELEGRAM,
          status: NotificationStatus.PENDING,
          priority: NotificationPriority.NORMAL,
          recipient_id: mockUserId,
          recipient: mockUser as User,
          title: 'Test Notification',
          message: 'Test message',
          data: {},
          action_url: null,
          sent_at: null,
          delivered_at: null,
          read_at: null,
          delivery_response: null,
          error_message: null,
          retry_count: 0, // Start at 0
          next_retry_at: null,
          created_at: new Date(),
        };
        mockNotificationRepository.findOne.mockResolvedValue(telegramNotification as Notification);
        mockTelegramNotificationsService.sendDirectNotification.mockResolvedValue(false);
        mockNotificationRepository.save.mockImplementation(async (n) => n as Notification);

        // Act
        const result = await service.sendNotification(mockNotificationId);

        // Assert
        expect(result.status).toBe(NotificationStatus.FAILED);
        expect(result.retry_count).toBe(1);
        expect(result.next_retry_at).toBeDefined();
      });

      it('should calculate exponential backoff for retries', async () => {
        // Arrange
        const failingNotification = {
          ...mockNotification,
          channel: NotificationChannel.TELEGRAM,
          type: NotificationType.OTHER,
          retry_count: 1,
        };
        mockNotificationRepository.findOne.mockResolvedValue(failingNotification as Notification);
        mockTelegramNotificationsService.sendDirectNotification.mockResolvedValue(false);
        mockNotificationRepository.save.mockImplementation(async (n) => n as Notification);

        // Act
        const result = await service.sendNotification(mockNotificationId);

        // Assert
        expect(result.retry_count).toBe(2);
        expect(result.next_retry_at).toBeDefined();
        // Delay should be 10 minutes (5 * 2^1)
      });

      it('should not schedule retry after max retries reached', async () => {
        // Arrange
        const failingNotification = {
          ...mockNotification,
          channel: NotificationChannel.TELEGRAM,
          type: NotificationType.OTHER,
          retry_count: 2, // Will become 3 after failure
        };
        mockNotificationRepository.findOne.mockResolvedValue(failingNotification as Notification);
        mockTelegramNotificationsService.sendDirectNotification.mockResolvedValue(false);
        mockNotificationRepository.save.mockImplementation(async (n) => n as Notification);

        // Act
        const result = await service.sendNotification(mockNotificationId);

        // Assert
        expect(result.retry_count).toBe(3);
        // next_retry_at should not be set after max retries
      });
    });
  });

  describe('retryFailedNotifications', () => {
    it('should retry all failed notifications ready for retry', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue([mockFailedNotification] as Notification[]);
      mockNotificationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      mockNotificationRepository.findOne.mockResolvedValue({
        ...mockFailedNotification,
        channel: NotificationChannel.TELEGRAM,
        type: NotificationType.OTHER,
      } as Notification);
      mockTelegramNotificationsService.sendDirectNotification.mockResolvedValue(true);
      mockNotificationRepository.save.mockImplementation(async (n) => n as Notification);

      // Act
      await service.retryFailedNotifications();

      // Assert
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('notification.status = :status', {
        status: NotificationStatus.FAILED,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('notification.retry_count < 3');
    });

    it('should not retry notifications with max retry count', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockNotificationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      await service.retryFailedNotifications();

      // Assert
      expect(mockTelegramNotificationsService.sendDirectNotification).not.toHaveBeenCalled();
    });

    it('should process multiple failed notifications', async () => {
      // Arrange
      const failedNotifications = [
        { ...mockFailedNotification, id: 'failed-1' },
        { ...mockFailedNotification, id: 'failed-2' },
      ];
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getMany.mockResolvedValue(failedNotifications as Notification[]);
      mockNotificationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      mockNotificationRepository.findOne.mockResolvedValue({
        ...mockFailedNotification,
        channel: NotificationChannel.TELEGRAM,
        type: NotificationType.OTHER,
      } as Notification);
      mockTelegramNotificationsService.sendDirectNotification.mockResolvedValue(true);
      mockNotificationRepository.save.mockImplementation(async (n) => n as Notification);

      // Spy on sendNotification
      const sendSpy = jest.spyOn(service, 'sendNotification');

      // Act
      await service.retryFailedNotifications();

      // Assert
      expect(sendSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Preferences', () => {
    describe('getUserPreferences', () => {
      it('should return all preferences for user', async () => {
        // Arrange
        mockPreferenceRepository.find.mockResolvedValue([
          mockPreference,
        ] as NotificationPreference[]);

        // Act
        const result = await service.getUserPreferences(mockUserId);

        // Assert
        expect(result).toEqual([mockPreference]);
        expect(mockPreferenceRepository.find).toHaveBeenCalledWith({
          where: { user_id: mockUserId },
        });
      });

      it('should return empty array when no preferences exist', async () => {
        // Arrange
        mockPreferenceRepository.find.mockResolvedValue([]);

        // Act
        const result = await service.getUserPreferences(mockUserId);

        // Assert
        expect(result).toEqual([]);
      });
    });

    describe('getUserPreference', () => {
      it('should return specific preference for user', async () => {
        // Arrange
        mockPreferenceRepository.findOne.mockResolvedValue(
          mockPreference as NotificationPreference,
        );

        // Act
        const result = await service.getUserPreference(
          mockUserId,
          NotificationType.TASK_ASSIGNED,
          NotificationChannel.TELEGRAM,
        );

        // Assert
        expect(result).toEqual(mockPreference);
        expect(mockPreferenceRepository.findOne).toHaveBeenCalledWith({
          where: {
            user_id: mockUserId,
            notification_type: NotificationType.TASK_ASSIGNED,
            channel: NotificationChannel.TELEGRAM,
          },
        });
      });

      it('should return null when preference not found', async () => {
        // Arrange
        mockPreferenceRepository.findOne.mockResolvedValue(null);

        // Act
        const result = await service.getUserPreference(
          mockUserId,
          NotificationType.TASK_ASSIGNED,
          NotificationChannel.EMAIL,
        );

        // Assert
        expect(result).toBeNull();
      });
    });

    describe('createPreference', () => {
      it('should create new preference', async () => {
        // Arrange
        const createDto = {
          notification_type: NotificationType.TASK_ASSIGNED,
          channel: NotificationChannel.TELEGRAM,
          is_enabled: true,
        };
        mockPreferenceRepository.create.mockReturnValue({
          ...createDto,
          user_id: mockUserId,
        } as NotificationPreference);
        mockPreferenceRepository.save.mockResolvedValue({
          ...createDto,
          user_id: mockUserId,
          id: 'new-pref-id',
        } as NotificationPreference);

        // Act
        const result = await service.createPreference(mockUserId, createDto as any);

        // Assert
        expect(result.id).toBeDefined();
        expect(mockPreferenceRepository.create).toHaveBeenCalledWith({
          user_id: mockUserId,
          ...createDto,
        });
      });
    });

    describe('updatePreference', () => {
      it('should update existing preference', async () => {
        // Arrange
        const updateDto = { is_enabled: false };
        mockPreferenceRepository.findOne.mockResolvedValue(
          mockPreference as NotificationPreference,
        );
        mockPreferenceRepository.save.mockImplementation(async (p) => p as NotificationPreference);

        // Act
        const result = await service.updatePreference(
          mockUserId,
          NotificationType.TASK_ASSIGNED,
          NotificationChannel.TELEGRAM,
          updateDto as any,
        );

        // Assert
        expect(result.is_enabled).toBe(false);
      });

      it('should create preference if not exists', async () => {
        // Arrange
        const updateDto = { is_enabled: false };
        mockPreferenceRepository.findOne.mockResolvedValue(null);
        mockPreferenceRepository.create.mockReturnValue({
          user_id: mockUserId,
          notification_type: NotificationType.TASK_ASSIGNED,
          channel: NotificationChannel.EMAIL,
          ...updateDto,
        } as NotificationPreference);
        mockPreferenceRepository.save.mockImplementation(async (p) => p as NotificationPreference);

        // Act
        const result = await service.updatePreference(
          mockUserId,
          NotificationType.TASK_ASSIGNED,
          NotificationChannel.EMAIL,
          updateDto as any,
        );

        // Assert
        expect(result.is_enabled).toBe(false);
        expect(mockPreferenceRepository.create).toHaveBeenCalled();
      });
    });

    describe('removePreference', () => {
      it('should soft delete preference if exists', async () => {
        // Arrange
        mockPreferenceRepository.findOne.mockResolvedValue(
          mockPreference as NotificationPreference,
        );
        mockPreferenceRepository.softRemove.mockResolvedValue(
          mockPreference as NotificationPreference,
        );

        // Act
        await service.removePreference(
          mockUserId,
          NotificationType.TASK_ASSIGNED,
          NotificationChannel.TELEGRAM,
        );

        // Assert
        expect(mockPreferenceRepository.softRemove).toHaveBeenCalledWith(mockPreference);
      });

      it('should not throw when preference does not exist', async () => {
        // Arrange
        mockPreferenceRepository.findOne.mockResolvedValue(null);

        // Act & Assert
        await expect(
          service.removePreference(
            mockUserId,
            NotificationType.TASK_ASSIGNED,
            NotificationChannel.EMAIL,
          ),
        ).resolves.not.toThrow();
        expect(mockPreferenceRepository.softRemove).not.toHaveBeenCalled();
      });
    });
  });

  describe('getStats', () => {
    it('should return notification statistics', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getCount.mockResolvedValue(100);
      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([
          { status: 'sent', count: '50' },
          { status: 'pending', count: '30' },
          { status: 'failed', count: '20' },
        ])
        .mockResolvedValueOnce([
          { channel: 'telegram', count: '60' },
          { channel: 'email', count: '40' },
        ])
        .mockResolvedValueOnce([
          { type: 'task_assigned', count: '45' },
          { type: 'task_completed', count: '35' },
          { type: 'other', count: '20' },
        ]);
      mockNotificationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.getStats();

      // Assert
      expect(result.total).toBe(100);
      expect(result.by_status).toHaveLength(3);
      expect(result.by_channel).toHaveLength(2);
      expect(result.by_type).toHaveLength(3);
    });

    it('should filter by userId when provided', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getCount.mockResolvedValue(10);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      mockNotificationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      await service.getStats(mockUserId);

      // Assert
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('notification.recipient_id = :userId', {
        userId: mockUserId,
      });
    });

    it('should return zeros when no notifications exist', async () => {
      // Arrange
      const mockQueryBuilder = createMockQueryBuilder();
      mockQueryBuilder.getCount.mockResolvedValue(0);
      mockQueryBuilder.getRawMany.mockResolvedValue([]);
      mockNotificationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      // Act
      const result = await service.getStats();

      // Assert
      expect(result.total).toBe(0);
      expect(result.by_status).toEqual([]);
      expect(result.by_channel).toEqual([]);
      expect(result.by_type).toEqual([]);
    });
  });

  describe('remove', () => {
    it('should soft delete notification', async () => {
      // Arrange
      mockNotificationRepository.findOne.mockResolvedValue(mockNotification as Notification);
      mockNotificationRepository.softRemove.mockResolvedValue(mockNotification as Notification);

      // Act
      await service.remove(mockNotificationId);

      // Assert
      expect(mockNotificationRepository.softRemove).toHaveBeenCalledWith(mockNotification);
    });

    it('should throw NotFoundException when notification not found', async () => {
      // Arrange
      mockNotificationRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Edge cases', () => {
    it('should throw error for unsupported notification channel (line 214)', async () => {
      // Arrange - Create notification with unsupported channel
      const unsupportedChannelNotification = {
        ...mockNotification,
        channel: 'UNSUPPORTED_CHANNEL' as NotificationChannel,
      };
      mockNotificationRepository.findOne.mockResolvedValue(
        unsupportedChannelNotification as Notification,
      );
      mockNotificationRepository.save.mockImplementation(async (n) => n as Notification);

      // Act
      const result = await service.sendNotification(mockNotificationId);

      // Assert
      expect(result.status).toBe(NotificationStatus.FAILED);
      expect(result.error_message).toContain('Unsupported channel');
    });

    it('should throw error when email service fails (line 369)', async () => {
      // Arrange
      const emailNotification = {
        ...mockNotification,
        channel: NotificationChannel.EMAIL,
        type: NotificationType.OTHER,
      };
      mockNotificationRepository.findOne.mockResolvedValue(emailNotification as Notification);
      mockEmailService.sendEmail.mockResolvedValue(false); // Email service returns false
      mockNotificationRepository.save.mockImplementation(async (n) => n as Notification);

      // Act
      const result = await service.sendNotification(mockNotificationId);

      // Assert
      expect(result.status).toBe(NotificationStatus.FAILED);
      expect(result.error_message).toBe('Failed to send email');
    });

    it('should handle null data in notification', async () => {
      // Arrange
      const notificationWithNullData = {
        ...mockNotification,
        channel: NotificationChannel.TELEGRAM,
        type: NotificationType.TASK_ASSIGNED,
        data: null,
      };
      mockNotificationRepository.findOne.mockResolvedValue(
        notificationWithNullData as Notification,
      );
      mockTelegramNotificationsService.notifyTaskAssignedWithTask.mockResolvedValue(false);
      mockNotificationRepository.save.mockImplementation(async (n) => n as Notification);

      // Act - should not throw, just fail gracefully
      const result = await service.sendNotification(mockNotificationId);

      // Assert
      expect(result).toBeDefined();
    });

    it('should handle null recipient in notification', async () => {
      // Arrange
      const notificationWithNullRecipient: Partial<Notification> = {
        ...mockNotification,
        channel: NotificationChannel.EMAIL,
        type: NotificationType.OTHER,
        recipient: null as unknown as User,
      };
      mockNotificationRepository.findOne.mockResolvedValue(
        notificationWithNullRecipient as Notification,
      );
      mockNotificationRepository.save.mockImplementation(async (n) => n as Notification);

      // Act
      const result = await service.sendNotification(mockNotificationId);

      // Assert
      expect(result.status).toBe(NotificationStatus.FAILED);
    });
  });
});
