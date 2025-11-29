import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TokenBlacklistService } from './token-blacklist.service';

// Mock ioredis
const mockRedis = {
  setex: jest.fn(),
  get: jest.fn(),
  exists: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  pipeline: jest.fn(),
  on: jest.fn(),
  quit: jest.fn(),
};

// Mock ioredis as default export class
jest.mock('ioredis', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => mockRedis),
  };
});

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService;
  let configService: ConfigService;

  const mockJti = 'jwt-id-123';
  const mockUserId = 'user-456';
  const defaultTTL = 7 * 24 * 60 * 60; // 7 days in seconds

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    mockRedis.setex.mockReset();
    mockRedis.get.mockReset();
    mockRedis.exists.mockReset();
    mockRedis.del.mockReset();
    mockRedis.keys.mockReset();
    mockRedis.pipeline.mockReset();
    mockRedis.on.mockReset();
    mockRedis.quit.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenBlacklistService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                REDIS_HOST: 'localhost',
                REDIS_PORT: 6379,
                REDIS_PASSWORD: undefined,
                JWT_REFRESH_EXPIRATION_SECONDS: defaultTTL,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TokenBlacklistService>(TokenBlacklistService);
    configService = module.get<ConfigService>(ConfigService);

    // Initialize Redis connection
    await service.onModuleInit();
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  describe('blacklistToken', () => {
    it('should add token to blacklist with default TTL', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      await service.blacklistToken(mockJti, mockUserId);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        `vendhub:blacklist:token:${mockJti}`,
        defaultTTL,
        expect.any(String),
      );
    });

    it('should add token to blacklist with custom TTL', async () => {
      const customTTL = 3600; // 1 hour
      mockRedis.setex.mockResolvedValue('OK');

      await service.blacklistToken(mockJti, mockUserId, customTTL);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        `vendhub:blacklist:token:${mockJti}`,
        customTTL,
        expect.any(String),
      );
    });

    it('should include reason in blacklist entry', async () => {
      const reason = 'logout';
      mockRedis.setex.mockResolvedValue('OK');

      await service.blacklistToken(mockJti, mockUserId, undefined, reason);

      const setexCall = mockRedis.setex.mock.calls[0];
      const storedValue = JSON.parse(setexCall[2]);
      expect(storedValue.reason).toBe(reason);
    });

    it('should use default reason when not provided', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      await service.blacklistToken(mockJti, mockUserId);

      const setexCall = mockRedis.setex.mock.calls[0];
      const storedValue = JSON.parse(setexCall[2]);
      expect(storedValue.reason).toBe('revoked');
    });

    it('should store userId in blacklist entry', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      await service.blacklistToken(mockJti, mockUserId);

      const setexCall = mockRedis.setex.mock.calls[0];
      const storedValue = JSON.parse(setexCall[2]);
      expect(storedValue.userId).toBe(mockUserId);
    });

    it('should include timestamp in blacklist entry', async () => {
      mockRedis.setex.mockResolvedValue('OK');
      const beforeCall = new Date().toISOString();

      await service.blacklistToken(mockJti, mockUserId);

      const setexCall = mockRedis.setex.mock.calls[0];
      const storedValue = JSON.parse(setexCall[2]);
      expect(storedValue.revokedAt).toBeDefined();
      expect(new Date(storedValue.revokedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeCall).getTime() - 1000,
      );
    });
  });

  describe('isBlacklisted', () => {
    it('should return true when token is blacklisted', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const result = await service.isBlacklisted(mockJti);

      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith(`vendhub:blacklist:token:${mockJti}`);
    });

    it('should return false when token is not blacklisted', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const result = await service.isBlacklisted(mockJti);

      expect(result).toBe(false);
    });
  });

  describe('getBlacklistInfo', () => {
    it('should return blacklist info when token is blacklisted', async () => {
      const blacklistInfo = {
        userId: mockUserId,
        reason: 'logout',
        revokedAt: new Date().toISOString(),
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(blacklistInfo));

      const result = await service.getBlacklistInfo(mockJti);

      expect(result).toEqual(blacklistInfo);
    });

    it('should return null when token is not blacklisted', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.getBlacklistInfo(mockJti);

      expect(result).toBeNull();
    });

    it('should return null when stored value is invalid JSON', async () => {
      mockRedis.get.mockResolvedValue('invalid-json');

      const result = await service.getBlacklistInfo(mockJti);

      expect(result).toBeNull();
    });
  });

  describe('blacklistUserTokens', () => {
    it('should blacklist all tokens for user', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      await service.blacklistUserTokens(mockUserId, 'password_change');

      expect(mockRedis.setex).toHaveBeenCalledWith(
        `vendhub:blacklist:user:${mockUserId}`,
        defaultTTL,
        expect.any(String),
      );
    });

    it('should include reason in user blacklist entry', async () => {
      const reason = 'security_breach';
      mockRedis.setex.mockResolvedValue('OK');

      await service.blacklistUserTokens(mockUserId, reason);

      const setexCall = mockRedis.setex.mock.calls[0];
      const storedValue = JSON.parse(setexCall[2]);
      expect(storedValue.reason).toBe(reason);
    });

    it('should use default reason when not provided', async () => {
      mockRedis.setex.mockResolvedValue('OK');

      await service.blacklistUserTokens(mockUserId);

      const setexCall = mockRedis.setex.mock.calls[0];
      const storedValue = JSON.parse(setexCall[2]);
      expect(storedValue.reason).toBe('all_tokens_revoked');
    });
  });

  describe('areUserTokensBlacklisted', () => {
    it('should return true when user tokens are blacklisted', async () => {
      mockRedis.exists.mockResolvedValue(1);

      const result = await service.areUserTokensBlacklisted(mockUserId);

      expect(result).toBe(true);
      expect(mockRedis.exists).toHaveBeenCalledWith(`vendhub:blacklist:user:${mockUserId}`);
    });

    it('should return false when user tokens are not blacklisted', async () => {
      mockRedis.exists.mockResolvedValue(0);

      const result = await service.areUserTokensBlacklisted(mockUserId);

      expect(result).toBe(false);
    });
  });

  describe('removeUserBlacklist', () => {
    it('should remove user from blacklist', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.removeUserBlacklist(mockUserId);

      expect(mockRedis.del).toHaveBeenCalledWith(`vendhub:blacklist:user:${mockUserId}`);
    });
  });

  describe('shouldRejectToken', () => {
    let mockPipeline: any;

    beforeEach(() => {
      mockPipeline = {
        exists: jest.fn().mockReturnThis(),
        exec: jest.fn(),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline);
    });

    it('should return true when specific token is blacklisted', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, 1], // token blacklisted
        [null, 0], // user not blacklisted
      ]);

      const result = await service.shouldRejectToken(mockJti, mockUserId);

      expect(result).toBe(true);
    });

    it('should return true when user tokens are blacklisted', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, 0], // token not blacklisted
        [null, 1], // user blacklisted
      ]);

      const result = await service.shouldRejectToken(mockJti, mockUserId);

      expect(result).toBe(true);
    });

    it('should return true when both token and user are blacklisted', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, 1], // token blacklisted
        [null, 1], // user blacklisted
      ]);

      const result = await service.shouldRejectToken(mockJti, mockUserId);

      expect(result).toBe(true);
    });

    it('should return false when neither token nor user is blacklisted', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, 0], // token not blacklisted
        [null, 0], // user not blacklisted
      ]);

      const result = await service.shouldRejectToken(mockJti, mockUserId);

      expect(result).toBe(false);
    });

    it('should use pipeline for efficient multi-check', async () => {
      mockPipeline.exec.mockResolvedValue([
        [null, 0],
        [null, 0],
      ]);

      await service.shouldRejectToken(mockJti, mockUserId);

      expect(mockRedis.pipeline).toHaveBeenCalled();
      expect(mockPipeline.exists).toHaveBeenCalledTimes(2);
      expect(mockPipeline.exec).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return count of blacklisted tokens and users', async () => {
      mockRedis.keys.mockImplementation((pattern: string) => {
        if (pattern.includes('token:')) {
          return Promise.resolve(['key1', 'key2', 'key3']);
        }
        if (pattern.includes('user:')) {
          return Promise.resolve(['user1', 'user2']);
        }
        return Promise.resolve([]);
      });

      const result = await service.getStats();

      expect(result).toEqual({
        tokenCount: 3,
        userCount: 2,
      });
    });

    it('should return zero counts when no blacklisted items', async () => {
      mockRedis.keys.mockResolvedValue([]);

      const result = await service.getStats();

      expect(result).toEqual({
        tokenCount: 0,
        userCount: 0,
      });
    });
  });

  describe('lifecycle hooks', () => {
    it('should setup Redis event handlers on module init', async () => {
      expect(mockRedis.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should quit Redis connection on module destroy', async () => {
      mockRedis.quit.mockResolvedValue('OK');

      await service.onModuleDestroy();

      expect(mockRedis.quit).toHaveBeenCalled();
    });

    it('should handle connect event callback', async () => {
      // Find the connect event callback
      const connectCall = mockRedis.on.mock.calls.find((call: any[]) => call[0] === 'connect');
      expect(connectCall).toBeDefined();
      // Invoke the callback - should not throw
      expect(() => connectCall[1]()).not.toThrow();
    });

    it('should handle error event callback', async () => {
      // Find the error event callback
      const errorCall = mockRedis.on.mock.calls.find((call: any[]) => call[0] === 'error');
      expect(errorCall).toBeDefined();
      // Invoke the callback with an error - should not throw
      expect(() => errorCall[1](new Error('Redis connection error'))).not.toThrow();
    });

    it('should not throw when redis is not initialized on destroy', async () => {
      // Access private redis property and set to undefined
      (service as any).redis = undefined;

      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe('Redis retry strategy', () => {
    it('should return increasing delay for retries less than 3', async () => {
      const Redis = require('ioredis').default;
      const lastCall = Redis.mock.calls[Redis.mock.calls.length - 1];
      const retryStrategy = lastCall[0].retryStrategy;

      expect(retryStrategy(1)).toBe(200);
      expect(retryStrategy(2)).toBe(400);
      expect(retryStrategy(3)).toBe(600);
    });

    it('should return null after 3 retries', async () => {
      const Redis = require('ioredis').default;
      const lastCall = Redis.mock.calls[Redis.mock.calls.length - 1];
      const retryStrategy = lastCall[0].retryStrategy;

      expect(retryStrategy(4)).toBeNull();
      expect(retryStrategy(5)).toBeNull();
    });

    it('should cap delay at 1000ms', async () => {
      const Redis = require('ioredis').default;
      const lastCall = Redis.mock.calls[Redis.mock.calls.length - 1];
      const retryStrategy = lastCall[0].retryStrategy;

      // For times=3, Math.min(3*200, 1000) = 600
      // For times=5 (if it reached), Math.min(5*200, 1000) = 1000
      expect(retryStrategy(3)).toBeLessThanOrEqual(1000);
    });
  });

  describe('shouldRejectToken - edge cases', () => {
    it('should handle undefined results from pipeline', async () => {
      const mockPipeline = {
        exists: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(undefined),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline);

      const result = await service.shouldRejectToken(mockJti, mockUserId);

      // With undefined results, should not crash and should return false
      expect(result).toBe(false);
    });

    it('should handle null values in pipeline results', async () => {
      const mockPipeline = {
        exists: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([null, null]),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline);

      const result = await service.shouldRejectToken(mockJti, mockUserId);

      expect(result).toBe(false);
    });

    it('should handle partial pipeline results', async () => {
      const mockPipeline = {
        exists: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 0], // only first result
        ]),
      };
      mockRedis.pipeline.mockReturnValue(mockPipeline);

      const result = await service.shouldRejectToken(mockJti, mockUserId);

      expect(result).toBe(false);
    });
  });
});
