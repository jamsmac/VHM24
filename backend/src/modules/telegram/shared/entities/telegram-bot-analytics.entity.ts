import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base.entity';
import { TelegramUser } from './telegram-user.entity';

/**
 * Analytics event types for Telegram bot
 */
export enum TelegramAnalyticsEventType {
  QUICK_ACTION = 'quick_action',
  COMMAND = 'command',
  CALLBACK = 'callback',
  VOICE_COMMAND = 'voice_command',
  QR_SCAN = 'qr_scan',
  LOCATION_SHARE = 'location_share',
}

/**
 * Entity for tracking Telegram bot usage analytics
 *
 * Used to track which features and quick actions are most used
 * for optimization and UX improvements.
 */
@Entity('telegram_bot_analytics')
@Index(['event_type', 'created_at'])
@Index(['action_name', 'created_at'])
@Index(['telegram_user_id', 'created_at'])
export class TelegramBotAnalytics extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  telegram_user_id: string | null;

  @ManyToOne(() => TelegramUser, { nullable: true })
  @JoinColumn({ name: 'telegram_user_id' })
  telegram_user: TelegramUser | null;

  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @Column({
    type: 'enum',
    enum: TelegramAnalyticsEventType,
    default: TelegramAnalyticsEventType.QUICK_ACTION,
  })
  event_type: TelegramAnalyticsEventType;

  @Column({ type: 'varchar', length: 100 })
  action_name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  action_category: string | null;

  @Column({ type: 'integer', nullable: true })
  response_time_ms: number | null;

  @Column({ type: 'boolean', default: true })
  success: boolean;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
