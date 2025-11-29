import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum WebhookStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  IGNORED = 'ignored',
}

@Entity('webhooks')
export class Webhook extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  integration_id: string | null;

  @Column({ type: 'varchar', length: 100 })
  event_type: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  source: string | null; // Provider name

  @Column({ type: 'varchar', length: 255, nullable: true })
  external_id: string | null; // ID from external system

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({ type: 'jsonb', default: {} })
  headers: Record<string, string>;

  @Column({ type: 'enum', enum: WebhookStatus, default: WebhookStatus.PENDING })
  status: WebhookStatus;

  @Column({ type: 'timestamp', nullable: true })
  processed_at: Date | null;

  @Column({ type: 'integer', default: 0 })
  retry_count: number;

  @Column({ type: 'integer', default: 3 })
  max_retries: number;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  signature: string | null;

  @Column({ type: 'boolean', default: true })
  signature_verified: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    ip_address?: string;
    user_agent?: string;
    processed_by?: string;
    [key: string]: any;
  };
}
