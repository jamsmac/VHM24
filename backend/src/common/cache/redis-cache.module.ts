import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-ioredis-yet';

/**
 * Redis Cache Module
 *
 * Provides distributed caching using Redis.
 * This replaces in-memory caching for better scalability.
 *
 * Features:
 * - Distributed cache across multiple instances
 * - TTL-based expiration
 * - Automatic serialization/deserialization
 *
 * Environment variables:
 * - REDIS_HOST: Redis server host (default: localhost)
 * - REDIS_PORT: Redis server port (default: 6379)
 * - REDIS_PASSWORD: Redis password (optional)
 * - CACHE_TTL: Default cache TTL in seconds (default: 300)
 * - CACHE_MAX: Maximum items in cache (default: 1000)
 */
@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        const ttl = configService.get<number>('CACHE_TTL', 300) * 1000; // Convert to ms

        // Support both REDIS_URL and individual variables
        const storeConfig = redisUrl
          ? {
              url: redisUrl,
              ttl,
              keyPrefix: 'vendhub:cache:',
            }
          : {
              host: configService.get<string>('REDIS_HOST', 'localhost'),
              port: configService.get<number>('REDIS_PORT', 6379),
              password: configService.get<string>('REDIS_PASSWORD'),
              ttl,
              keyPrefix: 'vendhub:cache:',
            };

        return {
          store: await redisStore(storeConfig as any),
          ttl,
          max: configService.get<number>('CACHE_MAX', 1000),
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule {}
