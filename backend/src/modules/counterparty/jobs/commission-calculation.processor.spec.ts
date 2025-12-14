import { Test, TestingModule } from '@nestjs/testing';
import { CommissionCalculationProcessor } from './commission-calculation.processor';
import { CommissionSchedulerService } from '../services/commission-scheduler.service';
import { Job } from 'bull';

describe('CommissionCalculationProcessor', () => {
  let processor: CommissionCalculationProcessor;
  let _schedulerService: CommissionSchedulerService;

  const mockSchedulerService = {
    calculateDailyCommissions: jest.fn(),
    calculateWeeklyCommissions: jest.fn(),
    calculateMonthlyCommissions: jest.fn(),
    checkAndUpdateOverduePayments: jest.fn(),
    calculateForContract: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionCalculationProcessor,
        {
          provide: CommissionSchedulerService,
          useValue: mockSchedulerService,
        },
      ],
    }).compile();

    processor = module.get<CommissionCalculationProcessor>(CommissionCalculationProcessor);
    _schedulerService = module.get<CommissionSchedulerService>(CommissionSchedulerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleDailyCalculation', () => {
    it('should process daily commission calculation job successfully', async () => {
      const mockJob = {
        id: '123',
        name: 'calculate-daily',
      } as Job;

      mockSchedulerService.calculateDailyCommissions.mockResolvedValue(5);

      const result = await processor.handleDailyCalculation(mockJob);

      expect(result).toEqual({ processed: 5 });
      expect(mockSchedulerService.calculateDailyCommissions).toHaveBeenCalledTimes(1);
    });

    it('should throw error if daily calculation fails', async () => {
      const mockJob = {
        id: '123',
        name: 'calculate-daily',
      } as Job;

      const error = new Error('Database connection failed');
      mockSchedulerService.calculateDailyCommissions.mockRejectedValue(error);

      await expect(processor.handleDailyCalculation(mockJob)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle zero contracts processed', async () => {
      const mockJob = {
        id: '123',
        name: 'calculate-daily',
      } as Job;

      mockSchedulerService.calculateDailyCommissions.mockResolvedValue(0);

      const result = await processor.handleDailyCalculation(mockJob);

      expect(result).toEqual({ processed: 0 });
    });
  });

  describe('handleWeeklyCalculation', () => {
    it('should process weekly commission calculation job successfully', async () => {
      const mockJob = {
        id: '456',
        name: 'calculate-weekly',
      } as Job;

      mockSchedulerService.calculateWeeklyCommissions.mockResolvedValue(12);

      const result = await processor.handleWeeklyCalculation(mockJob);

      expect(result).toEqual({ processed: 12 });
      expect(mockSchedulerService.calculateWeeklyCommissions).toHaveBeenCalledTimes(1);
    });

    it('should throw error if weekly calculation fails', async () => {
      const mockJob = {
        id: '456',
        name: 'calculate-weekly',
      } as Job;

      const error = new Error('Service unavailable');
      mockSchedulerService.calculateWeeklyCommissions.mockRejectedValue(error);

      await expect(processor.handleWeeklyCalculation(mockJob)).rejects.toThrow(
        'Service unavailable',
      );
    });
  });

  describe('handleMonthlyCalculation', () => {
    it('should process monthly commission calculation job successfully', async () => {
      const mockJob = {
        id: '789',
        name: 'calculate-monthly',
      } as Job;

      mockSchedulerService.calculateMonthlyCommissions.mockResolvedValue(25);

      const result = await processor.handleMonthlyCalculation(mockJob);

      expect(result).toEqual({ processed: 25 });
      expect(mockSchedulerService.calculateMonthlyCommissions).toHaveBeenCalledTimes(1);
    });

    it('should throw error if monthly calculation fails', async () => {
      const mockJob = {
        id: '789',
        name: 'calculate-monthly',
      } as Job;

      const error = new Error('Calculation timeout');
      mockSchedulerService.calculateMonthlyCommissions.mockRejectedValue(error);

      await expect(processor.handleMonthlyCalculation(mockJob)).rejects.toThrow(
        'Calculation timeout',
      );
    });
  });

  describe('handleOverdueCheck', () => {
    it('should process overdue payment check successfully', async () => {
      const mockJob = {
        id: 'abc',
        name: 'check-overdue',
      } as Job;

      mockSchedulerService.checkAndUpdateOverduePayments.mockResolvedValue(3);

      const result = await processor.handleOverdueCheck(mockJob);

      expect(result).toEqual({ updated: 3 });
      expect(mockSchedulerService.checkAndUpdateOverduePayments).toHaveBeenCalledTimes(1);
    });

    it('should handle no overdue payments found', async () => {
      const mockJob = {
        id: 'abc',
        name: 'check-overdue',
      } as Job;

      mockSchedulerService.checkAndUpdateOverduePayments.mockResolvedValue(0);

      const result = await processor.handleOverdueCheck(mockJob);

      expect(result).toEqual({ updated: 0 });
    });

    it('should throw error if overdue check fails', async () => {
      const mockJob = {
        id: 'abc',
        name: 'check-overdue',
      } as Job;

      const error = new Error('Query failed');
      mockSchedulerService.checkAndUpdateOverduePayments.mockRejectedValue(error);

      await expect(processor.handleOverdueCheck(mockJob)).rejects.toThrow('Query failed');
    });
  });

  describe('handleManualCalculation', () => {
    it('should process manual daily calculation', async () => {
      const mockJob = {
        id: 'manual-1',
        name: 'calculate-manual',
        data: { period: 'daily' },
      } as Job<{ period: 'daily' }>;

      mockSchedulerService.calculateDailyCommissions.mockResolvedValue(5);

      const result = await processor.handleManualCalculation(mockJob);

      expect(result).toEqual({ processed: 5 });
      expect(mockSchedulerService.calculateDailyCommissions).toHaveBeenCalled();
    });

    it('should process manual weekly calculation', async () => {
      const mockJob = {
        id: 'manual-2',
        name: 'calculate-manual',
        data: { period: 'weekly' },
      } as Job<{ period: 'weekly' }>;

      mockSchedulerService.calculateWeeklyCommissions.mockResolvedValue(8);

      const result = await processor.handleManualCalculation(mockJob);

      expect(result).toEqual({ processed: 8 });
      expect(mockSchedulerService.calculateWeeklyCommissions).toHaveBeenCalled();
    });

    it('should process manual monthly calculation', async () => {
      const mockJob = {
        id: 'manual-3',
        name: 'calculate-manual',
        data: { period: 'monthly' },
      } as Job<{ period: 'monthly' }>;

      mockSchedulerService.calculateMonthlyCommissions.mockResolvedValue(15);

      const result = await processor.handleManualCalculation(mockJob);

      expect(result).toEqual({ processed: 15 });
      expect(mockSchedulerService.calculateMonthlyCommissions).toHaveBeenCalled();
    });

    it('should process manual calculation for all periods', async () => {
      const mockJob = {
        id: 'manual-4',
        name: 'calculate-manual',
        data: { period: 'all' },
      } as Job<{ period: 'all' }>;

      mockSchedulerService.calculateDailyCommissions.mockResolvedValue(5);
      mockSchedulerService.calculateWeeklyCommissions.mockResolvedValue(8);
      mockSchedulerService.calculateMonthlyCommissions.mockResolvedValue(15);

      const result = await processor.handleManualCalculation(mockJob);

      expect(result).toEqual({ processed: 28 }); // 5 + 8 + 15
      expect(mockSchedulerService.calculateDailyCommissions).toHaveBeenCalled();
      expect(mockSchedulerService.calculateWeeklyCommissions).toHaveBeenCalled();
      expect(mockSchedulerService.calculateMonthlyCommissions).toHaveBeenCalled();
    });

    it('should process manual calculation for specific contract and period', async () => {
      const mockJob = {
        id: 'manual-5',
        name: 'calculate-manual',
        data: {
          contractId: 'contract-123',
          periodStart: '2025-11-01',
          periodEnd: '2025-11-30',
        },
      } as Job<{
        contractId: string;
        periodStart: string;
        periodEnd: string;
      }>;

      mockSchedulerService.calculateForContract.mockResolvedValue({
        id: 'calc-1',
        commission_amount: 1_000_000,
      });

      const result = await processor.handleManualCalculation(mockJob);

      expect(result).toEqual({ processed: 1 });
      expect(mockSchedulerService.calculateForContract).toHaveBeenCalledWith(
        'contract-123',
        new Date('2025-11-01'),
        new Date('2025-11-30'),
      );
    });

    it('should throw error for invalid manual calculation parameters', async () => {
      const mockJob = {
        id: 'manual-6',
        name: 'calculate-manual',
        data: {},
      } as Job<Record<string, never>>;

      await expect(processor.handleManualCalculation(mockJob)).rejects.toThrow(
        'Invalid manual calculation parameters',
      );
    });

    it('should throw error if manual calculation fails', async () => {
      const mockJob = {
        id: 'manual-7',
        name: 'calculate-manual',
        data: { period: 'daily' },
      } as Job<{ period: 'daily' }>;

      const error = new Error('Calculation failed');
      mockSchedulerService.calculateDailyCommissions.mockRejectedValue(error);

      await expect(processor.handleManualCalculation(mockJob)).rejects.toThrow(
        'Calculation failed',
      );
    });
  });

  describe('Job event handlers', () => {
    it('should handle job completion', async () => {
      const mockJob = {
        id: '123',
        name: 'calculate-daily',
      } as Job;

      const result = { processed: 5 };

      // Should not throw
      await processor.onCompleted(mockJob, result);
    });

    it('should handle job failure', async () => {
      const mockJob = {
        id: '123',
        name: 'calculate-daily',
      } as Job;

      const error = new Error('Job failed');

      // Should not throw
      await processor.onFailed(mockJob, error);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle large number of contracts processed', async () => {
      const mockJob = {
        id: 'large-batch',
        name: 'calculate-monthly',
      } as Job;

      mockSchedulerService.calculateMonthlyCommissions.mockResolvedValue(500);

      const result = await processor.handleMonthlyCalculation(mockJob);

      expect(result.processed).toBe(500);
    });

    it('should handle concurrent job execution', async () => {
      const dailyJob = {
        id: 'daily-1',
        name: 'calculate-daily',
      } as Job;

      const weeklyJob = {
        id: 'weekly-1',
        name: 'calculate-weekly',
      } as Job;

      mockSchedulerService.calculateDailyCommissions.mockResolvedValue(5);
      mockSchedulerService.calculateWeeklyCommissions.mockResolvedValue(10);

      const [dailyResult, weeklyResult] = await Promise.all([
        processor.handleDailyCalculation(dailyJob),
        processor.handleWeeklyCalculation(weeklyJob),
      ]);

      expect(dailyResult).toEqual({ processed: 5 });
      expect(weeklyResult).toEqual({ processed: 10 });
    });
  });
});
