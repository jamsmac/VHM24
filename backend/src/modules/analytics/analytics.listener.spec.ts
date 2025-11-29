import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsListener } from './analytics.listener';
import { AnalyticsService } from './analytics.service';
import { Transaction, TransactionType } from '../transactions/entities/transaction.entity';
import { Task, TaskType, TaskStatus, TaskPriority } from '../tasks/entities/task.entity';

describe('AnalyticsListener', () => {
  let listener: AnalyticsListener;
  let analyticsService: jest.Mocked<AnalyticsService>;

  const mockTransaction: Partial<Transaction> = {
    id: 'trans-uuid',
    transaction_type: TransactionType.SALE,
    amount: 15000,
  };

  const mockCollectionTransaction: Partial<Transaction> = {
    id: 'collection-uuid',
    transaction_type: TransactionType.COLLECTION,
    amount: 500000,
  };

  const mockTask: Partial<Task> = {
    id: 'task-uuid',
    type_code: TaskType.REFILL,
    status: TaskStatus.COMPLETED,
    priority: TaskPriority.NORMAL,
  };

  beforeEach(async () => {
    const mockAnalyticsService = {
      updateSalesStats: jest.fn().mockResolvedValue(undefined),
      updateCollectionStats: jest.fn().mockResolvedValue(undefined),
      updateTaskStats: jest.fn().mockResolvedValue(undefined),
      rebuildDailyStats: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsListener,
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    listener = module.get<AnalyticsListener>(AnalyticsListener);
    analyticsService = module.get(AnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleTransactionCreated', () => {
    it('should update sales stats for SALE transaction', async () => {
      const date = new Date('2025-01-15');
      const payload = {
        transaction: mockTransaction as Transaction,
        date,
      };

      await listener.handleTransactionCreated(payload);

      expect(analyticsService.updateSalesStats).toHaveBeenCalledWith(date, mockTransaction);
      expect(analyticsService.updateCollectionStats).not.toHaveBeenCalled();
    });

    it('should update collection stats for COLLECTION transaction', async () => {
      const date = new Date('2025-01-15');
      const payload = {
        transaction: mockCollectionTransaction as Transaction,
        date,
      };

      await listener.handleTransactionCreated(payload);

      expect(analyticsService.updateCollectionStats).toHaveBeenCalledWith(date, 500000);
      expect(analyticsService.updateSalesStats).not.toHaveBeenCalled();
    });

    it('should not call any update for EXPENSE transaction', async () => {
      const date = new Date('2025-01-15');
      const expenseTransaction: Partial<Transaction> = {
        id: 'expense-uuid',
        transaction_type: TransactionType.EXPENSE,
        amount: 10000,
      };
      const payload = {
        transaction: expenseTransaction as Transaction,
        date,
      };

      await listener.handleTransactionCreated(payload);

      expect(analyticsService.updateSalesStats).not.toHaveBeenCalled();
      expect(analyticsService.updateCollectionStats).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully without throwing', async () => {
      const date = new Date('2025-01-15');
      const payload = {
        transaction: mockTransaction as Transaction,
        date,
      };
      analyticsService.updateSalesStats.mockRejectedValue(new Error('Database error'));

      await expect(listener.handleTransactionCreated(payload)).resolves.not.toThrow();
    });
  });

  describe('handleTaskCompleted', () => {
    it('should update task stats when task is completed', async () => {
      const date = new Date('2025-01-15');
      const payload = {
        task: mockTask as Task,
        date,
      };

      await listener.handleTaskCompleted(payload);

      expect(analyticsService.updateTaskStats).toHaveBeenCalledWith(date, mockTask);
    });

    it('should handle errors gracefully without throwing', async () => {
      const date = new Date('2025-01-15');
      const payload = {
        task: mockTask as Task,
        date,
      };
      analyticsService.updateTaskStats.mockRejectedValue(new Error('Database error'));

      await expect(listener.handleTaskCompleted(payload)).resolves.not.toThrow();
    });
  });

  describe('handleTaskRejected', () => {
    it('should rebuild daily stats when task is rejected', async () => {
      const date = new Date('2025-01-15');
      const payload = {
        task: mockTask as Task,
        date,
      };

      await listener.handleTaskRejected(payload);

      expect(analyticsService.rebuildDailyStats).toHaveBeenCalledWith(date);
    });

    it('should handle errors gracefully without throwing', async () => {
      const date = new Date('2025-01-15');
      const payload = {
        task: mockTask as Task,
        date,
      };
      analyticsService.rebuildDailyStats.mockRejectedValue(new Error('Database error'));

      await expect(listener.handleTaskRejected(payload)).resolves.not.toThrow();
    });
  });
});
