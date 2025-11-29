import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Location } from '../../locations/entities/location.entity';
import { WarehouseZone } from './warehouse-zone.entity';

export enum WarehouseType {
  MAIN = 'main',
  REGIONAL = 'regional',
  TRANSIT = 'transit',
  VIRTUAL = 'virtual',
}

@Entity('warehouses')
export class Warehouse extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'enum', enum: WarehouseType, default: WarehouseType.MAIN })
  warehouse_type: WarehouseType;

  @Column({ type: 'uuid', nullable: true })
  location_id: string | null;

  @ManyToOne(() => Location, { nullable: true })
  @JoinColumn({ name: 'location_id' })
  location: Location | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  total_area_sqm: number | null;

  @Column({ type: 'uuid', nullable: true })
  manager_id: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'simple-array', nullable: true })
  working_hours: string[] | null; // ['Mon-Fri: 9-18', 'Sat: 10-14']

  @OneToMany(() => WarehouseZone, (zone) => zone.warehouse)
  zones: WarehouseZone[];

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    capacity?: number;
    temperature_controlled?: boolean;
    security_level?: string;
    equipment?: string[];
  };
}
