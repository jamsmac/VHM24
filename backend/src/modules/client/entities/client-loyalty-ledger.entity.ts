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

export enum LoyaltyTransactionReason {
  ORDER_EARNED = 'order_earned',
  ORDER_REDEEMED = 'order_redeemed',
  REFERRAL_BONUS = 'referral_bonus',
  PROMO_BONUS = 'promo_bonus',
  MANUAL_ADJUSTMENT = 'manual_adjustment',
  EXPIRATION = 'expiration',
}

/**
 * Client loyalty ledger - immutable record of all point transactions.
 */
@Entity('client_loyalty_ledger')
@Index(['client_user_id'])
@Index(['order_id'])
@Index(['created_at'])
export class ClientLoyaltyLedger {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  client_user_id: string;

  @ManyToOne(() => ClientUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_user_id' })
  client_user: ClientUser;

  @Column({ type: 'integer' })
  delta: number;

  @Column({
    type: 'enum',
    enum: LoyaltyTransactionReason,
  })
  reason: LoyaltyTransactionReason;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', nullable: true })
  order_id: string | null;

  @ManyToOne(() => ClientOrder, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'order_id' })
  order: ClientOrder | null;

  @Column({ type: 'integer' })
  balance_after: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;
}
