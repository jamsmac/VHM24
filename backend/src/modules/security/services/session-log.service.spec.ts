import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SessionLogService } from './session-log.service';
import { SessionLog, SessionStatus } from '../entities/session-log.entity';

describe('SessionLogService', () => {
  let service: SessionLogService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 5 }),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionLogService,
        {
          provide: getRepositoryToken(SessionLog),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SessionLogService>(SessionLogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a new session log', async () => {
      const sessionData = {
        user_id: 'user-123',
        session_id: 'session-abc',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        device_type: 'desktop',
        browser: 'Chrome',
        os: 'Windows 10',
        location: 'New York, US',
        expires_at: new Date('2025-12-31'),
        metadata: { fingerprint: 'abc123' },
      };

      const mockSession = {
        id: 'log-123',
        ...sessionData,
        logged_in_at: expect.any(Date),
        last_activity_at: expect.any(Date),
        status: SessionStatus.ACTIVE,
      };

      mockRepository.create.mockReturnValue(mockSession);
      mockRepository.save.mockResolvedValue(mockSession);

      const result = await service.createSession(sessionData);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...sessionData,
          logged_in_at: expect.any(Date),
          last_activity_at: expect.any(Date),
          status: SessionStatus.ACTIVE,
        }),
      );
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });

    it('should create session with minimal data', async () => {
      const sessionData = {
        user_id: 'user-456',
        session_id: 'session-xyz',
        ip_address: '10.0.0.1',
      };

      mockRepository.create.mockReturnValue({ id: 'log-456', ...sessionData });
      mockRepository.save.mockResolvedValue({ id: 'log-456', ...sessionData });

      const result = await service.createSession(sessionData);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-456',
          session_id: 'session-xyz',
          ip_address: '10.0.0.1',
          status: SessionStatus.ACTIVE,
        }),
      );
    });
  });

  describe('updateActivity', () => {
    it('should update last activity timestamp and increment actions count', async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.updateActivity('session-abc');

      expect(mockRepository.update).toHaveBeenCalledWith(
        { session_id: 'session-abc', status: SessionStatus.ACTIVE },
        {
          last_activity_at: expect.any(Date),
          actions_count: expect.any(Function),
        },
      );
    });

    it('should not throw error when session not found', async () => {
      mockRepository.update.mockResolvedValue({ affected: 0 });

      await expect(service.updateActivity('nonexistent')).resolves.not.toThrow();
    });
  });

  describe('logoutSession', () => {
    it('should logout a session successfully', async () => {
      const mockSession = {
        id: 'log-123',
        session_id: 'session-abc',
        status: SessionStatus.ACTIVE,
        logged_out_at: null,
      };

      mockRepository.findOne.mockResolvedValue(mockSession);
      mockRepository.save.mockResolvedValue({
        ...mockSession,
        status: SessionStatus.LOGGED_OUT,
        logged_out_at: expect.any(Date),
      });

      const result = await service.logoutSession('session-abc');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { session_id: 'session-abc' },
      });
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SessionStatus.LOGGED_OUT,
        }),
      );
      expect(result.status).toBe(SessionStatus.LOGGED_OUT);
    });

    it('should throw error when session not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.logoutSession('nonexistent')).rejects.toThrow(
        'Session nonexistent not found',
      );
    });
  });

  describe('revokeSession', () => {
    it('should revoke a session with a reason', async () => {
      const mockSession = {
        id: 'log-123',
        session_id: 'session-abc',
        status: SessionStatus.ACTIVE,
        revoke_reason: null,
        logged_out_at: null,
      };

      mockRepository.findOne.mockResolvedValue(mockSession);
      mockRepository.save.mockResolvedValue({
        ...mockSession,
        status: SessionStatus.REVOKED,
        revoke_reason: 'Security concern',
        logged_out_at: expect.any(Date),
      });

      const result = await service.revokeSession('session-abc', 'Security concern');

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: SessionStatus.REVOKED,
          revoke_reason: 'Security concern',
        }),
      );
      expect(result.status).toBe(SessionStatus.REVOKED);
      expect(result.revoke_reason).toBe('Security concern');
    });

    it('should throw error when session not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.revokeSession('nonexistent', 'reason')).rejects.toThrow(
        'Session nonexistent not found',
      );
    });
  });

  describe('revokeAllUserSessions', () => {
    it('should revoke all active sessions for a user', async () => {
      mockRepository.update.mockResolvedValue({ affected: 3 });

      const result = await service.revokeAllUserSessions('user-123', 'Password changed');

      expect(result).toBe(3);
      expect(mockRepository.update).toHaveBeenCalledWith(
        { user_id: 'user-123', status: SessionStatus.ACTIVE },
        {
          status: SessionStatus.REVOKED,
          revoke_reason: 'Password changed',
          logged_out_at: expect.any(Date),
        },
      );
    });

    it('should return 0 when no sessions to revoke', async () => {
      mockRepository.update.mockResolvedValue({ affected: 0 });

      const result = await service.revokeAllUserSessions('user-456', 'reason');

      expect(result).toBe(0);
    });

    it('should handle undefined affected count', async () => {
      mockRepository.update.mockResolvedValue({});

      const result = await service.revokeAllUserSessions('user-789', 'reason');

      expect(result).toBe(0);
    });
  });

  describe('getActiveSessions', () => {
    it('should return all active sessions for a user', async () => {
      const mockSessions = [
        { id: 'log-1', session_id: 'session-1', status: SessionStatus.ACTIVE },
        { id: 'log-2', session_id: 'session-2', status: SessionStatus.ACTIVE },
      ];

      mockRepository.find.mockResolvedValue(mockSessions);

      const result = await service.getActiveSessions('user-123');

      expect(result).toEqual(mockSessions);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { user_id: 'user-123', status: SessionStatus.ACTIVE },
        order: { last_activity_at: 'DESC' },
      });
    });

    it('should return empty array when no active sessions', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getActiveSessions('user-456');

      expect(result).toEqual([]);
    });
  });

  describe('getSessionHistory', () => {
    it('should return session history with default limit', async () => {
      const mockSessions = [
        { id: 'log-1', status: SessionStatus.LOGGED_OUT },
        { id: 'log-2', status: SessionStatus.EXPIRED },
      ];

      mockRepository.find.mockResolvedValue(mockSessions);

      const result = await service.getSessionHistory('user-123');

      expect(result).toEqual(mockSessions);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { user_id: 'user-123' },
        order: { logged_in_at: 'DESC' },
        take: 50,
      });
    });

    it('should return session history with custom limit', async () => {
      mockRepository.find.mockResolvedValue([]);

      await service.getSessionHistory('user-123', 10);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { user_id: 'user-123' },
        order: { logged_in_at: 'DESC' },
        take: 10,
      });
    });
  });

  describe('getSuspiciousSessions', () => {
    it('should return suspicious sessions', async () => {
      const mockSessions = [
        { id: 'log-1', is_suspicious: true },
        { id: 'log-2', is_suspicious: true },
      ];

      mockRepository.find.mockResolvedValue(mockSessions);

      const result = await service.getSuspiciousSessions();

      expect(result).toEqual(mockSessions);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { is_suspicious: true },
        order: { logged_in_at: 'DESC' },
        take: 100,
      });
    });

    it('should return empty array when no suspicious sessions', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getSuspiciousSessions();

      expect(result).toEqual([]);
    });
  });

  describe('markSuspicious', () => {
    it('should mark a session as suspicious', async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.markSuspicious('session-abc');

      expect(mockRepository.update).toHaveBeenCalledWith(
        { session_id: 'session-abc' },
        { is_suspicious: true },
      );
    });
  });

  describe('expireOldSessions', () => {
    it('should expire sessions past their expiry date', async () => {
      const result = await service.expireOldSessions();

      expect(result).toBe(5);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should return 0 when no sessions to expire', async () => {
      mockRepository.createQueryBuilder.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      });

      const result = await service.expireOldSessions();

      expect(result).toBe(0);
    });

    it('should handle undefined affected count', async () => {
      mockRepository.createQueryBuilder.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      });

      const result = await service.expireOldSessions();

      expect(result).toBe(0);
    });
  });

  describe('cleanOldSessions', () => {
    it('should clean sessions older than specified days', async () => {
      const result = await service.cleanOldSessions(90);

      expect(result).toBe(5);
      expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should use default 90 days when not specified', async () => {
      await service.cleanOldSessions();

      expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should return 0 when no sessions to clean', async () => {
      mockRepository.createQueryBuilder.mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      });

      const result = await service.cleanOldSessions();

      expect(result).toBe(0);
    });

    it('should handle undefined affected count', async () => {
      mockRepository.createQueryBuilder.mockReturnValue({
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      });

      const result = await service.cleanOldSessions();

      expect(result).toBe(0);
    });

    it('should not delete active sessions', async () => {
      const qb = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 3 }),
      };
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      await service.cleanOldSessions(30);

      expect(qb.andWhere).toHaveBeenCalledWith('status != :active', {
        active: SessionStatus.ACTIVE,
      });
    });
  });
});
