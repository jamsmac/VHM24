/**
 * Integration Proposal Entity
 *
 * Stores AI-generated integration proposals awaiting approval
 *
 * @module AiAssistantModule
 */

import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

export enum IntegrationProposalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  IMPLEMENTED = 'implemented',
  FAILED = 'failed',
}

export enum IntegrationProposalType {
  API_INTEGRATION = 'api_integration',
  DOCUMENTATION = 'documentation',
  MODULE_GENERATION = 'module_generation',
  CODE_FIX = 'code_fix',
  FEATURE = 'feature',
}

export interface ProposedFile {
  path: string;
  content: string;
  action: 'create' | 'modify' | 'delete';
  description: string;
}

export interface ApiEndpointInfo {
  method: string;
  path: string;
  description: string;
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
  requestBody?: {
    type: string;
    properties: Record<string, unknown>;
  };
  response?: {
    type: string;
    properties: Record<string, unknown>;
  };
}

@Entity('integration_proposals')
@Index(['status'])
@Index(['type'])
@Index(['created_by_id'])
export class IntegrationProposal extends BaseEntity {
  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: IntegrationProposalType,
  })
  type: IntegrationProposalType;

  @Column({
    type: 'enum',
    enum: IntegrationProposalStatus,
    default: IntegrationProposalStatus.PENDING,
  })
  status: IntegrationProposalStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  source_url: string | null;

  @Column({ type: 'text', nullable: true })
  source_documentation: string | null;

  @Column({ type: 'jsonb', default: [] })
  discovered_endpoints: ApiEndpointInfo[];

  @Column({ type: 'jsonb', default: [] })
  proposed_files: ProposedFile[];

  @Column({ type: 'text', nullable: true })
  generated_documentation: string | null;

  @Column({ type: 'text', nullable: true })
  ai_reasoning: string | null;

  @Column({ type: 'float', nullable: true })
  confidence_score: number | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  @Column({ type: 'text', nullable: true })
  implementation_log: string | null;

  @Column({ type: 'uuid', nullable: true })
  created_by_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  created_by: User;

  @Column({ type: 'uuid', nullable: true })
  approved_by_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by_id' })
  approved_by: User;

  @Column({ type: 'timestamp', nullable: true })
  approved_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  implemented_at: Date | null;
}
