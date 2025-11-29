import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum SnapshotType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

@Entity('analytics_snapshots')
@Index(['snapshot_type', 'snapshot_date'])
@Index(['machine_id', 'snapshot_date'])
@Index(['location_id', 'snapshot_date'])
export class AnalyticsSnapshot extends BaseEntity {
  @Column({ type: 'enum', enum: SnapshotType })
  snapshot_type: SnapshotType;

  @Column({ type: 'date' })
  snapshot_date: Date;

  @Column({ type: 'uuid', nullable: true })
  machine_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  location_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  product_id: string | null;

  // Sales metrics
  @Column({ type: 'integer', default: 0 })
  total_transactions: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_revenue: number;

  @Column({ type: 'integer', default: 0 })
  total_units_sold: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  average_transaction_value: number;

  // Machine metrics
  @Column({ type: 'integer', default: 0 })
  uptime_minutes: number;

  @Column({ type: 'integer', default: 0 })
  downtime_minutes: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  availability_percentage: number;

  // Stock metrics
  @Column({ type: 'integer', default: 0 })
  stock_refills: number;

  @Column({ type: 'integer', default: 0 })
  out_of_stock_incidents: number;

  // Service metrics
  @Column({ type: 'integer', default: 0 })
  maintenance_tasks_completed: number;

  @Column({ type: 'integer', default: 0 })
  incidents_reported: number;

  @Column({ type: 'integer', default: 0 })
  complaints_received: number;

  // Financial metrics
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  operational_costs: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  profit_margin: number;

  @Column({ type: 'jsonb', default: {} })
  detailed_metrics: {
    hourly_distribution?: Record<string, number>;
    top_products?: Array<{ product_id: string; units: number; revenue: number }>;
    payment_methods?: Record<string, number>;
    error_codes?: Record<string, number>;
  };

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
