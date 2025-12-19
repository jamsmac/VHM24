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
import { PaymentProvider } from './client-order.entity';

export enum ClientPaymentStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

/**
 * Client payment entity - raw payment transactions from providers.
 */
@Entity('client_payments')
@Index(['client_user_id'])
@Index(['provider'])
@Index(['provider_tx_id'])
@Index(['status'])
export class ClientPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  client_user_id: string;

  @ManyToOne(() => ClientUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_user_id' })
  client_user: ClientUser;

  @Column({
    type: 'enum',
    enum: PaymentProvider,
  })
  provider: PaymentProvider;

  @Column({ type: 'varchar', length: 255, nullable: true })
  provider_tx_id: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'UZS' })
  currency: string;

  @Column({
    type: 'enum',
    enum: ClientPaymentStatus,
    default: ClientPaymentStatus.PENDING,
  })
  status: ClientPaymentStatus;

  @Column({ type: 'jsonb', nullable: true })
  raw_payload: Record<string, any> | null;

  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  processed_at: Date | null;
}
