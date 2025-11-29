import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Warehouse } from './warehouse.entity';

@Entity('inventory_batches')
@Index(['warehouse_id', 'product_id'])
@Index(['batch_number'])
@Index(['expiry_date'])
export class InventoryBatch extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  batch_number: string;

  @Column({ type: 'uuid' })
  warehouse_id: string;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({ type: 'uuid' })
  product_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  initial_quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  current_quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  reserved_quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  available_quantity: number; // current - reserved

  @Column({ type: 'varchar', length: 20 })
  unit: string;

  @Column({ type: 'date', nullable: true })
  production_date: Date | null;

  @Column({ type: 'date', nullable: true })
  expiry_date: Date | null;

  @Column({ type: 'date' })
  received_date: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  unit_cost: number | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  supplier: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  supplier_batch_number: string | null;

  @Column({ type: 'uuid', nullable: true })
  zone_id: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  location_code: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'boolean', default: false })
  is_quarantined: boolean;

  @Column({ type: 'text', nullable: true })
  quarantine_reason: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    quality_certificate?: string;
    test_results?: Record<string, any>;
    storage_conditions?: string;
    handling_instructions?: string;
    written_off_at?: string;
    written_off_reason?: string;
    written_off_quantity?: number;
    written_off_value?: number;
  };
}
