import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { AuditLog, AuditEventType, AuditSeverity } from './entities/audit-log.entity';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

/**
 * Request context for audit logging
 */
export interface AuditContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Result of paginated query
 */
export interface PaginatedAuditLogs {
  data: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Audit statistics for dashboard
 */
export interface AuditStatistics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  failedLogins: number;
  successfulLogins: number;
  securityAlerts: number;
  recentEvents: AuditLog[];
}

/**
 * AuditLogService
 *
 * Provides centralized audit logging for security events.
 * Implements REQ-AUTH-80 (log key authorization events) and
 * REQ-AUTH-81 (admin can view and filter audit logs).
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  // ========================================
  // Core CRUD Operations
  // ========================================

  /**
   * Create a new audit log entry
   */
  async create(dto: CreateAuditLogDto): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      event_type: dto.event_type,
      severity: dto.severity || AuditSeverity.INFO,
      user_id: dto.user_id || null,
      target_user_id: dto.target_user_id || null,
      ip_address: dto.ip_address || null,
      user_agent: dto.user_agent || null,
      description: dto.description || null,
      metadata: dto.metadata || {},
      success: dto.success ?? true,
      error_message: dto.error_message || null,
    });

    const saved = await this.auditLogRepository.save(auditLog);
    this.logger.log(`Audit log created: ${dto.event_type} by user ${dto.user_id || 'anonymous'}`);
    return saved;
  }

  /**
   * Find all audit logs with filters and pagination
   */
  async findAll(queryDto: QueryAuditLogDto): Promise<PaginatedAuditLogs> {
    const {
      event_type,
      severity,
      user_id,
      target_user_id,
      ip_address,
      from_date,
      to_date,
      limit = 50,
      offset = 0,
    } = queryDto;

    const queryBuilder = this.auditLogRepository
      .createQueryBuilder('audit_log')
      .leftJoinAndSelect('audit_log.user', 'user')
      .leftJoinAndSelect('audit_log.target_user', 'target_user');

    // Apply filters
    if (event_type) {
      queryBuilder.andWhere('audit_log.event_type = :event_type', { event_type });
    }

    if (severity) {
      queryBuilder.andWhere('audit_log.severity = :severity', { severity });
    }

    if (user_id) {
      queryBuilder.andWhere('audit_log.user_id = :user_id', { user_id });
    }

    if (target_user_id) {
      queryBuilder.andWhere('audit_log.target_user_id = :target_user_id', { target_user_id });
    }

    if (ip_address) {
      queryBuilder.andWhere('audit_log.ip_address = :ip_address', { ip_address });
    }

    if (from_date && to_date) {
      queryBuilder.andWhere('audit_log.created_at BETWEEN :from_date AND :to_date', {
        from_date: new Date(from_date),
        to_date: new Date(to_date),
      });
    } else if (from_date) {
      queryBuilder.andWhere('audit_log.created_at >= :from_date', {
        from_date: new Date(from_date),
      });
    } else if (to_date) {
      queryBuilder.andWhere('audit_log.created_at <= :to_date', {
        to_date: new Date(to_date),
      });
    }

    // Order by most recent first
    queryBuilder.orderBy('audit_log.created_at', 'DESC');

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    queryBuilder.skip(offset).take(limit);

    const data = await queryBuilder.getMany();

    return {
      data,
      total,
      limit,
      offset,
    };
  }

  /**
   * Find audit log by ID
   */
  async findOne(id: string): Promise<AuditLog> {
    const auditLog = await this.auditLogRepository.findOne({
      where: { id },
      relations: ['user', 'target_user'],
    });

    if (!auditLog) {
      throw new NotFoundException(`Audit log with ID ${id} not found`);
    }

    return auditLog;
  }

  /**
   * Find audit logs by user ID
   */
  async findByUser(userId: string, limit = 100): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: limit,
      relations: ['target_user'],
    });
  }

  /**
   * Find audit logs by event type
   */
  async findByEventType(eventType: AuditEventType, limit = 100): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { event_type: eventType },
      order: { created_at: 'DESC' },
      take: limit,
      relations: ['user', 'target_user'],
    });
  }

  /**
   * Find audit logs by IP address
   */
  async findByIpAddress(ipAddress: string, limit = 100): Promise<AuditLog[]> {
    return this.auditLogRepository.find({
      where: { ip_address: ipAddress },
      order: { created_at: 'DESC' },
      take: limit,
      relations: ['user'],
    });
  }

  // ========================================
  // Helper Methods for Common Audit Events
  // ========================================

  /**
   * Log successful login
   */
  async logLoginSuccess(userId: string, context: AuditContext): Promise<AuditLog> {
    return this.create({
      event_type: AuditEventType.LOGIN_SUCCESS,
      severity: AuditSeverity.INFO,
      user_id: userId,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      description: 'User logged in successfully',
      success: true,
    });
  }

  /**
   * Log failed login attempt
   */
  async logLoginFailed(
    email: string,
    context: AuditContext,
    reason: string,
  ): Promise<AuditLog> {
    return this.create({
      event_type: AuditEventType.LOGIN_FAILED,
      severity: AuditSeverity.WARNING,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      description: `Failed login attempt for email: ${email}`,
      metadata: { email, reason },
      success: false,
      error_message: reason,
    });
  }

  /**
   * Log logout
   */
  async logLogout(userId: string, context: AuditContext): Promise<AuditLog> {
    return this.create({
      event_type: AuditEventType.LOGOUT,
      severity: AuditSeverity.INFO,
      user_id: userId,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      description: 'User logged out',
      success: true,
    });
  }

  /**
   * Log token refresh
   */
  async logTokenRefresh(userId: string, context: AuditContext): Promise<AuditLog> {
    return this.create({
      event_type: AuditEventType.TOKEN_REFRESH,
      severity: AuditSeverity.INFO,
      user_id: userId,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      description: 'Access token refreshed',
      success: true,
    });
  }

  /**
   * Log password change
   */
  async logPasswordChanged(userId: string, context: AuditContext): Promise<AuditLog> {
    return this.create({
      event_type: AuditEventType.PASSWORD_CHANGED,
      severity: AuditSeverity.INFO,
      user_id: userId,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      description: 'User changed their password',
      success: true,
    });
  }

  /**
   * Log password reset request
   */
  async logPasswordResetRequested(
    email: string,
    context: AuditContext,
  ): Promise<AuditLog> {
    return this.create({
      event_type: AuditEventType.PASSWORD_RESET_REQUESTED,
      severity: AuditSeverity.INFO,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      description: `Password reset requested for: ${email}`,
      metadata: { email },
      success: true,
    });
  }

  /**
   * Log password reset completed
   */
  async logPasswordResetCompleted(
    userId: string,
    context: AuditContext,
  ): Promise<AuditLog> {
    return this.create({
      event_type: AuditEventType.PASSWORD_RESET_COMPLETED,
      severity: AuditSeverity.INFO,
      user_id: userId,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      description: 'Password reset completed',
      success: true,
    });
  }

  /**
   * Log 2FA enabled
   */
  async logTwoFaEnabled(userId: string, context: AuditContext): Promise<AuditLog> {
    return this.create({
      event_type: AuditEventType.TWO_FA_ENABLED,
      severity: AuditSeverity.INFO,
      user_id: userId,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      description: 'Two-factor authentication enabled',
      success: true,
    });
  }

  /**
   * Log 2FA disabled
   */
  async logTwoFaDisabled(userId: string, context: AuditContext): Promise<AuditLog> {
    return this.create({
      event_type: AuditEventType.TWO_FA_DISABLED,
      severity: AuditSeverity.WARNING,
      user_id: userId,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      description: 'Two-factor authentication disabled',
      success: true,
    });
  }

  /**
   * Log 2FA verification success
   */
  async logTwoFaVerified(userId: string, context: AuditContext): Promise<AuditLog> {
    return this.create({
      event_type: AuditEventType.TWO_FA_VERIFIED,
      severity: AuditSeverity.INFO,
      user_id: userId,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      description: 'Two-factor authentication verified',
      success: true,
    });
  }

  /**
   * Log 2FA verification failed
   */
  async logTwoFaFailed(userId: string, context: AuditContext): Promise<AuditLog> {
    return this.create({
      event_type: AuditEventType.TWO_FA_FAILED,
      severity: AuditSeverity.WARNING,
      user_id: userId,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      description: 'Two-factor authentication verification failed',
      success: false,
    });
  }

  /**
   * Log account created
   */
  async logAccountCreated(
    userId: string,
    targetUserId: string,
    context: AuditContext,
  ): Promise<AuditLog> {
    return this.create({
      event_type: AuditEventType.ACCOUNT_CREATED,
      severity: AuditSeverity.INFO,
      user_id: userId,
      target_user_id: targetUserId,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      description: 'New user account created',
      success: true,
    });
  }

  /**
   * Log account updated
   */
  async logAccountUpdated(
    userId: string,
    targetUserId: string,
    changes: Record<string, any>,
    context: AuditContext,
  ): Promise<AuditLog> {
    return this.create({
      event_type: AuditEventType.ACCOUNT_UPDATED,
      severity: AuditSeverity.INFO,
      user_id: userId,
      target_user_id: targetUserId,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      description: 'User account updated',
      metadata: { changes },
      success: true,
    });
  }

  /**
   * Log account blocked
   */
  async logAccountBlocked(
    userId: string,
    targetUserId: string,
    reason: string,
    context: AuditContext,
  ): Promise<AuditLog> {
    return this.create({
      event_type: AuditEventType.ACCOUNT_BLOCKED,
      severity: AuditSeverity.WARNING,
      user_id: userId,
      target_user_id: targetUserId,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      description: `User account blocked: ${reason}`,
      metadata: { reason },
      success: true,
    });
  }

  /**
   * Log account unblocked
   */
  async logAccountUnblocked(
    userId: string,
    targetUserId: string,
    context: AuditContext,
  ): Promise<AuditLog> {
    return this.create({
      event_type: AuditEventType.ACCOUNT_UNBLOCKED,
      severity: AuditSeverity.INFO,
      user_id: userId,
      target_user_id: targetUserId,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      description: 'User account unblocked',
      success: true,
    });
  }

  /**
   * Log role assigned
   */
  async logRoleAssigned(
    userId: string,
    targetUserId: string,
    role: string,
    context: AuditContext,
  ): Promise<AuditLog> {
    return this.create({
      event_type: AuditEventType.ROLE_ASSIGNED,
      severity: AuditSeverity.INFO,
      user_id: userId,
      target_user_id: targetUserId,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      description: `Role "${role}" assigned to user`,
      metadata: { role },
      success: true,
    });
  }

  /**
   * Log role removed
   */
  async logRoleRemoved(
    userId: string,
    targetUserId: string,
    role: string,
    context: AuditContext,
  ): Promise<AuditLog> {
    return this.create({
      event_type: AuditEventType.ROLE_REMOVED,
      severity: AuditSeverity.WARNING,
      user_id: userId,
      target_user_id: targetUserId,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      description: `Role "${role}" removed from user`,
      metadata: { role },
      success: true,
    });
  }

  /**
   * Log access request created
   */
  async logAccessRequestCreated(
    userId: string,
    context: AuditContext,
    requestDetails: Record<string, any>,
  ): Promise<AuditLog> {
    return this.create({
      event_type: AuditEventType.ACCESS_REQUEST_CREATED,
      severity: AuditSeverity.INFO,
      user_id: userId,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      description: 'Access request created',
      metadata: requestDetails,
      success: true,
    });
  }

  /**
   * Log access request approved
   */
  async logAccessRequestApproved(
    userId: string,
    targetUserId: string,
    context: AuditContext,
  ): Promise<AuditLog> {
    return this.create({
      event_type: AuditEventType.ACCESS_REQUEST_APPROVED,
      severity: AuditSeverity.INFO,
      user_id: userId,
      target_user_id: targetUserId,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      description: 'Access request approved',
      success: true,
    });
  }

  /**
   * Log access request rejected
   */
  async logAccessRequestRejected(
    userId: string,
    targetUserId: string,
    reason: string,
    context: AuditContext,
  ): Promise<AuditLog> {
    return this.create({
      event_type: AuditEventType.ACCESS_REQUEST_REJECTED,
      severity: AuditSeverity.INFO,
      user_id: userId,
      target_user_id: targetUserId,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      description: `Access request rejected: ${reason}`,
      metadata: { reason },
      success: true,
    });
  }

  /**
   * Log brute force attack detected
   */
  async logBruteForceDetected(
    ipAddress: string,
    email: string,
    attemptCount: number,
  ): Promise<AuditLog> {
    return this.create({
      event_type: AuditEventType.BRUTE_FORCE_DETECTED,
      severity: AuditSeverity.CRITICAL,
      ip_address: ipAddress,
      description: `Brute force attack detected: ${attemptCount} failed attempts for ${email}`,
      metadata: { email, attemptCount },
      success: false,
    });
  }

  /**
   * Log IP blocked
   */
  async logIpBlocked(
    ipAddress: string,
    reason: string,
    duration?: number,
  ): Promise<AuditLog> {
    return this.create({
      event_type: AuditEventType.IP_BLOCKED,
      severity: AuditSeverity.CRITICAL,
      ip_address: ipAddress,
      description: `IP address blocked: ${reason}`,
      metadata: { reason, duration },
      success: true,
    });
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(
    userId: string | null,
    context: AuditContext,
    activity: string,
    details: Record<string, any>,
  ): Promise<AuditLog> {
    return this.create({
      event_type: AuditEventType.SUSPICIOUS_ACTIVITY,
      severity: AuditSeverity.WARNING,
      user_id: userId || undefined,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      description: `Suspicious activity detected: ${activity}`,
      metadata: details,
      success: false,
    });
  }

  /**
   * Log session created
   */
  async logSessionCreated(
    userId: string,
    sessionId: string,
    context: AuditContext,
  ): Promise<AuditLog> {
    return this.create({
      event_type: AuditEventType.SESSION_CREATED,
      severity: AuditSeverity.INFO,
      user_id: userId,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      description: 'New session created',
      metadata: { sessionId },
      success: true,
    });
  }

  /**
   * Log session terminated
   */
  async logSessionTerminated(
    userId: string,
    sessionId: string,
    reason: string,
    context: AuditContext,
  ): Promise<AuditLog> {
    return this.create({
      event_type: AuditEventType.SESSION_TERMINATED,
      severity: AuditSeverity.INFO,
      user_id: userId,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      description: `Session terminated: ${reason}`,
      metadata: { sessionId, reason },
      success: true,
    });
  }

  // ========================================
  // Statistics and Reporting
  // ========================================

  /**
   * Get audit statistics for dashboard
   */
  async getStatistics(fromDate?: Date, toDate?: Date): Promise<AuditStatistics> {
    const dateFilter: any = {};
    if (fromDate && toDate) {
      dateFilter.created_at = Between(fromDate, toDate);
    } else if (fromDate) {
      dateFilter.created_at = MoreThanOrEqual(fromDate);
    } else if (toDate) {
      dateFilter.created_at = LessThanOrEqual(toDate);
    }

    // Total events
    const totalEvents = await this.auditLogRepository.count({ where: dateFilter });

    // Events by type
    const eventsByTypeRaw = await this.auditLogRepository
      .createQueryBuilder('audit_log')
      .select('audit_log.event_type', 'event_type')
      .addSelect('COUNT(*)', 'count')
      .where(fromDate && toDate ? 'audit_log.created_at BETWEEN :fromDate AND :toDate' : '1=1', {
        fromDate,
        toDate,
      })
      .groupBy('audit_log.event_type')
      .getRawMany();

    const eventsByType: Record<string, number> = {};
    eventsByTypeRaw.forEach((row) => {
      eventsByType[row.event_type] = parseInt(row.count, 10);
    });

    // Events by severity
    const eventsBySeverityRaw = await this.auditLogRepository
      .createQueryBuilder('audit_log')
      .select('audit_log.severity', 'severity')
      .addSelect('COUNT(*)', 'count')
      .where(fromDate && toDate ? 'audit_log.created_at BETWEEN :fromDate AND :toDate' : '1=1', {
        fromDate,
        toDate,
      })
      .groupBy('audit_log.severity')
      .getRawMany();

    const eventsBySeverity: Record<string, number> = {};
    eventsBySeverityRaw.forEach((row) => {
      eventsBySeverity[row.severity] = parseInt(row.count, 10);
    });

    // Failed and successful logins
    const failedLogins = await this.auditLogRepository.count({
      where: {
        event_type: AuditEventType.LOGIN_FAILED,
        ...dateFilter,
      },
    });

    const successfulLogins = await this.auditLogRepository.count({
      where: {
        event_type: AuditEventType.LOGIN_SUCCESS,
        ...dateFilter,
      },
    });

    // Security alerts (critical and warning events)
    const securityAlerts = await this.auditLogRepository.count({
      where: [
        { severity: AuditSeverity.CRITICAL, ...dateFilter },
        { severity: AuditSeverity.WARNING, ...dateFilter },
      ],
    });

    // Recent events
    const recentEvents = await this.auditLogRepository.find({
      where: dateFilter,
      order: { created_at: 'DESC' },
      take: 10,
      relations: ['user', 'target_user'],
    });

    return {
      totalEvents,
      eventsByType,
      eventsBySeverity,
      failedLogins,
      successfulLogins,
      securityAlerts,
      recentEvents,
    };
  }

  /**
   * Get failed login attempts for an IP address in a time window
   */
  async getFailedLoginAttempts(
    ipAddress: string,
    windowMinutes: number,
  ): Promise<number> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    return this.auditLogRepository.count({
      where: {
        event_type: AuditEventType.LOGIN_FAILED,
        ip_address: ipAddress,
        created_at: MoreThanOrEqual(windowStart),
      },
    });
  }

  /**
   * Get user activity summary
   */
  async getUserActivitySummary(
    userId: string,
    days: number = 30,
  ): Promise<{
    totalEvents: number;
    lastLogin: Date | null;
    loginCount: number;
    failedLogins: number;
    passwordChanges: number;
    recentEvents: AuditLog[];
  }> {
    const fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const totalEvents = await this.auditLogRepository.count({
      where: {
        user_id: userId,
        created_at: MoreThanOrEqual(fromDate),
      },
    });

    const lastLoginEvent = await this.auditLogRepository.findOne({
      where: {
        user_id: userId,
        event_type: AuditEventType.LOGIN_SUCCESS,
      },
      order: { created_at: 'DESC' },
    });

    const loginCount = await this.auditLogRepository.count({
      where: {
        user_id: userId,
        event_type: AuditEventType.LOGIN_SUCCESS,
        created_at: MoreThanOrEqual(fromDate),
      },
    });

    const failedLogins = await this.auditLogRepository.count({
      where: {
        user_id: userId,
        event_type: AuditEventType.LOGIN_FAILED,
        created_at: MoreThanOrEqual(fromDate),
      },
    });

    const passwordChanges = await this.auditLogRepository.count({
      where: {
        user_id: userId,
        event_type: AuditEventType.PASSWORD_CHANGED,
        created_at: MoreThanOrEqual(fromDate),
      },
    });

    const recentEvents = await this.auditLogRepository.find({
      where: {
        user_id: userId,
        created_at: MoreThanOrEqual(fromDate),
      },
      order: { created_at: 'DESC' },
      take: 20,
    });

    return {
      totalEvents,
      lastLogin: lastLoginEvent?.created_at || null,
      loginCount,
      failedLogins,
      passwordChanges,
      recentEvents,
    };
  }

  /**
   * Clean up old audit logs (for data retention policy)
   */
  async cleanupOldLogs(retentionDays: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const result = await this.auditLogRepository
      .createQueryBuilder()
      .delete()
      .from(AuditLog)
      .where('created_at < :cutoffDate', { cutoffDate })
      .execute();

    const deletedCount = result.affected || 0;
    this.logger.log(`Cleaned up ${deletedCount} audit logs older than ${retentionDays} days`);

    return deletedCount;
  }
}
