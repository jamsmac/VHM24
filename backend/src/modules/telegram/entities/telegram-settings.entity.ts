import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum TelegramBotMode {
  POLLING = 'polling',
  WEBHOOK = 'webhook',
}

@Entity('telegram_settings')
export class TelegramSettings extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  setting_key: string;

  @Column({ type: 'text' })
  bot_token: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bot_username: string | null;

  @Column({ type: 'enum', enum: TelegramBotMode, default: TelegramBotMode.POLLING })
  mode: TelegramBotMode;

  @Column({ type: 'text', nullable: true })
  webhook_url: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'boolean', default: true })
  send_notifications: boolean;

  @Column({ type: 'jsonb', default: {} })
  default_notification_preferences: {
    machine_offline?: boolean;
    machine_online?: boolean;
    low_stock?: boolean;
    sales_milestone?: boolean;
    maintenance_due?: boolean;
    equipment_needs_maintenance?: boolean;
    equipment_low_stock?: boolean;
    equipment_washing_due?: boolean;
    payment_failed?: boolean;
    task_assigned?: boolean;
    task_completed?: boolean;
    custom?: boolean;
  };

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
