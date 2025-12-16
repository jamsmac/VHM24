import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { Recipe } from './entities/recipe.entity';
import { RecipeIngredient } from './entities/recipe-ingredient.entity';
import { NomenclatureService } from '../nomenclature/nomenclature.service';
import { UnitConversionService } from '@/common/services/unit-conversion.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { Nomenclature } from '../nomenclature/entities/nomenclature.entity';

describe('RecipesService', () => {
  let service: RecipesService;
  let mockRecipeRepository: jest.Mocked<Repository<Recipe>>;
  let mockRecipeIngredientRepository: jest.Mocked<Repository<RecipeIngredient>>;
  let mockNomenclatureService: jest.Mocked<NomenclatureService>;
  let mockUnitConversionService: jest.Mocked<UnitConversionService>;
  let mockQueryBuilder: jest.Mocked<SelectQueryBuilder<Recipe>>;

  // Test fixtures
  const mockProductId = '123e4567-e89b-12d3-a456-426614174000';
  const mockRecipeId = '223e4567-e89b-12d3-a456-426614174001';
  const mockIngredientId1 = '323e4567-e89b-12d3-a456-426614174002';
  const mockIngredientId2 = '423e4567-e89b-12d3-a456-426614174003';

  const mockProduct: Partial<Nomenclature> = {
    id: mockProductId,
    sku: 'COFFEE-001',
    name: 'Cappuccino',
    category_code: 'beverages',
    unit_of_measure_code: 'pcs',
    is_ingredient: false,
    is_active: true,
  };

  const mockIngredient1: Partial<Nomenclature> = {
    id: mockIngredientId1,
    sku: 'ING-COFFEE-001',
    name: 'Coffee Beans',
    category_code: 'ingredients',
    unit_of_measure_code: 'kg',
    is_ingredient: true,
    is_active: true,
    purchase_price: 500000, // 500,000 UZS/kg
  };

  const mockIngredient2: Partial<Nomenclature> = {
    id: mockIngredientId2,
    sku: 'ING-MILK-001',
    name: 'Milk',
    category_code: 'ingredients',
    unit_of_measure_code: 'L',
    is_ingredient: true,
    is_active: true,
    purchase_price: 15000, // 15,000 UZS/L
  };

  const mockRecipeIngredient1: Partial<RecipeIngredient> = {
    id: '523e4567-e89b-12d3-a456-426614174004',
    recipe_id: mockRecipeId,
    ingredient_id: mockIngredientId1,
    quantity: 15,
    unit_of_measure_code: 'g',
    sort_order: 1,
    ingredient: mockIngredient1 as Nomenclature,
  };

  const mockRecipeIngredient2: Partial<RecipeIngredient> = {
    id: '623e4567-e89b-12d3-a456-426614174005',
    recipe_id: mockRecipeId,
    ingredient_id: mockIngredientId2,
    quantity: 150,
    unit_of_measure_code: 'ml',
    sort_order: 2,
    ingredient: mockIngredient2 as Nomenclature,
  };

  const mockRecipe: Partial<Recipe> = {
    id: mockRecipeId,
    product_id: mockProductId,
    name: 'Classic Cappuccino',
    type_code: 'primary',
    description: 'Classic cappuccino recipe',
    is_active: true,
    preparation_time_seconds: 45,
    temperature_celsius: 90,
    serving_size_ml: 200,
    total_cost: 9750, // Calculated cost
    settings: { pressure: 9 },
    product: mockProduct as Nomenclature,
    ingredients: [mockRecipeIngredient1, mockRecipeIngredient2] as RecipeIngredient[],
    created_at: new Date('2025-01-15T10:00:00Z'),
    updated_at: new Date('2025-01-15T10:00:00Z'),
  };

  const createRecipeDto: CreateRecipeDto = {
    product_id: mockProductId,
    name: 'Classic Cappuccino',
    type_code: 'primary',
    description: 'Classic cappuccino recipe',
    is_active: true,
    preparation_time_seconds: 45,
    temperature_celsius: 90,
    serving_size_ml: 200,
    settings: { pressure: 9 },
    ingredients: [
      {
        ingredient_id: mockIngredientId1,
        quantity: 15,
        unit_of_measure_code: 'g',
        sort_order: 1,
      },
      {
        ingredient_id: mockIngredientId2,
        quantity: 150,
        unit_of_measure_code: 'ml',
        sort_order: 2,
      },
    ],
  };

  beforeEach(async () => {
    // Create mock query builder
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
      select: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue(null),
    } as any;

    // Create mock repositories
    mockRecipeRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      softRemove: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    } as any;

    mockRecipeIngredientRepository = {
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as any;

    // Create mock services
    mockNomenclatureService = {
      findOne: jest.fn(),
    } as any;

    mockUnitConversionService = {
      calculateCost: jest.fn(),
      convert: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipesService,
        {
          provide: getRepositoryToken(Recipe),
          useValue: mockRecipeRepository,
        },
        {
          provide: getRepositoryToken(RecipeIngredient),
          useValue: mockRecipeIngredientRepository,
        },
        {
          provide: NomenclatureService,
          useValue: mockNomenclatureService,
        },
        {
          provide: UnitConversionService,
          useValue: mockUnitConversionService,
        },
      ],
    }).compile();

    service = module.get<RecipesService>(RecipesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a recipe with ingredients and calculate cost', async () => {
      // Arrange
      mockRecipeRepository.findOne
        .mockResolvedValueOnce(null) // Check for existing recipe
        .mockResolvedValue(mockRecipe as Recipe); // Final fetch

      mockNomenclatureService.findOne
        .mockResolvedValueOnce(mockProduct as Nomenclature) // Product validation
        .mockResolvedValueOnce(mockIngredient1 as Nomenclature) // Ingredient 1 validation
        .mockResolvedValueOnce(mockIngredient2 as Nomenclature); // Ingredient 2 validation

      const savedRecipe = { ...mockRecipe, id: mockRecipeId };
      mockRecipeRepository.create.mockReturnValue(savedRecipe as Recipe);
      mockRecipeRepository.save.mockResolvedValue(savedRecipe as Recipe);

      mockRecipeIngredientRepository.create.mockImplementation(
        (data) =>
          ({
            ...data,
            id: 'new-ingredient-id',
          }) as RecipeIngredient,
      );
      mockRecipeIngredientRepository.save.mockResolvedValue([] as any);

      mockUnitConversionService.calculateCost
        .mockReturnValueOnce(7500) // Coffee: 500,000 * 0.015 kg
        .mockReturnValueOnce(2250); // Milk: 15,000 * 0.15 L

      mockRecipeRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      const result = await service.create(createRecipeDto);

      // Assert
      expect(mockRecipeRepository.findOne).toHaveBeenCalledWith({
        where: {
          product_id: createRecipeDto.product_id,
          type_code: createRecipeDto.type_code,
        },
      });
      expect(mockNomenclatureService.findOne).toHaveBeenCalledWith(createRecipeDto.product_id);
      expect(mockRecipeRepository.create).toHaveBeenCalled();
      expect(mockRecipeRepository.save).toHaveBeenCalled();
      expect(mockRecipeIngredientRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockRecipe);
    });

    it('should throw ConflictException when recipe with same product_id and type_code exists', async () => {
      // Arrange
      mockRecipeRepository.findOne.mockResolvedValue(mockRecipe as Recipe);

      // Act & Assert
      await expect(service.create(createRecipeDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createRecipeDto)).rejects.toThrow(
        `Рецепт типа ${createRecipeDto.type_code} для этого продукта уже существует`,
      );
    });

    it('should throw BadRequestException when no ingredients provided', async () => {
      // Arrange
      const dtoWithoutIngredients: CreateRecipeDto = {
        ...createRecipeDto,
        ingredients: [],
      };
      mockRecipeRepository.findOne.mockResolvedValue(null);
      mockNomenclatureService.findOne.mockResolvedValue(mockProduct as Nomenclature);

      // Act & Assert
      await expect(service.create(dtoWithoutIngredients)).rejects.toThrow(BadRequestException);
      await expect(service.create(dtoWithoutIngredients)).rejects.toThrow(
        'Рецепт должен содержать минимум 1 ингредиент',
      );
    });

    it('should throw BadRequestException when ingredient is not marked as ingredient', async () => {
      // Arrange
      const nonIngredient: Partial<Nomenclature> = {
        ...mockIngredient1,
        name: 'Coffee Beans',
        is_ingredient: false,
      };

      mockRecipeRepository.findOne.mockResolvedValue(null);
      mockNomenclatureService.findOne
        .mockResolvedValueOnce(mockProduct as Nomenclature)
        .mockResolvedValueOnce(nonIngredient as Nomenclature);

      // Act & Assert
      await expect(service.create(createRecipeDto)).rejects.toThrow(BadRequestException);

      // Reset mocks for second assertion
      mockRecipeRepository.findOne.mockResolvedValue(null);
      mockNomenclatureService.findOne
        .mockResolvedValueOnce(mockProduct as Nomenclature)
        .mockResolvedValueOnce(nonIngredient as Nomenclature);

      await expect(service.create(createRecipeDto)).rejects.toThrow(
        'Coffee Beans не является ингредиентом (флаг is_ingredient = false)',
      );
    });

    it('should throw NotFoundException when product does not exist', async () => {
      // Arrange
      mockRecipeRepository.findOne.mockResolvedValue(null);
      mockNomenclatureService.findOne.mockRejectedValue(
        new NotFoundException('Номенклатура не найдена'),
      );

      // Act & Assert
      await expect(service.create(createRecipeDto)).rejects.toThrow(NotFoundException);
    });

    it('should create recipe with single ingredient', async () => {
      // Arrange
      const singleIngredientDto: CreateRecipeDto = {
        ...createRecipeDto,
        ingredients: [createRecipeDto.ingredients[0]],
      };

      mockRecipeRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValue(mockRecipe as Recipe);

      mockNomenclatureService.findOne
        .mockResolvedValueOnce(mockProduct as Nomenclature)
        .mockResolvedValueOnce(mockIngredient1 as Nomenclature);

      const savedRecipe = { ...mockRecipe, id: mockRecipeId };
      mockRecipeRepository.create.mockReturnValue(savedRecipe as Recipe);
      mockRecipeRepository.save.mockResolvedValue(savedRecipe as Recipe);
      mockRecipeIngredientRepository.create.mockReturnValue({} as RecipeIngredient);
      mockRecipeIngredientRepository.save.mockResolvedValue([] as any);
      mockUnitConversionService.calculateCost.mockReturnValue(7500);
      mockRecipeRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.create(singleIngredientDto);

      // Assert
      expect(mockRecipeIngredientRepository.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('should return all recipes without filters', async () => {
      // Arrange
      const recipes = [mockRecipe, { ...mockRecipe, id: 'another-id' }];
      mockQueryBuilder.getMany.mockResolvedValue(recipes as Recipe[]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(mockRecipeRepository.createQueryBuilder).toHaveBeenCalledWith('recipe');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('recipe.product', 'product');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'recipe.ingredients',
        'ingredients',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'ingredients.ingredient',
        'nomenclature',
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('recipe.name', 'ASC');
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith('ingredients.sort_order', 'ASC');
      expect(result).toEqual(recipes);
    });

    it('should filter by productId when provided', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([mockRecipe as Recipe]);

      // Act
      await service.findAll(mockProductId);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('recipe.product_id = :productId', {
        productId: mockProductId,
      });
    });

    it('should filter by typeCode when provided', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([mockRecipe as Recipe]);

      // Act
      await service.findAll(undefined, 'primary');

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('recipe.type_code = :typeCode', {
        typeCode: 'primary',
      });
    });

    it('should filter by isActive when provided', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([mockRecipe as Recipe]);

      // Act
      await service.findAll(undefined, undefined, true);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('recipe.is_active = :isActive', {
        isActive: true,
      });
    });

    it('should apply multiple filters when provided', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([mockRecipe as Recipe]);

      // Act
      await service.findAll(mockProductId, 'primary', true);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(3);
    });

    it('should filter by isActive false', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([]);

      // Act
      await service.findAll(undefined, undefined, false);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('recipe.is_active = :isActive', {
        isActive: false,
      });
    });
  });

  describe('findOne', () => {
    it('should return a recipe when found', async () => {
      // Arrange
      mockRecipeRepository.findOne.mockResolvedValue(mockRecipe as Recipe);

      // Act
      const result = await service.findOne(mockRecipeId);

      // Assert
      expect(mockRecipeRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockRecipeId },
        relations: ['product', 'ingredients', 'ingredients.ingredient'],
      });
      expect(result).toEqual(mockRecipe);
    });

    it('should throw NotFoundException when recipe not found', async () => {
      // Arrange
      mockRecipeRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        'Рецепт с ID non-existent-id не найден',
      );
    });
  });

  describe('update', () => {
    it('should update recipe basic fields without changing ingredients', async () => {
      // Arrange
      const updateDto: UpdateRecipeDto = {
        name: 'Updated Cappuccino',
        description: 'Updated description',
        is_active: false,
      };
      const existingRecipe = { ...mockRecipe };
      const updatedRecipe = { ...mockRecipe, ...updateDto };

      mockRecipeRepository.findOne.mockResolvedValue(existingRecipe as Recipe);
      mockRecipeRepository.save.mockResolvedValue(updatedRecipe as Recipe);

      // Act
      const result = await service.update(mockRecipeId, updateDto);

      // Assert
      expect(mockRecipeRepository.save).toHaveBeenCalled();
      expect(mockRecipeIngredientRepository.delete).not.toHaveBeenCalled();
      expect(result.name).toBe('Updated Cappuccino');
    });

    it('should update recipe with new ingredients', async () => {
      // Arrange
      const updateDto: UpdateRecipeDto = {
        ingredients: [
          {
            ingredient_id: mockIngredientId1,
            quantity: 20, // Changed quantity
            unit_of_measure_code: 'g',
            sort_order: 1,
          },
        ],
      };

      mockRecipeRepository.findOne.mockResolvedValue(mockRecipe as Recipe);
      mockRecipeRepository.save.mockResolvedValue(mockRecipe as Recipe);
      mockRecipeIngredientRepository.delete.mockResolvedValue({ affected: 2 } as any);
      mockRecipeIngredientRepository.create.mockReturnValue({} as RecipeIngredient);
      mockRecipeIngredientRepository.save.mockResolvedValue([] as any);
      mockUnitConversionService.calculateCost.mockReturnValue(10000);
      mockRecipeRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.update(mockRecipeId, updateDto);

      // Assert
      expect(mockRecipeIngredientRepository.delete).toHaveBeenCalledWith({
        recipe_id: mockRecipeId,
      });
      expect(mockRecipeIngredientRepository.create).toHaveBeenCalled();
      expect(mockRecipeIngredientRepository.save).toHaveBeenCalled();
      expect(mockRecipeRepository.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException when updating with empty ingredients array', async () => {
      // Arrange
      const updateDto: UpdateRecipeDto = {
        ingredients: [],
      };

      mockRecipeRepository.findOne.mockResolvedValue(mockRecipe as Recipe);
      mockRecipeRepository.save.mockResolvedValue(mockRecipe as Recipe);

      // Act & Assert
      await expect(service.update(mockRecipeId, updateDto)).rejects.toThrow(BadRequestException);
      await expect(service.update(mockRecipeId, updateDto)).rejects.toThrow(
        'Рецепт должен содержать минимум 1 ингредиент',
      );
    });

    it('should throw NotFoundException when updating non-existent recipe', async () => {
      // Arrange
      mockRecipeRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.update('non-existent-id', { name: 'Updated' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete a recipe', async () => {
      // Arrange
      mockRecipeRepository.findOne.mockResolvedValue(mockRecipe as Recipe);
      mockRecipeRepository.softRemove.mockResolvedValue(mockRecipe as Recipe);

      // Act
      await service.remove(mockRecipeId);

      // Assert
      expect(mockRecipeRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockRecipeId },
        relations: ['product', 'ingredients', 'ingredients.ingredient'],
      });
      expect(mockRecipeRepository.softRemove).toHaveBeenCalledWith(mockRecipe);
    });

    it('should throw NotFoundException when removing non-existent recipe', async () => {
      // Arrange
      mockRecipeRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.remove('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('recalculateCost', () => {
    it('should calculate total cost based on ingredients', async () => {
      // Arrange
      mockRecipeRepository.findOne.mockResolvedValue(mockRecipe as Recipe);
      mockUnitConversionService.calculateCost
        .mockReturnValueOnce(7500) // Coffee: 500,000 UZS/kg * 15g = 7,500 UZS
        .mockReturnValueOnce(2250); // Milk: 15,000 UZS/L * 150ml = 2,250 UZS
      mockRecipeRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      const result = await service.recalculateCost(mockRecipeId);

      // Assert
      expect(mockUnitConversionService.calculateCost).toHaveBeenCalledWith(
        500000, // price
        'kg', // price unit
        15, // quantity
        'g', // recipe unit
      );
      expect(mockUnitConversionService.calculateCost).toHaveBeenCalledWith(
        15000, // price
        'L', // price unit
        150, // quantity
        'ml', // recipe unit
      );
      expect(result).toBe(9750); // 7500 + 2250
      expect(mockRecipeRepository.update).toHaveBeenCalledWith(mockRecipeId, {
        total_cost: 9750,
      });
    });

    it('should handle ingredients without purchase price', async () => {
      // Arrange
      const ingredientWithoutPrice: Partial<RecipeIngredient> = {
        ...mockRecipeIngredient1,
        ingredient: {
          ...mockIngredient1,
          purchase_price: null,
        } as Nomenclature,
      };
      const recipeWithNoPriceIngredient = {
        ...mockRecipe,
        ingredients: [ingredientWithoutPrice as RecipeIngredient],
      };

      mockRecipeRepository.findOne.mockResolvedValue(recipeWithNoPriceIngredient as Recipe);
      mockRecipeRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      const result = await service.recalculateCost(mockRecipeId);

      // Assert
      expect(mockUnitConversionService.calculateCost).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });

    it('should handle unit conversion errors gracefully', async () => {
      // Arrange
      mockRecipeRepository.findOne.mockResolvedValue(mockRecipe as Recipe);
      mockUnitConversionService.calculateCost
        .mockImplementationOnce(() => {
          throw new Error('Incompatible units');
        })
        .mockReturnValueOnce(2250);
      mockRecipeRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      const result = await service.recalculateCost(mockRecipeId);

      // Assert - Logger is used instead of console.warn
      expect(result).toBe(2250); // Only the second ingredient calculated
    });

    it('should use fallback calculation when units are same but conversion fails', async () => {
      // Arrange
      const sameUnitIngredient: Partial<RecipeIngredient> = {
        ...mockRecipeIngredient1,
        unit_of_measure_code: 'kg', // Same as ingredient's unit
        quantity: 0.015,
      };
      const recipeWithSameUnit = {
        ...mockRecipe,
        ingredients: [sameUnitIngredient as RecipeIngredient],
      };

      mockRecipeRepository.findOne.mockResolvedValue(recipeWithSameUnit as Recipe);
      mockUnitConversionService.calculateCost.mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });
      mockRecipeRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      const result = await service.recalculateCost(mockRecipeId);

      // Assert
      // Fallback: 500000 * 0.015 = 7500
      expect(result).toBe(7500);
    });

    it('should round cost to 2 decimal places', async () => {
      // Arrange
      mockRecipeRepository.findOne.mockResolvedValue(mockRecipe as Recipe);
      mockUnitConversionService.calculateCost
        .mockReturnValueOnce(7500.555)
        .mockReturnValueOnce(2250.444);
      mockRecipeRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      const result = await service.recalculateCost(mockRecipeId);

      // Assert
      expect(result).toBe(9751); // Rounded: 7500.56 + 2250.44 = 9751
    });

    it('should throw NotFoundException for non-existent recipe', async () => {
      // Arrange
      mockRecipeRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.recalculateCost('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByProduct', () => {
    it('should return recipes for a specific product', async () => {
      // Arrange
      const recipes = [mockRecipe as Recipe];
      mockQueryBuilder.getMany.mockResolvedValue(recipes);

      // Act
      const result = await service.findByProduct(mockProductId);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('recipe.product_id = :productId', {
        productId: mockProductId,
      });
      expect(result).toEqual(recipes);
    });

    it('should return empty array when product has no recipes', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([]);

      // Act
      const result = await service.findByProduct('product-without-recipes');

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findPrimaryRecipe', () => {
    it('should return primary active recipe for product', async () => {
      // Arrange
      const primaryRecipe = { ...mockRecipe, type_code: 'primary', is_active: true };
      mockQueryBuilder.getMany.mockResolvedValue([primaryRecipe as Recipe]);

      // Act
      const result = await service.findPrimaryRecipe(mockProductId);

      // Assert
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('recipe.product_id = :productId', {
        productId: mockProductId,
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('recipe.type_code = :typeCode', {
        typeCode: 'primary',
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('recipe.is_active = :isActive', {
        isActive: true,
      });
      expect(result).toEqual(primaryRecipe);
    });

    it('should return null when no primary recipe exists', async () => {
      // Arrange
      mockQueryBuilder.getMany.mockResolvedValue([]);

      // Act
      const result = await service.findPrimaryRecipe(mockProductId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return recipe statistics', async () => {
      // Arrange
      mockRecipeRepository.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(8); // active

      mockRecipeRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avg: '5000.50' }),
      } as any);

      // Act
      const result = await service.getStats();

      // Assert
      expect(result).toEqual({
        total: 10,
        active: 8,
        inactive: 2,
        average_cost: 5000.5,
      });
    });

    it('should return zero values when no recipes exist', async () => {
      // Arrange
      mockRecipeRepository.count.mockResolvedValue(0);
      mockRecipeRepository.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ avg: null }),
      } as any);

      // Act
      const result = await service.getStats();

      // Assert
      expect(result).toEqual({
        total: 0,
        active: 0,
        inactive: 0,
        average_cost: 0,
      });
    });
  });

  describe('ingredient cost calculation scenarios', () => {
    it('should correctly calculate cost with different units (g to kg conversion)', async () => {
      // Test case: Coffee 500,000 UZS/kg, recipe uses 15g
      // Expected: 500,000 * 0.015 = 7,500 UZS

      // Arrange
      const recipeWithSingleIngredient = {
        ...mockRecipe,
        ingredients: [mockRecipeIngredient1 as RecipeIngredient],
      };

      mockRecipeRepository.findOne.mockResolvedValue(recipeWithSingleIngredient as Recipe);
      mockUnitConversionService.calculateCost.mockReturnValue(7500);
      mockRecipeRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      const result = await service.recalculateCost(mockRecipeId);

      // Assert
      expect(mockUnitConversionService.calculateCost).toHaveBeenCalledWith(500000, 'kg', 15, 'g');
      expect(result).toBe(7500);
    });

    it('should correctly calculate cost with volume units (ml to L conversion)', async () => {
      // Test case: Milk 15,000 UZS/L, recipe uses 150ml
      // Expected: 15,000 * 0.15 = 2,250 UZS

      // Arrange
      const recipeWithMilk = {
        ...mockRecipe,
        ingredients: [mockRecipeIngredient2 as RecipeIngredient],
      };

      mockRecipeRepository.findOne.mockResolvedValue(recipeWithMilk as Recipe);
      mockUnitConversionService.calculateCost.mockReturnValue(2250);
      mockRecipeRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      const result = await service.recalculateCost(mockRecipeId);

      // Assert
      expect(mockUnitConversionService.calculateCost).toHaveBeenCalledWith(15000, 'L', 150, 'ml');
      expect(result).toBe(2250);
    });

    it('should sum costs of multiple ingredients', async () => {
      // Arrange
      mockRecipeRepository.findOne.mockResolvedValue(mockRecipe as Recipe);
      mockUnitConversionService.calculateCost
        .mockReturnValueOnce(7500) // Coffee
        .mockReturnValueOnce(2250); // Milk
      mockRecipeRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      const result = await service.recalculateCost(mockRecipeId);

      // Assert
      expect(result).toBe(9750); // 7500 + 2250
    });
  });

  describe('additional branch coverage tests', () => {
    describe('create edge cases', () => {
      it('should handle DTO without optional fields', async () => {
        // Arrange
        const minimalDto: CreateRecipeDto = {
          product_id: mockProductId,
          name: 'Minimal Recipe',
          type_code: 'primary',
          ingredients: [
            {
              ingredient_id: mockIngredientId1,
              quantity: 10,
              unit_of_measure_code: 'g',
              sort_order: 1,
            },
          ],
        };

        mockRecipeRepository.findOne
          .mockResolvedValueOnce(null) // Check for existing
          .mockResolvedValue(mockRecipe as Recipe); // Final fetch

        mockNomenclatureService.findOne
          .mockResolvedValueOnce(mockProduct as Nomenclature)
          .mockResolvedValueOnce(mockIngredient1 as Nomenclature);

        const savedRecipe = { ...mockRecipe, id: mockRecipeId };
        mockRecipeRepository.create.mockReturnValue(savedRecipe as Recipe);
        mockRecipeRepository.save.mockResolvedValue(savedRecipe as Recipe);
        mockRecipeIngredientRepository.create.mockReturnValue({} as RecipeIngredient);
        mockRecipeIngredientRepository.save.mockResolvedValue([] as any);
        mockUnitConversionService.calculateCost.mockReturnValue(5000);
        mockRecipeRepository.update.mockResolvedValue({ affected: 1 } as any);

        // Act
        const result = await service.create(minimalDto);

        // Assert
        expect(result).toEqual(mockRecipe);
      });

      it('should validate all ingredients in the list', async () => {
        // Arrange
        const dtoWith3Ingredients: CreateRecipeDto = {
          ...createRecipeDto,
          ingredients: [
            {
              ingredient_id: mockIngredientId1,
              quantity: 10,
              unit_of_measure_code: 'g',
              sort_order: 1,
            },
            {
              ingredient_id: mockIngredientId2,
              quantity: 100,
              unit_of_measure_code: 'ml',
              sort_order: 2,
            },
            {
              ingredient_id: 'third-ingredient-id',
              quantity: 5,
              unit_of_measure_code: 'pcs',
              sort_order: 3,
            },
          ],
        };

        const thirdIngredient = {
          id: 'third-ingredient-id',
          name: 'Sugar',
          is_ingredient: true,
          purchase_price: 10000,
          unit_of_measure_code: 'kg',
        };

        mockRecipeRepository.findOne
          .mockResolvedValueOnce(null)
          .mockResolvedValue(mockRecipe as Recipe);

        mockNomenclatureService.findOne
          .mockResolvedValueOnce(mockProduct as Nomenclature)
          .mockResolvedValueOnce(mockIngredient1 as Nomenclature)
          .mockResolvedValueOnce(mockIngredient2 as Nomenclature)
          .mockResolvedValueOnce(thirdIngredient as Nomenclature);

        mockRecipeRepository.create.mockReturnValue(mockRecipe as Recipe);
        mockRecipeRepository.save.mockResolvedValue(mockRecipe as Recipe);
        mockRecipeIngredientRepository.create.mockReturnValue({} as RecipeIngredient);
        mockRecipeIngredientRepository.save.mockResolvedValue([] as any);
        mockUnitConversionService.calculateCost.mockReturnValue(1000);
        mockRecipeRepository.update.mockResolvedValue({ affected: 1 } as any);

        // Act
        await service.create(dtoWith3Ingredients);

        // Assert - should have called findOne for product + 3 ingredients = 4 times
        expect(mockNomenclatureService.findOne).toHaveBeenCalledTimes(4);
      });
    });

    describe('findAll filter combinations', () => {
      it('should apply only productId filter when others are undefined', async () => {
        // Arrange
        mockQueryBuilder.getMany.mockResolvedValue([mockRecipe as Recipe]);

        // Act
        await service.findAll(mockProductId, undefined, undefined);

        // Assert
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(1);
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('recipe.product_id = :productId', {
          productId: mockProductId,
        });
      });

      it('should apply only typeCode filter when others are undefined', async () => {
        // Arrange
        mockQueryBuilder.getMany.mockResolvedValue([mockRecipe as Recipe]);

        // Act
        await service.findAll(undefined, 'alternative', undefined);

        // Assert
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(1);
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('recipe.type_code = :typeCode', {
          typeCode: 'alternative',
        });
      });

      it('should apply only isActive filter when others are undefined', async () => {
        // Arrange
        mockQueryBuilder.getMany.mockResolvedValue([mockRecipe as Recipe]);

        // Act
        await service.findAll(undefined, undefined, false);

        // Assert
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(1);
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('recipe.is_active = :isActive', {
          isActive: false,
        });
      });

      it('should not apply any filter when all are undefined', async () => {
        // Arrange
        mockQueryBuilder.getMany.mockResolvedValue([mockRecipe as Recipe]);

        // Act
        await service.findAll(undefined, undefined, undefined);

        // Assert
        expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
      });
    });

    describe('update with ingredients edge cases', () => {
      it('should update both basic fields and ingredients', async () => {
        // Arrange
        const updateDto: UpdateRecipeDto = {
          name: 'Updated Name',
          description: 'Updated description',
          ingredients: [
            {
              ingredient_id: mockIngredientId1,
              quantity: 25,
              unit_of_measure_code: 'g',
              sort_order: 1,
            },
          ],
        };

        mockRecipeRepository.findOne.mockResolvedValue(mockRecipe as Recipe);
        mockRecipeRepository.save.mockResolvedValue({
          ...mockRecipe,
          name: 'Updated Name',
        } as Recipe);
        mockRecipeIngredientRepository.delete.mockResolvedValue({ affected: 2 } as any);
        mockNomenclatureService.findOne.mockResolvedValue(mockIngredient1 as Nomenclature);
        mockRecipeIngredientRepository.create.mockReturnValue({} as RecipeIngredient);
        mockRecipeIngredientRepository.save.mockResolvedValue([] as any);
        mockUnitConversionService.calculateCost.mockReturnValue(12500);
        mockRecipeRepository.update.mockResolvedValue({ affected: 1 } as any);

        // Act
        await service.update(mockRecipeId, updateDto);

        // Assert
        expect(mockRecipeRepository.save).toHaveBeenCalled();
        expect(mockRecipeIngredientRepository.delete).toHaveBeenCalled();
        expect(mockRecipeIngredientRepository.save).toHaveBeenCalled();
        expect(mockRecipeRepository.update).toHaveBeenCalled();
      });

      it('should not recalculate cost when ingredients are not updated', async () => {
        // Arrange
        const updateDto: UpdateRecipeDto = {
          name: 'Only Name Changed',
        };

        mockRecipeRepository.findOne.mockResolvedValue(mockRecipe as Recipe);
        mockRecipeRepository.save.mockResolvedValue({
          ...mockRecipe,
          name: 'Only Name Changed',
        } as Recipe);

        // Act
        await service.update(mockRecipeId, updateDto);

        // Assert
        expect(mockRecipeIngredientRepository.delete).not.toHaveBeenCalled();
        expect(mockRecipeIngredientRepository.save).not.toHaveBeenCalled();
        expect(mockRecipeRepository.update).not.toHaveBeenCalled();
      });
    });

    describe('recalculateCost edge cases', () => {
      it('should handle recipe with no ingredients', async () => {
        // Arrange
        const recipeNoIngredients = {
          ...mockRecipe,
          ingredients: [],
        };
        mockRecipeRepository.findOne.mockResolvedValue(recipeNoIngredients as Recipe);
        mockRecipeRepository.update.mockResolvedValue({ affected: 1 } as any);

        // Act
        const result = await service.recalculateCost(mockRecipeId);

        // Assert
        expect(result).toBe(0);
        expect(mockUnitConversionService.calculateCost).not.toHaveBeenCalled();
      });

      it('should handle ingredient with null purchase_price', async () => {
        // Arrange
        const ingredientNoPurchasePrice = {
          ...mockRecipeIngredient1,
          ingredient: {
            ...mockIngredient1,
            purchase_price: null,
          },
        };
        const recipeWithNoPriceIngredient = {
          ...mockRecipe,
          ingredients: [ingredientNoPurchasePrice as unknown as RecipeIngredient],
        };

        mockRecipeRepository.findOne.mockResolvedValue(recipeWithNoPriceIngredient as Recipe);
        mockRecipeRepository.update.mockResolvedValue({ affected: 1 } as any);

        // Act
        const result = await service.recalculateCost(mockRecipeId);

        // Assert
        expect(result).toBe(0);
        expect(mockUnitConversionService.calculateCost).not.toHaveBeenCalled();
      });

      it('should handle ingredient with purchase_price of 0', async () => {
        // Arrange
        const ingredientZeroPrice = {
          ...mockRecipeIngredient1,
          ingredient: {
            ...mockIngredient1,
            purchase_price: 0,
          },
        };
        const recipeWithZeroPriceIngredient = {
          ...mockRecipe,
          ingredients: [ingredientZeroPrice as RecipeIngredient],
        };

        mockRecipeRepository.findOne.mockResolvedValue(recipeWithZeroPriceIngredient as Recipe);
        mockRecipeRepository.update.mockResolvedValue({ affected: 1 } as any);

        // Act
        const result = await service.recalculateCost(mockRecipeId);

        // Assert
        // 0 is falsy, so should not calculate
        expect(result).toBe(0);
      });

      it('should handle unit conversion errors gracefully', async () => {
        // Arrange
        mockRecipeRepository.findOne.mockResolvedValue(mockRecipe as Recipe);
        mockUnitConversionService.calculateCost
          .mockImplementationOnce(() => {
            throw new Error('First error');
          })
          .mockImplementationOnce(() => {
            throw new Error('Second error');
          });
        mockRecipeRepository.update.mockResolvedValue({ affected: 1 } as any);

        // Act
        const result = await service.recalculateCost(mockRecipeId);

        // Assert - with errors, cost calculation falls back to 0 for those ingredients
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThanOrEqual(0);
      });
    });

    describe('getStats edge cases', () => {
      it('should handle null avg value from database', async () => {
        // Arrange
        mockRecipeRepository.count
          .mockResolvedValueOnce(0) // total
          .mockResolvedValueOnce(0); // active

        mockRecipeRepository.createQueryBuilder.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ avg: null }),
        } as any);

        // Act
        const result = await service.getStats();

        // Assert
        expect(result.average_cost).toBe(0);
      });

      it('should parse string avg value from database', async () => {
        // Arrange
        mockRecipeRepository.count
          .mockResolvedValueOnce(5) // total
          .mockResolvedValueOnce(4); // active

        mockRecipeRepository.createQueryBuilder.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ avg: '12345.67' }),
        } as any);

        // Act
        const result = await service.getStats();

        // Assert
        expect(result.average_cost).toBe(12345.67);
      });

      it('should calculate inactive correctly', async () => {
        // Arrange
        mockRecipeRepository.count
          .mockResolvedValueOnce(100) // total
          .mockResolvedValueOnce(75); // active

        mockRecipeRepository.createQueryBuilder.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ avg: '10000' }),
        } as any);

        // Act
        const result = await service.getStats();

        // Assert
        expect(result.inactive).toBe(25);
        expect(result.total).toBe(100);
        expect(result.active).toBe(75);
      });
    });

    describe('findPrimaryRecipe edge cases', () => {
      it('should return first recipe when multiple match', async () => {
        // Arrange
        const recipe1 = { ...mockRecipe, id: 'recipe-1' };
        const recipe2 = { ...mockRecipe, id: 'recipe-2' };
        mockQueryBuilder.getMany.mockResolvedValue([recipe1 as Recipe, recipe2 as Recipe]);

        // Act
        const result = await service.findPrimaryRecipe(mockProductId);

        // Assert
        expect(result).toEqual(recipe1);
      });
    });

    describe('remove edge cases', () => {
      it('should call softRemove with the found recipe', async () => {
        // Arrange
        mockRecipeRepository.findOne.mockResolvedValue(mockRecipe as Recipe);
        mockRecipeRepository.softRemove.mockResolvedValue(mockRecipe as Recipe);

        // Act
        await service.remove(mockRecipeId);

        // Assert
        expect(mockRecipeRepository.softRemove).toHaveBeenCalledWith(mockRecipe);
      });
    });

    describe('ingredient validation in create', () => {
      it('should throw when product_id does not exist', async () => {
        // Arrange
        mockRecipeRepository.findOne.mockResolvedValue(null);
        mockNomenclatureService.findOne.mockRejectedValue(
          new NotFoundException('Номенклатура не найдена'),
        );

        // Act & Assert
        await expect(service.create(createRecipeDto)).rejects.toThrow(NotFoundException);
      });

      it('should throw when ingredient does not exist', async () => {
        // Arrange
        mockRecipeRepository.findOne.mockResolvedValue(null);
        mockNomenclatureService.findOne
          .mockResolvedValueOnce(mockProduct as Nomenclature) // Product exists
          .mockRejectedValueOnce(new NotFoundException('Ingredient not found')); // First ingredient missing

        // Act & Assert
        await expect(service.create(createRecipeDto)).rejects.toThrow(NotFoundException);
      });
    });
  });
});
