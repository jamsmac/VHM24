import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UAParser } from 'ua-parser-js';
import { UserSession } from '../entities/user-session.entity';

/**
 * Session creation data
 */
export interface CreateSessionData {
  userId: string;
  refreshToken: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

/**
 * Session Service
 *
 * REQ-AUTH-54: Session Tracking
 * REQ-AUTH-55: Refresh Token Rotation
 * REQ-AUTH-61: Session Limits
 *
 * Manages user sessions with features:
 * - Multiple concurrent sessions per user
 * - Refresh token rotation
 * - Session revocation
 * - Device fingerprinting
 * - Session limits per user
 * - Expired session cleanup
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly maxSessionsPerUser: number;
  private readonly sessionExpirationDays: number;

  constructor(
    @InjectRepository(UserSession)
    private readonly sessionRepository: Repository<UserSession>,
    private readonly configService: ConfigService,
  ) {
    this.maxSessionsPerUser = this.configService.get<number>('MAX_SESSIONS_PER_USER', 5);
    this.sessionExpirationDays = this.configService.get<number>('SESSION_EXPIRATION_DAYS', 7);
  }

  /**
   * Generate token hint for fast lookup
   *
   * Creates a 16-character SHA-256 hash prefix of the refresh token.
   * This allows O(1) index lookup before expensive bcrypt comparison.
   *
   * @param refreshToken - Raw refresh token
   * @returns 16-character hex hint
   */
  private generateTokenHint(refreshToken: string): string {
    return crypto.createHash('sha256').update(refreshToken).digest('hex').substring(0, 16);
  }

  /**
   * Create new session
   *
   * Creates a new session for the user. If max sessions exceeded,
   * revokes the oldest session.
   *
   * @param data - Session creation data
   * @returns Created session
   */
  async createSession(data: CreateSessionData): Promise<UserSession> {
    // Parse device information from user agent
    const deviceInfo = this.parseUserAgent(data.userAgent);

    // Hash refresh token and generate hint for fast lookup
    const refreshTokenHash = await bcrypt.hash(data.refreshToken, 12);
    const refreshTokenHint = this.generateTokenHint(data.refreshToken);

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.sessionExpirationDays);

    // Check session limit
    const activeSessions = await this.getActiveSessions(data.userId);
    if (activeSessions.length >= this.maxSessionsPerUser) {
      // Revoke oldest session
      const oldestSession = activeSessions.sort(
        (a, b) => a.created_at.getTime() - b.created_at.getTime(),
      )[0];
      await this.revokeSession(oldestSession.id, 'max_sessions_exceeded');
    }

    // Create session with token hint for O(1) lookup (if column exists)
    const sessionData: Partial<UserSession> = {
      user_id: data.userId,
      refresh_token_hash: refreshTokenHash,
      ip_address: data.ipAddress,
      user_agent: data.userAgent,
      device_type: deviceInfo.deviceType,
      device_name: deviceInfo.deviceName,
      os: deviceInfo.os,
      browser: deviceInfo.browser,
      is_active: true,
      last_used_at: new Date(),
      expires_at: expiresAt,
      metadata: data.metadata || {},
    };

    try {
      // Try with refresh_token_hint column
      const session = this.sessionRepository.create({
        ...sessionData,
        refresh_token_hint: refreshTokenHint,
      });
      return await this.sessionRepository.save(session);
    } catch (error: unknown) {
      // If refresh_token_hint column doesn't exist, use raw SQL insert
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('refresh_token_hint') && errMsg.includes('does not exist')) {
        this.logger.warn('refresh_token_hint column not found, using raw SQL insert');

        // Use raw SQL to insert without the missing column
        const [result] = await this.sessionRepository.query(
          `INSERT INTO user_sessions (
            user_id, refresh_token_hash, ip_address, user_agent,
            device_type, device_name, os, browser,
            is_active, last_used_at, expires_at, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING id, user_id, refresh_token_hash, ip_address, user_agent,
            device_type, device_name, os, browser,
            is_active, last_used_at, expires_at, revoked_at, revoked_reason,
            metadata, created_at, updated_at, deleted_at`,
          [
            sessionData.user_id,
            sessionData.refresh_token_hash,
            sessionData.ip_address,
            sessionData.user_agent,
            sessionData.device_type,
            sessionData.device_name,
            sessionData.os,
            sessionData.browser,
            sessionData.is_active,
            sessionData.last_used_at,
            sessionData.expires_at,
            JSON.stringify(sessionData.metadata || {}),
          ],
        );

        // Map raw result to entity
        const session = new UserSession();
        Object.assign(session, result);
        return session;
      }
      throw error;
    }
  }

  /**
   * Update session last used time
   *
   * @param sessionId - Session ID
   */
  async touchSession(sessionId: string): Promise<void> {
    await this.sessionRepository.update(sessionId, {
      last_used_at: new Date(),
    });
  }

  /**
   * Rotate refresh token
   *
   * Updates session with new refresh token hash and hint.
   * REQ-AUTH-55: Refresh Token Rotation
   *
   * @param sessionId - Session ID
   * @param newRefreshToken - New refresh token
   */
  async rotateRefreshToken(sessionId: string, newRefreshToken: string): Promise<void> {
    const refreshTokenHash = await bcrypt.hash(newRefreshToken, 12);
    const refreshTokenHint = this.generateTokenHint(newRefreshToken);
    try {
      await this.sessionRepository.update(sessionId, {
        refresh_token_hash: refreshTokenHash,
        refresh_token_hint: refreshTokenHint,
        last_used_at: new Date(),
      });
    } catch (error: unknown) {
      // If refresh_token_hint column doesn't exist, update without it
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('refresh_token_hint') && errMsg.includes('does not exist')) {
        this.logger.warn('refresh_token_hint column not found, rotating without hint');
        await this.sessionRepository.update(sessionId, {
          refresh_token_hash: refreshTokenHash,
          last_used_at: new Date(),
        });
        return;
      }
      throw error;
    }
  }

  /**
   * Verify refresh token
   *
   * Checks if refresh token matches the session.
   *
   * @param sessionId - Session ID
   * @param refreshToken - Refresh token to verify
   * @returns true if valid
   */
  async verifyRefreshToken(sessionId: string, refreshToken: string): Promise<boolean> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session || !session.isValid) {
      return false;
    }

    return await bcrypt.compare(refreshToken, session.refresh_token_hash);
  }

  /**
   * Find session by refresh token
   *
   * OPTIMIZED: Uses token hint for O(1) index lookup before bcrypt comparison.
   * Previous implementation loaded ALL active sessions and did O(n) bcrypt comparisons.
   *
   * Performance improvement:
   * - Before: O(n) bcrypt comparisons where n = total active sessions
   * - After: O(1) index lookup + typically 1 bcrypt comparison
   *
   * @param refreshToken - Refresh token
   * @returns Session or null
   */
  async findSessionByRefreshToken(refreshToken: string): Promise<UserSession | null> {
    // Fallback method: scan all active sessions (used when hint column doesn't exist)
    const findByFullScan = async (): Promise<UserSession | null> => {
      const allActiveSessions = await this.sessionRepository.find({
        where: { is_active: true },
      });

      for (const session of allActiveSessions) {
        const isMatch = await bcrypt.compare(refreshToken, session.refresh_token_hash);
        if (isMatch && session.isValid) {
          return session;
        }
      }
      return null;
    };

    // Generate hint for fast indexed lookup
    const tokenHint = this.generateTokenHint(refreshToken);

    try {
      // First, try optimized lookup using token hint (O(1) index query)
      const sessionsWithHint = await this.sessionRepository.find({
        where: {
          is_active: true,
          refresh_token_hint: tokenHint,
        },
      });

      // bcrypt compare only matching sessions (typically 1, at most a few due to hash collisions)
      for (const session of sessionsWithHint) {
        const isMatch = await bcrypt.compare(refreshToken, session.refresh_token_hash);
        if (isMatch && session.isValid) {
          return session;
        }
      }

      // Fallback for sessions without hint (backward compatibility during migration)
      // This handles existing sessions created before the hint column was added
      const sessionsWithoutHint = await this.sessionRepository.find({
        where: {
          is_active: true,
          refresh_token_hint: null as unknown as string,
        },
      });

      if (sessionsWithoutHint.length > 0) {
        this.logger.warn(
          `Found ${sessionsWithoutHint.length} sessions without token hint. ` +
            `Consider running migration to backfill hints.`,
        );

        for (const session of sessionsWithoutHint) {
          const isMatch = await bcrypt.compare(refreshToken, session.refresh_token_hash);
          if (isMatch && session.isValid) {
            // Backfill the hint for this session
            await this.sessionRepository.update(session.id, {
              refresh_token_hint: tokenHint,
            });
            return session;
          }
        }
      }

      return null;
    } catch (error: unknown) {
      // If refresh_token_hint column doesn't exist, fall back to full scan
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('refresh_token_hint') && errMsg.includes('does not exist')) {
        this.logger.warn('refresh_token_hint column not found, using fallback full scan');
        return findByFullScan();
      }
      throw error;
    }
  }

  /**
   * Get active sessions for user
   *
   * @param userId - User ID
   * @returns List of active sessions
   */
  async getActiveSessions(userId: string): Promise<UserSession[]> {
    try {
      return await this.sessionRepository.find({
        where: {
          user_id: userId,
          is_active: true,
        },
        order: {
          last_used_at: 'DESC',
        },
      });
    } catch (error: unknown) {
      // If refresh_token_hint column doesn't exist, query without selecting it
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('refresh_token_hint') && errMsg.includes('does not exist')) {
        this.logger.warn('refresh_token_hint column not found, querying without it');
        return await this.sessionRepository
          .createQueryBuilder('session')
          .select([
            'session.id',
            'session.user_id',
            'session.refresh_token_hash',
            'session.ip_address',
            'session.user_agent',
            'session.device_type',
            'session.device_name',
            'session.os',
            'session.browser',
            'session.is_active',
            'session.last_used_at',
            'session.expires_at',
            'session.revoked_at',
            'session.revoked_reason',
            'session.metadata',
            'session.created_at',
            'session.updated_at',
            'session.deleted_at',
          ])
          .where('session.user_id = :userId', { userId })
          .andWhere('session.is_active = true')
          .orderBy('session.last_used_at', 'DESC')
          .getMany();
      }
      throw error;
    }
  }

  /**
   * Get all sessions for user (including inactive)
   *
   * @param userId - User ID
   * @returns List of all sessions
   */
  async getAllSessions(userId: string): Promise<UserSession[]> {
    return await this.sessionRepository.find({
      where: { user_id: userId },
      order: {
        created_at: 'DESC',
      },
    });
  }

  /**
   * Revoke session
   *
   * Marks session as inactive and sets revoked timestamp.
   *
   * @param sessionId - Session ID
   * @param reason - Revocation reason
   */
  async revokeSession(sessionId: string, reason?: string): Promise<void> {
    await this.sessionRepository.update(sessionId, {
      is_active: false,
      revoked_at: new Date(),
      revoked_reason: reason || 'manual',
    });
  }

  /**
   * Revoke all sessions for user
   *
   * Useful when password is changed, 2FA is disabled, or security breach.
   *
   * @param userId - User ID
   * @param reason - Revocation reason
   */
  async revokeAllUserSessions(userId: string, reason?: string): Promise<number> {
    const sessions = await this.getActiveSessions(userId);

    for (const session of sessions) {
      await this.revokeSession(session.id, reason);
    }

    return sessions.length;
  }

  /**
   * Revoke all sessions except current
   *
   * @param userId - User ID
   * @param currentSessionId - Current session ID to keep
   * @param reason - Revocation reason
   */
  async revokeOtherSessions(
    userId: string,
    currentSessionId: string,
    reason?: string,
  ): Promise<number> {
    const sessions = await this.getActiveSessions(userId);
    const otherSessions = sessions.filter((s) => s.id !== currentSessionId);

    for (const session of otherSessions) {
      await this.revokeSession(session.id, reason);
    }

    return otherSessions.length;
  }

  /**
   * Clean up expired sessions
   *
   * Removes sessions that are expired and older than retention period.
   * Should be run as a cron job.
   *
   * @param retentionDays - Days to keep expired sessions (default: 30)
   * @returns Number of sessions deleted
   */
  async cleanupExpiredSessions(retentionDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.sessionRepository.softDelete({
      expires_at: LessThan(new Date()),
      created_at: LessThan(cutoffDate),
    });

    return result.affected || 0;
  }

  /**
   * Parse user agent string to extract device information
   *
   * @param userAgent - User agent string
   * @returns Device information
   */
  private parseUserAgent(userAgent?: string): {
    deviceType: string | null;
    deviceName: string | null;
    os: string | null;
    browser: string | null;
  } {
    if (!userAgent) {
      return {
        deviceType: null,
        deviceName: null,
        os: null,
        browser: null,
      };
    }

    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    // Determine device type
    let deviceType: string | null = null;
    if (result.device.type) {
      deviceType = result.device.type; // mobile, tablet, etc.
    } else {
      deviceType = 'desktop';
    }

    // Build device name
    const deviceName = [result.browser.name, 'on', result.os.name].filter(Boolean).join(' ');

    return {
      deviceType,
      deviceName: deviceName || null,
      os: result.os.name || null,
      browser: result.browser.name || null,
    };
  }
}
