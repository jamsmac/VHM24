import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { MaterialsService } from './materials.service';
import { Material, MaterialCategory } from './entities/material.entity';

describe('MaterialsService', () => {
  let service: MaterialsService;
  let mockQueryBuilder: any;
  let mockRepository: any;

  const mockMaterial: Partial<Material> = {
    id: 'material-123',
    name: 'Coffee Beans',
    category: MaterialCategory.INGREDIENTS,
    unit: 'kg',
    sku: 'SKU-001',
    description: 'Premium coffee beans',
    unit_price: 500,
    min_order_quantity: 1,
    supplier_id: 'supplier-123',
    supplier: { id: 'supplier-123', name: 'Coffee Supplier' } as any,
    is_active: true,
    image_url: 'https://example.com/coffee.jpg',
    sort_order: 1,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mockMaterial]),
    };

    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialsService,
        {
          provide: getRepositoryToken(Material),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<MaterialsService>(MaterialsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new material', async () => {
      const createDto = {
        name: 'New Material',
        category: MaterialCategory.CONSUMABLES,
        unit: 'pcs',
      };

      mockRepository.create.mockReturnValue(mockMaterial);
      mockRepository.save.mockResolvedValue(mockMaterial);

      const result = await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockMaterial);
    });

    it('should create material with all fields', async () => {
      const createDto = {
        name: 'Full Material',
        category: MaterialCategory.INGREDIENTS,
        unit: 'kg',
        sku: 'SKU-002',
        description: 'Test description',
        unit_price: 1000,
        min_order_quantity: 5,
        supplier_id: 'supplier-456',
        is_active: true,
        image_url: 'https://example.com/image.jpg',
        sort_order: 10,
      };

      mockRepository.create.mockReturnValue({ ...mockMaterial, ...createDto });
      mockRepository.save.mockResolvedValue({ ...mockMaterial, ...createDto });

      const result = await service.create(createDto);

      expect(result.name).toBe('Full Material');
      expect(result.category).toBe(MaterialCategory.INGREDIENTS);
    });
  });

  describe('findAll', () => {
    it('should return all materials without filters', async () => {
      const result = await service.findAll();

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('material');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'material.supplier',
        'supplier',
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('material.sort_order', 'ASC');
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('material.name', 'ASC');
      expect(result).toEqual([mockMaterial]);
    });

    it('should filter by is_active', async () => {
      await service.findAll({ is_active: true });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'material.is_active = :is_active',
        { is_active: true },
      );
    });

    it('should filter by is_active false', async () => {
      await service.findAll({ is_active: false });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'material.is_active = :is_active',
        { is_active: false },
      );
    });

    it('should filter by category', async () => {
      await service.findAll({ category: MaterialCategory.CLEANING });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'material.category = :category',
        { category: MaterialCategory.CLEANING },
      );
    });

    it('should filter by supplier_id', async () => {
      await service.findAll({ supplier_id: 'supplier-123' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'material.supplier_id = :supplier_id',
        { supplier_id: 'supplier-123' },
      );
    });

    it('should filter by search term', async () => {
      await service.findAll({ search: 'coffee' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(material.name ILIKE :search OR material.sku ILIKE :search)',
        { search: '%coffee%' },
      );
    });

    it('should apply multiple filters', async () => {
      await service.findAll({
        is_active: true,
        category: MaterialCategory.INGREDIENTS,
        supplier_id: 'supplier-123',
        search: 'beans',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(4);
    });

    it('should return empty array when no materials found', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findGroupedByCategory', () => {
    it('should return materials grouped by category', async () => {
      const materials = [
        { ...mockMaterial, id: '1', category: MaterialCategory.INGREDIENTS },
        { ...mockMaterial, id: '2', category: MaterialCategory.INGREDIENTS },
        { ...mockMaterial, id: '3', category: MaterialCategory.CONSUMABLES },
        { ...mockMaterial, id: '4', category: MaterialCategory.CLEANING },
        { ...mockMaterial, id: '5', category: MaterialCategory.SPARE_PARTS },
        { ...mockMaterial, id: '6', category: MaterialCategory.PACKAGING },
        { ...mockMaterial, id: '7', category: MaterialCategory.OTHER },
      ];
      mockQueryBuilder.getMany.mockResolvedValue(materials);

      const result = await service.findGroupedByCategory();

      expect(result[MaterialCategory.INGREDIENTS]).toHaveLength(2);
      expect(result[MaterialCategory.CONSUMABLES]).toHaveLength(1);
      expect(result[MaterialCategory.CLEANING]).toHaveLength(1);
      expect(result[MaterialCategory.SPARE_PARTS]).toHaveLength(1);
      expect(result[MaterialCategory.PACKAGING]).toHaveLength(1);
      expect(result[MaterialCategory.OTHER]).toHaveLength(1);
    });

    it('should return empty arrays for categories with no materials', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.findGroupedByCategory();

      expect(result[MaterialCategory.INGREDIENTS]).toEqual([]);
      expect(result[MaterialCategory.CONSUMABLES]).toEqual([]);
      expect(result[MaterialCategory.CLEANING]).toEqual([]);
      expect(result[MaterialCategory.SPARE_PARTS]).toEqual([]);
      expect(result[MaterialCategory.PACKAGING]).toEqual([]);
      expect(result[MaterialCategory.OTHER]).toEqual([]);
    });

    it('should only include active materials', async () => {
      await service.findGroupedByCategory();

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'material.is_active = :is_active',
        { is_active: true },
      );
    });
  });

  describe('findOne', () => {
    it('should return a material by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockMaterial);

      const result = await service.findOne('material-123');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'material-123' },
        relations: ['supplier'],
      });
      expect(result).toEqual(mockMaterial);
    });

    it('should throw NotFoundException when material not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('non-existent')).rejects.toThrow(
        'Материал с ID non-existent не найден',
      );
    });
  });

  describe('update', () => {
    it('should update a material', async () => {
      const updateDto = { name: 'Updated Material Name' };
      mockRepository.findOne.mockResolvedValue(mockMaterial);
      mockRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.update('material-123', updateDto);

      expect(mockRepository.update).toHaveBeenCalledWith('material-123', updateDto);
      expect(result).toEqual(mockMaterial);
    });

    it('should update multiple fields', async () => {
      const updateDto = {
        name: 'Updated Name',
        category: MaterialCategory.SPARE_PARTS,
        unit_price: 750,
        is_active: false,
      };
      mockRepository.findOne.mockResolvedValue({ ...mockMaterial, ...updateDto });
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.update('material-123', updateDto);

      expect(mockRepository.update).toHaveBeenCalledWith('material-123', updateDto);
    });

    it('should throw NotFoundException when updating non-existent material', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent', { name: 'New' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a material', async () => {
      mockRepository.findOne.mockResolvedValue(mockMaterial);
      mockRepository.softDelete.mockResolvedValue({ affected: 1 });

      await service.remove('material-123');

      expect(mockRepository.softDelete).toHaveBeenCalledWith('material-123');
    });

    it('should throw NotFoundException when removing non-existent material', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('should deactivate a material', async () => {
      mockRepository.findOne.mockResolvedValue(mockMaterial);
      mockRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.deactivate('material-123');

      expect(mockRepository.update).toHaveBeenCalledWith('material-123', {
        is_active: false,
      });
      expect(result).toEqual(mockMaterial);
    });

    it('should throw NotFoundException when deactivating non-existent material', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.deactivate('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined options in findAll', async () => {
      await service.findAll(undefined);

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('should handle empty options object in findAll', async () => {
      await service.findAll({});

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('should handle material with null supplier', async () => {
      const materialNoSupplier = { ...mockMaterial, supplier: null, supplier_id: null };
      mockRepository.findOne.mockResolvedValue(materialNoSupplier);

      const result = await service.findOne('material-123');

      expect(result.supplier).toBeNull();
    });

    it('should handle all material categories', async () => {
      const categories = Object.values(MaterialCategory);

      for (const category of categories) {
        mockQueryBuilder.andWhere.mockClear();
        await service.findAll({ category });

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'material.category = :category',
          { category },
        );
      }
    });
  });
});
