import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

/** Cache entry with data and expiration timestamp */
interface CacheEntry {
  data: unknown;
  expiresAt: number;
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
 * In-memory cache interceptor for reports and dashboards
 *
 * This provides simple in-memory caching without Redis dependency.
 * For production, consider using @nestjs/cache-manager with Redis.
 */
@Injectable()
export class ReportsCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ReportsCacheInterceptor.name);
  private cache = new Map<string, CacheEntry>();
  private readonly defaultTTL = 300; // 5 minutes in seconds

  constructor(private reflector: Reflector) {
    // Clean up expired entries every minute
    setInterval(() => this.cleanupExpired(), 60000);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const handler = context.getHandler();

    // Get custom cache key and TTL from metadata
    const customKey = this.reflector.get<string>(CACHE_KEY_METADATA, handler);
    const customTTL = this.reflector.get<number>(CACHE_TTL_METADATA, handler);

    // Build cache key
    const cacheKey = customKey || this.buildCacheKey(request);
    const ttl = customTTL || this.defaultTTL;

    // Check if we have a valid cached response
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      this.logger.debug(`[Cache HIT] ${cacheKey}`);
      return of(cached.data);
    }

    this.logger.debug(`[Cache MISS] ${cacheKey}`);

    // Execute the handler and cache the result
    return next.handle().pipe(
      tap((data) => {
        this.cache.set(cacheKey, {
          data,
          expiresAt: Date.now() + ttl * 1000,
        });
        this.logger.debug(`[Cache SET] ${cacheKey} (TTL: ${ttl}s)`);
      }),
    );
  }

  /**
   * Build cache key from request
   */
  private buildCacheKey(request: Request): string {
    const method = request.method;
    const url = request.url;
    const query = JSON.stringify(request.query || {});
    const params = JSON.stringify(request.params || {});

    return `${method}:${url}:${query}:${params}`;
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, value] of this.cache.entries()) {
      if (value.expiresAt <= now) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`[Cache CLEANUP] Removed ${cleanedCount} expired entries`);
    }
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.debug(`[Cache CLEAR] Cleared ${size} entries`);
  }

  /**
   * Clear cache entries matching a pattern
   */
  clearPattern(pattern: string): void {
    let clearedCount = 0;

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        clearedCount++;
      }
    }

    this.logger.debug(
      `[Cache CLEAR PATTERN] Cleared ${clearedCount} entries matching '${pattern}'`,
    );
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
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
