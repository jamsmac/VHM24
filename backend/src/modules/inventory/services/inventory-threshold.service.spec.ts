import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InventoryThresholdService } from './inventory-threshold.service';
import {
  InventoryDifferenceThreshold,
  ThresholdType,
  SeverityLevel,
} from '../entities/inventory-difference-threshold.entity';
import { CreateThresholdDto } from '../dto/inventory-threshold.dto';

describe('InventoryThresholdService', () => {
  let service: InventoryThresholdService;
  let repository: jest.Mocked<Repository<InventoryDifferenceThreshold>>;

  const mockThreshold: InventoryDifferenceThreshold = {
    id: 'threshold-1',
    threshold_type: ThresholdType.GLOBAL,
    reference_id: null,
    name: 'Test Threshold',
    threshold_abs: null,
    threshold_rel: 10,
    severity_level: SeverityLevel.WARNING,
    create_incident: false,
    create_task: false,
    notify_users: null,
    notify_roles: null,
    is_active: true,
    priority: 0,
    description: 'Test description',
    created_by_user_id: 'user-1',
    created_by: null,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    created_by_id: 'user-1',
    updated_by_id: null,
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryThresholdService,
        {
          provide: getRepositoryToken(InventoryDifferenceThreshold),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<InventoryThresholdService>(InventoryThresholdService);
    repository = module.get(getRepositoryToken(InventoryDifferenceThreshold));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a global threshold successfully', async () => {
      const dto: CreateThresholdDto = {
        threshold_type: ThresholdType.GLOBAL,
        name: 'Test Threshold',
        threshold_rel: 10,
        severity_level: SeverityLevel.WARNING,
      };

      repository.create.mockReturnValue(mockThreshold);
      repository.save.mockResolvedValue(mockThreshold);

      const result = await service.create(dto, 'user-1');

      expect(result).toEqual(mockThreshold);
      expect(repository.create).toHaveBeenCalledWith({
        ...dto,
        created_by_user_id: 'user-1',
      });
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if no threshold value specified', async () => {
      const dto: CreateThresholdDto = {
        threshold_type: ThresholdType.GLOBAL,
        name: 'Test Threshold',
        severity_level: SeverityLevel.WARNING,
        threshold_abs: null,
        threshold_rel: null,
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if GLOBAL has reference_id', async () => {
      const dto: CreateThresholdDto = {
        threshold_type: ThresholdType.GLOBAL,
        reference_id: 'some-id',
        name: 'Test Threshold',
        threshold_rel: 10,
        severity_level: SeverityLevel.WARNING,
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if NOMENCLATURE without reference_id', async () => {
      const dto: CreateThresholdDto = {
        threshold_type: ThresholdType.NOMENCLATURE,
        name: 'Test Threshold',
        threshold_rel: 10,
        severity_level: SeverityLevel.WARNING,
      };

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    });

    it('should create NOMENCLATURE threshold with reference_id', async () => {
      const nomenclatureThreshold = {
        ...mockThreshold,
        threshold_type: ThresholdType.NOMENCLATURE,
        reference_id: 'nomenclature-1',
      };

      const dto: CreateThresholdDto = {
        threshold_type: ThresholdType.NOMENCLATURE,
        reference_id: 'nomenclature-1',
        name: 'Test Threshold',
        threshold_rel: 10,
        severity_level: SeverityLevel.WARNING,
      };

      repository.create.mockReturnValue(nomenclatureThreshold);
      repository.save.mockResolvedValue(nomenclatureThreshold);

      const result = await service.create(dto);

      expect(result.threshold_type).toBe(ThresholdType.NOMENCLATURE);
      expect(result.reference_id).toBe('nomenclature-1');
    });
  });

  describe('findAll', () => {
    it('should return all thresholds without filter', async () => {
      repository.find.mockResolvedValue([mockThreshold]);

      const result = await service.findAll();

      expect(result).toEqual([mockThreshold]);
      expect(repository.find).toHaveBeenCalledWith({
        where: {},
        order: { priority: 'DESC', created_at: 'DESC' },
        relations: ['created_by'],
      });
    });

    it('should filter by threshold_type', async () => {
      repository.find.mockResolvedValue([mockThreshold]);

      await service.findAll({ threshold_type: ThresholdType.GLOBAL });

      expect(repository.find).toHaveBeenCalledWith({
        where: { threshold_type: ThresholdType.GLOBAL },
        order: { priority: 'DESC', created_at: 'DESC' },
        relations: ['created_by'],
      });
    });

    it('should filter by severity_level', async () => {
      repository.find.mockResolvedValue([mockThreshold]);

      await service.findAll({ severity_level: SeverityLevel.WARNING });

      expect(repository.find).toHaveBeenCalledWith({
        where: { severity_level: SeverityLevel.WARNING },
        order: { priority: 'DESC', created_at: 'DESC' },
        relations: ['created_by'],
      });
    });

    it('should filter by is_active', async () => {
      repository.find.mockResolvedValue([mockThreshold]);

      await service.findAll({ is_active: true });

      expect(repository.find).toHaveBeenCalledWith({
        where: { is_active: true },
        order: { priority: 'DESC', created_at: 'DESC' },
        relations: ['created_by'],
      });
    });
  });

  describe('findOne', () => {
    it('should return threshold by id', async () => {
      repository.findOne.mockResolvedValue(mockThreshold);

      const result = await service.findOne('threshold-1');

      expect(result).toEqual(mockThreshold);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'threshold-1' },
        relations: ['created_by'],
      });
    });

    it('should throw NotFoundException if not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByNomenclature', () => {
    it('should return thresholds for nomenclature and global', async () => {
      repository.find.mockResolvedValue([mockThreshold]);

      await service.findByNomenclature('nomenclature-1');

      expect(repository.find).toHaveBeenCalledWith({
        where: [
          {
            threshold_type: ThresholdType.NOMENCLATURE,
            reference_id: 'nomenclature-1',
            is_active: true,
          },
          { threshold_type: ThresholdType.GLOBAL, is_active: true },
        ],
        order: { priority: 'DESC' },
      });
    });
  });

  describe('findByMachine', () => {
    it('should return thresholds for machine and global', async () => {
      repository.find.mockResolvedValue([mockThreshold]);

      await service.findByMachine('machine-1');

      expect(repository.find).toHaveBeenCalledWith({
        where: [
          { threshold_type: ThresholdType.MACHINE, reference_id: 'machine-1', is_active: true },
          { threshold_type: ThresholdType.GLOBAL, is_active: true },
        ],
        order: { priority: 'DESC' },
      });
    });
  });

  describe('findGlobal', () => {
    it('should return only global thresholds', async () => {
      repository.find.mockResolvedValue([mockThreshold]);

      await service.findGlobal();

      expect(repository.find).toHaveBeenCalledWith({
        where: { threshold_type: ThresholdType.GLOBAL, is_active: true },
        order: { priority: 'DESC' },
      });
    });
  });

  describe('findApplicableThreshold', () => {
    it('should return most specific threshold', async () => {
      const nomenclatureThreshold = {
        ...mockThreshold,
        threshold_type: ThresholdType.NOMENCLATURE,
        reference_id: 'nomenclature-1',
        priority: 10,
      };
      const globalThreshold = {
        ...mockThreshold,
        threshold_type: ThresholdType.GLOBAL,
        priority: 0,
      };

      repository.find.mockResolvedValue([nomenclatureThreshold, globalThreshold]);

      const result = await service.findApplicableThreshold('nomenclature-1');

      expect(result).toEqual(nomenclatureThreshold);
    });

    it('should return null if no thresholds found', async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findApplicableThreshold('nomenclature-1');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update threshold', async () => {
      const updatedThreshold = { ...mockThreshold, name: 'Updated Name' };
      repository.findOne.mockResolvedValue(mockThreshold);
      repository.save.mockResolvedValue(updatedThreshold);

      const result = await service.update('threshold-1', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException if threshold not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove threshold', async () => {
      repository.findOne.mockResolvedValue(mockThreshold);
      repository.remove.mockResolvedValue(mockThreshold);

      await service.remove('threshold-1');

      expect(repository.remove).toHaveBeenCalledWith(mockThreshold);
    });

    it('should throw NotFoundException if threshold not found', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('activate/deactivate', () => {
    it('should activate threshold', async () => {
      const inactiveThreshold = { ...mockThreshold, is_active: false };
      const activatedThreshold = { ...mockThreshold, is_active: true };

      repository.findOne.mockResolvedValue(inactiveThreshold);
      repository.save.mockResolvedValue(activatedThreshold);

      const result = await service.activate('threshold-1');

      expect(result.is_active).toBe(true);
    });

    it('should deactivate threshold', async () => {
      const deactivatedThreshold = { ...mockThreshold, is_active: false };

      repository.findOne.mockResolvedValue(mockThreshold);
      repository.save.mockResolvedValue(deactivatedThreshold);

      const result = await service.deactivate('threshold-1');

      expect(result.is_active).toBe(false);
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', async () => {
      const thresholds = [
        {
          ...mockThreshold,
          is_active: true,
          threshold_type: ThresholdType.GLOBAL,
          severity_level: SeverityLevel.WARNING,
        },
        {
          ...mockThreshold,
          is_active: true,
          threshold_type: ThresholdType.GLOBAL,
          severity_level: SeverityLevel.CRITICAL,
        },
        {
          ...mockThreshold,
          is_active: false,
          threshold_type: ThresholdType.NOMENCLATURE,
          severity_level: SeverityLevel.WARNING,
        },
      ];

      repository.find.mockResolvedValue(thresholds as InventoryDifferenceThreshold[]);

      const result = await service.getStatistics();

      expect(result.total).toBe(3);
      expect(result.active).toBe(2);
      expect(result.inactive).toBe(1);
      expect(result.byType[ThresholdType.GLOBAL]).toBe(2);
      expect(result.byType[ThresholdType.NOMENCLATURE]).toBe(1);
      expect(result.bySeverity[SeverityLevel.WARNING]).toBe(2);
      expect(result.bySeverity[SeverityLevel.CRITICAL]).toBe(1);
    });
  });

  describe('createDefaultThresholds', () => {
    it('should create default thresholds if not exist', async () => {
      repository.findOne.mockResolvedValue(null);
      repository.create.mockImplementation((dto) => dto as InventoryDifferenceThreshold);
      repository.save.mockImplementation((entity) =>
        Promise.resolve(entity as InventoryDifferenceThreshold),
      );

      const result = await service.createDefaultThresholds('user-1');

      expect(result.length).toBe(2);
      expect(repository.findOne).toHaveBeenCalledTimes(2);
    });

    it('should not create duplicates', async () => {
      repository.findOne.mockResolvedValue(mockThreshold);

      const result = await service.createDefaultThresholds('user-1');

      expect(result.length).toBe(0);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });
});
