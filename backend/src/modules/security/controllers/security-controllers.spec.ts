import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogController } from './audit-log.controller';
import { SecurityEventController } from './security-event.controller';
import { SessionLogController } from './session-log.controller';
import { TwoFactorAuthController } from './two-factor-auth.controller';
import { AuditLogService } from '../services/audit-log.service';
import { SecurityEventService } from '../services/security-event.service';
import { SessionLogService } from '../services/session-log.service';
import { TwoFactorAuthService } from '../services/two-factor-auth.service';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';

describe('Security Controllers', () => {
  describe('AuditLogController', () => {
    let controller: AuditLogController;
    let auditLogService: jest.Mocked<AuditLogService>;

    beforeEach(async () => {
      const mockAuditLogService = {
        log: jest.fn(),
        findByUser: jest.fn(),
        findByEntity: jest.fn(),
        findByAction: jest.fn(),
        getSensitiveActions: jest.fn(),
        getStatistics: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        controllers: [AuditLogController],
        providers: [
          {
            provide: AuditLogService,
            useValue: mockAuditLogService,
          },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(RolesGuard)
        .useValue({ canActivate: () => true })
        .compile();

      controller = module.get<AuditLogController>(AuditLogController);
      auditLogService = module.get(AuditLogService);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('create', () => {
      it('should create audit log entry', async () => {
        const dto = {
          user_id: 'user-123',
          action: 'login',
          description: 'User logged in',
        };
        const mockLog = { id: 'log-123', ...dto };
        auditLogService.log.mockResolvedValue(mockLog as any);

        const result = await controller.create(dto as any);

        expect(result).toEqual(mockLog);
        expect(auditLogService.log).toHaveBeenCalledWith(dto);
      });
    });

    describe('getByUser', () => {
      it('should return logs by user', async () => {
        const mockLogs = [{ id: 'log-1' }];
        auditLogService.findByUser.mockResolvedValue(mockLogs as any);

        const result = await controller.getByUser('user-123');

        expect(result).toEqual(mockLogs);
        expect(auditLogService.findByUser).toHaveBeenCalledWith('user-123', undefined, undefined);
      });

      it('should filter by date range', async () => {
        auditLogService.findByUser.mockResolvedValue([]);

        await controller.getByUser('user-123', '2025-01-01', '2025-12-31');

        expect(auditLogService.findByUser).toHaveBeenCalledWith(
          'user-123',
          expect.any(Date),
          expect.any(Date),
        );
      });
    });

    describe('getByEntity', () => {
      it('should return logs by entity', async () => {
        const mockLogs = [{ id: 'log-1' }];
        auditLogService.findByEntity.mockResolvedValue(mockLogs as any);

        const result = await controller.getByEntity('machine', 'entity-123');

        expect(result).toEqual(mockLogs);
        expect(auditLogService.findByEntity).toHaveBeenCalledWith('machine', 'entity-123');
      });
    });

    describe('getByAction', () => {
      it('should return logs by action', async () => {
        const mockLogs = [{ id: 'log-1' }];
        auditLogService.findByAction.mockResolvedValue(mockLogs as any);

        const result = await controller.getByAction('login');

        expect(result).toEqual(mockLogs);
        expect(auditLogService.findByAction).toHaveBeenCalledWith('login', undefined, undefined);
      });

      it('should filter by date range', async () => {
        auditLogService.findByAction.mockResolvedValue([]);

        await controller.getByAction('login', '2025-01-01', '2025-12-31');

        expect(auditLogService.findByAction).toHaveBeenCalledWith(
          'login',
          expect.any(Date),
          expect.any(Date),
        );
      });
    });

    describe('getSensitive', () => {
      it('should return sensitive actions with default days', async () => {
        const mockEvents = [{ id: 'event-1' }];
        auditLogService.getSensitiveActions.mockResolvedValue(mockEvents as any);

        const result = await controller.getSensitive();

        expect(result).toEqual(mockEvents);
        expect(auditLogService.getSensitiveActions).toHaveBeenCalledWith(7);
      });

      it('should filter by custom days', async () => {
        auditLogService.getSensitiveActions.mockResolvedValue([]);

        await controller.getSensitive(30);

        expect(auditLogService.getSensitiveActions).toHaveBeenCalledWith(30);
      });
    });

    describe('getStatistics', () => {
      it('should return statistics with default days', async () => {
        const mockStats = { total: 100 };
        auditLogService.getStatistics.mockResolvedValue(mockStats as any);

        const result = await controller.getStatistics();

        expect(result).toEqual(mockStats);
        expect(auditLogService.getStatistics).toHaveBeenCalledWith(7);
      });

      it('should filter by custom days', async () => {
        auditLogService.getStatistics.mockResolvedValue({} as any);

        await controller.getStatistics(14);

        expect(auditLogService.getStatistics).toHaveBeenCalledWith(14);
      });
    });
  });

  describe('SecurityEventController', () => {
    let controller: SecurityEventController;
    let securityEventService: jest.Mocked<SecurityEventService>;

    beforeEach(async () => {
      const mockSecurityEventService = {
        logEvent: jest.fn(),
        getRecentEvents: jest.fn(),
        getFailedLoginAttempts: jest.fn(),
        getCriticalEvents: jest.fn(),
        getEventsRequiringInvestigation: jest.fn(),
        markInvestigated: jest.fn(),
        getSecurityReport: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        controllers: [SecurityEventController],
        providers: [
          {
            provide: SecurityEventService,
            useValue: mockSecurityEventService,
          },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(RolesGuard)
        .useValue({ canActivate: () => true })
        .compile();

      controller = module.get<SecurityEventController>(SecurityEventController);
      securityEventService = module.get(SecurityEventService);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('create', () => {
      it('should create security event', async () => {
        const dto = {
          user_id: 'user-123',
          event_type: 'failed_login',
          severity: 'high',
        };
        const mockEvent = { id: 'event-123', ...dto };
        securityEventService.logEvent.mockResolvedValue(mockEvent as any);

        const result = await controller.create(dto as any);

        expect(result).toEqual(mockEvent);
        expect(securityEventService.logEvent).toHaveBeenCalledWith(dto);
      });
    });

    describe('getUserEvents', () => {
      it('should return user events with default limit', async () => {
        const mockEvents = [{ id: 'event-1' }];
        securityEventService.getRecentEvents.mockResolvedValue(mockEvents as any);

        const result = await controller.getUserEvents('user-123');

        expect(result).toEqual(mockEvents);
        expect(securityEventService.getRecentEvents).toHaveBeenCalledWith('user-123', 50);
      });

      it('should filter by custom limit', async () => {
        securityEventService.getRecentEvents.mockResolvedValue([]);

        await controller.getUserEvents('user-123', 10);

        expect(securityEventService.getRecentEvents).toHaveBeenCalledWith('user-123', 10);
      });
    });

    describe('getFailedLogins', () => {
      it('should return failed logins count', async () => {
        securityEventService.getFailedLoginAttempts.mockResolvedValue(3);

        const result = await controller.getFailedLogins('user-123');

        expect(result).toEqual({ count: 3 });
        expect(securityEventService.getFailedLoginAttempts).toHaveBeenCalledWith('user-123', 30);
      });

      it('should filter by custom minutes', async () => {
        securityEventService.getFailedLoginAttempts.mockResolvedValue(0);

        await controller.getFailedLogins('user-123', 60);

        expect(securityEventService.getFailedLoginAttempts).toHaveBeenCalledWith('user-123', 60);
      });
    });

    describe('getCriticalEvents', () => {
      it('should return critical events with default days', async () => {
        const mockEvents = [{ id: 'event-1', severity: 'critical' }];
        securityEventService.getCriticalEvents.mockResolvedValue(mockEvents as any);

        const result = await controller.getCriticalEvents();

        expect(result).toEqual(mockEvents);
        expect(securityEventService.getCriticalEvents).toHaveBeenCalledWith(7);
      });

      it('should filter by custom days', async () => {
        securityEventService.getCriticalEvents.mockResolvedValue([]);

        await controller.getCriticalEvents(14);

        expect(securityEventService.getCriticalEvents).toHaveBeenCalledWith(14);
      });
    });

    describe('getInvestigationRequired', () => {
      it('should return events requiring investigation', async () => {
        const mockEvents = [{ id: 'event-1', requires_investigation: true }];
        securityEventService.getEventsRequiringInvestigation.mockResolvedValue(mockEvents as any);

        const result = await controller.getInvestigationRequired();

        expect(result).toEqual(mockEvents);
        expect(securityEventService.getEventsRequiringInvestigation).toHaveBeenCalled();
      });
    });

    describe('investigate', () => {
      it('should mark event as investigated', async () => {
        const dto = {
          investigated_by_id: 'admin-123',
          investigation_notes: 'False alarm',
        };
        const mockEvent = { id: 'event-123', investigated: true };
        securityEventService.markInvestigated.mockResolvedValue(mockEvent as any);

        const result = await controller.investigate('event-123', dto);

        expect(result).toEqual(mockEvent);
        expect(securityEventService.markInvestigated).toHaveBeenCalledWith(
          'event-123',
          'admin-123',
          'False alarm',
        );
      });
    });

    describe('getReport', () => {
      it('should return security report with default days', async () => {
        const mockReport = { totalEvents: 100, criticalEvents: 5 };
        securityEventService.getSecurityReport.mockResolvedValue(mockReport as any);

        const result = await controller.getReport();

        expect(result).toEqual(mockReport);
        expect(securityEventService.getSecurityReport).toHaveBeenCalledWith(30);
      });

      it('should filter by custom days', async () => {
        securityEventService.getSecurityReport.mockResolvedValue({} as any);

        await controller.getReport(7);

        expect(securityEventService.getSecurityReport).toHaveBeenCalledWith(7);
      });
    });
  });

  describe('SessionLogController', () => {
    let controller: SessionLogController;
    let sessionLogService: jest.Mocked<SessionLogService>;

    beforeEach(async () => {
      const mockSessionLogService = {
        getActiveSessions: jest.fn(),
        getSessionHistory: jest.fn(),
        getSuspiciousSessions: jest.fn(),
        logoutSession: jest.fn(),
        revokeAllUserSessions: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        controllers: [SessionLogController],
        providers: [
          {
            provide: SessionLogService,
            useValue: mockSessionLogService,
          },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(RolesGuard)
        .useValue({ canActivate: () => true })
        .compile();

      controller = module.get<SessionLogController>(SessionLogController);
      sessionLogService = module.get(SessionLogService);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('getActiveSessions', () => {
      it('should return active sessions for user', async () => {
        const mockSessions = [{ id: 'session-1', is_active: true }];
        sessionLogService.getActiveSessions.mockResolvedValue(mockSessions as any);

        const result = await controller.getActiveSessions('user-123');

        expect(result).toEqual(mockSessions);
        expect(sessionLogService.getActiveSessions).toHaveBeenCalledWith('user-123');
      });
    });

    describe('getSessionHistory', () => {
      it('should return session history with default limit', async () => {
        const mockSessions = [{ id: 'session-1' }];
        sessionLogService.getSessionHistory.mockResolvedValue(mockSessions as any);

        const result = await controller.getSessionHistory('user-123');

        expect(result).toEqual(mockSessions);
        expect(sessionLogService.getSessionHistory).toHaveBeenCalledWith('user-123', 50);
      });

      it('should filter by custom limit', async () => {
        sessionLogService.getSessionHistory.mockResolvedValue([]);

        await controller.getSessionHistory('user-123', 10);

        expect(sessionLogService.getSessionHistory).toHaveBeenCalledWith('user-123', 10);
      });
    });

    describe('getSuspicious', () => {
      it('should return suspicious sessions', async () => {
        const mockSessions = [{ id: 'session-1', is_suspicious: true }];
        sessionLogService.getSuspiciousSessions.mockResolvedValue(mockSessions as any);

        const result = await controller.getSuspicious();

        expect(result).toEqual(mockSessions);
        expect(sessionLogService.getSuspiciousSessions).toHaveBeenCalled();
      });
    });

    describe('logout', () => {
      it('should logout session', async () => {
        const mockSession = { id: 'session-123', status: 'logged_out' };
        sessionLogService.logoutSession.mockResolvedValue(mockSession as any);

        await controller.logout('session-123');

        expect(sessionLogService.logoutSession).toHaveBeenCalledWith('session-123');
      });
    });

    describe('revokeAll', () => {
      it('should revoke all user sessions', async () => {
        sessionLogService.revokeAllUserSessions.mockResolvedValue(3);

        const result = await controller.revokeAll('user-123', 'Security breach');

        expect(result).toEqual({ revoked_count: 3 });
        expect(sessionLogService.revokeAllUserSessions).toHaveBeenCalledWith(
          'user-123',
          'Security breach',
        );
      });

      it('should use default reason when not provided', async () => {
        sessionLogService.revokeAllUserSessions.mockResolvedValue(1);

        await controller.revokeAll('user-123', '');

        expect(sessionLogService.revokeAllUserSessions).toHaveBeenCalledWith(
          'user-123',
          'Manual revocation',
        );
      });
    });
  });

  describe('TwoFactorAuthController', () => {
    let controller: TwoFactorAuthController;
    let twoFactorAuthService: jest.Mocked<TwoFactorAuthService>;

    beforeEach(async () => {
      const mockTwoFactorAuthService = {
        getStatus: jest.fn(),
        generateSecret: jest.fn(),
        verifyAndEnable: jest.fn(),
        verify: jest.fn(),
        verifyBackupCode: jest.fn(),
        disable: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
        controllers: [TwoFactorAuthController],
        providers: [
          {
            provide: TwoFactorAuthService,
            useValue: mockTwoFactorAuthService,
          },
        ],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(RolesGuard)
        .useValue({ canActivate: () => true })
        .compile();

      controller = module.get<TwoFactorAuthController>(TwoFactorAuthController);
      twoFactorAuthService = module.get(TwoFactorAuthService);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('getMyStatus', () => {
      it('should return 2FA status for current user', async () => {
        const mockUser = { id: 'user-123' };
        const mockStatus = { is_enabled: true, method: 'totp' };
        twoFactorAuthService.getStatus.mockResolvedValue(mockStatus as any);

        const result = await controller.getMyStatus(mockUser as any);

        expect(result).toEqual(mockStatus);
        expect(twoFactorAuthService.getStatus).toHaveBeenCalledWith('user-123');
      });
    });

    describe('getStatus', () => {
      it('should return 2FA status for specific user', async () => {
        const mockStatus = { is_enabled: false };
        twoFactorAuthService.getStatus.mockResolvedValue(mockStatus as any);

        const result = await controller.getStatus('other-user-123');

        expect(result).toEqual(mockStatus);
        expect(twoFactorAuthService.getStatus).toHaveBeenCalledWith('other-user-123');
      });
    });

    describe('setup', () => {
      it('should generate 2FA secret', async () => {
        const dto = { user_id: 'user-123', email: 'test@example.com' };
        const mockResult = { secret: 'ABCD1234', qr_code: 'data:image/png;base64,...' };
        twoFactorAuthService.generateSecret.mockResolvedValue(mockResult as any);

        const result = await controller.setup(dto);

        expect(result).toEqual(mockResult);
        expect(twoFactorAuthService.generateSecret).toHaveBeenCalledWith('user-123', 'test@example.com');
      });
    });

    describe('enable', () => {
      it('should enable 2FA with valid token', async () => {
        const dto = { user_id: 'user-123', token: '123456' };
        twoFactorAuthService.verifyAndEnable.mockResolvedValue(true);

        const result = await controller.enable(dto);

        expect(result).toEqual({ verified: true });
        expect(twoFactorAuthService.verifyAndEnable).toHaveBeenCalledWith('user-123', '123456');
      });

      it('should return false for invalid token', async () => {
        const dto = { user_id: 'user-123', token: '000000' };
        twoFactorAuthService.verifyAndEnable.mockResolvedValue(false);

        const result = await controller.enable(dto);

        expect(result).toEqual({ verified: false });
      });
    });

    describe('verify', () => {
      it('should verify 2FA token', async () => {
        const dto = { user_id: 'user-123', token: '123456' };
        twoFactorAuthService.verify.mockResolvedValue(true);

        const result = await controller.verify(dto);

        expect(result).toEqual({ verified: true });
        expect(twoFactorAuthService.verify).toHaveBeenCalledWith('user-123', '123456');
      });
    });

    describe('verifyBackupCode', () => {
      it('should verify backup code', async () => {
        const dto = { user_id: 'user-123', code: 'BACKUP-1234' };
        twoFactorAuthService.verifyBackupCode.mockResolvedValue(true);

        const result = await controller.verifyBackupCode(dto);

        expect(result).toEqual({ verified: true });
        expect(twoFactorAuthService.verifyBackupCode).toHaveBeenCalledWith('user-123', 'BACKUP-1234');
      });
    });

    describe('disable', () => {
      it('should disable 2FA', async () => {
        twoFactorAuthService.disable.mockResolvedValue(undefined);

        const result = await controller.disable('user-123');

        expect(result).toEqual({ disabled: true });
        expect(twoFactorAuthService.disable).toHaveBeenCalledWith('user-123');
      });
    });
  });
});
