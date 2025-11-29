import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionLog, SessionStatus } from '../entities/session-log.entity';

@Injectable()
export class SessionLogService {
  constructor(
    @InjectRepository(SessionLog)
    private sessionLogRepository: Repository<SessionLog>,
  ) {}

  async createSession(data: {
    user_id: string;
    session_id: string;
    ip_address: string;
    user_agent?: string;
    device_type?: string;
    browser?: string;
    os?: string;
    location?: string;
    expires_at?: Date;
    metadata?: Record<string, any>;
  }): Promise<SessionLog> {
    const session = this.sessionLogRepository.create({
      ...data,
      logged_in_at: new Date(),
      last_activity_at: new Date(),
      status: SessionStatus.ACTIVE,
    });

    return this.sessionLogRepository.save(session);
  }

  async updateActivity(sessionId: string): Promise<void> {
    await this.sessionLogRepository.update(
      { session_id: sessionId, status: SessionStatus.ACTIVE },
      {
        last_activity_at: new Date(),
        actions_count: () => 'actions_count + 1',
      },
    );
  }

  async logoutSession(sessionId: string): Promise<SessionLog> {
    const session = await this.sessionLogRepository.findOne({
      where: { session_id: sessionId },
    });

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.status = SessionStatus.LOGGED_OUT;
    session.logged_out_at = new Date();

    return this.sessionLogRepository.save(session);
  }

  async revokeSession(sessionId: string, reason: string): Promise<SessionLog> {
    const session = await this.sessionLogRepository.findOne({
      where: { session_id: sessionId },
    });

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.status = SessionStatus.REVOKED;
    session.revoke_reason = reason;
    session.logged_out_at = new Date();

    return this.sessionLogRepository.save(session);
  }

  async revokeAllUserSessions(userId: string, reason: string): Promise<number> {
    const result = await this.sessionLogRepository.update(
      { user_id: userId, status: SessionStatus.ACTIVE },
      {
        status: SessionStatus.REVOKED,
        revoke_reason: reason,
        logged_out_at: new Date(),
      },
    );

    return result.affected || 0;
  }

  async getActiveSessions(userId: string): Promise<SessionLog[]> {
    return this.sessionLogRepository.find({
      where: { user_id: userId, status: SessionStatus.ACTIVE },
      order: { last_activity_at: 'DESC' },
    });
  }

  async getSessionHistory(userId: string, limit: number = 50): Promise<SessionLog[]> {
    return this.sessionLogRepository.find({
      where: { user_id: userId },
      order: { logged_in_at: 'DESC' },
      take: limit,
    });
  }

  async getSuspiciousSessions(): Promise<SessionLog[]> {
    return this.sessionLogRepository.find({
      where: { is_suspicious: true },
      order: { logged_in_at: 'DESC' },
      take: 100,
    });
  }

  async markSuspicious(sessionId: string): Promise<void> {
    await this.sessionLogRepository.update({ session_id: sessionId }, { is_suspicious: true });
  }

  async expireOldSessions(): Promise<number> {
    const now = new Date();

    const result = await this.sessionLogRepository
      .createQueryBuilder()
      .update()
      .set({
        status: SessionStatus.EXPIRED,
        logged_out_at: now,
      })
      .where('status = :status', { status: SessionStatus.ACTIVE })
      .andWhere('expires_at IS NOT NULL')
      .andWhere('expires_at < :now', { now })
      .execute();

    return result.affected || 0;
  }

  async cleanOldSessions(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.sessionLogRepository
      .createQueryBuilder()
      .delete()
      .where('logged_in_at < :cutoffDate', { cutoffDate })
      .andWhere('status != :active', { active: SessionStatus.ACTIVE })
      .execute();

    return result.affected || 0;
  }
}
