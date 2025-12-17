import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import * as crypto from 'crypto';

/**
 * CSRF Token configuration options
 */
export interface CsrfOptions {
  skip?: boolean;
  methods?: string[]; // HTTP methods to protect
}

export const CSRF_KEY = 'csrf';
export const CSRF_TOKEN_HEADER = 'x-csrf-token';
export const CSRF_TOKEN_COOKIE = 'csrf_token';

/**
 * CSRF Protection Guard
 *
 * SEC-CSRF-01: Cross-Site Request Forgery protection
 *
 * Uses the Double Submit Cookie pattern:
 * 1. Server sets CSRF token in non-httpOnly cookie
 * 2. Client reads cookie and includes token in request header
 * 3. Guard validates header token matches cookie token
 *
 * Why this pattern:
 * - SameSite cookies alone aren't sufficient for all browsers
 * - Works with both cookie-based and bearer token auth
 * - Simple to implement with SPAs
 *
 * Protected methods by default: POST, PUT, DELETE, PATCH
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly logger = new Logger(CsrfGuard.name);
  private readonly protectedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Check if CSRF protection should be skipped for this route
    const csrfOptions = this.reflector.get<CsrfOptions>(
      CSRF_KEY,
      context.getHandler(),
    );

    if (csrfOptions?.skip) {
      return true;
    }

    // Determine which methods to protect
    const methodsToProtect = csrfOptions?.methods || this.protectedMethods;

    // Skip CSRF check for safe methods (GET, HEAD, OPTIONS)
    if (!methodsToProtect.includes(request.method)) {
      return true;
    }

    // Skip for API key authenticated requests (service-to-service)
    if (request.headers['x-api-key']) {
      return true;
    }

    // Get tokens
    const headerToken = request.headers[CSRF_TOKEN_HEADER] as string | undefined;
    const cookieToken = request.cookies?.[CSRF_TOKEN_COOKIE];

    // Both tokens must be present
    if (!headerToken) {
      this.logger.warn(
        `CSRF validation failed: missing header token for ${request.method} ${request.path}`,
      );
      throw new ForbiddenException('CSRF token missing in header');
    }

    if (!cookieToken) {
      this.logger.warn(
        `CSRF validation failed: missing cookie token for ${request.method} ${request.path}`,
      );
      throw new ForbiddenException('CSRF token missing in cookie');
    }

    // Validate tokens match using timing-safe comparison
    if (!this.validateToken(headerToken, cookieToken)) {
      this.logger.warn(
        `CSRF validation failed: token mismatch for ${request.method} ${request.path}`,
      );
      throw new ForbiddenException('CSRF token validation failed');
    }

    return true;
  }

  /**
   * Validate CSRF tokens using timing-safe comparison
   * Prevents timing attacks that could reveal token values
   */
  private validateToken(headerToken: string, cookieToken: string): boolean {
    try {
      // Ensure both tokens have the same length for timing-safe comparison
      if (headerToken.length !== cookieToken.length) {
        return false;
      }

      return crypto.timingSafeEqual(
        Buffer.from(headerToken, 'utf8'),
        Buffer.from(cookieToken, 'utf8'),
      );
    } catch {
      return false;
    }
  }
}

/**
 * Generate a secure CSRF token
 *
 * @returns 32-byte random token as hex string (64 characters)
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Decorator to skip CSRF protection for specific routes
 *
 * @example
 * @SkipCsrf()
 * @Post('webhook')
 * handleWebhook() {}
 */
export function SkipCsrf() {
  return (target: object, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(CSRF_KEY, { skip: true }, descriptor.value);
    return descriptor;
  };
}

/**
 * Decorator to configure CSRF protection options
 *
 * @example
 * @CsrfProtection({ methods: ['POST', 'DELETE'] })
 * @Controller('admin')
 * export class AdminController {}
 */
export function CsrfProtection(options: CsrfOptions) {
  return (target: object, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(CSRF_KEY, options, descriptor.value);
    } else {
      Reflect.defineMetadata(CSRF_KEY, options, target);
    }
  };
}
