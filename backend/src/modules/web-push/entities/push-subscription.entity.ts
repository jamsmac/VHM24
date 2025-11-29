import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Web Push Subscription
 * Stores browser push notification subscriptions for users
 */
@Entity('push_subscriptions')
@Index(['user_id'])
@Index(['endpoint'], { unique: true })
export class PushSubscription extends BaseEntity {
  @ApiProperty({ example: 'user-uuid', description: 'User ID' })
  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({
    example: 'https://fcm.googleapis.com/fcm/send/...',
    description: 'Push service endpoint',
  })
  @Column({ type: 'text' })
  endpoint: string;

  @ApiProperty({
    example: 'BKsX...',
    description: 'P256DH key for encryption',
  })
  @Column({ type: 'text' })
  p256dh: string;

  @ApiProperty({
    example: 'Abc123...',
    description: 'Auth secret for encryption',
  })
  @Column({ type: 'text' })
  auth: string;

  @ApiProperty({
    example: 'Chrome 120 on Windows',
    description: 'Browser/device info',
  })
  @Column({ type: 'varchar', length: 500, nullable: true })
  user_agent: string | null;

  @ApiProperty({
    example: '2025-11-14T10:00:00Z',
    description: 'Last successful notification sent',
  })
  @Column({ type: 'timestamp with time zone', nullable: true })
  last_sent_at: Date | null;

  @ApiProperty({ example: true, description: 'Is subscription active' })
  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
