import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

export enum TelegramUserStatus {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
  INACTIVE = 'inactive',
}

export enum TelegramLanguage {
  RU = 'ru',
  EN = 'en',
  UZ = 'uz',
}

@Entity('telegram_users')
export class TelegramUser extends BaseEntity {
  @Column({ type: 'bigint', unique: true })
  telegram_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'bigint' })
  chat_id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  username: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  first_name: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  last_name: string | null;

  @Column({ type: 'enum', enum: TelegramLanguage, default: TelegramLanguage.RU })
  language: TelegramLanguage;

  @Column({ type: 'enum', enum: TelegramUserStatus, default: TelegramUserStatus.ACTIVE })
  status: TelegramUserStatus;

  @Column({ type: 'jsonb', default: {} })
  notification_preferences: {
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

  @Column({ type: 'timestamp', nullable: true })
  last_interaction_at: Date | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  verification_code: string | null;

  @Column({ type: 'timestamp', nullable: true })
  verification_code_expires_at: Date | null;

  @Column({ type: 'integer', default: 0 })
  verification_attempts: number;

  @Column({ type: 'timestamp', nullable: true })
  last_verification_attempt_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  blocked_until: Date | null;

  @Column({ type: 'boolean', default: false })
  is_verified: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
