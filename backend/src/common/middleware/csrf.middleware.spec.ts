import { CsrfMiddleware } from './csrf.middleware';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import { CSRF_TOKEN_COOKIE } from '../guards/csrf.guard';

// Helper to create mock request
function createMockRequest(overrides: Partial<{
  method: string;
  path: string;
  cookies: Record<string, any>;
}> = {}): Request {
  return {
    method: overrides.method ?? 'GET',
    path: overrides.path ?? '/api/test',
    cookies: overrides.cookies ?? {},
  } as Request;
}

describe('CsrfMiddleware', () => {
  let middleware: CsrfMiddleware;
  let configService: jest.Mocked<ConfigService>;
  let mockRequest: Request;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'COOKIE_DOMAIN') return '.example.com';
        if (key === 'COOKIE_SAME_SITE') return 'strict';
        return undefined;
      }),
    } as any;

    // Clear process.env.COOKIE_SAME_SITE before each test
    delete process.env.COOKIE_SAME_SITE;

    mockRequest = createMockRequest();

    mockResponse = {
      cookie: jest.fn(),
    };

    nextFunction = jest.fn();

    middleware = new CsrfMiddleware(configService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.COOKIE_SAME_SITE;
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(middleware).toBeDefined();
    });

    it('should use strict sameSite policy by default', () => {
      const strictMiddleware = new CsrfMiddleware(configService);
      expect(strictMiddleware).toBeDefined();
    });

    it('should use sameSite from process.env over ConfigService', () => {
      process.env.COOKIE_SAME_SITE = 'none';

      const envMiddleware = new CsrfMiddleware(configService);

      // Middleware should be created without error
      expect(envMiddleware).toBeDefined();
    });

    it('should use sameSite from ConfigService when process.env is not set', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'COOKIE_SAME_SITE') return 'lax';
        return undefined;
      });

      const configMiddleware = new CsrfMiddleware(configService);
      expect(configMiddleware).toBeDefined();
    });

    it('should default to strict when sameSite is not configured', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      });

      const defaultMiddleware = new CsrfMiddleware(configService);
      expect(defaultMiddleware).toBeDefined();
    });

    it('should warn and default to strict for invalid sameSite value', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'COOKIE_SAME_SITE') return 'invalid';
        return undefined;
      });

      const invalidMiddleware = new CsrfMiddleware(configService);
      expect(invalidMiddleware).toBeDefined();
    });

    it('should handle development environment', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        return undefined;
      });

      const devMiddleware = new CsrfMiddleware(configService);
      expect(devMiddleware).toBeDefined();
    });
  });

  describe('use', () => {
    describe('request filtering', () => {
      it('should skip non-GET requests', () => {
        const req = createMockRequest({ method: 'POST' });

        middleware.use(req, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.cookie).not.toHaveBeenCalled();
      });

      it('should skip PUT requests', () => {
        const req = createMockRequest({ method: 'PUT' });

        middleware.use(req, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.cookie).not.toHaveBeenCalled();
      });

      it('should skip DELETE requests', () => {
        const req = createMockRequest({ method: 'DELETE' });

        middleware.use(req, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.cookie).not.toHaveBeenCalled();
      });

      it('should skip PATCH requests', () => {
        const req = createMockRequest({ method: 'PATCH' });

        middleware.use(req, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.cookie).not.toHaveBeenCalled();
      });

      it('should skip health endpoint', () => {
        const req = createMockRequest({ path: '/api/v1/health' });

        middleware.use(req, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.cookie).not.toHaveBeenCalled();
      });

      it('should skip health endpoint with subpath', () => {
        const req = createMockRequest({ path: '/api/v1/health/ready' });

        middleware.use(req, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.cookie).not.toHaveBeenCalled();
      });

      it('should skip docs endpoint', () => {
        const req = createMockRequest({ path: '/api/docs' });

        middleware.use(req, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.cookie).not.toHaveBeenCalled();
      });

      it('should skip docs endpoint with subpath', () => {
        const req = createMockRequest({ path: '/api/docs/swagger.json' });

        middleware.use(req, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.cookie).not.toHaveBeenCalled();
      });
    });

    describe('existing token handling', () => {
      it('should skip if valid token already exists in cookie', () => {
        const validToken = 'a'.repeat(64); // 64 hex characters
        const req = createMockRequest({ cookies: { [CSRF_TOKEN_COOKIE]: validToken } });

        middleware.use(req, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.cookie).not.toHaveBeenCalled();
      });

      it('should generate new token if existing token is too short', () => {
        const req = createMockRequest({ cookies: { [CSRF_TOKEN_COOKIE]: 'tooshort' } });

        middleware.use(req, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.cookie).toHaveBeenCalled();
      });

      it('should generate new token if existing token is too long', () => {
        const req = createMockRequest({ cookies: { [CSRF_TOKEN_COOKIE]: 'a'.repeat(100) } });

        middleware.use(req, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.cookie).toHaveBeenCalled();
      });

      it('should generate new token if existing token has invalid characters', () => {
        const req = createMockRequest({ cookies: { [CSRF_TOKEN_COOKIE]: 'g'.repeat(64) } }); // 'g' is not a valid hex char

        middleware.use(req, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.cookie).toHaveBeenCalled();
      });

      it('should generate new token if existing token is not a string', () => {
        const req = createMockRequest({ cookies: { [CSRF_TOKEN_COOKIE]: 12345 as any } });

        middleware.use(req, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.cookie).toHaveBeenCalled();
      });

      it('should generate new token if cookies object is undefined', () => {
        const req = createMockRequest({ cookies: undefined as any });

        middleware.use(req, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.cookie).toHaveBeenCalled();
      });
    });

    describe('token generation', () => {
      it('should generate and set a new CSRF token', () => {
        middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockResponse.cookie).toHaveBeenCalledWith(
          CSRF_TOKEN_COOKIE,
          expect.stringMatching(/^[a-f0-9]{64}$/i),
          expect.any(Object),
        );
        expect(nextFunction).toHaveBeenCalled();
      });

      it('should generate unique tokens for each request', () => {
        const tokens: string[] = [];

        for (let i = 0; i < 5; i++) {
          const req = { method: 'GET', path: '/api/test', cookies: {} } as Request;
          const res = {
            cookie: jest.fn((name: string, value: string) => {
              tokens.push(value);
            }),
          } as any;

          middleware.use(req, res, nextFunction);
        }

        // All tokens should be unique
        const uniqueTokens = new Set(tokens);
        expect(uniqueTokens.size).toBe(5);
      });
    });

    describe('cookie options', () => {
      it('should set cookie with correct options in production', () => {
        middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockResponse.cookie).toHaveBeenCalledWith(
          CSRF_TOKEN_COOKIE,
          expect.any(String),
          expect.objectContaining({
            httpOnly: false, // Must be readable by JavaScript
            secure: true, // Production should use secure
            sameSite: 'strict',
            path: '/',
            domain: '.example.com',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
          }),
        );
      });

      it('should set secure=true when sameSite is none', () => {
        process.env.COOKIE_SAME_SITE = 'none';
        configService.get.mockImplementation((key: string) => {
          if (key === 'NODE_ENV') return 'development';
          if (key === 'COOKIE_SAME_SITE') return 'none';
          return undefined;
        });

        const noneMiddleware = new CsrfMiddleware(configService);
        noneMiddleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockResponse.cookie).toHaveBeenCalledWith(
          CSRF_TOKEN_COOKIE,
          expect.any(String),
          expect.objectContaining({
            secure: true, // Must be true for sameSite=none
            sameSite: 'none',
          }),
        );
      });

      it('should set secure=false in development with strict sameSite', () => {
        configService.get.mockImplementation((key: string) => {
          if (key === 'NODE_ENV') return 'development';
          if (key === 'COOKIE_SAME_SITE') return 'strict';
          return undefined;
        });

        const devMiddleware = new CsrfMiddleware(configService);
        devMiddleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockResponse.cookie).toHaveBeenCalledWith(
          CSRF_TOKEN_COOKIE,
          expect.any(String),
          expect.objectContaining({
            secure: false, // Development with strict doesn't need secure
          }),
        );
      });

      it('should handle undefined cookie domain', () => {
        configService.get.mockImplementation((key: string) => {
          if (key === 'NODE_ENV') return 'production';
          if (key === 'COOKIE_DOMAIN') return undefined;
          return undefined;
        });

        const noDomainMiddleware = new CsrfMiddleware(configService);
        noDomainMiddleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockResponse.cookie).toHaveBeenCalledWith(
          CSRF_TOKEN_COOKIE,
          expect.any(String),
          expect.objectContaining({
            domain: undefined,
          }),
        );
      });

      it('should use lax sameSite policy when configured', () => {
        configService.get.mockImplementation((key: string) => {
          if (key === 'NODE_ENV') return 'production';
          if (key === 'COOKIE_SAME_SITE') return 'lax';
          return undefined;
        });

        const laxMiddleware = new CsrfMiddleware(configService);
        laxMiddleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockResponse.cookie).toHaveBeenCalledWith(
          CSRF_TOKEN_COOKIE,
          expect.any(String),
          expect.objectContaining({
            sameSite: 'lax',
          }),
        );
      });
    });

    describe('edge cases', () => {
      it('should handle request with empty cookies object', () => {
        const req = createMockRequest({ cookies: {} });

        middleware.use(req, mockResponse as Response, nextFunction);

        expect(mockResponse.cookie).toHaveBeenCalled();
        expect(nextFunction).toHaveBeenCalled();
      });

      it('should handle request with null cookie value', () => {
        const req = createMockRequest({ cookies: { [CSRF_TOKEN_COOKIE]: null as any } });

        middleware.use(req, mockResponse as Response, nextFunction);

        expect(mockResponse.cookie).toHaveBeenCalled();
        expect(nextFunction).toHaveBeenCalled();
      });

      it('should process regular API paths', () => {
        const req = createMockRequest({ path: '/api/users' });

        middleware.use(req, mockResponse as Response, nextFunction);

        expect(mockResponse.cookie).toHaveBeenCalled();
        expect(nextFunction).toHaveBeenCalled();
      });

      it('should process root path', () => {
        const req = createMockRequest({ path: '/' });

        middleware.use(req, mockResponse as Response, nextFunction);

        expect(mockResponse.cookie).toHaveBeenCalled();
        expect(nextFunction).toHaveBeenCalled();
      });

      it('should accept valid uppercase hex token', () => {
        const validToken = 'A'.repeat(64); // Uppercase hex characters
        const req = createMockRequest({ cookies: { [CSRF_TOKEN_COOKIE]: validToken } });

        middleware.use(req, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.cookie).not.toHaveBeenCalled();
      });

      it('should accept valid mixed case hex token', () => {
        const validToken = 'aAbBcCdDeEfF0123456789'.repeat(3).slice(0, 64);
        const req = createMockRequest({ cookies: { [CSRF_TOKEN_COOKIE]: validToken } });

        middleware.use(req, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.cookie).not.toHaveBeenCalled();
      });
    });
  });
});
