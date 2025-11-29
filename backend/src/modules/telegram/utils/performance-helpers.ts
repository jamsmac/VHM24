import { Logger } from '@nestjs/common';

/**
 * Performance Optimization Helpers for Telegram Bot
 *
 * Collection of utilities to improve bot response times and reduce load:
 * - In-memory caching with TTL
 * - Batch operations for database queries
 * - Debouncing for rapid user actions
 * - Performance monitoring and metrics
 *
 * **Use Cases:**
 * - Cache frequently accessed data (user settings, machine info)
 * - Batch multiple database operations
 * - Prevent duplicate processing of rapid button clicks
 * - Track performance metrics for optimization
 */

const logger = new Logger('PerformanceHelpers');

/**
 * Simple in-memory cache with TTL
 *
 * Caches data in memory with automatic expiration.
 * Useful for frequently accessed, rarely changing data.
 *
 * @example
 * ```typescript
 * const cache = new MemoryCache<MachineInfo>(300000); // 5 min TTL
 *
 * // Set data
 * cache.set('M-001', machineInfo);
 *
 * // Get data (returns undefined if expired)
 * const info = cache.get('M-001');
 *
 * // Check if exists and not expired
 * if (cache.has('M-001')) {
 *   // Use cached data
 * }
 * ```
 */
export class MemoryCache<T> {
  private cache = new Map<string, { value: T; expiresAt: number }>();
  private ttl: number;

  /**
   * @param ttl - Time to live in milliseconds
   */
  constructor(ttl: number = 300000) {
    // Default 5 minutes
    this.ttl = ttl;
  }

  /**
   * Store value in cache
   */
  set(key: string, value: T): void {
    const expiresAt = Date.now() + this.ttl;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Get value from cache (undefined if expired or not found)
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const value = this.get(key);
    return value !== undefined;
  }

  /**
   * Delete key from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      logger.debug(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }
}

/**
 * Debounce rapid function calls
 *
 * Prevents function from executing too frequently.
 * Useful for preventing duplicate processing of rapid button clicks.
 *
 * @example
 * ```typescript
 * const debouncer = new Debouncer(1000); // 1 second
 *
 * bot.on('callback_query', async (ctx) => {
 *   const key = `${ctx.from.id}:${ctx.callbackQuery.data}`;
 *
 *   if (debouncer.shouldExecute(key)) {
 *     await handleCallback(ctx);
 *   } else {
 *     // Ignore rapid duplicate clicks
 *   }
 * });
 * ```
 */
export class Debouncer {
  private lastExecuted = new Map<string, number>();
  private delay: number;

  /**
   * @param delay - Minimum delay between executions in milliseconds
   */
  constructor(delay: number = 1000) {
    this.delay = delay;
  }

  /**
   * Check if function should execute for this key
   *
   * Returns true if enough time has passed since last execution.
   */
  shouldExecute(key: string): boolean {
    const now = Date.now();
    const lastTime = this.lastExecuted.get(key);

    if (!lastTime || now - lastTime >= this.delay) {
      this.lastExecuted.set(key, now);
      return true;
    }

    return false;
  }

  /**
   * Reset debounce timer for key
   */
  reset(key: string): void {
    this.lastExecuted.delete(key);
  }

  /**
   * Clear all timers
   */
  clear(): void {
    this.lastExecuted.clear();
  }
}

/**
 * Batch operation helper
 *
 * Collects multiple operations and executes them in batches.
 * Reduces database round trips.
 *
 * @example
 * ```typescript
 * const batcher = new BatchProcessor<string, User>(
 *   async (userIds) => {
 *     return await userRepository.find({ where: { id: In(userIds) } });
 *   },
 *   { maxBatchSize: 50, maxWaitMs: 100 }
 * );
 *
 * // These 3 calls will be batched into one database query
 * const user1 = await batcher.execute('user-1');
 * const user2 = await batcher.execute('user-2');
 * const user3 = await batcher.execute('user-3');
 * ```
 */
export class BatchProcessor<K, V> {
  private queue: Array<{
    key: K;
    resolve: (value: V | undefined) => void;
    reject: (error: Error) => void;
  }> = [];
  private timer: NodeJS.Timeout | null = null;
  private processFn: (keys: K[]) => Promise<V[]>;
  private maxBatchSize: number;
  private maxWaitMs: number;

  constructor(
    processFn: (keys: K[]) => Promise<V[]>,
    options: { maxBatchSize?: number; maxWaitMs?: number } = {},
  ) {
    this.processFn = processFn;
    this.maxBatchSize = options.maxBatchSize || 50;
    this.maxWaitMs = options.maxWaitMs || 100;
  }

  /**
   * Add operation to batch
   */
  async execute(key: K): Promise<V | undefined> {
    return new Promise((resolve, reject) => {
      this.queue.push({ key, resolve, reject });

      // Execute immediately if batch is full
      if (this.queue.length >= this.maxBatchSize) {
        this.flush();
      } else if (!this.timer) {
        // Schedule execution
        this.timer = setTimeout(() => this.flush(), this.maxWaitMs);
      }
    });
  }

  /**
   * Execute batch immediately
   */
  private async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.length === 0) {
      return;
    }

    const batch = this.queue.splice(0);
    const keys = batch.map((item) => item.key);

    try {
      const results = await this.processFn(keys);

      // Resolve each promise with corresponding result
      batch.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      // Reject all promises in batch
      batch.forEach((item) => {
        item.reject(error);
      });
    }
  }
}

/**
 * Performance metrics tracker
 *
 * Tracks execution times and counts for performance monitoring.
 *
 * @example
 * ```typescript
 * const metrics = new PerformanceMetrics();
 *
 * // Track operation
 * const timer = metrics.startTimer('handleMessage');
 * await handleMessage(ctx);
 * timer.end();
 *
 * // Get statistics
 * const stats = metrics.getStats('handleMessage');
 * console.log(`Avg: ${stats.avgMs}ms, Count: ${stats.count}`);
 * ```
 */
export class PerformanceMetrics {
  private metrics = new Map<
    string,
    {
      count: number;
      totalMs: number;
      minMs: number;
      maxMs: number;
    }
  >();

  /**
   * Start timing an operation
   */
  startTimer(operation: string): { end: () => void } {
    const startTime = Date.now();

    return {
      end: () => {
        const duration = Date.now() - startTime;
        this.record(operation, duration);
      },
    };
  }

  /**
   * Record operation duration
   */
  record(operation: string, durationMs: number): void {
    const existing = this.metrics.get(operation);

    if (existing) {
      existing.count++;
      existing.totalMs += durationMs;
      existing.minMs = Math.min(existing.minMs, durationMs);
      existing.maxMs = Math.max(existing.maxMs, durationMs);
    } else {
      this.metrics.set(operation, {
        count: 1,
        totalMs: durationMs,
        minMs: durationMs,
        maxMs: durationMs,
      });
    }
  }

  /**
   * Get statistics for operation
   */
  getStats(operation: string): {
    count: number;
    avgMs: number;
    minMs: number;
    maxMs: number;
    totalMs: number;
  } | null {
    const metric = this.metrics.get(operation);

    if (!metric) {
      return null;
    }

    return {
      count: metric.count,
      avgMs: Math.round(metric.totalMs / metric.count),
      minMs: metric.minMs,
      maxMs: metric.maxMs,
      totalMs: metric.totalMs,
    };
  }

  /**
   * Get all statistics
   */
  getAllStats(): Record<
    string,
    {
      count: number;
      avgMs: number;
      minMs: number;
      maxMs: number;
    }
  > {
    const stats: Record<string, { count: number; avgMs: number; minMs: number; maxMs: number }> =
      {};

    this.metrics.forEach((metric, operation) => {
      stats[operation] = {
        count: metric.count,
        avgMs: Math.round(metric.totalMs / metric.count),
        minMs: metric.minMs,
        maxMs: metric.maxMs,
      };
    });

    return stats;
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
  }

  /**
   * Log statistics to console
   */
  logStats(): void {
    const stats = this.getAllStats();

    logger.log('=== Performance Metrics ===');
    Object.entries(stats).forEach(([operation, stat]) => {
      logger.log(
        `${operation}: ${stat.count} calls, avg ${stat.avgMs}ms (min: ${stat.minMs}ms, max: ${stat.maxMs}ms)`,
      );
    });
  }
}

/**
 * Rate limiter
 *
 * Limits number of operations per time window.
 *
 * @example
 * ```typescript
 * const limiter = new RateLimiter(5, 60000); // 5 per minute
 *
 * if (limiter.tryAcquire(userId)) {
 *   await performAction();
 * } else {
 *   await ctx.reply('Too many requests. Please wait.');
 * }
 * ```
 */
export class RateLimiter {
  private requests = new Map<string, number[]>();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Try to acquire permission for request
   *
   * Returns true if allowed, false if rate limit exceeded.
   */
  tryAcquire(key: string): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];

    // Remove expired timestamps
    const validTimestamps = timestamps.filter((timestamp) => now - timestamp < this.windowMs);

    if (validTimestamps.length < this.maxRequests) {
      validTimestamps.push(now);
      this.requests.set(key, validTimestamps);
      return true;
    }

    return false;
  }

  /**
   * Get remaining requests in current window
   */
  getRemaining(key: string): number {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];

    const validTimestamps = timestamps.filter((timestamp) => now - timestamp < this.windowMs);

    return Math.max(0, this.maxRequests - validTimestamps.length);
  }

  /**
   * Reset rate limit for key
   */
  reset(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Clear all rate limits
   */
  clear(): void {
    this.requests.clear();
  }
}

/**
 * Lazy loader
 *
 * Loads data only when needed and caches result.
 *
 * @example
 * ```typescript
 * const machineLoader = new LazyLoader(async (machineId: string) => {
 *   return await machineRepository.findOne({ where: { id: machineId } });
 * });
 *
 * // First call loads from database
 * const machine1 = await machineLoader.get('M-001');
 *
 * // Second call returns cached value
 * const machine2 = await machineLoader.get('M-001');
 * ```
 */
export class LazyLoader<K, V> {
  private cache = new Map<K, Promise<V>>();
  private loader: (key: K) => Promise<V>;

  constructor(loader: (key: K) => Promise<V>) {
    this.loader = loader;
  }

  /**
   * Get value (loads if not cached)
   */
  async get(key: K): Promise<V> {
    let promise = this.cache.get(key);

    if (!promise) {
      promise = this.loader(key);
      this.cache.set(key, promise);
    }

    return promise;
  }

  /**
   * Clear cache for key
   */
  invalidate(key: K): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }
}
