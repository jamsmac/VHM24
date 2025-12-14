import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, lastValueFrom } from 'rxjs';
import {
  ReportsCacheInterceptor,
  CacheKey,
  CacheTTL,
  CACHE_KEY_METADATA,
  CACHE_TTL_METADATA,
  CACHE_TTL_CONFIG,
} from './cache.interceptor';

describe('ReportsCacheInterceptor', () => {
  let interceptor: ReportsCacheInterceptor;
  let reflector: jest.Mocked<Reflector>;
  let mockCacheManager: any;

  beforeEach(() => {
    reflector = {
      get: jest.fn(),
    } as any;

    // Mock Redis cache manager
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
      store: {
        client: {
          keys: jest.fn().mockResolvedValue([]),
        },
      },
    };

    interceptor = new ReportsCacheInterceptor(reflector, mockCacheManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (
    url: string = '/reports/test',
    method: string = 'GET',
    query: Record<string, unknown> = {},
    params: Record<string, unknown> = {},
    user: { id: string } | null = { id: 'user-123' },
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          url,
          method,
          query,
          params,
          user,
        }),
      }),
      getHandler: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  const createMockCallHandler = (response: unknown = { data: 'test' }): CallHandler => ({
    handle: () => of(response),
  });

  describe('intercept', () => {
    it('should cache response on first request (cache miss)', async () => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ result: 'data' });

      reflector.get.mockReturnValue(undefined);
      mockCacheManager.get.mockResolvedValue(undefined);

      const result$ = interceptor.intercept(context, handler);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({ result: 'data' });
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should return cached response on cache hit', async () => {
      const context = createMockExecutionContext('/reports/cached');
      const handler = createMockCallHandler({ result: 'from-handler' });

      reflector.get.mockReturnValue(undefined);
      mockCacheManager.get.mockResolvedValue({ result: 'from-cache' });

      const result = await lastValueFrom(interceptor.intercept(context, handler));

      expect(result).toEqual({ result: 'from-cache' });
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });

    it('should use custom cache key from metadata', async () => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ data: 'test' });

      reflector.get.mockImplementation((key: string) => {
        if (key === CACHE_KEY_METADATA) return 'custom-key';
        return undefined;
      });
      mockCacheManager.get.mockResolvedValue(undefined);

      await lastValueFrom(interceptor.intercept(context, handler));

      expect(mockCacheManager.get).toHaveBeenCalledWith(expect.stringContaining('custom-key'));
    });

    it('should use custom TTL from metadata', async () => {
      const context = createMockExecutionContext('/reports/custom-ttl');
      const handler = createMockCallHandler({ result: 'data' });

      reflector.get.mockImplementation((key: string) => {
        if (key === CACHE_TTL_METADATA) return 600; // 10 minutes
        return undefined;
      });
      mockCacheManager.get.mockResolvedValue(undefined);

      await lastValueFrom(interceptor.intercept(context, handler));

      // TTL is converted to milliseconds (600 * 1000)
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.any(String),
        { result: 'data' },
        600000,
      );
    });

    it('should build cache key with user id', async () => {
      const context = createMockExecutionContext(
        '/reports/detail',
        'GET',
        { startDate: '2025-01-01' },
        { id: '123' },
        { id: 'user-456' },
      );
      const handler = createMockCallHandler();

      reflector.get.mockReturnValue(undefined);
      mockCacheManager.get.mockResolvedValue(undefined);

      await lastValueFrom(interceptor.intercept(context, handler));

      expect(mockCacheManager.get).toHaveBeenCalledWith(expect.stringContaining('user-456'));
    });

    it('should skip caching if cache manager is not available', async () => {
      const interceptorWithoutCache = new ReportsCacheInterceptor(reflector, undefined);
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ result: 'data' });

      reflector.get.mockReturnValue(undefined);

      const result = await lastValueFrom(interceptorWithoutCache.intercept(context, handler));

      expect(result).toEqual({ result: 'data' });
    });

    it('should differentiate cache by query parameters', async () => {
      const context1 = createMockExecutionContext('/reports', 'GET', { page: '1' });
      const context2 = createMockExecutionContext('/reports', 'GET', { page: '2' });

      const handler1 = createMockCallHandler({ page: 1 });
      const handler2 = createMockCallHandler({ page: 2 });

      reflector.get.mockReturnValue(undefined);
      mockCacheManager.get.mockResolvedValue(undefined);

      await lastValueFrom(interceptor.intercept(context1, handler1));
      await lastValueFrom(interceptor.intercept(context2, handler2));

      // Should have been called with different cache keys
      const calls = mockCacheManager.get.mock.calls;
      expect(calls[0][0]).not.toBe(calls[1][0]);
    });
  });

  describe('clearAll', () => {
    it('should clear all report cache entries', async () => {
      const keysToDelete = ['vendhub:reports:key1', 'vendhub:reports:key2'];
      mockCacheManager.store.client.keys.mockResolvedValue(keysToDelete);

      await interceptor.clearAll();

      expect(mockCacheManager.store.client.keys).toHaveBeenCalledWith('vendhub:reports:*');
      expect(mockCacheManager.del).toHaveBeenCalledTimes(2);
    });
  });

  describe('clearPattern', () => {
    it('should clear cache entries matching pattern', async () => {
      const keysToDelete = ['vendhub:reports:financial:key1', 'vendhub:reports:financial:key2'];
      mockCacheManager.store.client.keys.mockResolvedValue(keysToDelete);

      const count = await interceptor.clearPattern('financial');

      expect(mockCacheManager.store.client.keys).toHaveBeenCalledWith(
        'vendhub:reports:*financial*',
      );
      expect(mockCacheManager.del).toHaveBeenCalledTimes(2);
      expect(count).toBe(2);
    });

    it('should return 0 when no keys match pattern', async () => {
      mockCacheManager.store.client.keys.mockResolvedValue([]);

      const count = await interceptor.clearPattern('nonexistent');

      expect(count).toBe(0);
      expect(mockCacheManager.del).not.toHaveBeenCalled();
    });
  });
});

describe('CacheKey decorator', () => {
  it('should set cache key metadata', () => {
    class TestClass {
      @CacheKey('test-key')
      testMethod() {}
    }

    const instance = new TestClass();
    const metadata = Reflect.getMetadata(CACHE_KEY_METADATA, instance.testMethod);

    expect(metadata).toBe('test-key');
  });
});

describe('CacheTTL decorator', () => {
  it('should set cache TTL metadata', () => {
    class TestClass {
      @CacheTTL(600)
      testMethod() {}
    }

    const instance = new TestClass();
    const metadata = Reflect.getMetadata(CACHE_TTL_METADATA, instance.testMethod);

    expect(metadata).toBe(600);
  });
});

describe('CACHE_TTL_CONFIG', () => {
  it('should have expected TTL values', () => {
    expect(CACHE_TTL_CONFIG.DASHBOARD_ADMIN).toBe(300);
    expect(CACHE_TTL_CONFIG.DASHBOARD_MANAGER).toBe(300);
    expect(CACHE_TTL_CONFIG.DASHBOARD_OPERATOR).toBe(180);
    expect(CACHE_TTL_CONFIG.REPORT_FINANCIAL).toBe(3600);
    expect(CACHE_TTL_CONFIG.REPORT_NETWORK).toBe(900);
    expect(CACHE_TTL_CONFIG.REPORT_STATISTICS).toBe(900);
    expect(CACHE_TTL_CONFIG.REPORT_DEPRECIATION).toBe(86400);
    expect(CACHE_TTL_CONFIG.REPORT_EXPIRY).toBe(3600);
  });
});
