import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { NomenclatureService } from './nomenclature.service';
import { Nomenclature } from './entities/nomenclature.entity';
import { CreateNomenclatureDto } from './dto/create-nomenclature.dto';
import { UpdateNomenclatureDto } from './dto/update-nomenclature.dto';

describe('NomenclatureService', () => {
  let service: NomenclatureService;
  let mockNomenclatureRepository: jest.Mocked<Repository<Nomenclature>>;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<Nomenclature>>;

  // Test fixtures
  const mockNomenclatureId = '123e4567-e89b-12d3-a456-426614174000';

  const mockProduct: Partial<Nomenclature> = {
    id: mockNomenclatureId,
    sku: 'COFFEE-001',
    name: 'Cappuccino',
    category_code: 'beverages',
    unit_of_measure_code: 'pcs',
    description: 'Classic cappuccino',
    purchase_price: 5000,
    selling_price: 15000,
    currency: 'UZS',
    weight: 0.25,
    barcode: '4607001234567',
    min_stock_level: 10,
    max_stock_level: 100,
    shelf_life_days: 365,
    default_supplier_id: null,
    supplier_sku: null,
    is_active: true,
    is_ingredient: false,
    requires_temperature_control: false,
    image_url: 'https://example.com/cappuccino.jpg',
    images: ['https://example.com/1.jpg', 'https://example.com/2.jpg'],
    metadata: { origin: 'Italy' },
    tags: ['coffee', 'hot', 'popular'],
    created_at: new Date('2025-01-15T10:00:00Z'),
    updated_at: new Date('2025-01-15T10:00:00Z'),
  };

  const mockIngredient: Partial<Nomenclature> = {
    id: '223e4567-e89b-12d3-a456-426614174001',
    sku: 'ING-COFFEE-001',
    name: 'Coffee Beans Arabica',
    category_code: 'ingredients',
    unit_of_measure_code: 'kg',
    description: 'Premium Arabica beans from Colombia',
    purchase_price: 500000,
    selling_price: null,
    currency: 'UZS',
    weight: 1.0,
    barcode: '4607001234568',
    min_stock_level: 5,
    max_stock_level: 50,
    shelf_life_days: 180,
    default_supplier_id: '323e4567-e89b-12d3-a456-426614174002',
    supplier_sku: 'SUPP-COFFEE-001',
    is_active: true,
    is_ingredient: true,
    requires_temperature_control: true,
    image_url: null,
    images: null,
    metadata: null,
    tags: ['coffee', 'ingredient', 'arabica'],
    created_at: new Date('2025-01-15T10:00:00Z'),
    updated_at: new Date('2025-01-15T10:00:00Z'),
  };

  const createNomenclatureDto: CreateNomenclatureDto = {
    sku: 'COFFEE-002',
    name: 'Espresso',
    category_code: 'beverages',
    unit_of_measure_code: 'pcs',
    description: 'Classic espresso',
    purchase_price: 3000,
    selling_price: 10000,
    weight: 0.05,
    barcode: '4607001234569',
    min_stock_level: 10,
    max_stock_level: 100,
    shelf_life_days: 365,
    is_active: true,
    is_ingredient: false,
    requires_temperature_control: false,
    tags: ['coffee', 'espresso'],
  };

  beforeEach(async () => {
    // Create mock query builder
    mockQueryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    } as any;

    // Create mock repository
    mockNomenclatureRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      softRemove: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NomenclatureService,
        {
          provide: getRepositoryToken(Nomenclature),
          useValue: mockNomenclatureRepository,
        },
      ],
    }).compile();

    service = module.get<NomenclatureService>(NomenclatureService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a nomenclature item successfully', async () => {
      // Arrange
      mockNomenclatureRepository.findOne.mockResolvedValue(null); // SKU doesn't exist
      const createdItem = { ...mockProduct, ...createNomenclatureDto };
      mockNomenclatureRepository.create.mockReturnValue(createdItem as Nomenclature);
      mockNomenclatureRepository.save.mockResolvedValue(createdItem as Nomenclature);

      // Act
      const result = await service.create(createNomenclatureDto);

      // Assert
      expect(mockNomenclatureRepository.findOne).toHaveBeenCalledWith({
        where: { sku: createNomenclatureDto.sku },
      });
      expect(mockNomenclatureRepository.create).toHaveBeenCalledWith(createNomenclatureDto);
      expect(mockNomenclatureRepository.save).toHaveBeenCalled();
      expect(result.sku).toBe(createNomenclatureDto.sku);
    });

    it('should throw ConflictException when SKU already exists', async () => {
      // Arrange
      const existingItem = { ...mockProduct, sku: createNomenclatureDto.sku };
      mockNomenclatureRepository.findOne.mockResolvedValue(existingItem as Nomenclature);

      // Act & Assert
      await expect(service.create(createNomenclatureDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createNomenclatureDto)).rejects.toThrow(
        `Номенклатура с SKU ${createNomenclatureDto.sku} уже существует`,
      );
    });

    it('should create an ingredient with is_ingredient flag', async () => {
      // Arrange
      const ingredientDto: CreateNomenclatureDto = {
        ...createNomenclatureDto,
        sku: 'ING-NEW-001',
        name: 'New Ingredient',
        is_ingredient: true,
      };
      mockNomenclatureRepository.findOne.mockResolvedValue(null);
      const createdIngredient = { ...mockIngredient, ...ingredientDto };
      mockNomenclatureRepository.create.mockReturnValue(createdIngredient as Nomenclature);
      mockNomenclatureRepository.save.mockResolvedValue(createdIngredient as Nomenclature);

      // Act
      const result = await service.create(ingredientDto);

      // Assert
      expect(result.is_ingredient).toBe(true);
    });

    it('should create a nomenclature item with minimal fields', async () => {
      // Arrange
      const minimalDto: CreateNomenclatureDto = {
        sku: 'MIN-001',
        name: 'Minimal Product',
        category_code: 'other',
        unit_of_measure_code: 'pcs',
      };
      mockNomenclatureRepository.findOne.mockResolvedValue(null);
      const createdItem = {
        id: 'new-id',
        ...minimalDto,
        is_active: true,
        is_ingredient: false,
      };
      mockNomenclatureRepository.create.mockReturnValue(createdItem as Nomenclature);
      mockNomenclatureRepository.save.mockResolvedValue(createdItem as Nomenclature);

      // Act
      const result = await service.create(minimalDto);

      // Assert
      expect(result.sku).toBe(minimalDto.sku);
      expect(mockNomenclatureRepository.create).toHaveBeenCalledWith(minimalDto);
    });

    it('should create item with temperature control requirement', async () => {
      // Arrange
      const temperatureControlDto: CreateNomenclatureDto = {
        ...createNomenclatureDto,
        sku: 'TEMP-001',
        requires_temperature_control: true,
      };
      mockNomenclatureRepository.findOne.mockResolvedValue(null);
      const createdItem = { ...mockProduct, ...temperatureControlDto };
      mockNomenclatureRepository.create.mockReturnValue(createdItem as Nomenclature);
      mockNomenclatureRepository.save.mockResolvedValue(createdItem as Nomenclature);

      // Act
      const result = await service.create(temperatureControlDto);

      // Assert
      expect(result.requires_temperature_control).toBe(true);
    });
  });

  describe('findAll', () => {
    it('should return all nomenclature items without filters', async () => {
      // Arrange
      const items = [mockProduct, mockIngredient];
      mockQueryBuilder.getMany.mockResolvedValue(items as Nomenclature[]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(mockNomenclatureRepository.createQueryBuilder).toHaveBeenCalledWith('nomenclature');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('nomenclature.name', 'ASC');
      expect(result).toEqual(items);
    });

    it('should filter by category when provided', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([mockProduct as Nomenclature]);

      // Act
      await service.findAll('beverages');

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'nomenclature.category_code = :category',
        { category: 'beverages' },
      );
    });

    it('should filter by isIngredient true', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([mockIngredient as Nomenclature]);

      // Act
      await service.findAll(undefined, true);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'nomenclature.is_ingredient = :isIngredient',
        { isIngredient: true },
      );
    });

    it('should filter by isIngredient false', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([mockProduct as Nomenclature]);

      // Act
      await service.findAll(undefined, false);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'nomenclature.is_ingredient = :isIngredient',
        { isIngredient: false },
      );
    });

    it('should filter by isActive true', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([mockProduct as Nomenclature]);

      // Act
      await service.findAll(undefined, undefined, true);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('nomenclature.is_active = :isActive', {
        isActive: true,
      });
    });

    it('should filter by isActive false', async () => {
      // Arrange
      const inactiveProduct = { ...mockProduct, is_active: false };
      mockQueryBuilder.getMany.mockResolvedValue([inactiveProduct as Nomenclature]);

      // Act
      await service.findAll(undefined, undefined, false);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('nomenclature.is_active = :isActive', {
        isActive: false,
      });
    });

    it('should filter by search term (name, sku, tags)', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([mockProduct as Nomenclature]);

      // Act
      await service.findAll(undefined, undefined, undefined, 'coffee');

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(nomenclature.name ILIKE :search OR nomenclature.sku ILIKE :search OR :search = ANY(nomenclature.tags))',
        { search: '%coffee%' },
      );
    });

    it('should apply multiple filters when provided', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([mockIngredient as Nomenclature]);

      // Act
      await service.findAll('ingredients', true, true, 'arabica');

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(4);
    });

    it('should return empty array when no items match filters', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([]);

      // Act
      const result = await service.findAll('non-existent-category');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a nomenclature item when found', async () => {
      // Arrange
      mockNomenclatureRepository.findOne.mockResolvedValue(mockProduct as Nomenclature);

      // Act
      const result = await service.findOne(mockNomenclatureId);

      // Assert
      expect(mockNomenclatureRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockNomenclatureId },
      });
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when item not found', async () => {
      // Arrange
      mockNomenclatureRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'Номенклатура с ID non-existent-id не найдена',
      );
    });
  });

  describe('findBySKU', () => {
    it('should return a nomenclature item when SKU found', async () => {
      // Arrange
      mockNomenclatureRepository.findOne.mockResolvedValue(mockProduct as Nomenclature);

      // Act
      const result = await service.findBySKU('COFFEE-001');

      // Assert
      expect(mockNomenclatureRepository.findOne).toHaveBeenCalledWith({
        where: { sku: 'COFFEE-001' },
      });
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException when SKU not found', async () => {
      // Arrange
      mockNomenclatureRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findBySKU('NON-EXISTENT-SKU')).rejects.toThrow(NotFoundException);
      await expect(service.findBySKU('NON-EXISTENT-SKU')).rejects.toThrow(
        'Номенклатура с SKU NON-EXISTENT-SKU не найдена',
      );
    });
  });

  describe('update', () => {
    it('should update nomenclature item with new values', async () => {
      // Arrange
      const updateDto: UpdateNomenclatureDto = {
        name: 'Updated Cappuccino',
        selling_price: 18000,
        description: 'Updated description',
      };
      const existingItem = { ...mockProduct };
      const updatedItem = { ...mockProduct, ...updateDto };

      mockNomenclatureRepository.findOne.mockResolvedValue(existingItem as Nomenclature);
      mockNomenclatureRepository.save.mockResolvedValue(updatedItem as Nomenclature);

      // Act
      const result = await service.update(mockNomenclatureId, updateDto);

      // Assert
      expect(mockNomenclatureRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockNomenclatureId },
      });
      expect(mockNomenclatureRepository.save).toHaveBeenCalled();
      expect(result.name).toBe('Updated Cappuccino');
      expect(result.selling_price).toBe(18000);
    });

    it('should throw NotFoundException when updating non-existent item', async () => {
      // Arrange
      mockNomenclatureRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update('non-existent-id', { name: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update item metadata', async () => {
      // Arrange
      const updateDto: UpdateNomenclatureDto = {
        metadata: { origin: 'Brazil', roast: 'medium' },
      };
      const existingItem = { ...mockProduct };
      const updatedItem = { ...mockProduct, metadata: updateDto.metadata };

      mockNomenclatureRepository.findOne.mockResolvedValue(existingItem as Nomenclature);
      mockNomenclatureRepository.save.mockResolvedValue(updatedItem as Nomenclature);

      // Act
      const result = await service.update(mockNomenclatureId, updateDto);

      // Assert
      expect(result.metadata).toEqual(updateDto.metadata);
    });

    it('should update item tags', async () => {
      // Arrange
      const updateDto: UpdateNomenclatureDto = {
        tags: ['coffee', 'premium', 'new'],
      };
      const existingItem = { ...mockProduct };
      const updatedItem = { ...mockProduct, tags: updateDto.tags };

      mockNomenclatureRepository.findOne.mockResolvedValue(existingItem as Nomenclature);
      mockNomenclatureRepository.save.mockResolvedValue(updatedItem as Nomenclature);

      // Act
      const result = await service.update(mockNomenclatureId, updateDto);

      // Assert
      expect(result.tags).toEqual(['coffee', 'premium', 'new']);
    });

    it('should update is_active status', async () => {
      // Arrange
      const updateDto: UpdateNomenclatureDto = {
        is_active: false,
      };
      const existingItem = { ...mockProduct };
      const updatedItem = { ...mockProduct, is_active: false };

      mockNomenclatureRepository.findOne.mockResolvedValue(existingItem as Nomenclature);
      mockNomenclatureRepository.save.mockResolvedValue(updatedItem as Nomenclature);

      // Act
      const result = await service.update(mockNomenclatureId, updateDto);

      // Assert
      expect(result.is_active).toBe(false);
    });
  });

  describe('remove', () => {
    it('should soft delete a nomenclature item', async () => {
      // Arrange
      mockNomenclatureRepository.findOne.mockResolvedValue(mockProduct as Nomenclature);
      mockNomenclatureRepository.softRemove.mockResolvedValue(mockProduct as Nomenclature);

      // Act
      await service.remove(mockNomenclatureId);

      // Assert
      expect(mockNomenclatureRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockNomenclatureId },
      });
      expect(mockNomenclatureRepository.softRemove).toHaveBeenCalledWith(mockProduct);
    });

    it('should throw NotFoundException when removing non-existent item', async () => {
      // Arrange
      mockNomenclatureRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findProducts', () => {
    it('should return only products (is_ingredient = false)', async () => {
      // Arrange
      const products = [mockProduct as Nomenclature];
      mockQueryBuilder.getMany.mockResolvedValue(products);

      // Act
      const result = await service.findProducts();

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'nomenclature.is_ingredient = :isIngredient',
        { isIngredient: false },
      );
      expect(result).toEqual(products);
    });

    it('should filter products by category', async () => {
      // Arrange
      const beverages = [mockProduct as Nomenclature];
      mockQueryBuilder.getMany.mockResolvedValue(beverages);

      // Act
      const result = await service.findProducts('beverages');

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'nomenclature.category_code = :category',
        { category: 'beverages' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'nomenclature.is_ingredient = :isIngredient',
        { isIngredient: false },
      );
      expect(result).toEqual(beverages);
    });

    it('should return empty array when no products found', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([]);

      // Act
      const result = await service.findProducts('non-existent-category');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findIngredients', () => {
    it('should return only ingredients (is_ingredient = true)', async () => {
      // Arrange
      const ingredients = [mockIngredient as Nomenclature];
      mockQueryBuilder.getMany.mockResolvedValue(ingredients);

      // Act
      const result = await service.findIngredients();

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'nomenclature.is_ingredient = :isIngredient',
        { isIngredient: true },
      );
      expect(result).toEqual(ingredients);
    });

    it('should filter ingredients by category', async () => {
      // Arrange
      const coffeeIngredients = [mockIngredient as Nomenclature];
      mockQueryBuilder.getMany.mockResolvedValue(coffeeIngredients);

      // Act
      const result = await service.findIngredients('ingredients');

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'nomenclature.category_code = :category',
        { category: 'ingredients' },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'nomenclature.is_ingredient = :isIngredient',
        { isIngredient: true },
      );
      expect(result).toEqual(coffeeIngredients);
    });

    it('should return empty array when no ingredients found', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([]);

      // Act
      const result = await service.findIngredients('non-existent-category');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return nomenclature statistics', async () => {
      // Arrange
      mockNomenclatureRepository.count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(30) // products
        .mockResolvedValueOnce(20) // ingredients
        .mockResolvedValueOnce(45); // active

      // Act
      const result = await service.getStats();

      // Assert
      expect(result).toEqual({
        total: 50,
        products: 30,
        ingredients: 20,
        active: 45,
        inactive: 5,
      });

      expect(mockNomenclatureRepository.count).toHaveBeenCalledWith();
      expect(mockNomenclatureRepository.count).toHaveBeenCalledWith({
        where: { is_ingredient: false },
      });
      expect(mockNomenclatureRepository.count).toHaveBeenCalledWith({
        where: { is_ingredient: true },
      });
      expect(mockNomenclatureRepository.count).toHaveBeenCalledWith({
        where: { is_active: true },
      });
    });

    it('should return zero values when no nomenclature exists', async () => {
      // Arrange
      mockNomenclatureRepository.count.mockResolvedValue(0);

      // Act
      const result = await service.getStats();

      // Assert
      expect(result).toEqual({
        total: 0,
        products: 0,
        ingredients: 0,
        active: 0,
        inactive: 0,
      });
    });

    it('should correctly calculate inactive count', async () => {
      // Arrange
      mockNomenclatureRepository.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(60) // products
        .mockResolvedValueOnce(40) // ingredients
        .mockResolvedValueOnce(80); // active

      // Act
      const result = await service.getStats();

      // Assert
      expect(result.inactive).toBe(20); // 100 - 80
    });
  });

  describe('findByBarcode', () => {
    it('should return nomenclature item when barcode found', async () => {
      // Arrange
      mockNomenclatureRepository.findOne.mockResolvedValue(mockProduct as Nomenclature);

      // Act
      const result = await service.findByBarcode('4607001234567');

      // Assert
      expect(mockNomenclatureRepository.findOne).toHaveBeenCalledWith({
        where: { barcode: '4607001234567' },
      });
      expect(result).toEqual(mockProduct);
    });

    it('should return null when barcode not found', async () => {
      // Arrange
      mockNomenclatureRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findByBarcode('9999999999999');

      // Assert
      expect(result).toBeNull();
    });

    it('should handle empty barcode search', async () => {
      // Arrange
      mockNomenclatureRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findByBarcode('');

      // Assert
      expect(mockNomenclatureRepository.findOne).toHaveBeenCalledWith({
        where: { barcode: '' },
      });
      expect(result).toBeNull();
    });

    it('should return item when barcode matches existing product', async () => {
      // Arrange
      const productWithBarcode = { ...mockProduct, barcode: '1234567890123' };
      mockNomenclatureRepository.findOne.mockResolvedValue(productWithBarcode as Nomenclature);

      // Act
      const result = await service.findByBarcode('1234567890123');

      // Assert
      expect(result).toEqual(productWithBarcode);
      expect(result?.barcode).toBe('1234567890123');
    });
  });

  describe('edge cases and branch coverage', () => {
    describe('findAll with edge cases', () => {
      it('should not filter when category is undefined', async () => {
        // Arrange
        mockQueryBuilder.getMany.mockResolvedValue([]);

        // Act
        await service.findAll(undefined);

        // Assert - should not call andWhere for category
        expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
          'nomenclature.category_code = :category',
          expect.any(Object),
        );
      });

      it('should not filter when category is empty string but should call andWhere', async () => {
        // Arrange
        mockQueryBuilder.getMany.mockResolvedValue([]);

        // Act
        await service.findAll('');

        // Assert - empty string is truthy-ish but falsy, so won't filter
        // The if (category) check will be false for empty string
        expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
          'nomenclature.category_code = :category',
          { category: '' },
        );
      });

      it('should filter by isIngredient when explicitly set to false', async () => {
        // Arrange
        mockQueryBuilder.getMany.mockResolvedValue([mockProduct as Nomenclature]);

        // Act
        await service.findAll(undefined, false);

        // Assert
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'nomenclature.is_ingredient = :isIngredient',
          { isIngredient: false },
        );
      });

      it('should filter by isActive when explicitly set to false', async () => {
        // Arrange
        mockQueryBuilder.getMany.mockResolvedValue([]);

        // Act
        await service.findAll(undefined, undefined, false);

        // Assert
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'nomenclature.is_active = :isActive',
          { isActive: false },
        );
      });

      it('should not filter by isIngredient when undefined', async () => {
        // Arrange
        mockQueryBuilder.getMany.mockResolvedValue([]);

        // Act
        await service.findAll('beverages');

        // Assert - only category filter should be applied
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'nomenclature.category_code = :category',
          { category: 'beverages' },
        );
        expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
          'nomenclature.is_ingredient = :isIngredient',
          expect.any(Object),
        );
      });

      it('should not filter by isActive when undefined', async () => {
        // Arrange
        mockQueryBuilder.getMany.mockResolvedValue([]);

        // Act
        await service.findAll('beverages', true);

        // Assert
        expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
          'nomenclature.is_active = :isActive',
          expect.any(Object),
        );
      });

      it('should not filter by search when undefined', async () => {
        // Arrange
        mockQueryBuilder.getMany.mockResolvedValue([]);

        // Act
        await service.findAll('beverages', true, true);

        // Assert
        expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
          expect.stringContaining('ILIKE'),
          expect.any(Object),
        );
      });

      it('should not filter by search when empty string', async () => {
        // Arrange
        mockQueryBuilder.getMany.mockResolvedValue([]);

        // Act
        await service.findAll('beverages', true, true, '');

        // Assert - empty string is falsy, so won't filter
        expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
          expect.stringContaining('ILIKE'),
          expect.any(Object),
        );
      });

      it('should handle all undefined parameters', async () => {
        // Arrange
        mockQueryBuilder.getMany.mockResolvedValue([mockProduct as Nomenclature]);

        // Act
        const result = await service.findAll();

        // Assert - only orderBy should be called, no filters
        expect(mockNomenclatureRepository.createQueryBuilder).toHaveBeenCalledWith('nomenclature');
        expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('nomenclature.name', 'ASC');
        expect(result).toHaveLength(1);
      });
    });

    describe('create edge cases', () => {
      it('should handle creating item with null optional fields', async () => {
        // Arrange
        const minimalDto: CreateNomenclatureDto = {
          sku: 'MIN-SKU-001',
          name: 'Minimal Item',
          category_code: 'other',
          unit_of_measure_code: 'pcs',
        };
        mockNomenclatureRepository.findOne.mockResolvedValue(null);
        const createdItem = { id: 'new-id', ...minimalDto };
        mockNomenclatureRepository.create.mockReturnValue(createdItem as Nomenclature);
        mockNomenclatureRepository.save.mockResolvedValue(createdItem as Nomenclature);

        // Act
        const result = await service.create(minimalDto);

        // Assert
        expect(result.sku).toBe(minimalDto.sku);
      });

      it('should throw ConflictException with correct message for duplicate SKU', async () => {
        // Arrange
        const dto: CreateNomenclatureDto = {
          sku: 'DUPLICATE-SKU',
          name: 'Duplicate Item',
          category_code: 'other',
          unit_of_measure_code: 'pcs',
        };
        mockNomenclatureRepository.findOne.mockResolvedValue({
          sku: 'DUPLICATE-SKU',
        } as Nomenclature);

        // Act & Assert
        try {
          await service.create(dto);
          fail('Should have thrown ConflictException');
        } catch (error) {
          expect(error).toBeInstanceOf(ConflictException);
          expect(error.message).toContain('DUPLICATE-SKU');
        }
      });
    });

    describe('update edge cases', () => {
      it('should merge DTO properties into existing entity', async () => {
        // Arrange
        const existingItem = { ...mockProduct, name: 'Original Name' };
        const updateDto: UpdateNomenclatureDto = { name: 'New Name' };
        const updatedItem = { ...existingItem, name: 'New Name' };

        mockNomenclatureRepository.findOne.mockResolvedValue(existingItem as Nomenclature);
        mockNomenclatureRepository.save.mockResolvedValue(updatedItem as Nomenclature);

        // Act
        const result = await service.update(mockNomenclatureId, updateDto);

        // Assert
        expect(result.name).toBe('New Name');
        expect(mockNomenclatureRepository.save).toHaveBeenCalled();
      });

      it('should handle updating with empty DTO (no changes)', async () => {
        // Arrange
        const existingItem = { ...mockProduct };
        const updateDto: UpdateNomenclatureDto = {};

        mockNomenclatureRepository.findOne.mockResolvedValue(existingItem as Nomenclature);
        mockNomenclatureRepository.save.mockResolvedValue(existingItem as Nomenclature);

        // Act
        const result = await service.update(mockNomenclatureId, updateDto);

        // Assert
        expect(result).toEqual(existingItem);
      });
    });

    describe('findOne edge cases', () => {
      it('should return item when found', async () => {
        // Arrange
        mockNomenclatureRepository.findOne.mockResolvedValue(mockProduct as Nomenclature);

        // Act
        const result = await service.findOne(mockNomenclatureId);

        // Assert
        expect(result).toEqual(mockProduct);
      });

      it('should throw NotFoundException with correct message when not found', async () => {
        // Arrange
        const nonExistentId = 'non-existent-uuid';
        mockNomenclatureRepository.findOne.mockResolvedValue(null);

        // Act & Assert
        try {
          await service.findOne(nonExistentId);
          fail('Should have thrown NotFoundException');
        } catch (error) {
          expect(error).toBeInstanceOf(NotFoundException);
          expect(error.message).toContain(nonExistentId);
        }
      });
    });

    describe('findBySKU edge cases', () => {
      it('should throw NotFoundException with correct message when SKU not found', async () => {
        // Arrange
        const nonExistentSku = 'NON-EXISTENT-SKU';
        mockNomenclatureRepository.findOne.mockResolvedValue(null);

        // Act & Assert
        try {
          await service.findBySKU(nonExistentSku);
          fail('Should have thrown NotFoundException');
        } catch (error) {
          expect(error).toBeInstanceOf(NotFoundException);
          expect(error.message).toContain(nonExistentSku);
        }
      });
    });

    describe('getStats edge cases', () => {
      it('should calculate inactive correctly when some are inactive', async () => {
        // Arrange
        mockNomenclatureRepository.count
          .mockResolvedValueOnce(100) // total
          .mockResolvedValueOnce(60) // products
          .mockResolvedValueOnce(40) // ingredients
          .mockResolvedValueOnce(75); // active

        // Act
        const result = await service.getStats();

        // Assert
        expect(result.inactive).toBe(25); // 100 - 75
      });

      it('should handle all items being active', async () => {
        // Arrange
        mockNomenclatureRepository.count
          .mockResolvedValueOnce(50) // total
          .mockResolvedValueOnce(30) // products
          .mockResolvedValueOnce(20) // ingredients
          .mockResolvedValueOnce(50); // active (all)

        // Act
        const result = await service.getStats();

        // Assert
        expect(result.inactive).toBe(0);
      });

      it('should handle all items being inactive', async () => {
        // Arrange
        mockNomenclatureRepository.count
          .mockResolvedValueOnce(50) // total
          .mockResolvedValueOnce(30) // products
          .mockResolvedValueOnce(20) // ingredients
          .mockResolvedValueOnce(0); // active (none)

        // Act
        const result = await service.getStats();

        // Assert
        expect(result.inactive).toBe(50);
      });
    });

    describe('findProducts and findIngredients edge cases', () => {
      it('should call findAll with isIngredient=false for findProducts', async () => {
        // Arrange
        mockQueryBuilder.getMany.mockResolvedValue([]);

        // Act
        await service.findProducts();

        // Assert
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'nomenclature.is_ingredient = :isIngredient',
          { isIngredient: false },
        );
      });

      it('should call findAll with isIngredient=true for findIngredients', async () => {
        // Arrange
        mockQueryBuilder.getMany.mockResolvedValue([]);

        // Act
        await service.findIngredients();

        // Assert
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'nomenclature.is_ingredient = :isIngredient',
          { isIngredient: true },
        );
      });

      it('should pass category to findAll in findProducts', async () => {
        // Arrange
        mockQueryBuilder.getMany.mockResolvedValue([]);

        // Act
        await service.findProducts('beverages');

        // Assert
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'nomenclature.category_code = :category',
          { category: 'beverages' },
        );
      });

      it('should pass category to findAll in findIngredients', async () => {
        // Arrange
        mockQueryBuilder.getMany.mockResolvedValue([]);

        // Act
        await service.findIngredients('ingredients');

        // Assert
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
          'nomenclature.category_code = :category',
          { category: 'ingredients' },
        );
      });
    });
  });

  describe('price handling', () => {
    it('should create item with both purchase and selling price', async () => {
      // Arrange
      const dtoWithPrices: CreateNomenclatureDto = {
        ...createNomenclatureDto,
        purchase_price: 10000,
        selling_price: 25000,
      };
      mockNomenclatureRepository.findOne.mockResolvedValue(null);
      const createdItem = { ...mockProduct, ...dtoWithPrices };
      mockNomenclatureRepository.create.mockReturnValue(createdItem as Nomenclature);
      mockNomenclatureRepository.save.mockResolvedValue(createdItem as Nomenclature);

      // Act
      const result = await service.create(dtoWithPrices);

      // Assert
      expect(result.purchase_price).toBe(10000);
      expect(result.selling_price).toBe(25000);
    });

    it('should update prices independently', async () => {
      // Arrange
      const existingItem = { ...mockProduct, purchase_price: 5000, selling_price: 15000 };
      const updateDto: UpdateNomenclatureDto = {
        purchase_price: 6000,
      };
      const updatedItem = { ...existingItem, purchase_price: 6000 };

      mockNomenclatureRepository.findOne.mockResolvedValue(existingItem as Nomenclature);
      mockNomenclatureRepository.save.mockResolvedValue(updatedItem as Nomenclature);

      // Act
      const result = await service.update(mockNomenclatureId, updateDto);

      // Assert
      expect(result.purchase_price).toBe(6000);
      expect(result.selling_price).toBe(15000); // Unchanged
    });
  });

  describe('stock level handling', () => {
    it('should create item with stock levels', async () => {
      // Arrange
      const dtoWithStockLevels: CreateNomenclatureDto = {
        ...createNomenclatureDto,
        min_stock_level: 5,
        max_stock_level: 50,
      };
      mockNomenclatureRepository.findOne.mockResolvedValue(null);
      const createdItem = { ...mockProduct, ...dtoWithStockLevels };
      mockNomenclatureRepository.create.mockReturnValue(createdItem as Nomenclature);
      mockNomenclatureRepository.save.mockResolvedValue(createdItem as Nomenclature);

      // Act
      const result = await service.create(dtoWithStockLevels);

      // Assert
      expect(result.min_stock_level).toBe(5);
      expect(result.max_stock_level).toBe(50);
    });

    it('should update stock levels', async () => {
      // Arrange
      const existingItem = { ...mockProduct, min_stock_level: 10, max_stock_level: 100 };
      const updateDto: UpdateNomenclatureDto = {
        min_stock_level: 20,
        max_stock_level: 200,
      };
      const updatedItem = { ...existingItem, ...updateDto };

      mockNomenclatureRepository.findOne.mockResolvedValue(existingItem as Nomenclature);
      mockNomenclatureRepository.save.mockResolvedValue(updatedItem as Nomenclature);

      // Act
      const result = await service.update(mockNomenclatureId, updateDto);

      // Assert
      expect(result.min_stock_level).toBe(20);
      expect(result.max_stock_level).toBe(200);
    });
  });

  describe('supplier handling', () => {
    it('should create item with supplier information', async () => {
      // Arrange
      const supplierId = '423e4567-e89b-12d3-a456-426614174003';
      const dtoWithSupplier: CreateNomenclatureDto = {
        ...createNomenclatureDto,
        default_supplier_id: supplierId,
        supplier_sku: 'SUPPLIER-SKU-001',
      };
      mockNomenclatureRepository.findOne.mockResolvedValue(null);
      const createdItem = { ...mockProduct, ...dtoWithSupplier };
      mockNomenclatureRepository.create.mockReturnValue(createdItem as Nomenclature);
      mockNomenclatureRepository.save.mockResolvedValue(createdItem as Nomenclature);

      // Act
      const result = await service.create(dtoWithSupplier);

      // Assert
      expect(result.default_supplier_id).toBe(supplierId);
      expect(result.supplier_sku).toBe('SUPPLIER-SKU-001');
    });

    it('should update supplier information', async () => {
      // Arrange
      const newSupplierId = '523e4567-e89b-12d3-a456-426614174004';
      const existingItem = { ...mockProduct };
      const updateDto: UpdateNomenclatureDto = {
        default_supplier_id: newSupplierId,
        supplier_sku: 'NEW-SUPPLIER-SKU',
      };
      const updatedItem = { ...existingItem, ...updateDto };

      mockNomenclatureRepository.findOne.mockResolvedValue(existingItem as Nomenclature);
      mockNomenclatureRepository.save.mockResolvedValue(updatedItem as Nomenclature);

      // Act
      const result = await service.update(mockNomenclatureId, updateDto);

      // Assert
      expect(result.default_supplier_id).toBe(newSupplierId);
      expect(result.supplier_sku).toBe('NEW-SUPPLIER-SKU');
    });
  });
});
