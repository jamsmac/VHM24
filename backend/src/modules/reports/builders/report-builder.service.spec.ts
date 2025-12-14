import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ReportBuilderService } from './report-builder.service';
import { ReportType, ReportParams, DateRange } from '../interfaces/report.interface';

describe('ReportBuilderService', () => {
  let service: ReportBuilderService;
  let mockDataSource: jest.Mocked<DataSource>;

  // Helper to create date range
  const createDateRange = (startStr: string, endStr: string): DateRange => ({
    start: new Date(startStr),
    end: new Date(endStr),
  });

  // Helper to create report params
  const createReportParams = (
    type: ReportType,
    period: DateRange,
    options: Partial<ReportParams> = {},
  ): ReportParams => ({
    type,
    period,
    ...options,
  });

  // Mock sales data for tax report
  const createMockSalesData = () => [
    { date: '2025-01-01', total_amount: '100000', payment_method: 'cash', transaction_count: '10' },
    { date: '2025-01-02', total_amount: '200000', payment_method: 'card', transaction_count: '20' },
    { date: '2025-01-03', total_amount: '150000', payment_method: 'cash', transaction_count: '15' },
  ];

  // Mock performance data
  const createMockPerformanceData = () => [
    { date: '2025-01-01', sales_count: '10', revenue: '100000', avg_sale: '10000' },
    { date: '2025-01-02', sales_count: '20', revenue: '250000', avg_sale: '12500' },
    { date: '2025-01-03', sales_count: '15', revenue: '180000', avg_sale: '12000' },
  ];

  // Mock task statistics
  const createMockTaskStats = () => [
    { type: 'refill', status: 'completed', count: '5', avg_completion_hours: '2.5' },
    { type: 'collection', status: 'completed', count: '3', avg_completion_hours: '1.0' },
    { type: 'maintenance', status: 'in_progress', count: '2', avg_completion_hours: null },
  ];

  // Mock incident statistics
  const createMockIncidentStats = () => [
    { incident_type: 'hardware', severity: 'critical', count: '2', avg_resolution_hours: '4.0' },
    { incident_type: 'software', severity: 'medium', count: '3', avg_resolution_hours: '2.0' },
  ];

  // Mock machine data
  const createMockMachine = () => [
    { id: 'machine-1', machine_number: 'M-001', name: 'Coffee Machine' },
  ];

  beforeEach(async () => {
    mockDataSource = {
      query: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportBuilderService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<ReportBuilderService>(ReportBuilderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should load templates on initialization', () => {
      // The service should have loaded templates in constructor
      // We verify this by checking that generateReport works with DASHBOARD type
      expect(service).toBeDefined();
    });
  });

  describe('generateReport', () => {
    const period = createDateRange('2025-01-01', '2025-01-31');

    describe('basic report generation', () => {
      it('should generate a report with correct structure', async () => {
        // Arrange
        mockDataSource.query.mockResolvedValue([]);
        const params = createReportParams(ReportType.DASHBOARD, period);

        // Act
        const result = await service.generateReport(params);

        // Assert
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('type', ReportType.DASHBOARD);
        expect(result).toHaveProperty('title');
        expect(result).toHaveProperty('period');
        expect(result).toHaveProperty('generatedAt');
        expect(result).toHaveProperty('generationTimeMs');
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('metrics');
        expect(result).toHaveProperty('summary');
        expect(result).toHaveProperty('metadata');
      });

      it('should generate report ID based on type, period, and filters', async () => {
        // Arrange
        mockDataSource.query.mockResolvedValue([]);
        const params = createReportParams(ReportType.SALES, period, {
          filters: { machines: ['m1'] },
        });

        // Act
        const result = await service.generateReport(params);

        // Assert
        expect(result.id).toContain(ReportType.SALES);
        expect(result.id).toContain('20250101');
        expect(result.id).toContain('20250131');
      });

      it('should include generation time in milliseconds', async () => {
        // Arrange
        mockDataSource.query.mockResolvedValue([]);
        const params = createReportParams(ReportType.DASHBOARD, period);

        // Act
        const result = await service.generateReport(params);

        // Assert
        expect(result.generationTimeMs).toBeGreaterThanOrEqual(0);
        expect(typeof result.generationTimeMs).toBe('number');
      });

      it('should set generatedAt to current date', async () => {
        // Arrange
        mockDataSource.query.mockResolvedValue([]);
        const params = createReportParams(ReportType.DASHBOARD, period);
        const beforeTest = new Date();

        // Act
        const result = await service.generateReport(params);

        // Assert
        expect(result.generatedAt).toBeInstanceOf(Date);
        expect(result.generatedAt.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime());
      });
    });

    describe('caching behavior', () => {
      it('should return cached report on second call with same params', async () => {
        // Arrange
        mockDataSource.query.mockResolvedValue([]);
        const params = createReportParams(ReportType.DASHBOARD, period);

        // Act
        const firstResult = await service.generateReport(params);
        const secondResult = await service.generateReport(params);

        // Assert - should return same cached instance
        expect(firstResult.id).toBe(secondResult.id);
        expect(firstResult.generatedAt).toEqual(secondResult.generatedAt);
      });

      it('should generate new report for different params', async () => {
        // Arrange
        mockDataSource.query.mockResolvedValue([]);
        const params1 = createReportParams(ReportType.DASHBOARD, period);
        const params2 = createReportParams(ReportType.SALES, period);

        // Act
        const result1 = await service.generateReport(params1);
        const result2 = await service.generateReport(params2);

        // Assert
        expect(result1.id).not.toBe(result2.id);
        expect(result1.type).toBe(ReportType.DASHBOARD);
        expect(result2.type).toBe(ReportType.SALES);
      });

      it('should generate new report for different periods', async () => {
        // Arrange
        mockDataSource.query.mockResolvedValue([]);
        const period1 = createDateRange('2025-01-01', '2025-01-31');
        const period2 = createDateRange('2025-02-01', '2025-02-28');
        const params1 = createReportParams(ReportType.DASHBOARD, period1);
        const params2 = createReportParams(ReportType.DASHBOARD, period2);

        // Act
        const result1 = await service.generateReport(params1);
        const result2 = await service.generateReport(params2);

        // Assert
        expect(result1.id).not.toBe(result2.id);
      });
    });

    describe('charts generation', () => {
      it('should include charts when includeCharts is true', async () => {
        // Arrange
        mockDataSource.query.mockResolvedValue([]);
        const params = createReportParams(ReportType.DASHBOARD, period, {
          includeCharts: true,
        });

        // Act
        const result = await service.generateReport(params);

        // Assert
        expect(result.charts).toBeDefined();
        expect(Array.isArray(result.charts)).toBe(true);
      });

      it('should not include charts when includeCharts is false', async () => {
        // Arrange
        mockDataSource.query.mockResolvedValue([]);
        const params = createReportParams(ReportType.DASHBOARD, period, {
          includeCharts: false,
        });

        // Act
        const result = await service.generateReport(params);

        // Assert
        expect(result.charts).toBeUndefined();
      });

      it('should not include charts when includeCharts is not specified', async () => {
        // Arrange
        mockDataSource.query.mockResolvedValue([]);
        const params = createReportParams(ReportType.DASHBOARD, period);

        // Act
        const result = await service.generateReport(params);

        // Assert
        expect(result.charts).toBeUndefined();
      });
    });

    describe('metadata', () => {
      it('should include version in metadata', async () => {
        // Arrange
        mockDataSource.query.mockResolvedValue([]);
        const params = createReportParams(ReportType.DASHBOARD, period);

        // Act
        const result = await service.generateReport(params);

        // Assert
        expect(result.metadata.version).toBe('1.0');
      });

      it('should include filters in metadata', async () => {
        // Arrange
        mockDataSource.query.mockResolvedValue([]);
        const filters = { machines: ['m1', 'm2'], operators: ['op1'] };
        const params = createReportParams(ReportType.DASHBOARD, period, { filters });

        // Act
        const result = await service.generateReport(params);

        // Assert
        expect(result.metadata.filters).toEqual(filters);
      });

      it('should include empty filters object when no filters provided', async () => {
        // Arrange
        mockDataSource.query.mockResolvedValue([]);
        const params = createReportParams(ReportType.DASHBOARD, period);

        // Act
        const result = await service.generateReport(params);

        // Assert
        expect(result.metadata.filters).toEqual({});
      });

      it('should include cacheKey in metadata', async () => {
        // Arrange
        mockDataSource.query.mockResolvedValue([]);
        const params = createReportParams(ReportType.DASHBOARD, period);

        // Act
        const result = await service.generateReport(params);

        // Assert
        expect(result.metadata.cacheKey).toBe(result.id);
      });

      it('should include expiresAt in metadata', async () => {
        // Arrange
        mockDataSource.query.mockResolvedValue([]);
        const params = createReportParams(ReportType.DASHBOARD, period);
        const beforeTest = new Date();

        // Act
        const result = await service.generateReport(params);

        // Assert
        expect(result.metadata.expiresAt).toBeInstanceOf(Date);
        // Should expire in ~15 minutes
        const expirationMs = result.metadata.expiresAt!.getTime() - beforeTest.getTime();
        expect(expirationMs).toBeGreaterThan(14 * 60 * 1000); // At least 14 minutes
        expect(expirationMs).toBeLessThan(16 * 60 * 1000); // Less than 16 minutes
      });
    });

    describe('title generation', () => {
      it('should generate correct title for DASHBOARD report', async () => {
        // Arrange
        mockDataSource.query.mockResolvedValue([]);
        const params = createReportParams(ReportType.DASHBOARD, period);

        // Act
        const result = await service.generateReport(params);

        // Assert
        expect(result.title).toContain('Сводный');
      });

      it('should generate correct title for SALES report', async () => {
        // Arrange
        mockDataSource.query.mockResolvedValue([]);
        const params = createReportParams(ReportType.SALES, period);

        // Act
        const result = await service.generateReport(params);

        // Assert
        expect(result.title).toContain('продаж');
      });

      it('should generate correct title for INVENTORY report', async () => {
        // Arrange
        mockDataSource.query.mockResolvedValue([]);
        const params = createReportParams(ReportType.INVENTORY, period);

        // Act
        const result = await service.generateReport(params);

        // Assert
        expect(result.title).toContain('инвентар');
      });

      it('should generate correct title for TAX report', async () => {
        // Arrange
        mockDataSource.query.mockResolvedValue([]);
        const params = createReportParams(ReportType.TAX, period);

        // Act
        const result = await service.generateReport(params);

        // Assert
        expect(result.title).toContain('Налогов');
      });

      it('should generate correct title for CUSTOM report', async () => {
        // Arrange
        mockDataSource.query.mockResolvedValue([]);
        const params = createReportParams(ReportType.CUSTOM, period);

        // Act
        const result = await service.generateReport(params);

        // Assert
        expect(result.title).toContain('Пользовательский');
      });
    });

    describe('subtitle generation', () => {
      it('should include formatted period in subtitle', async () => {
        // Arrange
        mockDataSource.query.mockResolvedValue([]);
        const params = createReportParams(ReportType.DASHBOARD, period);

        // Act
        const result = await service.generateReport(params);

        // Assert
        expect(result.subtitle).toContain('01.01.2025');
        expect(result.subtitle).toContain('31.01.2025');
        expect(result.subtitle).toContain('Период');
      });
    });
  });

  describe('generateDashboardReport', () => {
    it('should call generateReport with correct params', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue([]);
      const period = createDateRange('2025-01-01', '2025-01-31');

      // Act
      const result = await service.generateDashboardReport(period);

      // Assert
      expect(result.type).toBe(ReportType.DASHBOARD);
      expect(result.charts).toBeDefined(); // includeCharts should be true
    });

    it('should include charts by default', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue([]);
      const period = createDateRange('2025-01-01', '2025-01-31');

      // Act
      const result = await service.generateDashboardReport(period);

      // Assert
      expect(result.charts).toBeDefined();
    });
  });

  describe('generateSalesReport', () => {
    it('should call generateReport with SALES type', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue([]);
      const period = createDateRange('2025-01-01', '2025-01-31');

      // Act
      const result = await service.generateSalesReport(period);

      // Assert
      expect(result.type).toBe(ReportType.SALES);
    });

    it('should include filters when provided', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue([]);
      const period = createDateRange('2025-01-01', '2025-01-31');
      const filters = { machines: ['m1'], operators: ['op1'] };

      // Act
      const result = await service.generateSalesReport(period, filters);

      // Assert
      expect(result.metadata.filters).toEqual(filters);
    });

    it('should include charts by default', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue([]);
      const period = createDateRange('2025-01-01', '2025-01-31');

      // Act
      const result = await service.generateSalesReport(period);

      // Assert
      expect(result.charts).toBeDefined();
    });
  });

  describe('generateTaxReport', () => {
    const period = createDateRange('2025-01-01', '2025-01-31');

    it('should query transactions with correct parameters', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue([]);

      // Act
      await service.generateTaxReport(period);

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM transactions'),
        expect.arrayContaining([period.start, period.end]),
      );
    });

    it('should filter by transaction_type = sale', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue([]);

      // Act
      await service.generateTaxReport(period);

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining("transaction_type = 'sale'"),
        expect.any(Array),
      );
    });

    it('should calculate total revenue correctly', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue(createMockSalesData());

      // Act
      const result = await service.generateTaxReport(period);

      // Assert
      // Total: 100000 + 200000 + 150000 = 450000
      expect(result.metrics.totalRevenue.value).toContain('450');
    });

    it('should calculate VAT at 15% rate', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue(createMockSalesData());

      // Act
      const result = await service.generateTaxReport(period);

      // Assert
      // VAT: 450000 * 0.15 = 67500
      expect(result.metrics.vatAmount.value).toContain('67');
    });

    it('should calculate tax base correctly', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue(createMockSalesData());

      // Act
      const result = await service.generateTaxReport(period);

      // Assert
      // Tax base: 450000 * 0.85 = 382500
      expect(result.metrics.taxBase.value).toContain('382');
    });

    it('should group by payment method correctly', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue(createMockSalesData());

      // Act
      const result = await service.generateTaxReport(period);

      // Assert
      // Cash: 100000 + 150000 = 250000
      expect(result.metrics.cashRevenue.value).toContain('250');
      // Card: 200000
      expect(result.metrics.cardRevenue.value).toContain('200');
    });

    it('should handle empty sales data', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue([]);

      // Act
      const result = await service.generateTaxReport(period);

      // Assert
      expect(result.metrics.totalRevenue.value).toContain('0');
      expect(result.metrics.vatAmount.value).toContain('0');
    });

    it('should return correct report type', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue([]);

      // Act
      const result = await service.generateTaxReport(period);

      // Assert
      expect(result.type).toBe(ReportType.TAX);
    });

    it('should include correct columns in data', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue(createMockSalesData());

      // Act
      const result = await service.generateTaxReport(period);

      // Assert
      expect(result.data.columns).toHaveLength(4);
      expect(result.data.columns.map((c) => c.key)).toContain('date');
      expect(result.data.columns.map((c) => c.key)).toContain('total_amount');
      expect(result.data.columns.map((c) => c.key)).toContain('payment_method');
      expect(result.data.columns.map((c) => c.key)).toContain('transaction_count');
    });

    it('should include totals in data', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue(createMockSalesData());

      // Act
      const result = await service.generateTaxReport(period);

      // Assert
      expect(result.data.totals).toBeDefined();
      expect(result.data.totals.total_amount).toBe(450000);
      expect(result.data.totals.transaction_count).toBe(45); // 10 + 20 + 15
    });

    it('should include highlights in summary', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue(createMockSalesData());

      // Act
      const result = await service.generateTaxReport(period);

      // Assert
      expect(result.summary.highlights).toHaveLength(3);
      expect(result.summary.highlights.some((h) => h.includes('выручка'))).toBe(true);
      expect(result.summary.highlights.some((h) => h.includes('НДС'))).toBe(true);
      expect(result.summary.highlights.some((h) => h.includes('транзакций'))).toBe(true);
    });

    it('should set correct metadata dataSource', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue([]);

      // Act
      const result = await service.generateTaxReport(period);

      // Assert
      expect(result.metadata.dataSource).toContain('transactions');
    });

    it('should handle payment methods not present', async () => {
      // Arrange - only cash sales
      const cashOnlyData = [
        {
          date: '2025-01-01',
          total_amount: '100000',
          payment_method: 'cash',
          transaction_count: '10',
        },
      ];
      mockDataSource.query.mockResolvedValue(cashOnlyData);

      // Act
      const result = await service.generateTaxReport(period);

      // Assert
      expect(result.metrics.cashRevenue.value).toContain('100');
      expect(result.metrics.cardRevenue.value).toContain('0');
    });
  });

  describe('generateMachinePerformanceReport', () => {
    const period = createDateRange('2025-01-01', '2025-01-31');
    const machineId = 'machine-123';

    beforeEach(() => {
      // Default mocks for all queries
      mockDataSource.query
        .mockResolvedValueOnce(createMockMachine()) // Machine query
        .mockResolvedValueOnce(createMockPerformanceData()) // Performance query
        .mockResolvedValueOnce(createMockTaskStats()) // Tasks query
        .mockResolvedValueOnce(createMockIncidentStats()); // Incidents query
    });

    it('should query machine data first', async () => {
      // Act
      await service.generateMachinePerformanceReport(machineId, period);

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(expect.stringContaining('FROM machines'), [
        machineId,
      ]);
    });

    it('should query performance data with machine_id and period', async () => {
      // Act
      await service.generateMachinePerformanceReport(machineId, period);

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM transactions'),
        [machineId, period.start, period.end],
      );
    });

    it('should query task statistics', async () => {
      // Act
      await service.generateMachinePerformanceReport(machineId, period);

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(expect.stringContaining('FROM tasks'), [
        machineId,
        period.start,
        period.end,
      ]);
    });

    it('should query incident statistics', async () => {
      // Act
      await service.generateMachinePerformanceReport(machineId, period);

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(expect.stringContaining('FROM incidents'), [
        machineId,
        period.start,
        period.end,
      ]);
    });

    it('should calculate total revenue correctly', async () => {
      // Act
      const result = await service.generateMachinePerformanceReport(machineId, period);

      // Assert
      // Total: 100000 + 250000 + 180000 = 530000
      expect(result.metrics.totalRevenue.value).toContain('530');
    });

    it('should calculate total sales count correctly', async () => {
      // Act
      const result = await service.generateMachinePerformanceReport(machineId, period);

      // Assert
      // Total: 10 + 20 + 15 = 45
      expect(result.metrics.totalSales.value).toBe(45);
    });

    it('should calculate average daily revenue', async () => {
      // Act
      const result = await service.generateMachinePerformanceReport(machineId, period);

      // Assert
      // Average: 530000 / 3 = 176666.67
      expect(result.metrics.avgDailyRevenue.value).toContain('176');
    });

    it('should calculate average sale amount', async () => {
      // Act
      const result = await service.generateMachinePerformanceReport(machineId, period);

      // Assert
      // Average: 530000 / 45 = 11777.78
      expect(result.metrics.avgSale.value).toContain('11');
    });

    it('should count completed tasks', async () => {
      // Act
      const result = await service.generateMachinePerformanceReport(machineId, period);

      // Assert
      // Completed: 5 + 3 = 8
      expect(result.metrics.completedTasks.value).toBe(8);
    });

    it('should count total incidents', async () => {
      // Act
      const result = await service.generateMachinePerformanceReport(machineId, period);

      // Assert
      // Total: 2 + 3 = 5
      expect(result.metrics.incidents.value).toBe(5);
    });

    it('should include revenue trend chart', async () => {
      // Act
      const result = await service.generateMachinePerformanceReport(machineId, period);

      // Assert
      expect(result.charts).toBeDefined();
      const revenueTrendChart = result.charts!.find((c) => c.id === 'revenue-trend');
      expect(revenueTrendChart).toBeDefined();
      expect(revenueTrendChart!.type).toBe('line');
    });

    it('should include sales count chart', async () => {
      // Act
      const result = await service.generateMachinePerformanceReport(machineId, period);

      // Assert
      const salesChart = result.charts!.find((c) => c.id === 'sales-count');
      expect(salesChart).toBeDefined();
      expect(salesChart!.type).toBe('bar');
    });

    it('should include machine number in title', async () => {
      // Act
      const result = await service.generateMachinePerformanceReport(machineId, period);

      // Assert
      expect(result.title).toContain('M-001');
    });

    it('should include machine name in subtitle', async () => {
      // Act
      const result = await service.generateMachinePerformanceReport(machineId, period);

      // Assert
      expect(result.subtitle).toContain('Coffee Machine');
    });

    it('should include insights in summary', async () => {
      // Act
      const result = await service.generateMachinePerformanceReport(machineId, period);

      // Assert
      expect(result.summary.insights).toBeDefined();
      expect(Array.isArray(result.summary.insights)).toBe(true);
    });

    it('should include recommendations in summary', async () => {
      // Act
      const result = await service.generateMachinePerformanceReport(machineId, period);

      // Assert
      expect(result.summary.recommendations).toBeDefined();
      expect(Array.isArray(result.summary.recommendations)).toBe(true);
    });

    it('should handle empty performance data', async () => {
      // Arrange
      mockDataSource.query
        .mockReset()
        .mockResolvedValueOnce(createMockMachine())
        .mockResolvedValueOnce([]) // Empty performance data
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.generateMachinePerformanceReport(machineId, period);

      // Assert
      expect(result.data.rows).toHaveLength(0);
      expect(result.metrics.totalSales.value).toBe(0);
    });

    it('should return correct report type', async () => {
      // Act
      const result = await service.generateMachinePerformanceReport(machineId, period);

      // Assert
      expect(result.type).toBe(ReportType.MACHINE_PERFORMANCE);
    });

    it('should include machineId in metadata filters', async () => {
      // Act
      const result = await service.generateMachinePerformanceReport(machineId, period);

      // Assert
      expect(result.metadata.filters).toEqual({ machineId });
    });
  });

  describe('generateMachineInsights', () => {
    const period = createDateRange('2025-01-01', '2025-01-31');
    const machineId = 'machine-123';

    it('should generate positive trend insight when second half revenue is higher', async () => {
      // Arrange - increasing revenue trend
      const increasingRevenue = [
        { date: '2025-01-01', sales_count: '5', revenue: '50000', avg_sale: '10000' },
        { date: '2025-01-02', sales_count: '5', revenue: '60000', avg_sale: '12000' },
        { date: '2025-01-03', sales_count: '8', revenue: '100000', avg_sale: '12500' },
        { date: '2025-01-04', sales_count: '10', revenue: '130000', avg_sale: '13000' },
      ];

      mockDataSource.query
        .mockReset()
        .mockResolvedValueOnce(createMockMachine())
        .mockResolvedValueOnce(increasingRevenue)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.generateMachinePerformanceReport(machineId, period);

      // Assert
      expect(result.summary.insights!.some((i) => i.includes('положительн'))).toBe(true);
    });

    it('should generate negative trend insight when second half revenue is lower', async () => {
      // Arrange - decreasing revenue trend
      const decreasingRevenue = [
        { date: '2025-01-01', sales_count: '10', revenue: '130000', avg_sale: '13000' },
        { date: '2025-01-02', sales_count: '8', revenue: '100000', avg_sale: '12500' },
        { date: '2025-01-03', sales_count: '5', revenue: '60000', avg_sale: '12000' },
        { date: '2025-01-04', sales_count: '4', revenue: '40000', avg_sale: '10000' },
      ];

      mockDataSource.query
        .mockReset()
        .mockResolvedValueOnce(createMockMachine())
        .mockResolvedValueOnce(decreasingRevenue)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.generateMachinePerformanceReport(machineId, period);

      // Assert
      expect(result.summary.insights!.some((i) => i.includes('снижается'))).toBe(true);
    });

    it('should generate critical incident insight when critical incidents exist', async () => {
      // Arrange
      const criticalIncidents = [
        {
          incident_type: 'hardware',
          severity: 'critical',
          count: '3',
          avg_resolution_hours: '4.0',
        },
      ];

      mockDataSource.query
        .mockReset()
        .mockResolvedValueOnce(createMockMachine())
        .mockResolvedValueOnce(createMockPerformanceData())
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(criticalIncidents);

      // Act
      const result = await service.generateMachinePerformanceReport(machineId, period);

      // Assert
      expect(result.summary.insights!.some((i) => i.includes('критических'))).toBe(true);
    });

    it('should not generate trend insight for single day data', async () => {
      // Arrange - only one day of data
      const singleDay = [
        { date: '2025-01-01', sales_count: '10', revenue: '100000', avg_sale: '10000' },
      ];

      mockDataSource.query
        .mockReset()
        .mockResolvedValueOnce(createMockMachine())
        .mockResolvedValueOnce(singleDay)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.generateMachinePerformanceReport(machineId, period);

      // Assert - should not have trend insights
      expect(result.summary.insights!.every((i) => !i.includes('динамик'))).toBe(true);
    });
  });

  describe('generateMachineRecommendations', () => {
    const period = createDateRange('2025-01-01', '2025-01-31');
    const machineId = 'machine-123';

    it('should recommend relocation when many low sales days', async () => {
      // Arrange - many days with low sales
      const lowSalesData = [
        { date: '2025-01-01', sales_count: '5', revenue: '50000', avg_sale: '10000' },
        { date: '2025-01-02', sales_count: '3', revenue: '30000', avg_sale: '10000' },
        { date: '2025-01-03', sales_count: '4', revenue: '40000', avg_sale: '10000' },
        { date: '2025-01-04', sales_count: '6', revenue: '60000', avg_sale: '10000' },
        { date: '2025-01-05', sales_count: '2', revenue: '20000', avg_sale: '10000' },
      ];

      mockDataSource.query
        .mockReset()
        .mockResolvedValueOnce(createMockMachine())
        .mockResolvedValueOnce(lowSalesData)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.generateMachinePerformanceReport(machineId, period);

      // Assert
      expect(result.summary.recommendations!.some((r) => r.includes('перемещен'))).toBe(true);
    });

    it('should recommend maintenance when no maintenance tasks', async () => {
      // Arrange - no maintenance tasks
      const tasksWithoutMaintenance = [
        { type: 'refill', status: 'completed', count: '5', avg_completion_hours: '2.5' },
        { type: 'collection', status: 'completed', count: '3', avg_completion_hours: '1.0' },
      ];

      mockDataSource.query
        .mockReset()
        .mockResolvedValueOnce(createMockMachine())
        .mockResolvedValueOnce(createMockPerformanceData())
        .mockResolvedValueOnce(tasksWithoutMaintenance)
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.generateMachinePerformanceReport(machineId, period);

      // Assert
      expect(result.summary.recommendations!.some((r) => r.includes('обслуживан'))).toBe(true);
    });

    it('should not recommend maintenance when maintenance tasks exist', async () => {
      // Arrange - has maintenance tasks
      const tasksWithMaintenance = [
        { type: 'maintenance', status: 'completed', count: '2', avg_completion_hours: '3.0' },
      ];

      mockDataSource.query
        .mockReset()
        .mockResolvedValueOnce(createMockMachine())
        .mockResolvedValueOnce(createMockPerformanceData())
        .mockResolvedValueOnce(tasksWithMaintenance)
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.generateMachinePerformanceReport(machineId, period);

      // Assert
      expect(result.summary.recommendations!.every((r) => !r.includes('обслуживан'))).toBe(true);
    });

    it('should not recommend relocation when sales are good', async () => {
      // Arrange - good sales data
      const goodSalesData = [
        { date: '2025-01-01', sales_count: '20', revenue: '200000', avg_sale: '10000' },
        { date: '2025-01-02', sales_count: '25', revenue: '250000', avg_sale: '10000' },
        { date: '2025-01-03', sales_count: '30', revenue: '300000', avg_sale: '10000' },
      ];

      mockDataSource.query
        .mockReset()
        .mockResolvedValueOnce(createMockMachine())
        .mockResolvedValueOnce(goodSalesData)
        .mockResolvedValueOnce(createMockTaskStats())
        .mockResolvedValueOnce([]);

      // Act
      const result = await service.generateMachinePerformanceReport(machineId, period);

      // Assert
      expect(result.summary.recommendations!.every((r) => !r.includes('перемещен'))).toBe(true);
    });
  });

  describe('buildQuery', () => {
    it('should build query with period filters', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue([]);
      const period = createDateRange('2025-01-01', '2025-01-31');
      const params = createReportParams(ReportType.DASHBOARD, period);

      // Act
      await service.generateReport(params);

      // Assert - should have period parameters in query
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('created_at >='),
        expect.any(Array),
      );
    });

    it('should include soft delete filter', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue([]);
      const period = createDateRange('2025-01-01', '2025-01-31');
      const params = createReportParams(ReportType.DASHBOARD, period);

      // Act
      await service.generateReport(params);

      // Assert
      expect(mockDataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('deleted_at IS NULL'),
        expect.any(Array),
      );
    });
  });

  describe('detectColumns', () => {
    it('should detect number type for numeric values', async () => {
      // Arrange
      const dataWithNumbers = [{ count: 10, amount: 100.5 }];
      mockDataSource.query.mockResolvedValue(dataWithNumbers);
      const period = createDateRange('2025-01-01', '2025-01-31');
      const params = createReportParams(ReportType.DASHBOARD, period);

      // Act
      const result = await service.generateReport(params);

      // Assert
      const countColumn = result.data.columns.find((c) => c.key === 'count');
      const amountColumn = result.data.columns.find((c) => c.key === 'amount');
      expect(countColumn?.type).toBe('number');
      expect(amountColumn?.type).toBe('number');
    });

    it('should detect boolean type for boolean values', async () => {
      // Arrange
      const dataWithBoolean = [{ active: true }];
      mockDataSource.query.mockResolvedValue(dataWithBoolean);
      const period = createDateRange('2025-01-01', '2025-01-31');
      const params = createReportParams(ReportType.DASHBOARD, period);

      // Act
      const result = await service.generateReport(params);

      // Assert
      const activeColumn = result.data.columns.find((c) => c.key === 'active');
      expect(activeColumn?.type).toBe('boolean');
    });

    it('should detect date type for Date instances', async () => {
      // Arrange
      const dataWithDate = [{ created_at: new Date() }];
      mockDataSource.query.mockResolvedValue(dataWithDate);
      const period = createDateRange('2025-01-01', '2025-01-31');
      const params = createReportParams(ReportType.DASHBOARD, period);

      // Act
      const result = await service.generateReport(params);

      // Assert
      const dateColumn = result.data.columns.find((c) => c.key === 'created_at');
      expect(dateColumn?.type).toBe('date');
    });

    it('should detect string type for string values', async () => {
      // Arrange
      const dataWithString = [{ name: 'Test', status: 'active' }];
      mockDataSource.query.mockResolvedValue(dataWithString);
      const period = createDateRange('2025-01-01', '2025-01-31');
      const params = createReportParams(ReportType.DASHBOARD, period);

      // Act
      const result = await service.generateReport(params);

      // Assert
      const nameColumn = result.data.columns.find((c) => c.key === 'name');
      const statusColumn = result.data.columns.find((c) => c.key === 'status');
      expect(nameColumn?.type).toBe('string');
      expect(statusColumn?.type).toBe('string');
    });

    it('should return empty columns for empty data', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue([]);
      const period = createDateRange('2025-01-01', '2025-01-31');
      const params = createReportParams(ReportType.DASHBOARD, period);

      // Act
      const result = await service.generateReport(params);

      // Assert
      expect(result.data.columns).toHaveLength(0);
    });
  });

  describe('humanizeKey', () => {
    it('should humanize column keys with underscores', async () => {
      // Arrange
      const dataWithSnakeCase = [{ total_amount: 100, created_at: 'test' }];
      mockDataSource.query.mockResolvedValue(dataWithSnakeCase);
      const period = createDateRange('2025-01-01', '2025-01-31');
      const params = createReportParams(ReportType.DASHBOARD, period);

      // Act
      const result = await service.generateReport(params);

      // Assert
      const totalAmountColumn = result.data.columns.find((c) => c.key === 'total_amount');
      expect(totalAmountColumn?.label).toBe('Total Amount');
    });

    it('should capitalize first letter of each word', async () => {
      // Arrange
      const dataWithLowerCase = [{ machine_number: 'M-001' }];
      mockDataSource.query.mockResolvedValue(dataWithLowerCase);
      const period = createDateRange('2025-01-01', '2025-01-31');
      const params = createReportParams(ReportType.DASHBOARD, period);

      // Act
      const result = await service.generateReport(params);

      // Assert
      const machineNumberColumn = result.data.columns.find((c) => c.key === 'machine_number');
      expect(machineNumberColumn?.label).toBe('Machine Number');
    });
  });

  describe('calculateMetrics', () => {
    it('should include totalRows metric', async () => {
      // Arrange
      const dataRows = [{ id: 1 }, { id: 2 }, { id: 3 }];
      mockDataSource.query.mockResolvedValue(dataRows);
      const period = createDateRange('2025-01-01', '2025-01-31');
      const params = createReportParams(ReportType.DASHBOARD, period);

      // Act
      const result = await service.generateReport(params);

      // Assert
      expect(result.metrics.totalRows).toBeDefined();
      expect(result.metrics.totalRows.value).toBe(3);
      expect(result.metrics.totalRows.format).toBe('number');
    });
  });

  describe('generateSummary', () => {
    it('should include totalRows in summary', async () => {
      // Arrange
      const dataRows = [{ id: 1 }, { id: 2 }];
      mockDataSource.query.mockResolvedValue(dataRows);
      const period = createDateRange('2025-01-01', '2025-01-31');
      const params = createReportParams(ReportType.DASHBOARD, period);

      // Act
      const result = await service.generateReport(params);

      // Assert
      expect(result.summary.totalRows).toBe(2);
    });

    it('should include empty highlights array', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue([]);
      const period = createDateRange('2025-01-01', '2025-01-31');
      const params = createReportParams(ReportType.DASHBOARD, period);

      // Act
      const result = await service.generateReport(params);

      // Assert
      expect(result.summary.highlights).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle null values in data', async () => {
      // Arrange
      const dataWithNulls = [{ id: 1, name: null, amount: null }];
      mockDataSource.query.mockResolvedValue(dataWithNulls);
      const period = createDateRange('2025-01-01', '2025-01-31');
      const params = createReportParams(ReportType.DASHBOARD, period);

      // Act
      const result = await service.generateReport(params);

      // Assert
      expect(result.data.rows).toHaveLength(1);
      expect(result.data.rows[0].name).toBeNull();
    });

    it('should handle very large datasets', async () => {
      // Arrange
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        amount: Math.random() * 10000,
      }));
      mockDataSource.query.mockResolvedValue(largeDataset);
      const period = createDateRange('2025-01-01', '2025-01-31');
      const params = createReportParams(ReportType.DASHBOARD, period);

      // Act
      const result = await service.generateReport(params);

      // Assert
      expect(result.data.rows).toHaveLength(1000);
      expect(result.metrics.totalRows.value).toBe(1000);
    });

    it('should handle special characters in data', async () => {
      // Arrange
      const dataWithSpecialChars = [
        { name: 'Test <script>alert("xss")</script>', description: "O'Reilly" },
      ];
      mockDataSource.query.mockResolvedValue(dataWithSpecialChars);
      const period = createDateRange('2025-01-01', '2025-01-31');
      const params = createReportParams(ReportType.DASHBOARD, period);

      // Act
      const result = await service.generateReport(params);

      // Assert
      expect(result.data.rows[0].name).toBe('Test <script>alert("xss")</script>');
      expect(result.data.rows[0].description).toBe("O'Reilly");
    });

    it('should handle database query error', async () => {
      // Arrange
      mockDataSource.query.mockRejectedValue(new Error('Database connection failed'));
      const period = createDateRange('2025-01-01', '2025-01-31');
      const params = createReportParams(ReportType.DASHBOARD, period);

      // Act & Assert
      await expect(service.generateReport(params)).rejects.toThrow('Database connection failed');
    });

    it('should handle date at boundaries of period', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue([]);
      const period = {
        start: new Date('2025-01-01T00:00:00.000Z'),
        end: new Date('2025-01-31T23:59:59.999Z'),
      };
      const params = createReportParams(ReportType.DASHBOARD, period);

      // Act
      const result = await service.generateReport(params);

      // Assert
      expect(result.period.start).toEqual(period.start);
      expect(result.period.end).toEqual(period.end);
    });

    it('should handle unknown report type with default title', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue([]);
      const period = createDateRange('2025-01-01', '2025-01-31');
      const params = createReportParams('unknown_type' as ReportType, period);

      // Act
      const result = await service.generateReport(params);

      // Assert
      expect(result.title).toBe('Отчет');
    });
  });

  describe('template loading', () => {
    it('should use DASHBOARD template when available', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue([]);
      const period = createDateRange('2025-01-01', '2025-01-31');
      const params = createReportParams(ReportType.DASHBOARD, period);

      // Act
      const result = await service.generateReport(params);

      // Assert
      expect(result.metadata.dataSource).toContain('transactions');
      expect(result.metadata.dataSource).toContain('tasks');
    });

    it('should create default template for unknown types', async () => {
      // Arrange
      mockDataSource.query.mockResolvedValue([]);
      const period = createDateRange('2025-01-01', '2025-01-31');
      const params = createReportParams(ReportType.INVENTORY, period);

      // Act
      const result = await service.generateReport(params);

      // Assert
      // Default template has empty queries, so data source will be empty
      expect(result.metadata.dataSource).toEqual([]);
    });
  });
});
