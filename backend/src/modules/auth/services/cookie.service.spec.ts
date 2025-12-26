import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { CookieService } from './cookie.service';

describe('CookieService', () => {
  let service: CookieService;
  let configService: jest.Mocked<ConfigService>;
  let mockResponse: jest.Mocked<Response>;

  // Store original env
  const originalEnv = { ...process.env };

  const createService = async (configOverrides: Record<string, any> = {}) => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CookieService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                NODE_ENV: 'development',
                COOKIE_DOMAIN: undefined,
                COOKIE_SAME_SITE: 'strict',
                JWT_ACCESS_EXPIRATION: '15m',
                JWT_REFRESH_EXPIRATION: '7d',
                ...configOverrides,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    return module.get<CookieService>(CookieService);
  };

  beforeEach(async () => {
    // Reset env before each test
    process.env = { ...originalEnv };
    delete process.env.COOKIE_SAME_SITE;

    mockResponse = {
      cookie: jest.fn(),
    } as unknown as jest.Mocked<Response>;

    service = await createService();
    configService = {
      get: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Restore original env
    process.env = { ...originalEnv };
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should set cookie names', () => {
      expect(service.ACCESS_TOKEN_COOKIE).toBe('access_token');
      expect(service.REFRESH_TOKEN_COOKIE).toBe('refresh_token');
    });

    it('should use strict sameSite by default', async () => {
      const svc = await createService({ COOKIE_SAME_SITE: undefined });
      const options = svc.getAccessTokenCookieOptions();
      expect(options.sameSite).toBe('strict');
    });

    it('should use lax sameSite when configured', async () => {
      process.env.COOKIE_SAME_SITE = 'lax';
      const svc = await createService({ COOKIE_SAME_SITE: 'lax' });
      const options = svc.getAccessTokenCookieOptions();
      expect(options.sameSite).toBe('lax');
    });

    it('should use none sameSite when configured', async () => {
      process.env.COOKIE_SAME_SITE = 'none';
      const svc = await createService({ COOKIE_SAME_SITE: 'none' });
      const options = svc.getAccessTokenCookieOptions();
      expect(options.sameSite).toBe('none');
      expect(options.secure).toBe(true); // Must be secure when sameSite is none
    });

    it('should default to strict for invalid sameSite values', async () => {
      process.env.COOKIE_SAME_SITE = 'invalid';
      const svc = await createService({ COOKIE_SAME_SITE: 'invalid' });
      const options = svc.getAccessTokenCookieOptions();
      expect(options.sameSite).toBe('strict');
    });

    it('should detect production environment', async () => {
      const svc = await createService({ NODE_ENV: 'production' });
      const options = svc.getAccessTokenCookieOptions();
      expect(options.secure).toBe(true);
    });

    it('should set cookie domain when configured', async () => {
      const svc = await createService({ COOKIE_DOMAIN: '.example.com' });
      const options = svc.getAccessTokenCookieOptions();
      expect(options.domain).toBe('.example.com');
    });

    it('should prefer process.env over ConfigService', async () => {
      process.env.COOKIE_SAME_SITE = 'none';
      const svc = await createService({ COOKIE_SAME_SITE: 'strict' });
      const options = svc.getAccessTokenCookieOptions();
      expect(options.sameSite).toBe('none');
    });

    it('should handle flexible key lookup for COOKIE_SAME_SITE', async () => {
      // Simulate key with different casing (unlikely but tested)
      process.env.COOKIE_SAME_SITE = 'lax';
      const svc = await createService({});
      const options = svc.getAccessTokenCookieOptions();
      expect(options.sameSite).toBe('lax');
    });

    it('should handle sameSite with uppercase value', async () => {
      process.env.COOKIE_SAME_SITE = 'NONE';
      const svc = await createService({ COOKIE_SAME_SITE: 'NONE' });
      const options = svc.getAccessTokenCookieOptions();
      expect(options.sameSite).toBe('none');
    });

    it('should handle sameSite with whitespace', async () => {
      process.env.COOKIE_SAME_SITE = '  lax  ';
      const svc = await createService({ COOKIE_SAME_SITE: '  lax  ' });
      const options = svc.getAccessTokenCookieOptions();
      expect(options.sameSite).toBe('lax');
    });
  });

  describe('getAccessTokenCookieOptions', () => {
    it('should return correct base options', async () => {
      const svc = await createService();
      const options = svc.getAccessTokenCookieOptions();

      expect(options.httpOnly).toBe(true);
      expect(options.path).toBe('/');
      expect(options.sameSite).toBe('strict');
    });

    it('should use configured expiration', async () => {
      const svc = await createService({ JWT_ACCESS_EXPIRATION: '30m' });
      const options = svc.getAccessTokenCookieOptions();

      expect(options.maxAge).toBe(30 * 60 * 1000); // 30 minutes
    });

    it('should default to 15m expiration', async () => {
      const svc = await createService({ JWT_ACCESS_EXPIRATION: undefined });
      const options = svc.getAccessTokenCookieOptions();

      expect(options.maxAge).toBe(15 * 60 * 1000); // 15 minutes
    });

    it('should parse seconds expiration', async () => {
      const svc = await createService({ JWT_ACCESS_EXPIRATION: '30s' });
      const options = svc.getAccessTokenCookieOptions();

      expect(options.maxAge).toBe(30 * 1000);
    });

    it('should parse hours expiration', async () => {
      const svc = await createService({ JWT_ACCESS_EXPIRATION: '2h' });
      const options = svc.getAccessTokenCookieOptions();

      expect(options.maxAge).toBe(2 * 60 * 60 * 1000);
    });

    it('should parse days expiration', async () => {
      const svc = await createService({ JWT_ACCESS_EXPIRATION: '1d' });
      const options = svc.getAccessTokenCookieOptions();

      expect(options.maxAge).toBe(24 * 60 * 60 * 1000);
    });

    it('should default to 15m for invalid expiration format', async () => {
      const svc = await createService({ JWT_ACCESS_EXPIRATION: 'invalid' });
      const options = svc.getAccessTokenCookieOptions();

      expect(options.maxAge).toBe(15 * 60 * 1000);
    });

    it('should not be secure in development', async () => {
      const svc = await createService({ NODE_ENV: 'development' });
      const options = svc.getAccessTokenCookieOptions();

      expect(options.secure).toBe(false);
    });

    it('should be secure in production', async () => {
      const svc = await createService({ NODE_ENV: 'production' });
      const options = svc.getAccessTokenCookieOptions();

      expect(options.secure).toBe(true);
    });
  });

  describe('getRefreshTokenCookieOptions', () => {
    it('should return correct base options', async () => {
      const svc = await createService();
      const options = svc.getRefreshTokenCookieOptions();

      expect(options.httpOnly).toBe(true);
      expect(options.path).toBe('/api/v1/auth'); // Restricted path
      expect(options.sameSite).toBe('strict');
    });

    it('should use configured expiration', async () => {
      const svc = await createService({ JWT_REFRESH_EXPIRATION: '14d' });
      const options = svc.getRefreshTokenCookieOptions();

      expect(options.maxAge).toBe(14 * 24 * 60 * 60 * 1000); // 14 days
    });

    it('should default to 7d expiration', async () => {
      const svc = await createService({ JWT_REFRESH_EXPIRATION: undefined });
      const options = svc.getRefreshTokenCookieOptions();

      expect(options.maxAge).toBe(7 * 24 * 60 * 60 * 1000); // 7 days
    });
  });

  describe('setAuthCookies', () => {
    it('should set both access and refresh token cookies', async () => {
      const svc = await createService();
      svc.setAuthCookies(mockResponse, 'access-token-123', 'refresh-token-456');

      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'access_token',
        'access-token-123',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
        }),
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-token-456',
        expect.objectContaining({
          httpOnly: true,
          path: '/api/v1/auth',
        }),
      );
    });
  });

  describe('setAccessTokenCookie', () => {
    it('should set only access token cookie', async () => {
      const svc = await createService();
      svc.setAccessTokenCookie(mockResponse, 'new-access-token');

      expect(mockResponse.cookie).toHaveBeenCalledTimes(1);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'access_token',
        'new-access-token',
        expect.objectContaining({
          httpOnly: true,
          path: '/',
        }),
      );
    });
  });

  describe('clearAuthCookies', () => {
    it('should clear both cookies with maxAge 0', async () => {
      const svc = await createService();
      svc.clearAuthCookies(mockResponse);

      expect(mockResponse.cookie).toHaveBeenCalledTimes(2);
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'access_token',
        '',
        expect.objectContaining({
          maxAge: 0,
          path: '/',
        }),
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        '',
        expect.objectContaining({
          maxAge: 0,
          path: '/api/v1/auth',
        }),
      );
    });
  });

  describe('parseExpiration (private)', () => {
    it('should handle all time units via public methods', async () => {
      // Seconds
      let svc = await createService({ JWT_ACCESS_EXPIRATION: '60s' });
      expect(svc.getAccessTokenCookieOptions().maxAge).toBe(60000);

      // Minutes
      svc = await createService({ JWT_ACCESS_EXPIRATION: '5m' });
      expect(svc.getAccessTokenCookieOptions().maxAge).toBe(300000);

      // Hours
      svc = await createService({ JWT_ACCESS_EXPIRATION: '1h' });
      expect(svc.getAccessTokenCookieOptions().maxAge).toBe(3600000);

      // Days
      svc = await createService({ JWT_ACCESS_EXPIRATION: '2d' });
      expect(svc.getAccessTokenCookieOptions().maxAge).toBe(172800000);
    });

    it('should handle invalid format', async () => {
      const svc = await createService({ JWT_ACCESS_EXPIRATION: 'abc' });
      expect(svc.getAccessTokenCookieOptions().maxAge).toBe(900000); // 15m default
    });

    it('should handle empty string', async () => {
      const svc = await createService({ JWT_ACCESS_EXPIRATION: '' });
      expect(svc.getAccessTokenCookieOptions().maxAge).toBe(900000); // 15m default
    });

    it('should handle number without unit', async () => {
      const svc = await createService({ JWT_ACCESS_EXPIRATION: '123' });
      expect(svc.getAccessTokenCookieOptions().maxAge).toBe(900000); // 15m default
    });

    it('should handle large values', async () => {
      const svc = await createService({ JWT_ACCESS_EXPIRATION: '365d' });
      expect(svc.getAccessTokenCookieOptions().maxAge).toBe(365 * 24 * 60 * 60 * 1000);
    });
  });

  describe('security configurations', () => {
    it('should enforce secure=true when sameSite=none', async () => {
      process.env.COOKIE_SAME_SITE = 'none';
      const svc = await createService({
        NODE_ENV: 'development',
        COOKIE_SAME_SITE: 'none',
      });
      const options = svc.getAccessTokenCookieOptions();

      expect(options.sameSite).toBe('none');
      expect(options.secure).toBe(true); // Must be true even in development
    });

    it('should work with all sameSite values in production', async () => {
      // Strict
      process.env.COOKIE_SAME_SITE = 'strict';
      let svc = await createService({ NODE_ENV: 'production', COOKIE_SAME_SITE: 'strict' });
      expect(svc.getAccessTokenCookieOptions().sameSite).toBe('strict');

      // Lax
      process.env.COOKIE_SAME_SITE = 'lax';
      svc = await createService({ NODE_ENV: 'production', COOKIE_SAME_SITE: 'lax' });
      expect(svc.getAccessTokenCookieOptions().sameSite).toBe('lax');

      // None
      process.env.COOKIE_SAME_SITE = 'none';
      svc = await createService({ NODE_ENV: 'production', COOKIE_SAME_SITE: 'none' });
      expect(svc.getAccessTokenCookieOptions().sameSite).toBe('none');
    });
  });
});
