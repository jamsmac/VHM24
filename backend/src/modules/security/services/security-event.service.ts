import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Between, IsNull } from 'typeorm';
import { SecurityEvent, SecurityEventType, SecurityLevel } from '../entities/security-event.entity';

@Injectable()
export class SecurityEventService {
  constructor(
    @InjectRepository(SecurityEvent)
    private securityEventRepository: Repository<SecurityEvent>,
  ) {}

  async logEvent(data: {
    user_id?: string;
    user_email?: string;
    event_type: SecurityEventType;
    security_level?: SecurityLevel;
    ip_address?: string;
    user_agent?: string;
    location?: string;
    session_id?: string;
    is_blocked?: boolean;
    description?: string;
    reason?: string;
    details?: Record<string, any>;
    requires_investigation?: boolean;
  }): Promise<SecurityEvent> {
    const event = this.securityEventRepository.create({
      ...data,
      security_level: data.security_level || this.calculateSecurityLevel(data.event_type),
    });

    return this.securityEventRepository.save(event);
  }

  private calculateSecurityLevel(eventType: SecurityEventType): SecurityLevel {
    const criticalEvents = [
      SecurityEventType.ACCOUNT_LOCKED,
      SecurityEventType.SUSPICIOUS_ACTIVITY,
      SecurityEventType.BULK_OPERATION,
    ];

    const highEvents = [
      SecurityEventType.PASSWORD_CHANGED,
      SecurityEventType.TWO_FACTOR_DISABLED,
      SecurityEventType.PERMISSION_DENIED,
    ];

    const mediumEvents = [
      SecurityEventType.LOGIN_FAILED,
      SecurityEventType.TWO_FACTOR_FAILED,
      SecurityEventType.PASSWORD_RESET_REQUESTED,
    ];

    if (criticalEvents.includes(eventType)) return SecurityLevel.CRITICAL;
    if (highEvents.includes(eventType)) return SecurityLevel.HIGH;
    if (mediumEvents.includes(eventType)) return SecurityLevel.MEDIUM;
    return SecurityLevel.LOW;
  }

  async getFailedLoginAttempts(userId: string, sinceMinutes: number = 30): Promise<number> {
    const since = new Date();
    since.setMinutes(since.getMinutes() - sinceMinutes);

    const count = await this.securityEventRepository.count({
      where: {
        user_id: userId,
        event_type: SecurityEventType.LOGIN_FAILED,
        created_at: MoreThan(since),
      },
    });

    return count;
  }

  async getRecentEvents(userId: string, limit: number = 50): Promise<SecurityEvent[]> {
    return this.securityEventRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  async getCriticalEvents(days: number = 7): Promise<SecurityEvent[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.securityEventRepository.find({
      where: {
        security_level: SecurityLevel.CRITICAL,
        created_at: Between(startDate, new Date()),
      },
      order: { created_at: 'DESC' },
    });
  }

  async getEventsRequiringInvestigation(): Promise<SecurityEvent[]> {
    return this.securityEventRepository.find({
      where: {
        requires_investigation: true,
        investigated_at: IsNull(),
      },
      order: { created_at: 'ASC' },
    });
  }

  async markInvestigated(
    eventId: string,
    investigatedById: string,
    notes: string,
  ): Promise<SecurityEvent> {
    const event = await this.securityEventRepository.findOne({
      where: { id: eventId },
    });

    if (!event) {
      throw new Error(`Security event with ID ${eventId} not found`);
    }

    event.investigated_at = new Date();
    event.investigated_by_id = investigatedById;
    event.investigation_notes = notes;

    return this.securityEventRepository.save(event);
  }

  async getSecurityReport(days: number = 30): Promise<{
    total_events: number;
    by_level: Record<SecurityLevel, number>;
    by_type: Record<SecurityEventType, number>;
    failed_logins: number;
    suspicious_activities: number;
    blocked_attempts: number;
    pending_investigations: number;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const events = await this.securityEventRepository.find({
      where: {
        created_at: Between(startDate, new Date()),
      },
    });

    const report = {
      total_events: events.length,
      by_level: {} as Record<SecurityLevel, number>,
      by_type: {} as Record<SecurityEventType, number>,
      failed_logins: 0,
      suspicious_activities: 0,
      blocked_attempts: 0,
      pending_investigations: 0,
    };

    events.forEach((event) => {
      // Count by level
      report.by_level[event.security_level] = (report.by_level[event.security_level] || 0) + 1;

      // Count by type
      report.by_type[event.event_type] = (report.by_type[event.event_type] || 0) + 1;

      // Specific counts
      if (event.event_type === SecurityEventType.LOGIN_FAILED) {
        report.failed_logins++;
      }
      if (event.event_type === SecurityEventType.SUSPICIOUS_ACTIVITY) {
        report.suspicious_activities++;
      }
      if (event.is_blocked) {
        report.blocked_attempts++;
      }
      if (event.requires_investigation && !event.investigated_at) {
        report.pending_investigations++;
      }
    });

    return report;
  }
}
