import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Integration } from './integration.entity';

export enum SyncJobStatus {
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum SyncDirection {
  INBOUND = 'inbound', // From external to VendHub
  OUTBOUND = 'outbound', // From VendHub to external
  BIDIRECTIONAL = 'bidirectional',
}

@Entity('sync_jobs')
export class SyncJob extends BaseEntity {
  @Column({ type: 'uuid' })
  integration_id: string;

  @ManyToOne(() => Integration)
  @JoinColumn({ name: 'integration_id' })
  integration: Integration;

  @Column({ type: 'varchar', length: 100 })
  job_name: string;

  @Column({ type: 'enum', enum: SyncDirection })
  direction: SyncDirection;

  @Column({ type: 'varchar', length: 100 })
  entity_type: string; // products, orders, customers, etc.

  @Column({ type: 'enum', enum: SyncJobStatus, default: SyncJobStatus.SCHEDULED })
  status: SyncJobStatus;

  @Column({ type: 'timestamp' })
  scheduled_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  started_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date | null;

  @Column({ type: 'integer', nullable: true })
  duration_ms: number | null;

  @Column({ type: 'integer', default: 0 })
  total_records: number;

  @Column({ type: 'integer', default: 0 })
  processed_records: number;

  @Column({ type: 'integer', default: 0 })
  successful_records: number;

  @Column({ type: 'integer', default: 0 })
  failed_records: number;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @Column({ type: 'jsonb', default: {} })
  config: {
    filters?: Record<string, any>;
    mapping?: Record<string, any>;
    batch_size?: number;
    [key: string]: any;
  };

  @Column({ type: 'jsonb', default: {} })
  results: {
    errors?: Array<{
      record_id?: string;
      error?: string;
    }>;
    warnings?: string[];
    summary?: Record<string, any>;
    [key: string]: any;
  };

  @Column({ type: 'uuid', nullable: true })
  triggered_by_id: string | null;
}
