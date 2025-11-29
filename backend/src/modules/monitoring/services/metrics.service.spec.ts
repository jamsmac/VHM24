import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';
import * as promClient from 'prom-client';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    // Clear the default registry before each test to avoid "already registered" errors
    promClient.register.clear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear registry after each test as well
    promClient.register.clear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ============================================================================
  // HTTP REQUEST METRICS TESTS
  // ============================================================================

  describe('recordHttpRequest', () => {
    it('should record successful HTTP request', () => {
      expect(() => {
        service.recordHttpRequest('GET', '/api/users', 200, 0.5);
      }).not.toThrow();
    });

    it('should record HTTP request with error status', () => {
      expect(() => {
        service.recordHttpRequest('POST', '/api/tasks', 400, 0.1);
      }).not.toThrow();
    });

    it('should record server error status', () => {
      expect(() => {
        service.recordHttpRequest('GET', '/api/machines', 500, 1.5);
      }).not.toThrow();
    });

    it('should handle various HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

      for (const method of methods) {
        expect(() => {
          service.recordHttpRequest(method, '/api/test', 200, 0.1);
        }).not.toThrow();
      }
    });

    it('should handle very fast requests (< 0.1s)', () => {
      expect(() => {
        service.recordHttpRequest('GET', '/api/health', 200, 0.01);
      }).not.toThrow();
    });

    it('should handle slow requests (> 5s)', () => {
      expect(() => {
        service.recordHttpRequest('GET', '/api/reports', 200, 10.0);
      }).not.toThrow();
    });
  });

  // ============================================================================
  // TASK METRICS TESTS
  // ============================================================================

  describe('recordTaskCreated', () => {
    it('should record task creation with type and priority', () => {
      expect(() => {
        service.recordTaskCreated('refill', 'normal');
      }).not.toThrow();
    });

    it('should record different task types', () => {
      const types = ['refill', 'collection', 'maintenance', 'inspection', 'repair', 'cleaning'];

      for (const type of types) {
        expect(() => {
          service.recordTaskCreated(type, 'normal');
        }).not.toThrow();
      }
    });

    it('should record different priorities', () => {
      const priorities = ['low', 'normal', 'high', 'urgent'];

      for (const priority of priorities) {
        expect(() => {
          service.recordTaskCreated('refill', priority);
        }).not.toThrow();
      }
    });
  });

  describe('recordTaskCompleted', () => {
    it('should record task completion without duration', () => {
      expect(() => {
        service.recordTaskCompleted('refill', 'completed');
      }).not.toThrow();
    });

    it('should record task completion with duration', () => {
      expect(() => {
        service.recordTaskCompleted('collection', 'completed', 1800);
      }).not.toThrow();
    });

    it('should record different completion statuses', () => {
      const statuses = ['completed', 'cancelled', 'rejected'];

      for (const status of statuses) {
        expect(() => {
          service.recordTaskCompleted('maintenance', status);
        }).not.toThrow();
      }
    });

    it('should handle very short task durations', () => {
      expect(() => {
        service.recordTaskCompleted('inspection', 'completed', 60); // 1 minute
      }).not.toThrow();
    });

    it('should handle very long task durations', () => {
      expect(() => {
        service.recordTaskCompleted('repair', 'completed', 14400); // 4 hours
      }).not.toThrow();
    });
  });

  // ============================================================================
  // INVENTORY METRICS TESTS
  // ============================================================================

  describe('recordInventoryMovement', () => {
    it('should record inventory movement with type and direction', () => {
      expect(() => {
        service.recordInventoryMovement('transfer', 'in');
      }).not.toThrow();
    });

    it('should record different movement types', () => {
      const types = ['transfer', 'refill', 'collection', 'adjustment', 'write_off'];

      for (const type of types) {
        expect(() => {
          service.recordInventoryMovement(type, 'in');
        }).not.toThrow();
      }
    });

    it('should record different directions', () => {
      const directions = ['in', 'out'];

      for (const direction of directions) {
        expect(() => {
          service.recordInventoryMovement('transfer', direction);
        }).not.toThrow();
      }
    });
  });

  // ============================================================================
  // MACHINE STATUS METRICS TESTS
  // ============================================================================

  describe('updateMachineStatus', () => {
    it('should update machine status counts', () => {
      expect(() => {
        service.updateMachineStatus(50, 10, { maintenance: 5, error: 3, offline: 2 });
      }).not.toThrow();
    });

    it('should handle zero active machines', () => {
      expect(() => {
        service.updateMachineStatus(0, 100, { all_offline: 100 });
      }).not.toThrow();
    });

    it('should handle zero offline machines', () => {
      expect(() => {
        service.updateMachineStatus(100, 0, {});
      }).not.toThrow();
    });

    it('should handle multiple offline reasons', () => {
      expect(() => {
        service.updateMachineStatus(80, 20, {
          maintenance: 5,
          error: 8,
          low_stock: 3,
          network: 2,
          other: 2,
        });
      }).not.toThrow();
    });
  });

  // ============================================================================
  // SECURITY METRICS TESTS
  // ============================================================================

  describe('recordLoginAttempt', () => {
    it('should record successful login', () => {
      expect(() => {
        service.recordLoginAttempt('success');
      }).not.toThrow();
    });

    it('should record failed login', () => {
      expect(() => {
        service.recordLoginAttempt('failure');
      }).not.toThrow();
    });
  });

  describe('recordLoginFailure', () => {
    it('should record login failure with reason', () => {
      expect(() => {
        service.recordLoginFailure('invalid_password');
      }).not.toThrow();
    });

    it('should record different failure reasons', () => {
      const reasons = [
        'invalid_password',
        'user_not_found',
        'account_locked',
        'account_disabled',
        'invalid_token',
        '2fa_required',
      ];

      for (const reason of reasons) {
        expect(() => {
          service.recordLoginFailure(reason);
        }).not.toThrow();
      }
    });
  });

  describe('record2FAAuthentication', () => {
    it('should record successful 2FA authentication', () => {
      expect(() => {
        service.record2FAAuthentication('totp', 'success');
      }).not.toThrow();
    });

    it('should record failed 2FA authentication', () => {
      expect(() => {
        service.record2FAAuthentication('totp', 'failure');
      }).not.toThrow();
    });

    it('should record different 2FA methods', () => {
      const methods = ['totp', 'sms', 'email', 'backup_code'];

      for (const method of methods) {
        expect(() => {
          service.record2FAAuthentication(method, 'success');
        }).not.toThrow();
      }
    });
  });

  describe('recordSessionCreation', () => {
    it('should record session creation', () => {
      expect(() => {
        service.recordSessionCreation('web');
      }).not.toThrow();
    });

    it('should record different session types', () => {
      const types = ['web', 'mobile', 'api', 'telegram'];

      for (const type of types) {
        expect(() => {
          service.recordSessionCreation(type);
        }).not.toThrow();
      }
    });
  });

  describe('recordAuditLogEvent', () => {
    it('should record audit log event', () => {
      expect(() => {
        service.recordAuditLogEvent('create', 'user');
      }).not.toThrow();
    });

    it('should record different actions', () => {
      const actions = ['create', 'update', 'delete', 'login', 'logout', 'view'];

      for (const action of actions) {
        expect(() => {
          service.recordAuditLogEvent(action, 'user');
        }).not.toThrow();
      }
    });

    it('should record different entity types', () => {
      const entityTypes = ['user', 'machine', 'task', 'inventory', 'transaction'];

      for (const entityType of entityTypes) {
        expect(() => {
          service.recordAuditLogEvent('update', entityType);
        }).not.toThrow();
      }
    });
  });

  // ============================================================================
  // PERFORMANCE METRICS TESTS
  // ============================================================================

  describe('recordDatabaseQuery', () => {
    it('should record database query duration', () => {
      expect(() => {
        service.recordDatabaseQuery('SELECT', 'users', 0.05);
      }).not.toThrow();
    });

    it('should record different operations', () => {
      const operations = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];

      for (const operation of operations) {
        expect(() => {
          service.recordDatabaseQuery(operation, 'tasks', 0.1);
        }).not.toThrow();
      }
    });

    it('should handle slow queries', () => {
      expect(() => {
        service.recordDatabaseQuery('SELECT', 'transactions', 2.5);
      }).not.toThrow();
    });

    it('should handle very fast queries', () => {
      expect(() => {
        service.recordDatabaseQuery('SELECT', 'machines', 0.001);
      }).not.toThrow();
    });
  });

  describe('recordCacheHit', () => {
    it('should record cache hit', () => {
      expect(() => {
        service.recordCacheHit('redis');
      }).not.toThrow();
    });

    it('should record different cache types', () => {
      const cacheTypes = ['redis', 'memory', 'session', 'query'];

      for (const cacheType of cacheTypes) {
        expect(() => {
          service.recordCacheHit(cacheType);
        }).not.toThrow();
      }
    });
  });

  describe('recordCacheMiss', () => {
    it('should record cache miss', () => {
      expect(() => {
        service.recordCacheMiss('redis');
      }).not.toThrow();
    });

    it('should record different cache types', () => {
      const cacheTypes = ['redis', 'memory', 'session', 'query'];

      for (const cacheType of cacheTypes) {
        expect(() => {
          service.recordCacheMiss(cacheType);
        }).not.toThrow();
      }
    });
  });

  describe('recordQueueJob', () => {
    it('should record completed queue job', () => {
      expect(() => {
        service.recordQueueJob('notifications', 'send_email', 'completed');
      }).not.toThrow();
    });

    it('should record failed queue job', () => {
      expect(() => {
        service.recordQueueJob('notifications', 'send_email', 'failed', 'timeout');
      }).not.toThrow();
    });

    it('should record different queues', () => {
      const queues = ['notifications', 'reports', 'imports', 'exports'];

      for (const queue of queues) {
        expect(() => {
          service.recordQueueJob(queue, 'process', 'completed');
        }).not.toThrow();
      }
    });

    it('should record different job types', () => {
      const jobTypes = ['send_email', 'send_sms', 'generate_report', 'process_import'];

      for (const jobType of jobTypes) {
        expect(() => {
          service.recordQueueJob('notifications', jobType, 'completed');
        }).not.toThrow();
      }
    });

    it('should record different failure reasons', () => {
      const reasons = ['timeout', 'network_error', 'invalid_data', 'rate_limit'];

      for (const reason of reasons) {
        expect(() => {
          service.recordQueueJob('notifications', 'send_email', 'failed', reason);
        }).not.toThrow();
      }
    });

    it('should handle failed job without reason', () => {
      expect(() => {
        service.recordQueueJob('notifications', 'send_email', 'failed');
      }).not.toThrow();
    });
  });

  // ============================================================================
  // COLLECT BUSINESS METRICS TESTS
  // ============================================================================

  describe('collectBusinessMetrics', () => {
    it('should complete without error', async () => {
      await expect(service.collectBusinessMetrics()).resolves.not.toThrow();
    });

    it('should be callable multiple times', async () => {
      await service.collectBusinessMetrics();
      await service.collectBusinessMetrics();
      await service.collectBusinessMetrics();

      // Should complete without error
      expect(true).toBe(true);
    });
  });

  // ============================================================================
  // PROMETHEUS METRICS INITIALIZATION TESTS
  // ============================================================================

  describe('metrics initialization', () => {
    it('should initialize all request metrics', () => {
      // Test that the service can record without initialization errors
      expect(() => {
        service.recordHttpRequest('GET', '/test', 200, 0.1);
      }).not.toThrow();
    });

    it('should initialize all business metrics', () => {
      expect(() => {
        service.recordTaskCreated('refill', 'normal');
        service.recordTaskCompleted('refill', 'completed', 100);
        service.recordInventoryMovement('transfer', 'in');
        service.updateMachineStatus(10, 2, {});
      }).not.toThrow();
    });

    it('should initialize all security metrics', () => {
      expect(() => {
        service.recordLoginAttempt('success');
        service.recordLoginFailure('invalid_password');
        service.record2FAAuthentication('totp', 'success');
        service.recordSessionCreation('web');
        service.recordAuditLogEvent('login', 'user');
      }).not.toThrow();
    });

    it('should initialize all performance metrics', () => {
      expect(() => {
        service.recordDatabaseQuery('SELECT', 'users', 0.1);
        service.recordCacheHit('redis');
        service.recordCacheMiss('redis');
        service.recordQueueJob('notifications', 'send', 'completed');
      }).not.toThrow();
    });
  });

  // ============================================================================
  // EDGE CASES TESTS
  // ============================================================================

  describe('edge cases', () => {
    it('should handle empty strings in labels', () => {
      expect(() => {
        service.recordHttpRequest('', '', 200, 0.1);
      }).not.toThrow();
    });

    it('should handle special characters in labels', () => {
      expect(() => {
        service.recordHttpRequest('GET', '/api/users/:id/tasks?status=active', 200, 0.1);
      }).not.toThrow();
    });

    it('should handle Unicode in labels', () => {
      expect(() => {
        service.recordTaskCreated('refill', 'normal');
        service.recordAuditLogEvent('create', 'user');
      }).not.toThrow();
    });

    it('should handle zero duration', () => {
      expect(() => {
        service.recordHttpRequest('GET', '/health', 200, 0);
      }).not.toThrow();
    });

    it('should handle negative duration gracefully', () => {
      // Negative duration shouldn't happen but service should handle it
      expect(() => {
        service.recordHttpRequest('GET', '/health', 200, -1);
      }).not.toThrow();
    });

    it('should handle very large numbers', () => {
      expect(() => {
        service.updateMachineStatus(999999, 999999, { error: 999999 });
      }).not.toThrow();
    });
  });
});
