import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsRealtimeController } from './analytics.controller';
import { AnalyticsCalculationService } from '../services/analytics-calculation.service';
import { AnalyticsQueryDto, MetricType, GroupByType } from '../dto/analytics-query.dto';

describe('AnalyticsRealtimeController', () => {
  let controller: AnalyticsRealtimeController;
  let mockAnalyticsService: jest.Mocked<AnalyticsCalculationService>;

  beforeEach(async () => {
    mockAnalyticsService = {
      calculateMetrics: jest.fn(),
      getTopMachines: jest.fn(),
      getTopProducts: jest.fn(),
      getMachineStatusSummary: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsRealtimeController],
      providers: [
        {
          provide: AnalyticsCalculationService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    controller = module.get<AnalyticsRealtimeController>(AnalyticsRealtimeController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getMetrics', () => {
    it('should return analytics metrics', async () => {
      const query: AnalyticsQueryDto = {
        start_date: '2025-01-01',
        end_date: '2025-01-31',
        metrics: [MetricType.REVENUE, MetricType.TRANSACTIONS],
        group_by: GroupByType.DAY,
      };
      const expectedResult = {
        labels: ['2025-01-01', '2025-01-02'],
        datasets: [{ label: 'Revenue', data: [1000, 1500], backgroundColor: 'green' }],
        summary: { revenue: 2500 },
      };

      mockAnalyticsService.calculateMetrics.mockResolvedValue(expectedResult);

      const result = await controller.getMetrics(query);

      expect(result).toEqual(expectedResult);
      expect(mockAnalyticsService.calculateMetrics).toHaveBeenCalledWith(query);
    });

    it('should handle empty query parameters', async () => {
      const query: AnalyticsQueryDto = {};
      const expectedResult = {
        labels: [],
        datasets: [],
        summary: {},
      };

      mockAnalyticsService.calculateMetrics.mockResolvedValue(expectedResult);

      const result = await controller.getMetrics(query);

      expect(result).toEqual(expectedResult);
      expect(mockAnalyticsService.calculateMetrics).toHaveBeenCalledWith(query);
    });
  });

  describe('getTopMachines', () => {
    it('should return top machines with default parameters', async () => {
      const expectedResult = [
        { machine_id: 'machine-1', total_revenue: '5000', total_transactions: '100', avg_availability: '95.5' },
        { machine_id: 'machine-2', total_revenue: '3000', total_transactions: '60', avg_availability: '92.0' },
      ];

      mockAnalyticsService.getTopMachines.mockResolvedValue(expectedResult);

      const result = await controller.getTopMachines();

      expect(result).toEqual(expectedResult);
      expect(mockAnalyticsService.getTopMachines).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should return top machines with custom limit and days', async () => {
      const expectedResult = [{ machine_id: 'machine-1', total_revenue: '5000', total_transactions: '100', avg_availability: '95.5' }];

      mockAnalyticsService.getTopMachines.mockResolvedValue(expectedResult);

      const result = await controller.getTopMachines(5, 7);

      expect(result).toEqual(expectedResult);
      expect(mockAnalyticsService.getTopMachines).toHaveBeenCalledWith(5, 7);
    });
  });

  describe('getTopProducts', () => {
    it('should return top products with default parameters', async () => {
      const expectedResult = [
        { product_id: 'product-1', total_units: '500', total_revenue: '2500' },
        { product_id: 'product-2', total_units: '300', total_revenue: '1500' },
      ];

      mockAnalyticsService.getTopProducts.mockResolvedValue(expectedResult);

      const result = await controller.getTopProducts();

      expect(result).toEqual(expectedResult);
      expect(mockAnalyticsService.getTopProducts).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should return top products with custom limit and days', async () => {
      const expectedResult = [{ product_id: 'product-1', total_units: '500', total_revenue: '2500' }];

      mockAnalyticsService.getTopProducts.mockResolvedValue(expectedResult);

      const result = await controller.getTopProducts(3, 14);

      expect(result).toEqual(expectedResult);
      expect(mockAnalyticsService.getTopProducts).toHaveBeenCalledWith(3, 14);
    });
  });

  describe('getMachineStatus', () => {
    it('should return machine status summary', async () => {
      const expectedResult = {
        online: 10,
        offline: 2,
        maintenance: 1,
        error: 0,
      };

      mockAnalyticsService.getMachineStatusSummary.mockResolvedValue(expectedResult);

      const result = await controller.getMachineStatus();

      expect(result).toEqual(expectedResult);
      expect(mockAnalyticsService.getMachineStatusSummary).toHaveBeenCalled();
    });
  });
});
