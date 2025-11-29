import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
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

    // Hash refresh token
    const refreshTokenHash = await bcrypt.hash(data.refreshToken, 10);

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

    // Create session
    const session = this.sessionRepository.create({
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
    });

    return await this.sessionRepository.save(session);
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
   * Updates session with new refresh token hash.
   * REQ-AUTH-55: Refresh Token Rotation
   *
   * @param sessionId - Session ID
   * @param newRefreshToken - New refresh token
   */
  async rotateRefreshToken(sessionId: string, newRefreshToken: string): Promise<void> {
    const refreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
    await this.sessionRepository.update(sessionId, {
      refresh_token_hash: refreshTokenHash,
      last_used_at: new Date(),
    });
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
   * @param refreshToken - Refresh token
   * @returns Session or null
   */
  async findSessionByRefreshToken(refreshToken: string): Promise<UserSession | null> {
    const sessions = await this.sessionRepository.find({
      where: { is_active: true },
    });

    for (const session of sessions) {
      const isMatch = await bcrypt.compare(refreshToken, session.refresh_token_hash);
      if (isMatch && session.isValid) {
        return session;
      }
    }

    return null;
  }

  /**
   * Get active sessions for user
   *
   * @param userId - User ID
   * @returns List of active sessions
   */
  async getActiveSessions(userId: string): Promise<UserSession[]> {
    return await this.sessionRepository.find({
      where: {
        user_id: userId,
        is_active: true,
      },
      order: {
        last_used_at: 'DESC',
      },
    });
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
