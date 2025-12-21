import { Response, CookieOptions } from 'express';

/**
 * Cookie utility for secure httpOnly token storage
 * SEC-1: XSS-proof token storage via httpOnly cookies
 * 
 * NOTE: This file is legacy. Use CookieService instead for proper environment variable support.
 * This file is kept for backward compatibility but should not be used in new code.
 */

const isProduction = process.env.NODE_ENV === 'production';
// Use 'none' for cross-origin (different domains), 'strict' for same-origin
// Set COOKIE_SAME_SITE=none in Railway for cross-origin cookie support
const sameSitePolicy = (process.env.COOKIE_SAME_SITE || 'strict') as 'strict' | 'lax' | 'none';

/**
 * Common cookie options for access token
 * - httpOnly: Prevents XSS attacks (JavaScript cannot read)
 * - secure: HTTPS only in production (or when sameSite is 'none')
 * - sameSite: Prevents CSRF attacks (configurable via COOKIE_SAME_SITE env var)
 * - path: Cookie sent to all API routes
 */
export const ACCESS_TOKEN_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  // secure must be true when sameSite is 'none'
  secure: isProduction || sameSitePolicy === 'none',
  sameSite: sameSitePolicy,
  path: '/',
  maxAge: 15 * 60 * 1000, // 15 minutes
};

/**
 * Common cookie options for refresh token
 * - Restricted path to refresh endpoint only
 * - Longer expiration (7 days)
 */
export const REFRESH_TOKEN_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  // secure must be true when sameSite is 'none'
  secure: isProduction || sameSitePolicy === 'none',
  sameSite: sameSitePolicy,
  path: '/api/v1/auth/refresh',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * Set authentication cookies on response
 */
export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
): void {
  res.cookie('access_token', accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
  res.cookie('refresh_token', refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
}

/**
 * Clear authentication cookies on logout
 */
export function clearAuthCookies(res: Response): void {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });
}

/**
 * Cookie names as constants
 */
export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
} as const;
