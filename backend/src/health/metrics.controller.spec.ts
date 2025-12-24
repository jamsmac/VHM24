import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { getConnectionToken } from '@nestjs/typeorm';
import { MetricsController } from './metrics.controller';

describe('MetricsController', () => {
  let controller: MetricsController;
  let mockCommissionQueue: any;
  let mockSalesImportQueue: any;
  let mockConnection: any;

  beforeEach(async () => {
    mockCommissionQueue = {
      getJobCounts: jest.fn(),
    };

    mockSalesImportQueue = {
      getJobCounts: jest.fn(),
    };

    mockConnection = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        {
          provide: getQueueToken('commission-calculations'),
          useValue: mockCommissionQueue,
        },
        {
          provide: getQueueToken('sales-import'),
          useValue: mockSalesImportQueue,
        },
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
      ],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMetrics', () => {
    beforeEach(() => {
      // Default mock implementations
      mockConnection.query.mockResolvedValue([{ count: '5' }]);
      mockCommissionQueue.getJobCounts.mockResolvedValue({
        waiting: 10,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
      });
      mockSalesImportQueue.getJobCounts.mockResolvedValue({
        waiting: 5,
        active: 1,
        completed: 50,
        failed: 0,
        delayed: 2,
      });
    });

    it('should return metrics in Prometheus format', async () => {
      const result = await controller.getMetrics();

      expect(typeof result).toBe('string');
      expect(result).toContain('# HELP');
      expect(result).toContain('# TYPE');
    });

    it('should include process uptime metrics', async () => {
      const result = await controller.getMetrics();

      expect(result).toContain('vendhub_process_uptime_seconds');
      expect(result).toContain('# HELP vendhub_process_uptime_seconds');
      expect(result).toContain('# TYPE vendhub_process_uptime_seconds gauge');
    });

    it('should include memory usage metrics', async () => {
      const result = await controller.getMetrics();

      expect(result).toContain('process_memory_bytes');
      expect(result).toContain('process_memory_bytes{type="rss"}');
      expect(result).toContain('process_memory_bytes{type="heapTotal"}');
      expect(result).toContain('process_memory_bytes{type="heapUsed"}');
      expect(result).toContain('process_memory_bytes{type="external"}');
    });

    it('should include database connection metrics', async () => {
      const result = await controller.getMetrics();

      expect(mockConnection.query).toHaveBeenCalledWith(
        'SELECT count(*) as count FROM pg_stat_activity WHERE state = $1',
        ['active'],
      );
      expect(result).toContain('database_connections_active 5');
    });

    it('should handle database error gracefully', async () => {
      mockConnection.query.mockRejectedValue(new Error('Database error'));

      const result = await controller.getMetrics();

      expect(result).not.toContain('database_connections_active');
      // Should still return other metrics
      expect(result).toContain('vendhub_process_uptime_seconds');
    });

    it('should include queue metrics', async () => {
      const result = await controller.getMetrics();

      // Waiting metrics
      expect(result).toContain('bullmq_queue_waiting{queue="commission-calculations"} 10');
      expect(result).toContain('bullmq_queue_waiting{queue="sales-import"} 5');

      // Active metrics
      expect(result).toContain('bullmq_queue_active{queue="commission-calculations"} 2');
      expect(result).toContain('bullmq_queue_active{queue="sales-import"} 1');

      // Completed metrics
      expect(result).toContain('bullmq_queue_completed{queue="commission-calculations"} 100');
      expect(result).toContain('bullmq_queue_completed{queue="sales-import"} 50');

      // Failed metrics
      expect(result).toContain('bullmq_queue_failed{queue="commission-calculations"} 3');
      expect(result).toContain('bullmq_queue_failed{queue="sales-import"} 0');

      // Delayed metrics
      expect(result).toContain('bullmq_queue_delayed{queue="commission-calculations"} 1');
      expect(result).toContain('bullmq_queue_delayed{queue="sales-import"} 2');
    });

    it('should handle queue error gracefully', async () => {
      mockCommissionQueue.getJobCounts.mockRejectedValue(new Error('Queue error'));

      const result = await controller.getMetrics();

      expect(result).not.toContain('bullmq_queue_waiting');
      // Should still return other metrics
      expect(result).toContain('vendhub_process_uptime_seconds');
    });

    it('should end with newline', async () => {
      const result = await controller.getMetrics();

      expect(result.endsWith('\n')).toBe(true);
    });

    it('should handle empty database result', async () => {
      mockConnection.query.mockResolvedValue([{}]);

      const result = await controller.getMetrics();

      expect(result).toContain('database_connections_active 0');
    });

    it('should call both queue getJobCounts', async () => {
      await controller.getMetrics();

      expect(mockCommissionQueue.getJobCounts).toHaveBeenCalled();
      expect(mockSalesImportQueue.getJobCounts).toHaveBeenCalled();
    });

    it('should include help and type lines for each metric', async () => {
      const result = await controller.getMetrics();

      // Check queue metrics have proper help/type
      expect(result).toContain('# HELP bullmq_queue_waiting');
      expect(result).toContain('# TYPE bullmq_queue_waiting gauge');
      expect(result).toContain('# HELP bullmq_queue_active');
      expect(result).toContain('# TYPE bullmq_queue_active gauge');
      expect(result).toContain('# HELP bullmq_queue_completed');
      expect(result).toContain('# TYPE bullmq_queue_completed counter');
      expect(result).toContain('# HELP bullmq_queue_failed');
      expect(result).toContain('# TYPE bullmq_queue_failed counter');
      expect(result).toContain('# HELP bullmq_queue_delayed');
      expect(result).toContain('# TYPE bullmq_queue_delayed gauge');
    });
  });
});
