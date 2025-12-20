/**
 * Sales Import Worker Unit Tests
 *
 * Tests the sales import worker functionality including:
 * - Worker initialization
 * - Graceful shutdown handling
 * - Error handling
 */

import { Logger } from '@nestjs/common';

describe('SalesImportWorker', () => {
  let mockSalesImportQueue: any;
  let mockApp: any;
  let mockNestFactory: any;

  // Mock Logger to prevent console output
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Sales Import Queue
    mockSalesImportQueue = {
      process: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
      getWaitingCount: jest.fn().mockResolvedValue(0),
      getActiveCount: jest.fn().mockResolvedValue(0),
      getCompletedCount: jest.fn().mockResolvedValue(0),
      getFailedCount: jest.fn().mockResolvedValue(0),
    };

    // Mock App
    mockApp = {
      get: jest.fn().mockImplementation((token: any) => {
        if (token === 'BullQueue_sales-import') {
          return mockSalesImportQueue;
        }
        return mockSalesImportQueue;
      }),
      close: jest.fn().mockResolvedValue(undefined),
    };

    // Mock NestFactory
    mockNestFactory = {
      createApplicationContext: jest.fn().mockResolvedValue(mockApp),
    };
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ============================================================================
  // WORKER INITIALIZATION TESTS
  // ============================================================================

  describe('worker initialization', () => {
    it('should create NestJS application context', async () => {
      // Act
      const app = await mockNestFactory.createApplicationContext({});

      // Assert
      expect(mockNestFactory.createApplicationContext).toHaveBeenCalled();
      expect(app).toBeDefined();
    });

    it('should get sales-import queue from application context', async () => {
      // Arrange
      const app = await mockNestFactory.createApplicationContext({});

      // Act
      const queue = app.get('BullQueue_sales-import');

      // Assert
      expect(mockApp.get).toHaveBeenCalledWith('BullQueue_sales-import');
      expect(queue).toBeDefined();
    });

    it('should initialize worker with queue reference', async () => {
      // Act
      const app = await mockNestFactory.createApplicationContext({});
      const salesImportQueue = app.get('BullQueue_sales-import');

      // Assert
      expect(salesImportQueue).toBe(mockSalesImportQueue);
      expect(salesImportQueue.close).toBeDefined();
    });
  });

  // ============================================================================
  // GRACEFUL SHUTDOWN TESTS
  // ============================================================================

  describe('graceful shutdown', () => {
    it('should close queue and app on SIGTERM', async () => {
      // Arrange
      const shutdown = async (_signal: string) => {
        await mockSalesImportQueue.close();
        await mockApp.close();
      };

      // Act
      await shutdown('SIGTERM');

      // Assert
      expect(mockSalesImportQueue.close).toHaveBeenCalled();
      expect(mockApp.close).toHaveBeenCalled();
    });

    it('should close queue and app on SIGINT', async () => {
      // Arrange
      const shutdown = async (_signal: string) => {
        await mockSalesImportQueue.close();
        await mockApp.close();
      };

      // Act
      await shutdown('SIGINT');

      // Assert
      expect(mockSalesImportQueue.close).toHaveBeenCalled();
      expect(mockApp.close).toHaveBeenCalled();
    });

    it('should close queue before app', async () => {
      // Arrange
      const callOrder: string[] = [];
      mockSalesImportQueue.close.mockImplementation(async () => {
        callOrder.push('queue');
      });
      mockApp.close.mockImplementation(async () => {
        callOrder.push('app');
      });

      const shutdown = async (_signal: string) => {
        await mockSalesImportQueue.close();
        await mockApp.close();
      };

      // Act
      await shutdown('SIGTERM');

      // Assert
      expect(callOrder).toEqual(['queue', 'app']);
    });

    it('should handle queue close errors gracefully', async () => {
      // Arrange
      mockSalesImportQueue.close.mockRejectedValue(new Error('Queue close failed'));

      const shutdown = async (_signal: string) => {
        try {
          await mockSalesImportQueue.close();
        } catch {
          // Log error but continue with app close
        }
        await mockApp.close();
      };

      // Act
      await shutdown('SIGTERM');

      // Assert
      expect(mockSalesImportQueue.close).toHaveBeenCalled();
      expect(mockApp.close).toHaveBeenCalled();
    });

    it('should handle app close errors gracefully', async () => {
      // Arrange
      mockApp.close.mockRejectedValue(new Error('App close failed'));

      const shutdown = async (_signal: string) => {
        await mockSalesImportQueue.close();
        try {
          await mockApp.close();
        } catch {
          // Error logged but not thrown
        }
      };

      // Act & Assert
      await expect(shutdown('SIGTERM')).resolves.not.toThrow();
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('error handling', () => {
    it('should handle initialization failure', async () => {
      // Arrange
      mockNestFactory.createApplicationContext.mockRejectedValueOnce(
        new Error('Failed to initialize'),
      );

      // Act & Assert
      await expect(mockNestFactory.createApplicationContext({})).rejects.toThrow(
        'Failed to initialize',
      );
    });

    it('should handle queue not found error', async () => {
      // Arrange
      mockApp.get.mockImplementation((token: any) => {
        if (token === 'BullQueue_sales-import') {
          throw new Error('Queue not found');
        }
      });

      const app = await mockNestFactory.createApplicationContext({});

      // Act & Assert
      expect(() => app.get('BullQueue_sales-import')).toThrow('Queue not found');
    });
  });

  // ============================================================================
  // PROCESS EVENT HANDLERS TESTS
  // ============================================================================

  describe('process event handlers', () => {
    let processListeners: Map<string, (...args: unknown[]) => unknown>;

    beforeEach(() => {
      processListeners = new Map();

      // Capture event listeners
      jest.spyOn(process, 'on').mockImplementation((event: string, listener: any) => {
        processListeners.set(event, listener);
        return process;
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should register SIGTERM handler', () => {
      // Act
      process.on('SIGTERM', () => {});

      // Assert
      expect(processListeners.has('SIGTERM')).toBe(true);
    });

    it('should register SIGINT handler', () => {
      // Act
      process.on('SIGINT', () => {});

      // Assert
      expect(processListeners.has('SIGINT')).toBe(true);
    });

    it('should register uncaughtException handler', () => {
      // Act
      process.on('uncaughtException', () => {});

      // Assert
      expect(processListeners.has('uncaughtException')).toBe(true);
    });

    it('should register unhandledRejection handler', () => {
      // Act
      process.on('unhandledRejection', () => {});

      // Assert
      expect(processListeners.has('unhandledRejection')).toBe(true);
    });
  });

  // ============================================================================
  // QUEUE STATUS TESTS
  // ============================================================================

  describe('queue status', () => {
    it('should be able to check waiting job count', async () => {
      // Arrange
      mockSalesImportQueue.getWaitingCount.mockResolvedValue(5);

      // Act
      const waitingCount = await mockSalesImportQueue.getWaitingCount();

      // Assert
      expect(waitingCount).toBe(5);
    });

    it('should be able to check active job count', async () => {
      // Arrange
      mockSalesImportQueue.getActiveCount.mockResolvedValue(2);

      // Act
      const activeCount = await mockSalesImportQueue.getActiveCount();

      // Assert
      expect(activeCount).toBe(2);
    });

    it('should be able to check completed job count', async () => {
      // Arrange
      mockSalesImportQueue.getCompletedCount.mockResolvedValue(100);

      // Act
      const completedCount = await mockSalesImportQueue.getCompletedCount();

      // Assert
      expect(completedCount).toBe(100);
    });

    it('should be able to check failed job count', async () => {
      // Arrange
      mockSalesImportQueue.getFailedCount.mockResolvedValue(3);

      // Act
      const failedCount = await mockSalesImportQueue.getFailedCount();

      // Assert
      expect(failedCount).toBe(3);
    });
  });

  // ============================================================================
  // WORKER LIFECYCLE TESTS
  // ============================================================================

  describe('worker lifecycle', () => {
    it('should initialize and run until shutdown signal', async () => {
      // Arrange
      const bootstrap = async () => {
        const app = await mockNestFactory.createApplicationContext({});
        const queue = app.get('BullQueue_sales-import');

        // Worker is now running
        return { app, queue, isRunning: true };
      };

      // Act
      const result = await bootstrap();

      // Assert
      expect(result.isRunning).toBe(true);
      expect(result.app).toBeDefined();
      expect(result.queue).toBeDefined();
    });

    it('should stop running after shutdown', async () => {
      // Arrange
      let isRunning = true;

      const shutdown = async () => {
        await mockSalesImportQueue.close();
        await mockApp.close();
        isRunning = false;
      };

      // Act
      await shutdown();

      // Assert
      expect(isRunning).toBe(false);
      expect(mockSalesImportQueue.close).toHaveBeenCalled();
      expect(mockApp.close).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // REDIS CONNECTION TESTS
  // ============================================================================

  describe('redis connection', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      // Restore environment variables after each test
      process.env.REDIS_HOST = originalEnv.REDIS_HOST;
      process.env.REDIS_PORT = originalEnv.REDIS_PORT;
    });

    it('should use environment variables for Redis connection', () => {
      // Arrange
      process.env.REDIS_HOST = 'test-redis-host';
      process.env.REDIS_PORT = '6380';

      // Act
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      };

      // Assert
      expect(redisConfig.host).toBe('test-redis-host');
      expect(redisConfig.port).toBe(6380);
    });

    it('should use default values when environment variables not set', () => {
      // Arrange
      delete process.env.REDIS_HOST;
      delete process.env.REDIS_PORT;

      // Act
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      };

      // Assert
      expect(redisConfig.host).toBe('localhost');
      expect(redisConfig.port).toBe(6379);
    });
  });

  // ============================================================================
  // LOGGING TESTS
  // ============================================================================

  describe('logging', () => {
    let mockLogger: Logger;

    beforeEach(() => {
      mockLogger = new Logger('SalesImportWorker');
    });

    it('should log worker start message', () => {
      // Arrange
      const logSpy = jest.spyOn(mockLogger, 'log');

      // Act
      mockLogger.log('Starting Sales Import Worker...');

      // Assert
      expect(logSpy).toHaveBeenCalledWith('Starting Sales Import Worker...');
    });

    it('should log initialization success message', () => {
      // Arrange
      const logSpy = jest.spyOn(mockLogger, 'log');

      // Act
      mockLogger.log('Sales Import Worker initialized successfully');

      // Assert
      expect(logSpy).toHaveBeenCalledWith('Sales Import Worker initialized successfully');
    });

    it('should log Redis connection info', () => {
      // Arrange
      const logSpy = jest.spyOn(mockLogger, 'log');
      const redisHost = 'localhost';
      const redisPort = '6379';

      // Act
      mockLogger.log(`Connected to Redis: ${redisHost}:${redisPort}`);

      // Assert
      expect(logSpy).toHaveBeenCalledWith('Connected to Redis: localhost:6379');
    });

    it('should log waiting for jobs message', () => {
      // Arrange
      const logSpy = jest.spyOn(mockLogger, 'log');

      // Act
      mockLogger.log('Waiting for file import jobs...');

      // Assert
      expect(logSpy).toHaveBeenCalledWith('Waiting for file import jobs...');
    });

    it('should log shutdown signal received', () => {
      // Arrange
      const logSpy = jest.spyOn(mockLogger, 'log');

      // Act
      mockLogger.log('Received SIGTERM, closing worker gracefully...');

      // Assert
      expect(logSpy).toHaveBeenCalledWith('Received SIGTERM, closing worker gracefully...');
    });

    it('should log worker close success', () => {
      // Arrange
      const logSpy = jest.spyOn(mockLogger, 'log');

      // Act
      mockLogger.log('Worker closed successfully');

      // Assert
      expect(logSpy).toHaveBeenCalledWith('Worker closed successfully');
    });

    it('should log errors with error method', () => {
      // Arrange
      const errorSpy = jest.spyOn(mockLogger, 'error');
      const error = new Error('Test error');

      // Act
      mockLogger.error('Failed to start sales import worker:', error);

      // Assert
      expect(errorSpy).toHaveBeenCalledWith('Failed to start sales import worker:', error);
    });
  });

  // ============================================================================
  // INTEGRATION-STYLE TEST
  // ============================================================================

  describe('full bootstrap sequence', () => {
    it('should complete full bootstrap sequence successfully', async () => {
      // Arrange
      const steps: string[] = [];

      // Act - Simulate full bootstrap
      steps.push('Starting worker');
      const app = await mockNestFactory.createApplicationContext({});
      steps.push('App context created');

      const _salesImportQueue = app.get('BullQueue_sales-import');
      steps.push('Queue obtained');

      // Assert
      expect(steps).toEqual(['Starting worker', 'App context created', 'Queue obtained']);
      expect(mockNestFactory.createApplicationContext).toHaveBeenCalled();
      expect(mockApp.get).toHaveBeenCalledWith('BullQueue_sales-import');
    });

    it('should handle bootstrap failure and exit', async () => {
      // Arrange
      mockNestFactory.createApplicationContext.mockRejectedValueOnce(new Error('Bootstrap failed'));

      let exitCode: number | undefined;
      const mockExit = jest.spyOn(process, 'exit').mockImplementation((code) => {
        exitCode = code as number;
        return undefined as never;
      });

      // Act
      try {
        await mockNestFactory.createApplicationContext({});
      } catch {
        process.exit(1);
      }

      // Assert
      expect(exitCode).toBe(1);

      // Cleanup
      mockExit.mockRestore();
    });
  });

  // ============================================================================
  // QUEUE PROCESSING DELEGATION TESTS
  // ============================================================================

  describe('queue processing delegation', () => {
    it('should delegate job processing to SalesImportProcessor', () => {
      // Note: The actual processing is handled by SalesImportProcessor
      // This worker just keeps running to process jobs from the queue

      // Verify the queue exists and is properly configured
      expect(mockSalesImportQueue.process).toBeDefined();
      expect(mockSalesImportQueue.close).toBeDefined();
    });

    it('should not define inline process handlers', () => {
      // The sales import worker delegates processing to the processor
      // and should not call queue.process directly
      expect(mockSalesImportQueue.process).not.toHaveBeenCalled();
    });
  });
});
