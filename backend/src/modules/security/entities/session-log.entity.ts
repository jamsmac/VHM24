import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum SessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  LOGGED_OUT = 'logged_out',
}

@Entity('session_logs')
@Index(['user_id', 'status'])
@Index(['session_id'])
@Index(['created_at'])
export class SessionLog extends BaseEntity {
  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  session_id: string;

  @Column({ type: 'varchar', length: 100 })
  ip_address: string;

  @Column({ type: 'text', nullable: true })
  user_agent: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  device_type: string | null; // mobile, desktop, tablet

  @Column({ type: 'varchar', length: 100, nullable: true })
  browser: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  os: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string | null; // City, Country from IP

  @Column({ type: 'enum', enum: SessionStatus, default: SessionStatus.ACTIVE })
  status: SessionStatus;

  @Column({ type: 'timestamp' })
  logged_in_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  logged_out_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  last_activity_at: Date | null;

  @Column({ type: 'integer', default: 0 })
  actions_count: number; // Number of actions performed in session

  @Column({ type: 'boolean', default: false })
  is_suspicious: boolean;

  @Column({ type: 'text', nullable: true })
  revoke_reason: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    fingerprint?: string;
    timezone?: string;
    screen_resolution?: string;
    [key: string]: unknown;
  };
}
