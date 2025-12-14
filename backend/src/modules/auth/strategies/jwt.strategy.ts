import { Injectable, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { TokenBlacklistService } from '../services/token-blacklist.service';

/**
 * JWT Payload interface
 *
 * REQ-AUTH-10: JWT Structure
 */
export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
  jti?: string; // JWT ID for blacklist checking (optional for backward compatibility)
  iat?: number; // Issued at timestamp
  exp?: number; // Expiration timestamp
}

/**
 * Extract JWT from httpOnly cookie or Authorization header
 * SEC-1: Cookie-based auth with Bearer token fallback for API clients
 */
const cookieOrBearerExtractor = (req: Request): string | null => {
  // Priority 1: httpOnly cookie (secure, XSS-proof)
  if (req?.cookies?.access_token) {
    return req.cookies.access_token;
  }
  // Priority 2: Bearer token header (for API clients, mobile apps)
  const authHeader = req?.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};

/**
 * JWT Strategy
 *
 * REQ-AUTH-10: JWT Authentication
 * REQ-AUTH-56: Token Blacklist Checking
 * SEC-1: httpOnly cookie support
 *
 * Validates JWT tokens from cookies or Bearer header and checks against blacklist.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => TokenBlacklistService))
    private readonly tokenBlacklistService: TokenBlacklistService,
  ) {
    super({
      jwtFromRequest: cookieOrBearerExtractor,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Validate JWT payload
   *
   * Steps:
   * 1. Check if token is blacklisted (REQ-AUTH-56)
   * 2. Check if all user tokens are blacklisted
   * 3. Verify user exists and is active
   */
  async validate(payload: JwtPayload) {
    // Check blacklist if jti is present
    if (payload.jti) {
      const isBlacklisted = await this.tokenBlacklistService.shouldRejectToken(
        payload.jti,
        payload.sub,
      );

      if (isBlacklisted) {
        throw new UnauthorizedException('Токен недействителен (отозван)');
      }
    } else {
      // Check user-level blacklist even without jti
      const userBlacklisted = await this.tokenBlacklistService.areUserTokensBlacklisted(
        payload.sub,
      );

      if (userBlacklisted) {
        throw new UnauthorizedException('Все сессии пользователя отозваны');
      }
    }

    // Verify user exists and is active
    const user = await this.usersService.findOne(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Аккаунт пользователя неактивен');
    }

    return user;
  }
}
