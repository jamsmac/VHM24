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

  beforeEach(() => {
    reflector = {
      get: jest.fn(),
    } as any;

    interceptor = new ReportsCacheInterceptor(reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  const createMockExecutionContext = (
    url: string = '/reports/test',
    method: string = 'GET',
    query: Record<string, unknown> = {},
    params: Record<string, unknown> = {},
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          url,
          method,
          query,
          params,
        }),
      }),
      getHandler: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  const createMockCallHandler = (response: unknown = { data: 'test' }): CallHandler => ({
    handle: () => of(response),
  });

  describe('intercept', () => {
    it('should cache response on first request', async () => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ result: 'data' });

      reflector.get.mockReturnValue(undefined);

      const result$ = interceptor.intercept(context, handler);
      const result = await lastValueFrom(result$);

      expect(result).toEqual({ result: 'data' });
    });

    it('should return cached response on subsequent request', async () => {
      const context = createMockExecutionContext('/reports/cached');
      const handler1 = createMockCallHandler({ result: 'first' });
      const handler2 = createMockCallHandler({ result: 'second' });

      reflector.get.mockReturnValue(undefined);

      // First request - caches the response
      const result1 = await lastValueFrom(interceptor.intercept(context, handler1));
      expect(result1).toEqual({ result: 'first' });

      // Second request - should return cached value
      const result2 = await lastValueFrom(interceptor.intercept(context, handler2));
      expect(result2).toEqual({ result: 'first' });
    });

    it('should use custom cache key from metadata', async () => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler({ data: 'test' });

      reflector.get.mockImplementation((key: string) => {
        if (key === CACHE_KEY_METADATA) return 'custom-key';
        return undefined;
      });

      await lastValueFrom(interceptor.intercept(context, handler));

      const stats = interceptor.getStats();
      expect(stats.keys).toContain('custom-key');
    });

    it('should use custom TTL from metadata', async () => {
      jest.useFakeTimers();

      const context = createMockExecutionContext('/reports/short-ttl');
      const handler1 = createMockCallHandler({ result: 'first' });
      const handler2 = createMockCallHandler({ result: 'second' });

      reflector.get.mockImplementation((key: string) => {
        if (key === CACHE_TTL_METADATA) return 1; // 1 second TTL
        return undefined;
      });

      // First request
      await lastValueFrom(interceptor.intercept(context, handler1));

      // Advance time past TTL
      jest.advanceTimersByTime(2000);

      // Second request should get new data (cache expired)
      const result = await lastValueFrom(interceptor.intercept(context, handler2));
      expect(result).toEqual({ result: 'second' });
    });

    it('should build cache key from request details', async () => {
      const context = createMockExecutionContext(
        '/reports/detail',
        'GET',
        { startDate: '2025-01-01' },
        { id: '123' },
      );
      const handler = createMockCallHandler();

      reflector.get.mockReturnValue(undefined);

      await lastValueFrom(interceptor.intercept(context, handler));

      const stats = interceptor.getStats();
      expect(stats.keys[0]).toContain('GET');
      expect(stats.keys[0]).toContain('/reports/detail');
      expect(stats.keys[0]).toContain('startDate');
      expect(stats.keys[0]).toContain('123');
    });

    it('should differentiate cache by query parameters', async () => {
      const context1 = createMockExecutionContext('/reports', 'GET', { page: 1 });
      const context2 = createMockExecutionContext('/reports', 'GET', { page: 2 });

      const handler1 = createMockCallHandler({ page: 1 });
      const handler2 = createMockCallHandler({ page: 2 });

      reflector.get.mockReturnValue(undefined);

      const result1 = await lastValueFrom(interceptor.intercept(context1, handler1));
      const result2 = await lastValueFrom(interceptor.intercept(context2, handler2));

      expect(result1).toEqual({ page: 1 });
      expect(result2).toEqual({ page: 2 });
    });
  });

  describe('clearAll', () => {
    it('should clear all cache entries', async () => {
      const context = createMockExecutionContext();
      const handler = createMockCallHandler();

      reflector.get.mockReturnValue(undefined);

      await lastValueFrom(interceptor.intercept(context, handler));
      expect(interceptor.getStats().size).toBe(1);

      interceptor.clearAll();
      expect(interceptor.getStats().size).toBe(0);
    });
  });

  describe('clearPattern', () => {
    it('should clear cache entries matching pattern', async () => {
      const context1 = createMockExecutionContext('/reports/financial');
      const context2 = createMockExecutionContext('/reports/network');
      const context3 = createMockExecutionContext('/dashboard/admin');

      const handler = createMockCallHandler();
      reflector.get.mockReturnValue(undefined);

      await lastValueFrom(interceptor.intercept(context1, handler));
      await lastValueFrom(interceptor.intercept(context2, handler));
      await lastValueFrom(interceptor.intercept(context3, handler));

      expect(interceptor.getStats().size).toBe(3);

      interceptor.clearPattern('/reports');
      expect(interceptor.getStats().size).toBe(1);
      expect(interceptor.getStats().keys[0]).toContain('/dashboard');
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      const context = createMockExecutionContext('/reports/test');
      const handler = createMockCallHandler();

      reflector.get.mockReturnValue(undefined);

      await lastValueFrom(interceptor.intercept(context, handler));

      const stats = interceptor.getStats();

      expect(stats.size).toBe(1);
      expect(stats.keys).toHaveLength(1);
    });

    it('should return empty stats when cache is empty', () => {
      const stats = interceptor.getStats();

      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
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
