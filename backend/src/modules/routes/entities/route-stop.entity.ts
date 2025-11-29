import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Route } from './route.entity';

export enum StopStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}

@Entity('route_stops')
export class RouteStop extends BaseEntity {
  @Column({ type: 'uuid' })
  route_id: string;

  @ManyToOne(() => Route, (route) => route.stops)
  @JoinColumn({ name: 'route_id' })
  route: Route;

  @Column({ type: 'uuid' })
  machine_id: string;

  @Column({ type: 'integer' })
  sequence: number;

  @Column({ type: 'enum', enum: StopStatus, default: StopStatus.PENDING })
  status: StopStatus;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number | null;

  @Column({ type: 'time', nullable: true })
  planned_arrival_time: string | null;

  @Column({ type: 'timestamp', nullable: true })
  actual_arrival_time: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  actual_departure_time: Date | null;

  @Column({ type: 'integer', default: 15 })
  estimated_duration_minutes: number;

  @Column({ type: 'boolean', default: false })
  is_priority: boolean;

  @Column({ type: 'text', nullable: true })
  tasks: string | null; // JSON array of tasks

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', default: {} })
  completion_data: {
    collected_cash?: number;
    refilled_items?: Record<string, number>;
    issues?: string[];
    photos?: string[];
  };

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
