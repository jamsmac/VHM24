import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Warehouse } from './warehouse.entity';

export enum MovementType {
  RECEIPT = 'receipt', // Приемка
  SHIPMENT = 'shipment', // Отгрузка
  TRANSFER = 'transfer', // Перемещение
  ADJUSTMENT = 'adjustment', // Корректировка
  RETURN = 'return', // Возврат
  WRITE_OFF = 'write_off', // Списание
  PRODUCTION = 'production', // Производство
  ASSEMBLY = 'assembly', // Сборка
}

export enum MovementStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('stock_movements')
@Index(['warehouse_id', 'movement_date'])
@Index(['product_id', 'movement_date'])
export class StockMovement extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  movement_number: string;

  @Column({ type: 'enum', enum: MovementType })
  movement_type: MovementType;

  @Column({ type: 'enum', enum: MovementStatus, default: MovementStatus.DRAFT })
  status: MovementStatus;

  @Column({ type: 'uuid' })
  warehouse_id: string;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({ type: 'uuid', nullable: true })
  destination_warehouse_id: string | null; // For transfers

  @Column({ type: 'uuid' })
  product_id: string;

  @Column({ type: 'uuid', nullable: true })
  batch_id: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity: number;

  @Column({ type: 'varchar', length: 20 })
  unit: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  unit_cost: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  total_cost: number | null;

  @Column({ type: 'timestamp' })
  movement_date: Date;

  @Column({ type: 'uuid', nullable: true })
  performed_by_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  zone_id: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  location_code: string | null; // Shelf/bin location

  @Column({ type: 'text', nullable: true })
  reference_document: string | null; // PO, SO, etc.

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    supplier?: string;
    carrier?: string;
    tracking_number?: string;
    quality_check?: boolean;
    damage_report?: string;
  };
}
