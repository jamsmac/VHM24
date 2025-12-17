import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_COMPLETED = 'password_reset_completed',
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  TWO_FACTOR_ENABLED = 'two_factor_enabled',
  TWO_FACTOR_DISABLED = 'two_factor_disabled',
  TWO_FACTOR_VERIFIED = 'two_factor_verified',
  TWO_FACTOR_FAILED = 'two_factor_failed',
  PERMISSION_DENIED = 'permission_denied',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  DATA_EXPORT = 'data_export',
  BULK_OPERATION = 'bulk_operation',
}

export enum SecurityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('security_events')
@Index(['user_id', 'created_at'])
@Index(['event_type', 'created_at'])
@Index(['security_level', 'created_at'])
export class SecurityEvent extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  user_email: string | null;

  @Column({ type: 'enum', enum: SecurityEventType })
  event_type: SecurityEventType;

  @Column({ type: 'enum', enum: SecurityLevel, default: SecurityLevel.LOW })
  security_level: SecurityLevel;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ip_address: string | null;

  @Column({ type: 'text', nullable: true })
  user_agent: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string | null; // Geo location if available

  @Column({ type: 'varchar', length: 50, nullable: true })
  session_id: string | null;

  @Column({ type: 'boolean', default: false })
  is_blocked: boolean;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'jsonb', default: {} })
  details: {
    attempted_resource?: string;
    failure_reason?: string;
    device_info?: Record<string, unknown>;
    [key: string]: unknown;
  };

  @Column({ type: 'boolean', default: false })
  requires_investigation: boolean;

  @Column({ type: 'timestamp', nullable: true })
  investigated_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  investigated_by_id: string | null;

  @Column({ type: 'text', nullable: true })
  investigation_notes: string | null;
}
