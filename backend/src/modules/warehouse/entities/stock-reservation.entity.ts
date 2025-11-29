import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Warehouse } from './warehouse.entity';

export enum ReservationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PARTIALLY_FULFILLED = 'partially_fulfilled',
  FULFILLED = 'fulfilled',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

@Entity('stock_reservations')
@Index(['warehouse_id', 'product_id'])
@Index(['status', 'expires_at'])
export class StockReservation extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  reservation_number: string;

  @Column({ type: 'uuid' })
  warehouse_id: string;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({ type: 'uuid' })
  product_id: string;

  @Column({ type: 'uuid', nullable: true })
  batch_id: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity_reserved: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  quantity_fulfilled: number;

  @Column({ type: 'varchar', length: 20 })
  unit: string;

  @Column({ type: 'enum', enum: ReservationStatus, default: ReservationStatus.PENDING })
  status: ReservationStatus;

  @Column({ type: 'varchar', length: 100 })
  reserved_for: string; // Order number, task, etc.

  @Column({ type: 'uuid', nullable: true })
  reserved_by_id: string | null;

  @Column({ type: 'timestamp' })
  reserved_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  expires_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  fulfilled_at: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    priority?: number;
    customer_id?: string;
    delivery_date?: string;
  };
}
