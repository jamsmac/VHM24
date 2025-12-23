import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-ioredis-yet';

interface RedisStoreConfig {
  host: string;
  port: number;
  password?: string;
  username?: string;
  ttl: number;
  keyPrefix: string;
}

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

        let storeConfig: RedisStoreConfig;

        if (redisUrl) {
          // Parse REDIS_URL into components for cache-manager-ioredis-yet
          const url = new URL(redisUrl);
          storeConfig = {
            host: url.hostname,
            port: parseInt(url.port) || 6379,
            password: url.password || undefined,
            username: url.username || undefined,
            ttl,
            keyPrefix: 'vendhub:cache:',
          };
        } else {
          storeConfig = {
            host: configService.get<string>('REDIS_HOST', 'localhost'),
            port: configService.get<number>('REDIS_PORT', 6379),
            password: configService.get<string>('REDIS_PASSWORD'),
            ttl,
            keyPrefix: 'vendhub:cache:',
          };
        }

        return {
          store: await redisStore(storeConfig),
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
