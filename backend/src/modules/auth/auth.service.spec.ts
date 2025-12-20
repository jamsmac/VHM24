import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
// import type { Repository } from 'typeorm'; - not currently used
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { createMockJwtService, createMockConfigService } from '@/test/helpers';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { AuditLogService } from '../security/services/audit-log.service';
import { EmailService } from '../email/email.service';
import { SessionService } from './services/session.service';
import { TokenBlacklistService } from './services/token-blacklist.service';

// Note: Test files use simplified mock types with 'unknown' casting for flexibility
// This is a standard Jest pattern that prioritizes test maintainability over strict typing

// Simplified mock types for test flexibility
type MockUsersService = Partial<jest.Mocked<UsersService>>;
type MockAuditLogService = Partial<jest.Mocked<AuditLogService>>;
type MockSessionService = Partial<jest.Mocked<SessionService>>;
type MockEmailService = Partial<jest.Mocked<EmailService>>;
type MockPasswordResetTokenRepository = Record<string, jest.Mock>;
type MockTokenBlacklistService = Partial<jest.Mocked<TokenBlacklistService>>;

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

// Set required environment variables for tests
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: JwtService;
  let _configService: ConfigService;
  let auditLogService: jest.Mocked<AuditLogService>;
  let sessionService: jest.Mocked<SessionService>;
  let emailService: jest.Mocked<EmailService>;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    full_name: 'Test User',
    password_hash: 'hashed_password',
    role: UserRole.OPERATOR,
    status: UserStatus.ACTIVE,
    username: 'testuser',
    phone: null,
    password_changed_by_user: false,
    approved_by_id: null,
    approved_at: null,
    rejected_by_id: null,
    rejected_at: null,
    rejection_reason: null,
    telegram_user_id: null,
    telegram_username: null,
    is_2fa_enabled: false,
    two_fa_secret: null,
    last_login_at: null,
    last_login_ip: null,
    refresh_token: null,
    failed_login_attempts: 0,
    account_locked_until: null,
    last_failed_login_at: null,
    settings: null,
    ip_whitelist_enabled: false,
    allowed_ips: null,
    requires_password_change: false,
    roles: [],
    isLocked: false,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    created_by_id: null,
    updated_by_id: null,
  };

  beforeEach(async () => {
    const mockUsersService: MockUsersService = {
      findByEmail: jest.fn(),
      findOne: jest.fn(),
      findOneEntity: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      validatePassword: jest.fn(),
      updateRefreshToken: jest.fn(),
      updateLastLogin: jest.fn(),
      changePassword: jest.fn(),
      save: jest.fn(),
    };

    const mockAuditLogService: MockAuditLogService = {
      log: jest.fn().mockResolvedValue({}),
    };

    const mockSessionService: MockSessionService = {
      createSession: jest.fn(),
      getActiveSessions: jest.fn(),
      revokeSession: jest.fn(),
      revokeAllUserSessions: jest.fn(),
      findSessionByRefreshToken: jest.fn(),
      verifyRefreshToken: jest.fn(),
      rotateRefreshToken: jest.fn(),
    };

    const mockEmailService: MockEmailService = {
      sendPasswordResetEmail: jest.fn(),
    };

    const mockPasswordResetTokenRepository: MockPasswordResetTokenRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };

    const mockTokenBlacklistService: MockTokenBlacklistService = {
      isBlacklisted: jest.fn().mockResolvedValue(false),
      blacklistToken: jest.fn().mockResolvedValue(undefined),
      blacklistUserTokens: jest.fn().mockResolvedValue(undefined),
      shouldRejectToken: jest.fn().mockResolvedValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: createMockJwtService(),
        },
        {
          provide: ConfigService,
          useValue: createMockConfigService(),
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: mockPasswordResetTokenRepository,
        },
        {
          provide: TokenBlacklistService,
          useValue: mockTokenBlacklistService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService) as jest.Mocked<UsersService>;
    jwtService = module.get<JwtService>(JwtService);
    _configService = module.get<ConfigService>(ConfigService);
    auditLogService = module.get(AuditLogService) as jest.Mocked<AuditLogService>;
    sessionService = module.get(SessionService) as jest.Mocked<SessionService>;
    emailService = module.get(EmailService) as jest.Mocked<EmailService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // VALIDATE USER TESTS
  // ============================================================================

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      usersService.validatePassword.mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toEqual(mockUser);
      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(usersService.validatePassword).toHaveBeenCalledWith(mockUser, 'password123');
    });

    it('should return null when user not found', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password123');

      expect(result).toBeNull();
    });

    it('should return null when password is invalid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      usersService.validatePassword.mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });

    it('should track failed login attempt when password is invalid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      usersService.validatePassword.mockResolvedValue(false);
      usersService.findOneEntity.mockResolvedValue(mockUser);

      await service.validateUser('test@example.com', 'wrongpassword');

      expect(usersService.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          failed_login_attempts: 1,
          last_failed_login_at: expect.any(Date),
        }),
      );
    });

    it('should throw UnauthorizedException when account is locked', async () => {
      const lockedUntil = new Date();
      lockedUntil.setMinutes(lockedUntil.getMinutes() + 10);

      const lockedUser = {
        ...mockUser,
        account_locked_until: lockedUntil,
        isLocked: true,
      };

      usersService.findByEmail.mockResolvedValue(lockedUser);

      await expect(service.validateUser('test@example.com', 'password123')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return null when user status is not active', async () => {
      const inactiveUser = {
        ...mockUser,
        status: UserStatus.INACTIVE,
        isLocked: false,
      } as User;

      usersService.findByEmail.mockResolvedValue(inactiveUser);
      usersService.validatePassword.mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toBeNull();
    });

    it('should reset failed login attempts on successful login', async () => {
      const userWithFailedAttempts = {
        ...mockUser,
        failed_login_attempts: 3,
        isLocked: false,
      } as User;

      usersService.findByEmail.mockResolvedValue(userWithFailedAttempts);
      usersService.validatePassword.mockResolvedValue(true);

      await service.validateUser('test@example.com', 'password123');

      expect(usersService.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          failed_login_attempts: 0,
          account_locked_until: null,
          last_failed_login_at: null,
        }),
      );
    });

    it('should lock account after 5 failed attempts', async () => {
      const userWith4Attempts = {
        ...mockUser,
        failed_login_attempts: 4,
        isLocked: false,
      } as User;

      usersService.findByEmail.mockResolvedValue(userWith4Attempts);
      usersService.validatePassword.mockResolvedValue(false);
      usersService.findOneEntity.mockResolvedValue(userWith4Attempts);

      await service.validateUser('test@example.com', 'wrongpassword');

      expect(usersService.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          failed_login_attempts: 5,
          account_locked_until: expect.any(Date),
        }),
      );
    });
  });

  // ============================================================================
  // LOGIN TESTS
  // ============================================================================

  describe('login', () => {
    it('should generate tokens and return auth response', async () => {
      const mockTokens = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
      };

      (jwtService.signAsync as jest.Mock) = jest
        .fn()
        .mockResolvedValueOnce(mockTokens.access_token)
        .mockResolvedValueOnce(mockTokens.refresh_token);

      mockedBcrypt.hash.mockResolvedValue('hashed-refresh-token' as never);

      const result = await service.login(mockUser, '127.0.0.1');

      expect(result).toEqual({
        ...mockTokens,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          full_name: mockUser.full_name,
          role: mockUser.role,
        },
      });

      expect(sessionService.createSession).toHaveBeenCalledWith({
        userId: mockUser.id,
        refreshToken: mockTokens.refresh_token,
        ipAddress: '127.0.0.1',
        userAgent: undefined,
      });
      expect(usersService.updateLastLogin).toHaveBeenCalledWith(mockUser.id, '127.0.0.1');
    });

    it('should create session with refresh token', async () => {
      (jwtService.signAsync as jest.Mock) = jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      await service.login(mockUser, '127.0.0.1');

      expect(sessionService.createSession).toHaveBeenCalledWith({
        userId: mockUser.id,
        refreshToken: 'refresh-token',
        ipAddress: '127.0.0.1',
        userAgent: undefined,
      });
    });
  });

  // ============================================================================
  // REGISTER TESTS
  // ============================================================================

  describe('register', () => {
    it('should create new user with VIEWER role and pending status by default', async () => {
      const registerDto: RegisterDto = {
        email: 'newuser@example.com',
        password: 'password123',
        full_name: 'New User',
      };

      const newUserDto = {
        id: 'new-user-1',
        email: registerDto.email,
        full_name: registerDto.full_name,
        role: UserRole.VIEWER,
        status: UserStatus.PENDING,
      };

      const newUser = {
        ...mockUser,
        id: 'new-user-1',
        email: registerDto.email,
        full_name: registerDto.full_name,
        role: UserRole.VIEWER,
        status: UserStatus.PENDING,
        isLocked: false,
      } as User;

      usersService.create.mockResolvedValue(newUserDto as any);
      usersService.findOneEntity.mockResolvedValue(newUser as any);

      (jwtService.signAsync as jest.Mock) = jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      mockedBcrypt.hash.mockResolvedValue('hashed-refresh-token' as never);

      const result = await service.register(registerDto);

      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...registerDto,
          role: UserRole.VIEWER,
          status: UserStatus.PENDING,
        }),
      );

      expect(result.success).toBe(true);
      expect(result.user.role).toBe(UserRole.VIEWER);
      expect(result.user.status).toBe(UserStatus.PENDING);
      expect(result.message).toContain('Регистрация успешна');
    });

    it('should create session for new user', async () => {
      const registerDto: RegisterDto = {
        email: 'newuser@example.com',
        password: 'password123',
        full_name: 'New User',
      };

      const newUserDto = {
        id: 'new-user-1',
        email: registerDto.email,
        full_name: registerDto.full_name,
        role: UserRole.OPERATOR,
      };

      const newUser = { ...mockUser, id: 'new-user-1', isLocked: false } as User;

      usersService.create.mockResolvedValue(newUserDto as any);
      usersService.findOneEntity.mockResolvedValue(newUser as any);

      (jwtService.signAsync as jest.Mock) = jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      await service.register(registerDto);

      expect(sessionService.createSession).toHaveBeenCalledWith({
        userId: 'new-user-1',
        refreshToken: 'refresh-token',
        ipAddress: undefined,
        userAgent: undefined,
      });
    });
  });

  // ============================================================================
  // REFRESH TOKENS TESTS
  // ============================================================================

  describe('refreshTokens', () => {
    it('should generate new tokens with valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = { sub: mockUser.id, email: mockUser.email, role: mockUser.role };
      const mockSession = { id: 'session-1', user_id: mockUser.id, is_active: true };

      (jwtService.verify as jest.Mock).mockReturnValue(payload);
      usersService.findOneEntity.mockResolvedValue({ ...mockUser, isLocked: false } as any);
      sessionService.findSessionByRefreshToken.mockResolvedValue(mockSession as any);
      sessionService.verifyRefreshToken.mockResolvedValue(true);

      (jwtService.signAsync as jest.Mock) = jest
        .fn()
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await service.refreshTokens(refreshToken);

      expect(result).toEqual({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      });

      expect(jwtService.verify).toHaveBeenCalledWith(refreshToken, {
        secret: 'test-secret',
      });
      expect(sessionService.findSessionByRefreshToken).toHaveBeenCalledWith(refreshToken);
      expect(sessionService.verifyRefreshToken).toHaveBeenCalledWith(mockSession.id, refreshToken);
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      const refreshToken = 'invalid-refresh-token';

      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = {
        sub: 'non-existent-user',
        email: 'test@example.com',
        role: UserRole.OPERATOR,
      };

      (jwtService.verify as jest.Mock).mockReturnValue(payload);
      usersService.findOneEntity.mockResolvedValue(null as any);

      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when stored refresh token does not match', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = { sub: mockUser.id, email: mockUser.email, role: mockUser.role };

      const userWithRefreshToken = {
        ...mockUser,
        refresh_token: 'stored-hashed-refresh-token',
        isLocked: false,
      } as User;

      (jwtService.verify as jest.Mock).mockReturnValue(payload);
      usersService.findOneEntity.mockResolvedValue(userWithRefreshToken as any);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should update session with new refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = { sub: mockUser.id, email: mockUser.email, role: mockUser.role };
      const mockSession = { id: 'session-1', user_id: mockUser.id, is_active: true };

      (jwtService.verify as jest.Mock).mockReturnValue(payload);
      usersService.findOneEntity.mockResolvedValue({ ...mockUser, isLocked: false } as any);
      sessionService.findSessionByRefreshToken.mockResolvedValue(mockSession as any);
      sessionService.verifyRefreshToken.mockResolvedValue(true);

      (jwtService.signAsync as jest.Mock) = jest
        .fn()
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      await service.refreshTokens(refreshToken);

      expect(sessionService.rotateRefreshToken).toHaveBeenCalledWith(
        mockSession.id,
        'new-refresh-token',
      );
    });
  });

  // ============================================================================
  // LOGOUT TESTS
  // ============================================================================

  describe('logout', () => {
    it('should revoke all user sessions on logout', async () => {
      usersService.findOneEntity.mockResolvedValue(mockUser as any);

      await service.logout(mockUser.id, '127.0.0.1');

      expect(sessionService.revokeAllUserSessions).toHaveBeenCalledWith(mockUser.id, 'logout');
      expect(auditLogService.log).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // UNLOCK ACCOUNT TESTS
  // ============================================================================

  describe('unlockAccount', () => {
    it('should reset failed attempts and unlock account', async () => {
      await service.unlockAccount(mockUser.id);

      expect(usersService.update).toHaveBeenCalledWith(mockUser.id, {
        failed_login_attempts: 0,
        account_locked_until: null,
        last_failed_login_at: null,
      });
    });
  });

  // ============================================================================
  // LOGIN 2FA TESTS (REQ-AUTH-42, REQ-AUTH-43)
  // ============================================================================

  describe('login - 2FA scenarios', () => {
    it('should return requires_2fa true when user has 2FA enabled', async () => {
      const userWith2FA = {
        ...mockUser,
        is_2fa_enabled: true,
        two_fa_secret: 'encrypted-secret',
        isLocked: false,
      } as User;

      (jwtService.signAsync as jest.Mock) = jest
        .fn()
        .mockResolvedValueOnce('temp-access-token')
        .mockResolvedValueOnce('temp-refresh-token');

      const result = await service.login(userWith2FA, '127.0.0.1', 'Mozilla/5.0');

      expect(result.requires_2fa).toBe(true);
      expect(result.access_token).toBe('temp-access-token');
      expect(result.refresh_token).toBe('temp-refresh-token');
      expect(result.user.id).toBe(userWith2FA.id);
      expect(sessionService.createSession).not.toHaveBeenCalled(); // Session created only after 2FA
      expect(usersService.updateLastLogin).not.toHaveBeenCalled();
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Login successful, 2FA verification required',
        }),
      );
    });

    it('should return requires_password_change true when flag is set', async () => {
      const userWithPasswordChangeRequired = {
        ...mockUser,
        requires_password_change: true,
        is_2fa_enabled: false,
        isLocked: false,
      } as User;

      (jwtService.signAsync as jest.Mock) = jest
        .fn()
        .mockResolvedValueOnce('temp-access-token')
        .mockResolvedValueOnce('temp-refresh-token');

      const result = await service.login(userWithPasswordChangeRequired, '127.0.0.1');

      expect(result.requires_password_change).toBe(true);
      expect(result.access_token).toBe('temp-access-token');
      expect(result.refresh_token).toBe('temp-refresh-token');
      expect(sessionService.createSession).not.toHaveBeenCalled();
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Login successful, password change required',
        }),
      );
    });
  });

  // ============================================================================
  // COMPLETE 2FA LOGIN TESTS (REQ-AUTH-43)
  // ============================================================================

  describe('complete2FALogin', () => {
    const ip = '192.168.1.100';
    const userAgent = 'Mozilla/5.0';

    it('should complete 2FA login successfully', async () => {
      const userWith2FA = {
        ...mockUser,
        is_2fa_enabled: true,
        two_fa_secret: 'encrypted-secret',
        isLocked: false,
      } as User;

      usersService.findOneEntity.mockResolvedValue(userWith2FA as any);

      (jwtService.signAsync as jest.Mock) = jest
        .fn()
        .mockResolvedValueOnce('final-access-token')
        .mockResolvedValueOnce('final-refresh-token');

      const result = await service.complete2FALogin(mockUser.id, '123456', ip, userAgent);

      expect(result.access_token).toBe('final-access-token');
      expect(result.refresh_token).toBe('final-refresh-token');
      expect(result.user.id).toBe(mockUser.id);
      expect(sessionService.createSession).toHaveBeenCalledWith({
        userId: mockUser.id,
        refreshToken: 'final-refresh-token',
        ipAddress: ip,
        userAgent: userAgent,
      });
      expect(usersService.updateLastLogin).toHaveBeenCalledWith(mockUser.id, ip);
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          description: '2FA login successful',
        }),
      );
    });

    it('should throw UnauthorizedException when 2FA not enabled for user', async () => {
      const userWithout2FA = {
        ...mockUser,
        is_2fa_enabled: false,
        two_fa_secret: null,
        isLocked: false,
      } as User;

      usersService.findOneEntity.mockResolvedValue(userWithout2FA as any);

      await expect(service.complete2FALogin(mockUser.id, '123456', ip)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.complete2FALogin(mockUser.id, '123456', ip)).rejects.toThrow(
        '2FA не настроена для этого пользователя',
      );
    });

    it('should throw UnauthorizedException when 2FA enabled but no secret', async () => {
      const userWith2FANoSecret = {
        ...mockUser,
        is_2fa_enabled: true,
        two_fa_secret: null,
        isLocked: false,
      } as User;

      usersService.findOneEntity.mockResolvedValue(userWith2FANoSecret as any);

      await expect(service.complete2FALogin(mockUser.id, '123456', ip)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ============================================================================
  // PASSWORD RESET TESTS (REQ-AUTH-45)
  // ============================================================================

  describe('requestPasswordReset', () => {
    let passwordResetTokenRepository: MockPasswordResetTokenRepository;

    beforeEach(() => {
      passwordResetTokenRepository = (
        service as unknown as { passwordResetTokenRepository: MockPasswordResetTokenRepository }
      ).passwordResetTokenRepository;
    });

    it('should return success even when user not found (prevent enumeration)', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.requestPasswordReset('nonexistent@example.com', '127.0.0.1');

      expect(result.success).toBe(true);
      expect(result.message).toContain('email существует');
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          metadata: expect.objectContaining({ reason: 'user_not_found' }),
        }),
      );
    });

    it('should return success for inactive user (prevent enumeration)', async () => {
      const inactiveUser = {
        ...mockUser,
        status: UserStatus.INACTIVE,
      } as User;

      usersService.findByEmail.mockResolvedValue(inactiveUser);

      const result = await service.requestPasswordReset('inactive@example.com', '127.0.0.1');

      expect(result.success).toBe(true);
      expect(result.message).toContain('email существует');
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          metadata: expect.objectContaining({ reason: 'account_inactive' }),
        }),
      );
    });

    it('should create reset token and send email for active user', async () => {
      const activeUser = {
        ...mockUser,
        status: UserStatus.ACTIVE,
      } as User;

      usersService.findByEmail.mockResolvedValue(activeUser);

      const mockToken = {
        id: 'token-123',
        token: 'uuid-token',
        expires_at: new Date(Date.now() + 3600000),
      };

      passwordResetTokenRepository.create.mockReturnValue(mockToken);
      passwordResetTokenRepository.save.mockResolvedValue(mockToken);
      emailService.sendPasswordResetEmail.mockResolvedValue(true);

      const result = await service.requestPasswordReset(
        'test@example.com',
        '192.168.1.100',
        'Mozilla/5.0',
      );

      expect(result.success).toBe(true);
      expect(passwordResetTokenRepository.update).toHaveBeenCalled(); // Invalidate previous tokens
      expect(passwordResetTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: activeUser.id,
          request_ip: '192.168.1.100',
          request_user_agent: 'Mozilla/5.0',
        }),
      );
      expect(passwordResetTokenRepository.save).toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        activeUser.email,
        activeUser.full_name,
        mockToken.token,
      );
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          metadata: expect.objectContaining({
            token_id: mockToken.id,
          }),
        }),
      );
    });

    it('should log failure when email fails to send', async () => {
      const activeUser = {
        ...mockUser,
        status: UserStatus.ACTIVE,
      } as User;

      usersService.findByEmail.mockResolvedValue(activeUser);

      const mockToken = { id: 'token-123', token: 'uuid-token', expires_at: new Date() };
      passwordResetTokenRepository.create.mockReturnValue(mockToken);
      passwordResetTokenRepository.save.mockResolvedValue(mockToken);
      emailService.sendPasswordResetEmail.mockResolvedValue(false);

      const result = await service.requestPasswordReset('test@example.com');

      expect(result.success).toBe(true); // Still success for security
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
        }),
      );
    });
  });

  describe('validateResetToken', () => {
    let passwordResetTokenRepository: MockPasswordResetTokenRepository;

    beforeEach(() => {
      passwordResetTokenRepository = (
        service as unknown as { passwordResetTokenRepository: MockPasswordResetTokenRepository }
      ).passwordResetTokenRepository;
    });

    it('should return invalid for non-existent token', async () => {
      passwordResetTokenRepository.findOne.mockResolvedValue(null);

      const result = await service.validateResetToken('non-existent-token');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Неверный или истекший токен');
    });

    it('should return invalid for expired token', async () => {
      const expiredToken = {
        token: 'expired-token',
        expires_at: new Date(Date.now() - 3600000), // 1 hour ago
        used_at: null,
        user: mockUser,
        isExpired: () => true,
        isUsed: () => false,
      };

      passwordResetTokenRepository.findOne.mockResolvedValue(expiredToken);

      const result = await service.validateResetToken('expired-token');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Токен истек');
    });

    it('should return invalid for already used token', async () => {
      const usedToken = {
        token: 'used-token',
        expires_at: new Date(Date.now() + 3600000),
        used_at: new Date(),
        user: mockUser,
        isExpired: () => false,
        isUsed: () => true,
      };

      passwordResetTokenRepository.findOne.mockResolvedValue(usedToken);

      const result = await service.validateResetToken('used-token');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('уже использован');
    });

    it('should return invalid when user is inactive', async () => {
      const tokenWithInactiveUser = {
        token: 'valid-token',
        expires_at: new Date(Date.now() + 3600000),
        used_at: null,
        user: { ...mockUser, status: UserStatus.INACTIVE },
        isExpired: () => false,
        isUsed: () => false,
      };

      passwordResetTokenRepository.findOne.mockResolvedValue(tokenWithInactiveUser);

      const result = await service.validateResetToken('valid-token');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('неактивен');
    });

    it('should return invalid when user relation is null', async () => {
      const tokenWithoutUser = {
        token: 'valid-token',
        expires_at: new Date(Date.now() + 3600000),
        used_at: null,
        user: null,
        isExpired: () => false,
        isUsed: () => false,
      };

      passwordResetTokenRepository.findOne.mockResolvedValue(tokenWithoutUser);

      const result = await service.validateResetToken('valid-token');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('не найден');
    });

    it('should return valid for valid token', async () => {
      const validToken = {
        token: 'valid-token',
        expires_at: new Date(Date.now() + 3600000),
        used_at: null,
        user: { ...mockUser, status: UserStatus.ACTIVE },
        isExpired: () => false,
        isUsed: () => false,
      };

      passwordResetTokenRepository.findOne.mockResolvedValue(validToken);

      const result = await service.validateResetToken('valid-token');

      expect(result.valid).toBe(true);
    });
  });

  describe('resetPassword', () => {
    let passwordResetTokenRepository: MockPasswordResetTokenRepository;
    const newPassword = 'NewSecure123!';
    const ip = '192.168.1.100';
    const userAgent = 'Mozilla/5.0';

    beforeEach(() => {
      passwordResetTokenRepository = (
        service as unknown as { passwordResetTokenRepository: MockPasswordResetTokenRepository }
      ).passwordResetTokenRepository;
    });

    it('should throw BadRequestException for invalid token', async () => {
      passwordResetTokenRepository.findOne.mockResolvedValue(null);

      await expect(service.resetPassword('invalid-token', newPassword, ip)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when token found but user relation missing', async () => {
      // First call for validation
      const validToken = {
        token: 'valid-token',
        expires_at: new Date(Date.now() + 3600000),
        used_at: null,
        user: { ...mockUser, status: UserStatus.ACTIVE },
        isExpired: () => false,
        isUsed: () => false,
      };
      // Second call for getting token with user returns null user
      const tokenWithoutUser = {
        token: 'valid-token',
        user: null,
      };

      passwordResetTokenRepository.findOne
        .mockResolvedValueOnce(validToken)
        .mockResolvedValueOnce(tokenWithoutUser);

      await expect(service.resetPassword('valid-token', newPassword, ip)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reset password successfully', async () => {
      const validToken = {
        id: 'token-123',
        token: 'valid-token',
        expires_at: new Date(Date.now() + 3600000),
        used_at: null,
        user: { ...mockUser, status: UserStatus.ACTIVE },
        created_at: new Date(),
        request_ip: '192.168.1.50',
        isExpired: () => false,
        isUsed: () => false,
      };

      passwordResetTokenRepository.findOne.mockResolvedValue(validToken);
      passwordResetTokenRepository.save.mockResolvedValue({ ...validToken, used_at: new Date() });
      usersService.save.mockResolvedValue(mockUser as any);
      mockedBcrypt.hash.mockResolvedValue('hashed-new-password' as never);

      const result = await service.resetPassword('valid-token', newPassword, ip, userAgent);

      expect(result.success).toBe(true);
      expect(result.message).toContain('успешно изменен');

      // Verify user password hash updated
      expect(usersService.save).toHaveBeenCalledWith(
        expect.objectContaining({
          password_hash: 'hashed-new-password',
          refresh_token: null,
          failed_login_attempts: 0,
          account_locked_until: null,
        }),
      );

      // Verify token marked as used
      expect(passwordResetTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          used_at: expect.any(Date),
        }),
      );

      // Verify audit log
      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUser.id,
          ip_address: ip,
          user_agent: userAgent,
        }),
      );
    });
  });

  describe('cleanupExpiredResetTokens', () => {
    let passwordResetTokenRepository: MockPasswordResetTokenRepository;

    beforeEach(() => {
      passwordResetTokenRepository = (
        service as unknown as { passwordResetTokenRepository: MockPasswordResetTokenRepository }
      ).passwordResetTokenRepository;
    });

    it('should soft delete expired tokens and return count', async () => {
      passwordResetTokenRepository.softDelete.mockResolvedValue({ affected: 5 });

      const result = await service.cleanupExpiredResetTokens();

      expect(result).toBe(5);
      expect(passwordResetTokenRepository.softDelete).toHaveBeenCalled();
    });

    it('should return 0 when no tokens to clean', async () => {
      passwordResetTokenRepository.softDelete.mockResolvedValue({ affected: 0 });

      const result = await service.cleanupExpiredResetTokens();

      expect(result).toBe(0);
    });

    it('should return 0 when affected is undefined', async () => {
      passwordResetTokenRepository.softDelete.mockResolvedValue({});

      const result = await service.cleanupExpiredResetTokens();

      expect(result).toBe(0);
    });
  });

  describe('changePassword', () => {
    it('should change password and return success', async () => {
      usersService.changePassword.mockResolvedValue(undefined);

      const result = await service.changePassword(mockUser.id, 'newPassword123');

      expect(result.success).toBe(true);
      expect(result.message).toContain('успешно изменен');
      expect(usersService.changePassword).toHaveBeenCalledWith(mockUser.id, 'newPassword123');
    });
  });

  // ============================================================================
  // REFRESH TOKEN EDGE CASES
  // ============================================================================

  describe('refreshTokens - edge cases', () => {
    it('should throw UnauthorizedException when session not found', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = { sub: mockUser.id, email: mockUser.email, role: mockUser.role };

      (jwtService.verify as jest.Mock).mockReturnValue(payload);
      usersService.findOneEntity.mockResolvedValue({ ...mockUser, isLocked: false } as any);
      sessionService.findSessionByRefreshToken.mockResolvedValue(null);

      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when session verification fails', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = { sub: mockUser.id, email: mockUser.email, role: mockUser.role };
      const mockSession = { id: 'session-1', user_id: mockUser.id, is_active: true };

      (jwtService.verify as jest.Mock).mockReturnValue(payload);
      usersService.findOneEntity.mockResolvedValue({ ...mockUser, isLocked: false } as any);
      sessionService.findSessionByRefreshToken.mockResolvedValue(mockSession as any);
      sessionService.verifyRefreshToken.mockResolvedValue(false);

      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ============================================================================
  // FIRST LOGIN CHANGE PASSWORD TESTS (REQ-AUTH-31)
  // ============================================================================

  describe('firstLoginChangePassword', () => {
    const currentPassword = 'temporary123';
    const newPassword = 'NewSecure123!';
    const ip = '192.168.1.100';
    const userAgent = 'Mozilla/5.0';

    it('should successfully change password on first login', async () => {
      const userRequiringPasswordChange = {
        ...mockUser,
        requires_password_change: true,
      };

      usersService.findOneEntity.mockResolvedValue(userRequiringPasswordChange as any);
      usersService.validatePassword.mockResolvedValue(true);
      usersService.changePassword.mockResolvedValue(undefined);
      usersService.save.mockResolvedValue({
        ...userRequiringPasswordChange,
        requires_password_change: false,
      } as any);

      (jwtService.signAsync as jest.Mock) = jest
        .fn()
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      mockedBcrypt.hash.mockResolvedValue('hashed-refresh-token' as never);

      const result = await service.firstLoginChangePassword(
        mockUser.id,
        currentPassword,
        newPassword,
        ip,
        userAgent,
      );

      expect(result).toEqual({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        user: {
          id: mockUser.id,
          email: mockUser.email,
          full_name: mockUser.full_name,
          role: mockUser.role,
        },
      });

      expect(usersService.findOneEntity).toHaveBeenCalledWith(mockUser.id);
      expect(usersService.validatePassword).toHaveBeenCalledWith(
        userRequiringPasswordChange,
        currentPassword,
      );
      expect(usersService.changePassword).toHaveBeenCalledWith(mockUser.id, newPassword);
      expect(usersService.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      usersService.findOneEntity.mockResolvedValue(null as any);

      await expect(
        service.firstLoginChangePassword(mockUser.id, currentPassword, newPassword, ip, userAgent),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.firstLoginChangePassword(mockUser.id, currentPassword, newPassword, ip, userAgent),
      ).rejects.toThrow('Пользователь не найден');
    });

    it('should throw BadRequestException when password change not required', async () => {
      const userNotRequiringPasswordChange = {
        ...mockUser,
        requires_password_change: false,
      };

      usersService.findOneEntity.mockResolvedValue(userNotRequiringPasswordChange as any);

      await expect(
        service.firstLoginChangePassword(mockUser.id, currentPassword, newPassword, ip, userAgent),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.firstLoginChangePassword(mockUser.id, currentPassword, newPassword, ip, userAgent),
      ).rejects.toThrow('Смена пароля не требуется для данного пользователя');
    });

    it('should throw UnauthorizedException when current password is invalid', async () => {
      const userRequiringPasswordChange = {
        ...mockUser,
        requires_password_change: true,
      };

      usersService.findOneEntity.mockResolvedValue(userRequiringPasswordChange as any);
      usersService.validatePassword.mockResolvedValue(false);

      await expect(
        service.firstLoginChangePassword(mockUser.id, 'wrong-password', newPassword, ip, userAgent),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.firstLoginChangePassword(mockUser.id, 'wrong-password', newPassword, ip, userAgent),
      ).rejects.toThrow('Неверный текущий пароль');
    });

    it('should clear requires_password_change flag', async () => {
      const userRequiringPasswordChange = {
        ...mockUser,
        requires_password_change: true,
      };

      usersService.findOneEntity.mockResolvedValue(userRequiringPasswordChange as any);
      usersService.validatePassword.mockResolvedValue(true);
      usersService.changePassword.mockResolvedValue(undefined);
      usersService.save.mockResolvedValue({
        ...userRequiringPasswordChange,
        requires_password_change: false,
      } as any);

      (jwtService.signAsync as jest.Mock) = jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      mockedBcrypt.hash.mockResolvedValue('hashed-refresh-token' as never);

      await service.firstLoginChangePassword(
        mockUser.id,
        currentPassword,
        newPassword,
        ip,
        userAgent,
      );

      // Verify that save was called with the user object that has requires_password_change = false
      expect(usersService.save).toHaveBeenCalled();
      const savedUser = usersService.save.mock.calls[0][0];
      expect(savedUser.requires_password_change).toBe(false);
    });

    it('should create session after password change', async () => {
      const userRequiringPasswordChange = {
        ...mockUser,
        requires_password_change: true,
      };

      usersService.findOneEntity.mockResolvedValue(userRequiringPasswordChange as any);
      usersService.validatePassword.mockResolvedValue(true);
      usersService.changePassword.mockResolvedValue(undefined);
      usersService.save.mockResolvedValue({
        ...userRequiringPasswordChange,
        requires_password_change: false,
      } as any);

      (jwtService.signAsync as jest.Mock) = jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      mockedBcrypt.hash.mockResolvedValue('hashed-refresh-token' as never);

      await service.firstLoginChangePassword(
        mockUser.id,
        currentPassword,
        newPassword,
        ip,
        userAgent,
      );

      expect(sessionService.createSession).toHaveBeenCalledWith({
        userId: mockUser.id,
        refreshToken: 'refresh-token',
        ipAddress: ip,
        userAgent: userAgent,
      });
    });

    it('should update last login after password change', async () => {
      const userRequiringPasswordChange = {
        ...mockUser,
        requires_password_change: true,
      };

      usersService.findOneEntity.mockResolvedValue(userRequiringPasswordChange as any);
      usersService.validatePassword.mockResolvedValue(true);
      usersService.changePassword.mockResolvedValue(undefined);
      usersService.save.mockResolvedValue({
        ...userRequiringPasswordChange,
        requires_password_change: false,
      } as any);

      (jwtService.signAsync as jest.Mock) = jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      mockedBcrypt.hash.mockResolvedValue('hashed-refresh-token' as never);

      await service.firstLoginChangePassword(
        mockUser.id,
        currentPassword,
        newPassword,
        ip,
        userAgent,
      );

      expect(usersService.updateLastLogin).toHaveBeenCalledWith(mockUser.id, ip);
    });

    it('should log password change to audit log', async () => {
      const userRequiringPasswordChange = {
        ...mockUser,
        requires_password_change: true,
      };

      usersService.findOneEntity.mockResolvedValue(userRequiringPasswordChange as any);
      usersService.validatePassword.mockResolvedValue(true);
      usersService.changePassword.mockResolvedValue(undefined);
      usersService.save.mockResolvedValue({
        ...userRequiringPasswordChange,
        requires_password_change: false,
      } as any);

      (jwtService.signAsync as jest.Mock) = jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      mockedBcrypt.hash.mockResolvedValue('hashed-refresh-token' as never);

      await service.firstLoginChangePassword(
        mockUser.id,
        currentPassword,
        newPassword,
        ip,
        userAgent,
      );

      expect(auditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUser.id,
          ip_address: ip,
          user_agent: userAgent,
          event_type: expect.any(String),
        }),
      );
    });

    it('should generate new JWT tokens', async () => {
      const userRequiringPasswordChange = {
        ...mockUser,
        requires_password_change: true,
      };

      usersService.findOneEntity.mockResolvedValue(userRequiringPasswordChange as any);
      usersService.validatePassword.mockResolvedValue(true);
      usersService.changePassword.mockResolvedValue(undefined);
      usersService.save.mockResolvedValue({
        ...userRequiringPasswordChange,
        requires_password_change: false,
      } as any);

      (jwtService.signAsync as jest.Mock) = jest
        .fn()
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      mockedBcrypt.hash.mockResolvedValue('hashed-refresh-token' as never);

      const result = await service.firstLoginChangePassword(
        mockUser.id,
        currentPassword,
        newPassword,
        ip,
        userAgent,
      );

      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(result.access_token).toBe('new-access-token');
      expect(result.refresh_token).toBe('new-refresh-token');
    });
  });
});
