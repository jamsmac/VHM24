import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from './metrics.controller';
import { MetricsService } from '../services/metrics.service';

describe('MetricsController', () => {
  let controller: MetricsController;
  let metricsService: jest.Mocked<MetricsService>;

  beforeEach(async () => {
    const mockMetricsService = {
      collectBusinessMetrics: jest.fn(),
      recordHttpRequest: jest.fn(),
      recordTaskCreated: jest.fn(),
      recordTaskCompleted: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
    metricsService = module.get(MetricsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============================================================================
  // HEALTH ENDPOINT TESTS
  // ============================================================================

  describe('health', () => {
    it('should return healthy status', async () => {
      const result = await controller.health();

      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.memory).toBeDefined();
      expect(result.memory.heapUsed).toBeDefined();
      expect(result.memory.heapTotal).toBeDefined();
    });

    it('should return current timestamp', async () => {
      const before = new Date().toISOString();
      const result = await controller.health();
      const after = new Date().toISOString();

      expect(result.timestamp >= before).toBe(true);
      expect(result.timestamp <= after).toBe(true);
    });

    it('should return process uptime', async () => {
      const result = await controller.health();

      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return memory usage', async () => {
      const result = await controller.health();

      expect(result.memory).toHaveProperty('rss');
      expect(result.memory).toHaveProperty('heapTotal');
      expect(result.memory).toHaveProperty('heapUsed');
      expect(result.memory).toHaveProperty('external');
    });

    it('should return environment', async () => {
      const result = await controller.health();

      expect(result.environment).toBeDefined();
      // Environment is either 'test', 'development', or whatever is set
    });
  });

  // ============================================================================
  // READY ENDPOINT TESTS
  // ============================================================================

  describe('ready', () => {
    it('should return ready status', async () => {
      const result = await controller.ready();

      expect(result.status).toBe('ready');
      expect(result.timestamp).toBeDefined();
    });

    it('should return checks object', async () => {
      const result = await controller.ready();

      expect(result.checks).toBeDefined();
      expect(result.checks.database).toBe('connected');
      expect(result.checks.cache).toBe('connected');
      expect(result.checks.queue).toBe('ready');
    });

    it('should return current timestamp', async () => {
      const before = new Date().toISOString();
      const result = await controller.ready();
      const after = new Date().toISOString();

      expect(result.timestamp >= before).toBe(true);
      expect(result.timestamp <= after).toBe(true);
    });
  });

  // ============================================================================
  // LIVE ENDPOINT TESTS
  // ============================================================================

  describe('live', () => {
    it('should return alive status', async () => {
      const result = await controller.live();

      expect(result.status).toBe('alive');
      expect(result.timestamp).toBeDefined();
    });

    it('should return current timestamp', async () => {
      const before = new Date().toISOString();
      const result = await controller.live();
      const after = new Date().toISOString();

      expect(result.timestamp >= before).toBe(true);
      expect(result.timestamp <= after).toBe(true);
    });

    it('should be a simple endpoint with minimal processing', async () => {
      const start = Date.now();
      await controller.live();
      const duration = Date.now() - start;

      // Should be very fast (< 100ms)
      expect(duration).toBeLessThan(100);
    });
  });

  // ============================================================================
  // COLLECT METRICS ENDPOINT TESTS
  // ============================================================================

  describe('collectMetrics', () => {
    it('should trigger business metrics collection', async () => {
      metricsService.collectBusinessMetrics.mockResolvedValue(undefined);

      const result = await controller.collectMetrics();

      expect(metricsService.collectBusinessMetrics).toHaveBeenCalled();
      expect(result.message).toBe('Metrics collection triggered');
      expect(result.timestamp).toBeDefined();
    });

    it('should return current timestamp', async () => {
      metricsService.collectBusinessMetrics.mockResolvedValue(undefined);

      const before = new Date().toISOString();
      const result = await controller.collectMetrics();
      const after = new Date().toISOString();

      expect(result.timestamp >= before).toBe(true);
      expect(result.timestamp <= after).toBe(true);
    });

    it('should handle metrics collection error gracefully', async () => {
      metricsService.collectBusinessMetrics.mockRejectedValue(new Error('Collection failed'));

      await expect(controller.collectMetrics()).rejects.toThrow('Collection failed');
    });

    it('should call collectBusinessMetrics exactly once', async () => {
      metricsService.collectBusinessMetrics.mockResolvedValue(undefined);

      await controller.collectMetrics();

      expect(metricsService.collectBusinessMetrics).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // CONCURRENT REQUESTS TESTS
  // ============================================================================

  describe('concurrent requests', () => {
    it('should handle multiple health checks simultaneously', async () => {
      const promises = Array(10)
        .fill(null)
        .map(() => controller.health());
      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.status).toBe('healthy');
      });
    });

    it('should handle multiple ready checks simultaneously', async () => {
      const promises = Array(10)
        .fill(null)
        .map(() => controller.ready());
      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.status).toBe('ready');
      });
    });

    it('should handle multiple live checks simultaneously', async () => {
      const promises = Array(10)
        .fill(null)
        .map(() => controller.live());
      const results = await Promise.all(promises);

      results.forEach((result) => {
        expect(result.status).toBe('alive');
      });
    });

    it('should handle mixed endpoint calls simultaneously', async () => {
      metricsService.collectBusinessMetrics.mockResolvedValue(undefined);

      const [healthResult, readyResult, liveResult, collectResult] = await Promise.all([
        controller.health(),
        controller.ready(),
        controller.live(),
        controller.collectMetrics(),
      ]);

      expect(healthResult.status).toBe('healthy');
      expect(readyResult.status).toBe('ready');
      expect(liveResult.status).toBe('alive');
      expect(collectResult.message).toBe('Metrics collection triggered');
    });
  });

  // ============================================================================
  // RESPONSE FORMAT TESTS
  // ============================================================================

  describe('response format', () => {
    it('should return consistent timestamp format in ISO8601', async () => {
      const healthResult = await controller.health();
      const readyResult = await controller.ready();
      const liveResult = await controller.live();

      // ISO8601 format regex
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;

      expect(healthResult.timestamp).toMatch(iso8601Regex);
      expect(readyResult.timestamp).toMatch(iso8601Regex);
      expect(liveResult.timestamp).toMatch(iso8601Regex);
    });

    it('should return valid JSON-serializable objects', async () => {
      const healthResult = await controller.health();
      const readyResult = await controller.ready();
      const liveResult = await controller.live();

      expect(() => JSON.stringify(healthResult)).not.toThrow();
      expect(() => JSON.stringify(readyResult)).not.toThrow();
      expect(() => JSON.stringify(liveResult)).not.toThrow();
    });
  });
});
