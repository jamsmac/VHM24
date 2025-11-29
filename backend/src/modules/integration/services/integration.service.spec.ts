import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { IntegrationService } from './integration.service';
import { Integration, IntegrationStatus, IntegrationType } from '../entities/integration.entity';

describe('IntegrationService', () => {
  let service: IntegrationService;
  let repository: jest.Mocked<Repository<Integration>>;

  const mockIntegration: Partial<Integration> = {
    id: 'integration-uuid',
    name: 'Test Integration',
    code: 'test_integration',
    type: IntegrationType.API,
    provider: 'test_provider',
    status: IntegrationStatus.INACTIVE,
    auto_sync_enabled: false,
    sync_interval_minutes: 0,
    last_sync_at: null,
    next_sync_at: null,
    metadata: {},
  };

  beforeEach(async () => {
    const mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationService,
        {
          provide: getRepositoryToken(Integration),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<IntegrationService>(IntegrationService);
    repository = module.get(getRepositoryToken(Integration));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all integrations', async () => {
      const integrations = [mockIntegration, { ...mockIntegration, id: 'int-2' }];
      repository.find.mockResolvedValue(integrations as Integration[]);

      const result = await service.findAll();

      expect(result).toEqual(integrations);
      expect(repository.find).toHaveBeenCalledWith({
        where: {},
        order: { name: 'ASC' },
      });
    });

    it('should filter by type when provided', async () => {
      repository.find.mockResolvedValue([mockIntegration] as Integration[]);

      await service.findAll(IntegrationType.API);

      expect(repository.find).toHaveBeenCalledWith({
        where: { type: IntegrationType.API },
        order: { name: 'ASC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return integration when found', async () => {
      repository.findOne.mockResolvedValue(mockIntegration as Integration);

      const result = await service.findOne('integration-uuid');

      expect(result).toEqual(mockIntegration);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'integration-uuid' },
      });
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByCode', () => {
    it('should return integration when found by code', async () => {
      repository.findOne.mockResolvedValue(mockIntegration as Integration);

      const result = await service.findByCode('test_integration');

      expect(result).toEqual(mockIntegration);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { code: 'test_integration' },
      });
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findByCode('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getActive', () => {
    it('should return only active integrations', async () => {
      const activeIntegration = { ...mockIntegration, status: IntegrationStatus.ACTIVE };
      repository.find.mockResolvedValue([activeIntegration] as Integration[]);

      const result = await service.getActive();

      expect(result).toEqual([activeIntegration]);
      expect(repository.find).toHaveBeenCalledWith({
        where: { status: IntegrationStatus.ACTIVE },
        order: { name: 'ASC' },
      });
    });
  });

  describe('activate', () => {
    it('should activate integration without auto-sync', async () => {
      repository.findOne.mockResolvedValue(mockIntegration as Integration);
      repository.save.mockResolvedValue({
        ...mockIntegration,
        status: IntegrationStatus.ACTIVE,
      } as Integration);

      const result = await service.activate('integration-uuid');

      expect(result.status).toBe(IntegrationStatus.ACTIVE);
      expect(repository.save).toHaveBeenCalled();
    });

    it('should schedule next sync when auto-sync is enabled', async () => {
      const integrationWithAutoSync = {
        ...mockIntegration,
        auto_sync_enabled: true,
        sync_interval_minutes: 30,
      };
      repository.findOne.mockResolvedValue(integrationWithAutoSync as Integration);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as Integration));

      const result = await service.activate('integration-uuid');

      expect(result.status).toBe(IntegrationStatus.ACTIVE);
      expect(result.next_sync_at).toBeDefined();
    });

    it('should throw NotFoundException when integration not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.activate('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('should deactivate integration and clear next sync', async () => {
      const activeIntegration = {
        ...mockIntegration,
        status: IntegrationStatus.ACTIVE,
        next_sync_at: new Date(),
      };
      repository.findOne.mockResolvedValue(activeIntegration as Integration);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as Integration));

      const result = await service.deactivate('integration-uuid');

      expect(result.status).toBe(IntegrationStatus.INACTIVE);
      expect(result.next_sync_at).toBeNull();
    });

    it('should throw NotFoundException when integration not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.deactivate('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateLastSync', () => {
    it('should update last_sync_at timestamp', async () => {
      repository.findOne.mockResolvedValue(mockIntegration as Integration);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as Integration));

      const result = await service.updateLastSync('integration-uuid');

      expect(result.last_sync_at).toBeDefined();
    });

    it('should schedule next sync when auto-sync is enabled', async () => {
      const integrationWithAutoSync = {
        ...mockIntegration,
        auto_sync_enabled: true,
        sync_interval_minutes: 60,
      };
      repository.findOne.mockResolvedValue(integrationWithAutoSync as Integration);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as Integration));

      const result = await service.updateLastSync('integration-uuid');

      expect(result.next_sync_at).toBeDefined();
    });
  });

  describe('getDueForSync', () => {
    it('should return integrations due for sync', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockIntegration]),
      };
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getDueForSync();

      expect(result).toEqual([mockIntegration]);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('integration.status = :status', {
        status: IntegrationStatus.ACTIVE,
      });
    });
  });

  describe('updateStats', () => {
    it('should increment successful call stats', async () => {
      const integrationWithStats = {
        ...mockIntegration,
        metadata: {
          stats: { total_calls: 10, successful_calls: 8, failed_calls: 2 },
        },
      };
      repository.findOne.mockResolvedValue(integrationWithStats as Integration);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as Integration));

      await service.updateStats('integration-uuid', true);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            stats: expect.objectContaining({
              total_calls: 11,
              successful_calls: 9,
            }),
          }),
        }),
      );
    });

    it('should increment failed call stats and set status to error', async () => {
      repository.findOne.mockResolvedValue(mockIntegration as Integration);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as Integration));

      await service.updateStats('integration-uuid', false, 'Connection timeout');

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: IntegrationStatus.ERROR,
          metadata: expect.objectContaining({
            last_error: 'Connection timeout',
            stats: expect.objectContaining({
              failed_calls: 1,
            }),
          }),
        }),
      );
    });

    it('should initialize stats when not present', async () => {
      const integrationWithoutStats = {
        ...mockIntegration,
        metadata: {},
      };
      repository.findOne.mockResolvedValue(integrationWithoutStats as Integration);
      repository.save.mockImplementation((entity) => Promise.resolve(entity as Integration));

      await service.updateStats('integration-uuid', true);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            stats: expect.objectContaining({
              total_calls: 1,
              successful_calls: 1,
              failed_calls: 0,
            }),
          }),
        }),
      );
    });
  });
});
