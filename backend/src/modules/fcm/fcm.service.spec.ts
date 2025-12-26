import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { FcmService } from './fcm.service';
import { FcmToken } from './entities/fcm-token.entity';
import { DeviceType } from './dto/register-token.dto';

describe('FcmService', () => {
  let service: FcmService;
  let mockTokenRepo: any;
  let mockConfigService: any;

  const mockToken = {
    id: 'token-1',
    user_id: 'user-1',
    token: 'fcm-token-123',
    device_type: DeviceType.ANDROID,
    device_name: 'Pixel 5',
    is_active: true,
    last_used_at: null,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    mockTokenRepo = {
      findOne: jest.fn().mockResolvedValue(mockToken),
      find: jest.fn().mockResolvedValue([mockToken]),
      create: jest.fn().mockReturnValue(mockToken),
      save: jest.fn().mockResolvedValue(mockToken),
      softRemove: jest.fn().mockResolvedValue(mockToken),
      createQueryBuilder: jest.fn().mockReturnValue({
        softDelete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
      }),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue(null),
    };

    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FcmService,
        { provide: getRepositoryToken(FcmToken), useValue: mockTokenRepo },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<FcmService>(FcmService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should call initializeFirebase on module init', async () => {
      await service.onModuleInit();
      // Since no credentials are configured, isConfigured should still be false
      expect(service.isConfigured()).toBe(false);
    });

    it('should handle firebase-admin initialization failure gracefully', async () => {
      // Create a new service with project ID configured to trigger initialization attempt
      const configWithProjectId = {
        get: jest.fn((key: string) => {
          if (key === 'FIREBASE_PROJECT_ID') return 'test-project';
          return null;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FcmService,
          { provide: getRepositoryToken(FcmToken), useValue: mockTokenRepo },
          { provide: ConfigService, useValue: configWithProjectId },
        ],
      }).compile();

      const svc = module.get<FcmService>(FcmService);

      // This will attempt to initialize Firebase, which may fail in test environment
      await svc.onModuleInit();

      // Service should still be defined even if Firebase fails
      expect(svc).toBeDefined();
    });

    it('should skip initialization when no credentials configured', async () => {
      const configWithNothing = {
        get: jest.fn(() => null),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FcmService,
          { provide: getRepositoryToken(FcmToken), useValue: mockTokenRepo },
          { provide: ConfigService, useValue: configWithNothing },
        ],
      }).compile();

      const svc = module.get<FcmService>(FcmService);
      await svc.onModuleInit();

      expect(svc.isConfigured()).toBe(false);
    });
  });

  describe('isConfigured', () => {
    it('should return false when not initialized', () => {
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('registerToken', () => {
    it('should update existing token', async () => {
      const dto = { token: 'fcm-token-123', device_type: DeviceType.ANDROID };
      const result = await service.registerToken('user-1', dto);

      expect(mockTokenRepo.findOne).toHaveBeenCalledWith({ where: { token: dto.token } });
      expect(mockTokenRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should create new token if not exists', async () => {
      mockTokenRepo.findOne.mockResolvedValueOnce(null);
      const dto = { token: 'new-token', device_type: DeviceType.IOS };

      const result = await service.registerToken('user-1', dto);

      expect(mockTokenRepo.create).toHaveBeenCalledWith({
        user_id: 'user-1',
        token: 'new-token',
        device_type: DeviceType.IOS,
        device_name: undefined,
        is_active: true,
      });
      expect(result).toBeDefined();
    });

    it('should update device_type on existing token', async () => {
      const existingToken = { ...mockToken, device_type: DeviceType.ANDROID };
      mockTokenRepo.findOne.mockResolvedValueOnce(existingToken);

      await service.registerToken('user-1', { token: 'fcm-token-123', device_type: DeviceType.IOS });

      expect(existingToken.device_type).toBe(DeviceType.IOS);
    });

    it('should update device_name on existing token', async () => {
      const existingToken = { ...mockToken, device_name: 'Old Name' };
      mockTokenRepo.findOne.mockResolvedValueOnce(existingToken);

      await service.registerToken('user-1', { token: 'fcm-token-123', device_name: 'New Name' });

      expect(existingToken.device_name).toBe('New Name');
    });

    it('should keep existing device_type if not provided in dto', async () => {
      const existingToken = { ...mockToken, device_type: DeviceType.WEB };
      mockTokenRepo.findOne.mockResolvedValueOnce(existingToken);

      await service.registerToken('user-1', { token: 'fcm-token-123' });

      expect(existingToken.device_type).toBe(DeviceType.WEB);
    });

    it('should set is_active to true when updating', async () => {
      const inactiveToken = { ...mockToken, is_active: false };
      mockTokenRepo.findOne.mockResolvedValueOnce(inactiveToken);

      await service.registerToken('user-1', { token: 'fcm-token-123' });

      expect(inactiveToken.is_active).toBe(true);
    });
  });

  describe('unregisterToken', () => {
    it('should unregister token', async () => {
      await service.unregisterToken('user-1', 'fcm-token-123');

      expect(mockTokenRepo.findOne).toHaveBeenCalledWith({
        where: { user_id: 'user-1', token: 'fcm-token-123' },
      });
      expect(mockTokenRepo.softRemove).toHaveBeenCalledWith(mockToken);
    });

    it('should not throw if token not found', async () => {
      mockTokenRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.unregisterToken('user-1', 'non-existent')).resolves.not.toThrow();
      expect(mockTokenRepo.softRemove).not.toHaveBeenCalled();
    });
  });

  describe('sendToUser', () => {
    it('should return 0 when not configured', async () => {
      const result = await service.sendToUser({
        user_id: 'user-1',
        title: 'Test',
        body: 'Body',
      });
      expect(result).toBe(0);
    });

    it('should return 0 when no tokens found', async () => {
      mockTokenRepo.find.mockResolvedValueOnce([]);

      // Force isConfigured to return true by directly setting
      (service as any).isInitialized = true;
      (service as any).messaging = { send: jest.fn() };

      const result = await service.sendToUser({
        user_id: 'user-1',
        title: 'Test',
        body: 'Body',
      });

      expect(result).toBe(0);
    });

    it('should send notification and update last_used_at', async () => {
      const mockMessaging = { send: jest.fn().mockResolvedValue('message-id') };
      (service as any).isInitialized = true;
      (service as any).messaging = mockMessaging;

      const result = await service.sendToUser({
        user_id: 'user-1',
        title: 'Test Title',
        body: 'Test Body',
        url: 'https://example.com',
        data: { key: 'value' },
      });

      expect(mockMessaging.send).toHaveBeenCalled();
      expect(mockTokenRepo.save).toHaveBeenCalled();
      expect(result).toBe(1);
    });

    it('should deactivate token on invalid-registration-token error', async () => {
      const mockMessaging = {
        send: jest.fn().mockRejectedValue({ code: 'messaging/invalid-registration-token', message: 'Invalid token' }),
      };
      (service as any).isInitialized = true;
      (service as any).messaging = mockMessaging;

      const tokenToDeactivate = { ...mockToken, is_active: true };
      mockTokenRepo.find.mockResolvedValueOnce([tokenToDeactivate]);

      const result = await service.sendToUser({
        user_id: 'user-1',
        title: 'Test',
        body: 'Body',
      });

      expect(tokenToDeactivate.is_active).toBe(false);
      expect(mockTokenRepo.save).toHaveBeenCalled();
      expect(result).toBe(0);
    });

    it('should deactivate token on registration-token-not-registered error', async () => {
      const mockMessaging = {
        send: jest.fn().mockRejectedValue({ code: 'messaging/registration-token-not-registered', message: 'Not registered' }),
      };
      (service as any).isInitialized = true;
      (service as any).messaging = mockMessaging;

      const tokenToDeactivate = { ...mockToken, is_active: true };
      mockTokenRepo.find.mockResolvedValueOnce([tokenToDeactivate]);

      await service.sendToUser({ user_id: 'user-1', title: 'Test', body: 'Body' });

      expect(tokenToDeactivate.is_active).toBe(false);
    });

    it('should not deactivate token on other errors', async () => {
      const mockMessaging = {
        send: jest.fn().mockRejectedValue({ code: 'messaging/server-error', message: 'Server error' }),
      };
      (service as any).isInitialized = true;
      (service as any).messaging = mockMessaging;

      const token = { ...mockToken, is_active: true };
      mockTokenRepo.find.mockResolvedValueOnce([token]);

      await service.sendToUser({ user_id: 'user-1', title: 'Test', body: 'Body' });

      expect(token.is_active).toBe(true);
    });

    it('should handle undefined url in data', async () => {
      const mockMessaging = { send: jest.fn().mockResolvedValue('message-id') };
      (service as any).isInitialized = true;
      (service as any).messaging = mockMessaging;

      await service.sendToUser({
        user_id: 'user-1',
        title: 'Test',
        body: 'Body',
        // No url provided
      });

      expect(mockMessaging.send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ url: '' }),
        }),
      );
    });

    it('should send to multiple tokens for same user', async () => {
      const mockMessaging = { send: jest.fn().mockResolvedValue('message-id') };
      (service as any).isInitialized = true;
      (service as any).messaging = mockMessaging;

      const tokens = [
        { ...mockToken, token: 'token-1' },
        { ...mockToken, token: 'token-2' },
        { ...mockToken, token: 'token-3' },
      ];
      mockTokenRepo.find.mockResolvedValueOnce(tokens);

      const result = await service.sendToUser({
        user_id: 'user-1',
        title: 'Test',
        body: 'Body',
      });

      expect(mockMessaging.send).toHaveBeenCalledTimes(3);
      expect(result).toBe(3);
    });
  });

  describe('sendToMultipleUsers', () => {
    it('should send to multiple users', async () => {
      const result = await service.sendToMultipleUsers(['user-1', 'user-2'], 'Test', 'Body');
      expect(result).toEqual({ sent: 0, failed: 0 });
    });

    it('should count sent notifications', async () => {
      const mockMessaging = { send: jest.fn().mockResolvedValue('message-id') };
      (service as any).isInitialized = true;
      (service as any).messaging = mockMessaging;

      const result = await service.sendToMultipleUsers(['user-1', 'user-2'], 'Test', 'Body');

      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should handle send errors gracefully (errors caught in sendToUser)', async () => {
      const mockMessaging = { send: jest.fn().mockRejectedValue(new Error('Failed')) };
      (service as any).isInitialized = true;
      (service as any).messaging = mockMessaging;

      const result = await service.sendToMultipleUsers(['user-1'], 'Test', 'Body');

      // sendToUser catches errors internally and returns 0, so failed stays 0
      expect(result.sent).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should pass url and data to sendToUser', async () => {
      const mockMessaging = { send: jest.fn().mockResolvedValue('message-id') };
      (service as any).isInitialized = true;
      (service as any).messaging = mockMessaging;

      await service.sendToMultipleUsers(
        ['user-1'],
        'Test',
        'Body',
        'https://example.com',
        { key: 'value' },
      );

      expect(mockMessaging.send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ key: 'value', url: 'https://example.com' }),
        }),
      );
    });

    it('should count failed when sendToUser throws', async () => {
      // Mock sendToUser to actually throw (simulates unexpected error)
      jest.spyOn(service, 'sendToUser').mockRejectedValue(new Error('Unexpected failure'));

      const result = await service.sendToMultipleUsers(['user-1', 'user-2'], 'Test', 'Body');

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(2);
    });

    it('should handle mixed success and failure', async () => {
      jest
        .spyOn(service, 'sendToUser')
        .mockResolvedValueOnce(1) // First user succeeds
        .mockRejectedValueOnce(new Error('Failed')) // Second user fails
        .mockResolvedValueOnce(2); // Third user succeeds

      const result = await service.sendToMultipleUsers(
        ['user-1', 'user-2', 'user-3'],
        'Test',
        'Body',
      );

      expect(result.sent).toBe(3);
      expect(result.failed).toBe(1);
    });
  });

  describe('subscribeToTopic', () => {
    it('should return without error when not configured', async () => {
      await expect(service.subscribeToTopic('user-1', 'topic')).resolves.not.toThrow();
    });

    it('should return early if no tokens found', async () => {
      (service as any).isInitialized = true;
      (service as any).messaging = { subscribeToTopic: jest.fn() };
      mockTokenRepo.find.mockResolvedValueOnce([]);

      await service.subscribeToTopic('user-1', 'topic');

      expect((service as any).messaging.subscribeToTopic).not.toHaveBeenCalled();
    });

    it('should subscribe tokens to topic', async () => {
      const mockMessaging = { subscribeToTopic: jest.fn().mockResolvedValue({ successCount: 1 }) };
      (service as any).isInitialized = true;
      (service as any).messaging = mockMessaging;

      await service.subscribeToTopic('user-1', 'my-topic');

      expect(mockMessaging.subscribeToTopic).toHaveBeenCalledWith(['fcm-token-123'], 'my-topic');
    });

    it('should handle subscribe error', async () => {
      const mockMessaging = { subscribeToTopic: jest.fn().mockRejectedValue(new Error('Subscribe failed')) };
      (service as any).isInitialized = true;
      (service as any).messaging = mockMessaging;

      await expect(service.subscribeToTopic('user-1', 'topic')).resolves.not.toThrow();
    });
  });

  describe('unsubscribeFromTopic', () => {
    it('should return without error when not configured', async () => {
      await expect(service.unsubscribeFromTopic('user-1', 'topic')).resolves.not.toThrow();
    });

    it('should return early if no tokens found', async () => {
      (service as any).isInitialized = true;
      (service as any).messaging = { unsubscribeFromTopic: jest.fn() };
      mockTokenRepo.find.mockResolvedValueOnce([]);

      await service.unsubscribeFromTopic('user-1', 'topic');

      expect((service as any).messaging.unsubscribeFromTopic).not.toHaveBeenCalled();
    });

    it('should unsubscribe tokens from topic', async () => {
      const mockMessaging = { unsubscribeFromTopic: jest.fn().mockResolvedValue({ successCount: 1 }) };
      (service as any).isInitialized = true;
      (service as any).messaging = mockMessaging;

      await service.unsubscribeFromTopic('user-1', 'my-topic');

      expect(mockMessaging.unsubscribeFromTopic).toHaveBeenCalledWith(['fcm-token-123'], 'my-topic');
    });

    it('should handle unsubscribe error', async () => {
      const mockMessaging = { unsubscribeFromTopic: jest.fn().mockRejectedValue(new Error('Unsubscribe failed')) };
      (service as any).isInitialized = true;
      (service as any).messaging = mockMessaging;

      await expect(service.unsubscribeFromTopic('user-1', 'topic')).resolves.not.toThrow();
    });
  });

  describe('sendToTopic', () => {
    it('should return false when not configured', async () => {
      const result = await service.sendToTopic('topic', 'Test', 'Body');
      expect(result).toBe(false);
    });

    it('should send notification to topic', async () => {
      const mockMessaging = { send: jest.fn().mockResolvedValue('message-id') };
      (service as any).isInitialized = true;
      (service as any).messaging = mockMessaging;

      const result = await service.sendToTopic('my-topic', 'Title', 'Body', { key: 'value' });

      expect(mockMessaging.send).toHaveBeenCalledWith({
        topic: 'my-topic',
        notification: { title: 'Title', body: 'Body' },
        data: { key: 'value' },
      });
      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      const mockMessaging = { send: jest.fn().mockRejectedValue(new Error('Failed')) };
      (service as any).isInitialized = true;
      (service as any).messaging = mockMessaging;

      const result = await service.sendToTopic('topic', 'Title', 'Body');

      expect(result).toBe(false);
    });

    it('should handle undefined data', async () => {
      const mockMessaging = { send: jest.fn().mockResolvedValue('message-id') };
      (service as any).isInitialized = true;
      (service as any).messaging = mockMessaging;

      await service.sendToTopic('topic', 'Title', 'Body');

      expect(mockMessaging.send).toHaveBeenCalledWith({
        topic: 'topic',
        notification: { title: 'Title', body: 'Body' },
        data: undefined,
      });
    });
  });

  describe('getUserTokens', () => {
    it('should return user tokens', async () => {
      const result = await service.getUserTokens('user-1');

      expect(mockTokenRepo.find).toHaveBeenCalledWith({
        where: { user_id: 'user-1', is_active: true },
        order: { created_at: 'DESC' },
      });
      expect(result).toEqual([mockToken]);
    });

    it('should return empty array if no tokens', async () => {
      mockTokenRepo.find.mockResolvedValueOnce([]);

      const result = await service.getUserTokens('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('cleanupInactiveTokens', () => {
    it('should cleanup inactive tokens', async () => {
      const result = await service.cleanupInactiveTokens();

      expect(mockTokenRepo.createQueryBuilder).toHaveBeenCalled();
      expect(result).toBe(5);
    });

    it('should return 0 when no tokens cleaned', async () => {
      mockTokenRepo.createQueryBuilder.mockReturnValueOnce({
        softDelete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      });

      const result = await service.cleanupInactiveTokens();

      expect(result).toBe(0);
    });

    it('should return 0 when affected is undefined', async () => {
      mockTokenRepo.createQueryBuilder.mockReturnValueOnce({
        softDelete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      });

      const result = await service.cleanupInactiveTokens();

      expect(result).toBe(0);
    });
  });
});
