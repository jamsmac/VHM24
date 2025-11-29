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
        const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);
        const redisPassword = configService.get<string>('REDIS_PASSWORD');
        const ttl = configService.get<number>('CACHE_TTL', 300) * 1000; // Convert to ms

        return {
          store: await redisStore({
            host: redisHost,
            port: redisPort,
            password: redisPassword,
            ttl,
            // Redis key prefix for cache entries
            keyPrefix: 'vendhub:cache:',
          }),
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
