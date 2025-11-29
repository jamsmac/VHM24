import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnalyticsCalculationService } from './analytics-calculation.service';
import { AnalyticsSnapshot } from '../entities/analytics-snapshot.entity';
import { MetricType, GroupByType } from '../dto/analytics-query.dto';

describe('AnalyticsCalculationService', () => {
  let service: AnalyticsCalculationService;
  let mockRepository: any;
  let queryBuilder: any;

  beforeEach(async () => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    mockRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsCalculationService,
        {
          provide: getRepositoryToken(AnalyticsSnapshot),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<AnalyticsCalculationService>(AnalyticsCalculationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateMetrics', () => {
    it('should calculate metrics with default date range', async () => {
      queryBuilder.getMany.mockResolvedValue([]);

      const result = await service.calculateMetrics({});

      expect(result).toBeDefined();
      expect(result.labels).toBeDefined();
      expect(result.datasets).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should calculate metrics with custom date range', async () => {
      const mockSnapshots = [
        {
          id: 'snap-1',
          snapshot_date: '2025-01-01',
          machine_id: 'machine-1',
          total_revenue: 1000,
          total_transactions: 50,
          total_units_sold: 100,
          average_transaction_value: 20,
          uptime_minutes: 1440,
          downtime_minutes: 0,
          availability_percentage: 100,
          profit_margin: 30,
        },
        {
          id: 'snap-2',
          snapshot_date: '2025-01-02',
          machine_id: 'machine-1',
          total_revenue: 1200,
          total_transactions: 60,
          total_units_sold: 120,
          average_transaction_value: 20,
          uptime_minutes: 1400,
          downtime_minutes: 40,
          availability_percentage: 97,
          profit_margin: 32,
        },
      ];

      queryBuilder.getMany.mockResolvedValue(mockSnapshots);

      const result = await service.calculateMetrics({
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        metrics: [MetricType.REVENUE, MetricType.TRANSACTIONS],
      });

      expect(result.labels).toHaveLength(2);
      expect(result.datasets).toHaveLength(2);
      expect(result.datasets[0].label).toBe('Выручка');
      expect(result.datasets[1].label).toBe('Транзакции');
    });

    it('should filter by machine_ids', async () => {
      queryBuilder.getMany.mockResolvedValue([]);

      await service.calculateMetrics({
        machine_ids: ['machine-1', 'machine-2'],
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'snapshot.machine_id IN (:...machineIds)',
        { machineIds: ['machine-1', 'machine-2'] },
      );
    });

    it('should filter by location_ids', async () => {
      queryBuilder.getMany.mockResolvedValue([]);

      await service.calculateMetrics({
        location_ids: ['location-1'],
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'snapshot.location_id IN (:...locationIds)',
        { locationIds: ['location-1'] },
      );
    });

    it('should filter by product_ids', async () => {
      queryBuilder.getMany.mockResolvedValue([]);

      await service.calculateMetrics({
        product_ids: ['product-1', 'product-2'],
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'snapshot.product_id IN (:...productIds)',
        { productIds: ['product-1', 'product-2'] },
      );
    });

    it('should group by day by default', async () => {
      const mockSnapshots = [
        {
          snapshot_date: '2025-01-01',
          total_revenue: 1000,
          total_transactions: 50,
        },
        {
          snapshot_date: '2025-01-01',
          total_revenue: 500,
          total_transactions: 25,
        },
        {
          snapshot_date: '2025-01-02',
          total_revenue: 800,
          total_transactions: 40,
        },
      ];

      queryBuilder.getMany.mockResolvedValue(mockSnapshots);

      const result = await service.calculateMetrics({
        metrics: [MetricType.REVENUE],
      });

      expect(result.labels).toHaveLength(2); // 2 unique days
      expect(result.datasets[0].data[0]).toBe(1500); // Sum of day 1
      expect(result.datasets[0].data[1]).toBe(800); // Day 2
    });

    it('should group by hour', async () => {
      const mockSnapshots = [
        { snapshot_date: '2025-01-01T10:00:00', total_revenue: 100 },
        { snapshot_date: '2025-01-01T10:30:00', total_revenue: 150 },
        { snapshot_date: '2025-01-01T11:00:00', total_revenue: 200 },
      ];

      queryBuilder.getMany.mockResolvedValue(mockSnapshots);

      const result = await service.calculateMetrics({
        metrics: [MetricType.REVENUE],
        group_by: GroupByType.HOUR,
      });

      expect(result.labels).toHaveLength(2); // 10:00 and 11:00 hours
    });

    it('should group by week', async () => {
      const mockSnapshots = [
        { snapshot_date: '2025-01-06', total_revenue: 1000 }, // Monday week 2
        { snapshot_date: '2025-01-07', total_revenue: 1000 }, // Tuesday week 2
        { snapshot_date: '2025-01-13', total_revenue: 800 }, // Monday week 3
      ];

      queryBuilder.getMany.mockResolvedValue(mockSnapshots);

      const result = await service.calculateMetrics({
        metrics: [MetricType.REVENUE],
        group_by: GroupByType.WEEK,
      });

      expect(result.labels).toHaveLength(2); // 2 weeks
    });

    it('should group by month', async () => {
      const mockSnapshots = [
        { snapshot_date: '2025-01-15', total_revenue: 1000 },
        { snapshot_date: '2025-01-20', total_revenue: 1000 },
        { snapshot_date: '2025-02-10', total_revenue: 800 },
      ];

      queryBuilder.getMany.mockResolvedValue(mockSnapshots);

      const result = await service.calculateMetrics({
        metrics: [MetricType.REVENUE],
        group_by: GroupByType.MONTH,
      });

      expect(result.labels).toHaveLength(2); // January and February
      expect(result.labels[0]).toBe('2025-01');
      expect(result.labels[1]).toBe('2025-02');
    });

    it('should group by machine', async () => {
      const mockSnapshots = [
        { snapshot_date: '2025-01-01', machine_id: 'machine-1', total_revenue: 1000 },
        { snapshot_date: '2025-01-01', machine_id: 'machine-1', total_revenue: 500 },
        { snapshot_date: '2025-01-01', machine_id: 'machine-2', total_revenue: 800 },
      ];

      queryBuilder.getMany.mockResolvedValue(mockSnapshots);

      const result = await service.calculateMetrics({
        metrics: [MetricType.REVENUE],
        group_by: GroupByType.MACHINE,
      });

      expect(result.labels).toHaveLength(2); // 2 machines
      expect(result.labels).toContain('machine-1');
      expect(result.labels).toContain('machine-2');
    });

    it('should group by location', async () => {
      const mockSnapshots = [
        { snapshot_date: '2025-01-01', location_id: 'loc-1', total_revenue: 1000 },
        { snapshot_date: '2025-01-01', location_id: 'loc-2', total_revenue: 800 },
      ];

      queryBuilder.getMany.mockResolvedValue(mockSnapshots);

      const result = await service.calculateMetrics({
        metrics: [MetricType.REVENUE],
        group_by: GroupByType.LOCATION,
      });

      expect(result.labels).toContain('loc-1');
      expect(result.labels).toContain('loc-2');
    });

    it('should group by product', async () => {
      const mockSnapshots = [
        { snapshot_date: '2025-01-01', product_id: 'prod-1', total_revenue: 500 },
        { snapshot_date: '2025-01-01', product_id: 'prod-2', total_revenue: 700 },
      ];

      queryBuilder.getMany.mockResolvedValue(mockSnapshots);

      const result = await service.calculateMetrics({
        metrics: [MetricType.REVENUE],
        group_by: GroupByType.PRODUCT,
      });

      expect(result.labels).toContain('prod-1');
      expect(result.labels).toContain('prod-2');
    });

    it('should handle null machine_id in grouping', async () => {
      const mockSnapshots = [{ snapshot_date: '2025-01-01', machine_id: null, total_revenue: 500 }];

      queryBuilder.getMany.mockResolvedValue(mockSnapshots);

      const result = await service.calculateMetrics({
        metrics: [MetricType.REVENUE],
        group_by: GroupByType.MACHINE,
      });

      expect(result.labels).toContain('unknown');
    });

    it('should calculate all metric types correctly', async () => {
      const mockSnapshot = {
        snapshot_date: '2025-01-01',
        total_revenue: 1000,
        total_transactions: 50,
        total_units_sold: 100,
        average_transaction_value: 20,
        uptime_minutes: 1400,
        downtime_minutes: 40,
        availability_percentage: 97,
        profit_margin: 30,
      };

      queryBuilder.getMany.mockResolvedValue([mockSnapshot]);

      const result = await service.calculateMetrics({
        metrics: [
          MetricType.REVENUE,
          MetricType.TRANSACTIONS,
          MetricType.UNITS_SOLD,
          MetricType.AVERAGE_TRANSACTION,
          MetricType.UPTIME,
          MetricType.DOWNTIME,
          MetricType.AVAILABILITY,
          MetricType.PROFIT_MARGIN,
        ],
      });

      expect(result.datasets).toHaveLength(8);
      expect(result.datasets[0].data[0]).toBe(1000); // revenue
      expect(result.datasets[1].data[0]).toBe(50); // transactions
      expect(result.datasets[2].data[0]).toBe(100); // units sold
      expect(result.datasets[3].data[0]).toBe(20); // average transaction
      expect(result.datasets[4].data[0]).toBe(1400); // uptime
      expect(result.datasets[5].data[0]).toBe(40); // downtime
      expect(result.datasets[6].data[0]).toBe(97); // availability
      expect(result.datasets[7].data[0]).toBe(30); // profit margin
    });

    it('should calculate summary correctly', async () => {
      const mockSnapshots = [
        { snapshot_date: '2025-01-01', total_revenue: 1000, total_transactions: 50 },
        { snapshot_date: '2025-01-02', total_revenue: 800, total_transactions: 40 },
      ];

      queryBuilder.getMany.mockResolvedValue(mockSnapshots);

      const result = await service.calculateMetrics({
        metrics: [MetricType.REVENUE, MetricType.TRANSACTIONS],
      });

      expect(result.summary[MetricType.REVENUE]).toBe(900); // average: (1000+800)/2
      expect(result.summary[`total_${MetricType.REVENUE}`]).toBe(1800); // total
      expect(result.summary[MetricType.TRANSACTIONS]).toBe(45); // average: (50+40)/2
      expect(result.summary[`total_${MetricType.TRANSACTIONS}`]).toBe(90); // total
    });

    it('should return dataset with correct colors', async () => {
      const mockSnapshots = [{ snapshot_date: '2025-01-01', total_revenue: 1000 }];
      queryBuilder.getMany.mockResolvedValue(mockSnapshots);

      const result = await service.calculateMetrics({
        metrics: [MetricType.REVENUE],
      });

      expect(result.datasets[0].backgroundColor).toContain('rgba');
      expect(result.datasets[0].borderColor).toContain('rgba');
    });

    it('should return empty result when no snapshots', async () => {
      queryBuilder.getMany.mockResolvedValue([]);

      const result = await service.calculateMetrics({
        metrics: [MetricType.REVENUE],
      });

      expect(result.labels).toHaveLength(0);
      expect(result.datasets[0].data).toHaveLength(0);
      expect(result.summary[MetricType.REVENUE]).toBe(0);
    });
  });

  describe('getTopMachines', () => {
    it('should return top machines by revenue', async () => {
      const mockResults = [
        {
          machine_id: 'machine-1',
          total_revenue: '5000',
          total_transactions: '100',
          avg_availability: '98',
        },
        {
          machine_id: 'machine-2',
          total_revenue: '4000',
          total_transactions: '80',
          avg_availability: '95',
        },
      ];

      queryBuilder.getRawMany.mockResolvedValue(mockResults);

      const result = await service.getTopMachines(10, 30);

      expect(result).toHaveLength(2);
      expect(result[0].machine_id).toBe('machine-1');
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('total_revenue', 'DESC');
      expect(queryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it('should use default parameters', async () => {
      queryBuilder.getRawMany.mockResolvedValue([]);

      await service.getTopMachines();

      expect(queryBuilder.limit).toHaveBeenCalledWith(10);
    });

    it('should use custom limit', async () => {
      queryBuilder.getRawMany.mockResolvedValue([]);

      await service.getTopMachines(5, 7);

      expect(queryBuilder.limit).toHaveBeenCalledWith(5);
    });
  });

  describe('getTopProducts', () => {
    it('should return top products by units sold', async () => {
      const mockResults = [
        { product_id: 'prod-1', total_units: '500', total_revenue: '2500' },
        { product_id: 'prod-2', total_units: '400', total_revenue: '2000' },
      ];

      queryBuilder.getRawMany.mockResolvedValue(mockResults);

      const result = await service.getTopProducts(10, 30);

      expect(result).toHaveLength(2);
      expect(result[0].product_id).toBe('prod-1');
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('total_units', 'DESC');
    });

    it('should use default parameters', async () => {
      queryBuilder.getRawMany.mockResolvedValue([]);

      await service.getTopProducts();

      expect(queryBuilder.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('getMachineStatusSummary', () => {
    it('should return machine status structure', async () => {
      const result = await service.getMachineStatusSummary();

      expect(result).toHaveProperty('online');
      expect(result).toHaveProperty('offline');
      expect(result).toHaveProperty('maintenance');
      expect(result).toHaveProperty('error');
    });
  });
});
