import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import Redis from 'ioredis';

export interface RateLimitRule {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ALL';
  limit: number; // requests per window
  windowMs: number; // time window in milliseconds
  roles?: string[]; // optional: apply only to specific roles
  skipForRoles?: string[]; // optional: skip rate limiting for these roles
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly redis: Redis;
  private readonly rules: RateLimitRule[] = [];

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    // Initialize Redis client for advanced operations
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);

    this.initializeDefaultRules();
  }

  /**
   * Initialize default rate limiting rules
   * Based on security requirements (REQ-AUTH-44)
   */
  private initializeDefaultRules(): void {
    this.rules.push(
      // Auth endpoints - strict limits
      {
        endpoint: '/auth/login',
        method: 'POST',
        limit: 5,
        windowMs: 60 * 1000, // 1 minute
      },
      {
        endpoint: '/auth/register',
        method: 'POST',
        limit: 3,
        windowMs: 60 * 1000, // 1 minute
      },
      {
        endpoint: '/auth/forgot-password',
        method: 'POST',
        limit: 3,
        windowMs: 5 * 60 * 1000, // 5 minutes
      },
      // Password reset
      {
        endpoint: '/auth/reset-password',
        method: 'POST',
        limit: 3,
        windowMs: 15 * 60 * 1000, // 15 minutes
      },
      // API endpoints - moderate limits
      {
        endpoint: '/api',
        method: 'ALL',
        limit: 100,
        windowMs: 60 * 1000, // 1 minute per user
        skipForRoles: ['admin', 'super-admin'], // Skip for privileged roles
      },
      // Admin endpoints - lower limits
      {
        endpoint: '/api/admin',
        method: 'ALL',
        limit: 50,
        windowMs: 60 * 1000, // 1 minute per user
      },
      // File uploads - strict limits
      {
        endpoint: '/api/files/upload',
        method: 'POST',
        limit: 10,
        windowMs: 60 * 1000, // 1 minute per user
      },
    );

    this.logger.log(`Initialized ${this.rules.length} rate limiting rules`);
  }

  /**
   * Add custom rate limiting rule
   */
  addRule(rule: RateLimitRule): void {
    this.rules.push(rule);
    this.logger.log(`Added rate limiting rule for ${rule.method} ${rule.endpoint}`);
  }

  /**
   * Remove rate limiting rule
   */
  removeRule(endpoint: string, method: string): void {
    const index = this.rules.findIndex(
      rule => rule.endpoint === endpoint && rule.method === method
    );
    if (index > -1) {
      this.rules.splice(index, 1);
      this.logger.log(`Removed rate limiting rule for ${method} ${endpoint}`);
    }
  }

  /**
   * Check if request should be rate limited
   * Uses sliding window algorithm with Redis
   */
  async checkRateLimit(
    identifier: string, // user ID or IP
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    userRole?: string
  ): Promise<RateLimitResult> {
    const rule = this.findMatchingRule(endpoint, method, userRole);

    if (!rule) {
      // No rule found, allow request
      return { allowed: true, remaining: -1, resetTime: 0 };
    }

    // Check if role is exempt
    if (rule.skipForRoles?.includes(userRole || '')) {
      return { allowed: true, remaining: -1, resetTime: 0 };
    }

    const key = this.buildRedisKey(identifier, endpoint, method);
    const now = Date.now();
    const windowStart = now - rule.windowMs;

    try {
      // Use Redis sorted set for sliding window
      // Add current request timestamp
      await this.redis.zadd(key, now, now.toString());

      // Remove old entries outside the window
      await this.redis.zremrangebyscore(key, 0, windowStart);

      // Count requests in current window
      const requestCount = await this.redis.zcount(key, windowStart, now);

      // Set expiration for the key (cleanup)
      await this.redis.expire(key, Math.ceil(rule.windowMs / 1000) + 60);

      const remaining = Math.max(0, rule.limit - requestCount);
      const allowed = requestCount < rule.limit;
      const resetTime = now + rule.windowMs;

      if (!allowed) {
        this.logger.warn(
          `Rate limit exceeded for ${identifier} on ${method} ${endpoint}. ` +
          `Requests: ${requestCount}/${rule.limit}, Remaining: ${remaining}`
        );

        return {
          allowed: false,
          remaining,
          resetTime,
          retryAfter: Math.ceil((resetTime - now) / 1000)
        };
      }

      return {
        allowed: true,
        remaining: remaining - 1, // Subtract current request
        resetTime
      };

    } catch (error) {
      this.logger.error(`Rate limiter error for ${identifier}:`, error);

      // On Redis error, allow request to prevent blocking legitimate traffic
      return { allowed: true, remaining: -1, resetTime: 0 };
    }
  }

  /**
   * Get current rate limit status for an identifier
   */
  async getRateLimitStatus(
    identifier: string,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    userRole?: string
  ): Promise<RateLimitResult | null> {
    const rule = this.findMatchingRule(endpoint, method, userRole);

    if (!rule || rule.skipForRoles?.includes(userRole || '')) {
      return null;
    }

    const key = this.buildRedisKey(identifier, endpoint, method);
    const now = Date.now();
    const windowStart = now - rule.windowMs;

    try {
      const requestCount = await this.redis.zcount(key, windowStart, now);
      const remaining = Math.max(0, rule.limit - requestCount);
      const resetTime = now + rule.windowMs;

      return {
        allowed: requestCount < rule.limit,
        remaining,
        resetTime
      };
    } catch (error) {
      this.logger.error(`Error getting rate limit status:`, error);
      return null;
    }
  }

  /**
   * Reset rate limit for an identifier
   */
  async resetRateLimit(
    identifier: string,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  ): Promise<void> {
    const key = this.buildRedisKey(identifier, endpoint, method);
    try {
      await this.redis.del(key);
      this.logger.log(`Reset rate limit for ${identifier} on ${method} ${endpoint}`);
    } catch (error) {
      this.logger.error(`Error resetting rate limit:`, error);
    }
  }

  /**
   * Find matching rule for endpoint and method
   */
  private findMatchingRule(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    userRole?: string
  ): RateLimitRule | undefined {
    // First, try exact matches
    let rule = this.rules.find(
      r => r.endpoint === endpoint && (r.method === method || r.method === 'ALL')
    );

    // Then, try pattern matches (e.g., /api/*)
    if (!rule) {
      rule = this.rules.find(r => {
        if (r.method !== method && r.method !== 'ALL') return false;

        // Simple pattern matching
        if (r.endpoint.endsWith('/*')) {
          const basePath = r.endpoint.slice(0, -2);
          return endpoint.startsWith(basePath);
        }

        return false;
      });
    }

    // Check role restrictions
    if (rule?.roles && userRole && !rule.roles.includes(userRole)) {
      return undefined;
    }

    return rule;
  }

  /**
   * Build Redis key for rate limiting
   */
  private buildRedisKey(identifier: string, endpoint: string, method: string): string {
    // Sanitize endpoint for Redis key
    const sanitizedEndpoint = endpoint.replace(/[^a-zA-Z0-9]/g, '_');
    return `ratelimit:${identifier}:${method}:${sanitizedEndpoint}`;
  }

  /**
   * Clean up expired keys (maintenance method)
   */
  async cleanup(): Promise<void> {
    try {
      // This is a maintenance method that could be called periodically
      // In production, you might want to use Redis TTL instead
      const keys = await this.redis.keys('ratelimit:*');
      let cleaned = 0;

      for (const key of keys) {
        const count = await this.redis.zcard(key);
        if (count === 0) {
          await this.redis.del(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        this.logger.log(`Cleaned up ${cleaned} empty rate limit keys`);
      }
    } catch (error) {
      this.logger.error('Error during rate limit cleanup:', error);
    }
  }

  /**
   * Get all configured rules (for debugging/admin)
   */
  getRules(): RateLimitRule[] {
    return [...this.rules];
  }

  /**
   * Graceful shutdown
   */
  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.disconnect();
    }
  }
}
