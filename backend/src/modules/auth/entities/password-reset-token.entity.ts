import { Entity, Column, ManyToOne, JoinColumn, Index, BeforeInsert } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '@modules/users/entities/user.entity';

/**
 * Password Reset Token Entity
 *
 * Stores tokens for password recovery process.
 * Tokens expire after 1 hour and can only be used once.
 *
 * REQ-AUTH-45: Password Recovery
 */
@Entity('password_reset_tokens')
@Index(['token'], { unique: true })
@Index(['user_id'])
@Index(['expires_at'])
export class PasswordResetToken extends BaseEntity {
  /**
   * Unique token (UUID v4)
   * Sent to user's email for password reset
   */
  @Column({ type: 'uuid', unique: true })
  token: string;

  /**
   * User ID who requested password reset
   */
  @Column({ type: 'uuid' })
  user_id: string;

  /**
   * User relation
   */
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /**
   * Token expiration timestamp
   * Default: 1 hour from creation
   */
  @Column({ type: 'timestamp with time zone' })
  expires_at: Date;

  /**
   * Timestamp when token was used
   * Null if not used yet
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  used_at: Date | null;

  /**
   * IP address from which reset was requested
   */
  @Column({ type: 'inet', nullable: true })
  request_ip: string | null;

  /**
   * User agent from which reset was requested
   */
  @Column({ type: 'text', nullable: true })
  request_user_agent: string | null;

  /**
   * Generate UUID token before insert
   */
  @BeforeInsert()
  generateToken() {
    if (!this.token) {
      this.token = uuidv4();
    }

    if (!this.expires_at) {
      // Default expiration: 1 hour from now
      this.expires_at = new Date(Date.now() + 60 * 60 * 1000);
    }
  }

  /**
   * Check if token is expired
   */
  isExpired(): boolean {
    return new Date() > this.expires_at;
  }

  /**
   * Check if token is already used
   */
  isUsed(): boolean {
    return this.used_at !== null;
  }

  /**
   * Check if token is valid (not expired and not used)
   */
  isValid(): boolean {
    return !this.isExpired() && !this.isUsed();
  }
}
