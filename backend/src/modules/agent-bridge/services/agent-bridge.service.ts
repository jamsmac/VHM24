/**
 * Agent Bridge Service
 *
 * Manages communication between agent-deck sessions and VHM24 dashboard.
 * Provides real-time status tracking and progress monitoring.
 *
 * @module AgentBridgeModule
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull } from 'typeorm';
import { AgentSession, AgentSessionStatus, AgentType } from '../entities/agent-session.entity';
import { AgentProgress, ProgressStatus, ProgressCategory } from '../entities/agent-progress.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface RegisterSessionDto {
  session_id: string;
  name: string;
  agent_type?: AgentType;
  working_directory?: string;
  profile?: string;
  attached_mcps?: string[];
}

interface ReportProgressDto {
  session_id?: string;
  task_id?: string;
  status: string;
  message: string;
  category?: string;
  files_changed?: string[];
  lines_added?: number;
  lines_removed?: number;
  duration_ms?: number;
  proposal_id?: string;
  metadata?: Record<string, unknown>;
}

interface UpdateSessionDto {
  status?: AgentSessionStatus;
  current_task?: string;
  attached_mcps?: string[];
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AgentBridgeService {
  private readonly logger = new Logger(AgentBridgeService.name);

  constructor(
    @InjectRepository(AgentSession)
    private readonly sessionRepository: Repository<AgentSession>,
    @InjectRepository(AgentProgress)
    private readonly progressRepository: Repository<AgentProgress>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * Register or update an agent session
   */
  async registerSession(dto: RegisterSessionDto): Promise<AgentSession> {
    let session = await this.sessionRepository.findOne({
      where: { session_id: dto.session_id },
    });

    if (session) {
      // Update existing session
      session.name = dto.name || session.name;
      session.status = AgentSessionStatus.RUNNING;
      session.last_activity_at = new Date();
      if (dto.working_directory) session.working_directory = dto.working_directory;
      if (dto.profile) session.profile = dto.profile;
      if (dto.attached_mcps) session.attached_mcps = dto.attached_mcps;
    } else {
      // Create new session
      session = this.sessionRepository.create({
        session_id: dto.session_id,
        name: dto.name,
        agent_type: dto.agent_type || AgentType.CLAUDE_CODE,
        status: AgentSessionStatus.RUNNING,
        working_directory: dto.working_directory,
        profile: dto.profile,
        attached_mcps: dto.attached_mcps || [],
        last_activity_at: new Date(),
      });
    }

    const saved = await this.sessionRepository.save(session);

    // Emit event for WebSocket
    this.eventEmitter.emit('agent.session.updated', saved);

    this.logger.log(`Session registered: ${saved.session_id}`);
    return saved;
  }

  /**
   * Update session status
   */
  async updateSession(sessionId: string, dto: UpdateSessionDto): Promise<AgentSession> {
    const session = await this.getSession(sessionId);

    if (dto.status) session.status = dto.status;
    if (dto.current_task !== undefined) session.current_task = dto.current_task;
    if (dto.attached_mcps) session.attached_mcps = dto.attached_mcps;
    if (dto.metadata) session.metadata = { ...session.metadata, ...dto.metadata };
    session.last_activity_at = new Date();

    const saved = await this.sessionRepository.save(session);
    this.eventEmitter.emit('agent.session.updated', saved);

    return saved;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<AgentSession> {
    const session = await this.sessionRepository.findOne({
      where: { session_id: sessionId },
      relations: ['progress_updates'],
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    return session;
  }

  /**
   * Get all active sessions
   */
  async getActiveSessions(): Promise<AgentSession[]> {
    // Sessions with activity in last 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    return this.sessionRepository.find({
      where: [
        { status: AgentSessionStatus.RUNNING },
        { status: AgentSessionStatus.WAITING },
        { last_activity_at: MoreThan(thirtyMinutesAgo) },
      ],
      order: { last_activity_at: 'DESC' },
    });
  }

  /**
   * Get all sessions with pagination
   */
  async getAllSessions(
    page: number = 1,
    limit: number = 20,
    status?: AgentSessionStatus,
  ): Promise<{ sessions: AgentSession[]; total: number }> {
    const where: Record<string, unknown> = { deleted_at: IsNull() };
    if (status) where.status = status;

    const [sessions, total] = await this.sessionRepository.findAndCount({
      where,
      order: { last_activity_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { sessions, total };
  }

  /**
   * Mark session as completed
   */
  async completeSession(sessionId: string): Promise<AgentSession> {
    const session = await this.getSession(sessionId);
    session.status = AgentSessionStatus.COMPLETED;
    session.last_activity_at = new Date();

    const saved = await this.sessionRepository.save(session);
    this.eventEmitter.emit('agent.session.completed', saved);

    return saved;
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    await this.sessionRepository.softRemove(session);
  }

  // ============================================================================
  // Progress Tracking
  // ============================================================================

  /**
   * Report progress from an agent
   */
  async reportProgress(dto: ReportProgressDto): Promise<AgentProgress> {
    // Find or create session
    let session: AgentSession | null = null;

    if (dto.session_id) {
      session = await this.sessionRepository.findOne({
        where: { session_id: dto.session_id },
      });
    }

    if (!session) {
      // Create a default session for unknown agents
      session = await this.registerSession({
        session_id: dto.session_id || `unknown-${Date.now()}`,
        name: 'Unknown Agent',
        agent_type: AgentType.CUSTOM,
      });
    }

    // Update session status based on progress
    const statusMap: Record<string, AgentSessionStatus> = {
      started: AgentSessionStatus.RUNNING,
      in_progress: AgentSessionStatus.RUNNING,
      completed: AgentSessionStatus.IDLE,
      failed: AgentSessionStatus.ERROR,
      blocked: AgentSessionStatus.WAITING,
    };

    if (statusMap[dto.status]) {
      session.status = statusMap[dto.status];
    }

    session.messages_count += 1;
    session.last_activity_at = new Date();

    if (dto.files_changed?.length) {
      session.files_changed_count += dto.files_changed.length;
    }

    if (dto.proposal_id) {
      session.proposals_count += 1;
    }

    await this.sessionRepository.save(session);

    // Create progress entry
    const progress = this.progressRepository.create({
      session_id: session.id,
      task_id: dto.task_id,
      status: dto.status as ProgressStatus || ProgressStatus.IN_PROGRESS,
      category: dto.category as ProgressCategory || ProgressCategory.OTHER,
      message: dto.message,
      files_changed: dto.files_changed || [],
      lines_added: dto.lines_added,
      lines_removed: dto.lines_removed,
      duration_ms: dto.duration_ms,
      proposal_id: dto.proposal_id,
      metadata: dto.metadata,
    });

    const saved = await this.progressRepository.save(progress);

    // Emit event for real-time updates
    this.eventEmitter.emit('agent.progress', {
      session,
      progress: saved,
    });

    return saved;
  }

  /**
   * Get progress history for a session
   */
  async getSessionProgress(
    sessionId: string,
    limit: number = 50,
  ): Promise<AgentProgress[]> {
    const session = await this.getSession(sessionId);

    return this.progressRepository.find({
      where: { session_id: session.id },
      order: { created_at: 'DESC' },
      take: limit,
    });
  }

  /**
   * Get recent progress across all sessions
   */
  async getRecentProgress(limit: number = 100): Promise<AgentProgress[]> {
    return this.progressRepository.find({
      order: { created_at: 'DESC' },
      take: limit,
      relations: ['session'],
    });
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  /**
   * Get agent activity statistics
   */
  async getStatistics(): Promise<{
    active_sessions: number;
    total_sessions: number;
    total_progress_entries: number;
    files_changed_today: number;
    proposals_today: number;
    by_status: Record<AgentSessionStatus, number>;
    by_type: Record<AgentType, number>;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      activeSessions,
      totalSessions,
      totalProgress,
      todayProgress,
    ] = await Promise.all([
      this.sessionRepository.count({
        where: [
          { status: AgentSessionStatus.RUNNING },
          { status: AgentSessionStatus.WAITING },
        ],
      }),
      this.sessionRepository.count(),
      this.progressRepository.count(),
      this.progressRepository.find({
        where: { created_at: MoreThan(today) },
      }),
    ]);

    // Count by status
    const byStatus = {} as Record<AgentSessionStatus, number>;
    for (const status of Object.values(AgentSessionStatus)) {
      byStatus[status] = await this.sessionRepository.count({ where: { status } });
    }

    // Count by type
    const byType = {} as Record<AgentType, number>;
    for (const type of Object.values(AgentType)) {
      byType[type] = await this.sessionRepository.count({ where: { agent_type: type } });
    }

    // Calculate today's metrics
    let filesChangedToday = 0;
    let proposalsToday = 0;

    for (const progress of todayProgress) {
      filesChangedToday += progress.files_changed?.length || 0;
      if (progress.proposal_id) proposalsToday++;
    }

    return {
      active_sessions: activeSessions,
      total_sessions: totalSessions,
      total_progress_entries: totalProgress,
      files_changed_today: filesChangedToday,
      proposals_today: proposalsToday,
      by_status: byStatus,
      by_type: byType,
    };
  }

  // ============================================================================
  // Heartbeat
  // ============================================================================

  /**
   * Handle session heartbeat
   */
  async heartbeat(sessionId: string): Promise<void> {
    await this.sessionRepository.update(
      { session_id: sessionId },
      { last_activity_at: new Date() },
    );
  }

  /**
   * Mark inactive sessions as idle (called by scheduler)
   */
  async markInactiveSessions(): Promise<number> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const result = await this.sessionRepository.update(
      {
        status: AgentSessionStatus.RUNNING,
        last_activity_at: MoreThan(fiveMinutesAgo),
      },
      { status: AgentSessionStatus.IDLE },
    );

    return result.affected || 0;
  }
}
