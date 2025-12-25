import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import {
  ClientAuthGuard,
  CurrentClientUser,
  Public,
  IS_PUBLIC_KEY,
} from './client-auth.guard';

describe('ClientAuthGuard', () => {
  let guard: ClientAuthGuard;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let reflector: Reflector;

  const mockJwtService = {
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientAuthGuard,
        Reflector,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    guard = module.get<ClientAuthGuard>(ClientAuthGuard);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    reflector = module.get<Reflector>(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (
    headers: Record<string, string> = {},
    requestExtras: Record<string, any> = {},
  ): ExecutionContext => {
    const request = {
      headers,
      ...requestExtras,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  describe('canActivate', () => {
    describe('public endpoints', () => {
      it('should allow access to public endpoints', async () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
        const context = createMockExecutionContext();

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(jwtService.verify).not.toHaveBeenCalled();
      });
    });

    describe('token extraction', () => {
      it('should throw UnauthorizedException when no token provided', async () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
        const context = createMockExecutionContext({});

        await expect(guard.canActivate(context)).rejects.toThrow(
          UnauthorizedException,
        );
        await expect(guard.canActivate(context)).rejects.toThrow(
          'No authentication token provided',
        );
      });

      it('should throw UnauthorizedException when authorization header is not Bearer', async () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
        const context = createMockExecutionContext({
          authorization: 'Basic some-token',
        });

        await expect(guard.canActivate(context)).rejects.toThrow(
          'No authentication token provided',
        );
      });

      it('should extract token from Bearer authorization header', async () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
        mockConfigService.get.mockReturnValue('test-secret');
        mockJwtService.verify.mockReturnValue({
          sub: 'client-123',
          telegram_id: '123456789',
          type: 'client_access',
        });
        const context = createMockExecutionContext({
          authorization: 'Bearer valid-token',
        });

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(jwtService.verify).toHaveBeenCalledWith('valid-token', {
          secret: 'test-secret',
        });
      });
    });

    describe('token validation', () => {
      it('should throw UnauthorizedException for invalid token', async () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
        mockConfigService.get.mockReturnValue('test-secret');
        mockJwtService.verify.mockImplementation(() => {
          throw new Error('Invalid token');
        });
        const context = createMockExecutionContext({
          authorization: 'Bearer invalid-token',
        });

        await expect(guard.canActivate(context)).rejects.toThrow(
          UnauthorizedException,
        );
        await expect(guard.canActivate(context)).rejects.toThrow(
          'Invalid or expired token',
        );
      });

      it('should throw UnauthorizedException for expired token', async () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
        mockConfigService.get.mockReturnValue('test-secret');
        mockJwtService.verify.mockImplementation(() => {
          throw new Error('jwt expired');
        });
        const context = createMockExecutionContext({
          authorization: 'Bearer expired-token',
        });

        await expect(guard.canActivate(context)).rejects.toThrow(
          'Invalid or expired token',
        );
      });

      it('should throw UnauthorizedException for wrong token type', async () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
        mockConfigService.get.mockReturnValue('test-secret');
        mockJwtService.verify.mockReturnValue({
          sub: 'user-123',
          type: 'staff_access', // Wrong type - should be 'client_access'
        });
        const context = createMockExecutionContext({
          authorization: 'Bearer staff-token',
        });

        await expect(guard.canActivate(context)).rejects.toThrow(
          UnauthorizedException,
        );
        await expect(guard.canActivate(context)).rejects.toThrow(
          'Invalid or expired token',
        );
      });

      it('should throw UnauthorizedException for token without type', async () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
        mockConfigService.get.mockReturnValue('test-secret');
        mockJwtService.verify.mockReturnValue({
          sub: 'user-123',
          // No type field
        });
        const context = createMockExecutionContext({
          authorization: 'Bearer typeless-token',
        });

        await expect(guard.canActivate(context)).rejects.toThrow(
          'Invalid or expired token',
        );
      });
    });

    describe('successful authentication', () => {
      it('should attach clientUser to request on valid token', async () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
        mockConfigService.get.mockReturnValue('test-secret');
        mockJwtService.verify.mockReturnValue({
          sub: 'client-456',
          telegram_id: '987654321',
          type: 'client_access',
        });
        const request: Record<string, any> = {
          headers: { authorization: 'Bearer valid-token' },
        };
        const context = {
          switchToHttp: () => ({
            getRequest: () => request,
          }),
          getHandler: () => jest.fn(),
          getClass: () => jest.fn(),
        } as unknown as ExecutionContext;

        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(request.clientUser).toEqual({
          id: 'client-456',
          telegram_id: '987654321',
        });
      });
    });
  });
});

describe('Public decorator', () => {
  it('should return a function that sets metadata', async () => {
    const decorator = await Public();
    expect(typeof decorator).toBe('function');
  });
});

describe('CurrentClientUser decorator', () => {
  it('should be a param decorator', () => {
    // CurrentClientUser is created by createParamDecorator
    // We just verify it exists and is callable
    expect(CurrentClientUser).toBeDefined();
    expect(typeof CurrentClientUser).toBe('function');
  });
});

describe('IS_PUBLIC_KEY constant', () => {
  it('should be defined', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });
});
