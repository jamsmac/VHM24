import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  Optional,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

/**
 * Cart item interface
 */
export interface CartItem {
  id: string;
  materialId: string;
  name: string;
  quantity: number;
  unit: string;
}

/**
 * Redis-backed cart storage service for Telegram bot
 *
 * Features:
 * - 24-hour TTL for cart persistence
 * - Survives server restarts
 * - Shared across multiple instances
 *
 * Key format: vendhub:cart:{userId}
 */
@Injectable()
export class CartStorageService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CartStorageService.name);
  private readonly CART_TTL = 86400; // 24 hours in seconds
  private readonly CART_PREFIX = 'vendhub:cart:';

  // Fallback in-memory storage when Redis unavailable
  private fallbackStorage: Map<string, CartItem[]> = new Map();

  constructor(@Optional() @Inject(CACHE_MANAGER) private readonly cacheManager?: Cache) {}

  async onModuleInit() {
    if (this.cacheManager) {
      this.logger.log('Cart storage initialized with Redis (24h TTL)');
    } else {
      this.logger.warn('Cart storage using in-memory fallback (no persistence)');
    }
  }

  async onModuleDestroy() {
    this.fallbackStorage.clear();
  }

  /**
   * Get cart key for user
   */
  private getCartKey(userId: string): string {
    return `${this.CART_PREFIX}${userId}`;
  }

  /**
   * Get user's cart
   */
  async getCart(userId: string): Promise<CartItem[]> {
    try {
      if (this.cacheManager) {
        const key = this.getCartKey(userId);
        const data = await this.cacheManager.get<CartItem[]>(key);
        return data || [];
      }
    } catch (error) {
      this.logger.error(`Error getting cart for user ${userId}:`, error);
    }

    // Fallback to in-memory
    return this.fallbackStorage.get(userId) || [];
  }

  /**
   * Save user's cart
   */
  async saveCart(userId: string, cart: CartItem[]): Promise<void> {
    try {
      if (this.cacheManager) {
        const key = this.getCartKey(userId);
        // TTL in milliseconds for cache-manager
        await this.cacheManager.set(key, cart, this.CART_TTL * 1000);
        this.logger.debug(`Cart saved for user ${userId} (${cart.length} items)`);
        return;
      }
    } catch (error) {
      this.logger.error(`Error saving cart for user ${userId}:`, error);
    }

    // Fallback to in-memory
    this.fallbackStorage.set(userId, cart);
  }

  /**
   * Add item to cart
   */
  async addItem(userId: string, item: CartItem): Promise<CartItem[]> {
    const cart = await this.getCart(userId);
    const existing = cart.find((i) => i.materialId === item.materialId);

    if (existing) {
      existing.quantity += item.quantity;
    } else {
      cart.push(item);
    }

    await this.saveCart(userId, cart);
    return cart;
  }

  /**
   * Update item quantity
   */
  async updateItemQuantity(
    userId: string,
    itemId: string,
    delta: number,
  ): Promise<CartItem | null> {
    const cart = await this.getCart(userId);
    const item = cart.find((i) => i.id === itemId);

    if (!item) {
      return null;
    }

    item.quantity += delta;

    // Remove if quantity is 0 or less
    if (item.quantity <= 0) {
      const filteredCart = cart.filter((i) => i.id !== itemId);
      await this.saveCart(userId, filteredCart);
      return null;
    }

    await this.saveCart(userId, cart);
    return item;
  }

  /**
   * Remove item from cart
   */
  async removeItem(userId: string, itemId: string): Promise<CartItem | null> {
    const cart = await this.getCart(userId);
    const item = cart.find((i) => i.id === itemId);

    if (!item) {
      return null;
    }

    const filteredCart = cart.filter((i) => i.id !== itemId);
    await this.saveCart(userId, filteredCart);

    return item;
  }

  /**
   * Clear user's cart
   */
  async clearCart(userId: string): Promise<void> {
    try {
      if (this.cacheManager) {
        const key = this.getCartKey(userId);
        await this.cacheManager.del(key);
        this.logger.debug(`Cart cleared for user ${userId}`);
        return;
      }
    } catch (error) {
      this.logger.error(`Error clearing cart for user ${userId}:`, error);
    }

    // Fallback
    this.fallbackStorage.delete(userId);
  }

  /**
   * Get cart item count
   */
  async getItemCount(userId: string): Promise<number> {
    const cart = await this.getCart(userId);
    return cart.length;
  }

  /**
   * Get total quantity of all items
   */
  async getTotalQuantity(userId: string): Promise<number> {
    const cart = await this.getCart(userId);
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Check if cart is empty
   */
  async isEmpty(userId: string): Promise<boolean> {
    const cart = await this.getCart(userId);
    return cart.length === 0;
  }

  /**
   * Get item by ID
   */
  async getItem(userId: string, itemId: string): Promise<CartItem | null> {
    const cart = await this.getCart(userId);
    return cart.find((i) => i.id === itemId) || null;
  }
}
