import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { ConfigService } from '@nestjs/config';

/**
 * Cache entry with metadata
 */
interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  ttl: number;
  hitCount: number;
}

/**
 * Cache statistics
 */
interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  keys: number;
  memoryUsage?: string;
}

/**
 * TelegramCacheService
 *
 * Redis-backed caching service for Telegram bot responses.
 * Optimizes performance by caching frequently accessed data:
 * - Machine lists
 * - Statistics data
 * - User preferences
 * - Translation bundles
 *
 * Features:
 * - Automatic TTL management
 * - Cache invalidation by pattern
 * - Hit/miss statistics
 * - Graceful degradation on Redis failure
 *
 * @module TelegramInfrastructureModule
 */
@Injectable()
export class TelegramCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramCacheService.name);
  private redisClient: RedisClientType | null = null;
  private readonly CACHE_PREFIX = 'telegram:cache:';

  // In-memory fallback cache
  private memoryCache = new Map<string, CacheEntry<unknown>>();

  // Statistics
  private stats = { hits: 0, misses: 0 };

  // Default TTLs (in seconds)
  static readonly TTL = {
    SHORT: 60, // 1 minute - for rapidly changing data
    MEDIUM: 300, // 5 minutes - for moderately changing data
    LONG: 1800, // 30 minutes - for slowly changing data
    STATS: 120, // 2 minutes - for statistics
    MACHINES: 300, // 5 minutes - for machine list
    USER_PREFS: 3600, // 1 hour - for user preferences
  };

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (!redisUrl) {
      this.logger.warn('REDIS_URL not configured, using in-memory cache fallback');
      return;
    }

    try {
      this.redisClient = createClient({ url: redisUrl }) as RedisClientType;

      this.redisClient.on('error', (err) => {
        this.logger.error('Redis Cache error:', err.message);
      });

      this.redisClient.on('connect', () => {
        this.logger.log('Connected to Redis for caching');
      });

      await this.redisClient.connect();
    } catch (error) {
      this.logger.warn(
        `Failed to connect to Redis for caching: ${error.message}. Using in-memory fallback.`,
      );
      this.redisClient = null;
    }
  }

  async onModuleDestroy() {
    if (this.redisClient?.isOpen) {
      await this.redisClient.quit();
    }
  }

  // ============================================================================
  // CORE CACHE OPERATIONS
  // ============================================================================

  /**
   * Get value from cache
   *
   * @param key - Cache key
   * @returns Cached value or null if not found/expired
   */
  async get<T>(key: string): Promise<T | null> {
    const cacheKey = this.CACHE_PREFIX + key;

    try {
      if (this.redisClient?.isOpen) {
        const data = await this.redisClient.get(cacheKey);

        if (data) {
          this.stats.hits++;
          return JSON.parse(data) as T;
        }

        this.stats.misses++;
        return null;
      }

      // Fallback to memory cache
      const entry = this.memoryCache.get(cacheKey) as CacheEntry<T> | undefined;

      if (entry && Date.now() - entry.cachedAt < entry.ttl * 1000) {
        this.stats.hits++;
        entry.hitCount++;
        return entry.data;
      }

      this.stats.misses++;
      if (entry) {
        this.memoryCache.delete(cacheKey);
      }

      return null;
    } catch (error) {
      this.logger.warn(`Cache get error for ${key}: ${error.message}`);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set value in cache
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlSeconds - Time to live in seconds
   */
  async set<T>(key: string, value: T, ttlSeconds: number = TelegramCacheService.TTL.MEDIUM): Promise<void> {
    const cacheKey = this.CACHE_PREFIX + key;

    try {
      if (this.redisClient?.isOpen) {
        await this.redisClient.setEx(cacheKey, ttlSeconds, JSON.stringify(value));
        return;
      }

      // Fallback to memory cache
      this.memoryCache.set(cacheKey, {
        data: value,
        cachedAt: Date.now(),
        ttl: ttlSeconds,
        hitCount: 0,
      });
    } catch (error) {
      this.logger.warn(`Cache set error for ${key}: ${error.message}`);
    }
  }

  /**
   * Delete specific key from cache
   */
  async delete(key: string): Promise<void> {
    const cacheKey = this.CACHE_PREFIX + key;

    try {
      if (this.redisClient?.isOpen) {
        await this.redisClient.del(cacheKey);
        return;
      }

      this.memoryCache.delete(cacheKey);
    } catch (error) {
      this.logger.warn(`Cache delete error for ${key}: ${error.message}`);
    }
  }

  /**
   * Delete all keys matching a pattern
   *
   * @param pattern - Pattern to match (e.g., 'machines:*')
   */
  async deleteByPattern(pattern: string): Promise<number> {
    const fullPattern = this.CACHE_PREFIX + pattern;
    let deletedCount = 0;

    try {
      if (this.redisClient?.isOpen) {
        const keys: string[] = [];

        for await (const key of this.redisClient.scanIterator({
          MATCH: fullPattern,
          COUNT: 100,
        })) {
          keys.push(key);
        }

        if (keys.length > 0) {
          deletedCount = await this.redisClient.del(keys);
        }

        return deletedCount;
      }

      // Fallback to memory cache
      const regex = new RegExp('^' + fullPattern.replace(/\*/g, '.*'));

      for (const key of this.memoryCache.keys()) {
        if (regex.test(key)) {
          this.memoryCache.delete(key);
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      this.logger.warn(`Cache delete pattern error for ${pattern}: ${error.message}`);
      return 0;
    }
  }

  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================

  /**
   * Get or set with factory function
   *
   * Gets value from cache, or generates and caches if not found.
   *
   * @example
   * ```typescript
   * const machines = await cacheService.getOrSet(
   *   'machines:list',
   *   async () => await machinesService.findAll(),
   *   TelegramCacheService.TTL.MACHINES
   * );
   * ```
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds: number = TelegramCacheService.TTL.MEDIUM,
  ): Promise<T> {
    const cached = await this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttlSeconds);

    return value;
  }

  /**
   * Cache machine list
   */
  async cacheMachines<T>(userId: string, machines: T[]): Promise<void> {
    await this.set(`machines:${userId}`, machines, TelegramCacheService.TTL.MACHINES);
  }

  /**
   * Get cached machines
   */
  async getCachedMachines<T>(userId: string): Promise<T[] | null> {
    return this.get<T[]>(`machines:${userId}`);
  }

  /**
   * Cache statistics
   */
  async cacheStats<T>(userId: string, stats: T): Promise<void> {
    await this.set(`stats:${userId}`, stats, TelegramCacheService.TTL.STATS);
  }

  /**
   * Get cached statistics
   */
  async getCachedStats<T>(userId: string): Promise<T | null> {
    return this.get<T>(`stats:${userId}`);
  }

  /**
   * Invalidate user-specific cache
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await this.deleteByPattern(`*:${userId}`);
    await this.deleteByPattern(`*:${userId}:*`);
  }

  /**
   * Invalidate all machines cache
   */
  async invalidateMachinesCache(): Promise<void> {
    await this.deleteByPattern('machines:*');
  }

  /**
   * Invalidate all stats cache
   */
  async invalidateStatsCache(): Promise<void> {
    await this.deleteByPattern('stats:*');
  }

  // ============================================================================
  // STATISTICS & HEALTH
  // ============================================================================

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const total = this.stats.hits + this.stats.misses;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? Math.round((this.stats.hits / total) * 100) : 0,
      keys: await this.getKeyCount(),
    };
  }

  /**
   * Get count of cached keys
   */
  private async getKeyCount(): Promise<number> {
    try {
      if (this.redisClient?.isOpen) {
        let count = 0;

        for await (const _key of this.redisClient.scanIterator({
          MATCH: this.CACHE_PREFIX + '*',
          COUNT: 100,
        })) {
          count++;
        }

        return count;
      }

      return this.memoryCache.size;
    } catch (error) {
      return this.memoryCache.size;
    }
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Check if cache is healthy
   */
  isHealthy(): boolean {
    return this.redisClient?.isOpen ?? true; // Memory fallback is always "healthy"
  }

  /**
   * Clean up expired entries (memory cache only)
   */
  cleanupMemoryCache(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.cachedAt > entry.ttl * 1000) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned ${cleanedCount} expired memory cache entries`);
    }

    return cleanedCount;
  }
}
