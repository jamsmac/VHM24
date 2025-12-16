import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AlertRule, AlertSeverity } from './alert-rule.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Alert status in its lifecycle
 */
export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated',
  EXPIRED = 'expired',
}

/**
 * Alert History Entity
 *
 * Records each time an alert rule is triggered, tracks status,
 * acknowledgement, resolution, and escalation.
 */
@Entity('alert_history')
@Index(['alert_rule_id'])
@Index(['status'])
@Index(['severity'])
@Index(['triggered_at'])
@Index(['machine_id'])
@Index(['location_id'])
export class AlertHistory extends BaseEntity {
  @ApiProperty({ description: 'ID of the alert rule that triggered this alert' })
  @Column({ type: 'uuid' })
  alert_rule_id: string;

  @ManyToOne(() => AlertRule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'alert_rule_id' })
  alert_rule: AlertRule;

  @ApiProperty({ enum: AlertStatus, default: AlertStatus.ACTIVE })
  @Column({ type: 'enum', enum: AlertStatus, default: AlertStatus.ACTIVE })
  status: AlertStatus;

  @ApiProperty({ enum: AlertSeverity })
  @Column({ type: 'enum', enum: AlertSeverity })
  severity: AlertSeverity;

  @ApiProperty({ example: 'Low stock alert for Machine M-001' })
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiProperty({ example: 'Machine M-001 stock is at 15%, below threshold of 20%' })
  @Column({ type: 'text' })
  message: string;

  @ApiProperty({ description: 'When the alert was triggered' })
  @Column({ type: 'timestamp with time zone' })
  triggered_at: Date;

  @ApiPropertyOptional({ description: 'Machine ID if alert is machine-specific' })
  @Column({ type: 'uuid', nullable: true })
  machine_id: string | null;

  @ApiPropertyOptional({ description: 'Location ID if alert is location-specific' })
  @Column({ type: 'uuid', nullable: true })
  location_id: string | null;

  @ApiPropertyOptional({
    example: { current_value: 15, threshold: 20, metric: 'low_stock_percentage' },
    description: 'Snapshot of metric values at trigger time',
  })
  @Column({ type: 'jsonb', nullable: true })
  metric_snapshot: {
    current_value: number;
    threshold: number;
    metric: string;
    additional_data?: Record<string, any>;
  } | null;

  @ApiPropertyOptional({ description: 'When the alert was acknowledged' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  acknowledged_at: Date | null;

  @ApiPropertyOptional({ description: 'User who acknowledged the alert' })
  @Column({ type: 'uuid', nullable: true })
  acknowledged_by_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'acknowledged_by_id' })
  acknowledged_by: User | null;

  @ApiPropertyOptional({ example: 'Will restock tomorrow' })
  @Column({ type: 'text', nullable: true })
  acknowledgement_note: string | null;

  @ApiPropertyOptional({ description: 'When the alert was resolved' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  resolved_at: Date | null;

  @ApiPropertyOptional({ description: 'User who resolved the alert' })
  @Column({ type: 'uuid', nullable: true })
  resolved_by_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'resolved_by_id' })
  resolved_by: User | null;

  @ApiPropertyOptional({ example: 'Refill task completed' })
  @Column({ type: 'text', nullable: true })
  resolution_note: string | null;

  @ApiPropertyOptional({ description: 'When the alert was escalated' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  escalated_at: Date | null;

  @ApiProperty({ example: 0, description: 'Current escalation level' })
  @Column({ type: 'integer', default: 0 })
  escalation_level: number;

  @ApiPropertyOptional({
    example: ['notif-uuid-1', 'notif-uuid-2'],
    description: 'IDs of notifications sent for this alert',
  })
  @Column({ type: 'jsonb', nullable: true })
  notification_ids: string[] | null;

  @ApiPropertyOptional({
    example: 'task-uuid',
    description: 'ID of auto-created task if escalation created one',
  })
  @Column({ type: 'uuid', nullable: true })
  auto_created_task_id: string | null;
}
