import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { DailyStats } from './entities/daily-stats.entity';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let mockAnalyticsService: jest.Mocked<AnalyticsService>;

  const mockDailyStats: Partial<DailyStats> = {
    id: 'stats-1',
    stat_date: new Date('2025-01-15'),
    total_revenue: 10000,
    total_sales_count: 500,
    created_at: new Date(),
  };

  beforeEach(async () => {
    mockAnalyticsService = {
      getStatsForDate: jest.fn(),
      getStatsForDateRange: jest.fn(),
      rebuildDailyStats: jest.fn(),
      finalizeDay: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getDailyStats', () => {
    it('should return existing stats for a specific date', async () => {
      mockAnalyticsService.getStatsForDate.mockResolvedValue(mockDailyStats as DailyStats);

      const result = await controller.getDailyStats('2025-01-15');

      expect(result).toEqual(mockDailyStats);
      expect(mockAnalyticsService.getStatsForDate).toHaveBeenCalled();
    });

    it('should return stats for today if no date provided', async () => {
      mockAnalyticsService.getStatsForDate.mockResolvedValue(mockDailyStats as DailyStats);

      const result = await controller.getDailyStats();

      expect(result).toEqual(mockDailyStats);
      expect(mockAnalyticsService.getStatsForDate).toHaveBeenCalled();
    });

    it('should rebuild stats if none exist', async () => {
      mockAnalyticsService.getStatsForDate.mockResolvedValue(null);
      mockAnalyticsService.rebuildDailyStats.mockResolvedValue(mockDailyStats as DailyStats);

      const result = await controller.getDailyStats('2025-01-15');

      expect(result).toEqual(mockDailyStats);
      expect(mockAnalyticsService.rebuildDailyStats).toHaveBeenCalled();
    });
  });

  describe('getStatsForRange', () => {
    it('should return stats for date range', async () => {
      const statsArray = [mockDailyStats, { ...mockDailyStats, id: 'stats-2' }];
      mockAnalyticsService.getStatsForDateRange.mockResolvedValue(statsArray as DailyStats[]);

      const result = await controller.getStatsForRange('2025-01-01', '2025-01-15');

      expect(result).toEqual(statsArray);
      expect(mockAnalyticsService.getStatsForDateRange).toHaveBeenCalled();
    });
  });

  describe('rebuildStats', () => {
    it('should rebuild stats for a specific date', async () => {
      mockAnalyticsService.rebuildDailyStats.mockResolvedValue(mockDailyStats as DailyStats);

      const result = await controller.rebuildStats('2025-01-15');

      expect(result).toEqual(mockDailyStats);
      expect(mockAnalyticsService.rebuildDailyStats).toHaveBeenCalled();
    });
  });

  describe('getYesterdayStats', () => {
    it('should return existing stats for yesterday', async () => {
      mockAnalyticsService.getStatsForDate.mockResolvedValue(mockDailyStats as DailyStats);

      const result = await controller.getYesterdayStats();

      expect(result).toEqual(mockDailyStats);
      expect(mockAnalyticsService.getStatsForDate).toHaveBeenCalled();
    });

    it('should rebuild stats if none exist for yesterday', async () => {
      mockAnalyticsService.getStatsForDate.mockResolvedValue(null);
      mockAnalyticsService.rebuildDailyStats.mockResolvedValue(mockDailyStats as DailyStats);

      const result = await controller.getYesterdayStats();

      expect(result).toEqual(mockDailyStats);
      expect(mockAnalyticsService.rebuildDailyStats).toHaveBeenCalled();
    });
  });

  describe('getLast7DaysStats', () => {
    it('should return stats for last 7 days', async () => {
      const statsArray = Array(7).fill(mockDailyStats);
      mockAnalyticsService.getStatsForDateRange.mockResolvedValue(statsArray as DailyStats[]);

      const result = await controller.getLast7DaysStats();

      expect(result).toEqual(statsArray);
      expect(mockAnalyticsService.getStatsForDateRange).toHaveBeenCalled();
    });
  });

  describe('finalizeDay', () => {
    it('should finalize stats for a specific date', async () => {
      mockAnalyticsService.finalizeDay.mockResolvedValue(mockDailyStats as DailyStats);

      const result = await controller.finalizeDay('2025-01-15');

      expect(result).toEqual(mockDailyStats);
      expect(mockAnalyticsService.finalizeDay).toHaveBeenCalled();
    });
  });
});
