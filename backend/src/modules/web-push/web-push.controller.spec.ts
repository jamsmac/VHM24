import { Test, TestingModule } from '@nestjs/testing';
import { WebPushController } from './web-push.controller';
import { WebPushService } from './web-push.service';
import { PushSubscription } from './entities/push-subscription.entity';
import { SubscribePushDto, SendPushNotificationDto } from './dto/push-subscription.dto';

type MockAuthRequest = Parameters<typeof WebPushController.prototype.subscribe>[1];

describe('WebPushController', () => {
  let controller: WebPushController;
  let mockWebPushService: jest.Mocked<WebPushService>;

  const mockUser = { id: 'user-123', username: 'testuser' };
  const mockRequest = { user: mockUser } as unknown as MockAuthRequest;

  beforeEach(async () => {
    mockWebPushService = {
      getPublicKey: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      getUserSubscriptions: jest.fn(),
      sendToUser: jest.fn(),
      sendTestNotification: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebPushController],
      providers: [
        {
          provide: WebPushService,
          useValue: mockWebPushService,
        },
      ],
    }).compile();

    controller = module.get<WebPushController>(WebPushController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPublicKey', () => {
    it('should return VAPID public key', () => {
      const publicKey = 'BNHxWqdHSUJFqSFgY1z0gZCfyVUgpvDmCZE8aN9c2vk';
      mockWebPushService.getPublicKey.mockReturnValue(publicKey);

      const result = controller.getPublicKey();

      expect(result).toEqual({ publicKey });
      expect(mockWebPushService.getPublicKey).toHaveBeenCalled();
    });
  });

  describe('subscribe', () => {
    it('should create a new push subscription', async () => {
      const dto: SubscribePushDto = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
        keys: {
          p256dh: 'test-p256dh',
          auth: 'test-auth',
        },
        user_agent: 'Chrome Browser',
      };
      const expectedSubscription: Partial<PushSubscription> = {
        id: 'sub-123',
        user_id: mockUser.id,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        is_active: true,
      };

      mockWebPushService.subscribe.mockResolvedValue(expectedSubscription as PushSubscription);

      const result = await controller.subscribe(dto, mockRequest);

      expect(result).toEqual(expectedSubscription);
      expect(mockWebPushService.subscribe).toHaveBeenCalledWith(mockUser.id, dto);
    });
  });

  describe('unsubscribe', () => {
    it('should unsubscribe from push notifications', async () => {
      const endpoint = 'https://fcm.googleapis.com/fcm/send/test-endpoint';
      const encodedEndpoint = Buffer.from(endpoint).toString('base64');

      mockWebPushService.unsubscribe.mockResolvedValue(undefined);

      await controller.unsubscribe(encodedEndpoint, mockRequest);

      expect(mockWebPushService.unsubscribe).toHaveBeenCalledWith(mockUser.id, endpoint);
    });

    it('should correctly decode base64 endpoint', async () => {
      const endpoint = 'https://push.example.com/send/abc123';
      const encodedEndpoint = Buffer.from(endpoint).toString('base64');

      mockWebPushService.unsubscribe.mockResolvedValue(undefined);

      await controller.unsubscribe(encodedEndpoint, mockRequest);

      expect(mockWebPushService.unsubscribe).toHaveBeenCalledWith(mockUser.id, endpoint);
    });
  });

  describe('getSubscriptions', () => {
    it('should return user push subscriptions', async () => {
      const expectedSubscriptions: Partial<PushSubscription>[] = [
        {
          id: 'sub-1',
          user_id: mockUser.id,
          endpoint: 'https://push.example.com/1',
          is_active: true,
        },
        {
          id: 'sub-2',
          user_id: mockUser.id,
          endpoint: 'https://push.example.com/2',
          is_active: true,
        },
      ];

      mockWebPushService.getUserSubscriptions.mockResolvedValue(
        expectedSubscriptions as PushSubscription[],
      );

      const result = await controller.getSubscriptions(mockRequest);

      expect(result).toEqual(expectedSubscriptions);
      expect(mockWebPushService.getUserSubscriptions).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return empty array when no subscriptions exist', async () => {
      mockWebPushService.getUserSubscriptions.mockResolvedValue([]);

      const result = await controller.getSubscriptions(mockRequest);

      expect(result).toEqual([]);
      expect(mockWebPushService.getUserSubscriptions).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('sendNotification', () => {
    it('should send push notification to user', async () => {
      const dto: SendPushNotificationDto = {
        user_id: 'target-user-123',
        title: 'Test Notification',
        body: 'This is a test message',
        url: '/tasks',
      };
      const sentCount = 2;

      mockWebPushService.sendToUser.mockResolvedValue(sentCount);

      const result = await controller.sendNotification(dto);

      expect(result).toEqual({ sent: sentCount });
      expect(mockWebPushService.sendToUser).toHaveBeenCalledWith(dto.user_id, dto);
    });

    it('should return zero when no subscriptions found for user', async () => {
      const dto: SendPushNotificationDto = {
        user_id: 'non-existent-user',
        title: 'Test',
        body: 'Test message',
      };

      mockWebPushService.sendToUser.mockResolvedValue(0);

      const result = await controller.sendNotification(dto);

      expect(result).toEqual({ sent: 0 });
    });
  });

  describe('sendTestNotification', () => {
    it('should send test notification to current user', async () => {
      const sentCount = 1;

      mockWebPushService.sendTestNotification.mockResolvedValue(sentCount);

      const result = await controller.sendTestNotification(mockRequest);

      expect(result).toEqual({ sent: sentCount });
      expect(mockWebPushService.sendTestNotification).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return zero when user has no active subscriptions', async () => {
      mockWebPushService.sendTestNotification.mockResolvedValue(0);

      const result = await controller.sendTestNotification(mockRequest);

      expect(result).toEqual({ sent: 0 });
      expect(mockWebPushService.sendTestNotification).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
