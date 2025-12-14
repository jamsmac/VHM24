import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { WebPushService } from './web-push.service';
import { PushSubscription } from './entities/push-subscription.entity';
import * as webpush from 'web-push';

// Mock web-push module
jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
  generateVAPIDKeys: jest.fn(),
}));

describe('WebPushService', () => {
  let service: WebPushService;
  let subscriptionRepository: jest.Mocked<Repository<PushSubscription>>;
  let configService: jest.Mocked<ConfigService>;

  // Mock fixtures
  const mockSubscription = {
    id: 'subscription-uuid',
    user_id: 'user-uuid',
    endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
    p256dh: 'test-p256dh-key',
    auth: 'test-auth-key',
    user_agent: 'Chrome 120 on Windows',
    is_active: true,
    last_sent_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  };

  const mockSubscribeDto = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/new-endpoint',
    keys: {
      p256dh: 'new-p256dh-key',
      auth: 'new-auth-key',
    },
    user_agent: 'Firefox 121 on MacOS',
  };

  const mockSendNotificationDto = {
    user_id: 'user-uuid',
    title: 'Test Notification',
    body: 'This is a test notification body',
    url: '/dashboard',
    icon: '/icon-192x192.png',
    data: { test: true },
  };

  const createMockRepository = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softRemove: jest.fn(),
    createQueryBuilder: jest.fn(),
  });

  const createMockConfigService = (configured: boolean = true) => ({
    get: jest.fn((key: string, defaultValue?: string) => {
      if (!configured) return defaultValue;
      switch (key) {
        case 'VAPID_PUBLIC_KEY':
          return 'test-public-key';
        case 'VAPID_PRIVATE_KEY':
          return 'test-private-key';
        case 'VAPID_EMAIL':
          return 'test@example.com';
        default:
          return defaultValue;
      }
    }),
  });

  describe('with VAPID configured', () => {
    beforeEach(async () => {
      const mockRepo = createMockRepository();
      const mockConfig = createMockConfigService(true);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WebPushService,
          {
            provide: getRepositoryToken(PushSubscription),
            useValue: mockRepo,
          },
          {
            provide: ConfigService,
            useValue: mockConfig,
          },
        ],
      }).compile();

      service = module.get<WebPushService>(WebPushService);
      subscriptionRepository = module.get(getRepositoryToken(PushSubscription));
      configService = module.get(ConfigService);

      jest.clearAllMocks();
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    // ============================================================================
    // INITIALIZE WEB PUSH TESTS
    // ============================================================================

    describe('initializeWebPush', () => {
      it('should be configured with VAPID details', () => {
        // The service is initialized in beforeEach, so we check that isConfigured is true
        expect(service['isConfigured']).toBe(true);
      });
    });

    // ============================================================================
    // GET PUBLIC KEY TESTS
    // ============================================================================

    describe('getPublicKey', () => {
      it('should return VAPID public key', () => {
        const result = service.getPublicKey();
        expect(configService.get).toHaveBeenCalledWith('VAPID_PUBLIC_KEY', '');
        expect(result).toBe('test-public-key');
      });
    });

    // ============================================================================
    // SUBSCRIBE TESTS
    // ============================================================================

    describe('subscribe', () => {
      it('should create new subscription when endpoint does not exist', async () => {
        subscriptionRepository.findOne.mockResolvedValue(null);
        subscriptionRepository.create.mockReturnValue(mockSubscription as any);
        subscriptionRepository.save.mockResolvedValue(mockSubscription as PushSubscription);

        const result = await service.subscribe('user-uuid', mockSubscribeDto);

        expect(subscriptionRepository.findOne).toHaveBeenCalledWith({
          where: { endpoint: mockSubscribeDto.endpoint },
        });
        expect(subscriptionRepository.create).toHaveBeenCalledWith({
          user_id: 'user-uuid',
          endpoint: mockSubscribeDto.endpoint,
          p256dh: mockSubscribeDto.keys.p256dh,
          auth: mockSubscribeDto.keys.auth,
          user_agent: mockSubscribeDto.user_agent,
          is_active: true,
        });
        expect(result).toEqual(mockSubscription);
      });

      it('should update existing subscription when endpoint exists', async () => {
        const existingSubscription = {
          ...mockSubscription,
          user_id: 'old-user-uuid',
          p256dh: 'old-p256dh',
          auth: 'old-auth',
        };
        subscriptionRepository.findOne.mockResolvedValue(existingSubscription as PushSubscription);
        subscriptionRepository.save.mockImplementation((sub) =>
          Promise.resolve(sub as PushSubscription),
        );

        const _result = await service.subscribe('user-uuid', mockSubscribeDto);

        expect(subscriptionRepository.create).not.toHaveBeenCalled();
        expect(subscriptionRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: 'user-uuid',
            p256dh: mockSubscribeDto.keys.p256dh,
            auth: mockSubscribeDto.keys.auth,
            is_active: true,
          }),
        );
      });

      it('should handle missing user_agent', async () => {
        const dtoWithoutUserAgent = {
          endpoint: 'https://fcm.googleapis.com/fcm/send/test',
          keys: { p256dh: 'key', auth: 'auth' },
        };
        subscriptionRepository.findOne.mockResolvedValue(null);
        subscriptionRepository.create.mockReturnValue({
          ...mockSubscription,
          user_agent: null,
        } as any);
        subscriptionRepository.save.mockResolvedValue({
          ...mockSubscription,
          user_agent: null,
        } as PushSubscription);

        await service.subscribe('user-uuid', dtoWithoutUserAgent);

        expect(subscriptionRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            user_agent: undefined,
          }),
        );
      });
    });

    // ============================================================================
    // UNSUBSCRIBE TESTS
    // ============================================================================

    describe('unsubscribe', () => {
      it('should soft remove subscription when found', async () => {
        subscriptionRepository.findOne.mockResolvedValue(mockSubscription as PushSubscription);
        subscriptionRepository.softRemove.mockResolvedValue(mockSubscription as PushSubscription);

        await service.unsubscribe('user-uuid', mockSubscription.endpoint);

        expect(subscriptionRepository.findOne).toHaveBeenCalledWith({
          where: { user_id: 'user-uuid', endpoint: mockSubscription.endpoint },
        });
        expect(subscriptionRepository.softRemove).toHaveBeenCalledWith(mockSubscription);
      });

      it('should throw NotFoundException when subscription not found', async () => {
        subscriptionRepository.findOne.mockResolvedValue(null);

        await expect(service.unsubscribe('user-uuid', 'non-existent-endpoint')).rejects.toThrow(
          NotFoundException,
        );
        await expect(service.unsubscribe('user-uuid', 'non-existent-endpoint')).rejects.toThrow(
          'Subscription not found',
        );
      });
    });

    // ============================================================================
    // SEND TO USER TESTS
    // ============================================================================

    describe('sendToUser', () => {
      it('should send notification to all active user subscriptions', async () => {
        subscriptionRepository.find.mockResolvedValue([mockSubscription as PushSubscription]);
        (webpush.sendNotification as jest.Mock).mockResolvedValue({});
        subscriptionRepository.save.mockResolvedValue({
          ...mockSubscription,
          last_sent_at: new Date(),
        } as PushSubscription);

        const result = await service.sendToUser('user-uuid', mockSendNotificationDto);

        expect(subscriptionRepository.find).toHaveBeenCalledWith({
          where: { user_id: 'user-uuid', is_active: true },
        });
        expect(webpush.sendNotification).toHaveBeenCalledWith(
          {
            endpoint: mockSubscription.endpoint,
            keys: {
              p256dh: mockSubscription.p256dh,
              auth: mockSubscription.auth,
            },
          },
          expect.stringContaining(mockSendNotificationDto.title),
        );
        expect(result).toBe(1);
      });

      it('should return 0 when user has no active subscriptions', async () => {
        subscriptionRepository.find.mockResolvedValue([]);

        const result = await service.sendToUser('user-uuid', mockSendNotificationDto);

        expect(webpush.sendNotification).not.toHaveBeenCalled();
        expect(result).toBe(0);
      });

      it('should deactivate subscription on 410 Gone error', async () => {
        subscriptionRepository.find.mockResolvedValue([mockSubscription as PushSubscription]);
        const error = { statusCode: 410 };
        (webpush.sendNotification as jest.Mock).mockRejectedValue(error);
        subscriptionRepository.save.mockResolvedValue({
          ...mockSubscription,
          is_active: false,
        } as PushSubscription);

        const result = await service.sendToUser('user-uuid', mockSendNotificationDto);

        expect(subscriptionRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ is_active: false }),
        );
        expect(result).toBe(0);
      });

      it('should deactivate subscription on 404 Not Found error', async () => {
        subscriptionRepository.find.mockResolvedValue([mockSubscription as PushSubscription]);
        const error = { statusCode: 404 };
        (webpush.sendNotification as jest.Mock).mockRejectedValue(error);

        await service.sendToUser('user-uuid', mockSendNotificationDto);

        expect(subscriptionRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ is_active: false }),
        );
      });

      it('should deactivate subscription on 403 Forbidden error', async () => {
        subscriptionRepository.find.mockResolvedValue([mockSubscription as PushSubscription]);
        const error = { statusCode: 403 };
        (webpush.sendNotification as jest.Mock).mockRejectedValue(error);

        await service.sendToUser('user-uuid', mockSendNotificationDto);

        expect(subscriptionRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ is_active: false }),
        );
      });

      it('should not deactivate subscription on other errors', async () => {
        subscriptionRepository.find.mockResolvedValue([mockSubscription as PushSubscription]);
        const error = { statusCode: 500 };
        (webpush.sendNotification as jest.Mock).mockRejectedValue(error);

        await service.sendToUser('user-uuid', mockSendNotificationDto);

        // save should only be called if statusCode is 410, 404, or 403
        expect(subscriptionRepository.save).not.toHaveBeenCalled();
      });

      it('should send to multiple subscriptions and count successes', async () => {
        const subscriptions = [
          mockSubscription,
          { ...mockSubscription, id: 'sub-2', endpoint: 'https://example.com/sub2' },
          { ...mockSubscription, id: 'sub-3', endpoint: 'https://example.com/sub3' },
        ];
        subscriptionRepository.find.mockResolvedValue(subscriptions as PushSubscription[]);
        (webpush.sendNotification as jest.Mock)
          .mockResolvedValueOnce({})
          .mockRejectedValueOnce({ statusCode: 410 })
          .mockResolvedValueOnce({});
        subscriptionRepository.save.mockResolvedValue({} as PushSubscription);

        const result = await service.sendToUser('user-uuid', mockSendNotificationDto);

        expect(webpush.sendNotification).toHaveBeenCalledTimes(3);
        expect(result).toBe(2); // 2 successful, 1 failed
      });

      it('should update last_sent_at on successful send', async () => {
        subscriptionRepository.find.mockResolvedValue([mockSubscription as PushSubscription]);
        (webpush.sendNotification as jest.Mock).mockResolvedValue({});

        await service.sendToUser('user-uuid', mockSendNotificationDto);

        expect(subscriptionRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            last_sent_at: expect.any(Date),
          }),
        );
      });

      it('should use default icon and url when not provided', async () => {
        subscriptionRepository.find.mockResolvedValue([mockSubscription as PushSubscription]);
        (webpush.sendNotification as jest.Mock).mockResolvedValue({});
        subscriptionRepository.save.mockResolvedValue(mockSubscription as PushSubscription);

        const dtoWithoutOptionals = {
          user_id: 'user-uuid',
          title: 'Test',
          body: 'Body',
        };

        await service.sendToUser('user-uuid', dtoWithoutOptionals);

        const payloadString = (webpush.sendNotification as jest.Mock).mock.calls[0][1];
        const payload = JSON.parse(payloadString);
        expect(payload.icon).toBe('/icon-192x192.png');
        expect(payload.url).toBe('/');
      });
    });

    // ============================================================================
    // SEND TO MULTIPLE USERS TESTS
    // ============================================================================

    describe('sendToMultipleUsers', () => {
      it('should send notifications to multiple users', async () => {
        subscriptionRepository.find.mockResolvedValue([mockSubscription as PushSubscription]);
        (webpush.sendNotification as jest.Mock).mockResolvedValue({});
        subscriptionRepository.save.mockResolvedValue(mockSubscription as PushSubscription);

        const userIds = ['user-1', 'user-2', 'user-3'];
        const result = await service.sendToMultipleUsers(
          userIds,
          'Test Title',
          'Test Body',
          '/test',
          { key: 'value' },
        );

        expect(subscriptionRepository.find).toHaveBeenCalledTimes(3);
        expect(result.sent).toBe(3);
        expect(result.failed).toBe(0);
      });

      it('should count failed sends', async () => {
        subscriptionRepository.find
          .mockResolvedValueOnce([mockSubscription as PushSubscription])
          .mockRejectedValueOnce(new Error('DB error'))
          .mockResolvedValueOnce([mockSubscription as PushSubscription]);
        (webpush.sendNotification as jest.Mock).mockResolvedValue({});
        subscriptionRepository.save.mockResolvedValue(mockSubscription as PushSubscription);

        const userIds = ['user-1', 'user-2', 'user-3'];
        const result = await service.sendToMultipleUsers(userIds, 'Title', 'Body');

        expect(result.sent).toBe(2);
        expect(result.failed).toBe(1);
      });
    });

    // ============================================================================
    // GET USER SUBSCRIPTIONS TESTS
    // ============================================================================

    describe('getUserSubscriptions', () => {
      it('should return active subscriptions for user', async () => {
        const subscriptions = [mockSubscription, { ...mockSubscription, id: 'sub-2' }];
        subscriptionRepository.find.mockResolvedValue(subscriptions as PushSubscription[]);

        const result = await service.getUserSubscriptions('user-uuid');

        expect(subscriptionRepository.find).toHaveBeenCalledWith({
          where: { user_id: 'user-uuid', is_active: true },
          order: { created_at: 'DESC' },
        });
        expect(result).toEqual(subscriptions);
      });

      it('should return empty array when no subscriptions', async () => {
        subscriptionRepository.find.mockResolvedValue([]);

        const result = await service.getUserSubscriptions('user-uuid');

        expect(result).toEqual([]);
      });
    });

    // ============================================================================
    // SEND TEST NOTIFICATION TESTS
    // ============================================================================

    describe('sendTestNotification', () => {
      it('should send test notification with correct content', async () => {
        subscriptionRepository.find.mockResolvedValue([mockSubscription as PushSubscription]);
        (webpush.sendNotification as jest.Mock).mockResolvedValue({});
        subscriptionRepository.save.mockResolvedValue(mockSubscription as PushSubscription);

        const result = await service.sendTestNotification('user-uuid');

        const payloadString = (webpush.sendNotification as jest.Mock).mock.calls[0][1];
        const payload = JSON.parse(payloadString);
        expect(payload.title).toContain('Тестовое уведомление');
        expect(payload.data.test).toBe(true);
        expect(result).toBe(1);
      });
    });

    // ============================================================================
    // CLEANUP INACTIVE SUBSCRIPTIONS TESTS
    // ============================================================================

    describe('cleanupInactiveSubscriptions', () => {
      it('should soft delete inactive subscriptions older than 30 days', async () => {
        const queryBuilder = {
          softDelete: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 5 }),
        };
        subscriptionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

        const result = await service.cleanupInactiveSubscriptions();

        expect(queryBuilder.softDelete).toHaveBeenCalled();
        expect(queryBuilder.where).toHaveBeenCalledWith('is_active = false');
        expect(queryBuilder.andWhere).toHaveBeenCalledWith('updated_at < :date', {
          date: expect.any(Date),
        });
        expect(result).toBe(5);
      });

      it('should return 0 when no subscriptions to cleanup', async () => {
        const queryBuilder = {
          softDelete: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue({ affected: 0 }),
        };
        subscriptionRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

        const result = await service.cleanupInactiveSubscriptions();

        expect(result).toBe(0);
      });
    });

    // ============================================================================
    // GENERATE VAPID KEYS TESTS
    // ============================================================================

    describe('generateVapidKeys', () => {
      it('should call webpush.generateVAPIDKeys', () => {
        const mockKeys = {
          publicKey: 'generated-public-key',
          privateKey: 'generated-private-key',
        };
        (webpush.generateVAPIDKeys as jest.Mock).mockReturnValue(mockKeys);

        const result = WebPushService.generateVapidKeys();

        expect(webpush.generateVAPIDKeys).toHaveBeenCalled();
        expect(result).toEqual(mockKeys);
      });
    });
  });

  // ============================================================================
  // WITHOUT VAPID CONFIGURATION TESTS
  // ============================================================================

  describe('without VAPID configured', () => {
    beforeEach(async () => {
      const mockRepo = createMockRepository();
      const mockConfig = createMockConfigService(false);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          WebPushService,
          {
            provide: getRepositoryToken(PushSubscription),
            useValue: mockRepo,
          },
          {
            provide: ConfigService,
            useValue: mockConfig,
          },
        ],
      }).compile();

      service = module.get<WebPushService>(WebPushService);
      subscriptionRepository = module.get(getRepositoryToken(PushSubscription));
      configService = module.get(ConfigService);

      jest.clearAllMocks();
    });

    it('should not configure web push without VAPID keys', () => {
      // setVapidDetails was called during previous test suite setup, but not in this suite
      // We need to check that isConfigured is false
      expect(service['isConfigured']).toBe(false);
    });

    it('getPublicKey should return empty string when not configured', () => {
      const result = service.getPublicKey();
      expect(result).toBe('');
    });

    it('sendToUser should return 0 and not send when not configured', async () => {
      const result = await service.sendToUser('user-uuid', mockSendNotificationDto);

      expect(subscriptionRepository.find).not.toHaveBeenCalled();
      expect(webpush.sendNotification).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });
  });
});
