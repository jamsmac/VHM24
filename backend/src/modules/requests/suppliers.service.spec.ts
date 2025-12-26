import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { Supplier } from './entities/supplier.entity';

describe('SuppliersService', () => {
  let service: SuppliersService;
  let mockQueryBuilder: any;
  let mockRepository: any;

  const mockSupplier: Partial<Supplier> = {
    id: 'supplier-123',
    name: 'Coffee Supplier',
    telegram_id: 'tg-12345',
    telegram_username: '@coffee_supplier',
    phone: '+7 999 123-45-67',
    email: 'supplier@example.com',
    address: 'Moscow, Russia',
    categories: ['coffee', 'tea'],
    notes: 'Reliable supplier',
    is_active: true,
    priority: 10,
    materials: [],
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    mockQueryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mockSupplier]),
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
        SuppliersService,
        {
          provide: getRepositoryToken(Supplier),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new supplier', async () => {
      const createDto = {
        name: 'New Supplier',
        phone: '+7 999 111-22-33',
      };

      mockRepository.create.mockReturnValue(mockSupplier);
      mockRepository.save.mockResolvedValue(mockSupplier);

      const result = await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockSupplier);
    });

    it('should create supplier with all fields', async () => {
      const createDto = {
        name: 'Full Supplier',
        telegram_id: 'tg-99999',
        telegram_username: '@full_supplier',
        phone: '+7 999 999-99-99',
        email: 'full@example.com',
        address: 'Full Address',
        categories: ['ingredients', 'packaging'],
        notes: 'Full notes',
        is_active: true,
        priority: 5,
      };

      mockRepository.create.mockReturnValue({ ...mockSupplier, ...createDto });
      mockRepository.save.mockResolvedValue({ ...mockSupplier, ...createDto });

      const result = await service.create(createDto);

      expect(result.name).toBe('Full Supplier');
      expect(result.telegram_id).toBe('tg-99999');
    });

    it('should create supplier with minimal fields', async () => {
      const createDto = { name: 'Minimal Supplier' };

      mockRepository.create.mockReturnValue({ ...mockSupplier, ...createDto });
      mockRepository.save.mockResolvedValue({ ...mockSupplier, ...createDto });

      const result = await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(result).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return all suppliers without filters', async () => {
      const result = await service.findAll();

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('supplier');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('supplier.name', 'ASC');
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
      expect(result).toEqual([mockSupplier]);
    });

    it('should filter by is_active true', async () => {
      await service.findAll({ is_active: true });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'supplier.is_active = :is_active',
        { is_active: true },
      );
    });

    it('should filter by is_active false', async () => {
      await service.findAll({ is_active: false });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'supplier.is_active = :is_active',
        { is_active: false },
      );
    });

    it('should filter by category', async () => {
      await service.findAll({ category: 'coffee' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        ':category = ANY(supplier.categories)',
        { category: 'coffee' },
      );
    });

    it('should filter by search term', async () => {
      await service.findAll({ search: 'supplier' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(supplier.name ILIKE :search OR supplier.phone ILIKE :search OR supplier.email ILIKE :search)',
        { search: '%supplier%' },
      );
    });

    it('should apply multiple filters', async () => {
      await service.findAll({
        is_active: true,
        category: 'tea',
        search: 'premium',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(3);
    });

    it('should return empty array when no suppliers found', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });

    it('should handle undefined options', async () => {
      await service.findAll(undefined);

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('should handle empty options object', async () => {
      await service.findAll({});

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('should return multiple suppliers', async () => {
      const suppliers = [
        mockSupplier,
        { ...mockSupplier, id: 'supplier-456', name: 'Another Supplier' },
      ];
      mockQueryBuilder.getMany.mockResolvedValue(suppliers);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('should return a supplier by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockSupplier);

      const result = await service.findOne('supplier-123');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'supplier-123' },
        relations: ['materials'],
      });
      expect(result).toEqual(mockSupplier);
    });

    it('should throw NotFoundException when supplier not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('non-existent')).rejects.toThrow(
        'Поставщик с ID non-existent не найден',
      );
    });

    it('should return supplier with materials relation', async () => {
      const supplierWithMaterials = {
        ...mockSupplier,
        materials: [
          { id: 'mat-1', name: 'Coffee Beans', is_active: true },
          { id: 'mat-2', name: 'Tea Leaves', is_active: false },
        ],
      };
      mockRepository.findOne.mockResolvedValue(supplierWithMaterials);

      const result = await service.findOne('supplier-123');

      expect(result.materials).toHaveLength(2);
    });
  });

  describe('findByTelegramId', () => {
    it('should return supplier by telegram id', async () => {
      mockRepository.findOne.mockResolvedValue(mockSupplier);

      const result = await service.findByTelegramId('tg-12345');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { telegram_id: 'tg-12345' },
      });
      expect(result).toEqual(mockSupplier);
    });

    it('should return null when supplier not found by telegram id', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByTelegramId('non-existent-tg');

      expect(result).toBeNull();
    });

    it('should handle numeric telegram id as string', async () => {
      mockRepository.findOne.mockResolvedValue(mockSupplier);

      await service.findByTelegramId('123456789');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { telegram_id: '123456789' },
      });
    });
  });

  describe('update', () => {
    it('should update a supplier', async () => {
      const updateDto = { name: 'Updated Supplier Name' };
      mockRepository.findOne.mockResolvedValue(mockSupplier);
      mockRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.update('supplier-123', updateDto);

      expect(mockRepository.update).toHaveBeenCalledWith('supplier-123', updateDto);
      expect(result).toEqual(mockSupplier);
    });

    it('should update multiple fields', async () => {
      const updateDto = {
        name: 'Updated Name',
        phone: '+7 999 000-00-00',
        email: 'updated@example.com',
        is_active: false,
        priority: 20,
      };
      const updatedSupplier = { ...mockSupplier, ...updateDto };
      mockRepository.findOne.mockResolvedValue(updatedSupplier);
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.update('supplier-123', updateDto);

      expect(mockRepository.update).toHaveBeenCalledWith('supplier-123', updateDto);
    });

    it('should throw NotFoundException when updating non-existent supplier', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update('non-existent', { name: 'New' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update telegram fields', async () => {
      const updateDto = {
        telegram_id: 'new-tg-id',
        telegram_username: '@new_username',
      };
      mockRepository.findOne.mockResolvedValue({ ...mockSupplier, ...updateDto });
      mockRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.update('supplier-123', updateDto);

      expect(mockRepository.update).toHaveBeenCalledWith('supplier-123', updateDto);
      expect(result.telegram_id).toBe('new-tg-id');
    });

    it('should update categories array', async () => {
      const updateDto = { categories: ['new-category-1', 'new-category-2'] };
      mockRepository.findOne.mockResolvedValue({ ...mockSupplier, ...updateDto });
      mockRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.update('supplier-123', updateDto);

      expect(result.categories).toEqual(['new-category-1', 'new-category-2']);
    });
  });

  describe('remove', () => {
    it('should soft delete a supplier without materials', async () => {
      const supplierNoMaterials = { ...mockSupplier, materials: [] };
      mockRepository.findOne.mockResolvedValue(supplierNoMaterials);
      mockRepository.softDelete.mockResolvedValue({ affected: 1 });

      await service.remove('supplier-123');

      expect(mockRepository.softDelete).toHaveBeenCalledWith('supplier-123');
    });

    it('should soft delete supplier with only inactive materials', async () => {
      const supplierInactiveMaterials = {
        ...mockSupplier,
        materials: [
          { id: 'mat-1', name: 'Material 1', is_active: false },
          { id: 'mat-2', name: 'Material 2', is_active: false },
        ],
      };
      mockRepository.findOne.mockResolvedValue(supplierInactiveMaterials);
      mockRepository.softDelete.mockResolvedValue({ affected: 1 });

      await service.remove('supplier-123');

      expect(mockRepository.softDelete).toHaveBeenCalledWith('supplier-123');
    });

    it('should throw BadRequestException when supplier has active materials', async () => {
      const supplierWithActiveMaterials = {
        ...mockSupplier,
        materials: [
          { id: 'mat-1', name: 'Active Material', is_active: true },
          { id: 'mat-2', name: 'Inactive Material', is_active: false },
        ],
      };
      mockRepository.findOne.mockResolvedValue(supplierWithActiveMaterials);

      await expect(service.remove('supplier-123')).rejects.toThrow(BadRequestException);
      await expect(service.remove('supplier-123')).rejects.toThrow(
        'Невозможно удалить поставщика: есть 1 активных материалов',
      );
    });

    it('should throw BadRequestException with correct count for multiple active materials', async () => {
      const supplierWithMultipleActiveMaterials = {
        ...mockSupplier,
        materials: [
          { id: 'mat-1', name: 'Active 1', is_active: true },
          { id: 'mat-2', name: 'Active 2', is_active: true },
          { id: 'mat-3', name: 'Active 3', is_active: true },
        ],
      };
      mockRepository.findOne.mockResolvedValue(supplierWithMultipleActiveMaterials);

      await expect(service.remove('supplier-123')).rejects.toThrow(
        'Невозможно удалить поставщика: есть 3 активных материалов',
      );
    });

    it('should throw NotFoundException when removing non-existent supplier', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should handle supplier with undefined materials', async () => {
      const supplierUndefinedMaterials = { ...mockSupplier, materials: undefined };
      mockRepository.findOne.mockResolvedValue(supplierUndefinedMaterials);
      mockRepository.softDelete.mockResolvedValue({ affected: 1 });

      await service.remove('supplier-123');

      expect(mockRepository.softDelete).toHaveBeenCalledWith('supplier-123');
    });

    it('should handle supplier with null materials', async () => {
      const supplierNullMaterials = { ...mockSupplier, materials: null };
      mockRepository.findOne.mockResolvedValue(supplierNullMaterials);
      mockRepository.softDelete.mockResolvedValue({ affected: 1 });

      await service.remove('supplier-123');

      expect(mockRepository.softDelete).toHaveBeenCalledWith('supplier-123');
    });
  });

  describe('edge cases', () => {
    it('should handle supplier with null optional fields', async () => {
      const supplierNullFields = {
        ...mockSupplier,
        telegram_id: null,
        telegram_username: null,
        phone: null,
        email: null,
        address: null,
        categories: null,
        notes: null,
      };
      mockRepository.findOne.mockResolvedValue(supplierNullFields);

      const result = await service.findOne('supplier-123');

      expect(result.telegram_id).toBeNull();
      expect(result.phone).toBeNull();
    });

    it('should handle empty categories array', async () => {
      const supplierEmptyCategories = { ...mockSupplier, categories: [] };
      mockRepository.findOne.mockResolvedValue(supplierEmptyCategories);

      const result = await service.findOne('supplier-123');

      expect(result.categories).toEqual([]);
    });

    it('should handle special characters in search', async () => {
      await service.findAll({ search: "O'Reilly & Sons" });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(supplier.name ILIKE :search OR supplier.phone ILIKE :search OR supplier.email ILIKE :search)',
        { search: "%O'Reilly & Sons%" },
      );
    });

    it('should handle unicode in supplier name', async () => {
      const createDto = { name: 'Поставщик кофе ☕' };
      mockRepository.create.mockReturnValue({ ...mockSupplier, ...createDto });
      mockRepository.save.mockResolvedValue({ ...mockSupplier, ...createDto });

      const result = await service.create(createDto);

      expect(result.name).toBe('Поставщик кофе ☕');
    });

    it('should verify findOne is called twice during update', async () => {
      const updateDto = { name: 'Updated' };
      mockRepository.findOne.mockResolvedValue(mockSupplier);
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.update('supplier-123', updateDto);

      // findOne is called twice: once to check existence, once to return updated
      expect(mockRepository.findOne).toHaveBeenCalledTimes(2);
    });
  });
});
