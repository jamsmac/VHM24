import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { AuditLogService, AuditContext } from './audit-log.service';
import { AuditLog, AuditEventType, AuditSeverity } from './entities/audit-log.entity';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let repository: jest.Mocked<Repository<AuditLog>>;

  const mockAuditLog: Partial<AuditLog> = {
    id: 'audit-log-1',
    event_type: AuditEventType.LOGIN_SUCCESS,
    severity: AuditSeverity.INFO,
    user_id: 'user-1',
    target_user_id: null,
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0',
    description: 'User logged in successfully',
    metadata: {},
    success: true,
    error_message: null,
    created_at: new Date('2025-01-15T10:00:00Z'),
    updated_at: new Date('2025-01-15T10:00:00Z'),
    deleted_at: null,
  };

  const mockContext: AuditContext = {
    userId: 'user-1',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(1),
    getMany: jest.fn().mockResolvedValue([mockAuditLog]),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 5 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: {
            create: jest.fn().mockImplementation((dto) => ({ ...mockAuditLog, ...dto })),
            save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...mockAuditLog, ...entity })),
            findOne: jest.fn().mockResolvedValue(mockAuditLog),
            find: jest.fn().mockResolvedValue([mockAuditLog]),
            count: jest.fn().mockResolvedValue(10),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    repository = module.get(getRepositoryToken(AuditLog));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an audit log entry', async () => {
      const dto = {
        event_type: AuditEventType.LOGIN_SUCCESS,
        user_id: 'user-1',
        ip_address: '192.168.1.1',
        description: 'Test login',
      };

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        event_type: AuditEventType.LOGIN_SUCCESS,
        user_id: 'user-1',
      }));
      expect(repository.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should use default severity INFO when not provided', async () => {
      const dto = {
        event_type: AuditEventType.LOGOUT,
      };

      await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        severity: AuditSeverity.INFO,
      }));
    });

    it('should default success to true when not provided', async () => {
      const dto = {
        event_type: AuditEventType.LOGIN_SUCCESS,
      };

      await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
      }));
    });
  });

  describe('findAll', () => {
    it('should return paginated audit logs', async () => {
      const result = await service.findAll({ limit: 50, offset: 0 });

      expect(result).toEqual({
        data: [mockAuditLog],
        total: 1,
        limit: 50,
        offset: 0,
      });
    });

    it('should apply event_type filter', async () => {
      await service.findAll({ event_type: AuditEventType.LOGIN_FAILED });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit_log.event_type = :event_type',
        { event_type: AuditEventType.LOGIN_FAILED },
      );
    });

    it('should apply severity filter', async () => {
      await service.findAll({ severity: AuditSeverity.CRITICAL });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit_log.severity = :severity',
        { severity: AuditSeverity.CRITICAL },
      );
    });

    it('should apply user_id filter', async () => {
      await service.findAll({ user_id: 'user-123' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit_log.user_id = :user_id',
        { user_id: 'user-123' },
      );
    });

    it('should apply ip_address filter', async () => {
      await service.findAll({ ip_address: '10.0.0.1' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit_log.ip_address = :ip_address',
        { ip_address: '10.0.0.1' },
      );
    });

    it('should apply date range filter', async () => {
      await service.findAll({
        from_date: '2025-01-01T00:00:00Z',
        to_date: '2025-01-31T23:59:59Z',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'audit_log.created_at BETWEEN :from_date AND :to_date',
        expect.any(Object),
      );
    });

    it('should use default pagination values', async () => {
      const result = await service.findAll({});

      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return audit log by ID', async () => {
      const result = await service.findOne('audit-log-1');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'audit-log-1' },
        relations: ['user', 'target_user'],
      });
      expect(result).toEqual(mockAuditLog);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findOne.mockResolvedValueOnce(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByUser', () => {
    it('should return audit logs for a user', async () => {
      const result = await service.findByUser('user-1');

      expect(repository.find).toHaveBeenCalledWith({
        where: { user_id: 'user-1' },
        order: { created_at: 'DESC' },
        take: 100,
        relations: ['target_user'],
      });
      expect(result).toEqual([mockAuditLog]);
    });

    it('should respect limit parameter', async () => {
      await service.findByUser('user-1', 50);

      expect(repository.find).toHaveBeenCalledWith(expect.objectContaining({
        take: 50,
      }));
    });
  });

  describe('findByEventType', () => {
    it('should return audit logs by event type', async () => {
      const result = await service.findByEventType(AuditEventType.BRUTE_FORCE_DETECTED);

      expect(repository.find).toHaveBeenCalledWith({
        where: { event_type: AuditEventType.BRUTE_FORCE_DETECTED },
        order: { created_at: 'DESC' },
        take: 100,
        relations: ['user', 'target_user'],
      });
      expect(result).toEqual([mockAuditLog]);
    });
  });

  describe('findByIpAddress', () => {
    it('should return audit logs by IP address', async () => {
      const result = await service.findByIpAddress('192.168.1.1');

      expect(repository.find).toHaveBeenCalledWith({
        where: { ip_address: '192.168.1.1' },
        order: { created_at: 'DESC' },
        take: 100,
        relations: ['user'],
      });
      expect(result).toEqual([mockAuditLog]);
    });
  });

  describe('Helper logging methods', () => {
    it('should log successful login', async () => {
      const result = await service.logLoginSuccess('user-1', mockContext);

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        event_type: AuditEventType.LOGIN_SUCCESS,
        severity: AuditSeverity.INFO,
        user_id: 'user-1',
        success: true,
      }));
      expect(result).toBeDefined();
    });

    it('should log failed login', async () => {
      await service.logLoginFailed('test@example.com', mockContext, 'Invalid password');

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        event_type: AuditEventType.LOGIN_FAILED,
        severity: AuditSeverity.WARNING,
        success: false,
        error_message: 'Invalid password',
      }));
    });

    it('should log logout', async () => {
      await service.logLogout('user-1', mockContext);

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        event_type: AuditEventType.LOGOUT,
        user_id: 'user-1',
      }));
    });

    it('should log token refresh', async () => {
      await service.logTokenRefresh('user-1', mockContext);

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        event_type: AuditEventType.TOKEN_REFRESH,
        user_id: 'user-1',
      }));
    });

    it('should log password change', async () => {
      await service.logPasswordChanged('user-1', mockContext);

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        event_type: AuditEventType.PASSWORD_CHANGED,
        user_id: 'user-1',
      }));
    });

    it('should log 2FA enabled', async () => {
      await service.logTwoFaEnabled('user-1', mockContext);

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        event_type: AuditEventType.TWO_FA_ENABLED,
        user_id: 'user-1',
      }));
    });

    it('should log 2FA disabled with WARNING severity', async () => {
      await service.logTwoFaDisabled('user-1', mockContext);

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        event_type: AuditEventType.TWO_FA_DISABLED,
        severity: AuditSeverity.WARNING,
      }));
    });

    it('should log 2FA verification failed', async () => {
      await service.logTwoFaFailed('user-1', mockContext);

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        event_type: AuditEventType.TWO_FA_FAILED,
        success: false,
      }));
    });

    it('should log account created with target user', async () => {
      await service.logAccountCreated('admin-1', 'new-user-1', mockContext);

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        event_type: AuditEventType.ACCOUNT_CREATED,
        user_id: 'admin-1',
        target_user_id: 'new-user-1',
      }));
    });

    it('should log account updated with changes metadata', async () => {
      const changes = { role: 'Admin', status: 'active' };
      await service.logAccountUpdated('admin-1', 'user-1', changes, mockContext);

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        event_type: AuditEventType.ACCOUNT_UPDATED,
        metadata: { changes },
      }));
    });

    it('should log account blocked with reason', async () => {
      await service.logAccountBlocked('admin-1', 'user-1', 'Suspicious activity', mockContext);

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        event_type: AuditEventType.ACCOUNT_BLOCKED,
        severity: AuditSeverity.WARNING,
        metadata: { reason: 'Suspicious activity' },
      }));
    });

    it('should log role assigned', async () => {
      await service.logRoleAssigned('admin-1', 'user-1', 'Manager', mockContext);

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        event_type: AuditEventType.ROLE_ASSIGNED,
        metadata: { role: 'Manager' },
      }));
    });

    it('should log role removed with WARNING severity', async () => {
      await service.logRoleRemoved('admin-1', 'user-1', 'Admin', mockContext);

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        event_type: AuditEventType.ROLE_REMOVED,
        severity: AuditSeverity.WARNING,
      }));
    });

    it('should log brute force detected with CRITICAL severity', async () => {
      await service.logBruteForceDetected('192.168.1.100', 'test@example.com', 10);

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        event_type: AuditEventType.BRUTE_FORCE_DETECTED,
        severity: AuditSeverity.CRITICAL,
        ip_address: '192.168.1.100',
        metadata: { email: 'test@example.com', attemptCount: 10 },
      }));
    });

    it('should log IP blocked with CRITICAL severity', async () => {
      await service.logIpBlocked('192.168.1.100', 'Too many failed attempts', 3600);

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        event_type: AuditEventType.IP_BLOCKED,
        severity: AuditSeverity.CRITICAL,
        metadata: { reason: 'Too many failed attempts', duration: 3600 },
      }));
    });

    it('should log suspicious activity', async () => {
      const details = { action: 'Multiple concurrent logins', locations: ['US', 'RU'] };
      await service.logSuspiciousActivity('user-1', mockContext, 'Concurrent logins', details);

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        event_type: AuditEventType.SUSPICIOUS_ACTIVITY,
        severity: AuditSeverity.WARNING,
        metadata: details,
      }));
    });

    it('should log session created', async () => {
      await service.logSessionCreated('user-1', 'session-123', mockContext);

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        event_type: AuditEventType.SESSION_CREATED,
        metadata: { sessionId: 'session-123' },
      }));
    });

    it('should log session terminated', async () => {
      await service.logSessionTerminated('user-1', 'session-123', 'User logout', mockContext);

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        event_type: AuditEventType.SESSION_TERMINATED,
        metadata: { sessionId: 'session-123', reason: 'User logout' },
      }));
    });
  });

  describe('getStatistics', () => {
    beforeEach(() => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { event_type: AuditEventType.LOGIN_SUCCESS, count: '50' },
        { event_type: AuditEventType.LOGIN_FAILED, count: '10' },
      ]);
    });

    it('should return audit statistics', async () => {
      const result = await service.getStatistics();

      expect(result).toHaveProperty('totalEvents');
      expect(result).toHaveProperty('eventsByType');
      expect(result).toHaveProperty('eventsBySeverity');
      expect(result).toHaveProperty('failedLogins');
      expect(result).toHaveProperty('successfulLogins');
      expect(result).toHaveProperty('securityAlerts');
      expect(result).toHaveProperty('recentEvents');
    });

    it('should filter by date range when provided', async () => {
      const fromDate = new Date('2025-01-01');
      const toDate = new Date('2025-01-31');

      await service.getStatistics(fromDate, toDate);

      expect(repository.count).toHaveBeenCalled();
    });
  });

  describe('getFailedLoginAttempts', () => {
    it('should return count of failed login attempts for IP', async () => {
      repository.count.mockResolvedValueOnce(5);

      const result = await service.getFailedLoginAttempts('192.168.1.1', 15);

      expect(result).toBe(5);
      expect(repository.count).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          event_type: AuditEventType.LOGIN_FAILED,
          ip_address: '192.168.1.1',
        }),
      }));
    });
  });

  describe('getUserActivitySummary', () => {
    it('should return user activity summary', async () => {
      repository.count.mockResolvedValue(25);
      repository.findOne.mockResolvedValueOnce({
        ...mockAuditLog,
        event_type: AuditEventType.LOGIN_SUCCESS,
        created_at: new Date('2025-01-15'),
      } as AuditLog);
      repository.find.mockResolvedValueOnce([mockAuditLog as AuditLog]);

      const result = await service.getUserActivitySummary('user-1', 30);

      expect(result).toHaveProperty('totalEvents');
      expect(result).toHaveProperty('lastLogin');
      expect(result).toHaveProperty('loginCount');
      expect(result).toHaveProperty('failedLogins');
      expect(result).toHaveProperty('passwordChanges');
      expect(result).toHaveProperty('recentEvents');
    });

    it('should use default 30 days when not specified', async () => {
      await service.getUserActivitySummary('user-1');

      expect(repository.count).toHaveBeenCalled();
    });
  });

  describe('cleanupOldLogs', () => {
    it('should delete old audit logs', async () => {
      const result = await service.cleanupOldLogs(90);

      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'created_at < :cutoffDate',
        expect.any(Object),
      );
      expect(result).toBe(5);
    });
  });
});
