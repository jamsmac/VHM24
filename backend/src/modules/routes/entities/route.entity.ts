import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { RouteStop } from './route-stop.entity';

export enum RouteType {
  COLLECTION = 'collection', // Инкассация
  REFILL = 'refill', // Пополнение
  MAINTENANCE = 'maintenance', // Обслуживание
  MIXED = 'mixed', // Смешанный
}

export enum RouteStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('routes')
export class Route extends BaseEntity {
  @Column({ type: 'uuid' })
  driver_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'driver_id' })
  driver: User;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'enum', enum: RouteType })
  route_type: RouteType;

  @Column({ type: 'enum', enum: RouteStatus, default: RouteStatus.PLANNED })
  status: RouteStatus;

  @Column({ type: 'date' })
  planned_date: Date;

  @Column({ type: 'time', nullable: true })
  start_time: string | null;

  @Column({ type: 'time', nullable: true })
  end_time: string | null;

  @Column({ type: 'timestamp', nullable: true })
  actual_start_time: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  actual_end_time: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  estimated_distance_km: number;

  @Column({ type: 'integer', default: 0 })
  estimated_duration_minutes: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  actual_distance_km: number | null;

  @Column({ type: 'integer', nullable: true })
  actual_duration_minutes: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  estimated_cost: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => RouteStop, (stop) => stop.route)
  stops: RouteStop[];

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    vehicle_type?: string;
    vehicle_plate?: string;
    fuel_consumption?: number;
    traffic_conditions?: string;
  };
}
