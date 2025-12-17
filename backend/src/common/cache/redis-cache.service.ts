import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

/**
 * Redis client interface for pattern-based operations
 */
interface RedisClient {
  keys(pattern: string): Promise<string[]>;
}

/**
 * Redis store with client accessor
 */
interface RedisStore {
  client?: RedisClient;
  getClient?: () => RedisClient;
}

/**
 * Redis Cache Service
 *
 * Provides high-level caching operations with Redis backend.
 * Supports multiple cache strategies and patterns.
 *
 * Cache key naming convention:
 * - Reports: vendhub:cache:report:{report_type}:{params_hash}
 * - Dashboards: vendhub:cache:dashboard:{user_role}:{user_id}
 * - Entities: vendhub:cache:entity:{entity_type}:{entity_id}
 */
@Injectable()
export class RedisCacheService {
  private readonly logger = new Logger(RedisCacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Get value from cache
   * @param key - Cache key
   * @returns Cached value or undefined
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value !== undefined) {
        this.logger.debug(`Cache HIT: ${key}`);
      } else {
        this.logger.debug(`Cache MISS: ${key}`);
      }
      return value;
    } catch (error) {
      this.logger.error(`Cache GET error for ${key}: ${error.message}`);
      return undefined;
    }
  }

  /**
   * Set value in cache
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Time to live in seconds (optional, uses default if not provided)
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const ttlMs = ttl ? ttl * 1000 : undefined;
      await this.cacheManager.set(key, value, ttlMs);
      this.logger.debug(`Cache SET: ${key} (TTL: ${ttl || 'default'}s)`);
    } catch (error) {
      this.logger.error(`Cache SET error for ${key}: ${error.message}`);
    }
  }

  /**
   * Delete value from cache
   * @param key - Cache key
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DEL: ${key}`);
    } catch (error) {
      this.logger.error(`Cache DEL error for ${key}: ${error.message}`);
    }
  }

  /**
   * Get or set with callback (cache-aside pattern)
   * @param key - Cache key
   * @param ttl - Time to live in seconds
   * @param factory - Factory function to generate value if not cached
   */
  async getOrSet<T>(key: string, ttl: number, factory: () => Promise<T>): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Clear all cache entries (use with caution!)
   */
  async reset(): Promise<void> {
    try {
      await this.cacheManager.reset();
      this.logger.warn('Cache RESET: All entries cleared');
    } catch (error) {
      this.logger.error(`Cache RESET error: ${error.message}`);
    }
  }

  /**
   * Delete cache entries by pattern (using Redis SCAN + DEL)
   * @param pattern - Pattern to match (e.g., 'report:*')
   */
  async delByPattern(pattern: string): Promise<number> {
    try {
      // Get underlying Redis client from cache manager
      const store = this.cacheManager.store as unknown as RedisStore;
      const client = store.client || store.getClient?.();

      if (!client || typeof client.keys !== 'function') {
        this.logger.warn('Pattern delete not available - Redis client not accessible');
        return 0;
      }

      const fullPattern = `vendhub:cache:${pattern}`;
      const keys = await client.keys(fullPattern);

      if (keys.length === 0) {
        return 0;
      }

      await Promise.all(keys.map((key: string) => this.cacheManager.del(key)));
      this.logger.debug(`Cache DEL PATTERN: ${fullPattern} (${keys.length} keys)`);
      return keys.length;
    } catch (error) {
      this.logger.error(`Cache DEL PATTERN error for ${pattern}: ${error.message}`);
      return 0;
    }
  }

  // ============================================================================
  // CACHE KEY BUILDERS
  // ============================================================================

  /**
   * Build report cache key
   */
  buildReportKey(reportType: string, params: Record<string, unknown>): string {
    const paramsHash = this.hashParams(params);
    return `report:${reportType}:${paramsHash}`;
  }

  /**
   * Build dashboard cache key
   */
  buildDashboardKey(role: string, userId: string, params?: Record<string, unknown>): string {
    const paramsHash = params ? this.hashParams(params) : 'default';
    return `dashboard:${role}:${userId}:${paramsHash}`;
  }

  /**
   * Build entity cache key
   */
  buildEntityKey(entityType: string, entityId: string): string {
    return `entity:${entityType}:${entityId}`;
  }

  /**
   * Build list cache key
   */
  buildListKey(entityType: string, params?: Record<string, unknown>): string {
    const paramsHash = params ? this.hashParams(params) : 'all';
    return `list:${entityType}:${paramsHash}`;
  }

  /**
   * Simple hash function for params object
   */
  private hashParams(params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce(
        (acc, key) => {
          acc[key] = params[key];
          return acc;
        },
        {} as Record<string, unknown>,
      );

    const str = JSON.stringify(sortedParams);

    // Simple djb2 hash
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) + hash + str.charCodeAt(i);
    }
    return Math.abs(hash).toString(36);
  }
}

/**
 * Cache TTL constants (in seconds)
 */
export const CACHE_TTL = {
  // Dashboards - frequent updates
  DASHBOARD_ADMIN: 300, // 5 minutes
  DASHBOARD_MANAGER: 300, // 5 minutes
  DASHBOARD_OPERATOR: 180, // 3 minutes

  // Reports - less frequent updates
  REPORT_FINANCIAL: 3600, // 1 hour
  REPORT_NETWORK: 900, // 15 minutes
  REPORT_STATISTICS: 900, // 15 minutes
  REPORT_DEPRECIATION: 86400, // 24 hours

  // Entities - depend on update frequency
  ENTITY_MACHINE: 60, // 1 minute
  ENTITY_USER: 300, // 5 minutes
  ENTITY_LOCATION: 600, // 10 minutes

  // Lists - short TTL to avoid stale data
  LIST_DEFAULT: 60, // 1 minute

  // Session data
  SESSION: 900, // 15 minutes
} as const;
