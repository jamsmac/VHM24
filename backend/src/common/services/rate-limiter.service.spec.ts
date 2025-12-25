import { Test, TestingModule } from '@nestjs/testing';
import { RateLimiterService } from './rate-limiter.service';
import { Cache } from 'cache-manager';

// Create mock Redis instance
const mockRedisInstance = {
  zadd: jest.fn(),
  zremrangebyscore: jest.fn(),
  zcount: jest.fn(),
  expire: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  zcard: jest.fn(),
  disconnect: jest.fn(),
};

// Mock ioredis - handle both default and named exports
jest.mock('ioredis', () => {
  const MockRedis = jest.fn(() => mockRedisInstance);
  return {
    __esModule: true,
    default: MockRedis,
    Redis: MockRedis,
  };
});

describe('RateLimiterService', () => {
  let service: RateLimiterService;
  let _cacheManager: Cache;

  // Use the shared mock instance
  const mockRedis = mockRedisInstance;

  beforeEach(async () => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimiterService,
        {
          provide: 'CACHE_MANAGER',
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<RateLimiterService>(RateLimiterService);
    _cacheManager = module.get('CACHE_MANAGER');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with default rules', () => {
      const rules = service.getRules();
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some(rule => rule.endpoint === '/auth/login')).toBe(true);
    });

    it('should have auth login rule with correct limits', () => {
      const rules = service.getRules();
      const loginRule = rules.find(r => r.endpoint === '/auth/login');
      expect(loginRule).toBeDefined();
      expect(loginRule?.limit).toBe(5);
      expect(loginRule?.windowMs).toBe(60 * 1000);
    });

    it('should have forgot-password rule', () => {
      const rules = service.getRules();
      const rule = rules.find(r => r.endpoint === '/auth/forgot-password');
      expect(rule).toBeDefined();
      expect(rule?.limit).toBe(3);
    });

    it('should have reset-password rule', () => {
      const rules = service.getRules();
      const rule = rules.find(r => r.endpoint === '/auth/reset-password');
      expect(rule).toBeDefined();
      expect(rule?.limit).toBe(3);
    });

    it('should have file upload rule', () => {
      const rules = service.getRules();
      const rule = rules.find(r => r.endpoint === '/api/files/upload');
      expect(rule).toBeDefined();
      expect(rule?.limit).toBe(10);
    });
  });

  describe('addRule', () => {
    it('should add custom rule', () => {
      const initialCount = service.getRules().length;
      service.addRule({
        endpoint: '/test',
        method: 'POST',
        limit: 10,
        windowMs: 60000,
      });
      expect(service.getRules().length).toBe(initialCount + 1);
    });

    it('should add rule with roles restriction', () => {
      service.addRule({
        endpoint: '/custom/restricted',
        method: 'POST',
        limit: 5,
        windowMs: 60000,
        roles: ['admin', 'manager'],
      });
      const rule = service.getRules().find(r => r.endpoint === '/custom/restricted');
      expect(rule?.roles).toEqual(['admin', 'manager']);
    });

    it('should add rule with skipForRoles', () => {
      service.addRule({
        endpoint: '/custom/skippable',
        method: 'GET',
        limit: 20,
        windowMs: 60000,
        skipForRoles: ['super-admin'],
      });
      const rule = service.getRules().find(r => r.endpoint === '/custom/skippable');
      expect(rule?.skipForRoles).toEqual(['super-admin']);
    });
  });

  describe('removeRule', () => {
    it('should remove rule', () => {
      service.addRule({
        endpoint: '/test-remove',
        method: 'POST',
        limit: 10,
        windowMs: 60000,
      });
      const initialCount = service.getRules().length;
      service.removeRule('/test-remove', 'POST');
      expect(service.getRules().length).toBe(initialCount - 1);
    });

    it('should not remove rule if endpoint does not match', () => {
      const initialCount = service.getRules().length;
      service.removeRule('/non-existent', 'POST');
      expect(service.getRules().length).toBe(initialCount);
    });

    it('should not remove rule if method does not match', () => {
      service.addRule({
        endpoint: '/test-method',
        method: 'POST',
        limit: 10,
        windowMs: 60000,
      });
      const initialCount = service.getRules().length;
      service.removeRule('/test-method', 'GET');
      expect(service.getRules().length).toBe(initialCount);
    });
  });

  describe('checkRateLimit', () => {
    it('should allow requests when no rules match', async () => {
      const result = await service.checkRateLimit(
        'user:123',
        '/unknown-endpoint',
        'GET'
      );
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(-1);
    });

    it('should skip rate limiting for exempt roles', async () => {
      const result = await service.checkRateLimit(
        'user:123',
        '/api/admin',
        'GET',
        'super-admin'
      );
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(-1);
    });

    it('should allow request when under rate limit', async () => {
      mockRedis.zadd.mockResolvedValue(1);
      mockRedis.zremrangebyscore.mockResolvedValue(0);
      mockRedis.zcount.mockResolvedValue(2); // 2 requests, under limit of 5
      mockRedis.expire.mockResolvedValue(1);

      const result = await service.checkRateLimit(
        'user:123',
        '/auth/login',
        'POST'
      );

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2); // 5 - 2 - 1 = 2
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('should block request when rate limit exceeded', async () => {
      mockRedis.zadd.mockResolvedValue(1);
      mockRedis.zremrangebyscore.mockResolvedValue(0);
      mockRedis.zcount.mockResolvedValue(6); // 6 requests, over limit of 5
      mockRedis.expire.mockResolvedValue(1);

      const result = await service.checkRateLimit(
        'user:123',
        '/auth/login',
        'POST'
      );

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should allow request on Redis error (fail-open)', async () => {
      mockRedis.zadd.mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.checkRateLimit(
        'user:123',
        '/auth/login',
        'POST'
      );

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(-1);
      expect(result.resetTime).toBe(0);
    });

    it('should handle exact remaining count at limit boundary', async () => {
      mockRedis.zadd.mockResolvedValue(1);
      mockRedis.zremrangebyscore.mockResolvedValue(0);
      mockRedis.zcount.mockResolvedValue(4); // 4 requests, under limit of 5
      mockRedis.expire.mockResolvedValue(1);

      const result = await service.checkRateLimit(
        'user:123',
        '/auth/login',
        'POST'
      );

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0); // 5 - 4 - 1 = 0
    });

    it('should call Redis with correct key format', async () => {
      mockRedis.zadd.mockResolvedValue(1);
      mockRedis.zremrangebyscore.mockResolvedValue(0);
      mockRedis.zcount.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await service.checkRateLimit('user:abc', '/auth/login', 'POST');

      expect(mockRedis.zadd).toHaveBeenCalledWith(
        'ratelimit:user:abc:POST:_auth_login',
        expect.any(Number),
        expect.any(String)
      );
    });

    it('should work with PUT method', async () => {
      mockRedis.zadd.mockResolvedValue(1);
      mockRedis.zremrangebyscore.mockResolvedValue(0);
      mockRedis.zcount.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      service.addRule({
        endpoint: '/test/put',
        method: 'PUT',
        limit: 10,
        windowMs: 60000,
      });

      const result = await service.checkRateLimit('user:123', '/test/put', 'PUT');

      expect(result.allowed).toBe(true);
    });

    it('should work with DELETE method', async () => {
      mockRedis.zadd.mockResolvedValue(1);
      mockRedis.zremrangebyscore.mockResolvedValue(0);
      mockRedis.zcount.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      service.addRule({
        endpoint: '/test/delete',
        method: 'DELETE',
        limit: 10,
        windowMs: 60000,
      });

      const result = await service.checkRateLimit('user:123', '/test/delete', 'DELETE');

      expect(result.allowed).toBe(true);
    });

    it('should work with PATCH method', async () => {
      mockRedis.zadd.mockResolvedValue(1);
      mockRedis.zremrangebyscore.mockResolvedValue(0);
      mockRedis.zcount.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      service.addRule({
        endpoint: '/test/patch',
        method: 'PATCH',
        limit: 10,
        windowMs: 60000,
      });

      const result = await service.checkRateLimit('user:123', '/test/patch', 'PATCH');

      expect(result.allowed).toBe(true);
    });

    it('should skip rate limiting for admin role', async () => {
      const result = await service.checkRateLimit(
        'user:123',
        '/api/admin',
        'POST',
        'admin'
      );

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(-1);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return null when no rule matches', async () => {
      const result = await service.getRateLimitStatus(
        'user:123',
        '/unknown',
        'GET'
      );

      expect(result).toBeNull();
    });

    it('should return null for exempt roles', async () => {
      const result = await service.getRateLimitStatus(
        'user:123',
        '/api/admin',
        'GET',
        'admin'
      );

      expect(result).toBeNull();
    });

    it('should not skip for undefined role with skipForRoles', async () => {
      mockRedis.zcount.mockResolvedValue(2);

      // /api/admin has skipForRoles: ['admin', 'super-admin']
      // With undefined role, skipForRoles check should evaluate to false
      const result = await service.getRateLimitStatus(
        'user:123',
        '/api/admin',
        'GET',
        undefined // No role - should NOT be skipped
      );

      // Rule matches and is not skipped, so we get status
      expect(result).not.toBeNull();
      expect(result?.remaining).toBeDefined();
    });

    it('should return rate limit status', async () => {
      mockRedis.zcount.mockResolvedValue(3);

      const result = await service.getRateLimitStatus(
        'user:123',
        '/auth/login',
        'POST'
      );

      expect(result).toBeDefined();
      expect(result?.remaining).toBe(2); // 5 - 3 = 2
      expect(result?.allowed).toBe(true);
    });

    it('should return not allowed when at limit', async () => {
      mockRedis.zcount.mockResolvedValue(5);

      const result = await service.getRateLimitStatus(
        'user:123',
        '/auth/login',
        'POST'
      );

      expect(result).toBeDefined();
      expect(result?.remaining).toBe(0);
      expect(result?.allowed).toBe(false);
    });

    it('should return null on Redis error', async () => {
      mockRedis.zcount.mockRejectedValue(new Error('Redis error'));

      const result = await service.getRateLimitStatus(
        'user:123',
        '/auth/login',
        'POST'
      );

      expect(result).toBeNull();
    });
  });

  describe('resetRateLimit', () => {
    it('should reset rate limit for identifier', async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.resetRateLimit('user:123', '/auth/login', 'POST');

      expect(mockRedis.del).toHaveBeenCalledWith(
        'ratelimit:user:123:POST:_auth_login'
      );
    });

    it('should handle Redis error during reset', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(
        service.resetRateLimit('user:123', '/auth/login', 'POST')
      ).resolves.not.toThrow();
    });
  });

  describe('findMatchingRule', () => {
    it('should match exact endpoint', async () => {
      mockRedis.zadd.mockResolvedValue(1);
      mockRedis.zremrangebyscore.mockResolvedValue(0);
      mockRedis.zcount.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      const result = await service.checkRateLimit(
        'user:123',
        '/auth/login',
        'POST'
      );

      expect(result.remaining).not.toBe(-1); // Rule was matched
    });

    it('should match pattern endpoint with wildcard', async () => {
      mockRedis.zadd.mockResolvedValue(1);
      mockRedis.zremrangebyscore.mockResolvedValue(0);
      mockRedis.zcount.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      service.addRule({
        endpoint: '/custom/*',
        method: 'ALL',
        limit: 50,
        windowMs: 60000,
      });

      const result = await service.checkRateLimit(
        'user:123',
        '/custom/nested/path',
        'GET'
      );

      expect(result.remaining).not.toBe(-1); // Pattern rule was matched
    });

    it('should not match pattern if method does not match', async () => {
      service.addRule({
        endpoint: '/specific/*',
        method: 'POST', // Only POST
        limit: 10,
        windowMs: 60000,
      });

      const result = await service.checkRateLimit(
        'user:123',
        '/specific/endpoint',
        'GET' // Using GET
      );

      expect(result.remaining).toBe(-1); // No rule matched
    });

    it('should not match if role is restricted and user has different role', async () => {
      service.addRule({
        endpoint: '/admin-only',
        method: 'POST',
        limit: 10,
        windowMs: 60000,
        roles: ['admin'], // Only admin role
      });

      const result = await service.checkRateLimit(
        'user:123',
        '/admin-only',
        'POST',
        'operator' // User has operator role
      );

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(-1); // No rule matched for this role
    });

    it('should match if user role is in roles array', async () => {
      mockRedis.zadd.mockResolvedValue(1);
      mockRedis.zremrangebyscore.mockResolvedValue(0);
      mockRedis.zcount.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      service.addRule({
        endpoint: '/managers-only',
        method: 'GET',
        limit: 20,
        windowMs: 60000,
        roles: ['manager', 'admin'],
      });

      const result = await service.checkRateLimit(
        'user:123',
        '/managers-only',
        'GET',
        'manager'
      );

      expect(result.remaining).not.toBe(-1); // Rule was matched
    });

    it('should match ALL method rule', async () => {
      mockRedis.zadd.mockResolvedValue(1);
      mockRedis.zremrangebyscore.mockResolvedValue(0);
      mockRedis.zcount.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      // Add a wildcard rule that matches any path under /api/
      service.addRule({
        endpoint: '/api/*',
        method: 'ALL',
        limit: 100,
        windowMs: 60000,
      });

      const result = await service.checkRateLimit(
        'user:123',
        '/api/test',
        'GET'
      );

      // The /api/* rule with method ALL should match
      expect(result.remaining).not.toBe(-1);
    });
  });

  describe('buildRedisKey', () => {
    it('should sanitize special characters in endpoint', async () => {
      mockRedis.zadd.mockResolvedValue(1);
      mockRedis.zremrangebyscore.mockResolvedValue(0);
      mockRedis.zcount.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      service.addRule({
        endpoint: '/test/special-chars',
        method: 'GET',
        limit: 10,
        windowMs: 60000,
      });

      await service.checkRateLimit('user:123', '/test/special-chars', 'GET');

      expect(mockRedis.zadd).toHaveBeenCalledWith(
        'ratelimit:user:123:GET:_test_special_chars',
        expect.any(Number),
        expect.any(String)
      );
    });
  });

  describe('cleanup', () => {
    it('should clean up empty rate limit keys', async () => {
      mockRedis.keys.mockResolvedValue([
        'ratelimit:user1:POST:_auth_login',
        'ratelimit:user2:POST:_auth_login',
      ]);
      mockRedis.zcard.mockResolvedValueOnce(0).mockResolvedValueOnce(5);
      mockRedis.del.mockResolvedValue(1);

      await service.cleanup();

      expect(mockRedis.keys).toHaveBeenCalledWith('ratelimit:*');
      expect(mockRedis.zcard).toHaveBeenCalledTimes(2);
      expect(mockRedis.del).toHaveBeenCalledTimes(1);
      expect(mockRedis.del).toHaveBeenCalledWith('ratelimit:user1:POST:_auth_login');
    });

    it('should not delete keys with entries', async () => {
      mockRedis.keys.mockResolvedValue(['ratelimit:user:POST:_auth']);
      mockRedis.zcard.mockResolvedValue(3); // Has entries

      await service.cleanup();

      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should handle empty keys list', async () => {
      mockRedis.keys.mockResolvedValue([]);

      await service.cleanup();

      expect(mockRedis.zcard).not.toHaveBeenCalled();
    });

    it('should handle Redis error during cleanup', async () => {
      mockRedis.keys.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(service.cleanup()).resolves.not.toThrow();
    });
  });

  describe('getRules', () => {
    it('should return a copy of rules array', () => {
      const rules = service.getRules();
      const initialLength = rules.length;

      // Modifying returned array should not affect internal rules
      rules.push({
        endpoint: '/fake',
        method: 'GET',
        limit: 1,
        windowMs: 1000,
      });

      expect(service.getRules().length).toBe(initialLength);
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect Redis on module destroy', async () => {
      mockRedis.disconnect.mockResolvedValue(undefined);

      await service.onModuleDestroy();

      expect(mockRedis.disconnect).toHaveBeenCalled();
    });

    it('should handle null redis gracefully', async () => {
      // Simulate null redis (though this shouldn't happen in practice)
      (service as any).redis = null;

      // Should not throw
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty userRole in skipForRoles check', async () => {
      mockRedis.zadd.mockResolvedValue(1);
      mockRedis.zremrangebyscore.mockResolvedValue(0);
      mockRedis.zcount.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await service.checkRateLimit(
        'user:123',
        '/api/admin',
        'GET',
        undefined // No role
      );

      // /api/admin has skipForRoles: ['admin', 'super-admin']
      // Since userRole is undefined, it should not be skipped
      expect(mockRedis.zadd).toHaveBeenCalled();
    });

    it('should handle role restrictions with undefined userRole', async () => {
      mockRedis.zadd.mockResolvedValue(1);
      mockRedis.zremrangebyscore.mockResolvedValue(0);
      mockRedis.zcount.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      service.addRule({
        endpoint: '/role-restricted',
        method: 'POST',
        limit: 10,
        windowMs: 60000,
        roles: ['admin'],
      });

      const result = await service.checkRateLimit(
        'user:123',
        '/role-restricted',
        'POST',
        undefined // No role
      );

      // The rule logic only excludes users with roles NOT in the roles array.
      // If userRole is undefined, the role check is skipped (falsy short-circuit).
      // So the rule DOES match, and rate limiting is applied.
      expect(result.allowed).toBe(true);
      expect(result.remaining).not.toBe(-1); // Rule matched
    });

    it('should handle very high request counts', async () => {
      mockRedis.zadd.mockResolvedValue(1);
      mockRedis.zremrangebyscore.mockResolvedValue(0);
      mockRedis.zcount.mockResolvedValue(10000); // Very high count
      mockRedis.expire.mockResolvedValue(1);

      const result = await service.checkRateLimit(
        'user:123',
        '/auth/login',
        'POST'
      );

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0); // Math.max(0, ...) ensures non-negative
    });

    it('should correctly calculate expiration time', async () => {
      mockRedis.zadd.mockResolvedValue(1);
      mockRedis.zremrangebyscore.mockResolvedValue(0);
      mockRedis.zcount.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(1);

      await service.checkRateLimit('user:123', '/auth/login', 'POST');

      // Login rule has windowMs: 60000 (1 minute)
      // Expiration should be Math.ceil(60000 / 1000) + 60 = 120 seconds
      expect(mockRedis.expire).toHaveBeenCalledWith(
        expect.any(String),
        120
      );
    });
  });
});
