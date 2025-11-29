import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

export enum ReportType {
  SALES = 'sales',
  FINANCIAL = 'financial',
  INVENTORY = 'inventory',
  MACHINES = 'machines',
  TASKS = 'tasks',
  CUSTOM = 'custom',
}

export enum ReportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
  JSON = 'json',
}

export enum ScheduleFrequency {
  ONCE = 'once',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

@Entity('custom_reports')
export class CustomReport extends BaseEntity {
  @Column({ type: 'uuid' })
  created_by_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_id' })
  created_by: User;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'enum', enum: ReportType })
  report_type: ReportType;

  @Column({ type: 'enum', enum: ReportFormat, default: ReportFormat.PDF })
  format: ReportFormat;

  @Column({ type: 'jsonb', default: {} })
  config: {
    columns?: string[];
    filters?: Record<string, any>;
    groupBy?: string[];
    orderBy?: string[];
    aggregations?: Record<string, string>;
    dateRange?: {
      from: string;
      to: string;
    };
  };

  @Column({ type: 'boolean', default: false })
  is_scheduled: boolean;

  @Column({ type: 'enum', enum: ScheduleFrequency, nullable: true })
  schedule_frequency: ScheduleFrequency | null;

  @Column({ type: 'time', nullable: true })
  schedule_time: string | null;

  @Column({ type: 'simple-array', nullable: true })
  schedule_days: string[] | null; // For weekly: ['monday', 'friday']

  @Column({ type: 'simple-array', nullable: true })
  recipients: string[] | null; // Email addresses

  @Column({ type: 'timestamp', nullable: true })
  last_run_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  next_run_at: Date | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;
}
