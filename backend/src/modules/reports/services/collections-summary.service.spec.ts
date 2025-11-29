import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CollectionsSummaryService } from './collections-summary.service';
import { Task, TaskStatus } from '@modules/tasks/entities/task.entity';
import { Transaction } from '@modules/transactions/entities/transaction.entity';

describe('CollectionsSummaryService', () => {
  let service: CollectionsSummaryService;
  let mockTaskRepository: any;
  let mockTransactionRepository: any;

  // Shared query builder mocks
  let taskQb: any;
  let transactionQb: any;

  const startDate = new Date('2025-01-01');
  const endDate = new Date('2025-01-31');

  beforeEach(async () => {
    taskQb = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({}),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    transactionQb = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({}),
    };

    mockTaskRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(taskQb),
    };

    mockTransactionRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(transactionQb),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionsSummaryService,
        { provide: getRepositoryToken(Task), useValue: mockTaskRepository },
        { provide: getRepositoryToken(Transaction), useValue: mockTransactionRepository },
      ],
    }).compile();

    service = module.get<CollectionsSummaryService>(CollectionsSummaryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateReport', () => {
    it('should generate a complete collections summary report', async () => {
      // Mock summary data
      taskQb.getRawOne.mockResolvedValueOnce({
        total_collections: '10',
        total_collected: '5000.00',
      });
      transactionQb.getRawOne.mockResolvedValueOnce({
        expected_amount: '4800.00',
      });

      // Mock by_machine data
      taskQb.getRawMany.mockResolvedValueOnce([]);

      // Mock by_collector data
      taskQb.getRawMany.mockResolvedValueOnce([]);

      // Mock discrepancies data
      taskQb.getRawMany.mockResolvedValueOnce([]);

      // Mock daily trend data
      taskQb.getRawMany.mockResolvedValueOnce([]);

      const result = await service.generateReport(startDate, endDate);

      expect(result).toBeDefined();
      expect(result.period.start_date).toEqual(startDate);
      expect(result.period.end_date).toEqual(endDate);
      expect(result.summary).toBeDefined();
      expect(result.by_machine).toBeDefined();
      expect(result.by_collector).toBeDefined();
      expect(result.discrepancies).toBeDefined();
      expect(result.daily_trend).toBeDefined();
      expect(result.generated_at).toBeInstanceOf(Date);
    });

    it('should calculate summary with correct values', async () => {
      taskQb.getRawOne.mockResolvedValueOnce({
        total_collections: '20',
        total_collected: '10000.00',
      });
      transactionQb.getRawOne.mockResolvedValueOnce({
        expected_amount: '9500.00',
      });

      taskQb.getRawMany
        .mockResolvedValueOnce([]) // by_machine
        .mockResolvedValueOnce([]) // by_collector
        .mockResolvedValueOnce([]) // discrepancies
        .mockResolvedValueOnce([]); // daily_trend

      const result = await service.generateReport(startDate, endDate);

      expect(result.summary.total_collections).toBe(20);
      expect(result.summary.total_collected_amount).toBe(10000);
      expect(result.summary.expected_amount).toBe(9500);
      expect(result.summary.variance).toBe(500); // 10000 - 9500
      expect(result.summary.variance_percentage).toBeCloseTo(5.26, 1); // (500/9500)*100
      expect(result.summary.average_collection_amount).toBe(500); // 10000/20
    });

    it('should handle zero collections gracefully', async () => {
      taskQb.getRawOne.mockResolvedValueOnce({
        total_collections: '0',
        total_collected: null,
      });
      transactionQb.getRawOne.mockResolvedValueOnce({
        expected_amount: null,
      });

      taskQb.getRawMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.summary.total_collections).toBe(0);
      expect(result.summary.total_collected_amount).toBe(0);
      expect(result.summary.expected_amount).toBe(0);
      expect(result.summary.variance).toBe(0);
      expect(result.summary.variance_percentage).toBe(0);
      expect(result.summary.average_collection_amount).toBe(0);
    });

    it('should return by_machine data correctly', async () => {
      taskQb.getRawOne.mockResolvedValueOnce({
        total_collections: '5',
        total_collected: '2500.00',
      });
      transactionQb.getRawOne.mockResolvedValueOnce({
        expected_amount: '2500.00',
      });

      const machineData = [
        {
          machine_number: 'M-001',
          machine_name: 'Machine 1',
          location_name: 'Location A',
          collections_count: '3',
          collected_amount: '1500.00',
        },
        {
          machine_number: 'M-002',
          machine_name: 'Machine 2',
          location_name: 'Location B',
          collections_count: '2',
          collected_amount: '1000.00',
        },
      ];

      taskQb.getRawMany.mockResolvedValueOnce(machineData);
      taskQb.getRawOne.mockResolvedValueOnce({ machine_id: 'machine-1' });
      transactionQb.getRawOne.mockResolvedValueOnce({ expected_amount: '1400.00' });
      taskQb.getRawOne.mockResolvedValueOnce({ machine_id: 'machine-2' });
      transactionQb.getRawOne.mockResolvedValueOnce({ expected_amount: '1000.00' });

      taskQb.getRawMany
        .mockResolvedValueOnce([]) // by_collector
        .mockResolvedValueOnce([]) // discrepancies
        .mockResolvedValueOnce([]); // daily_trend

      const result = await service.generateReport(startDate, endDate);

      expect(result.by_machine).toHaveLength(2);
      expect(result.by_machine[0].machine_number).toBe('M-001');
      expect(result.by_machine[0].collected_amount).toBe(1500);
      expect(result.by_machine[0].variance).toBe(100); // 1500 - 1400
    });

    it('should return by_collector data correctly', async () => {
      taskQb.getRawOne.mockResolvedValueOnce({
        total_collections: '10',
        total_collected: '5000.00',
      });
      transactionQb.getRawOne.mockResolvedValueOnce({
        expected_amount: '5000.00',
      });

      taskQb.getRawMany.mockResolvedValueOnce([]); // by_machine

      const collectorData = [
        {
          collector_name: 'John Doe',
          collections_count: '6',
          total_amount: '3000.00',
        },
        {
          collector_name: 'Jane Smith',
          collections_count: '4',
          total_amount: '2000.00',
        },
      ];

      taskQb.getRawMany.mockResolvedValueOnce(collectorData);
      taskQb.getRawMany
        .mockResolvedValueOnce([]) // discrepancies
        .mockResolvedValueOnce([]); // daily_trend

      const result = await service.generateReport(startDate, endDate);

      expect(result.by_collector).toHaveLength(2);
      expect(result.by_collector[0].collector_name).toBe('John Doe');
      expect(result.by_collector[0].collections_count).toBe(6);
      expect(result.by_collector[0].total_amount).toBe(3000);
      expect(result.by_collector[0].average_amount).toBe(500); // 3000/6
    });

    it('should filter discrepancies with variance >10%', async () => {
      taskQb.getRawOne.mockResolvedValueOnce({
        total_collections: '5',
        total_collected: '2500.00',
      });
      transactionQb.getRawOne.mockResolvedValueOnce({
        expected_amount: '2500.00',
      });

      taskQb.getRawMany.mockResolvedValueOnce([]); // by_machine
      taskQb.getRawMany.mockResolvedValueOnce([]); // by_collector

      const discrepancyData = [
        {
          task_id: 'task-1',
          machine_number: 'M-001',
          collection_date: new Date('2025-01-15'),
          collected_amount: '500.00',
          expected_amount: '400.00', // 25% variance
          status: TaskStatus.COMPLETED,
        },
        {
          task_id: 'task-2',
          machine_number: 'M-002',
          collection_date: new Date('2025-01-16'),
          collected_amount: '500.00',
          expected_amount: '490.00', // ~2% variance - should be filtered out
          status: TaskStatus.COMPLETED,
        },
        {
          task_id: 'task-3',
          machine_number: 'M-003',
          collection_date: new Date('2025-01-17'),
          collected_amount: '300.00',
          expected_amount: '450.00', // ~33% variance (negative)
          status: TaskStatus.COMPLETED,
        },
      ];

      taskQb.getRawMany.mockResolvedValueOnce(discrepancyData);
      taskQb.getRawMany.mockResolvedValueOnce([]); // daily_trend

      const result = await service.generateReport(startDate, endDate);

      expect(result.discrepancies).toHaveLength(2); // Only >10% variance
      expect(result.discrepancies[0].variance_percentage).toBeGreaterThan(10);
      expect(result.discrepancies[1].variance_percentage).toBeGreaterThan(10);
    });

    it('should return daily trend data correctly', async () => {
      taskQb.getRawOne.mockResolvedValueOnce({
        total_collections: '10',
        total_collected: '5000.00',
      });
      transactionQb.getRawOne.mockResolvedValueOnce({
        expected_amount: '5000.00',
      });

      taskQb.getRawMany.mockResolvedValueOnce([]); // by_machine
      taskQb.getRawMany.mockResolvedValueOnce([]); // by_collector
      taskQb.getRawMany.mockResolvedValueOnce([]); // discrepancies

      const trendData = [
        { date: '2025-01-01', collections_count: '3', total_amount: '1500.00' },
        { date: '2025-01-02', collections_count: '4', total_amount: '2000.00' },
        { date: '2025-01-03', collections_count: '3', total_amount: '1500.00' },
      ];

      taskQb.getRawMany.mockResolvedValueOnce(trendData);

      const result = await service.generateReport(startDate, endDate);

      expect(result.daily_trend).toHaveLength(3);
      expect(result.daily_trend[0].date).toBe('2025-01-01');
      expect(result.daily_trend[0].collections_count).toBe(3);
      expect(result.daily_trend[0].total_amount).toBe(1500);
    });

    it('should handle missing collector name', async () => {
      taskQb.getRawOne.mockResolvedValueOnce({
        total_collections: '5',
        total_collected: '2500.00',
      });
      transactionQb.getRawOne.mockResolvedValueOnce({
        expected_amount: '2500.00',
      });

      taskQb.getRawMany.mockResolvedValueOnce([]); // by_machine

      const collectorData = [
        {
          collector_name: null,
          collections_count: '5',
          total_amount: '2500.00',
        },
      ];

      taskQb.getRawMany.mockResolvedValueOnce(collectorData);
      taskQb.getRawMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.by_collector[0].collector_name).toBe('Unknown');
    });

    it('should handle missing machine data', async () => {
      taskQb.getRawOne.mockResolvedValueOnce({
        total_collections: '2',
        total_collected: '1000.00',
      });
      transactionQb.getRawOne.mockResolvedValueOnce({
        expected_amount: '1000.00',
      });

      const machineData = [
        {
          machine_number: null,
          machine_name: null,
          location_name: null,
          collections_count: '2',
          collected_amount: '1000.00',
        },
      ];

      taskQb.getRawMany.mockResolvedValueOnce(machineData);
      taskQb.getRawOne.mockResolvedValueOnce({ machine_id: null });
      transactionQb.getRawOne.mockResolvedValueOnce({ expected_amount: null });

      taskQb.getRawMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.by_machine[0].machine_number).toBe('Unknown');
      expect(result.by_machine[0].machine_name).toBe('Unknown');
      expect(result.by_machine[0].location_name).toBe('Unknown');
    });

    it('should handle negative variance correctly', async () => {
      taskQb.getRawOne.mockResolvedValueOnce({
        total_collections: '10',
        total_collected: '4000.00',
      });
      transactionQb.getRawOne.mockResolvedValueOnce({
        expected_amount: '5000.00',
      });

      taskQb.getRawMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.summary.variance).toBe(-1000); // 4000 - 5000
      expect(result.summary.variance_percentage).toBe(-20); // (-1000/5000)*100
    });

    it('should calculate correct average when collector has multiple collections', async () => {
      taskQb.getRawOne.mockResolvedValueOnce({
        total_collections: '8',
        total_collected: '4000.00',
      });
      transactionQb.getRawOne.mockResolvedValueOnce({
        expected_amount: '4000.00',
      });

      taskQb.getRawMany.mockResolvedValueOnce([]); // by_machine

      const collectorData = [
        {
          collector_name: 'High Performer',
          collections_count: '8',
          total_amount: '4000.00',
        },
      ];

      taskQb.getRawMany.mockResolvedValueOnce(collectorData);
      taskQb.getRawMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.by_collector[0].average_amount).toBe(500); // 4000/8
    });

    it('should handle zero collector collections', async () => {
      taskQb.getRawOne.mockResolvedValueOnce({
        total_collections: '0',
        total_collected: '0',
      });
      transactionQb.getRawOne.mockResolvedValueOnce({
        expected_amount: '0',
      });

      taskQb.getRawMany.mockResolvedValueOnce([]); // by_machine

      const collectorData = [
        {
          collector_name: 'New Collector',
          collections_count: '0',
          total_amount: '0',
        },
      ];

      taskQb.getRawMany.mockResolvedValueOnce(collectorData);
      taskQb.getRawMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await service.generateReport(startDate, endDate);

      expect(result.by_collector[0].average_amount).toBe(0);
    });

    it('should sort discrepancies by variance percentage descending', async () => {
      taskQb.getRawOne.mockResolvedValueOnce({
        total_collections: '10',
        total_collected: '5000.00',
      });
      transactionQb.getRawOne.mockResolvedValueOnce({
        expected_amount: '5000.00',
      });

      taskQb.getRawMany.mockResolvedValueOnce([]); // by_machine
      taskQb.getRawMany.mockResolvedValueOnce([]); // by_collector

      const discrepancyData = [
        {
          task_id: 'task-1',
          machine_number: 'M-001',
          collection_date: new Date('2025-01-15'),
          collected_amount: '600.00',
          expected_amount: '500.00', // 20% variance
          status: TaskStatus.COMPLETED,
        },
        {
          task_id: 'task-2',
          machine_number: 'M-002',
          collection_date: new Date('2025-01-16'),
          collected_amount: '500.00',
          expected_amount: '250.00', // 100% variance
          status: TaskStatus.COMPLETED,
        },
        {
          task_id: 'task-3',
          machine_number: 'M-003',
          collection_date: new Date('2025-01-17'),
          collected_amount: '550.00',
          expected_amount: '500.00', // 10% variance (borderline)
          status: TaskStatus.COMPLETED,
        },
      ];

      taskQb.getRawMany.mockResolvedValueOnce(discrepancyData);
      taskQb.getRawMany.mockResolvedValueOnce([]); // daily_trend

      const result = await service.generateReport(startDate, endDate);

      // Should be sorted by variance percentage descending
      expect(result.discrepancies[0].variance_percentage).toBe(100);
      expect(result.discrepancies[1].variance_percentage).toBe(20);
    });
  });
});
