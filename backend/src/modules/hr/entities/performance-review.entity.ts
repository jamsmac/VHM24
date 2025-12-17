import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Employee } from './employee.entity';

export enum ReviewPeriod {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  SEMI_ANNUAL = 'semi_annual',
  ANNUAL = 'annual',
}

export enum ReviewStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('performance_reviews')
export class PerformanceReview extends BaseEntity {
  @Column({ type: 'uuid' })
  employee_id: string;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ type: 'uuid' })
  reviewer_id: string;

  @Column({ type: 'enum', enum: ReviewPeriod })
  review_period: ReviewPeriod;

  @Column({ type: 'date' })
  review_date: Date;

  @Column({ type: 'date' })
  period_start: Date;

  @Column({ type: 'date' })
  period_end: Date;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  overall_rating: number | null; // 0.00 to 5.00

  @Column({ type: 'enum', enum: ReviewStatus, default: ReviewStatus.SCHEDULED })
  status: ReviewStatus;

  @Column({ type: 'text', nullable: true })
  strengths: string | null;

  @Column({ type: 'text', nullable: true })
  areas_for_improvement: string | null;

  @Column({ type: 'text', nullable: true })
  goals: string | null;

  @Column({ type: 'text', nullable: true })
  reviewer_comments: string | null;

  @Column({ type: 'text', nullable: true })
  employee_comments: string | null;

  @Column({ type: 'jsonb', default: {} })
  ratings: {
    category: string;
    rating: number;
    comments?: string;
  }[];

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    competencies?: Record<string, number>;
    kpis?: Record<string, unknown>;
    [key: string]: unknown;
  };
}
