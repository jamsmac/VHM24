import {
  MemoryCache,
  Debouncer,
  BatchProcessor,
  PerformanceMetrics,
  RateLimiter,
  LazyLoader,
} from './performance-helpers';

describe('MemoryCache', () => {
  let cache: MemoryCache<string>;

  beforeEach(() => {
    jest.useFakeTimers();
    cache = new MemoryCache<string>(1000); // 1 second TTL
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('set and get', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should return undefined for expired entries', () => {
      cache.set('key1', 'value1');
      jest.advanceTimersByTime(1500);
      expect(cache.get('key1')).toBeUndefined();
    });

    it('should return value before expiration', () => {
      cache.set('key1', 'value1');
      jest.advanceTimersByTime(500);
      expect(cache.get('key1')).toBe('value1');
    });
  });

  describe('has', () => {
    it('should return true for existing non-expired entries', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
    });

    it('should return false for non-existent entries', () => {
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should return false for expired entries', () => {
      cache.set('key1', 'value1');
      jest.advanceTimersByTime(1500);
      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should remove entry from cache', () => {
      cache.set('key1', 'value1');
      cache.delete('key1');
      expect(cache.get('key1')).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should remove all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.size()).toBe(0);
    });
  });

  describe('size', () => {
    it('should return number of entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);
    });
  });

  describe('cleanup', () => {
    it('should remove expired entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      jest.advanceTimersByTime(1500);
      cache.set('key3', 'value3'); // This one should survive
      cache.cleanup();
      expect(cache.size()).toBe(1);
      expect(cache.get('key3')).toBe('value3');
    });

    it('should not remove non-expired entries', () => {
      cache.set('key1', 'value1');
      cache.cleanup();
      expect(cache.get('key1')).toBe('value1');
    });
  });

  describe('default TTL', () => {
    it('should use default TTL of 5 minutes', () => {
      const defaultCache = new MemoryCache<string>();
      defaultCache.set('key1', 'value1');
      jest.advanceTimersByTime(4 * 60 * 1000); // 4 minutes
      expect(defaultCache.get('key1')).toBe('value1');
      jest.advanceTimersByTime(2 * 60 * 1000); // 2 more minutes (total 6)
      expect(defaultCache.get('key1')).toBeUndefined();
    });
  });
});

describe('Debouncer', () => {
  let debouncer: Debouncer;

  beforeEach(() => {
    jest.useFakeTimers();
    debouncer = new Debouncer(1000); // 1 second delay
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('shouldExecute', () => {
    it('should return true for first call', () => {
      expect(debouncer.shouldExecute('key1')).toBe(true);
    });

    it('should return false for immediate second call', () => {
      debouncer.shouldExecute('key1');
      expect(debouncer.shouldExecute('key1')).toBe(false);
    });

    it('should return true after delay has passed', () => {
      debouncer.shouldExecute('key1');
      jest.advanceTimersByTime(1500);
      expect(debouncer.shouldExecute('key1')).toBe(true);
    });

    it('should track keys independently', () => {
      debouncer.shouldExecute('key1');
      expect(debouncer.shouldExecute('key2')).toBe(true);
    });
  });

  describe('reset', () => {
    it('should allow immediate execution after reset', () => {
      debouncer.shouldExecute('key1');
      debouncer.reset('key1');
      expect(debouncer.shouldExecute('key1')).toBe(true);
    });
  });

  describe('clear', () => {
    it('should reset all keys', () => {
      debouncer.shouldExecute('key1');
      debouncer.shouldExecute('key2');
      debouncer.clear();
      expect(debouncer.shouldExecute('key1')).toBe(true);
      expect(debouncer.shouldExecute('key2')).toBe(true);
    });
  });

  describe('default delay', () => {
    it('should use default delay of 1 second', () => {
      const defaultDebouncer = new Debouncer();
      defaultDebouncer.shouldExecute('key1');
      jest.advanceTimersByTime(500);
      expect(defaultDebouncer.shouldExecute('key1')).toBe(false);
      jest.advanceTimersByTime(600);
      expect(defaultDebouncer.shouldExecute('key1')).toBe(true);
    });
  });
});

describe('BatchProcessor', () => {
  let processFn: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    processFn = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('execute', () => {
    it('should batch multiple calls', async () => {
      processFn.mockResolvedValue(['result1', 'result2']);
      const batcher = new BatchProcessor<string, string>(processFn, { maxWaitMs: 100 });

      const promise1 = batcher.execute('key1');
      const promise2 = batcher.execute('key2');

      jest.advanceTimersByTime(150);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(processFn).toHaveBeenCalledTimes(1);
      expect(processFn).toHaveBeenCalledWith(['key1', 'key2']);
      expect(result1).toBe('result1');
      expect(result2).toBe('result2');
    });

    it('should execute immediately when batch is full', async () => {
      processFn.mockResolvedValue(['r1', 'r2']);
      const batcher = new BatchProcessor<string, string>(processFn, {
        maxBatchSize: 2,
        maxWaitMs: 10000,
      });

      const promise1 = batcher.execute('key1');
      const promise2 = batcher.execute('key2');

      // Should execute immediately without waiting
      await Promise.all([promise1, promise2]);

      expect(processFn).toHaveBeenCalledTimes(1);
    });

    it('should reject all promises on error', async () => {
      processFn.mockRejectedValue(new Error('Processing failed'));
      const batcher = new BatchProcessor<string, string>(processFn, { maxWaitMs: 100 });

      const promise1 = batcher.execute('key1');
      const promise2 = batcher.execute('key2');

      jest.advanceTimersByTime(150);

      await expect(promise1).rejects.toThrow('Processing failed');
      await expect(promise2).rejects.toThrow('Processing failed');
    });

    it('should use default options', async () => {
      processFn.mockResolvedValue(['result']);
      const batcher = new BatchProcessor<string, string>(processFn);

      const promise = batcher.execute('key1');
      jest.advanceTimersByTime(150);

      await promise;
      expect(processFn).toHaveBeenCalled();
    });
  });
});

describe('PerformanceMetrics', () => {
  let metrics: PerformanceMetrics;

  beforeEach(() => {
    metrics = new PerformanceMetrics();
  });

  describe('startTimer', () => {
    it('should track operation duration', () => {
      const timer = metrics.startTimer('testOp');
      timer.end();

      const stats = metrics.getStats('testOp');
      expect(stats).not.toBeNull();
      expect(stats?.count).toBe(1);
    });
  });

  describe('record', () => {
    it('should record operation duration', () => {
      metrics.record('testOp', 100);
      metrics.record('testOp', 200);

      const stats = metrics.getStats('testOp');
      expect(stats?.count).toBe(2);
      expect(stats?.avgMs).toBe(150);
      expect(stats?.minMs).toBe(100);
      expect(stats?.maxMs).toBe(200);
      expect(stats?.totalMs).toBe(300);
    });

    it('should handle single recording', () => {
      metrics.record('testOp', 100);

      const stats = metrics.getStats('testOp');
      expect(stats?.count).toBe(1);
      expect(stats?.avgMs).toBe(100);
      expect(stats?.minMs).toBe(100);
      expect(stats?.maxMs).toBe(100);
    });
  });

  describe('getStats', () => {
    it('should return null for non-existent operation', () => {
      expect(metrics.getStats('nonexistent')).toBeNull();
    });
  });

  describe('getAllStats', () => {
    it('should return stats for all operations', () => {
      metrics.record('op1', 100);
      metrics.record('op2', 200);

      const allStats = metrics.getAllStats();
      expect(Object.keys(allStats)).toHaveLength(2);
      expect(allStats['op1'].avgMs).toBe(100);
      expect(allStats['op2'].avgMs).toBe(200);
    });

    it('should return empty object when no metrics', () => {
      expect(metrics.getAllStats()).toEqual({});
    });
  });

  describe('reset', () => {
    it('should clear all metrics', () => {
      metrics.record('op1', 100);
      metrics.reset();
      expect(metrics.getStats('op1')).toBeNull();
    });
  });

  describe('logStats', () => {
    it('should not throw when logging', () => {
      metrics.record('op1', 100);
      expect(() => metrics.logStats()).not.toThrow();
    });
  });
});

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    jest.useFakeTimers();
    limiter = new RateLimiter(3, 1000); // 3 requests per second
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('tryAcquire', () => {
    it('should allow requests within limit', () => {
      expect(limiter.tryAcquire('user1')).toBe(true);
      expect(limiter.tryAcquire('user1')).toBe(true);
      expect(limiter.tryAcquire('user1')).toBe(true);
    });

    it('should reject requests exceeding limit', () => {
      limiter.tryAcquire('user1');
      limiter.tryAcquire('user1');
      limiter.tryAcquire('user1');
      expect(limiter.tryAcquire('user1')).toBe(false);
    });

    it('should allow requests after window expires', () => {
      limiter.tryAcquire('user1');
      limiter.tryAcquire('user1');
      limiter.tryAcquire('user1');
      expect(limiter.tryAcquire('user1')).toBe(false);

      jest.advanceTimersByTime(1500);
      expect(limiter.tryAcquire('user1')).toBe(true);
    });

    it('should track users independently', () => {
      limiter.tryAcquire('user1');
      limiter.tryAcquire('user1');
      limiter.tryAcquire('user1');
      expect(limiter.tryAcquire('user2')).toBe(true);
    });
  });

  describe('getRemaining', () => {
    it('should return remaining requests', () => {
      expect(limiter.getRemaining('user1')).toBe(3);
      limiter.tryAcquire('user1');
      expect(limiter.getRemaining('user1')).toBe(2);
    });

    it('should return 0 when limit reached', () => {
      limiter.tryAcquire('user1');
      limiter.tryAcquire('user1');
      limiter.tryAcquire('user1');
      expect(limiter.getRemaining('user1')).toBe(0);
    });

    it('should reset after window expires', () => {
      limiter.tryAcquire('user1');
      limiter.tryAcquire('user1');
      jest.advanceTimersByTime(1500);
      expect(limiter.getRemaining('user1')).toBe(3);
    });
  });

  describe('reset', () => {
    it('should reset limit for user', () => {
      limiter.tryAcquire('user1');
      limiter.tryAcquire('user1');
      limiter.tryAcquire('user1');
      limiter.reset('user1');
      expect(limiter.getRemaining('user1')).toBe(3);
    });
  });

  describe('clear', () => {
    it('should reset all limits', () => {
      limiter.tryAcquire('user1');
      limiter.tryAcquire('user2');
      limiter.clear();
      expect(limiter.getRemaining('user1')).toBe(3);
      expect(limiter.getRemaining('user2')).toBe(3);
    });
  });
});

describe('LazyLoader', () => {
  let loader: jest.Mock;
  let lazyLoader: LazyLoader<string, string>;

  beforeEach(() => {
    loader = jest.fn();
    lazyLoader = new LazyLoader(loader);
  });

  describe('get', () => {
    it('should load value on first call', async () => {
      loader.mockResolvedValue('loaded value');

      const result = await lazyLoader.get('key1');

      expect(result).toBe('loaded value');
      expect(loader).toHaveBeenCalledWith('key1');
    });

    it('should cache value for subsequent calls', async () => {
      loader.mockResolvedValue('loaded value');

      await lazyLoader.get('key1');
      await lazyLoader.get('key1');

      expect(loader).toHaveBeenCalledTimes(1);
    });

    it('should load different keys independently', async () => {
      loader.mockImplementation((key) => Promise.resolve(`value-${key}`));

      const result1 = await lazyLoader.get('key1');
      const result2 = await lazyLoader.get('key2');

      expect(result1).toBe('value-key1');
      expect(result2).toBe('value-key2');
      expect(loader).toHaveBeenCalledTimes(2);
    });
  });

  describe('invalidate', () => {
    it('should reload value after invalidation', async () => {
      loader.mockResolvedValueOnce('first').mockResolvedValueOnce('second');

      await lazyLoader.get('key1');
      lazyLoader.invalidate('key1');
      const result = await lazyLoader.get('key1');

      expect(result).toBe('second');
      expect(loader).toHaveBeenCalledTimes(2);
    });
  });

  describe('clear', () => {
    it('should clear all cached values', async () => {
      loader.mockResolvedValue('value');

      await lazyLoader.get('key1');
      await lazyLoader.get('key2');
      lazyLoader.clear();
      await lazyLoader.get('key1');

      expect(loader).toHaveBeenCalledTimes(3);
    });
  });
});
