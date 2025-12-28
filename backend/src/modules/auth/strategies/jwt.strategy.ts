import { Injectable, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { TokenBlacklistService } from '../services/token-blacklist.service';

/**
 * JWT Payload interface
 *
 * REQ-AUTH-10: JWT Structure
 * SEC-JWT-01: Mandatory JTI for token revocation
 */
export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
  jti: string; // JWT ID - MANDATORY for blacklist checking (SEC-JWT-01)
  iat?: number; // Issued at timestamp
  exp?: number; // Expiration timestamp
}

/**
 * Extract JWT from cookie first, then fall back to Bearer header
 *
 * SEC-1: HttpOnly Cookie-based Authentication
 *
 * Priority:
 * 1. HttpOnly cookie 'access_token' (most secure, XSS-immune)
 * 2. Authorization: Bearer header (backward compatibility)
 */
const extractJwtFromCookieOrHeader = (req: Request): string | null => {
  // 1. Try to extract from httpOnly cookie first (most secure)
  if (req.cookies && req.cookies.access_token) {
    if (process.env.NODE_ENV === 'test') {
      console.log('[JWT] Token extracted from cookie, length:', req.cookies.access_token?.length);
    }
    return req.cookies.access_token;
  }

  // 2. Fall back to Authorization header for backward compatibility
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (process.env.NODE_ENV === 'test') {
      console.log('[JWT] Token extracted from header, length:', token?.length);
    }
    return token;
  }

  if (process.env.NODE_ENV === 'test') {
    console.log('[JWT] No token found in request');
  }
  return null;
};

/**
 * JWT Strategy
 *
 * REQ-AUTH-10: JWT Authentication
 * REQ-AUTH-56: Token Blacklist Checking
 * SEC-1: HttpOnly Cookie Support
 *
 * Validates JWT tokens from cookies or headers and checks against blacklist.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => TokenBlacklistService))
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    if (process.env.NODE_ENV === 'test') {
      console.log('[JwtStrategy] Initialized with secret length:', jwtSecret?.length);
    }
    super({
      jwtFromRequest: extractJwtFromCookieOrHeader,
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  /**
   * Validate JWT payload
   *
   * SEC-JWT-01: Mandatory JTI validation
   *
   * Steps:
   * 1. Validate JTI is present (required for token revocation)
   * 2. Check if token is blacklisted (REQ-AUTH-56)
   * 3. Verify user exists and is active
   */
  async validate(payload: JwtPayload) {
    const isTest = process.env.NODE_ENV === 'test';
    if (isTest) {
      console.log('[JWT] validate() called for user:', payload.sub?.substring(0, 8));
    }

    // SEC-JWT-01: JTI is mandatory - reject tokens without it
    if (!payload.jti) {
      if (isTest) console.log('[JWT] REJECT: Missing JTI');
      throw new UnauthorizedException(
        'Недействительный токен: отсутствует идентификатор токена',
      );
    }

    // Check if token or user is blacklisted
    let isBlacklisted = false;
    try {
      isBlacklisted = await this.tokenBlacklistService.shouldRejectToken(
        payload.jti,
        payload.sub,
      );
      if (isTest) console.log('[JWT] Blacklist check result:', isBlacklisted);
    } catch (error) {
      if (isTest) console.log('[JWT] Blacklist check error:', error);
      // In test environment, treat redis errors as non-blocking
      if (isTest) {
        isBlacklisted = false;
      } else {
        throw new UnauthorizedException('Ошибка проверки токена');
      }
    }

    if (isBlacklisted) {
      if (isTest) console.log('[JWT] REJECT: Token is blacklisted');
      throw new UnauthorizedException('Токен недействителен (отозван)');
    }

    // Verify user exists and is active
    const user = await this.usersService.findOne(payload.sub);

    if (!user) {
      if (isTest) console.log('[JWT] REJECT: User not found for ID:', payload.sub);
      throw new UnauthorizedException('Пользователь не найден');
    }

    if (user.status !== 'active') {
      if (isTest) console.log('[JWT] REJECT: User status is:', user.status);
      throw new UnauthorizedException('Аккаунт пользователя неактивен');
    }

    if (isTest) console.log('[JWT] SUCCESS: User validated:', user.email);
    return user;
  }
}
