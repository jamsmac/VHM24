import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../../common/entities/base.entity';
import { TelegramUser } from './telegram-user.entity';

export enum TelegramMessageType {
  COMMAND = 'command',
  NOTIFICATION = 'notification',
  CALLBACK = 'callback',
  MESSAGE = 'message',
  ERROR = 'error',
}

export enum TelegramMessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  READ = 'read',
}

@Entity('telegram_message_logs')
export class TelegramMessageLog extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  telegram_user_id: string | null;

  @ManyToOne(() => TelegramUser, { nullable: true })
  @JoinColumn({ name: 'telegram_user_id' })
  telegram_user: TelegramUser | null;

  @Column({ type: 'bigint', nullable: true })
  chat_id: string | null;

  @Column({ type: 'enum', enum: TelegramMessageType })
  message_type: TelegramMessageType;

  @Column({ type: 'text', nullable: true })
  command: string | null;

  @Column({ type: 'text' })
  message_text: string;

  @Column({ type: 'integer', nullable: true })
  telegram_message_id: number | null;

  @Column({ type: 'enum', enum: TelegramMessageStatus, default: TelegramMessageStatus.SENT })
  status: TelegramMessageStatus;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
