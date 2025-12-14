import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InventoryDifferenceService } from './inventory-difference.service';
import { InventoryCalculationService } from './inventory-calculation.service';
import { InventoryThresholdActionsService } from './inventory-threshold-actions.service';
import {
  InventoryActualCount,
  InventoryLevelType,
} from '../entities/inventory-actual-count.entity';
import {
  InventoryDifferenceThreshold,
  ThresholdType,
  SeverityLevel,
} from '../entities/inventory-difference-threshold.entity';
import { createMockRepository } from '@/test/helpers';

/**
 * Unit Tests for InventoryDifferenceService
 *
 * Tests the comparison of calculated vs actual inventory balances.
 */
describe('InventoryDifferenceService', () => {
  let service: InventoryDifferenceService;
  let actualCountRepo: any;
  let thresholdRepo: any;
  let calculationService: any;
  let thresholdActionsService: any;

  // Test fixtures
  const testUserId = '11111111-1111-1111-1111-111111111111';
  const testNomenclatureId = '22222222-2222-2222-2222-222222222222';
  const testMachineId = '33333333-3333-3333-3333-333333333333';
  const testOperatorId = '44444444-4444-4444-4444-444444444444';

  beforeEach(async () => {
    actualCountRepo = createMockRepository<InventoryActualCount>();
    thresholdRepo = createMockRepository<InventoryDifferenceThreshold>();

    calculationService = {
      calculateBalance: jest.fn(),
    };

    thresholdActionsService = {
      executeThresholdActions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryDifferenceService,
        {
          provide: getRepositoryToken(InventoryActualCount),
          useValue: actualCountRepo,
        },
        {
          provide: getRepositoryToken(InventoryDifferenceThreshold),
          useValue: thresholdRepo,
        },
        {
          provide: InventoryCalculationService,
          useValue: calculationService,
        },
        {
          provide: InventoryThresholdActionsService,
          useValue: thresholdActionsService,
        },
      ],
    }).compile();

    service = module.get<InventoryDifferenceService>(InventoryDifferenceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDifferencesReport', () => {
    it('should return differences report with calculated discrepancies', async () => {
      // Arrange
      const actualCounts = [
        {
          id: 'count-1',
          nomenclature_id: testNomenclatureId,
          level_type: InventoryLevelType.MACHINE,
          level_ref_id: testMachineId,
          actual_quantity: 95,
          counted_at: new Date('2025-06-15'),
          nomenclature: { name: 'Coffee Beans' },
          counted_by: { id: testUserId, full_name: 'John Doe' },
        },
      ];

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([actualCounts, 1]),
      };

      actualCountRepo.createQueryBuilder.mockReturnValue(queryBuilder);
      calculationService.calculateBalance.mockResolvedValue(100); // Calculated: 100, Actual: 95

      // No thresholds exceeded
      thresholdRepo.find.mockResolvedValue([]);

      // Act
      const result = await service.getDifferencesReport({});

      // Assert
      expect(result.data).toHaveLength(1);
      expect(result.data[0].difference_abs).toBe(-5); // 95 - 100
      expect(result.data[0].difference_rel).toBe(-5); // ((95 - 100) / 100) * 100
      expect(result.data[0].calculated_quantity).toBe(100);
      expect(result.data[0].actual_quantity).toBe(95);
    });

    it('should calculate positive difference correctly', async () => {
      // Arrange
      const actualCounts = [
        {
          id: 'count-1',
          nomenclature_id: testNomenclatureId,
          level_type: InventoryLevelType.MACHINE,
          level_ref_id: testMachineId,
          actual_quantity: 110, // More than calculated
          counted_at: new Date('2025-06-15'),
          nomenclature: { name: 'Coffee Beans' },
          counted_by: { id: testUserId, full_name: 'John Doe' },
        },
      ];

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([actualCounts, 1]),
      };

      actualCountRepo.createQueryBuilder.mockReturnValue(queryBuilder);
      calculationService.calculateBalance.mockResolvedValue(100);
      thresholdRepo.find.mockResolvedValue([]);

      // Act
      const result = await service.getDifferencesReport({});

      // Assert
      expect(result.data[0].difference_abs).toBe(10); // 110 - 100
      expect(result.data[0].difference_rel).toBe(10); // ((110 - 100) / 100) * 100
    });

    it('should handle zero calculated quantity without division by zero', async () => {
      // Arrange
      const actualCounts = [
        {
          id: 'count-1',
          nomenclature_id: testNomenclatureId,
          level_type: InventoryLevelType.MACHINE,
          level_ref_id: testMachineId,
          actual_quantity: 5,
          counted_at: new Date('2025-06-15'),
          nomenclature: { name: 'Coffee Beans' },
          counted_by: { id: testUserId, full_name: 'John Doe' },
        },
      ];

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([actualCounts, 1]),
      };

      actualCountRepo.createQueryBuilder.mockReturnValue(queryBuilder);
      calculationService.calculateBalance.mockResolvedValue(0); // Zero calculated
      thresholdRepo.find.mockResolvedValue([]);

      // Act
      const result = await service.getDifferencesReport({});

      // Assert
      expect(result.data[0].difference_rel).toBe(0); // Should not be Infinity
    });

    it('should filter by level_type', async () => {
      // Arrange
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      actualCountRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      // Act
      await service.getDifferencesReport({ level_type: InventoryLevelType.MACHINE });

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('ac.level_type = :levelType', {
        levelType: InventoryLevelType.MACHINE,
      });
    });

    it('should filter by level_ref_id', async () => {
      // Arrange
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      actualCountRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      // Act
      await service.getDifferencesReport({ level_ref_id: testMachineId });

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('ac.level_ref_id = :levelRefId', {
        levelRefId: testMachineId,
      });
    });

    it('should filter by nomenclature_id', async () => {
      // Arrange
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      actualCountRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      // Act
      await service.getDifferencesReport({ nomenclature_id: testNomenclatureId });

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('ac.nomenclature_id = :nomenclatureId', {
        nomenclatureId: testNomenclatureId,
      });
    });

    it('should filter by date range', async () => {
      // Arrange
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      actualCountRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      // Act
      await service.getDifferencesReport({
        date_from: '2025-01-01',
        date_to: '2025-12-31',
      });

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('ac.counted_at >= :dateFrom', {
        dateFrom: new Date('2025-01-01'),
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('ac.counted_at <= :dateTo', {
        dateTo: new Date('2025-12-31'),
      });
    });

    it('should filter by severity', async () => {
      // Arrange
      const actualCounts = [
        {
          id: 'count-1',
          nomenclature_id: testNomenclatureId,
          level_type: InventoryLevelType.MACHINE,
          level_ref_id: testMachineId,
          actual_quantity: 95,
          counted_at: new Date('2025-06-15'),
          nomenclature: { name: 'Coffee Beans' },
          counted_by: { id: testUserId, full_name: 'John Doe' },
        },
      ];

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([actualCounts, 1]),
      };

      actualCountRepo.createQueryBuilder.mockReturnValue(queryBuilder);
      calculationService.calculateBalance.mockResolvedValue(100);
      thresholdRepo.find.mockResolvedValue([]); // Returns INFO severity by default

      // Act - Filter for CRITICAL only
      const result = await service.getDifferencesReport({
        severity: SeverityLevel.CRITICAL,
      });

      // Assert - Should filter out INFO severity items
      expect(result.data).toHaveLength(0);
    });

    it('should filter by threshold_exceeded_only', async () => {
      // Arrange
      const actualCounts = [
        {
          id: 'count-1',
          nomenclature_id: testNomenclatureId,
          level_type: InventoryLevelType.MACHINE,
          level_ref_id: testMachineId,
          actual_quantity: 99, // Only 1 unit difference
          counted_at: new Date('2025-06-15'),
          nomenclature: { name: 'Coffee Beans' },
          counted_by: { id: testUserId, full_name: 'John Doe' },
        },
      ];

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([actualCounts, 1]),
      };

      actualCountRepo.createQueryBuilder.mockReturnValue(queryBuilder);
      calculationService.calculateBalance.mockResolvedValue(100);
      thresholdRepo.find.mockResolvedValue([]); // No thresholds exceeded

      // Act
      const result = await service.getDifferencesReport({
        threshold_exceeded_only: true,
      });

      // Assert - Should filter out non-exceeded items
      expect(result.data).toHaveLength(0);
    });
  });

  describe('calculateDifferenceForCount', () => {
    it('should calculate difference for a single count', async () => {
      // Arrange
      const actualCount = {
        id: 'count-1',
        nomenclature_id: testNomenclatureId,
        level_type: InventoryLevelType.MACHINE,
        level_ref_id: testMachineId,
        actual_quantity: 85,
        counted_at: new Date('2025-06-15'),
        nomenclature: { name: 'Coffee Beans' },
        counted_by: { id: testUserId, full_name: 'John Doe' },
      };

      calculationService.calculateBalance.mockResolvedValue(100);
      thresholdRepo.find.mockResolvedValue([]);

      // Act
      const result = await service.calculateDifferenceForCount(actualCount as any);

      // Assert
      expect(result.actual_count_id).toBe('count-1');
      expect(result.nomenclature_id).toBe(testNomenclatureId);
      expect(result.calculated_quantity).toBe(100);
      expect(result.actual_quantity).toBe(85);
      expect(result.difference_abs).toBe(-15);
      expect(result.difference_rel).toBe(-15);
      expect(result.severity).toBe(SeverityLevel.INFO);
      expect(result.threshold_exceeded).toBe(false);
    });

    it('should use calculation service with correct parameters', async () => {
      // Arrange
      const countedAt = new Date('2025-06-15');
      const actualCount = {
        id: 'count-1',
        nomenclature_id: testNomenclatureId,
        level_type: InventoryLevelType.OPERATOR,
        level_ref_id: testOperatorId,
        actual_quantity: 50,
        counted_at: countedAt,
        nomenclature: { name: 'Coffee Beans' },
        counted_by: { id: testUserId, full_name: 'John Doe' },
      };

      calculationService.calculateBalance.mockResolvedValue(50);
      thresholdRepo.find.mockResolvedValue([]);

      // Act
      await service.calculateDifferenceForCount(actualCount as any);

      // Assert
      expect(calculationService.calculateBalance).toHaveBeenCalledWith(
        testNomenclatureId,
        InventoryLevelType.OPERATOR,
        testOperatorId,
        countedAt,
      );
    });
  });

  describe('Threshold evaluation', () => {
    it('should identify CRITICAL severity when absolute threshold exceeded', async () => {
      // Arrange
      const actualCount = {
        id: 'count-1',
        nomenclature_id: testNomenclatureId,
        level_type: InventoryLevelType.MACHINE,
        level_ref_id: testMachineId,
        actual_quantity: 50,
        counted_at: new Date('2025-06-15'),
        nomenclature: { name: 'Coffee Beans' },
        counted_by: { id: testUserId, full_name: 'John Doe' },
      };

      const threshold = {
        id: 'threshold-1',
        name: 'Critical Machine Threshold',
        threshold_type: ThresholdType.GLOBAL,
        threshold_abs: 10,
        threshold_rel: null,
        severity_level: SeverityLevel.CRITICAL,
        is_active: true,
        priority: 10,
      };

      calculationService.calculateBalance.mockResolvedValue(100); // Diff = -50
      thresholdRepo.find.mockResolvedValue([threshold]);

      // Act
      const result = await service.calculateDifferenceForCount(actualCount as any);

      // Assert
      expect(result.severity).toBe(SeverityLevel.CRITICAL);
      expect(result.threshold_exceeded).toBe(true);
      expect(result.applied_threshold?.id).toBe('threshold-1');
    });

    it('should identify WARNING severity when relative threshold exceeded', async () => {
      // Arrange
      const actualCount = {
        id: 'count-1',
        nomenclature_id: testNomenclatureId,
        level_type: InventoryLevelType.MACHINE,
        level_ref_id: testMachineId,
        actual_quantity: 80, // 20% difference
        counted_at: new Date('2025-06-15'),
        nomenclature: { name: 'Coffee Beans' },
        counted_by: { id: testUserId, full_name: 'John Doe' },
      };

      const threshold = {
        id: 'threshold-1',
        name: 'Warning Threshold',
        threshold_type: ThresholdType.GLOBAL,
        threshold_abs: null,
        threshold_rel: 15, // 15% threshold
        severity_level: SeverityLevel.WARNING,
        is_active: true,
        priority: 5,
      };

      calculationService.calculateBalance.mockResolvedValue(100);
      thresholdRepo.find.mockResolvedValue([threshold]);

      // Act
      const result = await service.calculateDifferenceForCount(actualCount as any);

      // Assert
      expect(result.severity).toBe(SeverityLevel.WARNING);
      expect(result.threshold_exceeded).toBe(true);
    });

    it('should apply nomenclature-specific threshold correctly', async () => {
      // Arrange
      const actualCount = {
        id: 'count-1',
        nomenclature_id: testNomenclatureId,
        level_type: InventoryLevelType.MACHINE,
        level_ref_id: testMachineId,
        actual_quantity: 95,
        counted_at: new Date('2025-06-15'),
        nomenclature: { name: 'Coffee Beans' },
        counted_by: { id: testUserId, full_name: 'John Doe' },
      };

      const nomenclatureThreshold = {
        id: 'threshold-nom',
        name: 'Coffee Beans Threshold',
        threshold_type: ThresholdType.NOMENCLATURE,
        reference_id: testNomenclatureId,
        threshold_abs: 3, // Very strict threshold
        threshold_rel: null,
        severity_level: SeverityLevel.CRITICAL,
        is_active: true,
        priority: 20, // Higher priority
      };

      const globalThreshold = {
        id: 'threshold-global',
        name: 'Global Threshold',
        threshold_type: ThresholdType.GLOBAL,
        reference_id: null,
        threshold_abs: 10,
        threshold_rel: null,
        severity_level: SeverityLevel.WARNING,
        is_active: true,
        priority: 5, // Lower priority
      };

      calculationService.calculateBalance.mockResolvedValue(100); // Diff = -5
      thresholdRepo.find.mockResolvedValue([nomenclatureThreshold, globalThreshold]);

      // Act
      const result = await service.calculateDifferenceForCount(actualCount as any);

      // Assert - Should use nomenclature threshold (higher priority)
      expect(result.applied_threshold?.id).toBe('threshold-nom');
      expect(result.severity).toBe(SeverityLevel.CRITICAL);
    });

    it('should apply machine-specific threshold only for machine level', async () => {
      // Arrange
      const actualCount = {
        id: 'count-1',
        nomenclature_id: testNomenclatureId,
        level_type: InventoryLevelType.MACHINE,
        level_ref_id: testMachineId,
        actual_quantity: 95,
        counted_at: new Date('2025-06-15'),
        nomenclature: { name: 'Coffee Beans' },
        counted_by: { id: testUserId, full_name: 'John Doe' },
      };

      const machineThreshold = {
        id: 'threshold-machine',
        name: 'Machine Specific',
        threshold_type: ThresholdType.MACHINE,
        reference_id: testMachineId,
        threshold_abs: 2,
        threshold_rel: null,
        severity_level: SeverityLevel.CRITICAL,
        is_active: true,
        priority: 15,
      };

      calculationService.calculateBalance.mockResolvedValue(100);
      thresholdRepo.find.mockResolvedValue([machineThreshold]);

      // Act
      const result = await service.calculateDifferenceForCount(actualCount as any);

      // Assert
      expect(result.applied_threshold?.id).toBe('threshold-machine');
    });

    it('should not apply machine threshold to operator level', async () => {
      // Arrange
      const actualCount = {
        id: 'count-1',
        nomenclature_id: testNomenclatureId,
        level_type: InventoryLevelType.OPERATOR, // Not machine level
        level_ref_id: testOperatorId,
        actual_quantity: 95,
        counted_at: new Date('2025-06-15'),
        nomenclature: { name: 'Coffee Beans' },
        counted_by: { id: testUserId, full_name: 'John Doe' },
      };

      const machineThreshold = {
        id: 'threshold-machine',
        name: 'Machine Specific',
        threshold_type: ThresholdType.MACHINE,
        reference_id: testMachineId,
        threshold_abs: 2,
        threshold_rel: null,
        severity_level: SeverityLevel.CRITICAL,
        is_active: true,
        priority: 15,
      };

      calculationService.calculateBalance.mockResolvedValue(100);
      thresholdRepo.find.mockResolvedValue([machineThreshold]);

      // Act
      const result = await service.calculateDifferenceForCount(actualCount as any);

      // Assert - Should not apply machine threshold, should be INFO
      expect(result.applied_threshold).toBeNull();
      expect(result.severity).toBe(SeverityLevel.INFO);
    });

    it('should respect threshold priority order', async () => {
      // Arrange
      const actualCount = {
        id: 'count-1',
        nomenclature_id: testNomenclatureId,
        level_type: InventoryLevelType.MACHINE,
        level_ref_id: testMachineId,
        actual_quantity: 85,
        counted_at: new Date('2025-06-15'),
        nomenclature: { name: 'Coffee Beans' },
        counted_by: { id: testUserId, full_name: 'John Doe' },
      };

      const highPriorityThreshold = {
        id: 'threshold-high',
        name: 'High Priority',
        threshold_type: ThresholdType.GLOBAL,
        threshold_abs: 20, // Won't exceed (diff = 15)
        threshold_rel: null,
        severity_level: SeverityLevel.CRITICAL,
        is_active: true,
        priority: 100,
      };

      const lowPriorityThreshold = {
        id: 'threshold-low',
        name: 'Low Priority',
        threshold_type: ThresholdType.GLOBAL,
        threshold_abs: 10, // Will exceed
        threshold_rel: null,
        severity_level: SeverityLevel.WARNING,
        is_active: true,
        priority: 1,
      };

      calculationService.calculateBalance.mockResolvedValue(100);
      thresholdRepo.find.mockResolvedValue([highPriorityThreshold, lowPriorityThreshold]);

      // Act
      const result = await service.calculateDifferenceForCount(actualCount as any);

      // Assert - Should use low priority threshold since high priority wasn't exceeded
      expect(result.applied_threshold?.id).toBe('threshold-low');
      expect(result.severity).toBe(SeverityLevel.WARNING);
    });
  });

  describe('getDifferenceDashboard', () => {
    it('should return aggregated dashboard data', async () => {
      // Arrange
      const actualCounts = [
        {
          id: 'count-1',
          nomenclature_id: 'nom-1',
          level_type: InventoryLevelType.MACHINE,
          level_ref_id: 'machine-1',
          actual_quantity: 90,
          counted_at: new Date('2025-06-15'),
          nomenclature: { name: 'Coffee Beans' },
          counted_by: { id: testUserId, full_name: 'John Doe' },
        },
        {
          id: 'count-2',
          nomenclature_id: 'nom-2',
          level_type: InventoryLevelType.MACHINE,
          level_ref_id: 'machine-1',
          actual_quantity: 100,
          counted_at: new Date('2025-06-15'),
          nomenclature: { name: 'Milk' },
          counted_by: { id: testUserId, full_name: 'John Doe' },
        },
      ];

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([actualCounts, 2]),
      };

      actualCountRepo.createQueryBuilder.mockReturnValue(queryBuilder);
      calculationService.calculateBalance
        .mockResolvedValueOnce(100) // First: diff = -10
        .mockResolvedValueOnce(100); // Second: diff = 0
      thresholdRepo.find.mockResolvedValue([]);

      // Act
      const result = await service.getDifferenceDashboard({});

      // Assert
      expect(result.summary.total_items_counted).toBe(2);
      expect(result.summary.total_discrepancies).toBe(1); // Only one with difference
      expect(result.top_products).toBeDefined();
      expect(result.top_machines).toBeDefined();
      expect(result.top_operators).toBeDefined();
    });

    it('should calculate summary statistics correctly', async () => {
      // Arrange
      const actualCounts = [
        {
          id: 'count-1',
          nomenclature_id: 'nom-1',
          level_type: InventoryLevelType.MACHINE,
          level_ref_id: 'machine-1',
          actual_quantity: 80, // -20 difference
          counted_at: new Date('2025-06-15'),
          nomenclature: { name: 'Coffee Beans' },
          counted_by: { id: testUserId, full_name: 'John Doe' },
        },
        {
          id: 'count-2',
          nomenclature_id: 'nom-2',
          level_type: InventoryLevelType.MACHINE,
          level_ref_id: 'machine-1',
          actual_quantity: 110, // +10 difference
          counted_at: new Date('2025-06-15'),
          nomenclature: { name: 'Milk' },
          counted_by: { id: testUserId, full_name: 'John Doe' },
        },
      ];

      const criticalThreshold = {
        id: 'threshold-1',
        threshold_type: ThresholdType.GLOBAL,
        threshold_abs: 15,
        threshold_rel: null,
        severity_level: SeverityLevel.CRITICAL,
        is_active: true,
        priority: 10,
      };

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([actualCounts, 2]),
      };

      actualCountRepo.createQueryBuilder.mockReturnValue(queryBuilder);
      calculationService.calculateBalance.mockResolvedValue(100);
      thresholdRepo.find.mockResolvedValue([criticalThreshold]);

      // Act
      const result = await service.getDifferenceDashboard({});

      // Assert
      expect(result.summary.total_abs_difference).toBe(30); // |20| + |10|
      expect(result.summary.avg_rel_difference).toBe(15); // (|20| + |10|) / 2
      expect(result.summary.critical_count).toBe(1); // Only -20 exceeds threshold
      expect(result.summary.info_count).toBe(1);
    });

    it('should aggregate top products correctly', async () => {
      // Arrange
      const actualCounts = [
        {
          id: 'count-1',
          nomenclature_id: 'nom-1',
          level_type: InventoryLevelType.MACHINE,
          level_ref_id: 'machine-1',
          actual_quantity: 90,
          counted_at: new Date('2025-06-15'),
          nomenclature: { name: 'Coffee Beans' },
          counted_by: { id: testUserId, full_name: 'John Doe' },
        },
        {
          id: 'count-2',
          nomenclature_id: 'nom-1', // Same product
          level_type: InventoryLevelType.MACHINE,
          level_ref_id: 'machine-2',
          actual_quantity: 85,
          counted_at: new Date('2025-06-15'),
          nomenclature: { name: 'Coffee Beans' },
          counted_by: { id: testUserId, full_name: 'Jane Smith' },
        },
      ];

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([actualCounts, 2]),
      };

      actualCountRepo.createQueryBuilder.mockReturnValue(queryBuilder);
      calculationService.calculateBalance.mockResolvedValue(100);
      thresholdRepo.find.mockResolvedValue([]);

      // Act
      const result = await service.getDifferenceDashboard({});

      // Assert
      expect(result.top_products).toHaveLength(1); // Same product aggregated
      expect(result.top_products[0].count).toBe(2);
      expect(result.top_products[0].total_difference_abs).toBe(25); // |10| + |15|
    });

    it('should aggregate top machines correctly', async () => {
      // Arrange
      const actualCounts = [
        {
          id: 'count-1',
          nomenclature_id: 'nom-1',
          level_type: InventoryLevelType.MACHINE,
          level_ref_id: testMachineId,
          actual_quantity: 90,
          counted_at: new Date('2025-06-15'),
          nomenclature: { name: 'Coffee Beans' },
          counted_by: { id: testUserId, full_name: 'John Doe' },
        },
        {
          id: 'count-2',
          nomenclature_id: 'nom-2',
          level_type: InventoryLevelType.MACHINE,
          level_ref_id: testMachineId, // Same machine
          actual_quantity: 85,
          counted_at: new Date('2025-06-15'),
          nomenclature: { name: 'Milk' },
          counted_by: { id: testUserId, full_name: 'John Doe' },
        },
      ];

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([actualCounts, 2]),
      };

      actualCountRepo.createQueryBuilder.mockReturnValue(queryBuilder);
      calculationService.calculateBalance.mockResolvedValue(100);
      thresholdRepo.find.mockResolvedValue([]);

      // Act
      const result = await service.getDifferenceDashboard({});

      // Assert
      expect(result.top_machines).toHaveLength(1);
      expect(result.top_machines[0].machine_id).toBe(testMachineId);
      expect(result.top_machines[0].count).toBe(2);
    });
  });

  describe('executeThresholdActionsForCount', () => {
    it('should execute actions when threshold exceeded', async () => {
      // Arrange
      const actualCount = {
        id: 'count-1',
        nomenclature_id: testNomenclatureId,
        level_type: InventoryLevelType.MACHINE,
        level_ref_id: testMachineId,
        actual_quantity: 50,
        counted_at: new Date('2025-06-15'),
        nomenclature: { name: 'Coffee Beans' },
        counted_by: { id: testUserId, full_name: 'John Doe' },
      };

      const threshold = {
        id: 'threshold-1',
        name: 'Critical Threshold',
        threshold_type: ThresholdType.GLOBAL,
        threshold_abs: 10,
        threshold_rel: null,
        severity_level: SeverityLevel.CRITICAL,
        is_active: true,
        priority: 10,
        create_incident: true,
        create_task: true,
        notify_users: [testUserId],
      };

      actualCountRepo.findOne.mockResolvedValue(actualCount);
      calculationService.calculateBalance.mockResolvedValue(100);
      thresholdRepo.find.mockResolvedValue([threshold]);
      thresholdRepo.findOne.mockResolvedValue(threshold);
      thresholdActionsService.executeThresholdActions.mockResolvedValue({
        incidentId: 'incident-1',
        taskId: 'task-1',
        notificationsSent: 2,
      });

      // Act
      const result = await service.executeThresholdActionsForCount('count-1', testUserId);

      // Assert
      expect(thresholdActionsService.executeThresholdActions).toHaveBeenCalled();
      expect(result.incidentId).toBe('incident-1');
      expect(result.taskId).toBe('task-1');
      expect(result.notificationsSent).toBe(2);
    });

    it('should return empty results when no threshold exceeded', async () => {
      // Arrange
      const actualCount = {
        id: 'count-1',
        nomenclature_id: testNomenclatureId,
        level_type: InventoryLevelType.MACHINE,
        level_ref_id: testMachineId,
        actual_quantity: 99, // Very small difference
        counted_at: new Date('2025-06-15'),
        nomenclature: { name: 'Coffee Beans' },
        counted_by: { id: testUserId, full_name: 'John Doe' },
      };

      actualCountRepo.findOne.mockResolvedValue(actualCount);
      calculationService.calculateBalance.mockResolvedValue(100);
      thresholdRepo.find.mockResolvedValue([]); // No thresholds

      // Act
      const result = await service.executeThresholdActionsForCount('count-1', testUserId);

      // Assert
      expect(thresholdActionsService.executeThresholdActions).not.toHaveBeenCalled();
      expect(result.notificationsSent).toBe(0);
    });

    it('should throw error when actual count not found', async () => {
      // Arrange
      actualCountRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.executeThresholdActionsForCount('non-existent', testUserId),
      ).rejects.toThrow('Actual count with ID non-existent not found');
    });
  });
});
