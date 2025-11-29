import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Logger } from '@nestjs/common';
import { RedisCacheService, CACHE_TTL } from './redis-cache.service';

describe('RedisCacheService', () => {
  let service: RedisCacheService;
  let mockCacheManager: any;

  beforeEach(async () => {
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
      store: {
        client: {
          keys: jest.fn(),
        },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisCacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<RedisCacheService>(RedisCacheService);

    // Mock Logger
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return cached value on cache hit', async () => {
      const testValue = { data: 'test' };
      mockCacheManager.get.mockResolvedValue(testValue);

      const result = await service.get<typeof testValue>('test-key');

      expect(result).toEqual(testValue);
      expect(mockCacheManager.get).toHaveBeenCalledWith('test-key');
    });

    it('should return undefined on cache miss', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.get('missing-key');

      expect(result).toBeUndefined();
    });

    it('should return undefined on error', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.get('error-key');

      expect(result).toBeUndefined();
    });

    it('should log cache hit', async () => {
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');
      mockCacheManager.get.mockResolvedValue({ data: 'test' });

      await service.get('hit-key');

      expect(debugSpy).toHaveBeenCalledWith('Cache HIT: hit-key');
    });

    it('should log cache miss', async () => {
      const debugSpy = jest.spyOn(Logger.prototype, 'debug');
      mockCacheManager.get.mockResolvedValue(undefined);

      await service.get('miss-key');

      expect(debugSpy).toHaveBeenCalledWith('Cache MISS: miss-key');
    });
  });

  describe('set', () => {
    it('should set value with TTL', async () => {
      await service.set('set-key', { data: 'value' }, 300);

      expect(mockCacheManager.set).toHaveBeenCalledWith('set-key', { data: 'value' }, 300000);
    });

    it('should set value without TTL (use default)', async () => {
      await service.set('no-ttl-key', { data: 'value' });

      expect(mockCacheManager.set).toHaveBeenCalledWith('no-ttl-key', { data: 'value' }, undefined);
    });

    it('should handle set errors gracefully', async () => {
      mockCacheManager.set.mockRejectedValue(new Error('Set failed'));
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      await service.set('error-key', { data: 'value' });

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Cache SET error'));
    });
  });

  describe('del', () => {
    it('should delete cache entry', async () => {
      await service.del('del-key');

      expect(mockCacheManager.del).toHaveBeenCalledWith('del-key');
    });

    it('should handle delete errors gracefully', async () => {
      mockCacheManager.del.mockRejectedValue(new Error('Delete failed'));
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      await service.del('error-key');

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Cache DEL error'));
    });
  });

  describe('getOrSet', () => {
    it('should return cached value if exists', async () => {
      const cachedValue = { cached: true };
      mockCacheManager.get.mockResolvedValue(cachedValue);
      const factory = jest.fn().mockResolvedValue({ cached: false });

      const result = await service.getOrSet('key', 300, factory);

      expect(result).toEqual(cachedValue);
      expect(factory).not.toHaveBeenCalled();
    });

    it('should call factory and cache result if not cached', async () => {
      mockCacheManager.get.mockResolvedValue(undefined);
      const factoryValue = { generated: true };
      const factory = jest.fn().mockResolvedValue(factoryValue);

      const result = await service.getOrSet('key', 300, factory);

      expect(result).toEqual(factoryValue);
      expect(factory).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalledWith('key', factoryValue, 300000);
    });
  });

  describe('reset', () => {
    it('should reset all cache entries', async () => {
      await service.reset();

      expect(mockCacheManager.reset).toHaveBeenCalled();
    });

    it('should log warning when resetting cache', async () => {
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      await service.reset();

      expect(warnSpy).toHaveBeenCalledWith('Cache RESET: All entries cleared');
    });

    it('should handle reset errors gracefully', async () => {
      mockCacheManager.reset.mockRejectedValue(new Error('Reset failed'));
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      await service.reset();

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Cache RESET error'));
    });
  });

  describe('delByPattern', () => {
    it('should delete keys matching pattern', async () => {
      const matchingKeys = ['vendhub:cache:report:a', 'vendhub:cache:report:b'];
      mockCacheManager.store.client.keys.mockResolvedValue(matchingKeys);

      const result = await service.delByPattern('report:*');

      expect(result).toBe(2);
      expect(mockCacheManager.del).toHaveBeenCalledTimes(2);
    });

    it('should return 0 when no keys match', async () => {
      mockCacheManager.store.client.keys.mockResolvedValue([]);

      const result = await service.delByPattern('nonexistent:*');

      expect(result).toBe(0);
    });

    it('should return 0 when Redis client is not available', async () => {
      mockCacheManager.store = {};
      const warnSpy = jest.spyOn(Logger.prototype, 'warn');

      const result = await service.delByPattern('pattern:*');

      expect(result).toBe(0);
      expect(warnSpy).toHaveBeenCalledWith(
        'Pattern delete not available - Redis client not accessible',
      );
    });

    it('should handle errors gracefully', async () => {
      mockCacheManager.store.client.keys.mockRejectedValue(new Error('Keys error'));
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      const result = await service.delByPattern('error:*');

      expect(result).toBe(0);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Cache DEL PATTERN error'));
    });

    it('should use getClient() method if available', async () => {
      const mockClient = { keys: jest.fn().mockResolvedValue([]) };
      mockCacheManager.store = {
        getClient: jest.fn().mockReturnValue(mockClient),
      };

      await service.delByPattern('test:*');

      expect(mockClient.keys).toHaveBeenCalled();
    });
  });

  describe('buildReportKey', () => {
    it('should build report key with hashed params', () => {
      const key = service.buildReportKey('financial', { year: 2024, month: 1 });

      expect(key).toMatch(/^report:financial:\w+$/);
    });

    it('should produce same hash for same params regardless of order', () => {
      const key1 = service.buildReportKey('test', { a: 1, b: 2 });
      const key2 = service.buildReportKey('test', { b: 2, a: 1 });

      expect(key1).toBe(key2);
    });
  });

  describe('buildDashboardKey', () => {
    it('should build dashboard key with params hash', () => {
      const key = service.buildDashboardKey('admin', 'user-123', { period: 'day' });

      expect(key).toMatch(/^dashboard:admin:user-123:\w+$/);
    });

    it('should build dashboard key with default when no params', () => {
      const key = service.buildDashboardKey('admin', 'user-123');

      expect(key).toBe('dashboard:admin:user-123:default');
    });
  });

  describe('buildEntityKey', () => {
    it('should build entity key', () => {
      const key = service.buildEntityKey('machine', 'machine-123');

      expect(key).toBe('entity:machine:machine-123');
    });
  });

  describe('buildListKey', () => {
    it('should build list key with params hash', () => {
      const key = service.buildListKey('machines', { status: 'active' });

      expect(key).toMatch(/^list:machines:\w+$/);
    });

    it('should build list key with "all" when no params', () => {
      const key = service.buildListKey('machines');

      expect(key).toBe('list:machines:all');
    });
  });

  describe('CACHE_TTL constants', () => {
    it('should have correct dashboard TTL values', () => {
      expect(CACHE_TTL.DASHBOARD_ADMIN).toBe(300);
      expect(CACHE_TTL.DASHBOARD_MANAGER).toBe(300);
      expect(CACHE_TTL.DASHBOARD_OPERATOR).toBe(180);
    });

    it('should have correct report TTL values', () => {
      expect(CACHE_TTL.REPORT_FINANCIAL).toBe(3600);
      expect(CACHE_TTL.REPORT_NETWORK).toBe(900);
      expect(CACHE_TTL.REPORT_STATISTICS).toBe(900);
      expect(CACHE_TTL.REPORT_DEPRECIATION).toBe(86400);
    });

    it('should have correct entity TTL values', () => {
      expect(CACHE_TTL.ENTITY_MACHINE).toBe(60);
      expect(CACHE_TTL.ENTITY_USER).toBe(300);
      expect(CACHE_TTL.ENTITY_LOCATION).toBe(600);
    });

    it('should have correct list and session TTL values', () => {
      expect(CACHE_TTL.LIST_DEFAULT).toBe(60);
      expect(CACHE_TTL.SESSION).toBe(900);
    });
  });
});
