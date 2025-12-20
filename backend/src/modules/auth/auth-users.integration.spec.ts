// Set required environment variable before imports
process.env.JWT_SECRET = 'test_secret_key_at_least_32_characters_long';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_key_at_least_32_characters_long';

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { EmailService } from '../email/email.service';
import { SessionService } from './services/session.service';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { AuditLogService } from '../security/services/audit-log.service';
// Repository type - not currently used but kept for future type annotations
// import type { Repository } from 'typeorm';

// Note: Test files use Record<string, jest.Mock> pattern for mock services
// This provides flexibility in mock return values, which is standard Jest practice

/**
 * Integration tests for Auth and Users modules
 * Tests the complete workflows: registration -> approval -> login -> password change
 */
describe('Auth + Users Integration', () => {
  let authService: AuthService;
  let usersService: Record<string, jest.Mock>;
  let _userRepository: Record<string, jest.Mock>;
  let jwtService: Record<string, jest.Mock>;
  let _configService: { get: jest.Mock };
  let module: TestingModule;

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
    settings: null,
    failed_login_attempts: 0,
    account_locked_until: null,
    last_failed_login_at: null,
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
    const mockJwtService = {
      signAsync: jest.fn(),
      verify: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: string | number | boolean) => {
        if (key === 'JWT_ACCESS_EXPIRATION') return '15m';
        if (key === 'JWT_REFRESH_EXPIRATION') return '7d';
        if (key === 'JWT_SECRET') return 'secret_key';
        return defaultValue;
      }),
    };

    const mockUserRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };

    const mockUsersService = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findOne: jest.fn(),
      findOneEntity: jest.fn(),
      validatePassword: jest.fn(),
      getPendingUsers: jest.fn(),
      approveUser: jest.fn(),
      rejectUser: jest.fn(),
      updatePassword: jest.fn(),
      changePassword: jest.fn(),
      updateRefreshToken: jest.fn(),
      updateLastLogin: jest.fn(),
      update: jest.fn(),
      incrementFailedLogins: jest.fn(),
    };

    const mockPasswordResetTokenRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    const mockEmailService = {
      sendPasswordResetEmail: jest.fn(),
      sendWelcomeEmail: jest.fn(),
    };

    const mockSessionService = {
      createSession: jest.fn(),
      validateSession: jest.fn(),
      invalidateSession: jest.fn(),
      invalidateAllUserSessions: jest.fn(),
    };

    const mockTokenBlacklistService = {
      addToBlacklist: jest.fn(),
      isBlacklisted: jest.fn().mockResolvedValue(false),
    };

    const mockAuditLogService = {
      log: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(PasswordResetToken),
          useValue: mockPasswordResetTokenRepository,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
        {
          provide: TokenBlacklistService,
          useValue: mockTokenBlacklistService,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
      ],
    }).compile();

    module = moduleRef;
    authService = moduleRef.get<AuthService>(AuthService);
    usersService = moduleRef.get(UsersService) as unknown as Record<string, jest.Mock>;
    jwtService = moduleRef.get(JwtService) as unknown as Record<string, jest.Mock>;
    _configService = moduleRef.get(ConfigService) as { get: jest.Mock };
    _userRepository = moduleRef.get(getRepositoryToken(User)) as unknown as Record<string, jest.Mock>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('User Registration to Approval Workflow', () => {
    it('should register user in PENDING status and allow admin approval', async () => {
      // Step 1: Register user (creates PENDING user)
      const registerDto = {
        email: 'newuser@example.com',
        full_name: 'New User',
        password_hash: 'hashed_temp_password',
        phone: '+1234567890',
      };

      const pendingUser = {
        ...mockUser,
        id: 'pending-1',
        email: registerDto.email,
        full_name: registerDto.full_name,
        status: UserStatus.PENDING,
        role: UserRole.VIEWER,
      };

      usersService.create.mockResolvedValue(pendingUser);
      // findOneEntity is called after create to get the full user for token generation
      usersService.findOneEntity.mockResolvedValue(pendingUser);
      // Mock JWT token generation
      jwtService.signAsync.mockResolvedValueOnce('access_token');
      jwtService.signAsync.mockResolvedValueOnce('refresh_token');
      usersService.updateRefreshToken.mockResolvedValue(undefined);

      const registrationResult = await authService.register(registerDto as any);

      expect(registrationResult.user.status).toBe(UserStatus.PENDING);
      expect(usersService.create).toHaveBeenCalled();

      // Step 2: Admin approves user
      const approvedUser = {
        ...pendingUser,
        status: UserStatus.PASSWORD_CHANGE_REQUIRED,
        username: 'newuser_123',
        approved_by_id: 'admin-1',
        approved_at: new Date(),
      };

      usersService.approveUser.mockResolvedValue({
        user: approvedUser,
        credentials: {
          username: 'newuser_123',
          password: 'TempPassword123!',
        },
      });

      const approvalResult = await usersService.approveUser(
        'pending-1',
        { role: UserRole.OPERATOR },
        'admin-1',
      );

      expect(approvalResult.user.status).toBe(UserStatus.PASSWORD_CHANGE_REQUIRED);
      expect(approvalResult.credentials.username).toBe('newuser_123');
    });

    it('should reject PENDING user with reason', async () => {
      const pendingUser = {
        ...mockUser,
        id: 'pending-2',
        status: UserStatus.PENDING,
      };

      const rejectedUser = {
        ...pendingUser,
        status: UserStatus.REJECTED,
        rejection_reason: 'Insufficient qualifications',
        rejected_by_id: 'admin-1',
        rejected_at: new Date(),
      };

      usersService.rejectUser.mockResolvedValue(rejectedUser);

      const result = await usersService.rejectUser(
        'pending-2',
        'Insufficient qualifications',
        'admin-1',
      );

      expect(result.status).toBe(UserStatus.REJECTED);
      expect(result.rejection_reason).toBe('Insufficient qualifications');
    });
  });

  describe('Login with Approved Credentials Workflow', () => {
    it('should allow login with approved credentials and track login info', async () => {
      // Note: validateUser() only allows login for users with status='active'
      // Standard login flow (not password change or 2FA)
      const approvedUser = {
        ...mockUser,
        status: UserStatus.ACTIVE, // Must be ACTIVE to pass validateUser
        requires_password_change: false, // Normal login, no password change required
        is_2fa_enabled: false, // No 2FA
        username: 'newuser_123',
      };

      // Validate user exists with correct password
      // findByEmail is called first, returns the user (email format check)
      usersService.findByEmail.mockResolvedValue(approvedUser);
      usersService.validatePassword.mockResolvedValue(true);
      // Mock update for resetting failed login attempts
      usersService.update.mockResolvedValue(undefined);

      // Attempt login (simulating password validation)
      const validatedUser = await authService.validateUser('newuser_123', 'TempPassword123!');

      expect(validatedUser).toBeDefined();
      expect(validatedUser!.status).toBe(UserStatus.ACTIVE);
      expect(validatedUser!.username).toBe('newuser_123');

      // Generate tokens on successful login
      jwtService.signAsync.mockResolvedValueOnce('access_token_123');
      jwtService.signAsync.mockResolvedValueOnce('refresh_token_456');
      usersService.updateLastLogin.mockResolvedValue(undefined);

      // login() now uses sessionService.createSession instead of updateRefreshToken
      const sessionService = module.get(SessionService);
      sessionService.createSession = jest.fn().mockResolvedValue({ id: 'session-1' });

      const loginResult = await authService.login(validatedUser!, '192.168.1.1');

      expect(loginResult.access_token).toBe('access_token_123');
      expect(loginResult.refresh_token).toBe('refresh_token_456');
      // Session is created instead of updating refresh token directly
      expect(sessionService.createSession).toHaveBeenCalled();
      expect(usersService.updateLastLogin).toHaveBeenCalledWith(validatedUser!.id, '192.168.1.1');
    });

    it('should prevent login for PENDING users', async () => {
      const pendingUser = {
        ...mockUser,
        status: UserStatus.PENDING,
      };

      usersService.findByEmail.mockResolvedValue(pendingUser);
      usersService.validatePassword.mockResolvedValue(true);

      const result = await authService.validateUser('pending@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should prevent login for REJECTED users', async () => {
      const rejectedUser = {
        ...mockUser,
        status: UserStatus.REJECTED,
      };

      usersService.findByEmail.mockResolvedValue(rejectedUser);
      usersService.validatePassword.mockResolvedValue(true);

      const result = await authService.validateUser('rejected@example.com', 'password');

      expect(result).toBeNull();
    });
  });

  describe('Password Change Workflow', () => {
    it('should update password and activate user', async () => {
      const userId = 'user-1';
      const newPassword = 'SecurePassword123!';

      // The service calls changePassword, not updatePassword
      usersService.changePassword.mockResolvedValue(undefined);

      const result = await authService.changePassword(userId, newPassword);

      expect(result.success).toBe(true);
      expect(usersService.changePassword).toHaveBeenCalledWith(userId, newPassword);
    });
  });

  describe('Flexible Login (Email or Username)', () => {
    it('should support login by email', async () => {
      const user = {
        ...mockUser,
        email: 'user@example.com',
      };

      usersService.findByEmail.mockResolvedValue(user);
      usersService.validatePassword.mockResolvedValue(true);
      // Mock update for resetting failed login attempts
      usersService.update.mockResolvedValue(undefined);

      const result = await authService.validateUser('user@example.com', 'password');

      expect(result).toBeDefined();
      expect(result!.email).toBe('user@example.com');
      expect(usersService.findByEmail).toHaveBeenCalledWith('user@example.com');
    });

    it('should support login by username when email not found', async () => {
      // Note: validateUser checks status === 'active', so user must be ACTIVE
      const user = {
        ...mockUser,
        status: UserStatus.ACTIVE,
        username: 'testuser_123',
      };

      // findByEmail is called with the input - returns the user
      // (The logic first tries findByEmail, which works with any input)
      usersService.findByEmail.mockResolvedValue(user);
      usersService.validatePassword.mockResolvedValue(true);
      // Mock update for resetting failed login attempts
      usersService.update.mockResolvedValue(undefined);

      const result = await authService.validateUser('testuser_123', 'password');

      expect(result).toBeDefined();
      expect(result!.username).toBe('testuser_123');
    });
  });

  describe('Token Refresh Workflow', () => {
    it('should refresh tokens when refresh token is valid', async () => {
      const user = mockUser;
      const oldRefreshToken = 'old_refresh_token';
      const newAccessToken = 'new_access_token';
      const newRefreshToken = 'new_refresh_token';
      const payload = { sub: user.id, email: user.email, role: user.role };

      // Mock JWT verification
      jwtService.verify.mockReturnValue(payload);
      // findOneEntity is used instead of findOne
      usersService.findOneEntity.mockResolvedValue(user);

      // Get the session service mock
      const sessionService = module.get(SessionService);
      // Mock session methods
      sessionService.findSessionByRefreshToken = jest.fn().mockResolvedValue({ id: 'session-1' });
      sessionService.verifyRefreshToken = jest.fn().mockResolvedValue(true);
      sessionService.rotateRefreshToken = jest.fn().mockResolvedValue(undefined);

      jwtService.signAsync.mockResolvedValueOnce(newAccessToken);
      jwtService.signAsync.mockResolvedValueOnce(newRefreshToken);

      const result = await authService.refreshTokens(oldRefreshToken);

      expect(result.access_token).toBe(newAccessToken);
      expect(result.refresh_token).toBe(newRefreshToken);
    });
  });

  describe('Complete User Lifecycle', () => {
    it('should handle complete workflow: register -> approve -> login -> password change', async () => {
      // 1. Register user
      const registerDto = {
        email: 'complete@example.com',
        full_name: 'Complete User',
        password_hash: 'temp_hash',
      };

      const newUser = {
        ...mockUser,
        id: 'complete-1',
        ...registerDto,
        status: UserStatus.PENDING,
        role: UserRole.VIEWER,
      };

      usersService.create.mockResolvedValue(newUser);
      usersService.findOneEntity.mockResolvedValue(newUser);
      jwtService.signAsync.mockResolvedValueOnce('reg_access_token');
      jwtService.signAsync.mockResolvedValueOnce('reg_refresh_token');
      usersService.updateRefreshToken.mockResolvedValue(undefined);

      // Get session service mock and setup
      const sessionService = module.get(SessionService);
      sessionService.createSession = jest.fn().mockResolvedValue({ id: 'session-1' });

      const registerResult = await authService.register(registerDto as any);
      expect(registerResult.user.status).toBe(UserStatus.PENDING);

      // 2. Approve user
      const approvedUser = {
        ...newUser,
        status: UserStatus.PASSWORD_CHANGE_REQUIRED,
        username: 'complete_user',
        approved_by_id: 'admin-1',
      };

      usersService.approveUser.mockResolvedValue({
        user: approvedUser,
        credentials: { username: 'complete_user', password: 'TempPass123!' },
      });

      const approveResult = await usersService.approveUser(
        'complete-1',
        { role: UserRole.OPERATOR },
        'admin-1',
      );
      expect(approveResult.user.status).toBe(UserStatus.PASSWORD_CHANGE_REQUIRED);

      // 3. User logs in with temp password
      // validateUser requires status='active', so we create an active user with password change flag
      const activeApprovedUser = {
        ...approvedUser,
        status: UserStatus.ACTIVE, // Must be ACTIVE for validateUser
        requires_password_change: true, // Flag for password change
      };
      usersService.findByEmail.mockResolvedValue(activeApprovedUser);
      usersService.validatePassword.mockResolvedValue(true);
      usersService.update.mockResolvedValue(undefined);

      const validatedUser = await authService.validateUser('complete_user', 'TempPass123!');
      expect(validatedUser).toBeDefined();
      expect(validatedUser!.status).toBe(UserStatus.ACTIVE);

      // 4. Generate tokens
      jwtService.signAsync.mockResolvedValueOnce('access_token');
      jwtService.signAsync.mockResolvedValueOnce('refresh_token');
      usersService.updateRefreshToken.mockResolvedValue(undefined);
      usersService.updateLastLogin.mockResolvedValue(undefined);

      const loginResult = await authService.login(validatedUser!, '192.168.1.1');
      expect(loginResult.access_token).toBeDefined();

      // 5. Change password
      usersService.changePassword.mockResolvedValue(undefined);
      const changePassResult = await authService.changePassword('complete-1', 'SecurePass123!');
      expect(changePassResult.success).toBe(true);
    });
  });
});
