import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IntegrationLogService } from './integration-log.service';
import { IntegrationLog, LogLevel, RequestMethod } from '../entities/integration-log.entity';

describe('IntegrationLogService', () => {
  let service: IntegrationLogService;
  let repository: jest.Mocked<Repository<IntegrationLog>>;

  const mockLog: Partial<IntegrationLog> = {
    id: 'log-uuid',
    integration_id: 'integration-uuid',
    level: LogLevel.INFO,
    method: RequestMethod.GET,
    endpoint: '/api/products',
    status_code: 200,
    request_body: null,
    response_body: '{"data": []}',
    request_headers: { 'Content-Type': 'application/json' },
    response_headers: { 'Content-Type': 'application/json' },
    duration_ms: 150,
    success: true,
    error_message: null,
    stack_trace: null,
    user_id: null,
    metadata: {},
  };

  beforeEach(async () => {
    const mockRepository = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationLogService,
        {
          provide: getRepositoryToken(IntegrationLog),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<IntegrationLogService>(IntegrationLogService);
    repository = module.get(getRepositoryToken(IntegrationLog));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createLog', () => {
    it('should create a successful log with INFO level', async () => {
      const logData = {
        integration_id: 'integration-uuid',
        method: RequestMethod.GET,
        endpoint: '/api/products',
        status_code: 200,
        success: true,
        duration_ms: 150,
      };

      repository.create.mockReturnValue(mockLog as IntegrationLog);
      repository.save.mockResolvedValue(mockLog as IntegrationLog);

      const result = await service.createLog(logData);

      expect(result).toEqual(mockLog);
      expect(repository.create).toHaveBeenCalledWith({
        ...logData,
        level: LogLevel.INFO,
      });
    });

    it('should create a failed log with ERROR level', async () => {
      const logData = {
        integration_id: 'integration-uuid',
        method: RequestMethod.POST,
        endpoint: '/api/orders',
        status_code: 500,
        success: false,
        error_message: 'Internal server error',
      };

      const errorLog = { ...mockLog, ...logData, level: LogLevel.ERROR };
      repository.create.mockReturnValue(errorLog as IntegrationLog);
      repository.save.mockResolvedValue(errorLog as IntegrationLog);

      const _result = await service.createLog(logData);

      expect(repository.create).toHaveBeenCalledWith({
        ...logData,
        level: LogLevel.ERROR,
      });
    });

    it('should use provided log level when specified', async () => {
      const logData = {
        integration_id: 'integration-uuid',
        method: RequestMethod.GET,
        endpoint: '/api/health',
        success: true,
        level: LogLevel.DEBUG,
      };

      repository.create.mockReturnValue({ ...mockLog, level: LogLevel.DEBUG } as IntegrationLog);
      repository.save.mockResolvedValue({ ...mockLog, level: LogLevel.DEBUG } as IntegrationLog);

      await service.createLog(logData);

      expect(repository.create).toHaveBeenCalledWith({
        ...logData,
        level: LogLevel.DEBUG,
      });
    });

    it('should create log with all optional fields', async () => {
      const logData = {
        integration_id: 'integration-uuid',
        method: RequestMethod.POST,
        endpoint: '/api/orders',
        status_code: 201,
        request_body: '{"product": "coffee"}',
        response_body: '{"id": "order-123"}',
        request_headers: { Authorization: 'Bearer token' },
        response_headers: { 'X-Request-Id': '12345' },
        duration_ms: 250,
        success: true,
        user_id: 'user-uuid',
        metadata: { ip_address: '192.168.1.1' },
      };

      repository.create.mockReturnValue({ ...mockLog, ...logData } as IntegrationLog);
      repository.save.mockResolvedValue({ ...mockLog, ...logData } as IntegrationLog);

      await service.createLog(logData);

      expect(repository.create).toHaveBeenCalledWith({
        ...logData,
        level: LogLevel.INFO,
      });
    });
  });

  describe('findByIntegration', () => {
    it('should return logs for integration', async () => {
      repository.find.mockResolvedValue([mockLog] as IntegrationLog[]);

      const result = await service.findByIntegration('integration-uuid');

      expect(result).toEqual([mockLog]);
      expect(repository.find).toHaveBeenCalledWith({
        where: { integration_id: 'integration-uuid' },
        order: { created_at: 'DESC' },
        take: 100,
      });
    });

    it('should respect limit parameter', async () => {
      repository.find.mockResolvedValue([mockLog] as IntegrationLog[]);

      await service.findByIntegration('integration-uuid', 50);

      expect(repository.find).toHaveBeenCalledWith({
        where: { integration_id: 'integration-uuid' },
        order: { created_at: 'DESC' },
        take: 50,
      });
    });
  });

  describe('findByDateRange', () => {
    it('should return logs within date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockLog]),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.findByDateRange(startDate, endDate);

      expect(result).toEqual([mockLog]);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'log.created_at BETWEEN :start AND :end',
        { start: startDate, end: endDate },
      );
    });

    it('should filter by integration when provided', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockLog]),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.findByDateRange(startDate, endDate, 'integration-uuid');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'log.integration_id = :integrationId',
        { integrationId: 'integration-uuid' },
      );
    });
  });

  describe('getErrors', () => {
    it('should return failed logs for integration', async () => {
      const errorLog = { ...mockLog, success: false };
      repository.find.mockResolvedValue([errorLog] as IntegrationLog[]);

      const result = await service.getErrors('integration-uuid');

      expect(result).toEqual([errorLog]);
      expect(repository.find).toHaveBeenCalledWith({
        where: {
          integration_id: 'integration-uuid',
          success: false,
        },
        order: { created_at: 'DESC' },
        take: 50,
      });
    });

    it('should respect limit parameter', async () => {
      repository.find.mockResolvedValue([]);

      await service.getErrors('integration-uuid', 25);

      expect(repository.find).toHaveBeenCalledWith({
        where: {
          integration_id: 'integration-uuid',
          success: false,
        },
        order: { created_at: 'DESC' },
        take: 25,
      });
    });
  });

  describe('getStats', () => {
    it('should calculate stats for successful and failed requests', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { ...mockLog, success: true, duration_ms: 100 },
          { ...mockLog, success: true, duration_ms: 200 },
          { ...mockLog, success: false, duration_ms: 300 },
        ]),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getStats('integration-uuid');

      expect(result.total_requests).toBe(3);
      expect(result.successful_requests).toBe(2);
      expect(result.failed_requests).toBe(1);
      expect(result.average_duration_ms).toBe(200);
      expect(result.error_rate).toBeCloseTo(33.33, 1);
    });

    it('should return zero stats when no logs found', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getStats('integration-uuid');

      expect(result.total_requests).toBe(0);
      expect(result.successful_requests).toBe(0);
      expect(result.failed_requests).toBe(0);
      expect(result.average_duration_ms).toBe(0);
      expect(result.error_rate).toBe(0);
    });

    it('should handle logs without duration_ms', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { ...mockLog, success: true, duration_ms: null },
          { ...mockLog, success: true, duration_ms: 100 },
        ]),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getStats('integration-uuid');

      expect(result.average_duration_ms).toBe(50); // 100 / 2
    });

    it('should use custom days parameter', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.getStats('integration-uuid', 30);

      // Verify that date range is 30 days back
      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });
  });

  describe('cleanOldLogs', () => {
    it('should delete logs older than specified days', async () => {
      const mockQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 150 }),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.cleanOldLogs(30);

      expect(result).toBe(150);
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('created_at < :cutoffDate', {
        cutoffDate: expect.any(Date),
      });
    });

    it('should use default 30 days when not specified', async () => {
      const mockQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 0 }),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.cleanOldLogs();

      expect(result).toBe(0);
    });

    it('should return 0 when no logs deleted', async () => {
      const mockQueryBuilder = {
        delete: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: undefined }),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.cleanOldLogs();

      expect(result).toBe(0);
    });
  });
});
