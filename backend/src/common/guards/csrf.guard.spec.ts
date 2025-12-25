import { CsrfGuard, CSRF_TOKEN_HEADER, CSRF_TOKEN_COOKIE, generateCsrfToken, SkipCsrf, CsrfProtection, CSRF_KEY } from './csrf.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

describe('CsrfGuard', () => {
  let guard: CsrfGuard;
  let reflector: jest.Mocked<Reflector>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    reflector = {
      get: jest.fn(),
    } as any;

    // Mock ConfigService to enable CSRF for tests
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'CSRF_ENABLED') return 'true';
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      }),
    } as any;

    guard = new CsrfGuard(reflector, configService);
  });

  function createMockContext(
    method: string,
    headers: Record<string, string>,
    cookies: Record<string, string>,
  ): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          path: '/api/test',
          headers,
          cookies,
        }),
      }),
      getHandler: () => ({}),
    } as unknown as ExecutionContext;
  }

  describe('canActivate', () => {
    it('should allow GET requests without CSRF token', () => {
      const context = createMockContext('GET', {}, {});
      reflector.get.mockReturnValue(undefined);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow HEAD requests without CSRF token', () => {
      const context = createMockContext('HEAD', {}, {});
      reflector.get.mockReturnValue(undefined);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow OPTIONS requests without CSRF token', () => {
      const context = createMockContext('OPTIONS', {}, {});
      reflector.get.mockReturnValue(undefined);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow POST with valid matching tokens', () => {
      const token = generateCsrfToken();
      const context = createMockContext(
        'POST',
        { [CSRF_TOKEN_HEADER]: token },
        { [CSRF_TOKEN_COOKIE]: token },
      );
      reflector.get.mockReturnValue(undefined);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow PUT with valid matching tokens', () => {
      const token = generateCsrfToken();
      const context = createMockContext(
        'PUT',
        { [CSRF_TOKEN_HEADER]: token },
        { [CSRF_TOKEN_COOKIE]: token },
      );
      reflector.get.mockReturnValue(undefined);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow DELETE with valid matching tokens', () => {
      const token = generateCsrfToken();
      const context = createMockContext(
        'DELETE',
        { [CSRF_TOKEN_HEADER]: token },
        { [CSRF_TOKEN_COOKIE]: token },
      );
      reflector.get.mockReturnValue(undefined);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw ForbiddenException when header token is missing', () => {
      const token = generateCsrfToken();
      const context = createMockContext('POST', {}, { [CSRF_TOKEN_COOKIE]: token });
      reflector.get.mockReturnValue(undefined);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('CSRF token missing in header');
    });

    it('should throw ForbiddenException when cookie token is missing', () => {
      const token = generateCsrfToken();
      const context = createMockContext(
        'POST',
        { [CSRF_TOKEN_HEADER]: token },
        {},
      );
      reflector.get.mockReturnValue(undefined);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('CSRF token missing in cookie');
    });

    it('should throw ForbiddenException when tokens do not match', () => {
      const headerToken = generateCsrfToken();
      const cookieToken = generateCsrfToken();
      const context = createMockContext(
        'POST',
        { [CSRF_TOKEN_HEADER]: headerToken },
        { [CSRF_TOKEN_COOKIE]: cookieToken },
      );
      reflector.get.mockReturnValue(undefined);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow('CSRF token validation failed');
    });

    it('should skip CSRF check when SkipCsrf decorator is used', () => {
      const context = createMockContext('POST', {}, {});
      reflector.get.mockReturnValue({ skip: true });

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should skip CSRF check for API key authenticated requests', () => {
      const context = createMockContext('POST', { 'x-api-key': 'valid-key' }, {});
      reflector.get.mockReturnValue(undefined);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should reject tokens with different lengths', () => {
      const context = createMockContext(
        'POST',
        { [CSRF_TOKEN_HEADER]: 'short' },
        { [CSRF_TOKEN_COOKIE]: generateCsrfToken() },
      );
      reflector.get.mockReturnValue(undefined);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('generateCsrfToken', () => {
    it('should generate a 64-character hex string', () => {
      const token = generateCsrfToken();

      expect(token).toHaveLength(64);
      expect(/^[a-f0-9]{64}$/i.test(token)).toBe(true);
    });

    it('should generate unique tokens', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe('CSRF disabled', () => {
    it('should allow all requests when CSRF is disabled', () => {
      const disabledConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'CSRF_ENABLED') return 'false';
          if (key === 'NODE_ENV') return 'development';
          return undefined;
        }),
      } as any;

      const disabledGuard = new CsrfGuard(reflector, disabledConfigService);
      const context = createMockContext('POST', {}, {});
      reflector.get.mockReturnValue(undefined);

      // Should allow even without tokens when CSRF is disabled
      expect(disabledGuard.canActivate(context)).toBe(true);
    });

    it('should be disabled by default in non-production', () => {
      const devConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'CSRF_ENABLED') return undefined; // not set
          if (key === 'NODE_ENV') return 'development';
          return undefined;
        }),
      } as any;

      const devGuard = new CsrfGuard(reflector, devConfigService);
      const context = createMockContext('POST', {}, {});
      reflector.get.mockReturnValue(undefined);

      // Should allow even without tokens in development
      expect(devGuard.canActivate(context)).toBe(true);
    });
  });

  describe('SkipCsrf decorator', () => {
    it('should set skip metadata on the method', () => {
      class TestController {
        @SkipCsrf()
        testMethod() {
          return 'test';
        }
      }

      const controller = new TestController();
      const metadata = Reflect.getMetadata(CSRF_KEY, controller.testMethod);

      expect(metadata).toEqual({ skip: true });
    });
  });

  describe('CsrfProtection decorator', () => {
    it('should set options metadata on a method', () => {
      const options = { methods: ['POST', 'DELETE'] };

      class TestController {
        @CsrfProtection(options)
        testMethod() {
          return 'test';
        }
      }

      const controller = new TestController();
      const metadata = Reflect.getMetadata(CSRF_KEY, controller.testMethod);

      expect(metadata).toEqual(options);
    });

    it('should set options metadata on a class', () => {
      const options = { methods: ['POST'] };

      @CsrfProtection(options)
      class TestController {
        testMethod() {
          return 'test';
        }
      }

      const metadata = Reflect.getMetadata(CSRF_KEY, TestController);

      expect(metadata).toEqual(options);
    });
  });

  describe('compareTokens edge cases', () => {
    it('should return false for tokens with invalid encoding', () => {
      // Create tokens that would cause Buffer.from to fail or timingSafeEqual to throw
      const context = createMockContext(
        'POST',
        { [CSRF_TOKEN_HEADER]: '\u0000\u0001\u0002' },
        { [CSRF_TOKEN_COOKIE]: generateCsrfToken() },
      );
      reflector.get.mockReturnValue(undefined);

      // Should throw because tokens don't match (different lengths)
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});
