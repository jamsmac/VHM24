/**
 * Agent Progress Entity
 *
 * Logs progress updates from AI agents for monitoring and auditing.
 *
 * @module AgentBridgeModule
 */

import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AgentSession } from './agent-session.entity';

export enum ProgressStatus {
  STARTED = 'started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  BLOCKED = 'blocked',
}

export enum ProgressCategory {
  ANALYSIS = 'analysis',
  CODE_GENERATION = 'code_generation',
  TESTING = 'testing',
  FIX = 'fix',
  DOCUMENTATION = 'documentation',
  REFACTORING = 'refactoring',
  OTHER = 'other',
}

@Entity('agent_progress')
@Index(['session_id'])
@Index(['status'])
@Index(['category'])
@Index(['created_at'])
export class AgentProgress extends BaseEntity {
  @Column({ type: 'uuid' })
  session_id: string;

  @ManyToOne(() => AgentSession, (session) => session.progress_updates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: AgentSession;

  @Column({ type: 'varchar', length: 100, nullable: true })
  task_id: string | null;

  @Column({
    type: 'enum',
    enum: ProgressStatus,
    default: ProgressStatus.IN_PROGRESS,
  })
  status: ProgressStatus;

  @Column({
    type: 'enum',
    enum: ProgressCategory,
    default: ProgressCategory.OTHER,
  })
  category: ProgressCategory;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', default: [] })
  files_changed: string[];

  @Column({ type: 'int', nullable: true })
  lines_added: number | null;

  @Column({ type: 'int', nullable: true })
  lines_removed: number | null;

  @Column({ type: 'int', nullable: true })
  duration_ms: number | null;

  @Column({ type: 'uuid', nullable: true })
  proposal_id: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;
}
