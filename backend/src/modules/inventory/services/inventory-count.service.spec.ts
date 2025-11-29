import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { InventoryCountService } from './inventory-count.service';
import {
  InventoryActualCount,
  InventoryLevelType,
} from '../entities/inventory-actual-count.entity';
import { createMockRepository } from '@/test/helpers';

/**
 * Unit Tests for InventoryCountService
 *
 * Tests the management of actual inventory counts (physical inventory checks).
 */
describe('InventoryCountService', () => {
  let service: InventoryCountService;
  let actualCountRepo: any;

  // Test fixtures
  const testUserId = '11111111-1111-1111-1111-111111111111';
  const testNomenclatureId = '22222222-2222-2222-2222-222222222222';
  const testOperatorId = '33333333-3333-3333-3333-333333333333';
  const testMachineId = '44444444-4444-4444-4444-444444444444';
  const testSessionId = '55555555-5555-5555-5555-555555555555';

  beforeEach(async () => {
    actualCountRepo = createMockRepository<InventoryActualCount>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryCountService,
        {
          provide: getRepositoryToken(InventoryActualCount),
          useValue: actualCountRepo,
        },
      ],
    }).compile();

    service = module.get<InventoryCountService>(InventoryCountService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createActualCount', () => {
    it('should create a single actual count', async () => {
      // Arrange
      const dto = {
        nomenclature_id: testNomenclatureId,
        level_type: InventoryLevelType.MACHINE,
        level_ref_id: testMachineId,
        counted_at: '2025-06-15T10:00:00Z',
        actual_quantity: 25,
        unit_of_measure: 'units',
        notes: 'Physical count during inspection',
      };

      const expectedCount = {
        id: 'count-1',
        ...dto,
        counted_at: new Date(dto.counted_at),
        counted_by_user_id: testUserId,
      };

      actualCountRepo.create.mockReturnValue(expectedCount);
      actualCountRepo.save.mockResolvedValue(expectedCount);

      // Act
      const result = await service.createActualCount(dto, testUserId);

      // Assert
      expect(result).toEqual(expectedCount);
      expect(actualCountRepo.create).toHaveBeenCalledWith({
        ...dto,
        counted_by_user_id: testUserId,
        counted_at: new Date(dto.counted_at),
      });
      expect(actualCountRepo.save).toHaveBeenCalled();
    });

    it('should handle count for operator level', async () => {
      // Arrange
      const dto = {
        nomenclature_id: testNomenclatureId,
        level_type: InventoryLevelType.OPERATOR,
        level_ref_id: testOperatorId,
        counted_at: '2025-06-15T10:00:00Z',
        actual_quantity: 50,
      };

      actualCountRepo.create.mockReturnValue({ id: 'count-1', ...dto });
      actualCountRepo.save.mockResolvedValue({ id: 'count-1', ...dto });

      // Act
      const result = await service.createActualCount(dto, testUserId);

      // Assert
      expect(result.level_type).toBe(InventoryLevelType.OPERATOR);
    });

    it('should handle count for warehouse level', async () => {
      // Arrange
      const warehouseId = 'wh-1';
      const dto = {
        nomenclature_id: testNomenclatureId,
        level_type: InventoryLevelType.WAREHOUSE,
        level_ref_id: warehouseId,
        counted_at: '2025-06-15T10:00:00Z',
        actual_quantity: 500,
      };

      actualCountRepo.create.mockReturnValue({ id: 'count-1', ...dto });
      actualCountRepo.save.mockResolvedValue({ id: 'count-1', ...dto });

      // Act
      const result = await service.createActualCount(dto, testUserId);

      // Assert
      expect(result.level_type).toBe(InventoryLevelType.WAREHOUSE);
    });
  });

  describe('createBatchCount', () => {
    it('should create multiple counts in a batch with auto-generated session_id', async () => {
      // Arrange
      const dto = {
        level_type: InventoryLevelType.MACHINE,
        level_ref_id: testMachineId,
        counted_at: '2025-06-15T10:00:00Z',
        items: [
          { nomenclature_id: 'nom-1', actual_quantity: 10 },
          { nomenclature_id: 'nom-2', actual_quantity: 20 },
          { nomenclature_id: 'nom-3', actual_quantity: 30 },
        ],
      };

      actualCountRepo.create.mockImplementation((data: any) => ({
        id: `count-${Math.random()}`,
        ...data,
      }));
      actualCountRepo.save.mockImplementation((counts: any) => Promise.resolve(counts));

      // Act
      const result = await service.createBatchCount(dto, testUserId);

      // Assert
      expect(result).toHaveLength(3);
      expect(actualCountRepo.create).toHaveBeenCalledTimes(3);
      // All should have the same session_id
      const sessionIds = result.map((r) => r.session_id);
      expect(new Set(sessionIds).size).toBe(1);
    });

    it('should use provided session_id when specified', async () => {
      // Arrange
      const customSessionId = 'custom-session-123';
      const dto = {
        level_type: InventoryLevelType.MACHINE,
        level_ref_id: testMachineId,
        counted_at: '2025-06-15T10:00:00Z',
        session_id: customSessionId,
        items: [{ nomenclature_id: 'nom-1', actual_quantity: 10 }],
      };

      actualCountRepo.create.mockImplementation((data: any) => ({
        id: 'count-1',
        ...data,
      }));
      actualCountRepo.save.mockImplementation((counts: any) => Promise.resolve(counts));

      // Act
      const result = await service.createBatchCount(dto, testUserId);

      // Assert
      expect(result[0].session_id).toBe(customSessionId);
    });

    it('should apply notes and metadata to all items', async () => {
      // Arrange
      const dto = {
        level_type: InventoryLevelType.MACHINE,
        level_ref_id: testMachineId,
        counted_at: '2025-06-15T10:00:00Z',
        notes: 'Monthly inventory check',
        metadata: { audit_id: 'audit-123' },
        items: [
          { nomenclature_id: 'nom-1', actual_quantity: 10 },
          { nomenclature_id: 'nom-2', actual_quantity: 20, notes: 'Item-specific note' },
        ],
      };

      actualCountRepo.create.mockImplementation((data: any) => data);
      actualCountRepo.save.mockImplementation((counts: any) => Promise.resolve(counts));

      // Act
      const result = await service.createBatchCount(dto, testUserId);

      // Assert
      // First item should use batch notes
      expect(result[0].notes).toBe('Monthly inventory check');
      // Second item should use item-specific notes
      expect(result[1].notes).toBe('Item-specific note');
      // Both should have metadata
      expect(result[0].metadata).toEqual({ audit_id: 'audit-123' });
    });

    it('should handle unit_of_measure for items', async () => {
      // Arrange
      const dto = {
        level_type: InventoryLevelType.MACHINE,
        level_ref_id: testMachineId,
        counted_at: '2025-06-15T10:00:00Z',
        items: [
          { nomenclature_id: 'nom-1', actual_quantity: 10, unit_of_measure: 'kg' },
          { nomenclature_id: 'nom-2', actual_quantity: 20 }, // No unit
        ],
      };

      actualCountRepo.create.mockImplementation((data: any) => data);
      actualCountRepo.save.mockImplementation((counts: any) => Promise.resolve(counts));

      // Act
      const result = await service.createBatchCount(dto, testUserId);

      // Assert
      expect(result[0].unit_of_measure).toBe('kg');
      expect(result[1].unit_of_measure).toBeNull();
    });
  });

  describe('getActualCounts', () => {
    it('should return counts with pagination', async () => {
      // Arrange
      const mockCounts = [
        { id: 'count-1', actual_quantity: 10 },
        { id: 'count-2', actual_quantity: 20 },
      ];

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockCounts, 2]),
      };

      actualCountRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      const filters = {
        limit: 10,
        offset: 0,
      };

      // Act
      const result = await service.getActualCounts(filters);

      // Assert
      expect(result.data).toEqual(mockCounts);
      expect(result.total).toBe(2);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
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

      const filters = {
        level_type: InventoryLevelType.MACHINE,
      };

      // Act
      await service.getActualCounts(filters);

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

      const filters = {
        level_ref_id: testMachineId,
      };

      // Act
      await service.getActualCounts(filters);

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

      const filters = {
        nomenclature_id: testNomenclatureId,
      };

      // Act
      await service.getActualCounts(filters);

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('ac.nomenclature_id = :nomenclatureId', {
        nomenclatureId: testNomenclatureId,
      });
    });

    it('should filter by session_id', async () => {
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

      const filters = {
        session_id: testSessionId,
      };

      // Act
      await service.getActualCounts(filters);

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('ac.session_id = :sessionId', {
        sessionId: testSessionId,
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

      const filters = {
        date_from: '2025-01-01',
        date_to: '2025-12-31',
      };

      // Act
      await service.getActualCounts(filters);

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('ac.counted_at >= :dateFrom', {
        dateFrom: new Date('2025-01-01'),
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('ac.counted_at <= :dateTo', {
        dateTo: new Date('2025-12-31'),
      });
    });

    it('should filter by counted_by_user_id', async () => {
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

      const filters = {
        counted_by_user_id: testUserId,
      };

      // Act
      await service.getActualCounts(filters);

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('ac.counted_by_user_id = :countedBy', {
        countedBy: testUserId,
      });
    });

    it('should use default pagination when not specified', async () => {
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
      await service.getActualCounts({});

      // Assert
      expect(queryBuilder.take).toHaveBeenCalledWith(100); // Default limit
      expect(queryBuilder.skip).toHaveBeenCalledWith(0); // Default offset
    });
  });

  describe('getLatestCount', () => {
    it('should return the latest count for nomenclature at level', async () => {
      // Arrange
      const latestCount = {
        id: 'count-1',
        nomenclature_id: testNomenclatureId,
        level_type: InventoryLevelType.MACHINE,
        level_ref_id: testMachineId,
        actual_quantity: 25,
        counted_at: new Date('2025-06-15'),
      };

      actualCountRepo.findOne.mockResolvedValue(latestCount);

      // Act
      const result = await service.getLatestCount(
        testNomenclatureId,
        InventoryLevelType.MACHINE,
        testMachineId,
      );

      // Assert
      expect(result).toEqual(latestCount);
      expect(actualCountRepo.findOne).toHaveBeenCalledWith({
        where: {
          nomenclature_id: testNomenclatureId,
          level_type: InventoryLevelType.MACHINE,
          level_ref_id: testMachineId,
        },
        order: { counted_at: 'DESC' },
      });
    });

    it('should return null if no count exists', async () => {
      // Arrange
      actualCountRepo.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getLatestCount(
        testNomenclatureId,
        InventoryLevelType.MACHINE,
        testMachineId,
      );

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getActualCountById', () => {
    it('should return count by ID with relations', async () => {
      // Arrange
      const count = {
        id: 'count-1',
        nomenclature_id: testNomenclatureId,
        actual_quantity: 25,
        nomenclature: { id: testNomenclatureId, name: 'Coffee Beans' },
        counted_by: { id: testUserId, full_name: 'John Doe' },
      };

      actualCountRepo.findOne.mockResolvedValue(count);

      // Act
      const result = await service.getActualCountById('count-1');

      // Assert
      expect(result).toEqual(count);
      expect(actualCountRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'count-1' },
        relations: ['nomenclature', 'counted_by'],
      });
    });

    it('should throw NotFoundException if count not found', async () => {
      // Arrange
      actualCountRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.getActualCountById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getActualCountById('non-existent-id')).rejects.toThrow(
        'Actual count with ID non-existent-id not found',
      );
    });
  });

  describe('getInventorySessions', () => {
    it('should return aggregated inventory sessions', async () => {
      // Arrange
      const sessions = [
        {
          session_id: 'session-1',
          counted_at: new Date('2025-06-15'),
          level_type: InventoryLevelType.MACHINE,
          level_ref_id: testMachineId,
          counted_by_user_id: testUserId,
          total_items: 10,
        },
      ];

      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(sessions),
      };

      actualCountRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      // Act
      const result = await service.getInventorySessions();

      // Assert
      expect(result).toEqual(sessions);
      expect(queryBuilder.where).toHaveBeenCalledWith('ac.session_id IS NOT NULL');
    });

    it('should filter sessions by level_type', async () => {
      // Arrange
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      actualCountRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      // Act
      await service.getInventorySessions(InventoryLevelType.MACHINE);

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('ac.level_type = :levelType', {
        levelType: InventoryLevelType.MACHINE,
      });
    });

    it('should filter sessions by level_ref_id', async () => {
      // Arrange
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      actualCountRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      // Act
      await service.getInventorySessions(undefined, testMachineId);

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('ac.level_ref_id = :levelRefId', {
        levelRefId: testMachineId,
      });
    });

    it('should filter sessions by date range', async () => {
      // Arrange
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      actualCountRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      // Act
      await service.getInventorySessions(undefined, undefined, '2025-01-01', '2025-12-31');

      // Assert
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('ac.counted_at >= :dateFrom', {
        dateFrom: new Date('2025-01-01'),
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('ac.counted_at <= :dateTo', {
        dateTo: new Date('2025-12-31'),
      });
    });
  });

  describe('getInventorizationReport', () => {
    it('should return detailed inventorization report for session', async () => {
      // Arrange
      const counts = [
        {
          id: 'count-1',
          nomenclature_id: 'nom-1',
          actual_quantity: 10,
          level_type: InventoryLevelType.MACHINE,
          level_ref_id: testMachineId,
          session_id: testSessionId,
          counted_at: new Date('2025-06-15'),
          counted_by_user_id: testUserId,
          nomenclature: { name: 'Coffee Beans' },
          counted_by: { id: testUserId, full_name: 'John Doe' },
          notes: null,
          unit_of_measure: null,
        },
        {
          id: 'count-2',
          nomenclature_id: 'nom-2',
          actual_quantity: 20,
          level_type: InventoryLevelType.MACHINE,
          level_ref_id: testMachineId,
          session_id: testSessionId,
          counted_at: new Date('2025-06-15'),
          counted_by_user_id: testUserId,
          nomenclature: { name: 'Milk' },
          counted_by: { id: testUserId, full_name: 'John Doe' },
          notes: null,
          unit_of_measure: null,
        },
      ];

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(counts),
      };

      actualCountRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      // Act
      const result = await service.getInventorizationReport(testSessionId);

      // Assert
      expect(result.summary.session_id).toBe(testSessionId);
      expect(result.summary.total_items_counted).toBe(2);
      expect(result.summary.unique_products).toBe(2);
      expect(result.summary.total_quantity).toBe(30);
      expect(result.items).toHaveLength(2);
      expect(result.product_stats).toHaveLength(2);
    });

    it('should throw NotFoundException if session not found', async () => {
      // Arrange
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      actualCountRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      // Act & Assert
      await expect(service.getInventorizationReport('non-existent-session')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should calculate product statistics correctly', async () => {
      // Arrange
      const counts = [
        {
          id: 'count-1',
          nomenclature_id: 'nom-1',
          actual_quantity: 10,
          level_type: InventoryLevelType.MACHINE,
          level_ref_id: testMachineId,
          session_id: testSessionId,
          counted_at: new Date('2025-06-15'),
          counted_by_user_id: testUserId,
          nomenclature: { name: 'Coffee Beans' },
          counted_by: { id: testUserId, full_name: 'John Doe' },
        },
        {
          id: 'count-2',
          nomenclature_id: 'nom-1', // Same product
          actual_quantity: 15,
          level_type: InventoryLevelType.MACHINE,
          level_ref_id: 'machine-2',
          session_id: testSessionId,
          counted_at: new Date('2025-06-15'),
          counted_by_user_id: testUserId,
          nomenclature: { name: 'Coffee Beans' },
          counted_by: { id: testUserId, full_name: 'John Doe' },
        },
      ];

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(counts),
      };

      actualCountRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      // Act
      const result = await service.getInventorizationReport(testSessionId);

      // Assert
      expect(result.product_stats).toHaveLength(1); // Same product aggregated
      expect(result.product_stats[0].total_quantity).toBe(25); // 10 + 15
      expect(result.product_stats[0].items_counted).toBe(2);
      expect(result.product_stats[0].avg_quantity).toBe(12.5); // 25 / 2
    });

    it('should calculate location statistics correctly', async () => {
      // Arrange
      const counts = [
        {
          id: 'count-1',
          nomenclature_id: 'nom-1',
          actual_quantity: 10,
          level_type: InventoryLevelType.MACHINE,
          level_ref_id: testMachineId,
          session_id: testSessionId,
          counted_at: new Date('2025-06-15'),
          counted_by_user_id: testUserId,
          nomenclature: { name: 'Coffee Beans' },
          counted_by: { id: testUserId, full_name: 'John Doe' },
        },
        {
          id: 'count-2',
          nomenclature_id: 'nom-2',
          actual_quantity: 20,
          level_type: InventoryLevelType.MACHINE,
          level_ref_id: testMachineId, // Same location
          session_id: testSessionId,
          counted_at: new Date('2025-06-15'),
          counted_by_user_id: testUserId,
          nomenclature: { name: 'Milk' },
          counted_by: { id: testUserId, full_name: 'John Doe' },
        },
      ];

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(counts),
      };

      actualCountRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      // Act
      const result = await service.getInventorizationReport(testSessionId);

      // Assert
      expect(result.location_stats).toHaveLength(1);
      expect(result.location_stats[0].level_ref_id).toBe(testMachineId);
      expect(result.location_stats[0].items_counted).toBe(2);
      expect(result.location_stats[0].unique_products).toBe(2);
      expect(result.location_stats[0].total_quantity).toBe(30);
    });

    it('should calculate operator statistics correctly', async () => {
      // Arrange
      const user1Id = 'user-1';
      const user2Id = 'user-2';
      const counts = [
        {
          id: 'count-1',
          nomenclature_id: 'nom-1',
          actual_quantity: 10,
          level_type: InventoryLevelType.MACHINE,
          level_ref_id: testMachineId,
          session_id: testSessionId,
          counted_at: new Date('2025-06-15'),
          counted_by_user_id: user1Id,
          nomenclature: { name: 'Coffee Beans' },
          counted_by: { id: user1Id, full_name: 'John Doe' },
        },
        {
          id: 'count-2',
          nomenclature_id: 'nom-2',
          actual_quantity: 20,
          level_type: InventoryLevelType.MACHINE,
          level_ref_id: testMachineId,
          session_id: testSessionId,
          counted_at: new Date('2025-06-15'),
          counted_by_user_id: user2Id,
          nomenclature: { name: 'Milk' },
          counted_by: { id: user2Id, full_name: 'Jane Smith' },
        },
      ];

      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(counts),
      };

      actualCountRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      // Act
      const result = await service.getInventorizationReport(testSessionId);

      // Assert
      expect(result.operator_stats).toHaveLength(2);
      const johnStats = result.operator_stats.find((s: any) => s.user_id === user1Id);
      const janeStats = result.operator_stats.find((s: any) => s.user_id === user2Id);
      expect(johnStats?.items_counted).toBe(1);
      expect(janeStats?.items_counted).toBe(1);
    });
  });
});
