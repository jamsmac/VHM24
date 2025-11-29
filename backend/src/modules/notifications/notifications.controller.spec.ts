import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
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
import {
  CreateNotificationPreferenceDto,
  UpdateNotificationPreferenceDto,
} from './dto/notification-preference.dto';
import { NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let mockNotificationsService: jest.Mocked<NotificationsService>;

  // Test data
  const mockUserId = 'user-id-1';
  const mockUser2Id = 'user-id-2';
  const mockNotificationId = 'notification-id-1';

  const mockRequest = {
    user: { id: mockUserId },
  };

  const mockNotification: Partial<Notification> = {
    id: mockNotificationId,
    type: NotificationType.TASK_ASSIGNED,
    channel: NotificationChannel.TELEGRAM,
    status: NotificationStatus.PENDING,
    priority: NotificationPriority.NORMAL,
    recipient_id: mockUserId,
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
    id: 'notification-id-2',
    status: NotificationStatus.SENT,
    sent_at: new Date(),
    delivered_at: new Date(),
  };

  const mockReadNotification: Partial<Notification> = {
    ...mockNotification,
    id: 'notification-id-3',
    status: NotificationStatus.READ,
    sent_at: new Date(),
    delivered_at: new Date(),
    read_at: new Date(),
  };

  const mockPreference: Partial<NotificationPreference> = {
    id: 'preference-id-1',
    user_id: mockUserId,
    notification_type: NotificationType.TASK_ASSIGNED,
    channel: NotificationChannel.TELEGRAM,
    is_enabled: true,
    settings: null,
  };

  const mockStats = {
    total: 100,
    by_status: [
      { status: 'sent', count: 50 },
      { status: 'pending', count: 30 },
      { status: 'failed', count: 20 },
    ],
    by_channel: [
      { channel: 'telegram', count: 60 },
      { channel: 'email', count: 40 },
    ],
    by_type: [
      { type: 'task_assigned', count: 45 },
      { type: 'task_completed', count: 35 },
      { type: 'other', count: 20 },
    ],
  };

  beforeEach(async () => {
    mockNotificationsService = {
      create: jest.fn(),
      createBulk: jest.fn(),
      getUserNotifications: jest.fn(),
      findOne: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      sendNotification: jest.fn(),
      remove: jest.fn(),
      getUserPreferences: jest.fn(),
      createPreference: jest.fn(),
      updatePreference: jest.fn(),
      removePreference: jest.fn(),
      getStats: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============================================================================
  // NOTIFICATIONS ENDPOINTS
  // ============================================================================

  describe('create', () => {
    const createDto: CreateNotificationDto = {
      type: NotificationType.TASK_ASSIGNED,
      channel: NotificationChannel.TELEGRAM,
      recipient_id: mockUserId,
      title: 'New Task',
      message: 'You have been assigned a task',
    };

    it('should create a new notification', async () => {
      // Arrange
      mockNotificationsService.create.mockResolvedValue(mockNotification as Notification);

      // Act
      const result = await controller.create(createDto);

      // Assert
      expect(result).toEqual(mockNotification);
      expect(mockNotificationsService.create).toHaveBeenCalledWith(createDto);
    });

    it('should create notification with all optional fields', async () => {
      // Arrange
      const fullDto: CreateNotificationDto = {
        ...createDto,
        priority: NotificationPriority.HIGH,
        data: { task_id: 'task-1', machine_id: 'machine-1' },
        action_url: '/tasks/task-1',
      };
      mockNotificationsService.create.mockResolvedValue({
        ...mockNotification,
        ...fullDto,
      } as Notification);

      // Act
      const result = await controller.create(fullDto);

      // Assert
      expect(result.priority).toBe(NotificationPriority.HIGH);
      expect(mockNotificationsService.create).toHaveBeenCalledWith(fullDto);
    });

    it('should propagate service errors', async () => {
      // Arrange
      mockNotificationsService.create.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(controller.create(createDto)).rejects.toThrow('Database error');
    });
  });

  describe('createBulk', () => {
    const bulkDto: BulkNotificationDto = {
      type: NotificationType.DAILY_REPORT,
      channel: NotificationChannel.EMAIL,
      recipient_ids: [mockUserId, mockUser2Id],
      title: 'Daily Report',
      message: 'Here is your daily summary',
    };

    it('should create notifications for multiple recipients', async () => {
      // Arrange
      const notifications = [
        { ...mockNotification, recipient_id: mockUserId },
        { ...mockNotification, recipient_id: mockUser2Id },
      ];
      mockNotificationsService.createBulk.mockResolvedValue(notifications as Notification[]);

      // Act
      const result = await controller.createBulk(bulkDto);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockNotificationsService.createBulk).toHaveBeenCalledWith(bulkDto);
    });

    it('should return empty array for empty recipient list', async () => {
      // Arrange
      const emptyBulkDto: BulkNotificationDto = {
        ...bulkDto,
        recipient_ids: [],
      };
      mockNotificationsService.createBulk.mockResolvedValue([]);

      // Act
      const result = await controller.createBulk(emptyBulkDto);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getMyNotifications', () => {
    it('should return all notifications for current user', async () => {
      // Arrange
      const notifications = [mockNotification, mockSentNotification];
      mockNotificationsService.getUserNotifications.mockResolvedValue(
        notifications as Notification[],
      );

      // Act
      const result = await controller.getMyNotifications(mockRequest);

      // Assert
      expect(result).toEqual(notifications);
      expect(mockNotificationsService.getUserNotifications).toHaveBeenCalledWith(
        mockUserId,
        undefined,
        false,
      );
    });

    it('should filter by status', async () => {
      // Arrange
      mockNotificationsService.getUserNotifications.mockResolvedValue([
        mockSentNotification,
      ] as Notification[]);

      // Act
      const result = await controller.getMyNotifications(mockRequest, NotificationStatus.SENT);

      // Assert
      expect(result).toEqual([mockSentNotification]);
      expect(mockNotificationsService.getUserNotifications).toHaveBeenCalledWith(
        mockUserId,
        NotificationStatus.SENT,
        false,
      );
    });

    it('should filter unread only when flag is true', async () => {
      // Arrange
      mockNotificationsService.getUserNotifications.mockResolvedValue([
        mockNotification,
      ] as Notification[]);

      // Act
      const result = await controller.getMyNotifications(mockRequest, undefined, true);

      // Assert
      expect(mockNotificationsService.getUserNotifications).toHaveBeenCalledWith(
        mockUserId,
        undefined,
        true,
      );
    });

    it('should combine status and unreadOnly filters', async () => {
      // Arrange
      mockNotificationsService.getUserNotifications.mockResolvedValue([]);

      // Act
      const result = await controller.getMyNotifications(
        mockRequest,
        NotificationStatus.SENT,
        true,
      );

      // Assert
      expect(mockNotificationsService.getUserNotifications).toHaveBeenCalledWith(
        mockUserId,
        NotificationStatus.SENT,
        true,
      );
    });

    it('should return empty array when no notifications exist', async () => {
      // Arrange
      mockNotificationsService.getUserNotifications.mockResolvedValue([]);

      // Act
      const result = await controller.getMyNotifications(mockRequest);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return notification statistics for current user', async () => {
      // Arrange
      mockNotificationsService.getStats.mockResolvedValue(mockStats);

      // Act
      const result = await controller.getStats(mockRequest);

      // Assert
      expect(result).toEqual(mockStats);
      expect(mockNotificationsService.getStats).toHaveBeenCalledWith(mockUserId);
    });

    it('should return zero stats when no notifications exist', async () => {
      // Arrange
      const emptyStats = {
        total: 0,
        by_status: [],
        by_channel: [],
        by_type: [],
      };
      mockNotificationsService.getStats.mockResolvedValue(emptyStats);

      // Act
      const result = await controller.getStats(mockRequest);

      // Assert
      expect(result.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return notification by ID', async () => {
      // Arrange
      mockNotificationsService.findOne.mockResolvedValue(mockNotification as Notification);

      // Act
      const result = await controller.findOne(mockNotificationId);

      // Assert
      expect(result).toEqual(mockNotification);
      expect(mockNotificationsService.findOne).toHaveBeenCalledWith(mockNotificationId);
    });

    it('should throw NotFoundException when notification not found', async () => {
      // Arrange
      mockNotificationsService.findOne.mockRejectedValue(
        new NotFoundException('Notification not found'),
      );

      // Act & Assert
      await expect(controller.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      // Arrange
      mockNotificationsService.markAsRead.mockResolvedValue(mockReadNotification as Notification);

      // Act
      const result = await controller.markAsRead(mockNotificationId);

      // Assert
      expect(result.status).toBe(NotificationStatus.READ);
      expect(result.read_at).toBeDefined();
      expect(mockNotificationsService.markAsRead).toHaveBeenCalledWith(mockNotificationId);
    });

    it('should return already read notification without updating', async () => {
      // Arrange
      mockNotificationsService.markAsRead.mockResolvedValue(mockReadNotification as Notification);

      // Act
      const result = await controller.markAsRead('notification-id-3');

      // Assert
      expect(result.status).toBe(NotificationStatus.READ);
    });

    it('should throw NotFoundException when notification not found', async () => {
      // Arrange
      mockNotificationsService.markAsRead.mockRejectedValue(
        new NotFoundException('Notification not found'),
      );

      // Act & Assert
      await expect(controller.markAsRead('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for current user', async () => {
      // Arrange
      mockNotificationsService.markAllAsRead.mockResolvedValue(undefined);

      // Act
      await controller.markAllAsRead(mockRequest);

      // Assert
      expect(mockNotificationsService.markAllAsRead).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('resend', () => {
    it('should resend notification', async () => {
      // Arrange
      mockNotificationsService.sendNotification.mockResolvedValue(
        mockSentNotification as Notification,
      );

      // Act
      const result = await controller.resend(mockNotificationId);

      // Assert
      expect(result.status).toBe(NotificationStatus.SENT);
      expect(mockNotificationsService.sendNotification).toHaveBeenCalledWith(mockNotificationId);
    });

    it('should throw NotFoundException when notification not found', async () => {
      // Arrange
      mockNotificationsService.sendNotification.mockRejectedValue(
        new NotFoundException('Notification not found'),
      );

      // Act & Assert
      await expect(controller.resend('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete notification', async () => {
      // Arrange
      mockNotificationsService.remove.mockResolvedValue(undefined);

      // Act
      await controller.remove(mockNotificationId);

      // Assert
      expect(mockNotificationsService.remove).toHaveBeenCalledWith(mockNotificationId);
    });

    it('should throw NotFoundException when notification not found', async () => {
      // Arrange
      mockNotificationsService.remove.mockRejectedValue(
        new NotFoundException('Notification not found'),
      );

      // Act & Assert
      await expect(controller.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ============================================================================
  // PREFERENCES ENDPOINTS
  // ============================================================================

  describe('getMyPreferences', () => {
    it('should return all preferences for current user', async () => {
      // Arrange
      const preferences = [mockPreference];
      mockNotificationsService.getUserPreferences.mockResolvedValue(
        preferences as NotificationPreference[],
      );

      // Act
      const result = await controller.getMyPreferences(mockRequest);

      // Assert
      expect(result).toEqual(preferences);
      expect(mockNotificationsService.getUserPreferences).toHaveBeenCalledWith(mockUserId);
    });

    it('should return empty array when no preferences exist', async () => {
      // Arrange
      mockNotificationsService.getUserPreferences.mockResolvedValue([]);

      // Act
      const result = await controller.getMyPreferences(mockRequest);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('createPreference', () => {
    const createPreferenceDto: CreateNotificationPreferenceDto = {
      notification_type: NotificationType.TASK_ASSIGNED,
      channel: NotificationChannel.TELEGRAM,
      is_enabled: true,
    };

    it('should create a new preference', async () => {
      // Arrange
      mockNotificationsService.createPreference.mockResolvedValue(
        mockPreference as NotificationPreference,
      );

      // Act
      const result = await controller.createPreference(createPreferenceDto, mockRequest);

      // Assert
      expect(result).toEqual(mockPreference);
      expect(mockNotificationsService.createPreference).toHaveBeenCalledWith(
        mockUserId,
        createPreferenceDto,
      );
    });

    it('should create preference with settings', async () => {
      // Arrange
      const dtoWithSettings: CreateNotificationPreferenceDto = {
        ...createPreferenceDto,
        settings: { quiet_hours_start: '22:00', quiet_hours_end: '08:00' },
      };
      const preferenceWithSettings = {
        ...mockPreference,
        settings: dtoWithSettings.settings,
      };
      mockNotificationsService.createPreference.mockResolvedValue(
        preferenceWithSettings as NotificationPreference,
      );

      // Act
      const result = await controller.createPreference(dtoWithSettings, mockRequest);

      // Assert
      expect(result.settings).toEqual(dtoWithSettings.settings);
    });
  });

  describe('updatePreference', () => {
    const updatePreferenceDto: UpdateNotificationPreferenceDto = {
      is_enabled: false,
    };

    it('should update existing preference', async () => {
      // Arrange
      const updatedPreference = { ...mockPreference, is_enabled: false };
      mockNotificationsService.updatePreference.mockResolvedValue(
        updatedPreference as NotificationPreference,
      );

      // Act
      const result = await controller.updatePreference(
        NotificationType.TASK_ASSIGNED,
        NotificationChannel.TELEGRAM,
        updatePreferenceDto,
        mockRequest,
      );

      // Assert
      expect(result.is_enabled).toBe(false);
      expect(mockNotificationsService.updatePreference).toHaveBeenCalledWith(
        mockUserId,
        NotificationType.TASK_ASSIGNED,
        NotificationChannel.TELEGRAM,
        updatePreferenceDto,
      );
    });

    it('should create preference if not exists', async () => {
      // Arrange
      const newPreference = {
        ...mockPreference,
        channel: NotificationChannel.EMAIL,
        is_enabled: false,
      };
      mockNotificationsService.updatePreference.mockResolvedValue(
        newPreference as NotificationPreference,
      );

      // Act
      const result = await controller.updatePreference(
        NotificationType.TASK_ASSIGNED,
        NotificationChannel.EMAIL,
        updatePreferenceDto,
        mockRequest,
      );

      // Assert
      expect(result).toBeDefined();
    });

    it('should update preference settings', async () => {
      // Arrange
      const settingsUpdate: UpdateNotificationPreferenceDto = {
        is_enabled: true,
        settings: { quiet_hours_start: '23:00', quiet_hours_end: '07:00' },
      };
      const updatedPreference = { ...mockPreference, settings: settingsUpdate.settings };
      mockNotificationsService.updatePreference.mockResolvedValue(
        updatedPreference as NotificationPreference,
      );

      // Act
      const result = await controller.updatePreference(
        NotificationType.TASK_ASSIGNED,
        NotificationChannel.TELEGRAM,
        settingsUpdate,
        mockRequest,
      );

      // Assert
      expect(result.settings).toEqual(settingsUpdate.settings);
    });
  });

  describe('removePreference', () => {
    it('should delete preference', async () => {
      // Arrange
      mockNotificationsService.removePreference.mockResolvedValue(undefined);

      // Act
      await controller.removePreference(
        NotificationType.TASK_ASSIGNED,
        NotificationChannel.TELEGRAM,
        mockRequest,
      );

      // Assert
      expect(mockNotificationsService.removePreference).toHaveBeenCalledWith(
        mockUserId,
        NotificationType.TASK_ASSIGNED,
        NotificationChannel.TELEGRAM,
      );
    });

    it('should not throw when preference does not exist', async () => {
      // Arrange
      mockNotificationsService.removePreference.mockResolvedValue(undefined);

      // Act & Assert
      await expect(
        controller.removePreference(
          NotificationType.TASK_ASSIGNED,
          NotificationChannel.EMAIL,
          mockRequest,
        ),
      ).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge cases', () => {
    it('should handle all notification types', async () => {
      // Arrange
      const allTypes = Object.values(NotificationType);

      for (const type of allTypes) {
        const createDto: CreateNotificationDto = {
          type,
          channel: NotificationChannel.TELEGRAM,
          recipient_id: mockUserId,
          title: `Test ${type}`,
          message: 'Test message',
        };
        mockNotificationsService.create.mockResolvedValue({
          ...mockNotification,
          type,
        } as Notification);

        // Act
        const result = await controller.create(createDto);

        // Assert
        expect(result.type).toBe(type);
      }
    });

    it('should handle all notification channels', async () => {
      // Arrange
      const allChannels = Object.values(NotificationChannel);

      for (const channel of allChannels) {
        const createDto: CreateNotificationDto = {
          type: NotificationType.TASK_ASSIGNED,
          channel,
          recipient_id: mockUserId,
          title: `Test ${channel}`,
          message: 'Test message',
        };
        mockNotificationsService.create.mockResolvedValue({
          ...mockNotification,
          channel,
        } as Notification);

        // Act
        const result = await controller.create(createDto);

        // Assert
        expect(result.channel).toBe(channel);
      }
    });

    it('should handle all notification priorities', async () => {
      // Arrange
      const allPriorities = Object.values(NotificationPriority);

      for (const priority of allPriorities) {
        const createDto: CreateNotificationDto = {
          type: NotificationType.TASK_ASSIGNED,
          channel: NotificationChannel.TELEGRAM,
          recipient_id: mockUserId,
          title: `Test ${priority}`,
          message: 'Test message',
          priority,
        };
        mockNotificationsService.create.mockResolvedValue({
          ...mockNotification,
          priority,
        } as Notification);

        // Act
        const result = await controller.create(createDto);

        // Assert
        expect(result.priority).toBe(priority);
      }
    });

    it('should handle all notification statuses when filtering', async () => {
      // Arrange
      const allStatuses = Object.values(NotificationStatus);

      for (const status of allStatuses) {
        mockNotificationsService.getUserNotifications.mockResolvedValue([
          { ...mockNotification, status },
        ] as Notification[]);

        // Act
        const result = await controller.getMyNotifications(mockRequest, status);

        // Assert
        expect(mockNotificationsService.getUserNotifications).toHaveBeenCalledWith(
          mockUserId,
          status,
          false,
        );
      }
    });

    it('should propagate service errors in getMyNotifications', async () => {
      // Arrange
      mockNotificationsService.getUserNotifications.mockRejectedValue(
        new Error('Database connection failed'),
      );

      // Act & Assert
      await expect(controller.getMyNotifications(mockRequest)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should propagate service errors in getStats', async () => {
      // Arrange
      mockNotificationsService.getStats.mockRejectedValue(new Error('Stats calculation failed'));

      // Act & Assert
      await expect(controller.getStats(mockRequest)).rejects.toThrow('Stats calculation failed');
    });

    it('should handle notification with complex data payload', async () => {
      // Arrange
      const complexDto: CreateNotificationDto = {
        type: NotificationType.LOW_STOCK_MACHINE,
        channel: NotificationChannel.EMAIL,
        recipient_id: mockUserId,
        title: 'Low Stock Alert',
        message: 'Machine M-001 has low stock',
        data: {
          machine_number: 'M-001',
          items: [
            { name: 'Coffee', current: 5, minimum: 20 },
            { name: 'Sugar', current: 3, minimum: 15 },
          ],
          location: {
            name: 'Office Building',
            address: 'Main St 123',
          },
        },
      };
      mockNotificationsService.create.mockResolvedValue({
        ...mockNotification,
        ...complexDto,
      } as Notification);

      // Act
      const result = await controller.create(complexDto);

      // Assert
      expect(result.data).toEqual(complexDto.data);
    });

    it('should handle preference with complex settings', async () => {
      // Arrange
      const complexPreferenceDto: CreateNotificationPreferenceDto = {
        notification_type: NotificationType.TASK_ASSIGNED,
        channel: NotificationChannel.TELEGRAM,
        is_enabled: true,
        settings: {
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00',
          days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          timezone: 'Asia/Tashkent',
        },
      };
      mockNotificationsService.createPreference.mockResolvedValue({
        ...mockPreference,
        settings: complexPreferenceDto.settings,
      } as NotificationPreference);

      // Act
      const result = await controller.createPreference(complexPreferenceDto, mockRequest);

      // Assert
      expect(result.settings).toEqual(complexPreferenceDto.settings);
    });

    it('should handle bulk notification with single recipient', async () => {
      // Arrange
      const singleBulkDto: BulkNotificationDto = {
        type: NotificationType.SYSTEM_ALERT,
        channel: NotificationChannel.IN_APP,
        recipient_ids: [mockUserId],
        title: 'System Alert',
        message: 'Important system message',
      };
      mockNotificationsService.createBulk.mockResolvedValue([mockNotification] as Notification[]);

      // Act
      const result = await controller.createBulk(singleBulkDto);

      // Assert
      expect(result).toHaveLength(1);
    });

    it('should handle bulk notification with many recipients', async () => {
      // Arrange
      const manyRecipients = Array.from({ length: 50 }, (_, i) => `user-id-${i}`);
      const largeBulkDto: BulkNotificationDto = {
        type: NotificationType.DAILY_REPORT,
        channel: NotificationChannel.EMAIL,
        recipient_ids: manyRecipients,
        title: 'Daily Report',
        message: 'Here is your daily summary',
      };
      const manyNotifications = manyRecipients.map((id) => ({
        ...mockNotification,
        recipient_id: id,
      }));
      mockNotificationsService.createBulk.mockResolvedValue(manyNotifications as Notification[]);

      // Act
      const result = await controller.createBulk(largeBulkDto);

      // Assert
      expect(result).toHaveLength(50);
    });
  });
});
