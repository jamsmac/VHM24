import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { DictionariesService } from '../dictionaries.service';
import { Dictionary } from '../entities/dictionary.entity';
import { DictionaryItem } from '../entities/dictionary-item.entity';

/**
 * Dictionary Cache Service
 *
 * Provides in-memory caching for dictionaries to reduce database queries.
 * Dictionaries are small, read-mostly data that benefit from aggressive caching.
 *
 * Features:
 * - Automatic cache population on startup
 * - TTL-based expiration (default: 1 hour)
 * - Manual cache invalidation for updates
 * - Separate caches for dictionaries and items
 *
 * Cache Keys:
 * - `dict:all` - All dictionaries
 * - `dict:id:${id}` - Dictionary by ID
 * - `dict:code:${code}` - Dictionary by code
 * - `items:${dictionaryId}` - Items for a dictionary
 */
@Injectable()
export class DictionaryCacheService implements OnModuleInit {
  private readonly logger = new Logger(DictionaryCacheService.name);

  // Cache storage
  private dictionariesCache = new Map<string, { data: any; expiresAt: number }>();

  // Cache TTL in seconds
  private readonly DEFAULT_TTL = 3600; // 1 hour

  // Cache statistics
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
  };

  constructor(private readonly dictionariesService: DictionariesService) {}

  /**
   * Preload all dictionaries on module initialization
   */
  async onModuleInit() {
    this.logger.log('Preloading dictionaries into cache...');
    try {
      await this.preloadDictionaries();
      this.logger.log('✅ Dictionaries preloaded successfully');
    } catch (error) {
      this.logger.error('❌ Failed to preload dictionaries', error);
    }

    // Setup cleanup interval (every 10 minutes)
    setInterval(() => this.cleanupExpired(), 600000);
  }

  /**
   * Preload all dictionaries with items into cache
   */
  private async preloadDictionaries(): Promise<void> {
    const dictionaries = await this.dictionariesService.findAllDictionaries(true);

    // Cache all dictionaries list
    this.set('dict:all', dictionaries);

    // Cache each dictionary individually
    for (const dict of dictionaries) {
      this.set(`dict:id:${dict.id}`, dict);
      this.set(`dict:code:${dict.code}`, dict);

      if (dict.items && dict.items.length > 0) {
        this.set(`items:${dict.id}`, dict.items);
      }
    }

    this.logger.log(`Cached ${dictionaries.length} dictionaries`);
  }

  // ==================== READ METHODS (WITH CACHE) ====================

  /**
   * Get all dictionaries (cached)
   */
  async findAllDictionaries(includeItems = false): Promise<Dictionary[]> {
    const cacheKey = 'dict:all';
    const cached = this.get<Dictionary[]>(cacheKey);

    if (cached) {
      this.stats.hits++;
      return cached;
    }

    this.stats.misses++;
    const dictionaries = await this.dictionariesService.findAllDictionaries(includeItems);
    this.set(cacheKey, dictionaries);

    return dictionaries;
  }

  /**
   * Get dictionary by ID (cached)
   */
  async findOneDictionary(id: string, includeItems = true): Promise<Dictionary> {
    const cacheKey = `dict:id:${id}`;
    const cached = this.get<Dictionary>(cacheKey);

    if (cached) {
      this.stats.hits++;
      return cached;
    }

    this.stats.misses++;
    const dictionary = await this.dictionariesService.findOneDictionary(id, includeItems);
    this.set(cacheKey, dictionary);

    // Also cache by code
    this.set(`dict:code:${dictionary.code}`, dictionary);

    return dictionary;
  }

  /**
   * Get dictionary by code (cached)
   */
  async findByCode(code: string, includeItems = true): Promise<Dictionary> {
    const cacheKey = `dict:code:${code}`;
    const cached = this.get<Dictionary>(cacheKey);

    if (cached) {
      this.stats.hits++;
      return cached;
    }

    this.stats.misses++;
    const dictionary = await this.dictionariesService.findByCode(code, includeItems);
    this.set(cacheKey, dictionary);

    // Also cache by ID
    this.set(`dict:id:${dictionary.id}`, dictionary);

    return dictionary;
  }

  /**
   * Get dictionary items (cached)
   */
  async findAllDictionaryItems(dictionaryId: string): Promise<DictionaryItem[]> {
    const cacheKey = `items:${dictionaryId}`;
    const cached = this.get<DictionaryItem[]>(cacheKey);

    if (cached) {
      this.stats.hits++;
      return cached;
    }

    this.stats.misses++;
    const items = await this.dictionariesService.findAllDictionaryItems(dictionaryId);
    this.set(cacheKey, items);

    return items;
  }

  /**
   * Get dictionary item by ID (not cached)
   * Individual items are not cached to avoid memory overhead
   */
  async findOneDictionaryItem(id: string): Promise<DictionaryItem> {
    return this.dictionariesService.findOneDictionaryItem(id);
  }

  // ==================== WRITE METHODS (WITH CACHE INVALIDATION) ====================

  /**
   * Create dictionary and invalidate cache
   */
  async createDictionary(createDictionaryDto: any): Promise<Dictionary> {
    const dictionary = await this.dictionariesService.createDictionary(createDictionaryDto);

    // Invalidate all dictionaries cache
    this.invalidatePattern('dict:all');

    // Cache the new dictionary
    this.set(`dict:id:${dictionary.id}`, dictionary);
    this.set(`dict:code:${dictionary.code}`, dictionary);

    return dictionary;
  }

  /**
   * Update dictionary and invalidate cache
   */
  async updateDictionary(id: string, updateDictionaryDto: any): Promise<Dictionary> {
    const dictionary = await this.dictionariesService.updateDictionary(id, updateDictionaryDto);

    // Invalidate all related caches
    this.invalidatePattern('dict:all');
    this.invalidatePattern(`dict:id:${id}`);
    this.invalidatePattern(`dict:code:`);

    // Re-cache the updated dictionary
    this.set(`dict:id:${dictionary.id}`, dictionary);
    this.set(`dict:code:${dictionary.code}`, dictionary);

    return dictionary;
  }

  /**
   * Delete dictionary and invalidate cache
   */
  async removeDictionary(id: string): Promise<void> {
    await this.dictionariesService.removeDictionary(id);

    // Invalidate all related caches
    this.invalidatePattern('dict:all');
    this.invalidatePattern(`dict:id:${id}`);
    this.invalidatePattern(`dict:code:`);
    this.invalidatePattern(`items:${id}`);
  }

  /**
   * Create dictionary item and invalidate parent dictionary cache
   */
  async createDictionaryItem(
    dictionaryId: string,
    createDictionaryItemDto: any,
  ): Promise<DictionaryItem> {
    const item = await this.dictionariesService.createDictionaryItem(
      dictionaryId,
      createDictionaryItemDto,
    );

    // Invalidate parent dictionary caches
    this.invalidateDictionary(dictionaryId);

    return item;
  }

  /**
   * Update dictionary item and invalidate parent dictionary cache
   */
  async updateDictionaryItem(id: string, updateDictionaryItemDto: any): Promise<DictionaryItem> {
    const item = await this.dictionariesService.updateDictionaryItem(id, updateDictionaryItemDto);

    // Invalidate parent dictionary caches
    if (item.dictionary_id) {
      this.invalidateDictionary(item.dictionary_id);
    }

    return item;
  }

  /**
   * Delete dictionary item and invalidate parent dictionary cache
   */
  async removeDictionaryItem(id: string): Promise<void> {
    const item = await this.dictionariesService.findOneDictionaryItem(id);
    await this.dictionariesService.removeDictionaryItem(id);

    // Invalidate parent dictionary caches
    if (item.dictionary_id) {
      this.invalidateDictionary(item.dictionary_id);
    }
  }

  // ==================== CACHE MANAGEMENT ====================

  /**
   * Get value from cache
   */
  private get<T>(key: string): T | null {
    const cached = this.dictionariesCache.get(key);

    if (!cached) {
      return null;
    }

    // Check expiration
    if (cached.expiresAt < Date.now()) {
      this.dictionariesCache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  /**
   * Set value in cache
   */
  private set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    this.dictionariesCache.set(key, {
      data,
      expiresAt: Date.now() + ttl * 1000,
    });
    this.stats.sets++;
  }

  /**
   * Invalidate all caches matching a pattern
   */
  private invalidatePattern(pattern: string): void {
    let count = 0;

    for (const key of this.dictionariesCache.keys()) {
      if (key.includes(pattern)) {
        this.dictionariesCache.delete(key);
        count++;
      }
    }

    if (count > 0) {
      this.logger.debug(`Invalidated ${count} cache entries matching '${pattern}'`);
    }
  }

  /**
   * Invalidate specific dictionary caches
   */
  private invalidateDictionary(dictionaryId: string): void {
    this.invalidatePattern('dict:all');
    this.invalidatePattern(`dict:id:${dictionaryId}`);
    this.invalidatePattern(`dict:code:`);
    this.invalidatePattern(`items:${dictionaryId}`);
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, value] of this.dictionariesCache.entries()) {
      if (value.expiresAt <= now) {
        this.dictionariesCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    const size = this.dictionariesCache.size;
    this.dictionariesCache.clear();
    this.logger.log(`Cleared ${size} cache entries`);
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; hits: number; misses: number; sets: number; hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      size: this.dictionariesCache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      sets: this.stats.sets,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }
}
