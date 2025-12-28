import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { ThrottlerTestAwareGuard } from '@/common/guards/throttler-test-aware.guard';
import { AuthController } from './auth.controller';
import { AuthService, AuthResponse, AuthTokens } from './auth.service';
import { TwoFactorAuthService } from './services/two-factor-auth.service';
import { TwoFactorAuthService as SecurityTwoFactorAuthService } from '../security/services/two-factor-auth.service';
import { SessionService } from './services/session.service';
import { CookieService } from './services/cookie.service';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { IpWhitelistGuard } from './guards/ip-whitelist.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockTwoFactorAuthService: jest.Mocked<TwoFactorAuthService>;
  let mockSecurityTwoFactorAuthService: jest.Mocked<SecurityTwoFactorAuthService>;
  let mockSessionService: jest.Mocked<SessionService>;
  let mockCookieService: jest.Mocked<CookieService>;
  let mockConfigService: jest.Mocked<ConfigService>;

  const mockUser: Partial<User> = {
    id: 'user-123',
    email: 'test@example.com',
    full_name: 'Test User',
    role: UserRole.OPERATOR,
    status: UserStatus.ACTIVE,
    is_2fa_enabled: false,
    requires_password_change: false,
  };

  const mockRequest = (overrides?: Partial<Request>): Request => {
    return {
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
      headers: { 'user-agent': 'test-agent' },
      cookies: {},
      ...overrides,
    } as Request;
  };

  const mockResponse = (): Response => {
    return {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as unknown as Response;
  };

  beforeEach(async () => {
    mockAuthService = {
      login: jest.fn(),
      register: jest.fn(),
      refreshTokens: jest.fn(),
      logout: jest.fn(),
      requestPasswordReset: jest.fn(),
      validateResetToken: jest.fn(),
      resetPassword: jest.fn(),
      firstLoginChangePassword: jest.fn(),
      complete2FALogin: jest.fn(),
    } as any;

    mockTwoFactorAuthService = {
      generateSecret: jest.fn(),
      enable2FA: jest.fn(),
      disable2FA: jest.fn(),
      verifyToken: jest.fn(),
    } as any;

    mockSecurityTwoFactorAuthService = {
      generateSecret: jest.fn(),
      verifyToken: jest.fn(),
      enable2FA: jest.fn(),
      disable2FA: jest.fn(),
      generateBackupCodes: jest.fn(),
      verifyBackupCode: jest.fn(),
    } as any;

    mockSessionService = {
      getActiveSessions: jest.fn(),
      getAllSessions: jest.fn(),
      revokeSession: jest.fn(),
      revokeOtherSessions: jest.fn(),
    } as any;

    mockCookieService = {
      setAuthCookies: jest.fn(),
      setAccessTokenCookie: jest.fn(),
      clearAuthCookies: jest.fn(),
    } as any;

    mockConfigService = {
      get: jest.fn().mockReturnValue('test-value'),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: TwoFactorAuthService, useValue: mockTwoFactorAuthService },
        { provide: SecurityTwoFactorAuthService, useValue: mockSecurityTwoFactorAuthService },
        { provide: SessionService, useValue: mockSessionService },
        { provide: CookieService, useValue: mockCookieService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    })
      .overrideGuard(ThrottlerTestAwareGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(LocalAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(IpWhitelistGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return auth response on successful login', async () => {
      const mockAuthResponse: AuthResponse = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          full_name: 'Test User',
          role: UserRole.OPERATOR,
        },
      };
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const res = mockResponse();
      const result = await controller.login(
        { email: 'test@example.com', password: 'password' },
        mockUser as User,
        mockRequest(),
        res,
      );

      expect(result).toEqual(mockAuthResponse);
      expect(mockAuthService.login).toHaveBeenCalledWith(mockUser, '127.0.0.1', 'test-agent');
      expect(mockCookieService.setAuthCookies).toHaveBeenCalled();
    });

    it('should return requires_2fa when 2FA is enabled', async () => {
      const mockAuthResponse: AuthResponse = {
        access_token: 'temp-access',
        refresh_token: 'temp-refresh',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          full_name: 'Test User',
          role: UserRole.OPERATOR,
        },
        requires_2fa: true,
      };
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const res = mockResponse();
      const result = await controller.login(
        { email: 'test@example.com', password: 'password' },
        mockUser as User,
        mockRequest(),
        res,
      );

      expect(result.requires_2fa).toBe(true);
    });

    it('should return requires_password_change for first login', async () => {
      const mockAuthResponse: AuthResponse = {
        access_token: 'temp-access',
        refresh_token: 'temp-refresh',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          full_name: 'Test User',
          role: UserRole.OPERATOR,
        },
        requires_password_change: true,
      };
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const res = mockResponse();
      const result = await controller.login(
        { email: 'test@example.com', password: 'password' },
        mockUser as User,
        mockRequest(),
        res,
      );

      expect(result.requires_password_change).toBe(true);
    });

    it('should handle missing IP address', async () => {
      const mockAuthResponse: AuthResponse = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          full_name: 'Test User',
          role: UserRole.OPERATOR,
        },
      };
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const req = mockRequest({ ip: undefined, socket: { remoteAddress: undefined } } as any);
      const res = mockResponse();

      await controller.login(
        { email: 'test@example.com', password: 'password' },
        mockUser as User,
        req,
        res,
      );

      expect(mockAuthService.login).toHaveBeenCalledWith(mockUser, '0.0.0.0', 'test-agent');
    });

    it('should fallback to socket.remoteAddress when ip is undefined', async () => {
      const mockAuthResponse: AuthResponse = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          full_name: 'Test User',
          role: UserRole.OPERATOR,
        },
      };
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const req = mockRequest({ ip: undefined, socket: { remoteAddress: '192.168.1.100' } } as any);
      const res = mockResponse();

      await controller.login(
        { email: 'test@example.com', password: 'password' },
        mockUser as User,
        req,
        res,
      );

      expect(mockAuthService.login).toHaveBeenCalledWith(mockUser, '192.168.1.100', 'test-agent');
    });
  });

  describe('register', () => {
    it('should register new user', async () => {
      const mockAuthResponse: AuthResponse = {
        success: true,
        message: 'Registration successful',
        user: {
          id: 'new-user-123',
          email: 'new@example.com',
          full_name: 'New User',
          role: UserRole.VIEWER,
          status: UserStatus.PENDING,
        },
      };
      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      const res = mockResponse();
      const result = await controller.register(
        {
          email: 'new@example.com',
          password: 'password123',
          full_name: 'New User',
        },
        mockRequest(),
        res,
      );

      expect(result.success).toBe(true);
      expect(mockAuthService.register).toHaveBeenCalled();
    });

    it('should fallback to socket.remoteAddress when ip is undefined in register', async () => {
      const mockAuthResponse: AuthResponse = {
        success: true,
        message: 'Registration successful',
        user: {
          id: 'new-user-123',
          email: 'new@example.com',
          full_name: 'New User',
          role: UserRole.VIEWER,
        },
      };
      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      const req = mockRequest({ ip: undefined, socket: { remoteAddress: '10.0.0.1' } } as any);
      const res = mockResponse();

      await controller.register(
        {
          email: 'new@example.com',
          password: 'password123',
          full_name: 'New User',
        },
        req,
        res,
      );

      expect(mockAuthService.register).toHaveBeenCalledWith(
        expect.anything(),
        '10.0.0.1',
        'test-agent',
      );
    });
  });

  describe('refresh', () => {
    it('should return new tokens on valid refresh', async () => {
      const mockTokens: AuthTokens = {
        access_token: 'new-access',
        refresh_token: 'new-refresh',
      };
      mockAuthService.refreshTokens.mockResolvedValue(mockTokens);

      const req = mockRequest();
      const res = mockResponse();
      const result = await controller.refresh({ refreshToken: 'old-refresh' }, req, res);

      expect(result).toEqual(mockTokens);
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith('old-refresh');
      expect(mockCookieService.setAuthCookies).toHaveBeenCalled();
    });

    it('should use refresh token from cookie if available', async () => {
      const mockTokens: AuthTokens = {
        access_token: 'new-access',
        refresh_token: 'new-refresh',
      };
      mockAuthService.refreshTokens.mockResolvedValue(mockTokens);

      const req = mockRequest({ cookies: { refresh_token: 'cookie-refresh' } } as any);
      const res = mockResponse();

      await controller.refresh({ refreshToken: 'body-refresh' }, req, res);

      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith('cookie-refresh');
    });
  });

  describe('logout', () => {
    it('should call logout service and clear cookies', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const res = mockResponse();
      await controller.logout(mockUser as User, mockRequest(), res);

      expect(mockAuthService.logout).toHaveBeenCalledWith('user-123', '127.0.0.1');
      expect(mockCookieService.clearAuthCookies).toHaveBeenCalled();
    });

    it('should fallback to socket.remoteAddress when ip is undefined in logout', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const req = mockRequest({ ip: undefined, socket: { remoteAddress: '172.16.0.1' } } as any);
      const res = mockResponse();

      await controller.logout(mockUser as User, req, res);

      expect(mockAuthService.logout).toHaveBeenCalledWith('user-123', '172.16.0.1');
    });
  });

  describe('getProfile', () => {
    it('should return current user', () => {
      const result = controller.getProfile(mockUser as User);

      expect(result).toEqual(mockUser);
    });
  });

  describe('requestPasswordReset', () => {
    it('should request password reset', async () => {
      const mockResponse = {
        success: true,
        message: 'If email exists, reset email sent',
      };
      mockAuthService.requestPasswordReset.mockResolvedValue(mockResponse);

      const result = await controller.requestPasswordReset(
        { email: 'test@example.com' },
        mockRequest(),
      );

      expect(result.success).toBe(true);
      expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith(
        'test@example.com',
        '127.0.0.1',
        'test-agent',
      );
    });

    it('should use fallback IP in requestPasswordReset', async () => {
      const mockResponse = { success: true, message: 'sent' };
      mockAuthService.requestPasswordReset.mockResolvedValue(mockResponse);

      const req = mockRequest({ ip: undefined, socket: { remoteAddress: '10.0.0.5' } } as any);

      await controller.requestPasswordReset({ email: 'test@example.com' }, req);

      expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith(
        'test@example.com',
        '10.0.0.5',
        'test-agent',
      );
    });

    it('should use default IP 0.0.0.0 when both ip and socket.remoteAddress are undefined', async () => {
      const mockResponse = { success: true, message: 'sent' };
      mockAuthService.requestPasswordReset.mockResolvedValue(mockResponse);

      const req = mockRequest({ ip: undefined, socket: { remoteAddress: undefined } } as any);

      await controller.requestPasswordReset({ email: 'test@example.com' }, req);

      expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith(
        'test@example.com',
        '0.0.0.0',
        'test-agent',
      );
    });
  });

  describe('validateResetToken', () => {
    it('should return valid for valid token', async () => {
      mockAuthService.validateResetToken.mockResolvedValue({ valid: true });

      const result = await controller.validateResetToken({ token: 'valid-token' });

      expect(result.valid).toBe(true);
    });

    it('should return invalid with message for expired token', async () => {
      mockAuthService.validateResetToken.mockResolvedValue({
        valid: false,
        message: 'Token expired',
      });

      const result = await controller.validateResetToken({ token: 'expired-token' });

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Token expired');
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const mockResponse = {
        success: true,
        message: 'Password reset successful',
      };
      mockAuthService.resetPassword.mockResolvedValue(mockResponse);

      const result = await controller.resetPassword(
        { token: 'valid-token', newPassword: 'new-password' },
        mockRequest(),
      );

      expect(result.success).toBe(true);
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
        'valid-token',
        'new-password',
        '127.0.0.1',
        'test-agent',
      );
    });

    it('should use fallback IP in resetPassword', async () => {
      const mockResponse = { success: true, message: 'reset' };
      mockAuthService.resetPassword.mockResolvedValue(mockResponse);

      const req = mockRequest({ ip: undefined, socket: { remoteAddress: '10.0.0.6' } } as any);

      await controller.resetPassword({ token: 'token', newPassword: 'pass' }, req);

      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
        'token',
        'pass',
        '10.0.0.6',
        'test-agent',
      );
    });
  });

  describe('firstLoginChangePassword', () => {
    it('should change password on first login', async () => {
      const mockAuthResponse: AuthResponse = {
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          full_name: 'Test User',
          role: UserRole.OPERATOR,
        },
      };
      mockAuthService.firstLoginChangePassword.mockResolvedValue(mockAuthResponse);

      const res = mockResponse();
      const result = await controller.firstLoginChangePassword(
        mockUser as User,
        { currentPassword: 'old-pass', newPassword: 'new-pass' },
        mockRequest(),
        res,
      );

      expect(result.access_token).toBe('new-access');
      expect(mockAuthService.firstLoginChangePassword).toHaveBeenCalledWith(
        'user-123',
        'old-pass',
        'new-pass',
        '127.0.0.1',
        'test-agent',
      );
      expect(mockCookieService.setAuthCookies).toHaveBeenCalled();
    });

    it('should use fallback IP in firstLoginChangePassword', async () => {
      const mockAuthResponse: AuthResponse = {
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          full_name: 'Test User',
          role: UserRole.OPERATOR,
        },
      };
      mockAuthService.firstLoginChangePassword.mockResolvedValue(mockAuthResponse);

      const req = mockRequest({ ip: undefined, socket: { remoteAddress: '10.0.0.7' } } as any);
      const res = mockResponse();

      await controller.firstLoginChangePassword(
        mockUser as User,
        { currentPassword: 'old', newPassword: 'new' },
        req,
        res,
      );

      expect(mockAuthService.firstLoginChangePassword).toHaveBeenCalledWith(
        'user-123',
        'old',
        'new',
        '10.0.0.7',
        'test-agent',
      );
    });
  });

  describe('setup2FA', () => {
    it('should return QR code and secret', async () => {
      const mockSetup = {
        secret: 'JBSWY3DPEHPK3PXP',
        qrCode: 'data:image/png;base64,...',
        manualEntryKey: 'JBSW Y3DP EHPK 3PXP',
      };
      mockTwoFactorAuthService.generateSecret.mockResolvedValue(mockSetup);

      const result = await controller.setup2FA(mockUser as User);

      expect(result.secret).toBe(mockSetup.secret);
      expect(result.qrCode).toBe(mockSetup.qrCode);
      expect(mockTwoFactorAuthService.generateSecret).toHaveBeenCalledWith('user-123');
    });
  });

  describe('enable2FA', () => {
    it('should enable 2FA successfully', async () => {
      const mockResponse = { success: true, message: '2FA enabled' };
      mockTwoFactorAuthService.enable2FA.mockResolvedValue(mockResponse);

      const result = await controller.enable2FA(
        mockUser as User,
        { secret: 'secret', token: '123456' },
        mockRequest(),
      );

      expect(result.success).toBe(true);
      expect(mockTwoFactorAuthService.enable2FA).toHaveBeenCalledWith(
        'user-123',
        'secret',
        '123456',
        '127.0.0.1',
      );
    });

    it('should use fallback IP in enable2FA', async () => {
      const mockResponse = { success: true, message: '2FA enabled' };
      mockTwoFactorAuthService.enable2FA.mockResolvedValue(mockResponse);

      const req = mockRequest({ ip: undefined, socket: { remoteAddress: '10.0.0.8' } } as any);

      await controller.enable2FA(mockUser as User, { secret: 's', token: '123' }, req);

      expect(mockTwoFactorAuthService.enable2FA).toHaveBeenCalledWith(
        'user-123',
        's',
        '123',
        '10.0.0.8',
      );
    });
  });

  describe('disable2FA', () => {
    it('should disable 2FA successfully', async () => {
      const mockResponse = { success: true, message: '2FA disabled' };
      mockTwoFactorAuthService.disable2FA.mockResolvedValue(mockResponse);

      const result = await controller.disable2FA(
        mockUser as User,
        { token: '123456' },
        mockRequest(),
      );

      expect(result.success).toBe(true);
      expect(mockTwoFactorAuthService.disable2FA).toHaveBeenCalledWith(
        'user-123',
        '123456',
        '127.0.0.1',
      );
    });

    it('should use fallback IP in disable2FA', async () => {
      const mockResponse = { success: true, message: '2FA disabled' };
      mockTwoFactorAuthService.disable2FA.mockResolvedValue(mockResponse);

      const req = mockRequest({ ip: undefined, socket: { remoteAddress: '10.0.0.9' } } as any);

      await controller.disable2FA(mockUser as User, { token: '123' }, req);

      expect(mockTwoFactorAuthService.disable2FA).toHaveBeenCalledWith(
        'user-123',
        '123',
        '10.0.0.9',
      );
    });
  });

  describe('verify2FA', () => {
    it('should return valid for correct token', async () => {
      mockTwoFactorAuthService.verifyToken.mockResolvedValue(true);

      const result = await controller.verify2FA(
        mockUser as User,
        { token: '123456' },
        mockRequest(),
      );

      expect(result.valid).toBe(true);
      expect(result.message).toBe('Код подтвержден');
    });

    it('should return invalid for incorrect token', async () => {
      mockTwoFactorAuthService.verifyToken.mockResolvedValue(false);

      const result = await controller.verify2FA(
        mockUser as User,
        { token: '000000' },
        mockRequest(),
      );

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Неверный код');
    });

    it('should use fallback IP in verify2FA', async () => {
      mockTwoFactorAuthService.verifyToken.mockResolvedValue(true);

      const req = mockRequest({ ip: undefined, socket: { remoteAddress: '10.0.0.10' } } as any);

      await controller.verify2FA(mockUser as User, { token: '123' }, req);

      expect(mockTwoFactorAuthService.verifyToken).toHaveBeenCalledWith(
        'user-123',
        '123',
        '10.0.0.10',
      );
    });
  });

  describe('complete2FALogin', () => {
    it('should complete login after 2FA verification', async () => {
      const mockAuthResponse: AuthResponse = {
        access_token: 'full-access',
        refresh_token: 'full-refresh',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          full_name: 'Test User',
          role: UserRole.OPERATOR,
        },
      };
      mockTwoFactorAuthService.verifyToken.mockResolvedValue(true);
      mockAuthService.complete2FALogin.mockResolvedValue(mockAuthResponse);

      const res = mockResponse();
      const result = await controller.complete2FALogin(
        mockUser as User,
        { token: '123456' },
        mockRequest(),
        res,
      );

      expect(result.access_token).toBe('full-access');
      expect(mockAuthService.complete2FALogin).toHaveBeenCalledWith(
        'user-123',
        '123456',
        '127.0.0.1',
        'test-agent',
      );
      expect(mockCookieService.setAuthCookies).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid 2FA token', async () => {
      // LOW-001: 2FA validation now happens inside AuthService.complete2FALogin
      mockAuthService.complete2FALogin.mockRejectedValue(
        new BadRequestException('Неверный код двухфакторной аутентификации'),
      );

      const res = mockResponse();
      await expect(
        controller.complete2FALogin(mockUser as User, { token: '000000' }, mockRequest(), res),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use fallback IP in complete2FALogin', async () => {
      const mockAuthResponse: AuthResponse = {
        access_token: 'full-access',
        refresh_token: 'full-refresh',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          full_name: 'Test User',
          role: UserRole.OPERATOR,
        },
      };
      // LOW-001: 2FA validation now happens inside AuthService.complete2FALogin
      mockAuthService.complete2FALogin.mockResolvedValue(mockAuthResponse);

      const req = mockRequest({ ip: undefined, socket: { remoteAddress: '10.0.0.11' } } as any);
      const res = mockResponse();

      await controller.complete2FALogin(mockUser as User, { token: '123456' }, req, res);

      // Verify that AuthService.complete2FALogin is called with the correct fallback IP
      // (2FA token verification is now internal to the service)
      expect(mockAuthService.complete2FALogin).toHaveBeenCalledWith(
        'user-123',
        '123456',
        '10.0.0.11',
        'test-agent',
      );
    });
  });

  describe('getActiveSessions', () => {
    it('should return active sessions', async () => {
      const mockSessions = [
        { id: 'session-1', ip_address: '127.0.0.1' },
        { id: 'session-2', ip_address: '192.168.1.1' },
      ] as any;
      mockSessionService.getActiveSessions.mockResolvedValue(mockSessions);

      const result = await controller.getActiveSessions(mockUser as User);

      expect(result).toEqual(mockSessions);
      expect(mockSessionService.getActiveSessions).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getAllSessions', () => {
    it('should return all sessions', async () => {
      const mockSessions = [
        { id: 'session-1', is_active: true },
        { id: 'session-2', is_active: false },
      ] as any;
      mockSessionService.getAllSessions.mockResolvedValue(mockSessions);

      const result = await controller.getAllSessions(mockUser as User);

      expect(result).toEqual(mockSessions);
      expect(mockSessionService.getAllSessions).toHaveBeenCalledWith('user-123');
    });
  });

  describe('revokeSession', () => {
    it('should revoke specific session', async () => {
      mockSessionService.revokeSession.mockResolvedValue(undefined);

      await controller.revokeSession('session-123', mockUser as User);

      expect(mockSessionService.revokeSession).toHaveBeenCalledWith(
        'session-123',
        'revoked_by_user',
      );
    });
  });

  describe('revokeOtherSessions', () => {
    it('should revoke all other sessions', async () => {
      mockSessionService.revokeOtherSessions.mockResolvedValue(3);

      const result = await controller.revokeOtherSessions(mockUser as User, {
        currentRefreshToken: 'current-refresh',
      });

      expect(result.revoked).toBe(3);
      expect(mockSessionService.revokeOtherSessions).toHaveBeenCalledWith(
        'user-123',
        'current-refresh',
      );
    });
  });
});
