import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { InventoryReportPresetsService } from './inventory-report-presets.service';
import { InventoryReportPreset } from '../entities/inventory-report-preset.entity';
import { createMockRepository } from '@/test/helpers';

/**
 * Unit Tests for InventoryReportPresetsService
 *
 * Tests the management of saved report filter presets.
 */
describe('InventoryReportPresetsService', () => {
  let service: InventoryReportPresetsService;
  let presetRepo: any;

  // Test fixtures
  const testUserId = '11111111-1111-1111-1111-111111111111';
  const testPresetId = '22222222-2222-2222-2222-222222222222';

  beforeEach(async () => {
    presetRepo = createMockRepository<InventoryReportPreset>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryReportPresetsService,
        {
          provide: getRepositoryToken(InventoryReportPreset),
          useValue: presetRepo,
        },
      ],
    }).compile();

    service = module.get<InventoryReportPresetsService>(InventoryReportPresetsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new preset for user', async () => {
      // Arrange
      const createDto = {
        name: 'My Critical Differences',
        filters: {
          severity: 'CRITICAL',
          threshold_exceeded_only: true,
        },
        is_default: false,
        sort_order: 1,
      };

      const createdPreset = {
        id: testPresetId,
        user_id: testUserId,
        ...createDto,
      };

      presetRepo.create.mockReturnValue(createdPreset);
      presetRepo.save.mockResolvedValue(createdPreset);

      // Act
      const result = await service.create(testUserId, createDto);

      // Assert
      expect(result).toEqual(createdPreset);
      expect(presetRepo.create).toHaveBeenCalledWith({
        ...createDto,
        user_id: testUserId,
      });
      expect(presetRepo.save).toHaveBeenCalled();
    });

    it('should unset other default presets when creating a new default', async () => {
      // Arrange
      const createDto = {
        name: 'New Default Preset',
        filters: {},
        is_default: true,
      };

      const createdPreset = {
        id: testPresetId,
        user_id: testUserId,
        ...createDto,
      };

      presetRepo.update.mockResolvedValue({});
      presetRepo.create.mockReturnValue(createdPreset);
      presetRepo.save.mockResolvedValue(createdPreset);

      // Act
      await service.create(testUserId, createDto);

      // Assert
      expect(presetRepo.update).toHaveBeenCalledWith(
        { user_id: testUserId, is_default: true },
        { is_default: false },
      );
    });

    it('should not unset other defaults when creating non-default preset', async () => {
      // Arrange
      const createDto = {
        name: 'Non-Default Preset',
        filters: {},
        is_default: false,
      };

      const createdPreset = {
        id: testPresetId,
        user_id: testUserId,
        ...createDto,
      };

      presetRepo.create.mockReturnValue(createdPreset);
      presetRepo.save.mockResolvedValue(createdPreset);

      // Act
      await service.create(testUserId, createDto);

      // Assert
      expect(presetRepo.update).not.toHaveBeenCalled();
    });

    it('should store complex filters', async () => {
      // Arrange
      const createDto = {
        name: 'Complex Filter Preset',
        filters: {
          level_type: 'MACHINE',
          level_ref_id: 'machine-123',
          nomenclature_id: 'nom-456',
          date_from: '2025-01-01',
          date_to: '2025-12-31',
          severity: 'WARNING',
          threshold_exceeded_only: true,
        },
        is_default: false,
      };

      presetRepo.create.mockImplementation((data: any) => data);
      presetRepo.save.mockImplementation((data: any) =>
        Promise.resolve({ id: testPresetId, ...data }),
      );

      // Act
      const result = await service.create(testUserId, createDto);

      // Assert
      expect(result.filters).toEqual(createDto.filters);
    });
  });

  describe('findByUser', () => {
    it('should return all presets for user sorted by order and date', async () => {
      // Arrange
      const presets = [
        { id: 'preset-1', user_id: testUserId, name: 'Preset 1', sort_order: 1 },
        { id: 'preset-2', user_id: testUserId, name: 'Preset 2', sort_order: 2 },
      ];

      presetRepo.find.mockResolvedValue(presets);

      // Act
      const result = await service.findByUser(testUserId);

      // Assert
      expect(result).toEqual(presets);
      expect(presetRepo.find).toHaveBeenCalledWith({
        where: { user_id: testUserId },
        order: { sort_order: 'ASC', updated_at: 'DESC' },
      });
    });

    it('should return empty array when user has no presets', async () => {
      // Arrange
      presetRepo.find.mockResolvedValue([]);

      // Act
      const result = await service.findByUser(testUserId);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return preset by ID for user', async () => {
      // Arrange
      const preset = {
        id: testPresetId,
        user_id: testUserId,
        name: 'My Preset',
        filters: { severity: 'CRITICAL' },
      };

      presetRepo.findOne.mockResolvedValue(preset);

      // Act
      const result = await service.findOne(testPresetId, testUserId);

      // Assert
      expect(result).toEqual(preset);
      expect(presetRepo.findOne).toHaveBeenCalledWith({
        where: { id: testPresetId, user_id: testUserId },
      });
    });

    it('should throw NotFoundException when preset not found', async () => {
      // Arrange
      presetRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent', testUserId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne('non-existent', testUserId)).rejects.toThrow(
        'Preset with ID non-existent not found',
      );
    });

    it('should not return preset of another user', async () => {
      // Arrange
      presetRepo.findOne.mockResolvedValue(null); // Query filters by user_id

      // Act & Assert
      await expect(service.findOne(testPresetId, 'other-user-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update preset with new values', async () => {
      // Arrange
      const existingPreset = {
        id: testPresetId,
        user_id: testUserId,
        name: 'Old Name',
        filters: { severity: 'INFO' },
        is_default: false,
      };

      const updateDto = {
        name: 'Updated Name',
        filters: { severity: 'CRITICAL' },
      };

      presetRepo.findOne.mockResolvedValue(existingPreset);
      presetRepo.save.mockImplementation((data: any) => Promise.resolve(data));

      // Act
      const result = await service.update(testPresetId, testUserId, updateDto);

      // Assert
      expect(result.name).toBe('Updated Name');
      expect(result.filters).toEqual({ severity: 'CRITICAL' });
    });

    it('should unset other defaults when updating to default', async () => {
      // Arrange
      const existingPreset = {
        id: testPresetId,
        user_id: testUserId,
        name: 'My Preset',
        is_default: false,
      };

      const updateDto = {
        is_default: true,
      };

      presetRepo.findOne.mockResolvedValue(existingPreset);
      presetRepo.update.mockResolvedValue({});
      presetRepo.save.mockImplementation((data: any) => Promise.resolve(data));

      // Act
      await service.update(testPresetId, testUserId, updateDto);

      // Assert
      expect(presetRepo.update).toHaveBeenCalledWith(
        { user_id: testUserId, is_default: true },
        { is_default: false },
      );
    });

    it('should not unset other defaults when already default', async () => {
      // Arrange
      const existingPreset = {
        id: testPresetId,
        user_id: testUserId,
        name: 'My Preset',
        is_default: true, // Already default
      };

      const updateDto = {
        is_default: true, // Keeping as default
      };

      presetRepo.findOne.mockResolvedValue(existingPreset);
      presetRepo.save.mockImplementation((data: any) => Promise.resolve(data));

      // Act
      await service.update(testPresetId, testUserId, updateDto);

      // Assert
      expect(presetRepo.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when preset not found', async () => {
      // Arrange
      presetRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update('non-existent', testUserId, {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete preset', async () => {
      // Arrange
      const existingPreset = {
        id: testPresetId,
        user_id: testUserId,
        name: 'My Preset',
      };

      presetRepo.findOne.mockResolvedValue(existingPreset);
      presetRepo.softRemove.mockResolvedValue(existingPreset);

      // Act
      await service.remove(testPresetId, testUserId);

      // Assert
      expect(presetRepo.softRemove).toHaveBeenCalledWith(existingPreset);
    });

    it('should throw NotFoundException when preset not found', async () => {
      // Arrange
      presetRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('non-existent', testUserId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDefaultPreset', () => {
    it('should return default preset for user', async () => {
      // Arrange
      const defaultPreset = {
        id: testPresetId,
        user_id: testUserId,
        name: 'Default Preset',
        is_default: true,
      };

      presetRepo.findOne.mockResolvedValue(defaultPreset);

      // Act
      const result = await service.getDefaultPreset(testUserId);

      // Assert
      expect(result).toEqual(defaultPreset);
      expect(presetRepo.findOne).toHaveBeenCalledWith({
        where: { user_id: testUserId, is_default: true },
      });
    });

    it('should return null when no default preset exists', async () => {
      // Arrange
      presetRepo.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getDefaultPreset(testUserId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('reorder', () => {
    it('should update sort_order for presets', async () => {
      // Arrange
      const preset1 = { id: 'preset-1', user_id: testUserId, sort_order: 0 };
      const preset2 = { id: 'preset-2', user_id: testUserId, sort_order: 0 };

      presetRepo.findOne.mockResolvedValueOnce(preset1).mockResolvedValueOnce(preset2);
      presetRepo.save.mockImplementation((data: any) => Promise.resolve(data));

      const presetOrder = [
        { id: 'preset-1', sort_order: 2 },
        { id: 'preset-2', sort_order: 1 },
      ];

      // Act
      await service.reorder(testUserId, presetOrder);

      // Assert
      expect(presetRepo.findOne).toHaveBeenCalledTimes(2);
      expect(presetRepo.save).toHaveBeenCalledTimes(2);
      expect(presetRepo.save).toHaveBeenCalledWith(expect.objectContaining({ sort_order: 2 }));
      expect(presetRepo.save).toHaveBeenCalledWith(expect.objectContaining({ sort_order: 1 }));
    });

    it('should skip presets that do not exist', async () => {
      // Arrange
      const preset1 = { id: 'preset-1', user_id: testUserId, sort_order: 0 };

      presetRepo.findOne.mockResolvedValueOnce(preset1).mockResolvedValueOnce(null); // preset-2 doesn't exist

      const presetOrder = [
        { id: 'preset-1', sort_order: 1 },
        { id: 'preset-2', sort_order: 2 }, // This one doesn't exist
      ];

      // Act
      await service.reorder(testUserId, presetOrder);

      // Assert
      expect(presetRepo.save).toHaveBeenCalledTimes(1); // Only preset-1 saved
    });

    it('should only update presets belonging to user', async () => {
      // Arrange
      presetRepo.findOne.mockResolvedValue(null); // User doesn't own the preset

      const presetOrder = [{ id: 'other-users-preset', sort_order: 1 }];

      // Act
      await service.reorder(testUserId, presetOrder);

      // Assert
      expect(presetRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'other-users-preset', user_id: testUserId },
      });
      expect(presetRepo.save).not.toHaveBeenCalled();
    });

    it('should handle empty preset order', async () => {
      // Arrange
      const presetOrder: Array<{ id: string; sort_order: number }> = [];

      // Act
      await service.reorder(testUserId, presetOrder);

      // Assert
      expect(presetRepo.findOne).not.toHaveBeenCalled();
      expect(presetRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('Filter persistence', () => {
    it('should preserve all filter fields when saving', async () => {
      // Arrange
      const createDto = {
        name: 'Full Filters',
        filters: {
          level_type: 'MACHINE',
          level_ref_id: 'machine-id',
          nomenclature_id: 'nom-id',
          session_id: 'session-id',
          date_from: '2025-01-01',
          date_to: '2025-12-31',
          severity: 'CRITICAL',
          threshold_exceeded_only: true,
        },
        is_default: false,
      };

      presetRepo.create.mockImplementation((data: any) => ({ id: testPresetId, ...data }));
      presetRepo.save.mockImplementation((data: any) => Promise.resolve(data));

      // Act
      const result = await service.create(testUserId, createDto);

      // Assert
      expect(result.filters).toEqual(createDto.filters);
      expect(result.filters.level_type).toBe('MACHINE');
      expect(result.filters.threshold_exceeded_only).toBe(true);
    });

    it('should allow empty filters', async () => {
      // Arrange
      const createDto = {
        name: 'No Filters',
        filters: {},
        is_default: false,
      };

      presetRepo.create.mockImplementation((data: any) => ({ id: testPresetId, ...data }));
      presetRepo.save.mockImplementation((data: any) => Promise.resolve(data));

      // Act
      const result = await service.create(testUserId, createDto);

      // Assert
      expect(result.filters).toEqual({});
    });
  });
});
