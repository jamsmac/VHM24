import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SecurityEventService } from './security-event.service';
import { SecurityEvent, SecurityEventType, SecurityLevel } from '../entities/security-event.entity';

describe('SecurityEventService', () => {
  let service: SecurityEventService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityEventService,
        {
          provide: getRepositoryToken(SecurityEvent),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SecurityEventService>(SecurityEventService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('logEvent', () => {
    it('should log a security event with provided security level', async () => {
      const eventData = {
        user_id: 'user-123',
        user_email: 'test@example.com',
        event_type: SecurityEventType.LOGIN_SUCCESS,
        security_level: SecurityLevel.LOW,
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        location: 'New York, US',
        session_id: 'session-123',
        description: 'Successful login',
      };

      const mockEvent = { id: 'event-123', ...eventData };
      mockRepository.create.mockReturnValue(mockEvent);
      mockRepository.save.mockResolvedValue(mockEvent);

      const result = await service.logEvent(eventData);

      expect(mockRepository.create).toHaveBeenCalledWith(eventData);
      expect(mockRepository.save).toHaveBeenCalledWith(mockEvent);
      expect(result).toEqual(mockEvent);
    });

    it('should calculate security level when not provided', async () => {
      const eventData = {
        user_id: 'user-123',
        event_type: SecurityEventType.LOGIN_FAILED,
      };

      const mockEvent = { id: 'event-123', ...eventData, security_level: SecurityLevel.MEDIUM };
      mockRepository.create.mockReturnValue(mockEvent);
      mockRepository.save.mockResolvedValue(mockEvent);

      await service.logEvent(eventData);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...eventData,
        security_level: SecurityLevel.MEDIUM,
      });
    });

    it('should assign CRITICAL level for account locked events', async () => {
      const eventData = {
        user_id: 'user-123',
        event_type: SecurityEventType.ACCOUNT_LOCKED,
      };

      const mockEvent = { id: 'event-123', ...eventData, security_level: SecurityLevel.CRITICAL };
      mockRepository.create.mockReturnValue(mockEvent);
      mockRepository.save.mockResolvedValue(mockEvent);

      await service.logEvent(eventData);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...eventData,
        security_level: SecurityLevel.CRITICAL,
      });
    });

    it('should assign CRITICAL level for suspicious activity events', async () => {
      const eventData = {
        user_id: 'user-123',
        event_type: SecurityEventType.SUSPICIOUS_ACTIVITY,
      };

      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      await service.logEvent(eventData);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...eventData,
        security_level: SecurityLevel.CRITICAL,
      });
    });

    it('should assign CRITICAL level for bulk operation events', async () => {
      const eventData = {
        user_id: 'user-123',
        event_type: SecurityEventType.BULK_OPERATION,
      };

      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      await service.logEvent(eventData);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...eventData,
        security_level: SecurityLevel.CRITICAL,
      });
    });

    it('should assign HIGH level for password changed events', async () => {
      const eventData = {
        user_id: 'user-123',
        event_type: SecurityEventType.PASSWORD_CHANGED,
      };

      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      await service.logEvent(eventData);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...eventData,
        security_level: SecurityLevel.HIGH,
      });
    });

    it('should assign HIGH level for two factor disabled events', async () => {
      const eventData = {
        user_id: 'user-123',
        event_type: SecurityEventType.TWO_FACTOR_DISABLED,
      };

      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      await service.logEvent(eventData);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...eventData,
        security_level: SecurityLevel.HIGH,
      });
    });

    it('should assign HIGH level for permission denied events', async () => {
      const eventData = {
        user_id: 'user-123',
        event_type: SecurityEventType.PERMISSION_DENIED,
      };

      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      await service.logEvent(eventData);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...eventData,
        security_level: SecurityLevel.HIGH,
      });
    });

    it('should assign MEDIUM level for two factor failed events', async () => {
      const eventData = {
        user_id: 'user-123',
        event_type: SecurityEventType.TWO_FACTOR_FAILED,
      };

      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      await service.logEvent(eventData);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...eventData,
        security_level: SecurityLevel.MEDIUM,
      });
    });

    it('should assign MEDIUM level for password reset requested events', async () => {
      const eventData = {
        user_id: 'user-123',
        event_type: SecurityEventType.PASSWORD_RESET_REQUESTED,
      };

      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      await service.logEvent(eventData);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...eventData,
        security_level: SecurityLevel.MEDIUM,
      });
    });

    it('should assign LOW level for login success events', async () => {
      const eventData = {
        user_id: 'user-123',
        event_type: SecurityEventType.LOGIN_SUCCESS,
      };

      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      await service.logEvent(eventData);

      expect(mockRepository.create).toHaveBeenCalledWith({
        ...eventData,
        security_level: SecurityLevel.LOW,
      });
    });

    it('should log event with additional fields', async () => {
      const eventData = {
        user_id: 'user-123',
        event_type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        is_blocked: true,
        reason: 'Multiple failed attempts',
        details: { attempted_resource: '/api/admin' },
        requires_investigation: true,
      };

      mockRepository.create.mockReturnValue({});
      mockRepository.save.mockResolvedValue({});

      await service.logEvent(eventData);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          is_blocked: true,
          reason: 'Multiple failed attempts',
          details: { attempted_resource: '/api/admin' },
          requires_investigation: true,
        }),
      );
    });
  });

  describe('getFailedLoginAttempts', () => {
    it('should return count of failed login attempts within time window', async () => {
      mockRepository.count.mockResolvedValue(3);

      const result = await service.getFailedLoginAttempts('user-123', 30);

      expect(result).toBe(3);
      expect(mockRepository.count).toHaveBeenCalledWith({
        where: {
          user_id: 'user-123',
          event_type: SecurityEventType.LOGIN_FAILED,
          created_at: expect.any(Object),
        },
      });
    });

    it('should use default 30 minutes when not specified', async () => {
      mockRepository.count.mockResolvedValue(5);

      const result = await service.getFailedLoginAttempts('user-123');

      expect(result).toBe(5);
    });

    it('should return 0 when no failed attempts', async () => {
      mockRepository.count.mockResolvedValue(0);

      const result = await service.getFailedLoginAttempts('user-456');

      expect(result).toBe(0);
    });
  });

  describe('getRecentEvents', () => {
    it('should return recent events for a user', async () => {
      const mockEvents = [
        { id: 'event-1', event_type: SecurityEventType.LOGIN_SUCCESS },
        { id: 'event-2', event_type: SecurityEventType.PASSWORD_CHANGED },
      ];
      mockRepository.find.mockResolvedValue(mockEvents);

      const result = await service.getRecentEvents('user-123', 50);

      expect(result).toEqual(mockEvents);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { user_id: 'user-123' },
        order: { created_at: 'DESC' },
        take: 50,
      });
    });

    it('should use default limit when not specified', async () => {
      mockRepository.find.mockResolvedValue([]);

      await service.getRecentEvents('user-123');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { user_id: 'user-123' },
        order: { created_at: 'DESC' },
        take: 50,
      });
    });

    it('should return empty array when no events', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getRecentEvents('user-456');

      expect(result).toEqual([]);
    });
  });

  describe('getCriticalEvents', () => {
    it('should return critical events within specified days', async () => {
      const mockEvents = [
        { id: 'event-1', security_level: SecurityLevel.CRITICAL },
        { id: 'event-2', security_level: SecurityLevel.CRITICAL },
      ];
      mockRepository.find.mockResolvedValue(mockEvents);

      const result = await service.getCriticalEvents(7);

      expect(result).toEqual(mockEvents);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          security_level: SecurityLevel.CRITICAL,
          created_at: expect.any(Object),
        },
        order: { created_at: 'DESC' },
      });
    });

    it('should use default 7 days when not specified', async () => {
      mockRepository.find.mockResolvedValue([]);

      await service.getCriticalEvents();

      expect(mockRepository.find).toHaveBeenCalled();
    });
  });

  describe('getEventsRequiringInvestigation', () => {
    it('should return events requiring investigation', async () => {
      const mockEvents = [
        { id: 'event-1', requires_investigation: true, investigated_at: null },
        { id: 'event-2', requires_investigation: true, investigated_at: null },
      ];
      mockRepository.find.mockResolvedValue(mockEvents);

      const result = await service.getEventsRequiringInvestigation();

      expect(result).toEqual(mockEvents);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          requires_investigation: true,
          investigated_at: expect.any(Object),
        },
        order: { created_at: 'ASC' },
      });
    });

    it('should return empty array when no events need investigation', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getEventsRequiringInvestigation();

      expect(result).toEqual([]);
    });
  });

  describe('markInvestigated', () => {
    it('should mark an event as investigated', async () => {
      const mockEvent = {
        id: 'event-123',
        requires_investigation: true,
        investigated_at: null,
        investigated_by_id: null,
        investigation_notes: null,
      };

      mockRepository.findOne.mockResolvedValue(mockEvent);
      mockRepository.save.mockResolvedValue({
        ...mockEvent,
        investigated_at: expect.any(Date),
        investigated_by_id: 'admin-123',
        investigation_notes: 'Reviewed and cleared',
      });

      const _result = await service.markInvestigated(
        'event-123',
        'admin-123',
        'Reviewed and cleared',
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'event-123' },
      });
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          investigated_by_id: 'admin-123',
          investigation_notes: 'Reviewed and cleared',
        }),
      );
    });

    it('should throw error when event not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.markInvestigated('nonexistent', 'admin-123', 'notes')).rejects.toThrow(
        'Security event with ID nonexistent not found',
      );
    });
  });

  describe('getSecurityReport', () => {
    it('should generate a comprehensive security report', async () => {
      const mockEvents = [
        {
          security_level: SecurityLevel.CRITICAL,
          event_type: SecurityEventType.SUSPICIOUS_ACTIVITY,
          is_blocked: true,
          requires_investigation: true,
          investigated_at: null,
        },
        {
          security_level: SecurityLevel.MEDIUM,
          event_type: SecurityEventType.LOGIN_FAILED,
          is_blocked: false,
          requires_investigation: false,
          investigated_at: null,
        },
        {
          security_level: SecurityLevel.MEDIUM,
          event_type: SecurityEventType.LOGIN_FAILED,
          is_blocked: true,
          requires_investigation: false,
          investigated_at: null,
        },
        {
          security_level: SecurityLevel.LOW,
          event_type: SecurityEventType.LOGIN_SUCCESS,
          is_blocked: false,
          requires_investigation: false,
          investigated_at: null,
        },
      ];

      mockRepository.find.mockResolvedValue(mockEvents);

      const result = await service.getSecurityReport(30);

      expect(result).toEqual({
        total_events: 4,
        by_level: {
          [SecurityLevel.CRITICAL]: 1,
          [SecurityLevel.MEDIUM]: 2,
          [SecurityLevel.LOW]: 1,
        },
        by_type: {
          [SecurityEventType.SUSPICIOUS_ACTIVITY]: 1,
          [SecurityEventType.LOGIN_FAILED]: 2,
          [SecurityEventType.LOGIN_SUCCESS]: 1,
        },
        failed_logins: 2,
        suspicious_activities: 1,
        blocked_attempts: 2,
        pending_investigations: 1,
      });
    });

    it('should use default 30 days when not specified', async () => {
      mockRepository.find.mockResolvedValue([]);

      await service.getSecurityReport();

      expect(mockRepository.find).toHaveBeenCalled();
    });

    it('should return empty report when no events', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getSecurityReport();

      expect(result).toEqual({
        total_events: 0,
        by_level: {},
        by_type: {},
        failed_logins: 0,
        suspicious_activities: 0,
        blocked_attempts: 0,
        pending_investigations: 0,
      });
    });

    it('should correctly count events already investigated', async () => {
      const mockEvents = [
        {
          security_level: SecurityLevel.CRITICAL,
          event_type: SecurityEventType.SUSPICIOUS_ACTIVITY,
          is_blocked: false,
          requires_investigation: true,
          investigated_at: new Date(), // Already investigated
        },
      ];

      mockRepository.find.mockResolvedValue(mockEvents);

      const result = await service.getSecurityReport();

      expect(result.pending_investigations).toBe(0);
    });
  });
});
