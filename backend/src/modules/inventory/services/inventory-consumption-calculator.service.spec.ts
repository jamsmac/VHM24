import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Between } from 'typeorm';
import { InventoryConsumptionCalculatorService } from './inventory-consumption-calculator.service';
import { Transaction, TransactionType } from '../../transactions/entities/transaction.entity';
import { RecipeSnapshot } from '../../recipes/entities/recipe-snapshot.entity';
import { Recipe } from '../../recipes/entities/recipe.entity';
import { createMockRepository } from '@/test/helpers';

/**
 * Unit Tests for InventoryConsumptionCalculatorService
 *
 * Tests the calculation of theoretical ingredient consumption based on sales.
 */
describe('InventoryConsumptionCalculatorService', () => {
  let service: InventoryConsumptionCalculatorService;
  let transactionRepo: any;
  let recipeSnapshotRepo: any;
  let recipeRepo: any;

  // Test fixtures
  const testMachineId = '11111111-1111-1111-1111-111111111111';
  const testRecipeId = '22222222-2222-2222-2222-222222222222';
  const testSnapshotId = '33333333-3333-3333-3333-333333333333';
  const testNomenclatureId1 = '44444444-4444-4444-4444-444444444444';
  const testNomenclatureId2 = '55555555-5555-5555-5555-555555555555';

  beforeEach(async () => {
    transactionRepo = createMockRepository<Transaction>();
    recipeSnapshotRepo = createMockRepository<RecipeSnapshot>();
    recipeRepo = createMockRepository<Recipe>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryConsumptionCalculatorService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: transactionRepo,
        },
        {
          provide: getRepositoryToken(RecipeSnapshot),
          useValue: recipeSnapshotRepo,
        },
        {
          provide: getRepositoryToken(Recipe),
          useValue: recipeRepo,
        },
      ],
    }).compile();

    service = module.get<InventoryConsumptionCalculatorService>(
      InventoryConsumptionCalculatorService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateTheoreticalConsumption', () => {
    const fromDate = new Date('2025-01-01');
    const toDate = new Date('2025-06-30');

    it('should calculate consumption for sales with recipe snapshots', async () => {
      // Arrange
      const salesTransactions = [
        {
          id: 'trans-1',
          transaction_type: TransactionType.SALE,
          recipe_id: testRecipeId,
          recipe_snapshot_id: testSnapshotId,
          quantity: 2, // 2 portions
          transaction_date: new Date('2025-03-15'),
        },
      ];

      const snapshot = {
        id: testSnapshotId,
        snapshot: {
          items: [
            {
              nomenclature_id: testNomenclatureId1,
              quantity: 10,
              nomenclature_name: 'Coffee Beans',
            },
            {
              nomenclature_id: testNomenclatureId2,
              quantity: 5,
              nomenclature_name: 'Milk',
            },
          ],
        },
      };

      transactionRepo.find.mockResolvedValue(salesTransactions);
      recipeSnapshotRepo.findOne.mockResolvedValue(snapshot);

      // Act
      const result = await service.calculateTheoreticalConsumption(testMachineId, fromDate, toDate);

      // Assert
      // 2 portions * 10 units = 20 for ingredient 1
      // 2 portions * 5 units = 10 for ingredient 2
      expect(result.get(testNomenclatureId1)).toBe(20);
      expect(result.get(testNomenclatureId2)).toBe(10);
    });

    it('should fall back to current recipe if snapshot not found', async () => {
      // Arrange
      const salesTransactions = [
        {
          id: 'trans-1',
          transaction_type: TransactionType.SALE,
          recipe_id: testRecipeId,
          recipe_snapshot_id: testSnapshotId,
          quantity: 1,
          transaction_date: new Date('2025-03-15'),
        },
      ];

      const currentRecipe = {
        id: testRecipeId,
        ingredients: [
          {
            ingredient_id: testNomenclatureId1,
            quantity: 15,
            ingredient: { name: 'Coffee Beans' },
          },
        ],
      };

      transactionRepo.find.mockResolvedValue(salesTransactions);
      recipeSnapshotRepo.findOne.mockResolvedValue(null); // Snapshot not found
      recipeRepo.findOne.mockResolvedValue(currentRecipe);

      // Act
      const result = await service.calculateTheoreticalConsumption(testMachineId, fromDate, toDate);

      // Assert
      expect(result.get(testNomenclatureId1)).toBe(15);
      expect(recipeRepo.findOne).toHaveBeenCalledWith({
        where: { id: testRecipeId },
        relations: ['ingredients', 'ingredients.ingredient'],
      });
    });

    it('should use current recipe when sale has no snapshot_id', async () => {
      // Arrange
      const salesTransactions = [
        {
          id: 'trans-1',
          transaction_type: TransactionType.SALE,
          recipe_id: testRecipeId,
          recipe_snapshot_id: null, // No snapshot
          quantity: 3,
          transaction_date: new Date('2025-03-15'),
        },
      ];

      const currentRecipe = {
        id: testRecipeId,
        ingredients: [
          {
            ingredient_id: testNomenclatureId1,
            quantity: 8,
            ingredient: { name: 'Coffee Beans' },
          },
        ],
      };

      transactionRepo.find.mockResolvedValue(salesTransactions);
      recipeRepo.findOne.mockResolvedValue(currentRecipe);

      // Act
      const result = await service.calculateTheoreticalConsumption(testMachineId, fromDate, toDate);

      // Assert
      expect(result.get(testNomenclatureId1)).toBe(24); // 3 * 8
      expect(recipeSnapshotRepo.findOne).not.toHaveBeenCalled();
    });

    it('should skip sales without recipe_id', async () => {
      // Arrange
      const salesTransactions = [
        {
          id: 'trans-1',
          transaction_type: TransactionType.SALE,
          recipe_id: null, // No recipe
          quantity: 1,
          transaction_date: new Date('2025-03-15'),
        },
      ];

      transactionRepo.find.mockResolvedValue(salesTransactions);

      // Act
      const result = await service.calculateTheoreticalConsumption(testMachineId, fromDate, toDate);

      // Assert
      expect(result.size).toBe(0);
      expect(recipeRepo.findOne).not.toHaveBeenCalled();
      expect(recipeSnapshotRepo.findOne).not.toHaveBeenCalled();
    });

    it('should skip sales where recipe has no ingredients', async () => {
      // Arrange
      const salesTransactions = [
        {
          id: 'trans-1',
          transaction_type: TransactionType.SALE,
          recipe_id: testRecipeId,
          recipe_snapshot_id: null,
          quantity: 1,
          transaction_date: new Date('2025-03-15'),
        },
      ];

      const emptyRecipe = {
        id: testRecipeId,
        ingredients: [],
      };

      transactionRepo.find.mockResolvedValue(salesTransactions);
      recipeRepo.findOne.mockResolvedValue(emptyRecipe);

      // Act
      const result = await service.calculateTheoreticalConsumption(testMachineId, fromDate, toDate);

      // Assert
      expect(result.size).toBe(0);
    });

    it('should aggregate consumption across multiple sales', async () => {
      // Arrange
      const salesTransactions = [
        {
          id: 'trans-1',
          transaction_type: TransactionType.SALE,
          recipe_id: testRecipeId,
          recipe_snapshot_id: null,
          quantity: 2,
          transaction_date: new Date('2025-03-15'),
        },
        {
          id: 'trans-2',
          transaction_type: TransactionType.SALE,
          recipe_id: testRecipeId,
          recipe_snapshot_id: null,
          quantity: 3,
          transaction_date: new Date('2025-03-16'),
        },
      ];

      const currentRecipe = {
        id: testRecipeId,
        ingredients: [
          {
            ingredient_id: testNomenclatureId1,
            quantity: 10,
            ingredient: { name: 'Coffee Beans' },
          },
        ],
      };

      transactionRepo.find.mockResolvedValue(salesTransactions);
      recipeRepo.findOne.mockResolvedValue(currentRecipe);

      // Act
      const result = await service.calculateTheoreticalConsumption(testMachineId, fromDate, toDate);

      // Assert
      // Total: (2 * 10) + (3 * 10) = 50
      expect(result.get(testNomenclatureId1)).toBe(50);
    });

    it('should handle multiple ingredients in a recipe', async () => {
      // Arrange
      const salesTransactions = [
        {
          id: 'trans-1',
          transaction_type: TransactionType.SALE,
          recipe_id: testRecipeId,
          recipe_snapshot_id: null,
          quantity: 1,
          transaction_date: new Date('2025-03-15'),
        },
      ];

      const currentRecipe = {
        id: testRecipeId,
        ingredients: [
          {
            ingredient_id: testNomenclatureId1,
            quantity: 10,
            ingredient: { name: 'Coffee Beans' },
          },
          {
            ingredient_id: testNomenclatureId2,
            quantity: 20,
            ingredient: { name: 'Water' },
          },
          { ingredient_id: 'nom-3', quantity: 5, ingredient: { name: 'Sugar' } },
        ],
      };

      transactionRepo.find.mockResolvedValue(salesTransactions);
      recipeRepo.findOne.mockResolvedValue(currentRecipe);

      // Act
      const result = await service.calculateTheoreticalConsumption(testMachineId, fromDate, toDate);

      // Assert
      expect(result.size).toBe(3);
      expect(result.get(testNomenclatureId1)).toBe(10);
      expect(result.get(testNomenclatureId2)).toBe(20);
      expect(result.get('nom-3')).toBe(5);
    });

    it('should filter sales by machine when machineId is provided', async () => {
      // Arrange
      transactionRepo.find.mockResolvedValue([]);

      // Act
      await service.calculateTheoreticalConsumption(testMachineId, fromDate, toDate);

      // Assert
      expect(transactionRepo.find).toHaveBeenCalledWith({
        where: {
          transaction_type: TransactionType.SALE,
          transaction_date: Between(fromDate, toDate),
          machine_id: testMachineId,
        },
        order: { transaction_date: 'ASC' },
      });
    });

    it('should get all sales when machineId is null', async () => {
      // Arrange
      transactionRepo.find.mockResolvedValue([]);

      // Act
      await service.calculateTheoreticalConsumption(null, fromDate, toDate);

      // Assert
      expect(transactionRepo.find).toHaveBeenCalledWith({
        where: {
          transaction_type: TransactionType.SALE,
          transaction_date: Between(fromDate, toDate),
        },
        order: { transaction_date: 'ASC' },
      });
    });

    it('should return empty map when no sales found', async () => {
      // Arrange
      transactionRepo.find.mockResolvedValue([]);

      // Act
      const result = await service.calculateTheoreticalConsumption(testMachineId, fromDate, toDate);

      // Assert
      expect(result.size).toBe(0);
    });

    it('should default to quantity 1 when sale quantity is null', async () => {
      // Arrange
      const salesTransactions = [
        {
          id: 'trans-1',
          transaction_type: TransactionType.SALE,
          recipe_id: testRecipeId,
          recipe_snapshot_id: null,
          quantity: null, // No quantity specified
          transaction_date: new Date('2025-03-15'),
        },
      ];

      const currentRecipe = {
        id: testRecipeId,
        ingredients: [
          {
            ingredient_id: testNomenclatureId1,
            quantity: 10,
            ingredient: { name: 'Coffee Beans' },
          },
        ],
      };

      transactionRepo.find.mockResolvedValue(salesTransactions);
      recipeRepo.findOne.mockResolvedValue(currentRecipe);

      // Act
      const result = await service.calculateTheoreticalConsumption(testMachineId, fromDate, toDate);

      // Assert
      // Default 1 portion * 10 units = 10
      expect(result.get(testNomenclatureId1)).toBe(10);
    });

    it('should handle snapshot loading error gracefully', async () => {
      // Arrange
      const salesTransactions = [
        {
          id: 'trans-1',
          transaction_type: TransactionType.SALE,
          recipe_id: testRecipeId,
          recipe_snapshot_id: testSnapshotId,
          quantity: 1,
          transaction_date: new Date('2025-03-15'),
        },
      ];

      const currentRecipe = {
        id: testRecipeId,
        ingredients: [
          {
            ingredient_id: testNomenclatureId1,
            quantity: 10,
            ingredient: { name: 'Coffee Beans' },
          },
        ],
      };

      transactionRepo.find.mockResolvedValue(salesTransactions);
      recipeSnapshotRepo.findOne.mockRejectedValue(new Error('Database error'));
      recipeRepo.findOne.mockResolvedValue(currentRecipe);

      // Act
      const result = await service.calculateTheoreticalConsumption(testMachineId, fromDate, toDate);

      // Assert - Should fall back to current recipe
      expect(result.get(testNomenclatureId1)).toBe(10);
    });

    it('should handle snapshot with invalid structure gracefully', async () => {
      // Arrange
      const salesTransactions = [
        {
          id: 'trans-1',
          transaction_type: TransactionType.SALE,
          recipe_id: testRecipeId,
          recipe_snapshot_id: testSnapshotId,
          quantity: 1,
          transaction_date: new Date('2025-03-15'),
        },
      ];

      const invalidSnapshot = {
        id: testSnapshotId,
        snapshot: null, // Invalid structure
      };

      const currentRecipe = {
        id: testRecipeId,
        ingredients: [
          {
            ingredient_id: testNomenclatureId1,
            quantity: 10,
            ingredient: { name: 'Coffee Beans' },
          },
        ],
      };

      transactionRepo.find.mockResolvedValue(salesTransactions);
      recipeSnapshotRepo.findOne.mockResolvedValue(invalidSnapshot);
      recipeRepo.findOne.mockResolvedValue(currentRecipe);

      // Act
      const result = await service.calculateTheoreticalConsumption(testMachineId, fromDate, toDate);

      // Assert - Should fall back to current recipe
      expect(result.get(testNomenclatureId1)).toBe(10);
    });
  });

  describe('calculateIngredientConsumption', () => {
    const fromDate = new Date('2025-01-01');
    const toDate = new Date('2025-06-30');

    it('should return consumption for specific ingredient', async () => {
      // Arrange
      const salesTransactions = [
        {
          id: 'trans-1',
          transaction_type: TransactionType.SALE,
          recipe_id: testRecipeId,
          recipe_snapshot_id: null,
          quantity: 5,
          transaction_date: new Date('2025-03-15'),
        },
      ];

      const currentRecipe = {
        id: testRecipeId,
        ingredients: [
          {
            ingredient_id: testNomenclatureId1,
            quantity: 10,
            ingredient: { name: 'Coffee Beans' },
          },
          {
            ingredient_id: testNomenclatureId2,
            quantity: 20,
            ingredient: { name: 'Water' },
          },
        ],
      };

      transactionRepo.find.mockResolvedValue(salesTransactions);
      recipeRepo.findOne.mockResolvedValue(currentRecipe);

      // Act
      const result = await service.calculateIngredientConsumption(
        testNomenclatureId1,
        testMachineId,
        fromDate,
        toDate,
      );

      // Assert
      expect(result).toBe(50); // 5 * 10
    });

    it('should return 0 if ingredient not in any recipe', async () => {
      // Arrange
      const salesTransactions = [
        {
          id: 'trans-1',
          transaction_type: TransactionType.SALE,
          recipe_id: testRecipeId,
          recipe_snapshot_id: null,
          quantity: 5,
          transaction_date: new Date('2025-03-15'),
        },
      ];

      const currentRecipe = {
        id: testRecipeId,
        ingredients: [
          {
            ingredient_id: testNomenclatureId1,
            quantity: 10,
            ingredient: { name: 'Coffee Beans' },
          },
        ],
      };

      transactionRepo.find.mockResolvedValue(salesTransactions);
      recipeRepo.findOne.mockResolvedValue(currentRecipe);

      // Act
      const result = await service.calculateIngredientConsumption(
        'non-existent-ingredient',
        testMachineId,
        fromDate,
        toDate,
      );

      // Assert
      expect(result).toBe(0);
    });

    it('should work without machineId filter', async () => {
      // Arrange
      transactionRepo.find.mockResolvedValue([]);

      // Act
      await service.calculateIngredientConsumption(testNomenclatureId1, null, fromDate, toDate);

      // Assert
      expect(transactionRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ machine_id: expect.anything() }),
        }),
      );
    });
  });
});
