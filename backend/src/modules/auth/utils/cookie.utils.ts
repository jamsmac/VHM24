import { Response, CookieOptions } from 'express';

/**
 * Cookie utility for secure httpOnly token storage
 * SEC-1: XSS-proof token storage via httpOnly cookies
 */

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Common cookie options for access token
 * - httpOnly: Prevents XSS attacks (JavaScript cannot read)
 * - secure: HTTPS only in production
 * - sameSite: Prevents CSRF attacks
 * - path: Cookie sent to all API routes
 */
export const ACCESS_TOKEN_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict',
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
  secure: isProduction,
  sameSite: 'strict',
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
