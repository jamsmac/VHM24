import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ClientUser } from './client-user.entity';

/**
 * Client wallet - stores prepaid balance for purchases.
 * Phase 2 feature - tables created now, endpoints will be enabled later.
 * One wallet per client user.
 */
@Entity('client_wallets')
@Index(['client_user_id'], { unique: true })
export class ClientWallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  client_user_id: string;

  @OneToOne(() => ClientUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_user_id' })
  client_user: ClientUser;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance: number;

  @Column({ type: 'varchar', length: 3, default: 'UZS' })
  currency: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
