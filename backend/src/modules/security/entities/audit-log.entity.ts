import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

// Event type enum matching the database
export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  TOKEN_REFRESH = 'token_refresh',
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET_REQUESTED = 'password_reset_requested',
  PASSWORD_RESET_COMPLETED = 'password_reset_completed',
  TWO_FA_ENABLED = '2fa_enabled',
  TWO_FA_DISABLED = '2fa_disabled',
  TWO_FA_VERIFIED = '2fa_verified',
  TWO_FA_FAILED = '2fa_failed',
  // Account management events
  ACCOUNT_CREATED = 'account_created',
  ACCOUNT_UPDATED = 'account_updated',
  ACCOUNT_BLOCKED = 'account_blocked',
  ACCOUNT_UNBLOCKED = 'account_unblocked',
  ACCOUNT_DELETED = 'account_deleted',
  ROLE_ASSIGNED = 'role_assigned',
  ROLE_REMOVED = 'role_removed',
  PERMISSION_CHANGED = 'permission_changed',
  ACCESS_REQUEST_CREATED = 'access_request_created',
  ACCESS_REQUEST_APPROVED = 'access_request_approved',
  ACCESS_REQUEST_REJECTED = 'access_request_rejected',
  // Security events
  BRUTE_FORCE_DETECTED = 'brute_force_detected',
  IP_BLOCKED = 'ip_blocked',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  SESSION_CREATED = 'session_created',
  SESSION_TERMINATED = 'session_terminated',
  SESSION_EXPIRED = 'session_expired',
  // Financial events (added for audit compliance)
  TRANSACTION_CREATED = 'transaction_created',
  TRANSACTION_DELETED = 'transaction_deleted',
  TRANSACTION_UPDATED = 'transaction_updated',
  REFUND_ISSUED = 'refund_issued',
  COLLECTION_RECORDED = 'collection_recorded',
  // Data modification events
  DATA_EXPORTED = 'data_exported',
  DATA_IMPORTED = 'data_imported',
  BULK_OPERATION = 'bulk_operation',
}

export enum AuditSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

// Legacy enum for backward compatibility (internal use only)
export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  READ = 'read',
  LOGIN = 'login',
  LOGOUT = 'logout',
  EXPORT = 'export',
  IMPORT = 'import',
  APPROVE = 'approve',
  REJECT = 'reject',
  RESTORE = 'restore',
}

export enum AuditEntity {
  USER = 'user',
  MACHINE = 'machine',
  TASK = 'task',
  INVENTORY = 'inventory',
  TRANSACTION = 'transaction',
  COMPLAINT = 'complaint',
  INCIDENT = 'incident',
  WAREHOUSE = 'warehouse',
  EMPLOYEE = 'employee',
  INTEGRATION = 'integration',
  SETTING = 'setting',
}

@Entity('audit_logs')
@Index(['event_type'])
@Index(['user_id'])
@Index(['created_at'])
@Index(['severity'])
@Index(['ip_address'])
export class AuditLog extends BaseEntity {
  @Column({ type: 'enum', enum: AuditEventType })
  event_type: AuditEventType;

  @Column({
    type: 'enum',
    enum: AuditSeverity,
    default: AuditSeverity.INFO,
  })
  severity: AuditSeverity;

  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  target_user_id: string | null;

  @Column({ type: 'inet', nullable: true })
  ip_address: string | null;

  @Column({ type: 'text', nullable: true })
  user_agent: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;
}
