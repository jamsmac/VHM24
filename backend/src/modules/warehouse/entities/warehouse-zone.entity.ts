import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Warehouse } from './warehouse.entity';

export enum ZoneType {
  RECEIVING = 'receiving',
  STORAGE = 'storage',
  PICKING = 'picking',
  PACKING = 'packing',
  SHIPPING = 'shipping',
  QUARANTINE = 'quarantine',
  RETURNS = 'returns',
}

@Entity('warehouse_zones')
export class WarehouseZone extends BaseEntity {
  @Column({ type: 'uuid' })
  warehouse_id: string;

  @ManyToOne(() => Warehouse, (warehouse) => warehouse.zones)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'enum', enum: ZoneType })
  zone_type: ZoneType;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  area_sqm: number | null;

  @Column({ type: 'integer', nullable: true })
  capacity: number | null;

  @Column({ type: 'integer', default: 0 })
  current_occupancy: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    temperature?: number;
    humidity?: number;
    shelves?: number;
    rows?: number;
    positions_per_row?: number;
  };
}
