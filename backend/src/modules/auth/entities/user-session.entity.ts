import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '@modules/users/entities/user.entity';

/**
 * User Session Entity
 *
 * REQ-AUTH-54: Session Tracking
 * REQ-AUTH-55: Refresh Token Rotation
 * REQ-AUTH-61: Session Limits
 *
 * Tracks active user sessions with device information and refresh tokens.
 * Supports:
 * - Multiple concurrent sessions per user
 * - Session revocation
 * - Refresh token rotation
 * - Device fingerprinting
 * - Last activity tracking
 */
@Entity('user_sessions')
@Index(['user_id'])
@Index(['refresh_token_hash'])
@Index(['is_active'])
@Index(['last_used_at'])
export class UserSession extends BaseEntity {
  // User relation
  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Refresh token (hashed)
  @Column({ type: 'text' })
  refresh_token_hash: string;

  /**
   * Token hint for fast lookup (first 16 chars of SHA-256 hash)
   * This allows O(1) index lookup before expensive bcrypt comparison
   * REQ-AUTH-55: Performance optimization for refresh token lookup
   */
  @Column({ type: 'varchar', length: 16, nullable: true })
  @Index('idx_user_sessions_token_hint')
  refresh_token_hint: string | null;

  // Device information
  @Column({ type: 'inet', nullable: true })
  ip_address: string | null;

  @Column({ type: 'text', nullable: true })
  user_agent: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  device_type: string | null; // mobile, desktop, tablet

  @Column({ type: 'varchar', length: 100, nullable: true })
  device_name: string | null; // Chrome on Windows, Safari on iPhone, etc.

  @Column({ type: 'varchar', length: 100, nullable: true })
  os: string | null; // Windows, macOS, iOS, Android, Linux

  @Column({ type: 'varchar', length: 100, nullable: true })
  browser: string | null; // Chrome, Safari, Firefox, Edge

  // Session status
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_used_at: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  expires_at: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  revoked_at: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  revoked_reason: string | null; // logout, security, max_sessions_exceeded, etc.

  // Metadata
  @Column({ type: 'jsonb', nullable: true, default: {} })
  metadata: Record<string, any>;

  /**
   * Check if session is expired
   */
  get isExpired(): boolean {
    if (!this.expires_at) return false;
    return new Date() > this.expires_at;
  }

  /**
   * Check if session is valid (active and not expired)
   */
  get isValid(): boolean {
    return this.is_active && !this.isExpired && !this.revoked_at;
  }

  /**
   * Get session age in seconds
   */
  get ageInSeconds(): number {
    if (!this.created_at) return 0;
    return Math.floor((Date.now() - this.created_at.getTime()) / 1000);
  }

  /**
   * Get time since last use in seconds
   */
  get timeSinceLastUse(): number {
    if (!this.last_used_at) return this.ageInSeconds;
    return Math.floor((Date.now() - this.last_used_at.getTime()) / 1000);
  }
}
