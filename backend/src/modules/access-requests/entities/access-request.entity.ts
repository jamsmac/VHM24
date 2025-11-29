import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '@modules/users/entities/user.entity';

export enum AccessRequestStatus {
  NEW = 'new',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum AccessRequestSource {
  TELEGRAM = 'telegram',
  WEB = 'web',
  MANUAL = 'manual',
}

/**
 * Access Request Entity
 *
 * Represents a request for system access, primarily from Telegram bot users
 * According to REQ-AUTH-32 and REQ-AUTH-33
 */
@Entity('access_requests')
@Index(['telegram_id'])
@Index(['status'])
@Index(['created_at'])
export class AccessRequest extends BaseEntity {
  // Telegram data
  @Column({ type: 'varchar', length: 100 })
  telegram_id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  telegram_username: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  telegram_first_name: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  telegram_last_name: string | null;

  // Request metadata
  @Column({
    type: 'enum',
    enum: AccessRequestSource,
    default: AccessRequestSource.TELEGRAM,
  })
  source: AccessRequestSource;

  @Column({
    type: 'enum',
    enum: AccessRequestStatus,
    default: AccessRequestStatus.NEW,
  })
  status: AccessRequestStatus;

  // Processing data
  @Column({ type: 'uuid', nullable: true })
  processed_by_user_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'processed_by_user_id' })
  processed_by: User | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  processed_at: Date | null;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  // Created user reference (after approval)
  @Column({ type: 'uuid', nullable: true })
  created_user_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_user_id' })
  created_user: User | null;

  // Additional metadata
  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
