import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { Observable, of, from } from 'rxjs';
import { tap, switchMap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Request } from 'express';

/** Request with authenticated user - extends Express User */
interface AuthenticatedRequest extends Request {
  user?: Express.User & { id?: string };
}

/** Redis-like cache store with keys method */
interface RedisLikeCacheStore {
  client?: {
    keys: (pattern: string) => Promise<string[]>;
  };
  getClient?: () => {
    keys: (pattern: string) => Promise<string[]>;
  };
}

/**
 * Custom cache key metadata
 */
export const CACHE_KEY_METADATA = 'cache:key';
export const CACHE_TTL_METADATA = 'cache:ttl';

/**
 * Decorator to set custom cache key
 */
export const CacheKey = (key: string) => {
  return (target: object, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(CACHE_KEY_METADATA, key, descriptor.value);
    return descriptor;
  };
};

/**
 * Decorator to set custom TTL (in seconds)
 */
export const CacheTTL = (ttl: number) => {
  return (target: object, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(CACHE_TTL_METADATA, ttl, descriptor.value);
    return descriptor;
  };
};

/**
 * Redis-backed cache interceptor for reports and dashboards
 *
 * PERF-3: Upgraded from in-memory to Redis for:
 * - Persistence across server restarts
 * - Shared cache across multiple instances
 * - Better memory management
 *
 * Cache key format: vendhub:reports:{method}:{url}:{params_hash}
 */
@Injectable()
export class ReportsCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ReportsCacheInterceptor.name);
  private readonly defaultTTL = 300; // 5 minutes in seconds
  private readonly cacheKeyPrefix = 'vendhub:reports:';

  constructor(
    private reflector: Reflector,
    @Optional() @Inject(CACHE_MANAGER) private readonly cacheManager?: Cache,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // If cache manager is not available, skip caching
    if (!this.cacheManager) {
      this.logger.warn('[Cache SKIP] Cache manager not available');
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const handler = context.getHandler();

    // Get custom cache key and TTL from metadata
    const customKey = this.reflector.get<string>(CACHE_KEY_METADATA, handler);
    const customTTL = this.reflector.get<number>(CACHE_TTL_METADATA, handler);

    // Build cache key with prefix
    const baseCacheKey = customKey || this.buildCacheKey(request);
    const cacheKey = `${this.cacheKeyPrefix}${baseCacheKey}`;
    const ttl = customTTL || this.defaultTTL;

    // Check cache and handle async operations
    return from(this.getFromCache(cacheKey)).pipe(
      switchMap((cached) => {
        if (cached !== undefined && cached !== null) {
          this.logger.debug(`[Redis Cache HIT] ${cacheKey}`);
          return of(cached);
        }

        this.logger.debug(`[Redis Cache MISS] ${cacheKey}`);

        // Execute the handler and cache the result
        return next.handle().pipe(
          tap((data) => {
            this.setToCache(cacheKey, data, ttl).catch((err) => {
              this.logger.error(`[Redis Cache SET Error] ${cacheKey}: ${err.message}`);
            });
          }),
        );
      }),
    );
  }

  /**
   * Get value from Redis cache
   */
  private async getFromCache(key: string): Promise<unknown | undefined> {
    try {
      return await this.cacheManager?.get(key);
    } catch (error) {
      this.logger.error(`[Redis Cache GET Error] ${key}: ${error.message}`);
      return undefined;
    }
  }

  /**
   * Set value to Redis cache
   */
  private async setToCache(key: string, data: unknown, ttl: number): Promise<void> {
    try {
      // Convert TTL to milliseconds for cache-manager
      await this.cacheManager?.set(key, data, ttl * 1000);
      this.logger.debug(`[Redis Cache SET] ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.error(`[Redis Cache SET Error] ${key}: ${error.message}`);
    }
  }

  /**
   * Build cache key from request
   */
  private buildCacheKey(request: AuthenticatedRequest): string {
    const method = request.method;
    const url = request.url.split('?')[0]; // Remove query string from URL
    const query = this.hashParams(request.query || {});
    const userId = request.user?.id || 'anonymous';

    return `${method}:${url}:${userId}:${query}`;
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

  /**
   * Clear all report cache entries
   */
  async clearAll(): Promise<void> {
    try {
      // Get underlying Redis client to clear by pattern (cache-manager 7.x uses stores array)
      const stores = (this.cacheManager as unknown as { stores?: RedisLikeCacheStore[] })?.stores;
      const store = stores?.[0];
      const client = store?.client || store?.getClient?.();

      if (client && typeof client.keys === 'function') {
        const keys = await client.keys(`${this.cacheKeyPrefix}*`);
        if (keys.length > 0) {
          await Promise.all(keys.map((key: string) => this.cacheManager?.del(key)));
          this.logger.debug(`[Redis Cache CLEAR] Cleared ${keys.length} entries`);
        }
      } else {
        this.logger.warn('[Redis Cache CLEAR] Pattern delete not available');
      }
    } catch (error) {
      this.logger.error(`[Redis Cache CLEAR Error] ${error.message}`);
    }
  }

  /**
   * Clear cache entries matching a pattern
   */
  async clearPattern(pattern: string): Promise<number> {
    try {
      // cache-manager 7.x uses stores array instead of store
      const stores = (this.cacheManager as unknown as { stores?: RedisLikeCacheStore[] })?.stores;
      const store = stores?.[0];
      const client = store?.client || store?.getClient?.();

      if (client && typeof client.keys === 'function') {
        const fullPattern = `${this.cacheKeyPrefix}*${pattern}*`;
        const keys = await client.keys(fullPattern);

        if (keys.length > 0) {
          await Promise.all(keys.map((key: string) => this.cacheManager?.del(key)));
          this.logger.debug(
            `[Redis Cache CLEAR PATTERN] Cleared ${keys.length} entries matching '${pattern}'`,
          );
        }

        return keys.length;
      }

      return 0;
    } catch (error) {
      this.logger.error(`[Redis Cache CLEAR PATTERN Error] ${error.message}`);
      return 0;
    }
  }
}

/**
 * Cache configuration for different report types
 *
 * TTL (Time To Live) recommendations:
 * - Dashboards: 5 minutes (frequent updates needed)
 * - Financial reports: 1 hour (stable data, expensive queries)
 * - Statistics reports: 15 minutes (moderate update frequency)
 * - Real-time data: No caching or 1 minute
 */
export const CACHE_TTL_CONFIG = {
  DASHBOARD_ADMIN: 300, // 5 minutes
  DASHBOARD_MANAGER: 300, // 5 minutes
  DASHBOARD_OPERATOR: 180, // 3 minutes (more dynamic)
  REPORT_FINANCIAL: 3600, // 1 hour
  REPORT_NETWORK: 900, // 15 minutes
  REPORT_STATISTICS: 900, // 15 minutes
  REPORT_DEPRECIATION: 86400, // 24 hours (changes daily)
  REPORT_EXPIRY: 3600, // 1 hour
};
