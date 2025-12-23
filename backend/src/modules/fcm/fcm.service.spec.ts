import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { FcmService } from './fcm.service';
import { FcmToken } from './entities/fcm-token.entity';
import { DeviceType } from './dto/register-token.dto';

describe('FcmService', () => {
  let service: FcmService;
  const mockToken = { id: 'token-1', user_id: 'user-1', token: 'fcm-token-123', device_type: 'android', is_active: true };
  const mockTokenRepo = {
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
  const mockConfigService = {
    get: jest.fn().mockReturnValue(null),
  };

  beforeEach(async () => {
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

  it('should be defined', () => expect(service).toBeDefined());

  describe('isConfigured', () => {
    it('should return false when not initialized', () => {
      expect(service.isConfigured()).toBe(false);
    });
  });

  describe('registerToken', () => {
    it('should update existing token', async () => {
      const result = await service.registerToken('user-1', { token: 'fcm-token-123', device_type: DeviceType.ANDROID });
      expect(result).toBeDefined();
      expect(mockTokenRepo.save).toHaveBeenCalled();
    });

    it('should create new token if not exists', async () => {
      mockTokenRepo.findOne.mockResolvedValueOnce(null);
      const result = await service.registerToken('user-1', { token: 'new-token', device_type: DeviceType.IOS });
      expect(mockTokenRepo.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('unregisterToken', () => {
    it('should unregister token', async () => {
      await service.unregisterToken('user-1', 'fcm-token-123');
      expect(mockTokenRepo.softRemove).toHaveBeenCalled();
    });

    it('should not throw if token not found', async () => {
      mockTokenRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.unregisterToken('user-1', 'x')).resolves.not.toThrow();
    });
  });

  describe('sendToUser', () => {
    it('should return 0 when not configured', async () => {
      const result = await service.sendToUser({ user_id: 'user-1', title: 'Test', body: 'Body' });
      expect(result).toBe(0);
    });
  });

  describe('sendToMultipleUsers', () => {
    it('should send to multiple users', async () => {
      const result = await service.sendToMultipleUsers(['user-1', 'user-2'], 'Test', 'Body');
      expect(result).toEqual({ sent: 0, failed: 0 });
    });
  });

  describe('subscribeToTopic', () => {
    it('should return without error when not configured', async () => {
      await expect(service.subscribeToTopic('user-1', 'topic')).resolves.not.toThrow();
    });
  });

  describe('unsubscribeFromTopic', () => {
    it('should return without error when not configured', async () => {
      await expect(service.unsubscribeFromTopic('user-1', 'topic')).resolves.not.toThrow();
    });
  });

  describe('sendToTopic', () => {
    it('should return false when not configured', async () => {
      const result = await service.sendToTopic('topic', 'Test', 'Body');
      expect(result).toBe(false);
    });
  });

  describe('getUserTokens', () => {
    it('should return user tokens', async () => {
      const result = await service.getUserTokens('user-1');
      expect(result).toEqual([mockToken]);
    });
  });

  describe('cleanupInactiveTokens', () => {
    it('should cleanup inactive tokens', async () => {
      const result = await service.cleanupInactiveTokens();
      expect(result).toBe(5);
    });
  });
});
