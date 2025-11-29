import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { getQueueToken } from '@nestjs/bull';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let typeOrmHealthIndicator: jest.Mocked<TypeOrmHealthIndicator>;
  let mockCommissionQueue: any;
  let mockSalesImportQueue: any;

  beforeEach(async () => {
    healthCheckService = {
      check: jest.fn(),
    } as any;

    typeOrmHealthIndicator = {
      pingCheck: jest.fn(),
    } as any;

    mockCommissionQueue = {
      getJobCounts: jest.fn(),
    };

    mockSalesImportQueue = {
      getJobCounts: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: healthCheckService,
        },
        {
          provide: TypeOrmHealthIndicator,
          useValue: typeOrmHealthIndicator,
        },
        {
          provide: getQueueToken('commission-calculations'),
          useValue: mockCommissionQueue,
        },
        {
          provide: getQueueToken('sales-import'),
          useValue: mockSalesImportQueue,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should perform health check', async () => {
      const healthResult: any = {
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
      };
      healthCheckService.check.mockResolvedValue(healthResult);
      typeOrmHealthIndicator.pingCheck.mockResolvedValue({ database: { status: 'up' as const } });

      const result = await controller.check();

      expect(healthCheckService.check).toHaveBeenCalled();
    });

    it('should call database ping check', async () => {
      const healthResult: any = {
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
      };
      healthCheckService.check.mockImplementation(async (checks: any[]) => {
        // Execute the provided checks
        for (const check of checks) {
          await check();
        }
        return healthResult;
      });
      typeOrmHealthIndicator.pingCheck.mockResolvedValue({ database: { status: 'up' as const } });

      await controller.check();

      expect(typeOrmHealthIndicator.pingCheck).toHaveBeenCalledWith('database');
    });
  });

  describe('ready', () => {
    it('should return readiness status', () => {
      const result = controller.ready();

      expect(result).toHaveProperty('status', 'ready');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('environment');
    });

    it('should return valid timestamp', () => {
      const result = controller.ready();

      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
    });

    it('should return numeric uptime', () => {
      const result = controller.ready();

      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should default to development environment when NODE_ENV is undefined', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      delete process.env.NODE_ENV;

      const result = controller.ready();

      expect(result.environment).toBe('development');

      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should return actual NODE_ENV when set', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const result = controller.ready();

      expect(result.environment).toBe('production');

      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('live', () => {
    it('should return liveness status', () => {
      const result = controller.live();

      expect(result).toHaveProperty('status', 'alive');
      expect(result).toHaveProperty('timestamp');
    });

    it('should return valid timestamp', () => {
      const result = controller.live();

      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('queues', () => {
    it('should return queue statistics', async () => {
      const commissionCounts = {
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 1,
        delayed: 0,
      };
      const salesImportCounts = {
        waiting: 3,
        active: 1,
        completed: 50,
        failed: 0,
        delayed: 2,
      };

      mockCommissionQueue.getJobCounts.mockResolvedValue(commissionCounts);
      mockSalesImportQueue.getJobCounts.mockResolvedValue(salesImportCounts);

      const result = await controller.queues();

      expect(result.status).toBe('ok');
      expect(result).toHaveProperty('timestamp');
      expect(result.queues['commission-calculations']).toEqual({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 1,
        delayed: 0,
      });
      expect(result.queues['sales-import']).toEqual({
        waiting: 3,
        active: 1,
        completed: 50,
        failed: 0,
        delayed: 2,
      });
    });

    it('should call both queue getJobCounts', async () => {
      mockCommissionQueue.getJobCounts.mockResolvedValue({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      });
      mockSalesImportQueue.getJobCounts.mockResolvedValue({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      });

      await controller.queues();

      expect(mockCommissionQueue.getJobCounts).toHaveBeenCalled();
      expect(mockSalesImportQueue.getJobCounts).toHaveBeenCalled();
    });

    it('should return valid timestamp', async () => {
      mockCommissionQueue.getJobCounts.mockResolvedValue({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      });
      mockSalesImportQueue.getJobCounts.mockResolvedValue({
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      });

      const result = await controller.queues();

      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
    });
  });
});
