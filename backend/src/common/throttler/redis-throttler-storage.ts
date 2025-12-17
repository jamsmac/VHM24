import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * ThrottlerStorageRecord interface
 * Matches the expected return type from ThrottlerStorage.increment
 */
interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

/**
 * Redis-based Throttler Storage
 *
 * Provides distributed rate limiting using Redis.
 * This enables rate limiting across multiple application instances.
 *
 * Environment variables:
 * - REDIS_HOST: Redis server host (default: localhost)
 * - REDIS_PORT: Redis server port (default: 6379)
 * - REDIS_PASSWORD: Redis password (optional)
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private redis: Redis;
  private readonly keyPrefix = 'vendhub:throttle:';

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    const retryStrategy = (times: number) => {
      if (times > 3) {
        this.logger.error('Redis throttler connection failed after 3 retries');
        return null;
      }
      return Math.min(times * 200, 1000);
    };

    // Support both REDIS_URL and individual variables
    if (redisUrl) {
      this.redis = new Redis(redisUrl, { retryStrategy });
    } else {
      this.redis = new Redis({
        host: this.configService.get<string>('REDIS_HOST', 'localhost'),
        port: this.configService.get<number>('REDIS_PORT', 6379),
        password: this.configService.get<string>('REDIS_PASSWORD'),
        retryStrategy,
      });
    }

    this.redis.on('connect', () => {
      this.logger.log('Redis throttler storage connected');
    });

    this.redis.on('error', (error) => {
      this.logger.error(`Redis throttler storage error: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  /**
   * Increment the rate limit counter
   * @param key - Throttler key (includes IP, route, etc.)
   * @param ttl - Time to live in milliseconds
   * @param limit - Rate limit threshold
   * @param blockDuration - Duration to block if limit exceeded (ms)
   * @param throttlerName - Name of the throttler
   * @returns ThrottlerStorageRecord with totalHits, timeToExpire, isBlocked, timeToBlockExpire
   */
  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    _throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const fullKey = `${this.keyPrefix}${key}`;
    const blockKey = `${this.keyPrefix}blocked:${key}`;

    // Check if currently blocked
    const blockedTtl = await this.redis.pttl(blockKey);
    if (blockedTtl > 0) {
      return {
        totalHits: limit + 1,
        timeToExpire: 0,
        isBlocked: true,
        timeToBlockExpire: blockedTtl,
      };
    }

    // Use Redis MULTI for atomic increment and TTL check
    const multi = this.redis.multi();
    multi.incr(fullKey);
    multi.pttl(fullKey);
    const results = await multi.exec();

    const totalHits = (results?.[0]?.[1] as number) || 1;
    let timeToExpire = (results?.[1]?.[1] as number) || -1;

    // Set expiry on first hit or if key has no TTL
    if (totalHits === 1 || timeToExpire < 0) {
      await this.redis.pexpire(fullKey, ttl);
      timeToExpire = ttl;
    }

    // Check if limit exceeded and block if necessary
    const isBlocked = totalHits > limit;
    let timeToBlockExpire = 0;

    if (isBlocked && blockDuration > 0) {
      await this.redis.set(blockKey, '1', 'PX', blockDuration);
      timeToBlockExpire = blockDuration;
    }

    return {
      totalHits,
      timeToExpire: Math.max(0, timeToExpire),
      isBlocked,
      timeToBlockExpire,
    };
  }
}
