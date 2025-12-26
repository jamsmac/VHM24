import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CartStorageService, CartItem } from './cart-storage.service';

describe('CartStorageService', () => {
  let service: CartStorageService;
  let mockCacheManager: any;

  const userId = 'user-123';

  const createCartItem = (overrides: Partial<CartItem> = {}): CartItem => ({
    id: 'item-1',
    materialId: 'mat-1',
    name: 'Test Material',
    quantity: 1,
    unit: 'шт',
    ...overrides,
  });

  beforeEach(async () => {
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartStorageService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<CartStorageService>(CartStorageService);
    await service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCart', () => {
    it('should return empty array when cart not found', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.getCart(userId);

      expect(result).toEqual([]);
      expect(mockCacheManager.get).toHaveBeenCalledWith('vendhub:cart:user-123');
    });

    it('should return cart items from cache', async () => {
      const items = [createCartItem()];
      mockCacheManager.get.mockResolvedValue(items);

      const result = await service.getCart(userId);

      expect(result).toEqual(items);
    });

    it('should handle cache errors gracefully', async () => {
      mockCacheManager.get.mockRejectedValue(new Error('Redis error'));

      const result = await service.getCart(userId);

      expect(result).toEqual([]);
    });
  });

  describe('saveCart', () => {
    it('should save cart with 24h TTL', async () => {
      const items = [createCartItem()];

      await service.saveCart(userId, items);

      expect(mockCacheManager.set).toHaveBeenCalledWith(
        'vendhub:cart:user-123',
        items,
        86400000, // 24 hours in ms
      );
    });

    it('should handle save errors gracefully', async () => {
      mockCacheManager.set.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(service.saveCart(userId, [])).resolves.not.toThrow();
    });
  });

  describe('addItem', () => {
    it('should add new item to empty cart', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      const item = createCartItem();

      const result = await service.addItem(userId, item);

      expect(result).toEqual([item]);
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('should add new item to existing cart', async () => {
      const existingItem = createCartItem({ id: 'item-1', materialId: 'mat-1' });
      const newItem = createCartItem({ id: 'item-2', materialId: 'mat-2', name: 'New Material' });
      mockCacheManager.get.mockResolvedValue([existingItem]);

      const result = await service.addItem(userId, newItem);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual(existingItem);
      expect(result).toContainEqual(newItem);
    });

    it('should increment quantity for existing material', async () => {
      const existingItem = createCartItem({ quantity: 5 });
      const sameItem = createCartItem({ quantity: 3 });
      mockCacheManager.get.mockResolvedValue([existingItem]);

      const result = await service.addItem(userId, sameItem);

      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(8); // 5 + 3
    });
  });

  describe('updateItemQuantity', () => {
    it('should increase item quantity', async () => {
      const item = createCartItem({ quantity: 5 });
      mockCacheManager.get.mockResolvedValue([item]);

      const result = await service.updateItemQuantity(userId, 'item-1', 2);

      expect(result?.quantity).toBe(7);
    });

    it('should decrease item quantity', async () => {
      const item = createCartItem({ quantity: 5 });
      mockCacheManager.get.mockResolvedValue([item]);

      const result = await service.updateItemQuantity(userId, 'item-1', -2);

      expect(result?.quantity).toBe(3);
    });

    it('should remove item when quantity reaches 0', async () => {
      const item = createCartItem({ quantity: 1 });
      mockCacheManager.get.mockResolvedValue([item]);

      const result = await service.updateItemQuantity(userId, 'item-1', -1);

      expect(result).toBeNull();
      // Cart should be saved without the item
      expect(mockCacheManager.set).toHaveBeenCalledWith(expect.any(String), [], expect.any(Number));
    });

    it('should return null for non-existent item', async () => {
      mockCacheManager.get.mockResolvedValue([]);

      const result = await service.updateItemQuantity(userId, 'non-existent', 1);

      expect(result).toBeNull();
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', async () => {
      const items = [
        createCartItem({ id: 'item-1' }),
        createCartItem({ id: 'item-2', materialId: 'mat-2' }),
      ];
      mockCacheManager.get.mockResolvedValue(items);

      const result = await service.removeItem(userId, 'item-1');

      expect(result?.id).toBe('item-1');
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.any(String),
        [items[1]],
        expect.any(Number),
      );
    });

    it('should return null for non-existent item', async () => {
      mockCacheManager.get.mockResolvedValue([]);

      const result = await service.removeItem(userId, 'non-existent');

      expect(result).toBeNull();
    });
  });

  describe('clearCart', () => {
    it('should delete cart from cache', async () => {
      await service.clearCart(userId);

      expect(mockCacheManager.del).toHaveBeenCalledWith('vendhub:cart:user-123');
    });

    it('should handle errors gracefully', async () => {
      mockCacheManager.del.mockRejectedValue(new Error('Redis error'));

      // Should not throw
      await expect(service.clearCart(userId)).resolves.not.toThrow();
    });
  });

  describe('getItemCount', () => {
    it('should return 0 for empty cart', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.getItemCount(userId);

      expect(result).toBe(0);
    });

    it('should return correct item count', async () => {
      const items = [createCartItem(), createCartItem({ id: 'item-2', materialId: 'mat-2' })];
      mockCacheManager.get.mockResolvedValue(items);

      const result = await service.getItemCount(userId);

      expect(result).toBe(2);
    });
  });

  describe('getTotalQuantity', () => {
    it('should return 0 for empty cart', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.getTotalQuantity(userId);

      expect(result).toBe(0);
    });

    it('should return sum of all item quantities', async () => {
      const items = [
        createCartItem({ quantity: 5 }),
        createCartItem({ id: 'item-2', materialId: 'mat-2', quantity: 10 }),
      ];
      mockCacheManager.get.mockResolvedValue(items);

      const result = await service.getTotalQuantity(userId);

      expect(result).toBe(15);
    });
  });

  describe('isEmpty', () => {
    it('should return true for empty cart', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const result = await service.isEmpty(userId);

      expect(result).toBe(true);
    });

    it('should return false for non-empty cart', async () => {
      mockCacheManager.get.mockResolvedValue([createCartItem()]);

      const result = await service.isEmpty(userId);

      expect(result).toBe(false);
    });
  });

  describe('getItem', () => {
    it('should return item by id', async () => {
      const items = [
        createCartItem({ id: 'item-1' }),
        createCartItem({ id: 'item-2', materialId: 'mat-2' }),
      ];
      mockCacheManager.get.mockResolvedValue(items);

      const result = await service.getItem(userId, 'item-2');

      expect(result?.id).toBe('item-2');
    });

    it('should return null for non-existent item', async () => {
      mockCacheManager.get.mockResolvedValue([createCartItem()]);

      const result = await service.getItem(userId, 'non-existent');

      expect(result).toBeNull();
    });
  });

  describe('fallback to in-memory storage', () => {
    it('should use fallback when cache manager not available', async () => {
      // Create service without cache manager
      const module: TestingModule = await Test.createTestingModule({
        providers: [CartStorageService],
      }).compile();

      const serviceWithoutCache = module.get<CartStorageService>(CartStorageService);
      await serviceWithoutCache.onModuleInit();

      const item = createCartItem();
      await serviceWithoutCache.addItem(userId, item);

      const cart = await serviceWithoutCache.getCart(userId);
      expect(cart).toHaveLength(1);
      expect(cart[0].name).toBe('Test Material');

      // Clear should work too
      await serviceWithoutCache.clearCart(userId);
      const emptyCart = await serviceWithoutCache.getCart(userId);
      expect(emptyCart).toHaveLength(0);
    });
  });
});
