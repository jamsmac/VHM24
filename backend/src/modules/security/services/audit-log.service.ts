import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { AuditLog, AuditEventType, AuditSeverity } from '../entities/audit-log.entity';

interface AuditLogQueryDto {
  user_id?: string;
  event_type?: AuditEventType;
  severity?: AuditSeverity;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(data: {
    event_type: AuditEventType;
    user_id?: string;
    target_user_id?: string;
    ip_address?: string;
    user_agent?: string;
    description?: string;
    metadata?: Record<string, any>;
    success?: boolean;
    error_message?: string;
    severity?: AuditSeverity;
  }): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      event_type: data.event_type,
      user_id: data.user_id || null,
      target_user_id: data.target_user_id || null,
      ip_address: data.ip_address || null,
      user_agent: data.user_agent || null,
      description: data.description || null,
      metadata: data.metadata || {},
      success: data.success !== false,
      error_message: data.error_message || null,
      severity: data.severity || AuditSeverity.INFO,
    });

    return this.auditLogRepository.save(auditLog);
  }

  async findByUser(userId: string, startDate?: Date, endDate?: Date): Promise<AuditLog[]> {
    const query = this.auditLogRepository
      .createQueryBuilder('log')
      .where('log.user_id = :userId', { userId });

    if (startDate && endDate) {
      query.andWhere('log.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    return query.orderBy('log.created_at', 'DESC').take(1000).getMany();
  }

  async findByEventType(
    eventType: AuditEventType,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AuditLog[]> {
    const query = this.auditLogRepository
      .createQueryBuilder('log')
      .where('log.event_type = :eventType', { eventType });

    if (startDate && endDate) {
      query.andWhere('log.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    return query.orderBy('log.created_at', 'DESC').take(1000).getMany();
  }

  async getStatistics(days: number = 7): Promise<{
    total_actions: number;
    actions_by_type: Record<string, number>;
    failed_logins: number;
    successful_logins: number;
    top_users: Array<{ user_id: string; count: number }>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.auditLogRepository.find({
      where: {
        created_at: Between(startDate, new Date()),
      },
    });

    const actionsByType: Record<string, number> = {};
    const userCounts: Record<string, number> = {};
    let failedLogins = 0;
    let successfulLogins = 0;

    logs.forEach((log) => {
      // Count by event type
      actionsByType[log.event_type] = (actionsByType[log.event_type] || 0) + 1;

      // Count logins
      if (log.event_type === AuditEventType.LOGIN_FAILED) failedLogins++;
      if (log.event_type === AuditEventType.LOGIN_SUCCESS) successfulLogins++;

      // Count by user
      if (log.user_id) {
        userCounts[log.user_id] = (userCounts[log.user_id] || 0) + 1;
      }
    });

    const topUsers = Object.entries(userCounts)
      .map(([user_id, count]) => ({ user_id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total_actions: logs.length,
      actions_by_type: actionsByType,
      failed_logins: failedLogins,
      successful_logins: successfulLogins,
      top_users: topUsers,
    };
  }

  async cleanOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.auditLogRepository
      .createQueryBuilder()
      .delete()
      .where('created_at < :cutoffDate', { cutoffDate })
      .andWhere('severity != :critical', { critical: AuditSeverity.CRITICAL })
      .execute();

    return result.affected || 0;
  }

  async findAll(queryDto?: AuditLogQueryDto): Promise<AuditLog[]> {
    const query = this.auditLogRepository.createQueryBuilder('log');

    // Apply filters if provided
    if (queryDto?.user_id) {
      query.andWhere('log.user_id = :userId', { userId: queryDto.user_id });
    }
    if (queryDto?.event_type) {
      query.andWhere('log.event_type = :eventType', { eventType: queryDto.event_type });
    }
    if (queryDto?.severity) {
      query.andWhere('log.severity = :severity', { severity: queryDto.severity });
    }
    if (queryDto?.startDate && queryDto?.endDate) {
      query.andWhere('log.created_at BETWEEN :startDate AND :endDate', {
        startDate: queryDto.startDate,
        endDate: queryDto.endDate,
      });
    }

    return query
      .orderBy('log.created_at', 'DESC')
      .take(queryDto?.limit || 100)
      .getMany();
  }

  async findOne(id: string): Promise<AuditLog | null> {
    return this.auditLogRepository.findOne({ where: { id } });
  }

  /**
   * Find logs by entity type and ID
   */
  async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    return this.auditLogRepository
      .createQueryBuilder('log')
      .where("log.metadata->>'entity_type' = :entityType", { entityType })
      .andWhere("log.metadata->>'entity_id' = :entityId", { entityId })
      .orderBy('log.created_at', 'DESC')
      .take(100)
      .getMany();
  }

  /**
   * Find logs by action type
   */
  async findByAction(action: string, startDate?: Date, endDate?: Date): Promise<AuditLog[]> {
    const query = this.auditLogRepository
      .createQueryBuilder('log')
      .where("log.metadata->>'action' = :action", { action });

    if (startDate && endDate) {
      query.andWhere('log.created_at BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    return query.orderBy('log.created_at', 'DESC').take(1000).getMany();
  }

  /**
   * Get sensitive actions from recent logs
   */
  async getSensitiveActions(days: number = 7): Promise<AuditLog[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.auditLogRepository
      .createQueryBuilder('log')
      .where('log.severity = :severity', { severity: AuditSeverity.CRITICAL })
      .orWhere('log.severity = :warning', { warning: AuditSeverity.WARNING })
      .andWhere('log.created_at >= :startDate', { startDate })
      .orderBy('log.created_at', 'DESC')
      .take(500)
      .getMany();
  }
}
