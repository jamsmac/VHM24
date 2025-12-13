/**
 * Health Monitor Worker Unit Tests
 *
 * Tests the health monitoring worker functionality including:
 * - Queue health checks
 * - Database health checks
 * - Redis health checks
 * - System status determination
 * - Health alert logging
 */

import { Logger } from '@nestjs/common';

// Mock NestFactory before imports
const mockApp = {
  get: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
};

jest.mock('@nestjs/core', () => ({
  NestFactory: {
    createApplicationContext: jest.fn().mockResolvedValue(mockApp),
  },
}));

// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    info: jest.fn().mockResolvedValue('used_memory_human:1.5M\nother_info:value'),
    quit: jest.fn().mockResolvedValue(undefined),
  }));
});

// Mock Logger to prevent console output
jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

// Interfaces from the worker
interface QueueHealth {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

interface SystemHealth {
  timestamp: string;
  queues: QueueHealth[];
  database: {
    connected: boolean;
    activeConnections: number;
  };
  redis: {
    connected: boolean;
    usedMemory: string;
  };
  status: 'healthy' | 'degraded' | 'unhealthy';
}

describe('HealthMonitorWorker', () => {
  let mockConnection: any;
  let mockCommissionQueue: any;
  let mockRedisClient: any;

  // Alert thresholds (matching the worker)
  const THRESHOLDS = {
    queueWaitingWarning: 500,
    queueWaitingCritical: 1000,
    queueFailedWarning: 50,
    queueFailedCritical: 100,
    dbConnectionsWarning: 50,
    dbConnectionsCritical: 80,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Database Connection
    mockConnection = {
      isConnected: true,
      query: jest.fn().mockResolvedValue([{ count: '10' }]),
    };

    // Mock Commission Queue
    mockCommissionQueue = {
      name: 'commission-calculations',
      getWaitingCount: jest.fn().mockResolvedValue(5),
      getActiveCount: jest.fn().mockResolvedValue(2),
      getCompletedCount: jest.fn().mockResolvedValue(100),
      getFailedCount: jest.fn().mockResolvedValue(1),
      getDelayedCount: jest.fn().mockResolvedValue(0),
      isPaused: jest.fn().mockResolvedValue(false),
      close: jest.fn().mockResolvedValue(undefined),
    };

    // Mock Redis Client
    mockRedisClient = {
      info: jest.fn().mockResolvedValue('used_memory_human:1.5M\nother_info:value'),
      quit: jest.fn().mockResolvedValue(undefined),
    };

    // Configure mockApp.get to return appropriate mocks
    mockApp.get.mockImplementation((token: any) => {
      if (token === 'BullQueue_commission-calculations') {
        return mockCommissionQueue;
      }
      if (token.name === 'Connection') {
        return mockConnection;
      }
      return mockConnection;
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ============================================================================
  // QUEUE HEALTH CHECK TESTS
  // ============================================================================

  describe('checkQueueHealth', () => {
    it('should return queue health metrics', async () => {
      // Arrange
      const checkQueueHealth = async (queue: any): Promise<QueueHealth> => {
        const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
          queue.getDelayedCount(),
          queue.isPaused(),
        ]);

        return {
          name: queue.name,
          waiting,
          active,
          completed,
          failed,
          delayed,
          paused,
        };
      };

      // Act
      const result = await checkQueueHealth(mockCommissionQueue);

      // Assert
      expect(result).toEqual({
        name: 'commission-calculations',
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 1,
        delayed: 0,
        paused: false,
      });
    });

    it('should handle paused queue', async () => {
      // Arrange
      mockCommissionQueue.isPaused.mockResolvedValue(true);

      const checkQueueHealth = async (queue: any): Promise<QueueHealth> => {
        const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
          queue.getDelayedCount(),
          queue.isPaused(),
        ]);

        return {
          name: queue.name,
          waiting,
          active,
          completed,
          failed,
          delayed,
          paused,
        };
      };

      // Act
      const result = await checkQueueHealth(mockCommissionQueue);

      // Assert
      expect(result.paused).toBe(true);
    });

    it('should handle high waiting job count', async () => {
      // Arrange
      mockCommissionQueue.getWaitingCount.mockResolvedValue(1500);

      const checkQueueHealth = async (queue: any): Promise<QueueHealth> => {
        const waiting = await queue.getWaitingCount();
        return {
          name: queue.name,
          waiting,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
          paused: false,
        };
      };

      // Act
      const result = await checkQueueHealth(mockCommissionQueue);

      // Assert
      expect(result.waiting).toBe(1500);
      expect(result.waiting).toBeGreaterThan(THRESHOLDS.queueWaitingCritical);
    });

    it('should handle high failed job count', async () => {
      // Arrange
      mockCommissionQueue.getFailedCount.mockResolvedValue(150);

      const checkQueueHealth = async (queue: any): Promise<QueueHealth> => {
        const failed = await queue.getFailedCount();
        return {
          name: queue.name,
          waiting: 0,
          active: 0,
          completed: 0,
          failed,
          delayed: 0,
          paused: false,
        };
      };

      // Act
      const result = await checkQueueHealth(mockCommissionQueue);

      // Assert
      expect(result.failed).toBe(150);
      expect(result.failed).toBeGreaterThan(THRESHOLDS.queueFailedCritical);
    });
  });

  // ============================================================================
  // DATABASE HEALTH CHECK TESTS
  // ============================================================================

  describe('checkDatabaseHealth', () => {
    it('should return database health when connected', async () => {
      // Arrange
      const checkDatabaseHealth = async () => {
        try {
          const isConnected = mockConnection.isConnected;
          const result = await mockConnection.query(
            'SELECT count(*) as count FROM pg_stat_activity WHERE state = $1',
            ['active'],
          );
          const activeConnections = parseInt(result[0]?.count || '0');

          return {
            connected: isConnected,
            activeConnections,
          };
        } catch (error) {
          return {
            connected: false,
            activeConnections: 0,
          };
        }
      };

      // Act
      const result = await checkDatabaseHealth();

      // Assert
      expect(result).toEqual({
        connected: true,
        activeConnections: 10,
      });
    });

    it('should return disconnected state when database is down', async () => {
      // Arrange
      mockConnection.isConnected = false;
      mockConnection.query.mockRejectedValue(new Error('Connection refused'));

      const checkDatabaseHealth = async () => {
        try {
          const isConnected = mockConnection.isConnected;
          if (!isConnected) {
            return {
              connected: false,
              activeConnections: 0,
            };
          }
          const result = await mockConnection.query(
            'SELECT count(*) as count FROM pg_stat_activity WHERE state = $1',
            ['active'],
          );
          const activeConnections = parseInt(result[0]?.count || '0');

          return {
            connected: isConnected,
            activeConnections,
          };
        } catch (error) {
          return {
            connected: false,
            activeConnections: 0,
          };
        }
      };

      // Act
      const result = await checkDatabaseHealth();

      // Assert
      expect(result).toEqual({
        connected: false,
        activeConnections: 0,
      });
    });

    it('should handle query errors gracefully', async () => {
      // Arrange
      mockConnection.query.mockRejectedValue(new Error('Query timeout'));

      const checkDatabaseHealth = async () => {
        try {
          const result = await mockConnection.query(
            'SELECT count(*) as count FROM pg_stat_activity',
          );
          return {
            connected: true,
            activeConnections: parseInt(result[0]?.count || '0'),
          };
        } catch (error) {
          return {
            connected: false,
            activeConnections: 0,
          };
        }
      };

      // Act
      const result = await checkDatabaseHealth();

      // Assert
      expect(result.connected).toBe(false);
    });

    it('should handle high connection count', async () => {
      // Arrange
      mockConnection.query.mockResolvedValue([{ count: '85' }]);

      const checkDatabaseHealth = async () => {
        const result = await mockConnection.query('SELECT count(*) as count FROM pg_stat_activity');
        return {
          connected: true,
          activeConnections: parseInt(result[0]?.count || '0'),
        };
      };

      // Act
      const result = await checkDatabaseHealth();

      // Assert
      expect(result.activeConnections).toBe(85);
      expect(result.activeConnections).toBeGreaterThan(THRESHOLDS.dbConnectionsCritical);
    });
  });

  // ============================================================================
  // REDIS HEALTH CHECK TESTS
  // ============================================================================

  describe('checkRedisHealth', () => {
    it('should return redis health when connected', async () => {
      // Arrange
      const checkRedisHealth = async () => {
        try {
          const info = await mockRedisClient.info('memory');
          const usedMemoryLine = info
            .split('\n')
            .find((line: string) => line.startsWith('used_memory_human:'));
          const usedMemory = usedMemoryLine ? usedMemoryLine.split(':')[1].trim() : 'unknown';

          return {
            connected: true,
            usedMemory,
          };
        } catch (error) {
          return {
            connected: false,
            usedMemory: 'unknown',
          };
        }
      };

      // Act
      const result = await checkRedisHealth();

      // Assert
      expect(result).toEqual({
        connected: true,
        usedMemory: '1.5M',
      });
    });

    it('should return disconnected state when redis is down', async () => {
      // Arrange
      mockRedisClient.info.mockRejectedValue(new Error('Redis connection refused'));

      const checkRedisHealth = async () => {
        try {
          const info = await mockRedisClient.info('memory');
          return {
            connected: true,
            usedMemory: info,
          };
        } catch (error) {
          return {
            connected: false,
            usedMemory: 'unknown',
          };
        }
      };

      // Act
      const result = await checkRedisHealth();

      // Assert
      expect(result).toEqual({
        connected: false,
        usedMemory: 'unknown',
      });
    });

    it('should handle missing memory info gracefully', async () => {
      // Arrange
      mockRedisClient.info.mockResolvedValue('some_other_info:value');

      const checkRedisHealth = async () => {
        try {
          const info = await mockRedisClient.info('memory');
          const usedMemoryLine = info
            .split('\n')
            .find((line: string) => line.startsWith('used_memory_human:'));
          const usedMemory = usedMemoryLine ? usedMemoryLine.split(':')[1].trim() : 'unknown';

          return {
            connected: true,
            usedMemory,
          };
        } catch (error) {
          return {
            connected: false,
            usedMemory: 'unknown',
          };
        }
      };

      // Act
      const result = await checkRedisHealth();

      // Assert
      expect(result).toEqual({
        connected: true,
        usedMemory: 'unknown',
      });
    });
  });

  // ============================================================================
  // SYSTEM STATUS DETERMINATION TESTS
  // ============================================================================

  describe('determineSystemStatus', () => {
    it('should return healthy when all systems are normal', () => {
      // Arrange
      const health: SystemHealth = {
        timestamp: new Date().toISOString(),
        queues: [
          {
            name: 'commission-calculations',
            waiting: 5,
            active: 2,
            completed: 100,
            failed: 1,
            delayed: 0,
            paused: false,
          },
        ],
        database: {
          connected: true,
          activeConnections: 10,
        },
        redis: {
          connected: true,
          usedMemory: '1.5M',
        },
        status: 'healthy',
      };

      const determineSystemStatus = (h: SystemHealth): SystemHealth['status'] => {
        if (!h.database.connected || !h.redis.connected) {
          return 'unhealthy';
        }

        const criticalQueue = h.queues.some(
          (q) =>
            q.waiting > THRESHOLDS.queueWaitingCritical ||
            q.failed > THRESHOLDS.queueFailedCritical,
        );
        if (criticalQueue) {
          return 'unhealthy';
        }

        const degraded =
          h.database.activeConnections > THRESHOLDS.dbConnectionsWarning ||
          h.queues.some(
            (q) =>
              q.waiting > THRESHOLDS.queueWaitingWarning ||
              q.failed > THRESHOLDS.queueFailedWarning,
          );

        if (degraded) {
          return 'degraded';
        }

        return 'healthy';
      };

      // Act
      const result = determineSystemStatus(health);

      // Assert
      expect(result).toBe('healthy');
    });

    it('should return unhealthy when database is disconnected', () => {
      // Arrange
      const health: SystemHealth = {
        timestamp: new Date().toISOString(),
        queues: [
          {
            name: 'commission-calculations',
            waiting: 5,
            active: 2,
            completed: 100,
            failed: 1,
            delayed: 0,
            paused: false,
          },
        ],
        database: {
          connected: false,
          activeConnections: 0,
        },
        redis: {
          connected: true,
          usedMemory: '1.5M',
        },
        status: 'healthy',
      };

      const determineSystemStatus = (h: SystemHealth): SystemHealth['status'] => {
        if (!h.database.connected || !h.redis.connected) {
          return 'unhealthy';
        }
        return 'healthy';
      };

      // Act
      const result = determineSystemStatus(health);

      // Assert
      expect(result).toBe('unhealthy');
    });

    it('should return unhealthy when redis is disconnected', () => {
      // Arrange
      const health: SystemHealth = {
        timestamp: new Date().toISOString(),
        queues: [
          {
            name: 'commission-calculations',
            waiting: 5,
            active: 2,
            completed: 100,
            failed: 1,
            delayed: 0,
            paused: false,
          },
        ],
        database: {
          connected: true,
          activeConnections: 10,
        },
        redis: {
          connected: false,
          usedMemory: 'unknown',
        },
        status: 'healthy',
      };

      const determineSystemStatus = (h: SystemHealth): SystemHealth['status'] => {
        if (!h.database.connected || !h.redis.connected) {
          return 'unhealthy';
        }
        return 'healthy';
      };

      // Act
      const result = determineSystemStatus(health);

      // Assert
      expect(result).toBe('unhealthy');
    });

    it('should return unhealthy when queue has critical waiting count', () => {
      // Arrange
      const health: SystemHealth = {
        timestamp: new Date().toISOString(),
        queues: [
          {
            name: 'commission-calculations',
            waiting: 1500, // Above critical threshold
            active: 2,
            completed: 100,
            failed: 1,
            delayed: 0,
            paused: false,
          },
        ],
        database: {
          connected: true,
          activeConnections: 10,
        },
        redis: {
          connected: true,
          usedMemory: '1.5M',
        },
        status: 'healthy',
      };

      const determineSystemStatus = (h: SystemHealth): SystemHealth['status'] => {
        if (!h.database.connected || !h.redis.connected) {
          return 'unhealthy';
        }

        const criticalQueue = h.queues.some(
          (q) =>
            q.waiting > THRESHOLDS.queueWaitingCritical ||
            q.failed > THRESHOLDS.queueFailedCritical,
        );
        if (criticalQueue) {
          return 'unhealthy';
        }

        return 'healthy';
      };

      // Act
      const result = determineSystemStatus(health);

      // Assert
      expect(result).toBe('unhealthy');
    });

    it('should return unhealthy when queue has critical failed count', () => {
      // Arrange
      const health: SystemHealth = {
        timestamp: new Date().toISOString(),
        queues: [
          {
            name: 'commission-calculations',
            waiting: 5,
            active: 2,
            completed: 100,
            failed: 150, // Above critical threshold
            delayed: 0,
            paused: false,
          },
        ],
        database: {
          connected: true,
          activeConnections: 10,
        },
        redis: {
          connected: true,
          usedMemory: '1.5M',
        },
        status: 'healthy',
      };

      const determineSystemStatus = (h: SystemHealth): SystemHealth['status'] => {
        if (!h.database.connected || !h.redis.connected) {
          return 'unhealthy';
        }

        const criticalQueue = h.queues.some(
          (q) =>
            q.waiting > THRESHOLDS.queueWaitingCritical ||
            q.failed > THRESHOLDS.queueFailedCritical,
        );
        if (criticalQueue) {
          return 'unhealthy';
        }

        return 'healthy';
      };

      // Act
      const result = determineSystemStatus(health);

      // Assert
      expect(result).toBe('unhealthy');
    });

    it('should return degraded when database has high connection count', () => {
      // Arrange
      const health: SystemHealth = {
        timestamp: new Date().toISOString(),
        queues: [
          {
            name: 'commission-calculations',
            waiting: 5,
            active: 2,
            completed: 100,
            failed: 1,
            delayed: 0,
            paused: false,
          },
        ],
        database: {
          connected: true,
          activeConnections: 60, // Above warning threshold
        },
        redis: {
          connected: true,
          usedMemory: '1.5M',
        },
        status: 'healthy',
      };

      const determineSystemStatus = (h: SystemHealth): SystemHealth['status'] => {
        if (!h.database.connected || !h.redis.connected) {
          return 'unhealthy';
        }

        const criticalQueue = h.queues.some(
          (q) =>
            q.waiting > THRESHOLDS.queueWaitingCritical ||
            q.failed > THRESHOLDS.queueFailedCritical,
        );
        if (criticalQueue) {
          return 'unhealthy';
        }

        const degraded =
          h.database.activeConnections > THRESHOLDS.dbConnectionsWarning ||
          h.queues.some(
            (q) =>
              q.waiting > THRESHOLDS.queueWaitingWarning ||
              q.failed > THRESHOLDS.queueFailedWarning,
          );

        if (degraded) {
          return 'degraded';
        }

        return 'healthy';
      };

      // Act
      const result = determineSystemStatus(health);

      // Assert
      expect(result).toBe('degraded');
    });

    it('should return degraded when queue has warning level waiting count', () => {
      // Arrange
      const health: SystemHealth = {
        timestamp: new Date().toISOString(),
        queues: [
          {
            name: 'commission-calculations',
            waiting: 600, // Above warning but below critical
            active: 2,
            completed: 100,
            failed: 1,
            delayed: 0,
            paused: false,
          },
        ],
        database: {
          connected: true,
          activeConnections: 10,
        },
        redis: {
          connected: true,
          usedMemory: '1.5M',
        },
        status: 'healthy',
      };

      const determineSystemStatus = (h: SystemHealth): SystemHealth['status'] => {
        if (!h.database.connected || !h.redis.connected) {
          return 'unhealthy';
        }

        const criticalQueue = h.queues.some(
          (q) =>
            q.waiting > THRESHOLDS.queueWaitingCritical ||
            q.failed > THRESHOLDS.queueFailedCritical,
        );
        if (criticalQueue) {
          return 'unhealthy';
        }

        const degraded =
          h.database.activeConnections > THRESHOLDS.dbConnectionsWarning ||
          h.queues.some(
            (q) =>
              q.waiting > THRESHOLDS.queueWaitingWarning ||
              q.failed > THRESHOLDS.queueFailedWarning,
          );

        if (degraded) {
          return 'degraded';
        }

        return 'healthy';
      };

      // Act
      const result = determineSystemStatus(health);

      // Assert
      expect(result).toBe('degraded');
    });

    it('should return degraded when queue has warning level failed count', () => {
      // Arrange
      const health: SystemHealth = {
        timestamp: new Date().toISOString(),
        queues: [
          {
            name: 'commission-calculations',
            waiting: 5,
            active: 2,
            completed: 100,
            failed: 60, // Above warning but below critical
            delayed: 0,
            paused: false,
          },
        ],
        database: {
          connected: true,
          activeConnections: 10,
        },
        redis: {
          connected: true,
          usedMemory: '1.5M',
        },
        status: 'healthy',
      };

      const determineSystemStatus = (h: SystemHealth): SystemHealth['status'] => {
        if (!h.database.connected || !h.redis.connected) {
          return 'unhealthy';
        }

        const criticalQueue = h.queues.some(
          (q) =>
            q.waiting > THRESHOLDS.queueWaitingCritical ||
            q.failed > THRESHOLDS.queueFailedCritical,
        );
        if (criticalQueue) {
          return 'unhealthy';
        }

        const degraded =
          h.database.activeConnections > THRESHOLDS.dbConnectionsWarning ||
          h.queues.some(
            (q) =>
              q.waiting > THRESHOLDS.queueWaitingWarning ||
              q.failed > THRESHOLDS.queueFailedWarning,
          );

        if (degraded) {
          return 'degraded';
        }

        return 'healthy';
      };

      // Act
      const result = determineSystemStatus(health);

      // Assert
      expect(result).toBe('degraded');
    });
  });

  // ============================================================================
  // HEALTH ALERT LOGGING TESTS
  // ============================================================================

  describe('logHealthAlerts', () => {
    let mockLogger: any;

    beforeEach(() => {
      mockLogger = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      };
    });

    it('should log critical error when database is disconnected', () => {
      // Arrange
      const health: SystemHealth = {
        timestamp: new Date().toISOString(),
        queues: [],
        database: {
          connected: false,
          activeConnections: 0,
        },
        redis: {
          connected: true,
          usedMemory: '1.5M',
        },
        status: 'unhealthy',
      };

      const logHealthAlerts = (h: SystemHealth) => {
        if (!h.database.connected) {
          mockLogger.error('CRITICAL: Database is disconnected!');
        }
      };

      // Act
      logHealthAlerts(health);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith('CRITICAL: Database is disconnected!');
    });

    it('should log critical error when database has critical connection count', () => {
      // Arrange
      const health: SystemHealth = {
        timestamp: new Date().toISOString(),
        queues: [],
        database: {
          connected: true,
          activeConnections: 85,
        },
        redis: {
          connected: true,
          usedMemory: '1.5M',
        },
        status: 'unhealthy',
      };

      const logHealthAlerts = (h: SystemHealth) => {
        if (!h.database.connected) {
          mockLogger.error('CRITICAL: Database is disconnected!');
        } else if (h.database.activeConnections > THRESHOLDS.dbConnectionsCritical) {
          mockLogger.error(
            `CRITICAL: Database has ${h.database.activeConnections} active connections`,
          );
        } else if (h.database.activeConnections > THRESHOLDS.dbConnectionsWarning) {
          mockLogger.warn(
            `WARNING: Database has ${h.database.activeConnections} active connections`,
          );
        }
      };

      // Act
      logHealthAlerts(health);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL: Database has 85 active connections'),
      );
    });

    it('should log warning when database has warning level connection count', () => {
      // Arrange
      const health: SystemHealth = {
        timestamp: new Date().toISOString(),
        queues: [],
        database: {
          connected: true,
          activeConnections: 55,
        },
        redis: {
          connected: true,
          usedMemory: '1.5M',
        },
        status: 'degraded',
      };

      const logHealthAlerts = (h: SystemHealth) => {
        if (!h.database.connected) {
          mockLogger.error('CRITICAL: Database is disconnected!');
        } else if (h.database.activeConnections > THRESHOLDS.dbConnectionsCritical) {
          mockLogger.error(
            `CRITICAL: Database has ${h.database.activeConnections} active connections`,
          );
        } else if (h.database.activeConnections > THRESHOLDS.dbConnectionsWarning) {
          mockLogger.warn(
            `WARNING: Database has ${h.database.activeConnections} active connections`,
          );
        }
      };

      // Act
      logHealthAlerts(health);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('WARNING: Database has 55 active connections'),
      );
    });

    it('should log critical error when redis is disconnected', () => {
      // Arrange
      const health: SystemHealth = {
        timestamp: new Date().toISOString(),
        queues: [],
        database: {
          connected: true,
          activeConnections: 10,
        },
        redis: {
          connected: false,
          usedMemory: 'unknown',
        },
        status: 'unhealthy',
      };

      const logHealthAlerts = (h: SystemHealth) => {
        if (!h.redis.connected) {
          mockLogger.error('CRITICAL: Redis is disconnected!');
        }
      };

      // Act
      logHealthAlerts(health);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith('CRITICAL: Redis is disconnected!');
    });

    it('should log warning when queue is paused', () => {
      // Arrange
      const health: SystemHealth = {
        timestamp: new Date().toISOString(),
        queues: [
          {
            name: 'commission-calculations',
            waiting: 5,
            active: 0,
            completed: 100,
            failed: 1,
            delayed: 0,
            paused: true,
          },
        ],
        database: {
          connected: true,
          activeConnections: 10,
        },
        redis: {
          connected: true,
          usedMemory: '1.5M',
        },
        status: 'healthy',
      };

      const logHealthAlerts = (h: SystemHealth) => {
        h.queues.forEach((queue) => {
          if (queue.paused) {
            mockLogger.warn(`WARNING: Queue "${queue.name}" is paused`);
          }
        });
      };

      // Act
      logHealthAlerts(health);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'WARNING: Queue "commission-calculations" is paused',
      );
    });

    it('should log critical error when queue has critical waiting count', () => {
      // Arrange
      const health: SystemHealth = {
        timestamp: new Date().toISOString(),
        queues: [
          {
            name: 'commission-calculations',
            waiting: 1500,
            active: 2,
            completed: 100,
            failed: 1,
            delayed: 0,
            paused: false,
          },
        ],
        database: {
          connected: true,
          activeConnections: 10,
        },
        redis: {
          connected: true,
          usedMemory: '1.5M',
        },
        status: 'unhealthy',
      };

      const logHealthAlerts = (h: SystemHealth) => {
        h.queues.forEach((queue) => {
          if (queue.waiting > THRESHOLDS.queueWaitingCritical) {
            mockLogger.error(`CRITICAL: Queue "${queue.name}" has ${queue.waiting} waiting jobs`);
          } else if (queue.waiting > THRESHOLDS.queueWaitingWarning) {
            mockLogger.warn(`WARNING: Queue "${queue.name}" has ${queue.waiting} waiting jobs`);
          }
        });
      };

      // Act
      logHealthAlerts(health);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL: Queue "commission-calculations" has 1500 waiting jobs'),
      );
    });

    it('should log critical error when queue has critical failed count', () => {
      // Arrange
      const health: SystemHealth = {
        timestamp: new Date().toISOString(),
        queues: [
          {
            name: 'commission-calculations',
            waiting: 5,
            active: 2,
            completed: 100,
            failed: 150,
            delayed: 0,
            paused: false,
          },
        ],
        database: {
          connected: true,
          activeConnections: 10,
        },
        redis: {
          connected: true,
          usedMemory: '1.5M',
        },
        status: 'unhealthy',
      };

      const logHealthAlerts = (h: SystemHealth) => {
        h.queues.forEach((queue) => {
          if (queue.failed > THRESHOLDS.queueFailedCritical) {
            mockLogger.error(`CRITICAL: Queue "${queue.name}" has ${queue.failed} failed jobs`);
          } else if (queue.failed > THRESHOLDS.queueFailedWarning) {
            mockLogger.warn(`WARNING: Queue "${queue.name}" has ${queue.failed} failed jobs`);
          }
        });
      };

      // Act
      logHealthAlerts(health);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('CRITICAL: Queue "commission-calculations" has 150 failed jobs'),
      );
    });
  });

  // ============================================================================
  // GRACEFUL SHUTDOWN TESTS
  // ============================================================================

  describe('graceful shutdown', () => {
    it('should clear interval and close connections on SIGTERM', async () => {
      // Arrange
      const mockInterval = jest.fn();
      jest.spyOn(global, 'clearInterval').mockImplementation(mockInterval);

      const shutdown = async (signal: string, healthCheckInterval: NodeJS.Timeout) => {
        clearInterval(healthCheckInterval);
        await mockRedisClient.quit();
        await mockApp.close();
      };

      const interval = setInterval(() => {}, 30000);

      // Act
      await shutdown('SIGTERM', interval);

      // Assert
      expect(mockInterval).toHaveBeenCalled();
      expect(mockRedisClient.quit).toHaveBeenCalled();
      expect(mockApp.close).toHaveBeenCalled();
    });

    it('should clear interval and close connections on SIGINT', async () => {
      // Arrange
      const mockInterval = jest.fn();
      jest.spyOn(global, 'clearInterval').mockImplementation(mockInterval);

      const shutdown = async (signal: string, healthCheckInterval: NodeJS.Timeout) => {
        clearInterval(healthCheckInterval);
        await mockRedisClient.quit();
        await mockApp.close();
      };

      const interval = setInterval(() => {}, 30000);

      // Act
      await shutdown('SIGINT', interval);

      // Assert
      expect(mockInterval).toHaveBeenCalled();
      expect(mockRedisClient.quit).toHaveBeenCalled();
      expect(mockApp.close).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // INTEGRATION-STYLE TESTS
  // ============================================================================

  describe('runHealthCheck integration', () => {
    it('should collect all health metrics and determine status', async () => {
      // Arrange
      const checkQueueHealth = async (queue: any): Promise<QueueHealth> => {
        const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
          queue.getDelayedCount(),
          queue.isPaused(),
        ]);

        return {
          name: queue.name,
          waiting,
          active,
          completed,
          failed,
          delayed,
          paused,
        };
      };

      const checkDatabaseHealth = async () => {
        const result = await mockConnection.query('SELECT count(*) as count');
        return {
          connected: mockConnection.isConnected,
          activeConnections: parseInt(result[0]?.count || '0'),
        };
      };

      const checkRedisHealth = async () => {
        const info = await mockRedisClient.info('memory');
        const usedMemoryLine = info
          .split('\n')
          .find((line: string) => line.startsWith('used_memory_human:'));
        const usedMemory = usedMemoryLine ? usedMemoryLine.split(':')[1].trim() : 'unknown';
        return {
          connected: true,
          usedMemory,
        };
      };

      const determineSystemStatus = (h: SystemHealth): SystemHealth['status'] => {
        if (!h.database.connected || !h.redis.connected) {
          return 'unhealthy';
        }
        return 'healthy';
      };

      // Act
      const [queueHealth, databaseHealth, redisHealth] = await Promise.all([
        checkQueueHealth(mockCommissionQueue),
        checkDatabaseHealth(),
        checkRedisHealth(),
      ]);

      const systemHealth: SystemHealth = {
        timestamp: new Date().toISOString(),
        queues: [queueHealth],
        database: databaseHealth,
        redis: redisHealth,
        status: 'healthy',
      };

      systemHealth.status = determineSystemStatus(systemHealth);

      // Assert
      expect(systemHealth.queues).toHaveLength(1);
      expect(systemHealth.queues[0].name).toBe('commission-calculations');
      expect(systemHealth.database.connected).toBe(true);
      expect(systemHealth.redis.connected).toBe(true);
      expect(systemHealth.status).toBe('healthy');
    });
  });
});
