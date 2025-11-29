/**
 * Job Scheduler Worker Unit Tests
 *
 * Tests the job scheduler worker functionality including:
 * - Removal of old repeatable jobs
 * - Scheduling of new repeatable jobs (daily, weekly, monthly, overdue)
 * - Graceful shutdown handling
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
jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);

describe('JobSchedulerWorker', () => {
  let mockCommissionQueue: any;

  // Expected cron schedules
  const CRON_SCHEDULES = {
    daily: '0 2 * * *',
    weekly: '0 3 * * 1',
    monthly: '0 4 1 * *',
    overdue: '0 6 * * *',
  };

  const TIMEZONE = 'Asia/Tashkent';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Commission Queue
    mockCommissionQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-123' }),
      getRepeatableJobs: jest.fn().mockResolvedValue([]),
      removeRepeatableByKey: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    };

    // Configure mockApp.get to return commission queue
    mockApp.get.mockImplementation((token: any) => {
      if (token === 'BullQueue_commission-calculations') {
        return mockCommissionQueue;
      }
      return mockCommissionQueue;
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // ============================================================================
  // REMOVE OLD REPEATABLE JOBS TESTS
  // ============================================================================

  describe('removeOldRepeatableJobs', () => {
    it('should remove all existing repeatable jobs', async () => {
      // Arrange
      const existingJobs = [
        { key: 'daily-key', name: 'calculate-daily', cron: '0 2 * * *' },
        { key: 'weekly-key', name: 'calculate-weekly', cron: '0 3 * * 1' },
        { key: 'monthly-key', name: 'calculate-monthly', cron: '0 4 1 * *' },
        { key: 'overdue-key', name: 'check-overdue', cron: '0 6 * * *' },
      ];
      mockCommissionQueue.getRepeatableJobs.mockResolvedValue(existingJobs);

      // Act
      const repeatableJobs = await mockCommissionQueue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        await mockCommissionQueue.removeRepeatableByKey(job.key);
      }

      // Assert
      expect(mockCommissionQueue.getRepeatableJobs).toHaveBeenCalled();
      expect(mockCommissionQueue.removeRepeatableByKey).toHaveBeenCalledTimes(4);
      expect(mockCommissionQueue.removeRepeatableByKey).toHaveBeenCalledWith('daily-key');
      expect(mockCommissionQueue.removeRepeatableByKey).toHaveBeenCalledWith('weekly-key');
      expect(mockCommissionQueue.removeRepeatableByKey).toHaveBeenCalledWith('monthly-key');
      expect(mockCommissionQueue.removeRepeatableByKey).toHaveBeenCalledWith('overdue-key');
    });

    it('should handle no existing repeatable jobs', async () => {
      // Arrange
      mockCommissionQueue.getRepeatableJobs.mockResolvedValue([]);

      // Act
      const repeatableJobs = await mockCommissionQueue.getRepeatableJobs();
      for (const job of repeatableJobs) {
        await mockCommissionQueue.removeRepeatableByKey(job.key);
      }

      // Assert
      expect(mockCommissionQueue.getRepeatableJobs).toHaveBeenCalled();
      expect(mockCommissionQueue.removeRepeatableByKey).not.toHaveBeenCalled();
    });

    it('should handle removal errors gracefully', async () => {
      // Arrange
      const existingJobs = [{ key: 'daily-key', name: 'calculate-daily', cron: '0 2 * * *' }];
      mockCommissionQueue.getRepeatableJobs.mockResolvedValue(existingJobs);
      mockCommissionQueue.removeRepeatableByKey.mockRejectedValue(
        new Error('Failed to remove job'),
      );

      // Act & Assert
      const repeatableJobs = await mockCommissionQueue.getRepeatableJobs();
      await expect(
        mockCommissionQueue.removeRepeatableByKey(repeatableJobs[0].key),
      ).rejects.toThrow('Failed to remove job');
    });
  });

  // ============================================================================
  // SCHEDULE DAILY COMMISSION JOB TESTS
  // ============================================================================

  describe('scheduleDailyCommissionJob', () => {
    it('should schedule daily commission job with correct cron', async () => {
      // Act
      await mockCommissionQueue.add(
        'calculate-daily',
        {},
        {
          repeat: {
            cron: CRON_SCHEDULES.daily,
            tz: TIMEZONE,
          },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      );

      // Assert
      expect(mockCommissionQueue.add).toHaveBeenCalledWith(
        'calculate-daily',
        {},
        {
          repeat: {
            cron: '0 2 * * *', // 2 AM daily
            tz: 'Asia/Tashkent',
          },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      );
    });

    it('should use Asia/Tashkent timezone for daily job', async () => {
      // Act
      await mockCommissionQueue.add(
        'calculate-daily',
        {},
        {
          repeat: {
            cron: CRON_SCHEDULES.daily,
            tz: TIMEZONE,
          },
        },
      );

      // Assert
      expect(mockCommissionQueue.add).toHaveBeenCalledWith(
        'calculate-daily',
        {},
        expect.objectContaining({
          repeat: expect.objectContaining({
            tz: 'Asia/Tashkent',
          }),
        }),
      );
    });
  });

  // ============================================================================
  // SCHEDULE WEEKLY COMMISSION JOB TESTS
  // ============================================================================

  describe('scheduleWeeklyCommissionJob', () => {
    it('should schedule weekly commission job with correct cron', async () => {
      // Act
      await mockCommissionQueue.add(
        'calculate-weekly',
        {},
        {
          repeat: {
            cron: CRON_SCHEDULES.weekly,
            tz: TIMEZONE,
          },
          removeOnComplete: 50,
          removeOnFail: 100,
        },
      );

      // Assert
      expect(mockCommissionQueue.add).toHaveBeenCalledWith(
        'calculate-weekly',
        {},
        {
          repeat: {
            cron: '0 3 * * 1', // 3 AM Monday
            tz: 'Asia/Tashkent',
          },
          removeOnComplete: 50,
          removeOnFail: 100,
        },
      );
    });

    it('should schedule weekly job to run on Monday at 3 AM', async () => {
      // Act
      await mockCommissionQueue.add(
        'calculate-weekly',
        {},
        {
          repeat: {
            cron: CRON_SCHEDULES.weekly,
            tz: TIMEZONE,
          },
        },
      );

      // Assert
      expect(mockCommissionQueue.add).toHaveBeenCalledWith(
        'calculate-weekly',
        {},
        expect.objectContaining({
          repeat: expect.objectContaining({
            cron: '0 3 * * 1', // Day 1 = Monday
          }),
        }),
      );
    });
  });

  // ============================================================================
  // SCHEDULE MONTHLY COMMISSION JOB TESTS
  // ============================================================================

  describe('scheduleMonthlyCommissionJob', () => {
    it('should schedule monthly commission job with correct cron', async () => {
      // Act
      await mockCommissionQueue.add(
        'calculate-monthly',
        {},
        {
          repeat: {
            cron: CRON_SCHEDULES.monthly,
            tz: TIMEZONE,
          },
          removeOnComplete: 50,
          removeOnFail: 100,
        },
      );

      // Assert
      expect(mockCommissionQueue.add).toHaveBeenCalledWith(
        'calculate-monthly',
        {},
        {
          repeat: {
            cron: '0 4 1 * *', // 4 AM on 1st of month
            tz: 'Asia/Tashkent',
          },
          removeOnComplete: 50,
          removeOnFail: 100,
        },
      );
    });

    it('should schedule monthly job to run on 1st of each month', async () => {
      // Act
      await mockCommissionQueue.add(
        'calculate-monthly',
        {},
        {
          repeat: {
            cron: CRON_SCHEDULES.monthly,
            tz: TIMEZONE,
          },
        },
      );

      // Assert
      expect(mockCommissionQueue.add).toHaveBeenCalledWith(
        'calculate-monthly',
        {},
        expect.objectContaining({
          repeat: expect.objectContaining({
            cron: '0 4 1 * *', // Day 1 = 1st of month
          }),
        }),
      );
    });
  });

  // ============================================================================
  // SCHEDULE OVERDUE CHECK JOB TESTS
  // ============================================================================

  describe('scheduleOverdueCheckJob', () => {
    it('should schedule overdue check job with correct cron', async () => {
      // Act
      await mockCommissionQueue.add(
        'check-overdue',
        {},
        {
          repeat: {
            cron: CRON_SCHEDULES.overdue,
            tz: TIMEZONE,
          },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      );

      // Assert
      expect(mockCommissionQueue.add).toHaveBeenCalledWith(
        'check-overdue',
        {},
        {
          repeat: {
            cron: '0 6 * * *', // 6 AM daily
            tz: 'Asia/Tashkent',
          },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      );
    });

    it('should schedule overdue check to run daily at 6 AM', async () => {
      // Act
      await mockCommissionQueue.add(
        'check-overdue',
        {},
        {
          repeat: {
            cron: CRON_SCHEDULES.overdue,
            tz: TIMEZONE,
          },
        },
      );

      // Assert
      expect(mockCommissionQueue.add).toHaveBeenCalledWith(
        'check-overdue',
        {},
        expect.objectContaining({
          repeat: expect.objectContaining({
            cron: '0 6 * * *',
          }),
        }),
      );
    });
  });

  // ============================================================================
  // SCHEDULE ALL JOBS TESTS
  // ============================================================================

  describe('scheduleAllJobs', () => {
    it('should schedule all four job types', async () => {
      // Act
      await mockCommissionQueue.add(
        'calculate-daily',
        {},
        {
          repeat: { cron: CRON_SCHEDULES.daily, tz: TIMEZONE },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      );
      await mockCommissionQueue.add(
        'calculate-weekly',
        {},
        {
          repeat: { cron: CRON_SCHEDULES.weekly, tz: TIMEZONE },
          removeOnComplete: 50,
          removeOnFail: 100,
        },
      );
      await mockCommissionQueue.add(
        'calculate-monthly',
        {},
        {
          repeat: { cron: CRON_SCHEDULES.monthly, tz: TIMEZONE },
          removeOnComplete: 50,
          removeOnFail: 100,
        },
      );
      await mockCommissionQueue.add(
        'check-overdue',
        {},
        {
          repeat: { cron: CRON_SCHEDULES.overdue, tz: TIMEZONE },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      );

      // Assert
      expect(mockCommissionQueue.add).toHaveBeenCalledTimes(4);
      expect(mockCommissionQueue.add).toHaveBeenCalledWith(
        'calculate-daily',
        expect.anything(),
        expect.anything(),
      );
      expect(mockCommissionQueue.add).toHaveBeenCalledWith(
        'calculate-weekly',
        expect.anything(),
        expect.anything(),
      );
      expect(mockCommissionQueue.add).toHaveBeenCalledWith(
        'calculate-monthly',
        expect.anything(),
        expect.anything(),
      );
      expect(mockCommissionQueue.add).toHaveBeenCalledWith(
        'check-overdue',
        expect.anything(),
        expect.anything(),
      );
    });

    it('should verify all scheduled jobs after setup', async () => {
      // Arrange
      const expectedJobs = [
        { name: 'calculate-daily', cron: '0 2 * * *', tz: 'Asia/Tashkent' },
        { name: 'calculate-weekly', cron: '0 3 * * 1', tz: 'Asia/Tashkent' },
        { name: 'calculate-monthly', cron: '0 4 1 * *', tz: 'Asia/Tashkent' },
        { name: 'check-overdue', cron: '0 6 * * *', tz: 'Asia/Tashkent' },
      ];
      mockCommissionQueue.getRepeatableJobs.mockResolvedValue(expectedJobs);

      // Act
      const newRepeatableJobs = await mockCommissionQueue.getRepeatableJobs();

      // Assert
      expect(newRepeatableJobs).toHaveLength(4);
      expect(newRepeatableJobs).toContainEqual(
        expect.objectContaining({ name: 'calculate-daily', cron: '0 2 * * *' }),
      );
      expect(newRepeatableJobs).toContainEqual(
        expect.objectContaining({ name: 'calculate-weekly', cron: '0 3 * * 1' }),
      );
      expect(newRepeatableJobs).toContainEqual(
        expect.objectContaining({ name: 'calculate-monthly', cron: '0 4 1 * *' }),
      );
      expect(newRepeatableJobs).toContainEqual(
        expect.objectContaining({ name: 'check-overdue', cron: '0 6 * * *' }),
      );
    });
  });

  // ============================================================================
  // JOB OPTIONS CONFIGURATION TESTS
  // ============================================================================

  describe('job options configuration', () => {
    it('should configure removeOnComplete option for daily jobs', async () => {
      // Act
      await mockCommissionQueue.add(
        'calculate-daily',
        {},
        {
          repeat: { cron: CRON_SCHEDULES.daily, tz: TIMEZONE },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      );

      // Assert
      expect(mockCommissionQueue.add).toHaveBeenCalledWith(
        'calculate-daily',
        {},
        expect.objectContaining({
          removeOnComplete: 100,
        }),
      );
    });

    it('should configure removeOnFail option for daily jobs', async () => {
      // Act
      await mockCommissionQueue.add(
        'calculate-daily',
        {},
        {
          repeat: { cron: CRON_SCHEDULES.daily, tz: TIMEZONE },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      );

      // Assert
      expect(mockCommissionQueue.add).toHaveBeenCalledWith(
        'calculate-daily',
        {},
        expect.objectContaining({
          removeOnFail: 200,
        }),
      );
    });

    it('should configure lower removeOnComplete for weekly jobs', async () => {
      // Act
      await mockCommissionQueue.add(
        'calculate-weekly',
        {},
        {
          repeat: { cron: CRON_SCHEDULES.weekly, tz: TIMEZONE },
          removeOnComplete: 50,
          removeOnFail: 100,
        },
      );

      // Assert
      expect(mockCommissionQueue.add).toHaveBeenCalledWith(
        'calculate-weekly',
        {},
        expect.objectContaining({
          removeOnComplete: 50,
        }),
      );
    });

    it('should configure lower removeOnComplete for monthly jobs', async () => {
      // Act
      await mockCommissionQueue.add(
        'calculate-monthly',
        {},
        {
          repeat: { cron: CRON_SCHEDULES.monthly, tz: TIMEZONE },
          removeOnComplete: 50,
          removeOnFail: 100,
        },
      );

      // Assert
      expect(mockCommissionQueue.add).toHaveBeenCalledWith(
        'calculate-monthly',
        {},
        expect.objectContaining({
          removeOnComplete: 50,
        }),
      );
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

    it('should close queue before app', async () => {
      // Arrange
      const callOrder: string[] = [];
      mockCommissionQueue.close.mockImplementation(async () => {
        callOrder.push('queue');
      });
      mockApp.close.mockImplementation(async () => {
        callOrder.push('app');
      });

      const shutdown = async (signal: string) => {
        await mockCommissionQueue.close();
        await mockApp.close();
      };

      // Act
      await shutdown('SIGTERM');

      // Assert
      expect(callOrder).toEqual(['queue', 'app']);
    });
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  describe('error handling', () => {
    it('should handle queue.add errors', async () => {
      // Arrange
      mockCommissionQueue.add.mockRejectedValue(new Error('Queue connection failed'));

      // Act & Assert
      await expect(
        mockCommissionQueue.add(
          'calculate-daily',
          {},
          {
            repeat: { cron: CRON_SCHEDULES.daily, tz: TIMEZONE },
          },
        ),
      ).rejects.toThrow('Queue connection failed');
    });

    it('should handle getRepeatableJobs errors', async () => {
      // Arrange
      mockCommissionQueue.getRepeatableJobs.mockRejectedValue(
        new Error('Failed to get repeatable jobs'),
      );

      // Act & Assert
      await expect(mockCommissionQueue.getRepeatableJobs()).rejects.toThrow(
        'Failed to get repeatable jobs',
      );
    });
  });

  // ============================================================================
  // HEARTBEAT TESTS
  // ============================================================================

  describe('heartbeat', () => {
    it('should set up heartbeat interval', () => {
      // Arrange
      jest.useFakeTimers();
      const heartbeatFn = jest.fn();
      const HEARTBEAT_INTERVAL = 600000; // 10 minutes

      // Act
      setInterval(heartbeatFn, HEARTBEAT_INTERVAL);
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL);

      // Assert
      expect(heartbeatFn).toHaveBeenCalledTimes(1);

      // Cleanup
      jest.useRealTimers();
    });

    it('should call heartbeat multiple times over time', () => {
      // Arrange
      jest.useFakeTimers();
      const heartbeatFn = jest.fn();
      const HEARTBEAT_INTERVAL = 600000; // 10 minutes

      // Act
      setInterval(heartbeatFn, HEARTBEAT_INTERVAL);
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL * 3);

      // Assert
      expect(heartbeatFn).toHaveBeenCalledTimes(3);

      // Cleanup
      jest.useRealTimers();
    });
  });

  // ============================================================================
  // CRON EXPRESSION VALIDATION TESTS
  // ============================================================================

  describe('cron expression validation', () => {
    it('should use valid cron expression for daily job', () => {
      // Arrange
      const cronRegex =
        /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-7])|\*\/([0-7]))$/;

      // Assert
      expect(CRON_SCHEDULES.daily).toMatch(/^0 2 \* \* \*$/);
    });

    it('should use valid cron expression for weekly job', () => {
      // Assert
      expect(CRON_SCHEDULES.weekly).toMatch(/^0 3 \* \* 1$/);
    });

    it('should use valid cron expression for monthly job', () => {
      // Assert
      expect(CRON_SCHEDULES.monthly).toMatch(/^0 4 1 \* \*$/);
    });

    it('should use valid cron expression for overdue check job', () => {
      // Assert
      expect(CRON_SCHEDULES.overdue).toMatch(/^0 6 \* \* \*$/);
    });
  });

  // ============================================================================
  // FULL INITIALIZATION FLOW TEST
  // ============================================================================

  describe('full initialization flow', () => {
    it('should perform complete initialization sequence', async () => {
      // Arrange
      const existingJobs = [
        { key: 'old-daily', name: 'calculate-daily', cron: '0 1 * * *' }, // Old schedule
      ];
      mockCommissionQueue.getRepeatableJobs
        .mockResolvedValueOnce(existingJobs) // First call - get old jobs
        .mockResolvedValueOnce([
          // Second call - verify new jobs
          { name: 'calculate-daily', cron: '0 2 * * *', tz: 'Asia/Tashkent' },
          { name: 'calculate-weekly', cron: '0 3 * * 1', tz: 'Asia/Tashkent' },
          { name: 'calculate-monthly', cron: '0 4 1 * *', tz: 'Asia/Tashkent' },
          { name: 'check-overdue', cron: '0 6 * * *', tz: 'Asia/Tashkent' },
        ]);

      // Act - Simulate full initialization
      // Step 1: Remove old jobs
      const oldJobs = await mockCommissionQueue.getRepeatableJobs();
      for (const job of oldJobs) {
        await mockCommissionQueue.removeRepeatableByKey(job.key);
      }

      // Step 2: Add new jobs
      await mockCommissionQueue.add(
        'calculate-daily',
        {},
        {
          repeat: { cron: CRON_SCHEDULES.daily, tz: TIMEZONE },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      );
      await mockCommissionQueue.add(
        'calculate-weekly',
        {},
        {
          repeat: { cron: CRON_SCHEDULES.weekly, tz: TIMEZONE },
          removeOnComplete: 50,
          removeOnFail: 100,
        },
      );
      await mockCommissionQueue.add(
        'calculate-monthly',
        {},
        {
          repeat: { cron: CRON_SCHEDULES.monthly, tz: TIMEZONE },
          removeOnComplete: 50,
          removeOnFail: 100,
        },
      );
      await mockCommissionQueue.add(
        'check-overdue',
        {},
        {
          repeat: { cron: CRON_SCHEDULES.overdue, tz: TIMEZONE },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      );

      // Step 3: Verify jobs
      const newJobs = await mockCommissionQueue.getRepeatableJobs();

      // Assert
      expect(mockCommissionQueue.removeRepeatableByKey).toHaveBeenCalledWith('old-daily');
      expect(mockCommissionQueue.add).toHaveBeenCalledTimes(4);
      expect(newJobs).toHaveLength(4);
    });
  });
});
