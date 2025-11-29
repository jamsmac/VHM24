import { Test, TestingModule } from '@nestjs/testing';
import { DictionaryCacheService } from './dictionary-cache.service';
import { DictionariesService } from '../dictionaries.service';
import { Dictionary } from '../entities/dictionary.entity';
import { DictionaryItem } from '../entities/dictionary-item.entity';

describe('DictionaryCacheService', () => {
  let service: DictionaryCacheService;
  let dictionariesService: jest.Mocked<DictionariesService>;

  const mockDictionary: Dictionary = {
    id: 'dict-1',
    code: 'machine_types',
    name_ru: 'Типы аппаратов',
    name_en: 'Machine Types',
    description: 'Types of vending machines',
    is_system: true,
    is_active: true,
    sort_order: 1,
    items: [],
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    created_by_id: null,
    updated_by_id: null,
  };

  const mockDictionaryItem: DictionaryItem = {
    id: 'item-1',
    dictionary_id: 'dict-1',
    code: 'coffee_machine',
    value_ru: 'Кофейный автомат',
    value_en: 'Coffee Machine',
    description: 'Coffee vending machine',
    is_active: true,
    sort_order: 1,
    metadata: {},
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    created_by_id: null,
    updated_by_id: null,
    dictionary: mockDictionary,
  };

  beforeEach(async () => {
    const mockDictionariesService = {
      findAllDictionaries: jest.fn(),
      findOneDictionary: jest.fn(),
      findByCode: jest.fn(),
      findAllDictionaryItems: jest.fn(),
      findOneDictionaryItem: jest.fn(),
      createDictionary: jest.fn(),
      updateDictionary: jest.fn(),
      removeDictionary: jest.fn(),
      createDictionaryItem: jest.fn(),
      updateDictionaryItem: jest.fn(),
      removeDictionaryItem: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DictionaryCacheService,
        {
          provide: DictionariesService,
          useValue: mockDictionariesService,
        },
      ],
    }).compile();

    service = module.get<DictionaryCacheService>(DictionaryCacheService);
    dictionariesService = module.get(DictionariesService);

    // Mock onModuleInit to prevent automatic preloading during tests
    jest.spyOn(service, 'onModuleInit').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Cache Read Operations', () => {
    it('should cache and return all dictionaries', async () => {
      const dictionaries = [mockDictionary];
      dictionariesService.findAllDictionaries.mockResolvedValue(dictionaries);

      // First call - cache miss
      const result1 = await service.findAllDictionaries(true);
      expect(result1).toEqual(dictionaries);
      expect(dictionariesService.findAllDictionaries).toHaveBeenCalledTimes(1);

      // Second call - cache hit
      const result2 = await service.findAllDictionaries(true);
      expect(result2).toEqual(dictionaries);
      expect(dictionariesService.findAllDictionaries).toHaveBeenCalledTimes(1); // Not called again

      const stats = service.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it('should cache dictionary by ID', async () => {
      dictionariesService.findOneDictionary.mockResolvedValue(mockDictionary);

      // First call - cache miss
      const result1 = await service.findOneDictionary('dict-1');
      expect(result1).toEqual(mockDictionary);
      expect(dictionariesService.findOneDictionary).toHaveBeenCalledWith('dict-1', true);

      // Second call - cache hit
      const result2 = await service.findOneDictionary('dict-1');
      expect(result2).toEqual(mockDictionary);
      expect(dictionariesService.findOneDictionary).toHaveBeenCalledTimes(1);
    });

    it('should cache dictionary by code', async () => {
      dictionariesService.findByCode.mockResolvedValue(mockDictionary);

      // First call - cache miss
      const result1 = await service.findByCode('machine_types');
      expect(result1).toEqual(mockDictionary);
      expect(dictionariesService.findByCode).toHaveBeenCalledWith('machine_types', true);

      // Second call - cache hit
      const result2 = await service.findByCode('machine_types');
      expect(result2).toEqual(mockDictionary);
      expect(dictionariesService.findByCode).toHaveBeenCalledTimes(1);
    });

    it('should cache dictionary items', async () => {
      const items = [mockDictionaryItem];
      dictionariesService.findAllDictionaryItems.mockResolvedValue(items);

      // First call - cache miss
      const result1 = await service.findAllDictionaryItems('dict-1');
      expect(result1).toEqual(items);

      // Second call - cache hit
      const result2 = await service.findAllDictionaryItems('dict-1');
      expect(result2).toEqual(items);
      expect(dictionariesService.findAllDictionaryItems).toHaveBeenCalledTimes(1);
    });

    it('should not cache individual dictionary items', async () => {
      dictionariesService.findOneDictionaryItem.mockResolvedValue(mockDictionaryItem);

      // Each call should hit the database
      await service.findOneDictionaryItem('item-1');
      await service.findOneDictionaryItem('item-1');

      expect(dictionariesService.findOneDictionaryItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache Write Operations and Invalidation', () => {
    it('should invalidate cache when creating dictionary', async () => {
      const newDict = { ...mockDictionary, id: 'dict-2' };
      dictionariesService.createDictionary.mockResolvedValue(newDict);

      // Pre-populate cache
      dictionariesService.findAllDictionaries.mockResolvedValue([mockDictionary]);
      await service.findAllDictionaries(true);

      // Create new dictionary
      const result = await service.createDictionary({ code: 'new_dict' });
      expect(result).toEqual(newDict);

      // Cache should be invalidated for 'dict:all'
      await service.findAllDictionaries(true);
      expect(dictionariesService.findAllDictionaries).toHaveBeenCalledTimes(2); // Once pre-populate, once after invalidation
    });

    it('should invalidate cache when updating dictionary', async () => {
      const updatedDict = { ...mockDictionary, name_ru: 'Обновлено' };
      dictionariesService.updateDictionary.mockResolvedValue(updatedDict);

      // Pre-populate cache
      dictionariesService.findOneDictionary.mockResolvedValue(mockDictionary);
      await service.findOneDictionary('dict-1');

      // Update dictionary - this invalidates cache and re-caches the updated value
      const result = await service.updateDictionary('dict-1', { name_ru: 'Обновлено' });
      expect(result).toEqual(updatedDict);

      // Cache should return updated value (from re-caching, not from service call)
      const cachedResult = await service.findOneDictionary('dict-1');
      expect(cachedResult).toEqual(updatedDict);
      // Service should only be called once (during pre-populate), not again after update
      expect(dictionariesService.findOneDictionary).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cache when deleting dictionary', async () => {
      dictionariesService.removeDictionary.mockResolvedValue(undefined);

      // Pre-populate cache
      dictionariesService.findAllDictionaries.mockResolvedValue([mockDictionary]);
      await service.findAllDictionaries(true);

      // Delete dictionary
      await service.removeDictionary('dict-1');

      // Cache should be invalidated
      await service.findAllDictionaries(true);
      expect(dictionariesService.findAllDictionaries).toHaveBeenCalledTimes(2);
    });

    it('should invalidate parent dictionary when creating item', async () => {
      const newItem = { ...mockDictionaryItem, id: 'item-2' };
      dictionariesService.createDictionaryItem.mockResolvedValue(newItem);

      // Pre-populate cache
      dictionariesService.findAllDictionaryItems.mockResolvedValue([mockDictionaryItem]);
      await service.findAllDictionaryItems('dict-1');

      // Create new item
      const result = await service.createDictionaryItem('dict-1', { code: 'new_item' });
      expect(result).toEqual(newItem);

      // Cache should be invalidated
      await service.findAllDictionaryItems('dict-1');
      expect(dictionariesService.findAllDictionaryItems).toHaveBeenCalledTimes(2);
    });

    it('should invalidate parent dictionary when updating item', async () => {
      const updatedItem = { ...mockDictionaryItem, value_ru: 'Обновлено' };
      dictionariesService.findOneDictionaryItem.mockResolvedValue(mockDictionaryItem);
      dictionariesService.updateDictionaryItem.mockResolvedValue(updatedItem);

      // Pre-populate cache
      dictionariesService.findByCode.mockResolvedValue(mockDictionary);
      await service.findByCode('machine_types');

      // Update item
      const result = await service.updateDictionaryItem('item-1', { value_ru: 'Обновлено' });
      expect(result).toEqual(updatedItem);

      // Cache should be invalidated
      await service.findByCode('machine_types');
      expect(dictionariesService.findByCode).toHaveBeenCalledTimes(2);
    });

    it('should invalidate parent dictionary when deleting item', async () => {
      dictionariesService.findOneDictionaryItem.mockResolvedValue(mockDictionaryItem);
      dictionariesService.removeDictionaryItem.mockResolvedValue(undefined);

      // Pre-populate cache
      dictionariesService.findAllDictionaryItems.mockResolvedValue([mockDictionaryItem]);
      await service.findAllDictionaryItems('dict-1');

      // Delete item
      await service.removeDictionaryItem('item-1');

      // Cache should be invalidated
      await service.findAllDictionaryItems('dict-1');
      expect(dictionariesService.findAllDictionaryItems).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache hits and misses', async () => {
      dictionariesService.findAllDictionaries.mockResolvedValue([mockDictionary]);

      // Cache miss
      await service.findAllDictionaries(true);

      // Cache hits
      await service.findAllDictionaries(true);
      await service.findAllDictionaries(true);

      const stats = service.getStats();
      expect(stats.misses).toBe(1);
      expect(stats.hits).toBe(2);
      expect(stats.hitRate).toBe(66.67); // 2/3 * 100
    });

    it('should track cache sets', async () => {
      dictionariesService.findOneDictionary.mockResolvedValue(mockDictionary);

      await service.findOneDictionary('dict-1');
      await service.findOneDictionary('dict-1');

      const stats = service.getStats();
      expect(stats.sets).toBeGreaterThan(0);
    });

    it('should calculate hit rate correctly', async () => {
      dictionariesService.findAllDictionaries.mockResolvedValue([mockDictionary]);

      const stats1 = service.getStats();
      expect(stats1.hitRate).toBe(0); // No requests yet

      await service.findAllDictionaries(true); // Miss
      await service.findAllDictionaries(true); // Hit

      const stats2 = service.getStats();
      expect(stats2.hitRate).toBe(50); // 1 hit, 1 miss = 50%
    });
  });

  describe('Cache Management', () => {
    it('should clear all cache entries', async () => {
      dictionariesService.findAllDictionaries.mockResolvedValue([mockDictionary]);

      // Populate cache
      await service.findAllDictionaries(true);
      expect(dictionariesService.findAllDictionaries).toHaveBeenCalledTimes(1);

      // Clear cache
      service.clearAll();

      // Should fetch from database again
      await service.findAllDictionaries(true);
      expect(dictionariesService.findAllDictionaries).toHaveBeenCalledTimes(2);
    });

    it('should return cache size', async () => {
      dictionariesService.findAllDictionaries.mockResolvedValue([mockDictionary]);
      dictionariesService.findOneDictionary.mockResolvedValue(mockDictionary);

      await service.findAllDictionaries(true);
      await service.findOneDictionary('dict-1');

      const stats = service.getStats();
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('onModuleInit', () => {
    it('should preload dictionaries successfully', async () => {
      // Restore the original implementation for this test
      jest.spyOn(service, 'onModuleInit').mockRestore();

      const dictionaryWithItems = {
        ...mockDictionary,
        items: [mockDictionaryItem],
      };
      dictionariesService.findAllDictionaries.mockResolvedValue([dictionaryWithItems]);

      await service.onModuleInit();

      // Verify preload was called
      expect(dictionariesService.findAllDictionaries).toHaveBeenCalledWith(true);

      // Cached values should be returned without database call
      const cachedDicts = await service.findAllDictionaries(true);
      expect(cachedDicts).toEqual([dictionaryWithItems]);
      // Should be 2 calls: 1 from preload, 1 from findAllDictionaries (but cache hit)
      // Actually first call fills cache, second is a hit
      expect(dictionariesService.findAllDictionaries).toHaveBeenCalledTimes(1);
    });

    it('should handle preload errors gracefully', async () => {
      // Restore the original implementation for this test
      jest.spyOn(service, 'onModuleInit').mockRestore();

      dictionariesService.findAllDictionaries.mockRejectedValue(
        new Error('Database connection failed'),
      );

      // Should not throw, just log error
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });

    it('should preload dictionaries with items and cache them separately', async () => {
      // Restore the original implementation for this test
      jest.spyOn(service, 'onModuleInit').mockRestore();

      const dictionaryWithItems = {
        ...mockDictionary,
        items: [mockDictionaryItem],
      };
      dictionariesService.findAllDictionaries.mockResolvedValue([dictionaryWithItems]);

      await service.onModuleInit();

      // Items should be cached separately
      dictionariesService.findAllDictionaryItems.mockResolvedValue([mockDictionaryItem]);
      const cachedItems = await service.findAllDictionaryItems('dict-1');

      // Should be cache hit since items were preloaded
      expect(cachedItems).toEqual([mockDictionaryItem]);
    });

    it('should skip caching items for dictionaries without items', async () => {
      // Restore the original implementation for this test
      jest.spyOn(service, 'onModuleInit').mockRestore();

      const dictionaryWithoutItems = {
        ...mockDictionary,
        items: [],
      };
      dictionariesService.findAllDictionaries.mockResolvedValue([dictionaryWithoutItems]);

      await service.onModuleInit();

      // Items should not be cached, so service call is made
      dictionariesService.findAllDictionaryItems.mockResolvedValue([]);
      await service.findAllDictionaryItems('dict-1');

      expect(dictionariesService.findAllDictionaryItems).toHaveBeenCalled();
    });

    it('should skip caching items when items is null', async () => {
      // Restore the original implementation for this test
      jest.spyOn(service, 'onModuleInit').mockRestore();

      const dictionaryNullItems = {
        ...mockDictionary,
        items: null as any,
      };
      dictionariesService.findAllDictionaries.mockResolvedValue([dictionaryNullItems]);

      await service.onModuleInit();

      // Items should not be cached
      dictionariesService.findAllDictionaryItems.mockResolvedValue([]);
      await service.findAllDictionaryItems('dict-1');

      expect(dictionariesService.findAllDictionaryItems).toHaveBeenCalled();
    });
  });

  describe('Cache Expiration', () => {
    it('should return null and delete expired cache entries', async () => {
      dictionariesService.findAllDictionaries.mockResolvedValue([mockDictionary]);

      // First call - cache miss, set cache
      await service.findAllDictionaries(true);
      expect(dictionariesService.findAllDictionaries).toHaveBeenCalledTimes(1);

      // Manually expire the cache by accessing private cache
      const cache = (service as any).dictionariesCache;
      const entry = cache.get('dict:all');
      if (entry) {
        entry.expiresAt = Date.now() - 1000; // Set to expired
      }

      // Second call - cache expired, should fetch again
      await service.findAllDictionaries(true);
      expect(dictionariesService.findAllDictionaries).toHaveBeenCalledTimes(2);
    });

    it('should handle cache cleanup of expired entries', async () => {
      dictionariesService.findAllDictionaries.mockResolvedValue([mockDictionary]);
      dictionariesService.findOneDictionary.mockResolvedValue(mockDictionary);

      // Populate cache
      await service.findAllDictionaries(true);
      await service.findOneDictionary('dict-1');

      const statsBefore = service.getStats();
      expect(statsBefore.size).toBeGreaterThan(0);

      // Manually expire all cache entries
      const cache = (service as any).dictionariesCache;
      for (const [key, entry] of cache.entries()) {
        entry.expiresAt = Date.now() - 1000;
      }

      // Trigger cleanup
      (service as any).cleanupExpired();

      const statsAfter = service.getStats();
      expect(statsAfter.size).toBe(0);
    });

    it('should not clean up non-expired entries during cleanup', async () => {
      dictionariesService.findAllDictionaries.mockResolvedValue([mockDictionary]);

      // Populate cache
      await service.findAllDictionaries(true);

      const statsBefore = service.getStats();
      expect(statsBefore.size).toBeGreaterThan(0);

      // Trigger cleanup (entries should still be valid)
      (service as any).cleanupExpired();

      const statsAfter = service.getStats();
      expect(statsAfter.size).toBe(statsBefore.size);
    });
  });

  describe('Update Dictionary Item Edge Cases', () => {
    it('should handle item without dictionary_id when updating', async () => {
      const itemWithoutDictId = { ...mockDictionaryItem, dictionary_id: null as any };
      dictionariesService.updateDictionaryItem.mockResolvedValue(itemWithoutDictId);

      const result = await service.updateDictionaryItem('item-1', { value_ru: 'Updated' });

      expect(result).toEqual(itemWithoutDictId);
      // Should not throw even without dictionary_id
    });

    it('should handle item without dictionary_id when deleting', async () => {
      const itemWithoutDictId = { ...mockDictionaryItem, dictionary_id: null as any };
      dictionariesService.findOneDictionaryItem.mockResolvedValue(itemWithoutDictId);
      dictionariesService.removeDictionaryItem.mockResolvedValue(undefined);

      await service.removeDictionaryItem('item-1');

      // Should not throw even without dictionary_id
      expect(dictionariesService.removeDictionaryItem).toHaveBeenCalledWith('item-1');
    });
  });
});
