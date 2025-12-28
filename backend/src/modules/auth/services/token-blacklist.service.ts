import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Token Blacklist Service
 *
 * REQ-AUTH-56: Token Revocation
 *
 * Provides fast Redis-based token blacklisting for:
 * - Logout (blacklist refresh token)
 * - Password change (blacklist all user tokens)
 * - Security breach (immediate token revocation)
 *
 * Benefits over database-only approach:
 * - O(1) lookup time for token validation
 * - Automatic expiration (no cleanup needed)
 * - Distributed across multiple instances
 *
 * Redis key format:
 * - vendhub:blacklist:token:{jti} - Individual token blacklist
 * - vendhub:blacklist:user:{userId}:* - All tokens for user (batch revocation)
 */
@Injectable()
export class TokenBlacklistService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private redis: Redis;
  private readonly keyPrefix = 'vendhub:blacklist:';
  private readonly defaultTTL: number; // in seconds

  constructor(private readonly configService: ConfigService) {
    // Default to 7 days (same as refresh token expiration)
    this.defaultTTL = this.configService.get<number>(
      'JWT_REFRESH_EXPIRATION_SECONDS',
      7 * 24 * 60 * 60, // 7 days
    );
  }

  async onModuleInit(): Promise<void> {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    const retryStrategy = (times: number) => {
      if (times > 3) {
        this.logger.error('Redis blacklist connection failed after 3 retries');
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
      this.logger.log('Token blacklist Redis connected');
    });

    this.redis.on('error', (error) => {
      this.logger.error(`Token blacklist Redis error: ${error.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  /**
   * Add token to blacklist
   *
   * @param jti - JWT ID (unique token identifier)
   * @param userId - User ID for grouping
   * @param expiresInSeconds - TTL in seconds (defaults to token expiration)
   * @param reason - Revocation reason for audit
   */
  async blacklistToken(
    jti: string,
    userId: string,
    expiresInSeconds?: number,
    reason?: string,
  ): Promise<void> {
    const ttl = expiresInSeconds || this.defaultTTL;
    const key = `${this.keyPrefix}token:${jti}`;

    const value = JSON.stringify({
      userId,
      reason: reason || 'revoked',
      revokedAt: new Date().toISOString(),
    });

    await this.redis.setex(key, ttl, value);
    this.logger.debug(`Token blacklisted: ${jti} (TTL: ${ttl}s, reason: ${reason})`);
  }

  /**
   * Check if token is blacklisted
   *
   * @param jti - JWT ID
   * @returns true if blacklisted
   */
  async isBlacklisted(jti: string): Promise<boolean> {
    const key = `${this.keyPrefix}token:${jti}`;
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  /**
   * Get blacklist info for token
   *
   * @param jti - JWT ID
   * @returns Blacklist info or null
   */
  async getBlacklistInfo(jti: string): Promise<{
    userId: string;
    reason: string;
    revokedAt: string;
  } | null> {
    const key = `${this.keyPrefix}token:${jti}`;
    const value = await this.redis.get(key);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  /**
   * Blacklist all tokens for a user
   *
   * Used when:
   * - User changes password
   * - User disables 2FA
   * - Admin revokes all sessions
   * - Security breach detected
   *
   * @param userId - User ID
   * @param reason - Revocation reason
   */
  async blacklistUserTokens(userId: string, reason?: string): Promise<void> {
    const key = `${this.keyPrefix}user:${userId}`;
    const value = JSON.stringify({
      reason: reason || 'all_tokens_revoked',
      revokedAt: new Date().toISOString(),
    });

    // Set user blacklist marker for the duration of max token lifetime
    await this.redis.setex(key, this.defaultTTL, value);
    this.logger.log(`All tokens blacklisted for user: ${userId} (reason: ${reason})`);
  }

  /**
   * Check if all user tokens are blacklisted
   *
   * @param userId - User ID
   * @returns true if all user tokens are blacklisted
   */
  async areUserTokensBlacklisted(userId: string): Promise<boolean> {
    const key = `${this.keyPrefix}user:${userId}`;
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  /**
   * Remove user from blacklist (after successful re-authentication)
   *
   * @param userId - User ID
   */
  async removeUserBlacklist(userId: string): Promise<void> {
    const key = `${this.keyPrefix}user:${userId}`;
    await this.redis.del(key);
    this.logger.debug(`User blacklist removed: ${userId}`);
  }

  /**
   * Check if token or user is blacklisted
   *
   * Combines both checks for efficient validation:
   * 1. Check if specific token is blacklisted
   * 2. Check if all user tokens are blacklisted (batch revocation)
   *
   * @param jti - JWT ID
   * @param userId - User ID
   * @returns true if token should be rejected
   */
  async shouldRejectToken(jti: string, userId: string): Promise<boolean> {
    // Use pipeline for efficient multi-check
    const pipeline = this.redis.pipeline();
    pipeline.exists(`${this.keyPrefix}token:${jti}`);
    pipeline.exists(`${this.keyPrefix}user:${userId}`);

    const results = await pipeline.exec();

    if (process.env.NODE_ENV === 'test') {
      console.log('[Blacklist] Redis results:', JSON.stringify(results));
    }

    const tokenBlacklisted = results?.[0]?.[1] === 1;
    const userBlacklisted = results?.[1]?.[1] === 1;

    if (tokenBlacklisted || userBlacklisted) {
      this.logger.debug(
        `Token rejected: jti=${jti}, tokenBlacklisted=${tokenBlacklisted}, userBlacklisted=${userBlacklisted}`,
      );
    }

    return tokenBlacklisted || userBlacklisted;
  }

  /**
   * Get blacklist statistics
   *
   * @returns Stats about blacklisted tokens
   */
  async getStats(): Promise<{
    tokenCount: number;
    userCount: number;
  }> {
    const [tokenKeys, userKeys] = await Promise.all([
      this.redis.keys(`${this.keyPrefix}token:*`),
      this.redis.keys(`${this.keyPrefix}user:*`),
    ]);

    return {
      tokenCount: tokenKeys.length,
      userCount: userKeys.length,
    };
  }
}
