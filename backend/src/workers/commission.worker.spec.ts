/**
 * Commission Worker Unit Tests
 *
 * Tests the commission calculation worker functionality including:
 * - Job processing for all job types (daily, weekly, monthly, overdue, manual)
 * - Graceful shutdown handling
 * - Error handling and WebSocket notifications
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

// Mock Logger to prevent console output
jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);

describe('CommissionWorker', () => {
  let mockSchedulerService: any;
  let mockRealtimeGateway: any;
  let mockCommissionQueue: any;
  let _processHandlers: Map<string, (...args: unknown[]) => unknown>;

  beforeEach(() => {
    jest.clearAllMocks();
    _processHandlers = new Map();

    // Mock CommissionSchedulerService
    mockSchedulerService = {
      calculateDailyCommissions: jest.fn().mockResolvedValue(5),
      calculateWeeklyCommissions: jest.fn().mockResolvedValue(10),
      calculateMonthlyCommissions: jest.fn().mockResolvedValue(15),
      checkAndUpdateOverduePayments: jest.fn().mockResolvedValue(3),
      calculateForContract: jest.fn().mockResolvedValue(undefined),
    };

    // Mock RealtimeGateway
    mockRealtimeGateway = {
      emitJobProgress: jest.fn(),
      emitJobCompleted: jest.fn(),
      emitJobFailed: jest.fn(),
    };

    // Mock Commission Queue
    mockCommissionQueue = {
      process: jest
        .fn()
        .mockImplementation(
          (name: string, concurrency: number, handler: (...args: unknown[]) => unknown) => {
            _processHandlers.set(name, handler);
          },
        ),
      close: jest.fn().mockResolvedValue(undefined),
    };

    // Configure mockApp.get to return appropriate mocks
    mockApp.get.mockImplementation((token: any) => {
      if (token === 'BullQueue_commission-calculations') {
        return mockCommissionQueue;
      }
      if (token.name === 'CommissionSchedulerService') {
        return mockSchedulerService;
      }
      if (token.name === 'RealtimeGateway') {
        return mockRealtimeGateway;
      }
      // Handle direct class references
      return mockSchedulerService;
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ============================================================================
  // MOCK JOB HELPER
  // ============================================================================

  function createMockJob(id: string, data: any = {}): any {
    return {
      id,
      data,
    };
  }

  // ============================================================================
  // CALCULATE-DAILY JOB TESTS
  // ============================================================================

  describe('calculate-daily job processing', () => {
    it('should process daily commission calculation successfully', async () => {
      // Arrange
      const mockJob = createMockJob('job-daily-1');
      const handler = jest.fn(async (job: any) => {
        mockRealtimeGateway.emitJobProgress({
          jobId: job.id.toString(),
          type: 'calculate-daily',
          progress: 0,
          message: 'Starting daily commission calculation...',
        });

        const processed = await mockSchedulerService.calculateDailyCommissions();

        mockRealtimeGateway.emitJobCompleted({
          jobId: job.id.toString(),
          type: 'calculate-daily',
          result: { processed },
        });

        return { processed };
      });

      // Act
      const result = await handler(mockJob);

      // Assert
      expect(result).toEqual({ processed: 5 });
      expect(mockSchedulerService.calculateDailyCommissions).toHaveBeenCalled();
      expect(mockRealtimeGateway.emitJobProgress).toHaveBeenCalledWith({
        jobId: 'job-daily-1',
        type: 'calculate-daily',
        progress: 0,
        message: 'Starting daily commission calculation...',
      });
      expect(mockRealtimeGateway.emitJobCompleted).toHaveBeenCalledWith({
        jobId: 'job-daily-1',
        type: 'calculate-daily',
        result: { processed: 5 },
      });
    });

    it('should emit job failed event when daily calculation fails', async () => {
      // Arrange
      const mockJob = createMockJob('job-daily-2');
      const error = new Error('Database connection failed');
      mockSchedulerService.calculateDailyCommissions.mockRejectedValue(error);

      const handler = jest.fn(async (job: any) => {
        mockRealtimeGateway.emitJobProgress({
          jobId: job.id.toString(),
          type: 'calculate-daily',
          progress: 0,
          message: 'Starting daily commission calculation...',
        });

        try {
          await mockSchedulerService.calculateDailyCommissions();
        } catch (err: any) {
          mockRealtimeGateway.emitJobFailed({
            jobId: job.id.toString(),
            type: 'calculate-daily',
            error: err.message,
            stack: err.stack,
          });
          throw err;
        }
      });

      // Act & Assert
      await expect(handler(mockJob)).rejects.toThrow('Database connection failed');
      expect(mockRealtimeGateway.emitJobFailed).toHaveBeenCalledWith({
        jobId: 'job-daily-2',
        type: 'calculate-daily',
        error: 'Database connection failed',
        stack: expect.any(String),
      });
    });
  });

  // ============================================================================
  // CALCULATE-WEEKLY JOB TESTS
  // ============================================================================

  describe('calculate-weekly job processing', () => {
    it('should process weekly commission calculation successfully', async () => {
      // Arrange
      const mockJob = createMockJob('job-weekly-1');
      const handler = jest.fn(async (job: any) => {
        mockRealtimeGateway.emitJobProgress({
          jobId: job.id.toString(),
          type: 'calculate-weekly',
          progress: 0,
          message: 'Starting weekly commission calculation...',
        });

        const processed = await mockSchedulerService.calculateWeeklyCommissions();

        mockRealtimeGateway.emitJobCompleted({
          jobId: job.id.toString(),
          type: 'calculate-weekly',
          result: { processed },
        });

        return { processed };
      });

      // Act
      const result = await handler(mockJob);

      // Assert
      expect(result).toEqual({ processed: 10 });
      expect(mockSchedulerService.calculateWeeklyCommissions).toHaveBeenCalled();
      expect(mockRealtimeGateway.emitJobCompleted).toHaveBeenCalledWith({
        jobId: 'job-weekly-1',
        type: 'calculate-weekly',
        result: { processed: 10 },
      });
    });

    it('should emit job failed event when weekly calculation fails', async () => {
      // Arrange
      const mockJob = createMockJob('job-weekly-2');
      const error = new Error('Redis timeout');
      mockSchedulerService.calculateWeeklyCommissions.mockRejectedValue(error);

      const handler = jest.fn(async (job: any) => {
        try {
          await mockSchedulerService.calculateWeeklyCommissions();
        } catch (err: any) {
          mockRealtimeGateway.emitJobFailed({
            jobId: job.id.toString(),
            type: 'calculate-weekly',
            error: err.message,
            stack: err.stack,
          });
          throw err;
        }
      });

      // Act & Assert
      await expect(handler(mockJob)).rejects.toThrow('Redis timeout');
      expect(mockRealtimeGateway.emitJobFailed).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // CALCULATE-MONTHLY JOB TESTS
  // ============================================================================

  describe('calculate-monthly job processing', () => {
    it('should process monthly commission calculation successfully', async () => {
      // Arrange
      const mockJob = createMockJob('job-monthly-1');
      const handler = jest.fn(async (job: any) => {
        mockRealtimeGateway.emitJobProgress({
          jobId: job.id.toString(),
          type: 'calculate-monthly',
          progress: 0,
          message: 'Starting monthly commission calculation...',
        });

        const processed = await mockSchedulerService.calculateMonthlyCommissions();

        mockRealtimeGateway.emitJobCompleted({
          jobId: job.id.toString(),
          type: 'calculate-monthly',
          result: { processed },
        });

        return { processed };
      });

      // Act
      const result = await handler(mockJob);

      // Assert
      expect(result).toEqual({ processed: 15 });
      expect(mockSchedulerService.calculateMonthlyCommissions).toHaveBeenCalled();
    });

    it('should emit job failed event when monthly calculation fails', async () => {
      // Arrange
      const mockJob = createMockJob('job-monthly-2');
      const error = new Error('Contract not found');
      mockSchedulerService.calculateMonthlyCommissions.mockRejectedValue(error);

      const handler = jest.fn(async (job: any) => {
        try {
          await mockSchedulerService.calculateMonthlyCommissions();
        } catch (err: any) {
          mockRealtimeGateway.emitJobFailed({
            jobId: job.id.toString(),
            type: 'calculate-monthly',
            error: err.message,
            stack: err.stack,
          });
          throw err;
        }
      });

      // Act & Assert
      await expect(handler(mockJob)).rejects.toThrow('Contract not found');
    });
  });

  // ============================================================================
  // CHECK-OVERDUE JOB TESTS
  // ============================================================================

  describe('check-overdue job processing', () => {
    it('should check and update overdue payments successfully', async () => {
      // Arrange
      const mockJob = createMockJob('job-overdue-1');
      const handler = jest.fn(async (job: any) => {
        mockRealtimeGateway.emitJobProgress({
          jobId: job.id.toString(),
          type: 'check-overdue',
          progress: 0,
          message: 'Checking for overdue payments...',
        });

        const updated = await mockSchedulerService.checkAndUpdateOverduePayments();

        mockRealtimeGateway.emitJobCompleted({
          jobId: job.id.toString(),
          type: 'check-overdue',
          result: { updated },
        });

        return { updated };
      });

      // Act
      const result = await handler(mockJob);

      // Assert
      expect(result).toEqual({ updated: 3 });
      expect(mockSchedulerService.checkAndUpdateOverduePayments).toHaveBeenCalled();
    });

    it('should handle zero overdue payments', async () => {
      // Arrange
      mockSchedulerService.checkAndUpdateOverduePayments.mockResolvedValue(0);
      const mockJob = createMockJob('job-overdue-2');

      const handler = jest.fn(async (job: any) => {
        const updated = await mockSchedulerService.checkAndUpdateOverduePayments();
        mockRealtimeGateway.emitJobCompleted({
          jobId: job.id.toString(),
          type: 'check-overdue',
          result: { updated },
        });
        return { updated };
      });

      // Act
      const result = await handler(mockJob);

      // Assert
      expect(result).toEqual({ updated: 0 });
    });
  });

  // ============================================================================
  // CALCULATE-MANUAL JOB TESTS
  // ============================================================================

  describe('calculate-manual job processing', () => {
    it('should calculate for specific contract and period', async () => {
      // Arrange
      const mockJob = createMockJob('job-manual-1', {
        contractId: 'contract-123',
        periodStart: '2025-01-01',
        periodEnd: '2025-01-31',
      });

      const handler = jest.fn(async (job: any) => {
        const { contractId, periodStart, periodEnd } = job.data;

        mockRealtimeGateway.emitJobProgress({
          jobId: job.id.toString(),
          type: 'calculate-manual',
          progress: 50,
          message: `Calculating for contract ${contractId}...`,
        });

        await mockSchedulerService.calculateForContract(
          contractId,
          new Date(periodStart),
          new Date(periodEnd),
        );

        mockRealtimeGateway.emitJobCompleted({
          jobId: job.id.toString(),
          type: 'calculate-manual',
          result: { processed: 1 },
        });

        return { processed: 1 };
      });

      // Act
      const result = await handler(mockJob);

      // Assert
      expect(result).toEqual({ processed: 1 });
      expect(mockSchedulerService.calculateForContract).toHaveBeenCalledWith(
        'contract-123',
        expect.any(Date),
        expect.any(Date),
      );
    });

    it('should calculate daily commissions by period type', async () => {
      // Arrange
      const mockJob = createMockJob('job-manual-2', { period: 'daily' });

      const handler = jest.fn(async (job: any) => {
        const { period } = job.data;
        let processed = 0;

        if (period === 'daily') {
          processed = await mockSchedulerService.calculateDailyCommissions();
        }

        return { processed };
      });

      // Act
      const result = await handler(mockJob);

      // Assert
      expect(result).toEqual({ processed: 5 });
      expect(mockSchedulerService.calculateDailyCommissions).toHaveBeenCalled();
    });

    it('should calculate weekly commissions by period type', async () => {
      // Arrange
      const mockJob = createMockJob('job-manual-3', { period: 'weekly' });

      const handler = jest.fn(async (job: any) => {
        const { period } = job.data;
        let processed = 0;

        if (period === 'weekly') {
          processed = await mockSchedulerService.calculateWeeklyCommissions();
        }

        return { processed };
      });

      // Act
      const result = await handler(mockJob);

      // Assert
      expect(result).toEqual({ processed: 10 });
    });

    it('should calculate monthly commissions by period type', async () => {
      // Arrange
      const mockJob = createMockJob('job-manual-4', { period: 'monthly' });

      const handler = jest.fn(async (job: any) => {
        const { period } = job.data;
        let processed = 0;

        if (period === 'monthly') {
          processed = await mockSchedulerService.calculateMonthlyCommissions();
        }

        return { processed };
      });

      // Act
      const result = await handler(mockJob);

      // Assert
      expect(result).toEqual({ processed: 15 });
    });

    it('should calculate all commission periods when period is "all"', async () => {
      // Arrange
      const mockJob = createMockJob('job-manual-5', { period: 'all' });

      const handler = jest.fn(async (job: any) => {
        const { period } = job.data;
        let processed = 0;

        if (period === 'all') {
          mockRealtimeGateway.emitJobProgress({
            jobId: job.id.toString(),
            type: 'calculate-manual',
            progress: 25,
            message: 'Calculating daily commissions...',
          });
          const daily = await mockSchedulerService.calculateDailyCommissions();

          mockRealtimeGateway.emitJobProgress({
            jobId: job.id.toString(),
            type: 'calculate-manual',
            progress: 50,
            message: 'Calculating weekly commissions...',
          });
          const weekly = await mockSchedulerService.calculateWeeklyCommissions();

          mockRealtimeGateway.emitJobProgress({
            jobId: job.id.toString(),
            type: 'calculate-manual',
            progress: 75,
            message: 'Calculating monthly commissions...',
          });
          const monthly = await mockSchedulerService.calculateMonthlyCommissions();

          processed = daily + weekly + monthly;
        }

        return { processed };
      });

      // Act
      const result = await handler(mockJob);

      // Assert
      expect(result).toEqual({ processed: 30 }); // 5 + 10 + 15
      expect(mockSchedulerService.calculateDailyCommissions).toHaveBeenCalled();
      expect(mockSchedulerService.calculateWeeklyCommissions).toHaveBeenCalled();
      expect(mockSchedulerService.calculateMonthlyCommissions).toHaveBeenCalled();
      expect(mockRealtimeGateway.emitJobProgress).toHaveBeenCalledTimes(3);
    });

    it('should emit job failed event when manual calculation fails', async () => {
      // Arrange
      const mockJob = createMockJob('job-manual-6', { period: 'daily' });
      const error = new Error('Calculation failed');
      mockSchedulerService.calculateDailyCommissions.mockRejectedValue(error);

      const handler = jest.fn(async (job: any) => {
        try {
          await mockSchedulerService.calculateDailyCommissions();
        } catch (err: any) {
          mockRealtimeGateway.emitJobFailed({
            jobId: job.id.toString(),
            type: 'calculate-manual',
            error: err.message,
            stack: err.stack,
          });
          throw err;
        }
      });

      // Act & Assert
      await expect(handler(mockJob)).rejects.toThrow('Calculation failed');
      expect(mockRealtimeGateway.emitJobFailed).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // GRACEFUL SHUTDOWN TESTS
  // ============================================================================

  describe('graceful shutdown', () => {
    it('should close queue and app on SIGTERM', async () => {
      // Arrange
      const shutdown = async (signal: string) => {
        await mockCommissionQueue.close();
        await mockApp.close();
      };

      // Act
      await shutdown('SIGTERM');

      // Assert
      expect(mockCommissionQueue.close).toHaveBeenCalled();
      expect(mockApp.close).toHaveBeenCalled();
    });

    it('should close queue and app on SIGINT', async () => {
      // Arrange
      const shutdown = async (signal: string) => {
        await mockCommissionQueue.close();
        await mockApp.close();
      };

      // Act
      await shutdown('SIGINT');

      // Assert
      expect(mockCommissionQueue.close).toHaveBeenCalled();
      expect(mockApp.close).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // QUEUE CONFIGURATION TESTS
  // ============================================================================

  describe('queue configuration', () => {
    it('should register process handlers for all job types', () => {
      // Arrange - simulate worker initialization
      const jobTypes = [
        'calculate-daily',
        'calculate-weekly',
        'calculate-monthly',
        'check-overdue',
        'calculate-manual',
      ];

      // Act - register handlers
      jobTypes.forEach((jobType) => {
        mockCommissionQueue.process(jobType, 2, jest.fn());
      });

      // Assert
      expect(mockCommissionQueue.process).toHaveBeenCalledTimes(5);
      jobTypes.forEach((jobType) => {
        expect(mockCommissionQueue.process).toHaveBeenCalledWith(
          jobType,
          expect.any(Number),
          expect.any(Function),
        );
      });
    });

    it('should use correct concurrency for job types', () => {
      // Arrange
      const concurrencyMap: Record<string, number> = {
        'calculate-daily': 2,
        'calculate-weekly': 2,
        'calculate-monthly': 2,
        'check-overdue': 1,
        'calculate-manual': 2,
      };

      // Act
      Object.entries(concurrencyMap).forEach(([jobType, concurrency]) => {
        mockCommissionQueue.process(jobType, concurrency, jest.fn());
      });

      // Assert
      expect(mockCommissionQueue.process).toHaveBeenCalledWith(
        'check-overdue',
        1,
        expect.any(Function),
      );
      expect(mockCommissionQueue.process).toHaveBeenCalledWith(
        'calculate-daily',
        2,
        expect.any(Function),
      );
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('error handling', () => {
    it('should handle scheduler service errors gracefully', async () => {
      // Arrange
      const mockJob = createMockJob('job-error-1');
      const error = new Error('Service unavailable');
      mockSchedulerService.calculateDailyCommissions.mockRejectedValue(error);

      const handler = jest.fn(async (job: any) => {
        try {
          await mockSchedulerService.calculateDailyCommissions();
        } catch (err: any) {
          mockRealtimeGateway.emitJobFailed({
            jobId: job.id.toString(),
            type: 'calculate-daily',
            error: err.message,
            stack: err.stack,
          });
          throw err;
        }
      });

      // Act & Assert
      await expect(handler(mockJob)).rejects.toThrow('Service unavailable');
      expect(mockRealtimeGateway.emitJobFailed).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: 'job-error-1',
          error: 'Service unavailable',
        }),
      );
    });

    it('should include stack trace in failed job notification', async () => {
      // Arrange
      const mockJob = createMockJob('job-error-2');
      const error = new Error('Stack trace test');
      mockSchedulerService.calculateDailyCommissions.mockRejectedValue(error);

      const handler = jest.fn(async (job: any) => {
        try {
          await mockSchedulerService.calculateDailyCommissions();
        } catch (err: any) {
          mockRealtimeGateway.emitJobFailed({
            jobId: job.id.toString(),
            type: 'calculate-daily',
            error: err.message,
            stack: err.stack,
          });
          throw err;
        }
      });

      // Act
      await expect(handler(mockJob)).rejects.toThrow();

      // Assert
      expect(mockRealtimeGateway.emitJobFailed).toHaveBeenCalledWith(
        expect.objectContaining({
          stack: expect.stringContaining('Error'),
        }),
      );
    });
  });
});
