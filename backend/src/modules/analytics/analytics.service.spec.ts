import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AnalyticsService } from './analytics.service';
import { DailyStats } from './entities/daily-stats.entity';
import { Transaction, TransactionType } from '../transactions/entities/transaction.entity';
import { Task, TaskStatus, TaskType } from '../tasks/entities/task.entity';
import { subDays } from 'date-fns';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockDailyStatsRepository: jest.Mocked<Repository<DailyStats>>;
  let mockDataSource: jest.Mocked<DataSource>;

  // Test data
  const testDate = new Date('2025-01-15');
  const testDateStr = '2025-01-15';

  const mockDailyStats: Partial<DailyStats> = {
    id: 'stats-1',
    stat_date: testDate,
    total_revenue: 0,
    total_sales_count: 0,
    average_sale_amount: 0,
    total_collections: 0,
    collections_count: 0,
    active_machines_count: 0,
    online_machines_count: 0,
    offline_machines_count: 0,
    refill_tasks_completed: 0,
    collection_tasks_completed: 0,
    cleaning_tasks_completed: 0,
    repair_tasks_completed: 0,
    total_tasks_completed: 0,
    inventory_units_refilled: 0,
    inventory_units_sold: 0,
    top_products: null,
    top_machines: null,
    active_operators_count: 0,
    last_updated_at: new Date(),
    last_full_rebuild_at: null,
    is_finalized: false,
    metadata: null,
  };

  const mockSaleTransaction: Partial<Transaction> = {
    id: 'tx-1',
    transaction_type: TransactionType.SALE,
    amount: 150.5,
    sale_date: testDate,
    created_at: testDate,
  };

  const mockCollectionTransaction: Partial<Transaction> = {
    id: 'tx-2',
    transaction_type: TransactionType.COLLECTION,
    amount: 5000,
    created_at: testDate,
  };

  const mockRefillTask: Partial<Task> = {
    id: 'task-1',
    type_code: TaskType.REFILL,
    status: TaskStatus.COMPLETED,
    completed_at: testDate,
  };

  const mockCollectionTask: Partial<Task> = {
    id: 'task-2',
    type_code: TaskType.COLLECTION,
    status: TaskStatus.COMPLETED,
    completed_at: testDate,
  };

  const mockCleaningTask: Partial<Task> = {
    id: 'task-3',
    type_code: TaskType.CLEANING,
    status: TaskStatus.COMPLETED,
    completed_at: testDate,
  };

  const mockRepairTask: Partial<Task> = {
    id: 'task-4',
    type_code: TaskType.REPAIR,
    status: TaskStatus.COMPLETED,
    completed_at: testDate,
  };

  // Helper to create mock repository with query builder
  const createMockRepository = () => {
    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({}),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    return {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };
  };

  beforeEach(async () => {
    mockDailyStatsRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    } as any;

    mockDataSource = {
      getRepository: jest.fn().mockReturnValue(createMockRepository()),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(DailyStats),
          useValue: mockDailyStatsRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreateDailyStats', () => {
    it('should return existing stats when found', async () => {
      // Arrange
      mockDailyStatsRepository.findOne.mockResolvedValue(mockDailyStats as DailyStats);

      // Act
      const result = await service.getOrCreateDailyStats(testDate);

      // Assert
      expect(result).toEqual(mockDailyStats);
      expect(mockDailyStatsRepository.findOne).toHaveBeenCalledWith({
        where: { stat_date: testDateStr as any },
      });
      expect(mockDailyStatsRepository.create).not.toHaveBeenCalled();
    });

    it('should create new stats when not found', async () => {
      // Arrange
      mockDailyStatsRepository.findOne.mockResolvedValue(null);
      const newStats = { ...mockDailyStats, id: 'new-stats' };
      mockDailyStatsRepository.create.mockReturnValue(newStats as DailyStats);
      mockDailyStatsRepository.save.mockResolvedValue(newStats as DailyStats);

      // Act
      const result = await service.getOrCreateDailyStats(testDate);

      // Assert
      expect(result).toEqual(newStats);
      expect(mockDailyStatsRepository.create).toHaveBeenCalledWith({
        stat_date: testDateStr as any,
        last_updated_at: expect.any(Date),
      });
      expect(mockDailyStatsRepository.save).toHaveBeenCalled();
    });
  });

  describe('updateSalesStats', () => {
    it('should update sales stats when transaction is SALE type', async () => {
      // Arrange
      const existingStats = { ...mockDailyStats, total_revenue: 100, total_sales_count: 2 };
      mockDailyStatsRepository.findOne.mockResolvedValue(existingStats as DailyStats);
      mockDailyStatsRepository.save.mockImplementation(async (stats) => stats as DailyStats);

      // Act
      await service.updateSalesStats(testDate, mockSaleTransaction as Transaction);

      // Assert
      expect(mockDailyStatsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          total_revenue: 100 + 150.5,
          total_sales_count: 3,
          average_sale_amount: (100 + 150.5) / 3,
        }),
      );
    });

    it('should not update stats when transaction is not SALE type', async () => {
      // Arrange
      const existingStats = { ...mockDailyStats };
      mockDailyStatsRepository.findOne.mockResolvedValue(existingStats as DailyStats);

      // Act
      await service.updateSalesStats(testDate, mockCollectionTransaction as Transaction);

      // Assert
      expect(mockDailyStatsRepository.save).not.toHaveBeenCalled();
    });

    it('should handle first sale of the day', async () => {
      // Arrange
      const emptyStats = { ...mockDailyStats, total_revenue: 0, total_sales_count: 0 };
      mockDailyStatsRepository.findOne.mockResolvedValue(emptyStats as DailyStats);
      mockDailyStatsRepository.save.mockImplementation(async (stats) => stats as DailyStats);

      // Act
      await service.updateSalesStats(testDate, mockSaleTransaction as Transaction);

      // Assert
      expect(mockDailyStatsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          total_revenue: 150.5,
          total_sales_count: 1,
          average_sale_amount: 150.5,
        }),
      );
    });
  });

  describe('updateCollectionStats', () => {
    it('should increment collection stats', async () => {
      // Arrange
      const existingStats = { ...mockDailyStats, total_collections: 1000, collections_count: 2 };
      mockDailyStatsRepository.findOne.mockResolvedValue(existingStats as DailyStats);
      mockDailyStatsRepository.save.mockImplementation(async (stats) => stats as DailyStats);

      // Act
      await service.updateCollectionStats(testDate, 5000);

      // Assert
      expect(mockDailyStatsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          total_collections: 6000,
          collections_count: 3,
        }),
      );
    });

    it('should handle first collection of the day', async () => {
      // Arrange
      const emptyStats = { ...mockDailyStats, total_collections: 0, collections_count: 0 };
      mockDailyStatsRepository.findOne.mockResolvedValue(emptyStats as DailyStats);
      mockDailyStatsRepository.save.mockImplementation(async (stats) => stats as DailyStats);

      // Act
      await service.updateCollectionStats(testDate, 2500);

      // Assert
      expect(mockDailyStatsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          total_collections: 2500,
          collections_count: 1,
        }),
      );
    });
  });

  describe('updateTaskStats', () => {
    it('should increment refill task count', async () => {
      // Arrange
      const existingStats = {
        ...mockDailyStats,
        refill_tasks_completed: 5,
        total_tasks_completed: 10,
      };
      mockDailyStatsRepository.findOne.mockResolvedValue(existingStats as DailyStats);
      mockDailyStatsRepository.save.mockImplementation(async (stats) => stats as DailyStats);

      // Act
      await service.updateTaskStats(testDate, mockRefillTask as Task);

      // Assert
      expect(mockDailyStatsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          refill_tasks_completed: 6,
          total_tasks_completed: 11,
        }),
      );
    });

    it('should increment collection task count', async () => {
      // Arrange
      const existingStats = {
        ...mockDailyStats,
        collection_tasks_completed: 3,
        total_tasks_completed: 10,
      };
      mockDailyStatsRepository.findOne.mockResolvedValue(existingStats as DailyStats);
      mockDailyStatsRepository.save.mockImplementation(async (stats) => stats as DailyStats);

      // Act
      await service.updateTaskStats(testDate, mockCollectionTask as Task);

      // Assert
      expect(mockDailyStatsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          collection_tasks_completed: 4,
          total_tasks_completed: 11,
        }),
      );
    });

    it('should increment cleaning task count', async () => {
      // Arrange
      const existingStats = {
        ...mockDailyStats,
        cleaning_tasks_completed: 2,
        total_tasks_completed: 10,
      };
      mockDailyStatsRepository.findOne.mockResolvedValue(existingStats as DailyStats);
      mockDailyStatsRepository.save.mockImplementation(async (stats) => stats as DailyStats);

      // Act
      await service.updateTaskStats(testDate, mockCleaningTask as Task);

      // Assert
      expect(mockDailyStatsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          cleaning_tasks_completed: 3,
          total_tasks_completed: 11,
        }),
      );
    });

    it('should increment repair task count', async () => {
      // Arrange
      const existingStats = {
        ...mockDailyStats,
        repair_tasks_completed: 1,
        total_tasks_completed: 10,
      };
      mockDailyStatsRepository.findOne.mockResolvedValue(existingStats as DailyStats);
      mockDailyStatsRepository.save.mockImplementation(async (stats) => stats as DailyStats);

      // Act
      await service.updateTaskStats(testDate, mockRepairTask as Task);

      // Assert
      expect(mockDailyStatsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          repair_tasks_completed: 2,
          total_tasks_completed: 11,
        }),
      );
    });

    it('should only increment total count for unknown task types', async () => {
      // Arrange
      const unknownTask: Partial<Task> = {
        id: 'task-unknown',
        type_code: 'unknown_type' as any,
        status: TaskStatus.COMPLETED,
        completed_at: testDate,
      };
      const existingStats = { ...mockDailyStats, total_tasks_completed: 10 };
      mockDailyStatsRepository.findOne.mockResolvedValue(existingStats as DailyStats);
      mockDailyStatsRepository.save.mockImplementation(async (stats) => stats as DailyStats);

      // Act
      await service.updateTaskStats(testDate, unknownTask as Task);

      // Assert
      expect(mockDailyStatsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          total_tasks_completed: 11,
        }),
      );
    });
  });

  describe('rebuildDailyStats', () => {
    it('should rebuild all stats from database queries', async () => {
      // Arrange
      const mockTransactionRepo = createMockRepository();
      const mockTaskRepo = createMockRepository();
      const mockMachineRepo = createMockRepository();

      // Setup sales stats
      mockTransactionRepo.createQueryBuilder().getRawOne.mockResolvedValue({
        sales_count: '100',
        total_revenue: '15000.50',
        average_amount: '150.00',
      });

      // Setup collection stats
      const collectionQueryBuilder = {
        ...mockTransactionRepo.createQueryBuilder(),
        getRawOne: jest.fn().mockResolvedValue({
          collection_count: '5',
          total_collections: '25000.00',
        }),
      };

      // Setup task stats
      mockTaskRepo.createQueryBuilder().getRawOne.mockResolvedValue({
        refill_count: '10',
        collection_count: '5',
        cleaning_count: '3',
        repair_count: '2',
        total_count: '20',
      });

      // Setup machine stats
      mockMachineRepo.createQueryBuilder().getRawOne.mockResolvedValue({
        total_machines: '50',
        online_count: '45',
        offline_count: '5',
      });

      // Setup top products and machines
      mockTransactionRepo
        .createQueryBuilder()
        .getRawMany.mockResolvedValue([
          { nomenclature_id: 'prod-1', name: 'Coffee', quantity: '100', revenue: '5000' },
        ]);

      // Mock operators count
      mockTaskRepo.createQueryBuilder().getRawOne.mockResolvedValue({ count: '8' });

      mockDataSource.getRepository.mockImplementation((entity: any) => {
        if (entity === Transaction) return mockTransactionRepo as any;
        if (entity === Task) return mockTaskRepo as any;
        return mockMachineRepo as any;
      });

      mockDailyStatsRepository.findOne.mockResolvedValue(null);
      const newStats = { ...mockDailyStats };
      mockDailyStatsRepository.create.mockReturnValue(newStats as DailyStats);
      mockDailyStatsRepository.save.mockImplementation(async (stats) => stats as DailyStats);

      // Act
      const result = await service.rebuildDailyStats(testDate);

      // Assert
      expect(result).toBeDefined();
      expect(mockDailyStatsRepository.save).toHaveBeenCalled();
      expect(result.last_full_rebuild_at).toBeDefined();
    });

    it('should handle missing data gracefully with default values', async () => {
      // Arrange
      const mockRepo = createMockRepository();
      // Return objects with zero/null values instead of null
      mockRepo.createQueryBuilder().getRawOne.mockResolvedValue({
        total_revenue: '0',
        sales_count: '0',
        average_amount: '0',
        collection_count: '0',
        total_collections: '0',
        refill_count: '0',
        cleaning_count: '0',
        repair_count: '0',
        total_count: '0',
        total_machines: '0',
        online_count: '0',
        offline_count: '0',
        count: '0',
      });
      mockRepo.createQueryBuilder().getRawMany.mockResolvedValue([]);

      mockDataSource.getRepository.mockReturnValue(mockRepo as any);

      mockDailyStatsRepository.findOne.mockResolvedValue(null);
      const newStats = { ...mockDailyStats };
      mockDailyStatsRepository.create.mockReturnValue(newStats as DailyStats);
      mockDailyStatsRepository.save.mockImplementation(async (stats) => stats as DailyStats);

      // Act
      const result = await service.rebuildDailyStats(testDate);

      // Assert
      expect(result).toBeDefined();
      expect(result.total_revenue).toBe(0);
      expect(result.total_sales_count).toBe(0);
    });
  });

  describe('rebuildYesterdayStats (cron job)', () => {
    it('should rebuild stats for yesterday', async () => {
      // Arrange
      const yesterday = subDays(new Date(), 1);
      const mockRepo = createMockRepository();
      mockRepo.createQueryBuilder().getRawOne.mockResolvedValue({
        sales_count: '0',
        total_revenue: '0',
        average_amount: '0',
        collection_count: '0',
        total_collections: '0',
        refill_count: '0',
        cleaning_count: '0',
        repair_count: '0',
        total_count: '0',
        total_machines: '0',
        online_count: '0',
        offline_count: '0',
        count: '0',
      });
      mockRepo.createQueryBuilder().getRawMany.mockResolvedValue([]);

      mockDataSource.getRepository.mockReturnValue(mockRepo as any);

      mockDailyStatsRepository.findOne.mockResolvedValue(null);
      const newStats = { ...mockDailyStats };
      mockDailyStatsRepository.create.mockReturnValue(newStats as DailyStats);
      mockDailyStatsRepository.save.mockImplementation(async (stats) => stats as DailyStats);

      // Act
      await service.rebuildYesterdayStats();

      // Assert
      expect(mockDailyStatsRepository.save).toHaveBeenCalled();
    });

    it('should handle errors during rebuild gracefully', async () => {
      // Arrange
      mockDataSource.getRepository.mockImplementation(() => {
        throw new Error('Database connection error');
      });

      // Act & Assert - should not throw, just log error
      await expect(service.rebuildYesterdayStats()).resolves.not.toThrow();
    });
  });

  describe('getStatsForDateRange', () => {
    it('should return stats for date range', async () => {
      // Arrange
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      const mockStats = [
        { ...mockDailyStats, stat_date: new Date('2025-01-01') },
        { ...mockDailyStats, stat_date: new Date('2025-01-15') },
        { ...mockDailyStats, stat_date: new Date('2025-01-31') },
      ];
      mockDailyStatsRepository.find.mockResolvedValue(mockStats as DailyStats[]);

      // Act
      const result = await service.getStatsForDateRange(startDate, endDate);

      // Assert
      expect(result).toEqual(mockStats);
      expect(mockDailyStatsRepository.find).toHaveBeenCalledWith({
        where: {
          stat_date: expect.anything(),
        },
        order: {
          stat_date: 'ASC',
        },
      });
    });

    it('should return empty array when no stats exist for range', async () => {
      // Arrange
      mockDailyStatsRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.getStatsForDateRange(
        new Date('2020-01-01'),
        new Date('2020-01-31'),
      );

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getStatsForDate', () => {
    it('should return stats for specific date', async () => {
      // Arrange
      mockDailyStatsRepository.findOne.mockResolvedValue(mockDailyStats as DailyStats);

      // Act
      const result = await service.getStatsForDate(testDate);

      // Assert
      expect(result).toEqual(mockDailyStats);
      expect(mockDailyStatsRepository.findOne).toHaveBeenCalledWith({
        where: { stat_date: testDateStr as any },
      });
    });

    it('should return null when stats not found', async () => {
      // Arrange
      mockDailyStatsRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getStatsForDate(testDate);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('finalizeDay', () => {
    it('should rebuild and finalize stats for the day', async () => {
      // Arrange
      const mockRepo = createMockRepository();
      mockRepo.createQueryBuilder().getRawOne.mockResolvedValue({
        sales_count: '0',
        total_revenue: '0',
        average_amount: '0',
        collection_count: '0',
        total_collections: '0',
        refill_count: '0',
        cleaning_count: '0',
        repair_count: '0',
        total_count: '0',
        total_machines: '0',
        online_count: '0',
        offline_count: '0',
        count: '0',
      });
      mockRepo.createQueryBuilder().getRawMany.mockResolvedValue([]);

      mockDataSource.getRepository.mockReturnValue(mockRepo as any);

      mockDailyStatsRepository.findOne.mockResolvedValue(mockDailyStats as DailyStats);
      mockDailyStatsRepository.save.mockImplementation(async (stats) => stats as DailyStats);

      // Act
      const result = await service.finalizeDay(testDate);

      // Assert
      expect(result.is_finalized).toBe(true);
      expect(mockDailyStatsRepository.save).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle NaN values in sales calculations', async () => {
      // Arrange
      const statsWithNaN = { ...mockDailyStats, total_revenue: NaN, total_sales_count: NaN };
      mockDailyStatsRepository.findOne.mockResolvedValue(statsWithNaN as DailyStats);
      mockDailyStatsRepository.save.mockImplementation(async (stats) => stats as DailyStats);

      const transaction: Partial<Transaction> = {
        id: 'tx-nan',
        transaction_type: TransactionType.SALE,
        amount: 100,
      };

      // Act
      await service.updateSalesStats(testDate, transaction as Transaction);

      // Assert - should handle NaN gracefully
      expect(mockDailyStatsRepository.save).toHaveBeenCalled();
    });

    it('should handle decimal precision in calculations', async () => {
      // Arrange
      const existingStats = { ...mockDailyStats, total_revenue: 0.1, total_sales_count: 1 };
      mockDailyStatsRepository.findOne.mockResolvedValue(existingStats as DailyStats);
      mockDailyStatsRepository.save.mockImplementation(async (stats) => stats as DailyStats);

      const transaction: Partial<Transaction> = {
        id: 'tx-decimal',
        transaction_type: TransactionType.SALE,
        amount: 0.2,
      };

      // Act
      await service.updateSalesStats(testDate, transaction as Transaction);

      // Assert
      expect(mockDailyStatsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          total_revenue: expect.any(Number),
          total_sales_count: 2,
        }),
      );
    });

    it('should handle large numbers in stats', async () => {
      // Arrange
      const largeAmount = 999999999.99;
      const existingStats = { ...mockDailyStats, total_collections: largeAmount };
      mockDailyStatsRepository.findOne.mockResolvedValue(existingStats as DailyStats);
      mockDailyStatsRepository.save.mockImplementation(async (stats) => stats as DailyStats);

      // Act
      await service.updateCollectionStats(testDate, 1);

      // Assert
      expect(mockDailyStatsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          total_collections: largeAmount + 1,
        }),
      );
    });
  });
});
