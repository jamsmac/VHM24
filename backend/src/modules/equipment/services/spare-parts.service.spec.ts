import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { SparePartsService } from './spare-parts.service';
import { SparePart } from '../entities/spare-part.entity';
import { ComponentType } from '../entities/equipment-component.entity';

describe('SparePartsService', () => {
  let service: SparePartsService;
  let mockRepository: any;

  beforeEach(async () => {
    const mockQueryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      getRawMany: jest.fn().mockResolvedValue([]),
      getRawOne: jest.fn().mockResolvedValue({}),
    };

    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      softRemove: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SparePartsService,
        {
          provide: getRepositoryToken(SparePart),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SparePartsService>(SparePartsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new spare part', async () => {
      const dto = {
        part_number: 'SP-001',
        name: 'Coffee Grinder Blade',
        description: 'Replacement blade for grinder',
        component_type: ComponentType.GRINDER,
        quantity_in_stock: 10,
        min_stock_level: 5,
        unit_price: 25.99,
        supplier_name: 'Parts Co.',
        lead_time_days: 14,
      };

      const mockSparePart = { id: 'sp-123', ...dto };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockSparePart);
      mockRepository.save.mockResolvedValue(mockSparePart);

      const result = await service.create(dto as any);

      expect(result).toEqual(mockSparePart);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { part_number: 'SP-001' },
      });
    });

    it('should throw ConflictException when part number already exists', async () => {
      const dto = { part_number: 'SP-001', name: 'Test Part' };
      mockRepository.findOne.mockResolvedValue({ id: 'existing', part_number: 'SP-001' });

      await expect(service.create(dto as any)).rejects.toThrow(ConflictException);
      await expect(service.create(dto as any)).rejects.toThrow(
        'Spare part with number SP-001 already exists',
      );
    });
  });

  describe('findAll', () => {
    it('should return all spare parts ordered by name', async () => {
      const mockParts = [
        { id: 'sp-1', name: 'Blade' },
        { id: 'sp-2', name: 'Filter' },
      ];

      mockRepository.createQueryBuilder().getMany.mockResolvedValue(mockParts);

      const result = await service.findAll();

      expect(result).toEqual(mockParts);
    });

    it('should filter by component type', async () => {
      const qb = mockRepository.createQueryBuilder();

      await service.findAll(ComponentType.GRINDER);

      expect(qb.andWhere).toHaveBeenCalledWith('part.component_type = :componentType', {
        componentType: ComponentType.GRINDER,
      });
    });

    it('should filter low stock parts', async () => {
      const qb = mockRepository.createQueryBuilder();

      await service.findAll(undefined, true);

      expect(qb.andWhere).toHaveBeenCalledWith('part.quantity_in_stock <= part.min_stock_level');
    });

    it('should filter by both component type and low stock', async () => {
      const qb = mockRepository.createQueryBuilder();

      await service.findAll(ComponentType.PUMP, true);

      expect(qb.andWhere).toHaveBeenCalledTimes(2);
    });
  });

  describe('findOne', () => {
    it('should return a spare part by id', async () => {
      const mockPart = { id: 'sp-123', part_number: 'SP-001', name: 'Blade' };

      mockRepository.findOne.mockResolvedValue(mockPart);

      const result = await service.findOne('sp-123');

      expect(result).toEqual(mockPart);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'sp-123' },
      });
    });

    it('should throw NotFoundException when not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('nonexistent')).rejects.toThrow(
        'Spare part nonexistent not found',
      );
    });
  });

  describe('findByPartNumber', () => {
    it('should return a spare part by part number', async () => {
      const mockPart = { id: 'sp-123', part_number: 'SP-001', name: 'Blade' };

      mockRepository.findOne.mockResolvedValue(mockPart);

      const result = await service.findByPartNumber('SP-001');

      expect(result).toEqual(mockPart);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { part_number: 'SP-001' },
      });
    });

    it('should throw NotFoundException when part number not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findByPartNumber('INVALID')).rejects.toThrow(NotFoundException);
      await expect(service.findByPartNumber('INVALID')).rejects.toThrow(
        'Spare part INVALID not found',
      );
    });
  });

  describe('update', () => {
    it('should update a spare part', async () => {
      const existingPart = { id: 'sp-123', part_number: 'SP-001', name: 'Blade' };
      const updateDto = { name: 'New Blade', unit_price: 30.99 };
      const updatedPart = { ...existingPart, ...updateDto };

      mockRepository.findOne.mockResolvedValue(existingPart);
      mockRepository.save.mockResolvedValue(updatedPart);

      const result = await service.update('sp-123', updateDto as any);

      expect(result).toEqual(updatedPart);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when updating non-existent part', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update('nonexistent', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft remove a spare part', async () => {
      const existingPart = { id: 'sp-123', part_number: 'SP-001' };

      mockRepository.findOne.mockResolvedValue(existingPart);
      mockRepository.softRemove.mockResolvedValue(existingPart);

      await service.remove('sp-123');

      expect(mockRepository.softRemove).toHaveBeenCalledWith(existingPart);
    });

    it('should throw NotFoundException when deleting non-existent part', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('adjustStock', () => {
    it('should increase stock quantity', async () => {
      const existingPart = {
        id: 'sp-123',
        quantity_in_stock: 10,
        metadata: {},
      };

      mockRepository.findOne.mockResolvedValue(existingPart);
      mockRepository.save.mockImplementation((part: any) => Promise.resolve(part));

      const result = await service.adjustStock('sp-123', { quantity: 5, reason: 'Restocking' });

      expect(result.quantity_in_stock).toBe(15);
      expect(result.metadata!.stock_history).toHaveLength(1);
      expect(result.metadata!.stock_history[0]).toMatchObject({
        quantity: 5,
        reason: 'Restocking',
        new_total: 15,
      });
    });

    it('should decrease stock quantity', async () => {
      const existingPart = {
        id: 'sp-123',
        quantity_in_stock: 10,
        metadata: { stock_history: [] },
      };

      mockRepository.findOne.mockResolvedValue(existingPart);
      mockRepository.save.mockImplementation((part: any) => Promise.resolve(part));

      const result = await service.adjustStock('sp-123', {
        quantity: -3,
        reason: 'Used for maintenance',
      });

      expect(result.quantity_in_stock).toBe(7);
    });

    it('should throw ConflictException when stock would go negative', async () => {
      const existingPart = { id: 'sp-123', quantity_in_stock: 5 };

      mockRepository.findOne.mockResolvedValue(existingPart);

      await expect(
        service.adjustStock('sp-123', { quantity: -10, reason: 'Over-reduction' }),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.adjustStock('sp-123', { quantity: -10, reason: 'Over-reduction' }),
      ).rejects.toThrow('Cannot reduce stock below 0. Current: 5, Requested: -10');
    });

    it('should initialize stock history if not present', async () => {
      const existingPart = {
        id: 'sp-123',
        quantity_in_stock: 10,
        metadata: null,
      };

      mockRepository.findOne.mockResolvedValue(existingPart);
      mockRepository.save.mockImplementation((part: any) => Promise.resolve(part));

      const result = await service.adjustStock('sp-123', { quantity: 1, reason: 'Test' });

      expect(result.metadata).toBeDefined();
      expect(result.metadata!.stock_history).toHaveLength(1);
    });

    it('should append to existing stock history', async () => {
      const existingHistory = [
        { date: '2025-01-01', quantity: 5, reason: 'Initial', new_total: 5 },
      ];
      const existingPart = {
        id: 'sp-123',
        quantity_in_stock: 5,
        metadata: { stock_history: existingHistory },
      };

      mockRepository.findOne.mockResolvedValue(existingPart);
      mockRepository.save.mockImplementation((part: any) => Promise.resolve(part));

      const result = await service.adjustStock('sp-123', { quantity: 3, reason: 'Restock' });

      expect(result.metadata!.stock_history).toHaveLength(2);
    });
  });

  describe('getLowStockParts', () => {
    it('should return parts with stock at or below minimum level', async () => {
      const lowStockParts = [
        { id: 'sp-1', quantity_in_stock: 2, min_stock_level: 5 },
        { id: 'sp-2', quantity_in_stock: 5, min_stock_level: 5 },
      ];

      mockRepository.createQueryBuilder().getMany.mockResolvedValue(lowStockParts);

      const result = await service.getLowStockParts();

      expect(result).toEqual(lowStockParts);
    });

    it('should return empty array when no low stock parts', async () => {
      mockRepository.createQueryBuilder().getMany.mockResolvedValue([]);

      const result = await service.getLowStockParts();

      expect(result).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return comprehensive statistics', async () => {
      mockRepository.count.mockResolvedValueOnce(100).mockResolvedValueOnce(15);

      mockRepository.createQueryBuilder().getRawMany.mockResolvedValue([
        { type: ComponentType.GRINDER, count: '50', total_quantity: '250' },
        { type: ComponentType.PUMP, count: '50', total_quantity: '200' },
      ]);

      mockRepository.createQueryBuilder().getRawOne.mockResolvedValue({ total: '25000.50' });

      const result = await service.getStats();

      expect(result).toEqual({
        total: 100,
        by_component_type: [
          { type: ComponentType.GRINDER, count: 50, total_quantity: 250 },
          { type: ComponentType.PUMP, count: 50, total_quantity: 200 },
        ],
        low_stock_count: 15,
        total_inventory_value: 25000.5,
      });
    });

    it('should handle null values in stats', async () => {
      mockRepository.count.mockResolvedValue(0);
      mockRepository.createQueryBuilder().getRawMany.mockResolvedValue([]);
      mockRepository.createQueryBuilder().getRawOne.mockResolvedValue({ total: null });

      const result = await service.getStats();

      expect(result).toEqual({
        total: 0,
        by_component_type: [],
        low_stock_count: 0,
        total_inventory_value: 0,
      });
    });

    it('should handle null total_quantity in by_component_type', async () => {
      mockRepository.count.mockResolvedValue(10);
      mockRepository
        .createQueryBuilder()
        .getRawMany.mockResolvedValue([
          { type: ComponentType.GRINDER, count: '10', total_quantity: null },
        ]);
      mockRepository.createQueryBuilder().getRawOne.mockResolvedValue({ total: '100' });

      const result = await service.getStats();

      expect(result.by_component_type[0].total_quantity).toBe(0);
    });
  });
});
