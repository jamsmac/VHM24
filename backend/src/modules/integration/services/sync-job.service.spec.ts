import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { SyncJobService } from './sync-job.service';
import { SyncJob, SyncJobStatus, SyncDirection } from '../entities/sync-job.entity';

describe('SyncJobService', () => {
  let service: SyncJobService;
  let repository: jest.Mocked<Repository<SyncJob>>;

  const mockSyncJob: Partial<SyncJob> = {
    id: 'sync-job-uuid',
    integration_id: 'integration-uuid',
    job_name: 'Sync Products',
    direction: SyncDirection.INBOUND,
    entity_type: 'products',
    status: SyncJobStatus.SCHEDULED,
    scheduled_at: new Date(),
    started_at: null,
    completed_at: null,
    duration_ms: null,
    total_records: 0,
    processed_records: 0,
    successful_records: 0,
    failed_records: 0,
    error_message: null,
    config: {},
    results: {},
    triggered_by_id: null,
  };

  beforeEach(async () => {
    const mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncJobService,
        {
          provide: getRepositoryToken(SyncJob),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SyncJobService>(SyncJobService);
    repository = module.get(getRepositoryToken(SyncJob));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createJob', () => {
    it('should create a new sync job with SCHEDULED status', async () => {
      const jobData = {
        integration_id: 'integration-uuid',
        job_name: 'Sync Products',
        direction: SyncDirection.INBOUND,
        entity_type: 'products',
        scheduled_at: new Date(),
      };

      repository.create.mockReturnValue(mockSyncJob as SyncJob);
      repository.save.mockResolvedValue(mockSyncJob as SyncJob);

      const result = await service.createJob(jobData);

      expect(result).toEqual(mockSyncJob);
      expect(repository.create).toHaveBeenCalledWith({
        ...jobData,
        status: SyncJobStatus.SCHEDULED,
      });
      expect(repository.save).toHaveBeenCalled();
    });

    it('should create job with config and triggered_by_id', async () => {
      const jobData = {
        integration_id: 'integration-uuid',
        job_name: 'Sync Orders',
        direction: SyncDirection.OUTBOUND,
        entity_type: 'orders',
        scheduled_at: new Date(),
        config: { batch_size: 100 },
        triggered_by_id: 'user-uuid',
      };

      repository.create.mockReturnValue({ ...mockSyncJob, ...jobData } as SyncJob);
      repository.save.mockResolvedValue({ ...mockSyncJob, ...jobData } as SyncJob);

      await service.createJob(jobData);

      expect(repository.create).toHaveBeenCalledWith({
        ...jobData,
        status: SyncJobStatus.SCHEDULED,
      });
    });
  });

  describe('startJob', () => {
    it('should set job status to RUNNING and set started_at', async () => {
      repository.findOne.mockResolvedValue(mockSyncJob as SyncJob);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as SyncJob));

      const result = await service.startJob('sync-job-uuid');

      expect(result.status).toBe(SyncJobStatus.RUNNING);
      expect(result.started_at).toBeDefined();
    });

    it('should throw NotFoundException when job not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.startJob('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProgress', () => {
    it('should update job progress counters', async () => {
      repository.findOne.mockResolvedValue({ ...mockSyncJob } as SyncJob);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as SyncJob));

      const result = await service.updateProgress('sync-job-uuid', 100, 95, 5);

      expect(result.processed_records).toBe(100);
      expect(result.successful_records).toBe(95);
      expect(result.failed_records).toBe(5);
    });

    it('should throw NotFoundException when job not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.updateProgress('non-existent', 0, 0, 0)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('completeJob', () => {
    it('should set job status to COMPLETED and calculate duration', async () => {
      const startedJob = {
        ...mockSyncJob,
        status: SyncJobStatus.RUNNING,
        started_at: new Date(Date.now() - 5000), // Started 5 seconds ago
      };
      repository.findOne.mockResolvedValue(startedJob as SyncJob);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as SyncJob));

      const result = await service.completeJob('sync-job-uuid');

      expect(result.status).toBe(SyncJobStatus.COMPLETED);
      expect(result.completed_at).toBeDefined();
      expect(result.duration_ms).toBeGreaterThan(0);
    });

    it('should include results when provided', async () => {
      const startedJob = {
        ...mockSyncJob,
        started_at: new Date(),
      };
      repository.findOne.mockResolvedValue(startedJob as SyncJob);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as SyncJob));

      const results = { summary: { created: 10, updated: 5 } };
      const result = await service.completeJob('sync-job-uuid', results);

      expect(result.results).toEqual(results);
    });

    it('should throw NotFoundException when job not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.completeJob('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('failJob', () => {
    it('should set job status to FAILED with error message', async () => {
      const runningJob = {
        ...mockSyncJob,
        status: SyncJobStatus.RUNNING,
        started_at: new Date(Date.now() - 1000),
      };
      repository.findOne.mockResolvedValue(runningJob as SyncJob);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as SyncJob));

      const result = await service.failJob('sync-job-uuid', 'Connection timeout');

      expect(result.status).toBe(SyncJobStatus.FAILED);
      expect(result.error_message).toBe('Connection timeout');
      expect(result.completed_at).toBeDefined();
      expect(result.duration_ms).toBeGreaterThan(0);
    });

    it('should throw NotFoundException when job not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.failJob('non-existent', 'error')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getScheduledJobs', () => {
    it('should return jobs due for execution', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockSyncJob]),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getScheduledJobs();

      expect(result).toEqual([mockSyncJob]);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('job.status = :status', {
        status: SyncJobStatus.SCHEDULED,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('job.scheduled_at <= :now', {
        now: expect.any(Date),
      });
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('job.scheduled_at', 'ASC');
    });
  });

  describe('getJobsByIntegration', () => {
    it('should return jobs for integration', async () => {
      repository.find.mockResolvedValue([mockSyncJob] as SyncJob[]);

      const result = await service.getJobsByIntegration('integration-uuid');

      expect(result).toEqual([mockSyncJob]);
      expect(repository.find).toHaveBeenCalledWith({
        where: { integration_id: 'integration-uuid' },
        order: { created_at: 'DESC' },
        take: 50,
      });
    });

    it('should respect limit parameter', async () => {
      repository.find.mockResolvedValue([mockSyncJob] as SyncJob[]);

      await service.getJobsByIntegration('integration-uuid', 25);

      expect(repository.find).toHaveBeenCalledWith({
        where: { integration_id: 'integration-uuid' },
        order: { created_at: 'DESC' },
        take: 25,
      });
    });
  });

  describe('getJobHistory', () => {
    it('should return completed and failed jobs for integration', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockSyncJob]),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getJobHistory('integration-uuid');

      expect(result).toEqual([mockSyncJob]);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('job.integration_id = :integrationId', {
        integrationId: 'integration-uuid',
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('job.status IN (:...statuses)', {
        statuses: [SyncJobStatus.COMPLETED, SyncJobStatus.FAILED],
      });
    });

    it('should filter by entity type when provided', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockSyncJob]),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.getJobHistory('integration-uuid', 'products');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('job.entity_type = :entityType', {
        entityType: 'products',
      });
    });
  });
});
