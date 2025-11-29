import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '@modules/users/entities/user.entity';

/**
 * Audit Event Types
 *
 * According to REQ-AUTH-80: Key authorization events to log
 */
export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  TOKEN_REFRESH = 'token_refresh',

  // Password events
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_COMPLETED = 'password_reset_completed',

  // 2FA events
  TWO_FA_ENABLED = '2fa_enabled',
  TWO_FA_DISABLED = '2fa_disabled',
  TWO_FA_VERIFIED = '2fa_verified',
  TWO_FA_FAILED = '2fa_failed',

  // Account management
  ACCOUNT_CREATED = 'account_created',
  ACCOUNT_UPDATED = 'account_updated',
  ACCOUNT_BLOCKED = 'account_blocked',
  ACCOUNT_UNBLOCKED = 'account_unblocked',
  ACCOUNT_DELETED = 'account_deleted',

  // Role and permission changes
  ROLE_ASSIGNED = 'role_assigned',
  ROLE_REMOVED = 'role_removed',
  PERMISSION_CHANGED = 'permission_changed',

  // Access request events
  ACCESS_REQUEST_CREATED = 'access_request_created',
  ACCESS_REQUEST_APPROVED = 'access_request_approved',
  ACCESS_REQUEST_REJECTED = 'access_request_rejected',

  // Security events
  BRUTE_FORCE_DETECTED = 'brute_force_detected',
  IP_BLOCKED = 'ip_blocked',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',

  // Session events
  SESSION_CREATED = 'session_created',
  SESSION_TERMINATED = 'session_terminated',
  SESSION_EXPIRED = 'session_expired',
}

export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Audit Log Entity
 *
 * Tracks all security-related events in the system
 * According to REQ-AUTH-80 and REQ-AUTH-81
 */
@Entity('audit_logs')
@Index(['event_type'])
@Index(['user_id'])
@Index(['created_at'])
@Index(['severity'])
@Index(['ip_address'])
export class AuditLog extends BaseEntity {
  // Event information
  @Column({
    type: 'enum',
    enum: AuditEventType,
  })
  event_type: AuditEventType;

  @Column({
    type: 'enum',
    enum: AuditSeverity,
    default: AuditSeverity.INFO,
  })
  severity: AuditSeverity;

  // User who performed the action (nullable for failed login attempts)
  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  // Target user for user management events
  @Column({ type: 'uuid', nullable: true })
  target_user_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'target_user_id' })
  target_user: User | null;

  // Request metadata
  @Column({ type: 'inet', nullable: true })
  ip_address: string | null;

  @Column({ type: 'text', nullable: true })
  user_agent: string | null;

  // Event details
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  // Success/failure status
  @Column({ type: 'boolean', default: true })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;
}
