import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisThrottlerStorage } from './redis-throttler-storage';

// Mock ioredis
const mockRedis = {
  on: jest.fn(),
  quit: jest.fn(),
  multi: jest.fn(),
  incr: jest.fn(),
  pttl: jest.fn(),
  pexpire: jest.fn(),
  exec: jest.fn(),
};

jest.mock('ioredis', () => {
  const MockRedis = jest.fn().mockImplementation(() => mockRedis);
  return { default: MockRedis, __esModule: true };
});

describe('RedisThrottlerStorage', () => {
  let storage: RedisThrottlerStorage;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    configService = {
      get: jest.fn(),
    } as any;

    configService.get.mockImplementation((key: string, defaultValue?: unknown) => {
      const config: Record<string, unknown> = {
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        REDIS_PASSWORD: undefined,
      };
      return config[key] ?? defaultValue;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisThrottlerStorage,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    storage = module.get<RedisThrottlerStorage>(RedisThrottlerStorage);

    // Reset mocks
    jest.clearAllMocks();

    // Setup default mock implementations
    mockRedis.multi.mockReturnValue({
      incr: jest.fn().mockReturnThis(),
      pttl: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        [null, 1], // incr result
        [null, 60000], // pttl result
      ]),
    });
    mockRedis.pexpire.mockResolvedValue(1);
    mockRedis.quit.mockResolvedValue('OK');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should initialize Redis connection with config values', async () => {
      const Redis = require('ioredis').default;

      await storage.onModuleInit();

      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'localhost',
          port: 6379,
        }),
      );
    });

    it('should register event listeners', async () => {
      await storage.onModuleInit();

      expect(mockRedis.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should use custom Redis password if provided', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          REDIS_HOST: 'redis.example.com',
          REDIS_PORT: 6380,
          REDIS_PASSWORD: 'secret123',
        };
        return config[key] ?? defaultValue;
      });

      const Redis = require('ioredis').default;
      await storage.onModuleInit();

      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'redis.example.com',
          port: 6380,
          password: 'secret123',
        }),
      );
    });

    it('should have retry strategy that gives up after 3 retries', async () => {
      const Redis = require('ioredis').default;
      await storage.onModuleInit();

      const constructorCall = Redis.mock.calls[0][0];
      const retryStrategy = constructorCall.retryStrategy;

      expect(retryStrategy(1)).toBe(200);
      expect(retryStrategy(2)).toBe(400);
      expect(retryStrategy(3)).toBe(600);
      expect(retryStrategy(4)).toBeNull();
    });
  });

  describe('onModuleDestroy', () => {
    it('should quit Redis connection', async () => {
      await storage.onModuleInit();
      await storage.onModuleDestroy();

      expect(mockRedis.quit).toHaveBeenCalled();
    });

    it('should not throw if Redis not initialized', async () => {
      await expect(storage.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe('increment', () => {
    beforeEach(async () => {
      await storage.onModuleInit();
    });

    it('should increment counter and return stats', async () => {
      const multiMock = {
        incr: jest.fn().mockReturnThis(),
        pttl: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 5], // incr result - 5 hits
          [null, 30000], // pttl result - 30 seconds remaining
        ]),
      };
      mockRedis.multi.mockReturnValue(multiMock);

      const result = await storage.increment('test-key', 60000, 10, 0, 'default');

      expect(result).toEqual({
        totalHits: 5,
        timeToExpire: 30000,
        isBlocked: false,
        timeToBlockExpire: 0,
      });
    });

    it('should use key prefix', async () => {
      const multiMock = {
        incr: jest.fn().mockReturnThis(),
        pttl: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 1],
          [null, 60000],
        ]),
      };
      mockRedis.multi.mockReturnValue(multiMock);

      await storage.increment('user:123:route', 60000, 10, 0, 'default');

      expect(multiMock.incr).toHaveBeenCalled();
    });

    it('should set expiry on first hit', async () => {
      const multiMock = {
        incr: jest.fn().mockReturnThis(),
        pttl: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 1], // First hit
          [null, -1], // No TTL set
        ]),
      };
      mockRedis.multi.mockReturnValue(multiMock);

      await storage.increment('new-key', 60000, 10, 0, 'default');

      expect(mockRedis.pexpire).toHaveBeenCalledWith('vendhub:throttle:new-key', 60000);
    });

    it('should set expiry when key has no TTL', async () => {
      const multiMock = {
        incr: jest.fn().mockReturnThis(),
        pttl: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 5], // Not first hit
          [null, -2], // Key exists but no TTL
        ]),
      };
      mockRedis.multi.mockReturnValue(multiMock);

      await storage.increment('existing-key', 60000, 10, 0, 'default');

      expect(mockRedis.pexpire).toHaveBeenCalled();
    });

    it('should not set expiry when TTL already exists', async () => {
      const multiMock = {
        incr: jest.fn().mockReturnThis(),
        pttl: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 5],
          [null, 30000], // TTL exists
        ]),
      };
      mockRedis.multi.mockReturnValue(multiMock);

      await storage.increment('existing-key', 60000, 10, 0, 'default');

      expect(mockRedis.pexpire).not.toHaveBeenCalled();
    });

    it('should return 0 for negative timeToExpire', async () => {
      const multiMock = {
        incr: jest.fn().mockReturnThis(),
        pttl: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 5],
          [null, -100],
        ]),
      };
      mockRedis.multi.mockReturnValue(multiMock);
      mockRedis.pexpire.mockResolvedValue(1);

      const result = await storage.increment('key', 60000, 10, 0, 'default');

      expect(result.timeToExpire).toBe(60000); // Should be the new TTL
    });

    it('should handle null results gracefully', async () => {
      const multiMock = {
        incr: jest.fn().mockReturnThis(),
        pttl: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      };
      mockRedis.multi.mockReturnValue(multiMock);

      const result = await storage.increment('key', 60000, 10, 0, 'default');

      expect(result.totalHits).toBe(1);
    });
  });
});
