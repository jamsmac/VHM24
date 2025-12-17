import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';
import { CSRF_TOKEN_COOKIE } from '../guards/csrf.guard';

/**
 * CSRF Token Middleware
 *
 * SEC-CSRF-01: Sets CSRF token cookie for Double Submit Cookie pattern
 *
 * Sets a non-httpOnly cookie containing a CSRF token that:
 * 1. Can be read by JavaScript on the frontend
 * 2. Must be included in request headers for state-changing operations
 * 3. Is validated against the cookie value by CsrfGuard
 *
 * Token characteristics:
 * - 32 random bytes (256 bits) as hex string
 * - Rotated per session (set once per browser session)
 * - Refreshed if missing or expired
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CsrfMiddleware.name);
  private readonly isProduction: boolean;
  private readonly cookieDomain: string | undefined;
  private readonly tokenMaxAge: number;

  constructor(private readonly configService: ConfigService) {
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    this.cookieDomain = this.configService.get<string>('COOKIE_DOMAIN');
    // CSRF token valid for 24 hours
    this.tokenMaxAge = 24 * 60 * 60 * 1000;
  }

  use(req: Request, res: Response, next: NextFunction): void {
    // Only set CSRF token on GET requests (when page/app loads)
    // This prevents token regeneration on every request
    if (req.method !== 'GET') {
      return next();
    }

    // Skip for API-only routes (no browser interaction)
    if (req.path.startsWith('/api/v1/health') || req.path.startsWith('/api/docs')) {
      return next();
    }

    // Check if token already exists and is valid
    const existingToken = req.cookies?.[CSRF_TOKEN_COOKIE];
    if (existingToken && this.isValidToken(existingToken)) {
      return next();
    }

    // Generate new CSRF token
    const csrfToken = this.generateToken();

    // Set cookie with appropriate security options
    res.cookie(CSRF_TOKEN_COOKIE, csrfToken, {
      // NOT httpOnly - must be readable by JavaScript
      httpOnly: false,
      secure: this.isProduction,
      sameSite: 'strict',
      path: '/',
      domain: this.cookieDomain,
      maxAge: this.tokenMaxAge,
    });

    this.logger.debug(`CSRF token set for ${req.path}`);

    next();
  }

  /**
   * Generate a cryptographically secure CSRF token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate token format (basic validation)
   */
  private isValidToken(token: string): boolean {
    // Token should be 64 hex characters (32 bytes)
    return typeof token === 'string' && /^[a-f0-9]{64}$/i.test(token);
  }
}
