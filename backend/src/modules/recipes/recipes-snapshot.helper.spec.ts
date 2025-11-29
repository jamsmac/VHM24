import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RecipeSnapshotHelper } from './recipes-snapshot.helper';
import { RecipeSnapshot } from './entities/recipe-snapshot.entity';
import { Recipe } from './entities/recipe.entity';

describe('RecipeSnapshotHelper', () => {
  let helper: RecipeSnapshotHelper;
  let snapshotRepository: jest.Mocked<any>;

  const mockRecipe: Partial<Recipe> = {
    id: 'recipe-uuid',
    name: 'Espresso',
    description: 'Classic espresso',
    product_id: 'product-uuid',
    type_code: 'hot_drink',
    total_cost: 5000,
    serving_size_ml: 30,
    preparation_time_seconds: 25,
    temperature_celsius: 92,
    is_active: true,
    settings: { grindSize: 'fine' },
    ingredients: [
      {
        ingredient_id: 'ing-1',
        ingredient: { name: 'Coffee Beans' },
        quantity: 18,
        unit_of_measure_code: 'g',
        sort_order: 1,
      } as any,
    ],
  };

  const mockSnapshot: Partial<RecipeSnapshot> = {
    id: 'snapshot-uuid',
    recipe_id: 'recipe-uuid',
    version: 1,
    snapshot: {
      name: 'Espresso',
      description: null,
      category_code: 'hot_drink',
      base_cost: 5000,
      base_price: 7500,
      items: [],
      metadata: null,
    },
    valid_from: new Date('2025-01-01'),
    valid_to: null,
    checksum: 'abc123',
  };

  beforeEach(async () => {
    snapshotRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipeSnapshotHelper,
        {
          provide: getRepositoryToken(RecipeSnapshot),
          useValue: snapshotRepository,
        },
      ],
    }).compile();

    helper = module.get<RecipeSnapshotHelper>(RecipeSnapshotHelper);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSnapshot', () => {
    it('should create first snapshot with version 1', async () => {
      snapshotRepository.findOne.mockResolvedValue(null);
      snapshotRepository.create.mockReturnValue({ ...mockSnapshot, version: 1 });
      snapshotRepository.save.mockResolvedValue({ ...mockSnapshot, version: 1 });

      const result = await helper.createSnapshot(
        mockRecipe as Recipe,
        'user-uuid',
        'Initial version',
      );

      expect(snapshotRepository.create).toHaveBeenCalled();
      expect(snapshotRepository.save).toHaveBeenCalled();
      expect(result.version).toBe(1);
    });

    it('should increment version when previous snapshot exists', async () => {
      snapshotRepository.findOne.mockResolvedValue({ ...mockSnapshot, version: 3 });
      snapshotRepository.create.mockReturnValue({ ...mockSnapshot, version: 4 });
      snapshotRepository.save
        .mockResolvedValueOnce({ ...mockSnapshot, version: 3, valid_to: new Date() })
        .mockResolvedValueOnce({ ...mockSnapshot, version: 4 });

      const result = await helper.createSnapshot(
        mockRecipe as Recipe,
        'user-uuid',
        'Updated recipe',
      );

      expect(snapshotRepository.save).toHaveBeenCalledTimes(2);
      expect(result.version).toBe(4);
    });

    it('should close previous snapshot when creating new one', async () => {
      const previousSnapshot = { ...mockSnapshot, version: 2, valid_to: null };
      snapshotRepository.findOne.mockResolvedValue(previousSnapshot);
      snapshotRepository.create.mockReturnValue({ ...mockSnapshot, version: 3 });
      snapshotRepository.save.mockResolvedValue({ ...mockSnapshot, version: 3 });

      await helper.createSnapshot(mockRecipe as Recipe, 'user-uuid');

      const saveCall = snapshotRepository.save.mock.calls[0][0];
      expect(saveCall.valid_to).toBeDefined();
    });

    it('should include ingredients in snapshot data', async () => {
      snapshotRepository.findOne.mockResolvedValue(null);
      snapshotRepository.create.mockImplementation((data: any) => data);
      snapshotRepository.save.mockImplementation((data: any) => Promise.resolve(data));

      await helper.createSnapshot(mockRecipe as Recipe, 'user-uuid');

      const createCall = snapshotRepository.create.mock.calls[0][0];
      expect(createCall.snapshot.items).toHaveLength(1);
      expect(createCall.snapshot.items[0].ingredient_id).toBe('ing-1');
    });

    it('should handle recipe without ingredients', async () => {
      const recipeWithoutIngredients = {
        ...mockRecipe,
        ingredients: [] as any[],
      };
      snapshotRepository.findOne.mockResolvedValue(null);
      snapshotRepository.create.mockImplementation((data: any) => data);
      snapshotRepository.save.mockImplementation((data: any) => Promise.resolve(data));

      await helper.createSnapshot(recipeWithoutIngredients as unknown as Recipe, 'user-uuid');

      const createCall = snapshotRepository.create.mock.calls[0][0];
      expect(createCall.snapshot.items).toEqual([]);
    });

    it('should handle recipe with undefined ingredients', async () => {
      const recipeWithUndefinedIngredients = {
        ...mockRecipe,
        ingredients: undefined,
      };
      snapshotRepository.findOne.mockResolvedValue(null);
      snapshotRepository.create.mockImplementation((data: any) => data);
      snapshotRepository.save.mockImplementation((data: any) => Promise.resolve(data));

      await helper.createSnapshot(recipeWithUndefinedIngredients as unknown as Recipe, 'user-uuid');

      const createCall = snapshotRepository.create.mock.calls[0][0];
      expect(createCall.snapshot.items).toEqual([]);
    });

    it('should handle ingredient with no name', async () => {
      const recipeWithNoIngredientName = {
        ...mockRecipe,
        ingredients: [
          {
            ingredient_id: 'ing-1',
            ingredient: null, // No ingredient relation loaded
            quantity: 18,
            unit_of_measure_code: 'g',
            sort_order: 1,
          } as any,
        ],
      };
      snapshotRepository.findOne.mockResolvedValue(null);
      snapshotRepository.create.mockImplementation((data: any) => data);
      snapshotRepository.save.mockImplementation((data: any) => Promise.resolve(data));

      await helper.createSnapshot(recipeWithNoIngredientName as unknown as Recipe, 'user-uuid');

      const createCall = snapshotRepository.create.mock.calls[0][0];
      expect(createCall.snapshot.items[0].ingredient_name).toBe('');
    });

    it('should handle ingredient with undefined unit_of_measure_code', async () => {
      const recipeWithNoUom = {
        ...mockRecipe,
        ingredients: [
          {
            ingredient_id: 'ing-1',
            ingredient: { name: 'Coffee' },
            quantity: 18,
            unit_of_measure_code: undefined, // No UOM
            sort_order: 1,
          } as any,
        ],
      };
      snapshotRepository.findOne.mockResolvedValue(null);
      snapshotRepository.create.mockImplementation((data: any) => data);
      snapshotRepository.save.mockImplementation((data: any) => Promise.resolve(data));

      await helper.createSnapshot(recipeWithNoUom as unknown as Recipe, 'user-uuid');

      const createCall = snapshotRepository.create.mock.calls[0][0];
      expect(createCall.snapshot.items[0].unit_of_measure_code).toBe('unit');
    });

    it('should calculate checksum for snapshot', async () => {
      snapshotRepository.findOne.mockResolvedValue(null);
      snapshotRepository.create.mockImplementation((data: any) => data);
      snapshotRepository.save.mockImplementation((data: any) => Promise.resolve(data));

      await helper.createSnapshot(mockRecipe as Recipe, 'user-uuid');

      const createCall = snapshotRepository.create.mock.calls[0][0];
      expect(createCall.checksum).toBeDefined();
      expect(typeof createCall.checksum).toBe('string');
      expect(createCall.checksum.length).toBe(64); // SHA-256 hex
    });
  });

  describe('getCurrentSnapshot', () => {
    it('should return current snapshot with valid_to null', async () => {
      snapshotRepository.findOne.mockResolvedValue(mockSnapshot);

      const result = await helper.getCurrentSnapshot('recipe-uuid');

      expect(result).toEqual(mockSnapshot);
      expect(snapshotRepository.findOne).toHaveBeenCalledWith({
        where: {
          recipe_id: 'recipe-uuid',
          valid_to: expect.anything(),
        },
        order: {
          version: 'DESC',
        },
      });
    });

    it('should return null when no current snapshot exists', async () => {
      snapshotRepository.findOne.mockResolvedValue(null);

      const result = await helper.getCurrentSnapshot('recipe-uuid');

      expect(result).toBeNull();
    });
  });

  describe('getSnapshotByVersion', () => {
    it('should return snapshot by version number', async () => {
      snapshotRepository.findOne.mockResolvedValue({ ...mockSnapshot, version: 2 });

      const result = await helper.getSnapshotByVersion('recipe-uuid', 2);

      expect(result?.version).toBe(2);
      expect(snapshotRepository.findOne).toHaveBeenCalledWith({
        where: {
          recipe_id: 'recipe-uuid',
          version: 2,
        },
      });
    });

    it('should return null when version not found', async () => {
      snapshotRepository.findOne.mockResolvedValue(null);

      const result = await helper.getSnapshotByVersion('recipe-uuid', 999);

      expect(result).toBeNull();
    });
  });

  describe('getSnapshotAtDate', () => {
    it('should return snapshot active at specific date', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockSnapshot),
      };
      snapshotRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const date = new Date('2025-01-15');
      const result = await helper.getSnapshotAtDate('recipe-uuid', date);

      expect(result).toEqual(mockSnapshot);
      expect(mockQueryBuilder.where).toHaveBeenCalled();
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(2);
    });

    it('should return null when no snapshot found for date', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      snapshotRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await helper.getSnapshotAtDate('recipe-uuid', new Date('2020-01-01'));

      expect(result).toBeNull();
    });
  });

  describe('getAllVersions', () => {
    it('should return all versions ordered by version DESC', async () => {
      const snapshots = [
        { ...mockSnapshot, version: 3 },
        { ...mockSnapshot, version: 2 },
        { ...mockSnapshot, version: 1 },
      ];
      snapshotRepository.find.mockResolvedValue(snapshots);

      const result = await helper.getAllVersions('recipe-uuid');

      expect(result).toHaveLength(3);
      expect(snapshotRepository.find).toHaveBeenCalledWith({
        where: { recipe_id: 'recipe-uuid' },
        order: { version: 'DESC' },
      });
    });

    it('should return empty array when no versions exist', async () => {
      snapshotRepository.find.mockResolvedValue([]);

      const result = await helper.getAllVersions('recipe-uuid');

      expect(result).toEqual([]);
    });
  });

  describe('verifySnapshot', () => {
    it('should return true for valid snapshot', async () => {
      // Create a snapshot with matching checksum
      const snapshotData = {
        name: 'Test',
        description: null,
        category_code: 'test',
        base_cost: 0,
        base_price: 0,
        items: [],
        metadata: null,
      };
      const snapshot = {
        ...mockSnapshot,
        snapshot: snapshotData,
      } as unknown as RecipeSnapshot;

      // Calculate the expected checksum
      const crypto = require('crypto');
      const json = JSON.stringify(snapshotData, Object.keys(snapshotData).sort());
      const expectedChecksum = crypto.createHash('sha256').update(json).digest('hex');
      snapshot.checksum = expectedChecksum;

      const result = await helper.verifySnapshot(snapshot);

      expect(result).toBe(true);
    });

    it('should return false for tampered snapshot', async () => {
      const snapshot = {
        ...mockSnapshot,
        snapshot: {
          name: 'Modified',
          description: null,
          category_code: 'test',
          base_cost: 0,
          base_price: 0,
          items: [],
          metadata: null,
        },
        checksum: 'invalid-checksum',
      } as unknown as RecipeSnapshot;

      const result = await helper.verifySnapshot(snapshot);

      expect(result).toBe(false);
    });
  });
});
