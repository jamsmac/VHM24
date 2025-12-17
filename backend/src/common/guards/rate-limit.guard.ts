import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimiterService, RateLimitResult } from '../services/rate-limiter.service';
import { Request, Response } from 'express';

/**
 * User payload attached to request by auth guard
 */
interface RequestUser {
  id?: string;
  userId?: string;
  role?: string;
}

/**
 * Express request with user property
 */
interface AuthenticatedRequest extends Request {
  user?: RequestUser;
}

export interface RateLimitOptions {
  limit?: number;
  windowMs?: number;
  skipForRoles?: string[];
  keyGenerator?: (req: Request, user?: RequestUser) => string;
}

export const RATE_LIMIT_KEY = 'rateLimit';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly rateLimiter: RateLimiterService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Get metadata from decorator
    const rateLimitOptions = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler()
    );

    // Get user from request (set by auth guard)
    const user = (request as AuthenticatedRequest).user;
    const userId = user?.id || user?.userId;
    const userRole = user?.role;

    // Generate identifier (user ID or IP)
    const identifier = this.generateIdentifier(request, userId, rateLimitOptions);

    // Get endpoint and method
    const endpoint = this.getEndpoint(request);
    const method = request.method as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

    try {
      // Check rate limit
      const result = await this.rateLimiter.checkRateLimit(
        identifier,
        endpoint,
        method,
        userRole
      );

      // Set rate limit headers
      this.setRateLimitHeaders(response, result);

      if (!result.allowed) {
        // Rate limit exceeded
        this.logger.warn(
          `Rate limit exceeded for ${identifier} on ${method} ${endpoint}`
        );

        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Too many requests',
            error: 'Rate limit exceeded',
            retryAfter: result.retryAfter,
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      // Log remaining requests for debugging
      if (result.remaining <= 5 && result.remaining > 0) {
        this.logger.debug(
          `Rate limit warning: ${result.remaining} requests remaining for ${identifier}`
        );
      }

      return true;

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // On rate limiter error, allow request to prevent blocking
      this.logger.error(`Rate limiter error for ${identifier}:`, error);
      return true;
    }
  }

  /**
   * Generate identifier for rate limiting (user ID or IP)
   */
  private generateIdentifier(
    request: Request,
    userId?: string,
    options?: RateLimitOptions
  ): string {
    // Use custom key generator if provided
    if (options?.keyGenerator) {
      return options.keyGenerator(request, (request as AuthenticatedRequest).user);
    }

    // Prefer user ID for authenticated requests
    if (userId) {
      return `user:${userId}`;
    }

    // Fall back to IP address for anonymous requests
    const ip = this.getClientIP(request);

    // For auth endpoints, use IP-based limiting
    if (request.path.startsWith('/auth/')) {
      return `ip:${ip}`;
    }

    // For API endpoints, prefer user ID but fall back to IP
    return `ip:${ip}`;
  }

  /**
   * Get client IP address
   */
  private getClientIP(request: Request): string {
    // Check common headers for IP
    const forwarded = request.get('x-forwarded-for');
    const realIP = request.get('x-real-ip');
    const clientIP = request.get('x-client-ip');

    if (forwarded) {
      // Take first IP if multiple
      return forwarded.split(',')[0].trim();
    }

    if (realIP) {
      return realIP;
    }

    if (clientIP) {
      return clientIP;
    }

    // Fall back to connection remote address
    return request.socket.remoteAddress || 'unknown';
  }

  /**
   * Get endpoint path for rate limiting
   */
  private getEndpoint(request: Request): string {
    // Get base path (e.g., /api/users/123 -> /api/users)
    const path = request.path;

    // For API endpoints, group by resource
    if (path.startsWith('/api/')) {
      const parts = path.split('/').filter(Boolean);
      if (parts.length >= 2) {
        // /api/users -> /api/users
        // /api/users/123 -> /api/users
        return `/${parts.slice(0, 2).join('/')}`;
      }
    }

    return path;
  }

  /**
   * Set rate limit headers in response
   */
  private setRateLimitHeaders(response: Response, result: RateLimitResult): void {
    if (result.remaining >= 0) {
      response.set({
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
      });

      if (result.retryAfter) {
        response.set({
          'X-RateLimit-Retry-After': result.retryAfter.toString(),
          'Retry-After': result.retryAfter.toString(),
        });
      }
    }
  }
}

/**
 * Decorator to set custom rate limiting options for a route
 */
export function RateLimit(options: RateLimitOptions) {
  return (target: object, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(RATE_LIMIT_KEY, options, descriptor.value);
  };
}

/**
 * Decorator to skip rate limiting for specific roles
 */
export function SkipRateLimit(roles: string[] = []) {
  return (target: object, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(RATE_LIMIT_KEY, {
      skipForRoles: roles
    }, descriptor.value);
  };
}
