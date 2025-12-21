import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response, CookieOptions } from 'express';

/**
 * Cookie Service for Secure Token Management
 *
 * SEC-1: HttpOnly Cookie-based Authentication
 *
 * Security features:
 * - httpOnly: true - Prevents XSS attacks from accessing tokens
 * - secure: true (in production) - Only sent over HTTPS
 * - sameSite: 'strict' - Prevents CSRF attacks
 * - path: '/' - Available for all routes
 */
@Injectable()
export class CookieService {
  private readonly isProduction: boolean;
  private readonly cookieDomain: string | undefined;
  private readonly sameSitePolicy: 'strict' | 'lax' | 'none';

  // Cookie names
  readonly ACCESS_TOKEN_COOKIE = 'access_token';
  readonly REFRESH_TOKEN_COOKIE = 'refresh_token';

  constructor(private readonly configService: ConfigService) {
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    this.cookieDomain = this.configService.get<string>('COOKIE_DOMAIN');
    // Use 'none' for cross-origin (different domains), 'strict' for same-origin
    // Set COOKIE_SAME_SITE=none in Railway for cross-origin cookie support
    this.sameSitePolicy = this.configService.get<'strict' | 'lax' | 'none'>('COOKIE_SAME_SITE', 'strict');
  }

  /**
   * Get base cookie options for security
   */
  private getBaseCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      // secure must be true when sameSite is 'none'
      secure: this.isProduction || this.sameSitePolicy === 'none',
      sameSite: this.sameSitePolicy,
      path: '/',
      domain: this.cookieDomain,
    };
  }

  /**
   * Get access token cookie options
   * Shorter expiration (15 minutes default)
   */
  getAccessTokenCookieOptions(): CookieOptions {
    const expiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m');
    const maxAge = this.parseExpiration(expiresIn);

    return {
      ...this.getBaseCookieOptions(),
      maxAge,
    };
  }

  /**
   * Get refresh token cookie options
   * Longer expiration (7 days default)
   * More restrictive path
   */
  getRefreshTokenCookieOptions(): CookieOptions {
    const expiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d');
    const maxAge = this.parseExpiration(expiresIn);

    return {
      ...this.getBaseCookieOptions(),
      maxAge,
      path: '/api/v1/auth', // Only sent to auth endpoints
    };
  }

  /**
   * Set authentication cookies on response
   */
  setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    res.cookie(this.ACCESS_TOKEN_COOKIE, accessToken, this.getAccessTokenCookieOptions());

    res.cookie(this.REFRESH_TOKEN_COOKIE, refreshToken, this.getRefreshTokenCookieOptions());
  }

  /**
   * Set only access token cookie (for token refresh)
   */
  setAccessTokenCookie(res: Response, accessToken: string): void {
    res.cookie(this.ACCESS_TOKEN_COOKIE, accessToken, this.getAccessTokenCookieOptions());
  }

  /**
   * Clear authentication cookies on logout
   */
  clearAuthCookies(res: Response): void {
    const clearOptions: CookieOptions = {
      ...this.getBaseCookieOptions(),
      maxAge: 0,
    };

    res.cookie(this.ACCESS_TOKEN_COOKIE, '', clearOptions);
    res.cookie(this.REFRESH_TOKEN_COOKIE, '', {
      ...clearOptions,
      path: '/api/v1/auth',
    });
  }

  /**
   * Parse expiration string to milliseconds
   * Supports: 15m, 1h, 7d, etc.
   */
  private parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      // Default to 15 minutes if parsing fails
      return 15 * 60 * 1000;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 15 * 60 * 1000;
    }
  }
}
