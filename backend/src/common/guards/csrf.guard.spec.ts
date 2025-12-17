import { CsrfGuard, CSRF_TOKEN_HEADER, CSRF_TOKEN_COOKIE, generateCsrfToken } from './csrf.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

describe('CsrfGuard', () => {
  let guard: CsrfGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      get: jest.fn(),
    } as any;

    guard = new CsrfGuard(reflector);
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
});
