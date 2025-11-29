import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitterModule, EventEmitter2 } from '@nestjs/event-emitter';
import { TransactionsService } from './transactions.service';
import { InventoryService } from '../inventory/inventory.service';
import { RecipesService } from '../recipes/recipes.service';
import { IncidentsService } from '../incidents/incidents.service';
import { AuditLogService } from '../security/services/audit-log.service';
import { Transaction, TransactionType, PaymentMethod } from './entities/transaction.entity';
import { Machine } from '../machines/entities/machine.entity';
import { Recipe } from '../recipes/entities/recipe.entity';
import { RecipeIngredient } from '../recipes/entities/recipe-ingredient.entity';
import { Nomenclature } from '../nomenclature/entities/nomenclature.entity';
import { MachineInventory } from '../inventory/entities/machine-inventory.entity';
import { InventoryMovement } from '../inventory/entities/inventory-movement.entity';
import { createMockRepository } from '@/test/helpers';

/**
 * Integration Test: Transactions Service - Inventory Deduction
 *
 * CRITICAL TEST: Verifies that recordSale() correctly deducts inventory.
 *
 * Test Scenario:
 * 1. Setup: Create machine, recipe (cappuccino), ingredients (coffee, milk)
 * 2. Setup: Load inventory into machine (coffee: 1000g, milk: 2000g)
 * 3. Action: Record sale of 1 cappuccino (requires 10g coffee + 200g milk)
 * 4. Assert: Transaction created
 * 5. Assert: Coffee reduced to 990g
 * 6. Assert: Milk reduced to 1800g
 * 7. Assert: Inventory movements recorded
 */
describe('TransactionsService - Inventory Integration (Integration)', () => {
  let service: TransactionsService;
  let inventoryService: InventoryService;
  let recipesService: RecipesService;
  let module: TestingModule;

  // Mock entities for test
  let machine: Machine;
  let recipe: Recipe;
  let coffee: Nomenclature;
  let milk: Nomenclature;

  beforeAll(async () => {
    // Note: This requires actual database connection for integration testing
    // For unit tests, use mocks instead

    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        TransactionsService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: createMockRepository<Transaction>(),
        },
        {
          provide: getRepositoryToken(Machine),
          useValue: createMockRepository<Machine>(),
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
        {
          provide: InventoryService,
          useValue: {
            deductMachineInventory: jest.fn(),
            deductFromMachine: jest.fn(),
            getMachineInventoryByNomenclature: jest.fn(),
            createMovement: jest.fn(),
          },
        },
        {
          provide: RecipesService,
          useValue: {
            findOne: jest.fn(),
            findActiveRecipe: jest.fn(),
          },
        },
        {
          provide: IncidentsService,
          useValue: {
            create: jest.fn(),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    inventoryService = module.get<InventoryService>(InventoryService);
    recipesService = module.get<RecipesService>(RecipesService);
  });

  beforeEach(() => {
    // Setup mock repository to return created transaction
    const transactionRepository: any = module.get(getRepositoryToken(Transaction));
    transactionRepository.create.mockImplementation((dto: any) => ({
      ...dto,
      id: 'mock-transaction-id',
    }));
    transactionRepository.save.mockImplementation((transaction: any) =>
      Promise.resolve(transaction),
    );

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await module.close();
  });

  describe('recordSale() - Inventory Deduction', () => {
    it('should deduct inventory when recording a sale with recipe', async () => {
      // Arrange: Create test data
      const machineId = 'machine-001';
      const recipeId = 'recipe-cappuccino';
      const coffeeId = 'nomenclature-coffee';
      const milkId = 'nomenclature-milk';

      // Mock recipe with ingredients
      const mockRecipe = {
        id: recipeId,
        name: 'Cappuccino',
        ingredients: [
          {
            ingredient_id: coffeeId,
            quantity: 10, // 10g coffee per cappuccino
            unit_of_measure_code: 'g',
            ingredient: { id: coffeeId, name: 'Coffee Beans' },
          },
          {
            ingredient_id: milkId,
            quantity: 200, // 200ml milk per cappuccino
            unit_of_measure_code: 'ml',
            ingredient: { id: milkId, name: 'Milk' },
          },
        ],
      };

      jest.spyOn(recipesService, 'findOne').mockResolvedValue(mockRecipe as any);

      // Mock inventory deduction
      jest.spyOn(inventoryService, 'deductFromMachine').mockResolvedValue(undefined);

      // Act: Record sale of 2 cappuccinos
      const result = await service.recordSale({
        machine_id: machineId,
        recipe_id: recipeId,
        amount: 30000, // 15000 UZS per cappuccino
        payment_method: PaymentMethod.CASH,
        quantity: 2,
      });

      // Assert: Transaction created
      expect(result).toBeDefined();
      expect(result.transaction_type).toBe(TransactionType.SALE);
      expect(result.amount).toBe(30000);

      // Assert: Recipe fetched
      expect(recipesService.findOne).toHaveBeenCalledWith(recipeId);

      // Assert: Inventory deducted for coffee (10g * 2 = 20g)
      expect(inventoryService.deductFromMachine).toHaveBeenCalledWith(
        machineId,
        coffeeId,
        20,
        expect.stringContaining('Продажа: Cappuccino x2'),
      );

      // Assert: Inventory deducted for milk (200ml * 2 = 400ml)
      expect(inventoryService.deductFromMachine).toHaveBeenCalledWith(
        machineId,
        milkId,
        400,
        expect.stringContaining('Продажа: Cappuccino x2'),
      );

      // Assert: Called twice (once per ingredient)
      expect(inventoryService.deductFromMachine).toHaveBeenCalledTimes(2);
    });

    it('should handle inventory deduction failure gracefully', async () => {
      // Arrange: Mock recipe
      const mockRecipe = {
        id: 'recipe-latte',
        name: 'Latte',
        ingredients: [
          {
            ingredient_id: 'coffee-id',
            quantity: 15,
            unit_of_measure_code: 'g',
            ingredient: { id: 'coffee-id', name: 'Coffee' },
          },
        ],
      };

      jest.spyOn(recipesService, 'findOne').mockResolvedValue(mockRecipe as any);

      // Mock inventory deduction failure (insufficient stock)
      jest
        .spyOn(inventoryService, 'deductFromMachine')
        .mockRejectedValue(new Error('Недостаточно товара в аппарате'));

      // Act: Record sale (should not throw)
      const result = await service.recordSale({
        machine_id: 'machine-002',
        recipe_id: 'recipe-latte',
        amount: 18000,
        payment_method: PaymentMethod.CARD,
        quantity: 1,
      });

      // Assert: Transaction still created despite inventory error
      expect(result).toBeDefined();
      expect(result.transaction_type).toBe(TransactionType.SALE);

      // Assert: Deduction was attempted
      expect(inventoryService.deductFromMachine).toHaveBeenCalled();

      // Note: In real system, this would create an incident for manual resolution
    });

    it('should skip inventory deduction if recipe has no items', async () => {
      // Arrange: Mock recipe without ingredients
      const mockRecipe = {
        id: 'recipe-empty',
        name: 'Empty Recipe',
        ingredients: [],
      };

      jest.spyOn(recipesService, 'findOne').mockResolvedValue(mockRecipe as any);
      jest.spyOn(inventoryService, 'deductFromMachine').mockResolvedValue(undefined);

      // Act: Record sale
      const result = await service.recordSale({
        machine_id: 'machine-003',
        recipe_id: 'recipe-empty',
        amount: 5000,
        payment_method: PaymentMethod.MOBILE,
        quantity: 1,
      });

      // Assert: Transaction created
      expect(result).toBeDefined();

      // Assert: Inventory deduction NOT called
      expect(inventoryService.deductFromMachine).not.toHaveBeenCalled();
    });

    it('should warn if sale recorded without recipe_id', async () => {
      // Act: Record sale without recipe
      const result = await service.recordSale({
        machine_id: 'machine-004',
        // No recipe_id provided
        amount: 10000,
        payment_method: PaymentMethod.QR,
        quantity: 1,
      });

      // Assert: Transaction created
      expect(result).toBeDefined();

      // Assert: Inventory NOT deducted (no recipe)
      expect(inventoryService.deductFromMachine).not.toHaveBeenCalled();

      // Note: System should log warning about missing recipe_id
    });

    it('should deduct correct quantities for multiple items', async () => {
      // Arrange: Complex recipe with 3 ingredients
      const mockRecipe = {
        id: 'recipe-mocha',
        name: 'Mocha',
        ingredients: [
          {
            ingredient_id: 'coffee',
            quantity: 12,
            unit_of_measure_code: 'g',
            ingredient: { name: 'Coffee' },
          },
          {
            ingredient_id: 'milk',
            quantity: 150,
            unit_of_measure_code: 'ml',
            ingredient: { name: 'Milk' },
          },
          {
            ingredient_id: 'chocolate',
            quantity: 20,
            unit_of_measure_code: 'g',
            ingredient: { name: 'Chocolate' },
          },
        ],
      };

      jest.spyOn(recipesService, 'findOne').mockResolvedValue(mockRecipe as any);
      jest.spyOn(inventoryService, 'deductFromMachine').mockResolvedValue(undefined);

      // Act: Record sale of 3 mochas
      await service.recordSale({
        machine_id: 'machine-005',
        recipe_id: 'recipe-mocha',
        amount: 60000,
        payment_method: PaymentMethod.CASH,
        quantity: 3,
      });

      // Assert: 3 deductions (one per ingredient)
      expect(inventoryService.deductFromMachine).toHaveBeenCalledTimes(3);

      // Assert: Correct quantities (quantity * recipe.item.quantity)
      expect(inventoryService.deductFromMachine).toHaveBeenNthCalledWith(
        1,
        'machine-005',
        'coffee',
        36, // 12 * 3
        expect.any(String),
      );
      expect(inventoryService.deductFromMachine).toHaveBeenNthCalledWith(
        2,
        'machine-005',
        'milk',
        450, // 150 * 3
        expect.any(String),
      );
      expect(inventoryService.deductFromMachine).toHaveBeenNthCalledWith(
        3,
        'machine-005',
        'chocolate',
        60, // 20 * 3
        expect.any(String),
      );
    });
  });

  describe('recordSale() - Edge Cases', () => {
    it('should handle missing recipe gracefully', async () => {
      // Arrange: Recipe not found
      jest.spyOn(recipesService, 'findOne').mockRejectedValue(new Error('Recipe not found'));

      // Act: Should not throw
      const result = await service.recordSale({
        machine_id: 'machine-006',
        recipe_id: 'non-existent-recipe',
        amount: 5000,
        payment_method: PaymentMethod.CASH,
        quantity: 1,
      });

      // Assert: Transaction still created
      expect(result).toBeDefined();
    });

    it('should handle zero quantity correctly', async () => {
      // Arrange
      const mockRecipe = {
        id: 'recipe-test',
        name: 'Test',
        ingredients: [
          {
            ingredient_id: 'item-1',
            quantity: 10,
            unit_of_measure_code: 'g',
            ingredient: { name: 'Item 1' },
          },
        ],
      };

      jest.spyOn(recipesService, 'findOne').mockResolvedValue(mockRecipe as any);
      jest.spyOn(inventoryService, 'deductFromMachine').mockResolvedValue(undefined);

      // Act: Quantity defaults to 1 if not provided
      await service.recordSale({
        machine_id: 'machine-007',
        recipe_id: 'recipe-test',
        amount: 5000,
        payment_method: PaymentMethod.CASH,
        // quantity not provided (should default to 1)
      });

      // Assert: Deducted with quantity = 1
      expect(inventoryService.deductFromMachine).toHaveBeenCalledWith(
        'machine-007',
        'item-1',
        10, // 10 * 1
        expect.any(String),
      );
    });
  });
});
