import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ClientUser } from './client-user.entity';
import { Machine } from '../../machines/entities/machine.entity';
import { Location } from '../../locations/entities/location.entity';

export enum ClientOrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentProvider {
  TELEGRAM = 'telegram',
  CLICK = 'click',
  PAYME = 'payme',
  UZUM = 'uzum',
  WALLET = 'wallet',
}

/**
 * Client order entity - tracks purchases made through mobile app/web.
 */
@Entity('client_orders')
@Index(['client_user_id'])
@Index(['machine_id'])
@Index(['status'])
@Index(['created_at'])
export class ClientOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  client_user_id: string;

  @ManyToOne(() => ClientUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_user_id' })
  client_user: ClientUser;

  @Column({ type: 'uuid' })
  machine_id: string;

  @ManyToOne(() => Machine, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @Column({ type: 'uuid', nullable: true })
  location_id: string | null;

  @ManyToOne(() => Location, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'location_id' })
  location: Location | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total_amount: number;

  @Column({ type: 'varchar', length: 3, default: 'UZS' })
  currency: string;

  @Column({
    type: 'enum',
    enum: PaymentProvider,
    default: PaymentProvider.TELEGRAM,
  })
  payment_provider: PaymentProvider;

  @Column({ type: 'varchar', length: 255, nullable: true })
  provider_tx_id: string | null;

  @Column({
    type: 'enum',
    enum: ClientOrderStatus,
    default: ClientOrderStatus.PENDING,
  })
  status: ClientOrderStatus;

  @Column({ type: 'jsonb', nullable: true })
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    price: number;
  }> | null;

  @Column({ type: 'integer', default: 0 })
  loyalty_points_earned: number;

  @Column({ type: 'integer', default: 0 })
  loyalty_points_used: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  paid_at: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completed_at: Date | null;
}
