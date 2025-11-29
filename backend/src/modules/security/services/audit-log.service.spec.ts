import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AuditLogService } from './audit-log.service';
import { AuditLog, AuditEventType, AuditSeverity } from '../entities/audit-log.entity';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let auditLogRepository: jest.Mocked<Repository<AuditLog>>;

  // Mock data fixtures
  const mockAuditLog: Partial<AuditLog> = {
    id: 'audit-log-uuid',
    event_type: AuditEventType.LOGIN_SUCCESS,
    severity: AuditSeverity.INFO,
    user_id: 'user-uuid',
    target_user_id: null,
    ip_address: '192.168.1.1',
    user_agent: 'Mozilla/5.0',
    description: 'User logged in successfully',
    metadata: { browser: 'Chrome' },
    success: true,
    error_message: null,
    created_at: new Date('2025-01-15T10:00:00Z'),
  };

  const mockAuditLogs: Partial<AuditLog>[] = [
    mockAuditLog,
    {
      ...mockAuditLog,
      id: 'audit-log-uuid-2',
      event_type: AuditEventType.LOGIN_FAILED,
      severity: AuditSeverity.WARNING,
      success: false,
      error_message: 'Invalid password',
    },
    {
      ...mockAuditLog,
      id: 'audit-log-uuid-3',
      event_type: AuditEventType.PASSWORD_CHANGED,
      target_user_id: 'target-user-uuid',
    },
  ];

  // Create mock repository
  const createMockRepository = () => ({
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  });

  // Create query builder mock
  const createQueryBuilderMock = (results: any[] = []) => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(results),
    delete: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 0 }),
  });

  beforeEach(async () => {
    const mockRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    auditLogRepository = module.get(getRepositoryToken(AuditLog));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // LOG TESTS
  // ============================================================================

  describe('log', () => {
    it('should create an audit log entry with all fields', async () => {
      const logData = {
        event_type: AuditEventType.LOGIN_SUCCESS,
        user_id: 'user-uuid',
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        description: 'User logged in',
        metadata: { browser: 'Chrome' },
        success: true,
        severity: AuditSeverity.INFO,
      };

      auditLogRepository.create.mockReturnValue(mockAuditLog as AuditLog);
      auditLogRepository.save.mockResolvedValue(mockAuditLog as AuditLog);

      const result = await service.log(logData);

      expect(result).toEqual(mockAuditLog);
      expect(auditLogRepository.create).toHaveBeenCalledWith({
        event_type: logData.event_type,
        user_id: logData.user_id,
        target_user_id: null,
        ip_address: logData.ip_address,
        user_agent: logData.user_agent,
        description: logData.description,
        metadata: logData.metadata,
        success: true,
        error_message: null,
        severity: AuditSeverity.INFO,
      });
      expect(auditLogRepository.save).toHaveBeenCalled();
    });

    it('should create audit log with default values when optional fields are not provided', async () => {
      const minimalLogData = {
        event_type: AuditEventType.LOGOUT,
      };

      auditLogRepository.create.mockReturnValue({
        ...mockAuditLog,
        user_id: null,
        ip_address: null,
        user_agent: null,
        description: null,
        metadata: {},
        success: true,
        error_message: null,
        severity: AuditSeverity.INFO,
      } as AuditLog);
      auditLogRepository.save.mockResolvedValue(mockAuditLog as AuditLog);

      await service.log(minimalLogData);

      expect(auditLogRepository.create).toHaveBeenCalledWith({
        event_type: AuditEventType.LOGOUT,
        user_id: null,
        target_user_id: null,
        ip_address: null,
        user_agent: null,
        description: null,
        metadata: {},
        success: true,
        error_message: null,
        severity: AuditSeverity.INFO,
      });
    });

    it('should set success to false when explicitly specified', async () => {
      const failedLogData = {
        event_type: AuditEventType.LOGIN_FAILED,
        success: false,
        error_message: 'Invalid credentials',
      };

      auditLogRepository.create.mockReturnValue({
        ...mockAuditLog,
        success: false,
        error_message: 'Invalid credentials',
      } as AuditLog);
      auditLogRepository.save.mockResolvedValue(mockAuditLog as AuditLog);

      await service.log(failedLogData);

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error_message: 'Invalid credentials',
        }),
      );
    });

    it('should log security events with CRITICAL severity', async () => {
      const securityLogData = {
        event_type: AuditEventType.BRUTE_FORCE_DETECTED,
        ip_address: '192.168.1.100',
        severity: AuditSeverity.CRITICAL,
        description: 'Brute force attack detected from IP',
      };

      auditLogRepository.create.mockReturnValue({
        ...mockAuditLog,
        severity: AuditSeverity.CRITICAL,
      } as AuditLog);
      auditLogRepository.save.mockResolvedValue(mockAuditLog as AuditLog);

      await service.log(securityLogData);

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: AuditSeverity.CRITICAL,
        }),
      );
    });

    it('should handle target_user_id for user management events', async () => {
      const userManagementLog = {
        event_type: AuditEventType.ROLE_ASSIGNED,
        user_id: 'admin-uuid',
        target_user_id: 'target-user-uuid',
        description: 'Admin assigned new role to user',
      };

      auditLogRepository.create.mockReturnValue({
        ...mockAuditLog,
        target_user_id: 'target-user-uuid',
      } as AuditLog);
      auditLogRepository.save.mockResolvedValue(mockAuditLog as AuditLog);

      await service.log(userManagementLog);

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          target_user_id: 'target-user-uuid',
        }),
      );
    });
  });

  // ============================================================================
  // FIND BY USER TESTS
  // ============================================================================

  describe('findByUser', () => {
    it('should return logs for a specific user', async () => {
      const queryBuilder = createQueryBuilderMock(mockAuditLogs as AuditLog[]);
      auditLogRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.findByUser('user-uuid');

      expect(result).toEqual(mockAuditLogs);
      expect(queryBuilder.where).toHaveBeenCalledWith('log.user_id = :userId', {
        userId: 'user-uuid',
      });
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('log.created_at', 'DESC');
      expect(queryBuilder.take).toHaveBeenCalledWith(1000);
    });

    it('should filter by date range when provided', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      const queryBuilder = createQueryBuilderMock(mockAuditLogs as AuditLog[]);
      auditLogRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findByUser('user-uuid', startDate, endDate);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'log.created_at BETWEEN :startDate AND :endDate',
        { startDate, endDate },
      );
    });

    it('should not filter by date when dates are not provided', async () => {
      const queryBuilder = createQueryBuilderMock(mockAuditLogs as AuditLog[]);
      auditLogRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findByUser('user-uuid');

      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // FIND BY EVENT TYPE TESTS
  // ============================================================================

  describe('findByEventType', () => {
    it('should return logs for a specific event type', async () => {
      const loginLogs = mockAuditLogs.filter(
        (log) => log.event_type === AuditEventType.LOGIN_SUCCESS,
      );
      const queryBuilder = createQueryBuilderMock(loginLogs as AuditLog[]);
      auditLogRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.findByEventType(AuditEventType.LOGIN_SUCCESS);

      expect(result).toEqual(loginLogs);
      expect(queryBuilder.where).toHaveBeenCalledWith('log.event_type = :eventType', {
        eventType: AuditEventType.LOGIN_SUCCESS,
      });
    });

    it('should filter by date range when provided', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      const queryBuilder = createQueryBuilderMock([]);
      auditLogRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findByEventType(AuditEventType.LOGIN_FAILED, startDate, endDate);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'log.created_at BETWEEN :startDate AND :endDate',
        { startDate, endDate },
      );
    });
  });

  // ============================================================================
  // GET STATISTICS TESTS
  // ============================================================================

  describe('getStatistics', () => {
    it('should return statistics for the last 7 days by default', async () => {
      const logsWithUsers = [
        { ...mockAuditLog, event_type: AuditEventType.LOGIN_SUCCESS, user_id: 'user-1' },
        { ...mockAuditLog, event_type: AuditEventType.LOGIN_SUCCESS, user_id: 'user-1' },
        { ...mockAuditLog, event_type: AuditEventType.LOGIN_FAILED, user_id: 'user-2' },
        { ...mockAuditLog, event_type: AuditEventType.PASSWORD_CHANGED, user_id: 'user-1' },
      ];

      auditLogRepository.find.mockResolvedValue(logsWithUsers as AuditLog[]);

      const result = await service.getStatistics();

      expect(result.total_actions).toBe(4);
      expect(result.successful_logins).toBe(2);
      expect(result.failed_logins).toBe(1);
      expect(result.actions_by_type[AuditEventType.LOGIN_SUCCESS]).toBe(2);
      expect(result.actions_by_type[AuditEventType.LOGIN_FAILED]).toBe(1);
      expect(result.top_users).toHaveLength(2);
      expect(result.top_users[0].user_id).toBe('user-1');
      expect(result.top_users[0].count).toBe(3);
    });

    it('should accept custom days parameter', async () => {
      auditLogRepository.find.mockResolvedValue([]);

      await service.getStatistics(30);

      expect(auditLogRepository.find).toHaveBeenCalledWith({
        where: {
          created_at: expect.anything(),
        },
      });
    });

    it('should return empty statistics when no logs exist', async () => {
      auditLogRepository.find.mockResolvedValue([]);

      const result = await service.getStatistics();

      expect(result.total_actions).toBe(0);
      expect(result.successful_logins).toBe(0);
      expect(result.failed_logins).toBe(0);
      expect(result.top_users).toHaveLength(0);
      expect(Object.keys(result.actions_by_type)).toHaveLength(0);
    });

    it('should limit top users to 10', async () => {
      const logsWithManyUsers = Array.from({ length: 15 }, (_, i) => ({
        ...mockAuditLog,
        user_id: `user-${i}`,
      }));

      auditLogRepository.find.mockResolvedValue(logsWithManyUsers as AuditLog[]);

      const result = await service.getStatistics();

      expect(result.top_users.length).toBeLessThanOrEqual(10);
    });
  });

  // ============================================================================
  // CLEAN OLD LOGS TESTS
  // ============================================================================

  describe('cleanOldLogs', () => {
    it('should delete logs older than 90 days by default', async () => {
      const queryBuilder = createQueryBuilderMock();
      queryBuilder.execute.mockResolvedValue({ affected: 100 });
      auditLogRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.cleanOldLogs();

      expect(result).toBe(100);
      expect(queryBuilder.delete).toHaveBeenCalled();
      expect(queryBuilder.where).toHaveBeenCalledWith('created_at < :cutoffDate', {
        cutoffDate: expect.any(Date),
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('severity != :critical', {
        critical: AuditSeverity.CRITICAL,
      });
    });

    it('should accept custom retention period', async () => {
      const queryBuilder = createQueryBuilderMock();
      queryBuilder.execute.mockResolvedValue({ affected: 50 });
      auditLogRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.cleanOldLogs(30);

      expect(result).toBe(50);
    });

    it('should return 0 when no logs are deleted', async () => {
      const queryBuilder = createQueryBuilderMock();
      queryBuilder.execute.mockResolvedValue({ affected: 0 });
      auditLogRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.cleanOldLogs();

      expect(result).toBe(0);
    });

    it('should not delete CRITICAL severity logs', async () => {
      const queryBuilder = createQueryBuilderMock();
      queryBuilder.execute.mockResolvedValue({ affected: 10 });
      auditLogRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.cleanOldLogs();

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('severity != :critical', {
        critical: AuditSeverity.CRITICAL,
      });
    });
  });

  // ============================================================================
  // FIND ALL TESTS
  // ============================================================================

  describe('findAll', () => {
    it('should return all logs without filters', async () => {
      const queryBuilder = createQueryBuilderMock(mockAuditLogs as AuditLog[]);
      auditLogRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.findAll();

      expect(result).toEqual(mockAuditLogs);
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('log.created_at', 'DESC');
      expect(queryBuilder.take).toHaveBeenCalledWith(100);
    });

    it('should filter by user_id', async () => {
      const queryBuilder = createQueryBuilderMock(mockAuditLogs as AuditLog[]);
      auditLogRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findAll({ user_id: 'user-uuid' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('log.user_id = :userId', {
        userId: 'user-uuid',
      });
    });

    it('should filter by event_type', async () => {
      const queryBuilder = createQueryBuilderMock(mockAuditLogs as AuditLog[]);
      auditLogRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findAll({ event_type: AuditEventType.LOGIN_SUCCESS });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('log.event_type = :eventType', {
        eventType: AuditEventType.LOGIN_SUCCESS,
      });
    });

    it('should filter by severity', async () => {
      const queryBuilder = createQueryBuilderMock(mockAuditLogs as AuditLog[]);
      auditLogRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findAll({ severity: AuditSeverity.WARNING });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('log.severity = :severity', {
        severity: AuditSeverity.WARNING,
      });
    });

    it('should filter by date range', async () => {
      const queryBuilder = createQueryBuilderMock(mockAuditLogs as AuditLog[]);
      auditLogRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findAll({
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'log.created_at BETWEEN :startDate AND :endDate',
        {
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        },
      );
    });

    it('should apply custom limit', async () => {
      const queryBuilder = createQueryBuilderMock(mockAuditLogs as AuditLog[]);
      auditLogRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findAll({ limit: 50 });

      expect(queryBuilder.take).toHaveBeenCalledWith(50);
    });
  });

  // ============================================================================
  // FIND ONE TESTS
  // ============================================================================

  describe('findOne', () => {
    it('should return a single audit log by ID', async () => {
      auditLogRepository.findOne.mockResolvedValue(mockAuditLog as AuditLog);

      const result = await service.findOne('audit-log-uuid');

      expect(result).toEqual(mockAuditLog);
      expect(auditLogRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'audit-log-uuid' },
      });
    });

    it('should return null when audit log not found', async () => {
      auditLogRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne('non-existent-uuid');

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // FIND BY ENTITY TESTS
  // ============================================================================

  describe('findByEntity', () => {
    it('should return logs for a specific entity', async () => {
      const entityLogs = [
        {
          ...mockAuditLog,
          metadata: { entity_type: 'machine', entity_id: 'machine-uuid' },
        },
      ];
      const queryBuilder = createQueryBuilderMock(entityLogs as AuditLog[]);
      auditLogRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.findByEntity('machine', 'machine-uuid');

      expect(result).toEqual(entityLogs);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        "log.metadata->>'entity_type' = :entityType",
        {
          entityType: 'machine',
        },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith("log.metadata->>'entity_id' = :entityId", {
        entityId: 'machine-uuid',
      });
    });
  });

  // ============================================================================
  // FIND BY ACTION TESTS
  // ============================================================================

  describe('findByAction', () => {
    it('should return logs for a specific action', async () => {
      const actionLogs = [{ ...mockAuditLog, metadata: { action: 'create' } }];
      const queryBuilder = createQueryBuilderMock(actionLogs as AuditLog[]);
      auditLogRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.findByAction('create');

      expect(result).toEqual(actionLogs);
      expect(queryBuilder.where).toHaveBeenCalledWith("log.metadata->>'action' = :action", {
        action: 'create',
      });
    });

    it('should filter by date range when provided', async () => {
      const queryBuilder = createQueryBuilderMock([]);
      auditLogRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.findByAction('update', new Date('2025-01-01'), new Date('2025-01-31'));

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'log.created_at BETWEEN :startDate AND :endDate',
        {
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        },
      );
    });
  });

  // ============================================================================
  // GET SENSITIVE ACTIONS TESTS
  // ============================================================================

  describe('getSensitiveActions', () => {
    it('should return CRITICAL and WARNING severity logs from last 7 days', async () => {
      const sensitiveLogs = [
        { ...mockAuditLog, severity: AuditSeverity.CRITICAL },
        { ...mockAuditLog, severity: AuditSeverity.WARNING },
      ];
      const queryBuilder = createQueryBuilderMock(sensitiveLogs as AuditLog[]);
      auditLogRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      const result = await service.getSensitiveActions();

      expect(result).toEqual(sensitiveLogs);
      expect(queryBuilder.where).toHaveBeenCalledWith('log.severity = :severity', {
        severity: AuditSeverity.CRITICAL,
      });
      expect(queryBuilder.orWhere).toHaveBeenCalledWith('log.severity = :warning', {
        warning: AuditSeverity.WARNING,
      });
    });

    it('should accept custom days parameter', async () => {
      const queryBuilder = createQueryBuilderMock([]);
      auditLogRepository.createQueryBuilder.mockReturnValue(queryBuilder as any);

      await service.getSensitiveActions(30);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('log.created_at >= :startDate', {
        startDate: expect.any(Date),
      });
    });
  });
});
