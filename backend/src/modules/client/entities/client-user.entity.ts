import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Client user entity - separate from staff users.
 * Used for public website and mobile app authentication.
 *
 * Fast onboarding: only telegram_username required initially.
 * Verification can be done later via Telegram bot callback.
 */
@Entity('client_users')
@Index(['telegram_username'], { unique: true, where: 'telegram_username IS NOT NULL' })
@Index(['telegram_id'], { unique: true, where: 'telegram_id IS NOT NULL' })
@Index(['phone'], { unique: true, where: 'phone IS NOT NULL' })
export class ClientUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  telegram_username: string | null;

  @Column({ type: 'bigint', nullable: true })
  telegram_id: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  full_name: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'boolean', default: false })
  is_verified: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  verified_at: Date | null;

  @Column({ type: 'varchar', length: 10, default: 'ru' })
  language: string;

  @Column({ type: 'jsonb', nullable: true })
  preferences: Record<string, any> | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_active_at: Date | null;
}
