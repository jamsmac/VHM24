import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ClientUser } from './client-user.entity';
import { ClientOrder } from './client-order.entity';
import { ClientPayment } from './client-payment.entity';

export enum WalletTransactionType {
  TOP_UP = 'top_up',
  PURCHASE = 'purchase',
  REFUND = 'refund',
  MANUAL_ADJUSTMENT = 'manual_adjustment',
  BONUS = 'bonus',
}

/**
 * Client wallet ledger - immutable record of all wallet transactions.
 * Phase 2 feature - tables created now, endpoints will be enabled later.
 */
@Entity('client_wallet_ledger')
@Index(['client_user_id'])
@Index(['order_id'])
@Index(['payment_id'])
@Index(['created_at'])
export class ClientWalletLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  client_user_id: string;

  @ManyToOne(() => ClientUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_user_id' })
  client_user: ClientUser;

  @Column({
    type: 'enum',
    enum: WalletTransactionType,
  })
  transaction_type: WalletTransactionType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'UZS' })
  currency: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', nullable: true })
  order_id: string | null;

  @ManyToOne(() => ClientOrder, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'order_id' })
  order: ClientOrder | null;

  @Column({ type: 'uuid', nullable: true })
  payment_id: string | null;

  @ManyToOne(() => ClientPayment, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'payment_id' })
  payment: ClientPayment | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  balance_after: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;
}
