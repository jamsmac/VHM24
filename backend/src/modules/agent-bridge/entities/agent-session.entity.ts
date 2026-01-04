/**
 * Agent Session Entity
 *
 * Tracks AI agent sessions from agent-deck for monitoring in admin dashboard.
 *
 * @module AgentBridgeModule
 */

import { Entity, Column, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AgentProgress } from './agent-progress.entity';

export enum AgentSessionStatus {
  RUNNING = 'running',
  WAITING = 'waiting',
  IDLE = 'idle',
  ERROR = 'error',
  COMPLETED = 'completed',
}

export enum AgentType {
  CLAUDE_CODE = 'claude_code',
  GEMINI_CLI = 'gemini_cli',
  CURSOR = 'cursor',
  OPENCODE = 'opencode',
  CUSTOM = 'custom',
}

@Entity('agent_sessions')
@Index(['status'])
@Index(['agent_type'])
@Index(['session_id'], { unique: true })
export class AgentSession extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  session_id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({
    type: 'enum',
    enum: AgentType,
    default: AgentType.CLAUDE_CODE,
  })
  agent_type: AgentType;

  @Column({
    type: 'enum',
    enum: AgentSessionStatus,
    default: AgentSessionStatus.IDLE,
  })
  status: AgentSessionStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  current_task: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  working_directory: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  profile: string | null;

  @Column({ type: 'jsonb', default: [] })
  attached_mcps: string[];

  @Column({ type: 'timestamp', nullable: true })
  last_activity_at: Date | null;

  @Column({ type: 'int', default: 0 })
  messages_count: number;

  @Column({ type: 'int', default: 0 })
  proposals_count: number;

  @Column({ type: 'int', default: 0 })
  files_changed_count: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @OneToMany(() => AgentProgress, (progress) => progress.session)
  progress_updates: AgentProgress[];
}
