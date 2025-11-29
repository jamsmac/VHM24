import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '@modules/users/entities/user.entity';

@Entity('operator_ratings')
@Index(['operator_id', 'period_start', 'period_end'])
@Index(['period_start', 'period_end'])
export class OperatorRating extends BaseEntity {
  // Operator reference
  @Column({ type: 'uuid' })
  operator_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'operator_id' })
  operator: User;

  // Rating period
  @Column({ type: 'timestamp' })
  period_start: Date;

  @Column({ type: 'timestamp' })
  period_end: Date;

  // ============================================================================
  // TIMELINESS METRICS (30% weight)
  // ============================================================================

  @Column({ type: 'int', default: 0 })
  total_tasks: number;

  @Column({ type: 'int', default: 0 })
  tasks_on_time: number;

  @Column({ type: 'int', default: 0 })
  tasks_late: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  avg_completion_time_hours: number; // Average time to complete tasks

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  timeliness_score: number; // 0-100

  // ============================================================================
  // PHOTO QUALITY METRICS (25% weight)
  // ============================================================================

  @Column({ type: 'int', default: 0 })
  tasks_with_photos_before: number;

  @Column({ type: 'int', default: 0 })
  tasks_with_photos_after: number;

  @Column({ type: 'int', default: 0 })
  total_photos_uploaded: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  photo_compliance_rate: number; // Percentage of tasks with all required photos

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  photo_quality_score: number; // 0-100

  // ============================================================================
  // DATA ACCURACY METRICS (20% weight)
  // ============================================================================

  @Column({ type: 'int', default: 0 })
  collections_with_variance: number; // Collections with discrepancy

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  avg_collection_variance_percent: number; // Average variance in collections

  @Column({ type: 'int', default: 0 })
  inventory_discrepancies: number; // Count of inventory mismatches

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  data_accuracy_score: number; // 0-100

  // ============================================================================
  // CUSTOMER FEEDBACK METRICS (15% weight)
  // ============================================================================

  @Column({ type: 'int', default: 0 })
  complaints_received: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  avg_customer_rating: number | null; // 1-5 stars, null if no ratings

  @Column({ type: 'int', default: 0 })
  positive_feedback_count: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  customer_feedback_score: number; // 0-100

  // ============================================================================
  // DISCIPLINE METRICS (10% weight)
  // ============================================================================

  @Column({ type: 'int', default: 0 })
  checklist_items_completed: number;

  @Column({ type: 'int', default: 0 })
  checklist_items_total: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  checklist_completion_rate: number; // Percentage

  @Column({ type: 'int', default: 0 })
  comments_sent: number; // Communication with team

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discipline_score: number; // 0-100

  // ============================================================================
  // OVERALL RATING
  // ============================================================================

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  overall_score: number; // Weighted average: 0-100

  @Column({ type: 'varchar', length: 20, default: 'unrated' })
  rating_grade: string; // 'excellent', 'good', 'average', 'poor', 'unrated'

  @Column({ type: 'int', nullable: true })
  rank: number; // Rank among all operators (1 = best)

  // Additional metadata
  @Column({ type: 'jsonb', nullable: true })
  notes: Record<string, any>; // Any additional notes or flags

  @Column({ type: 'timestamp', nullable: true })
  notification_sent_at: Date; // When operator was notified of their rating
}
