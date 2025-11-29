import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { SessionService, CreateSessionData } from './session.service';
import { UserSession } from '../entities/user-session.entity';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('SessionService', () => {
  let service: SessionService;
  let mockSessionRepository: jest.Mocked<Repository<UserSession>>;
  let mockConfigService: jest.Mocked<ConfigService>;

  const mockUserId = 'user-123';
  const mockSessionId = 'session-456';
  const mockRefreshToken = 'refresh-token-abc';
  const mockRefreshTokenHash = 'hashed-refresh-token';

  const createMockSession = (overrides: Partial<UserSession> = {}): UserSession => {
    const session = new UserSession();
    Object.assign(session, {
      id: mockSessionId,
      user_id: mockUserId,
      refresh_token_hash: mockRefreshTokenHash,
      ip_address: '127.0.0.1',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0',
      device_type: 'desktop',
      device_name: 'Chrome on Windows',
      os: 'Windows',
      browser: 'Chrome',
      is_active: true,
      last_used_at: new Date(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      revoked_at: null,
      revoked_reason: null,
      metadata: {},
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      ...overrides,
    });
    return session;
  };

  beforeEach(async () => {
    mockSessionRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as any;

    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          MAX_SESSIONS_PER_USER: 5,
          SESSION_EXPIRATION_DAYS: 7,
        };
        return config[key] ?? defaultValue;
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        {
          provide: getRepositoryToken(UserSession),
          useValue: mockSessionRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);

    // Reset bcrypt mocks
    mockedBcrypt.hash.mockReset();
    mockedBcrypt.compare.mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    const createSessionData: CreateSessionData = {
      userId: mockUserId,
      refreshToken: mockRefreshToken,
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0',
      metadata: { source: 'web' },
    };

    it('should create a new session successfully', async () => {
      const expectedSession = createMockSession();
      mockSessionRepository.find.mockResolvedValue([]);
      mockSessionRepository.create.mockReturnValue(expectedSession);
      mockSessionRepository.save.mockResolvedValue(expectedSession);
      mockedBcrypt.hash.mockResolvedValue(mockRefreshTokenHash as never);

      const result = await service.createSession(createSessionData);

      expect(result).toEqual(expectedSession);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(mockRefreshToken, 10);
      expect(mockSessionRepository.create).toHaveBeenCalled();
      expect(mockSessionRepository.save).toHaveBeenCalled();
    });

    it('should hash refresh token before storing', async () => {
      mockSessionRepository.find.mockResolvedValue([]);
      mockSessionRepository.create.mockReturnValue(createMockSession());
      mockSessionRepository.save.mockResolvedValue(createMockSession());
      mockedBcrypt.hash.mockResolvedValue('hashed-token' as never);

      await service.createSession(createSessionData);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(mockRefreshToken, 10);
    });

    it('should parse user agent and extract device information', async () => {
      mockSessionRepository.find.mockResolvedValue([]);
      mockSessionRepository.create.mockReturnValue(createMockSession());
      mockSessionRepository.save.mockResolvedValue(createMockSession());
      mockedBcrypt.hash.mockResolvedValue(mockRefreshTokenHash as never);

      await service.createSession(createSessionData);

      expect(mockSessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          device_type: expect.any(String),
          os: expect.any(String),
          browser: expect.any(String),
        }),
      );
    });

    it('should handle missing user agent gracefully', async () => {
      const dataWithoutUserAgent: CreateSessionData = {
        userId: mockUserId,
        refreshToken: mockRefreshToken,
      };

      mockSessionRepository.find.mockResolvedValue([]);
      mockSessionRepository.create.mockReturnValue(createMockSession());
      mockSessionRepository.save.mockResolvedValue(createMockSession());
      mockedBcrypt.hash.mockResolvedValue(mockRefreshTokenHash as never);

      await service.createSession(dataWithoutUserAgent);

      expect(mockSessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          device_type: null,
          device_name: null,
          os: null,
          browser: null,
        }),
      );
    });

    it('should revoke oldest session when max sessions exceeded', async () => {
      const existingSessions = Array.from({ length: 5 }, (_, i) =>
        createMockSession({
          id: `session-${i}`,
          created_at: new Date(Date.now() - (5 - i) * 1000), // Oldest first
        }),
      );

      mockSessionRepository.find.mockResolvedValue(existingSessions);
      mockSessionRepository.create.mockReturnValue(createMockSession());
      mockSessionRepository.save.mockResolvedValue(createMockSession());
      mockSessionRepository.update.mockResolvedValue({ affected: 1 } as any);
      mockedBcrypt.hash.mockResolvedValue(mockRefreshTokenHash as never);

      await service.createSession(createSessionData);

      // Should revoke the oldest session
      expect(mockSessionRepository.update).toHaveBeenCalledWith('session-0', {
        is_active: false,
        revoked_at: expect.any(Date),
        revoked_reason: 'max_sessions_exceeded',
      });
    });

    it('should not revoke sessions when under max limit', async () => {
      const existingSessions = Array.from({ length: 3 }, (_, i) =>
        createMockSession({ id: `session-${i}` }),
      );

      mockSessionRepository.find.mockResolvedValue(existingSessions);
      mockSessionRepository.create.mockReturnValue(createMockSession());
      mockSessionRepository.save.mockResolvedValue(createMockSession());
      mockedBcrypt.hash.mockResolvedValue(mockRefreshTokenHash as never);

      await service.createSession(createSessionData);

      // Should not call update for revocation
      expect(mockSessionRepository.update).not.toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          revoked_reason: 'max_sessions_exceeded',
        }),
      );
    });

    it('should set correct expiration date', async () => {
      mockSessionRepository.find.mockResolvedValue([]);
      mockSessionRepository.create.mockReturnValue(createMockSession());
      mockSessionRepository.save.mockResolvedValue(createMockSession());
      mockedBcrypt.hash.mockResolvedValue(mockRefreshTokenHash as never);

      const beforeCreate = new Date();
      await service.createSession(createSessionData);
      const afterCreate = new Date();

      expect(mockSessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          expires_at: expect.any(Date),
        }),
      );

      const createCall = mockSessionRepository.create.mock.calls[0][0];
      const expiresAt = createCall.expires_at as Date;
      const expectedMin = new Date(beforeCreate.getTime() + 7 * 24 * 60 * 60 * 1000);
      const expectedMax = new Date(afterCreate.getTime() + 7 * 24 * 60 * 60 * 1000);

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime() - 1000);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax.getTime() + 1000);
    });

    it('should store metadata if provided', async () => {
      mockSessionRepository.find.mockResolvedValue([]);
      mockSessionRepository.create.mockReturnValue(createMockSession());
      mockSessionRepository.save.mockResolvedValue(createMockSession());
      mockedBcrypt.hash.mockResolvedValue(mockRefreshTokenHash as never);

      await service.createSession(createSessionData);

      expect(mockSessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { source: 'web' },
        }),
      );
    });
  });

  describe('touchSession', () => {
    it('should update last_used_at timestamp', async () => {
      mockSessionRepository.update.mockResolvedValue({ affected: 1 } as any);

      const beforeTouch = new Date();
      await service.touchSession(mockSessionId);
      const afterTouch = new Date();

      expect(mockSessionRepository.update).toHaveBeenCalledWith(mockSessionId, {
        last_used_at: expect.any(Date),
      });

      const updateCall = mockSessionRepository.update.mock.calls[0][1];
      const lastUsedAt = updateCall.last_used_at as Date;
      expect(lastUsedAt.getTime()).toBeGreaterThanOrEqual(beforeTouch.getTime());
      expect(lastUsedAt.getTime()).toBeLessThanOrEqual(afterTouch.getTime());
    });
  });

  describe('rotateRefreshToken', () => {
    it('should update session with new hashed refresh token', async () => {
      const newRefreshToken = 'new-refresh-token';
      const newHashedToken = 'new-hashed-token';
      mockedBcrypt.hash.mockResolvedValue(newHashedToken as never);
      mockSessionRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.rotateRefreshToken(mockSessionId, newRefreshToken);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(newRefreshToken, 10);
      expect(mockSessionRepository.update).toHaveBeenCalledWith(mockSessionId, {
        refresh_token_hash: newHashedToken,
        last_used_at: expect.any(Date),
      });
    });
  });

  describe('verifyRefreshToken', () => {
    it('should return true when refresh token matches and session is valid', async () => {
      const validSession = createMockSession();
      // Mock the getter
      Object.defineProperty(validSession, 'isValid', {
        get: () => true,
      });
      mockSessionRepository.findOne.mockResolvedValue(validSession);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.verifyRefreshToken(mockSessionId, mockRefreshToken);

      expect(result).toBe(true);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(mockRefreshToken, mockRefreshTokenHash);
    });

    it('should return false when session not found', async () => {
      mockSessionRepository.findOne.mockResolvedValue(null);

      const result = await service.verifyRefreshToken(mockSessionId, mockRefreshToken);

      expect(result).toBe(false);
      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return false when session is inactive', async () => {
      const inactiveSession = createMockSession({ is_active: false });
      Object.defineProperty(inactiveSession, 'isValid', {
        get: () => false,
      });
      mockSessionRepository.findOne.mockResolvedValue(inactiveSession);

      const result = await service.verifyRefreshToken(mockSessionId, mockRefreshToken);

      expect(result).toBe(false);
    });

    it('should return false when refresh token does not match', async () => {
      const validSession = createMockSession();
      Object.defineProperty(validSession, 'isValid', {
        get: () => true,
      });
      mockSessionRepository.findOne.mockResolvedValue(validSession);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await service.verifyRefreshToken(mockSessionId, 'wrong-token');

      expect(result).toBe(false);
    });
  });

  describe('findSessionByRefreshToken', () => {
    it('should return session when refresh token matches', async () => {
      const expectedSession = createMockSession();
      Object.defineProperty(expectedSession, 'isValid', {
        get: () => true,
      });
      mockSessionRepository.find.mockResolvedValue([expectedSession]);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.findSessionByRefreshToken(mockRefreshToken);

      expect(result).toEqual(expectedSession);
    });

    it('should return null when no session matches', async () => {
      const session = createMockSession();
      Object.defineProperty(session, 'isValid', {
        get: () => true,
      });
      mockSessionRepository.find.mockResolvedValue([session]);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      const result = await service.findSessionByRefreshToken('non-existent-token');

      expect(result).toBeNull();
    });

    it('should return null when no active sessions exist', async () => {
      mockSessionRepository.find.mockResolvedValue([]);

      const result = await service.findSessionByRefreshToken(mockRefreshToken);

      expect(result).toBeNull();
    });

    it('should skip invalid sessions', async () => {
      const invalidSession = createMockSession({ is_active: false });
      Object.defineProperty(invalidSession, 'isValid', {
        get: () => false,
      });
      mockSessionRepository.find.mockResolvedValue([invalidSession]);
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const result = await service.findSessionByRefreshToken(mockRefreshToken);

      expect(result).toBeNull();
    });
  });

  describe('getActiveSessions', () => {
    it('should return all active sessions for user', async () => {
      const sessions = [
        createMockSession({ id: 'session-1' }),
        createMockSession({ id: 'session-2' }),
      ];
      mockSessionRepository.find.mockResolvedValue(sessions);

      const result = await service.getActiveSessions(mockUserId);

      expect(result).toEqual(sessions);
      expect(mockSessionRepository.find).toHaveBeenCalledWith({
        where: {
          user_id: mockUserId,
          is_active: true,
        },
        order: {
          last_used_at: 'DESC',
        },
      });
    });

    it('should return empty array when no active sessions', async () => {
      mockSessionRepository.find.mockResolvedValue([]);

      const result = await service.getActiveSessions(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('revokeSession', () => {
    it('should mark session as inactive with reason', async () => {
      mockSessionRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.revokeSession(mockSessionId, 'logout');

      expect(mockSessionRepository.update).toHaveBeenCalledWith(mockSessionId, {
        is_active: false,
        revoked_at: expect.any(Date),
        revoked_reason: 'logout',
      });
    });

    it('should use default reason when not provided', async () => {
      mockSessionRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.revokeSession(mockSessionId);

      expect(mockSessionRepository.update).toHaveBeenCalledWith(mockSessionId, {
        is_active: false,
        revoked_at: expect.any(Date),
        revoked_reason: 'manual',
      });
    });
  });

  describe('revokeAllUserSessions', () => {
    it('should revoke all active sessions for user', async () => {
      const sessions = [
        createMockSession({ id: 'session-1' }),
        createMockSession({ id: 'session-2' }),
      ];
      mockSessionRepository.find.mockResolvedValue(sessions);
      mockSessionRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.revokeAllUserSessions(mockUserId, 'password_change');

      expect(result).toBe(2);
      expect(mockSessionRepository.update).toHaveBeenCalledTimes(2);
      expect(mockSessionRepository.update).toHaveBeenCalledWith('session-1', {
        is_active: false,
        revoked_at: expect.any(Date),
        revoked_reason: 'password_change',
      });
      expect(mockSessionRepository.update).toHaveBeenCalledWith('session-2', {
        is_active: false,
        revoked_at: expect.any(Date),
        revoked_reason: 'password_change',
      });
    });

    it('should return 0 when no active sessions', async () => {
      mockSessionRepository.find.mockResolvedValue([]);

      const result = await service.revokeAllUserSessions(mockUserId);

      expect(result).toBe(0);
      expect(mockSessionRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('revokeOtherSessions', () => {
    it('should revoke all sessions except current one', async () => {
      const currentSessionId = 'current-session';
      const sessions = [
        createMockSession({ id: currentSessionId }),
        createMockSession({ id: 'other-session-1' }),
        createMockSession({ id: 'other-session-2' }),
      ];
      mockSessionRepository.find.mockResolvedValue(sessions);
      mockSessionRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.revokeOtherSessions(
        mockUserId,
        currentSessionId,
        'security_logout',
      );

      expect(result).toBe(2);
      expect(mockSessionRepository.update).toHaveBeenCalledTimes(2);
      expect(mockSessionRepository.update).not.toHaveBeenCalledWith(
        currentSessionId,
        expect.any(Object),
      );
    });

    it('should return 0 when only current session exists', async () => {
      const currentSessionId = 'current-session';
      const sessions = [createMockSession({ id: currentSessionId })];
      mockSessionRepository.find.mockResolvedValue(sessions);

      const result = await service.revokeOtherSessions(mockUserId, currentSessionId);

      expect(result).toBe(0);
      expect(mockSessionRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should delete expired sessions older than retention period', async () => {
      mockSessionRepository.softDelete.mockResolvedValue({ affected: 5 } as any);

      const result = await service.cleanupExpiredSessions(30);

      expect(result).toBe(5);
      expect(mockSessionRepository.softDelete).toHaveBeenCalledWith({
        expires_at: expect.any(Object),
        created_at: expect.any(Object),
      });
    });

    it('should use default retention period of 30 days', async () => {
      mockSessionRepository.softDelete.mockResolvedValue({ affected: 3 } as any);

      await service.cleanupExpiredSessions();

      expect(mockSessionRepository.softDelete).toHaveBeenCalled();
    });

    it('should return 0 when no expired sessions found', async () => {
      mockSessionRepository.softDelete.mockResolvedValue({ affected: 0 } as any);

      const result = await service.cleanupExpiredSessions();

      expect(result).toBe(0);
    });

    it('should handle undefined affected count', async () => {
      mockSessionRepository.softDelete.mockResolvedValue({} as any);

      const result = await service.cleanupExpiredSessions();

      expect(result).toBe(0);
    });
  });

  describe('user agent parsing', () => {
    it('should parse Chrome on Windows correctly', async () => {
      const chromeWindowsUA =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

      mockSessionRepository.find.mockResolvedValue([]);
      mockSessionRepository.create.mockReturnValue(createMockSession());
      mockSessionRepository.save.mockResolvedValue(createMockSession());
      mockedBcrypt.hash.mockResolvedValue(mockRefreshTokenHash as never);

      await service.createSession({
        userId: mockUserId,
        refreshToken: mockRefreshToken,
        userAgent: chromeWindowsUA,
      });

      expect(mockSessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          device_type: 'desktop',
          browser: 'Chrome',
          os: 'Windows',
        }),
      );
    });

    it('should parse Safari on iPhone correctly', async () => {
      const iphoneUA =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1';

      mockSessionRepository.find.mockResolvedValue([]);
      mockSessionRepository.create.mockReturnValue(createMockSession());
      mockSessionRepository.save.mockResolvedValue(createMockSession());
      mockedBcrypt.hash.mockResolvedValue(mockRefreshTokenHash as never);

      await service.createSession({
        userId: mockUserId,
        refreshToken: mockRefreshToken,
        userAgent: iphoneUA,
      });

      expect(mockSessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          device_type: 'mobile',
          browser: 'Mobile Safari',
        }),
      );
    });

    it('should handle empty user agent', async () => {
      mockSessionRepository.find.mockResolvedValue([]);
      mockSessionRepository.create.mockReturnValue(createMockSession());
      mockSessionRepository.save.mockResolvedValue(createMockSession());
      mockedBcrypt.hash.mockResolvedValue(mockRefreshTokenHash as never);

      await service.createSession({
        userId: mockUserId,
        refreshToken: mockRefreshToken,
        userAgent: '',
      });

      expect(mockSessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          device_type: null,
          device_name: null,
          os: null,
          browser: null,
        }),
      );
    });
  });
});
