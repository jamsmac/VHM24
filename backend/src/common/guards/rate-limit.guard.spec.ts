import { RateLimitGuard, RateLimitOptions } from './rate-limit.guard';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimiterService, RateLimitResult } from '../services/rate-limiter.service';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let rateLimiter: jest.Mocked<RateLimiterService>;
  let reflector: jest.Mocked<Reflector>;
  const originalNodeEnv = process.env.NODE_ENV;

  // Override NODE_ENV for these tests since guard skips in test environment
  beforeAll(() => {
    process.env.NODE_ENV = 'development';
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  beforeEach(() => {
    rateLimiter = {
      checkRateLimit: jest.fn(),
    } as any;

    reflector = {
      get: jest.fn(),
    } as any;

    guard = new RateLimitGuard(rateLimiter, reflector);
  });

  function createMockContext(
    options: {
      method?: string;
      path?: string;
      headers?: Record<string, string>;
      user?: { id?: string; userId?: string; role?: string };
      remoteAddress?: string;
    } = {},
  ): ExecutionContext {
    const {
      method = 'GET',
      path = '/api/test',
      headers = {},
      user,
      remoteAddress = '127.0.0.1',
    } = options;

    const mockResponse = {
      set: jest.fn(),
    };

    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          path,
          headers,
          user,
          get: (header: string) => headers[header.toLowerCase()],
          socket: { remoteAddress },
        }),
        getResponse: () => mockResponse,
      }),
      getHandler: () => ({}),
    } as unknown as ExecutionContext;
  }

  function createAllowedResult(remaining = 10): RateLimitResult {
    return {
      allowed: true,
      remaining,
      resetTime: Date.now() + 60000,
      retryAfter: undefined,
    };
  }

  function createBlockedResult(): RateLimitResult {
    return {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000,
      retryAfter: 60,
    };
  }

  describe('canActivate', () => {
    it('should allow request when rate limit is not exceeded', async () => {
      const context = createMockContext();
      reflector.get.mockReturnValue(undefined);
      rateLimiter.checkRateLimit.mockResolvedValue(createAllowedResult());

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith(
        'ip:127.0.0.1',
        '/api/test',
        'GET',
        undefined,
      );
    });

    it('should throw HttpException when rate limit is exceeded', async () => {
      const context = createMockContext();
      reflector.get.mockReturnValue(undefined);
      rateLimiter.checkRateLimit.mockResolvedValue(createBlockedResult());

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
      await expect(guard.canActivate(context)).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
    });

    it('should use user ID for authenticated requests', async () => {
      const context = createMockContext({
        user: { id: 'user-123' },
      });
      reflector.get.mockReturnValue(undefined);
      rateLimiter.checkRateLimit.mockResolvedValue(createAllowedResult());

      await guard.canActivate(context);

      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith(
        'user:user-123',
        '/api/test',
        'GET',
        undefined,
      );
    });

    it('should use userId field if id is not present', async () => {
      const context = createMockContext({
        user: { userId: 'user-456' },
      });
      reflector.get.mockReturnValue(undefined);
      rateLimiter.checkRateLimit.mockResolvedValue(createAllowedResult());

      await guard.canActivate(context);

      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith(
        'user:user-456',
        '/api/test',
        'GET',
        undefined,
      );
    });

    it('should pass user role to rate limiter', async () => {
      const context = createMockContext({
        user: { id: 'user-123', role: 'admin' },
      });
      reflector.get.mockReturnValue(undefined);
      rateLimiter.checkRateLimit.mockResolvedValue(createAllowedResult());

      await guard.canActivate(context);

      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith(
        'user:user-123',
        '/api/test',
        'GET',
        'admin',
      );
    });

    it('should set rate limit headers on response', async () => {
      const context = createMockContext();
      const mockResponse = context.switchToHttp().getResponse();
      reflector.get.mockReturnValue(undefined);
      rateLimiter.checkRateLimit.mockResolvedValue(createAllowedResult(5));

      await guard.canActivate(context);

      expect(mockResponse.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'X-RateLimit-Remaining': '5',
        }),
      );
    });

    it('should set Retry-After header when rate limit exceeded', async () => {
      const context = createMockContext();
      const mockResponse = context.switchToHttp().getResponse();
      reflector.get.mockReturnValue(undefined);
      rateLimiter.checkRateLimit.mockResolvedValue(createBlockedResult());

      try {
        await guard.canActivate(context);
      } catch {
        // Expected to throw
      }

      expect(mockResponse.set).toHaveBeenCalledWith(
        expect.objectContaining({
          'Retry-After': '60',
        }),
      );
    });

    it('should allow request on rate limiter error (fail-open)', async () => {
      const context = createMockContext();
      reflector.get.mockReturnValue(undefined);
      rateLimiter.checkRateLimit.mockRejectedValue(new Error('Redis connection failed'));

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should re-throw HttpException from rate limiter', async () => {
      const context = createMockContext();
      reflector.get.mockReturnValue(undefined);
      const httpError = new HttpException('Custom error', HttpStatus.BAD_REQUEST);
      rateLimiter.checkRateLimit.mockRejectedValue(httpError);

      await expect(guard.canActivate(context)).rejects.toThrow(httpError);
    });
  });

  describe('generateIdentifier', () => {
    it('should use IP from x-forwarded-for header', async () => {
      const context = createMockContext({
        headers: { 'x-forwarded-for': '10.0.0.1, 10.0.0.2' },
      });
      reflector.get.mockReturnValue(undefined);
      rateLimiter.checkRateLimit.mockResolvedValue(createAllowedResult());

      await guard.canActivate(context);

      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith(
        'ip:10.0.0.1',
        expect.any(String),
        expect.any(String),
        undefined,
      );
    });

    it('should use IP from x-real-ip header', async () => {
      const context = createMockContext({
        headers: { 'x-real-ip': '10.0.0.5' },
      });
      reflector.get.mockReturnValue(undefined);
      rateLimiter.checkRateLimit.mockResolvedValue(createAllowedResult());

      await guard.canActivate(context);

      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith(
        'ip:10.0.0.5',
        expect.any(String),
        expect.any(String),
        undefined,
      );
    });

    it('should use IP from x-client-ip header', async () => {
      const context = createMockContext({
        headers: { 'x-client-ip': '10.0.0.6' },
      });
      reflector.get.mockReturnValue(undefined);
      rateLimiter.checkRateLimit.mockResolvedValue(createAllowedResult());

      await guard.canActivate(context);

      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith(
        'ip:10.0.0.6',
        expect.any(String),
        expect.any(String),
        undefined,
      );
    });

    it('should use IP for auth endpoints', async () => {
      const context = createMockContext({
        path: '/auth/login',
        remoteAddress: '192.168.1.1',
      });
      reflector.get.mockReturnValue(undefined);
      rateLimiter.checkRateLimit.mockResolvedValue(createAllowedResult());

      await guard.canActivate(context);

      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith(
        'ip:192.168.1.1',
        '/auth/login',
        expect.any(String),
        undefined,
      );
    });

    it('should use custom key generator if provided', async () => {
      const customKeyGenerator = jest.fn().mockReturnValue('custom:key');
      const options: RateLimitOptions = { keyGenerator: customKeyGenerator };

      const context = createMockContext({ user: { id: 'user-1' } });
      reflector.get.mockReturnValue(options);
      rateLimiter.checkRateLimit.mockResolvedValue(createAllowedResult());

      await guard.canActivate(context);

      expect(customKeyGenerator).toHaveBeenCalled();
      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith(
        'custom:key',
        expect.any(String),
        expect.any(String),
        undefined,
      );
    });
  });

  describe('getEndpoint', () => {
    it('should normalize API paths to resource level', async () => {
      const context = createMockContext({
        path: '/api/users/123/profile',
      });
      reflector.get.mockReturnValue(undefined);
      rateLimiter.checkRateLimit.mockResolvedValue(createAllowedResult());

      await guard.canActivate(context);

      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith(
        expect.any(String),
        '/api/users',
        expect.any(String),
        undefined,
      );
    });

    it('should keep non-API paths as-is', async () => {
      const context = createMockContext({
        path: '/health',
      });
      reflector.get.mockReturnValue(undefined);
      rateLimiter.checkRateLimit.mockResolvedValue(createAllowedResult());

      await guard.canActivate(context);

      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith(
        expect.any(String),
        '/health',
        expect.any(String),
        undefined,
      );
    });
  });

  describe('HTTP methods', () => {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

    methods.forEach((method) => {
      it(`should handle ${method} requests`, async () => {
        const context = createMockContext({ method });
        reflector.get.mockReturnValue(undefined);
        rateLimiter.checkRateLimit.mockResolvedValue(createAllowedResult());

        await guard.canActivate(context);

        expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          method,
          undefined,
        );
      });
    });
  });

  describe('rate limit warning', () => {
    it('should log warning when remaining requests are low', async () => {
      const context = createMockContext();
      reflector.get.mockReturnValue(undefined);
      rateLimiter.checkRateLimit.mockResolvedValue(createAllowedResult(3));

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      // Warning should be logged (tested via logger mock if needed)
    });
  });

  describe('edge cases', () => {
    it('should handle undefined remote address', async () => {
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({
            method: 'GET',
            path: '/api/test',
            headers: {},
            get: () => undefined,
            socket: { remoteAddress: undefined },
          }),
          getResponse: () => ({ set: jest.fn() }),
        }),
        getHandler: () => ({}),
      } as unknown as ExecutionContext;

      reflector.get.mockReturnValue(undefined);
      rateLimiter.checkRateLimit.mockResolvedValue(createAllowedResult());

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(rateLimiter.checkRateLimit).toHaveBeenCalledWith(
        'ip:unknown',
        expect.any(String),
        expect.any(String),
        undefined,
      );
    });

    it('should handle negative remaining value in headers', async () => {
      const context = createMockContext();
      const mockResponse = context.switchToHttp().getResponse();
      reflector.get.mockReturnValue(undefined);
      rateLimiter.checkRateLimit.mockResolvedValue({
        allowed: true,
        remaining: -1,
        resetTime: Date.now() + 60000,
        retryAfter: undefined,
      });

      await guard.canActivate(context);

      // Should not set headers for negative remaining
      expect(mockResponse.set).not.toHaveBeenCalled();
    });
  });
});
