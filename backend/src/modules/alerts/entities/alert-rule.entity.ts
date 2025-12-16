import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Alert metric types - what we're monitoring
 */
export enum AlertMetric {
  LOW_STOCK_PERCENTAGE = 'low_stock_percentage',
  MACHINE_ERROR_COUNT = 'machine_error_count',
  TASK_OVERDUE_HOURS = 'task_overdue_hours',
  INCIDENT_COUNT = 'incident_count',
  COLLECTION_DUE_DAYS = 'collection_due_days',
  COMPONENT_LIFETIME_PERCENTAGE = 'component_lifetime_percentage',
  WASHING_OVERDUE_DAYS = 'washing_overdue_days',
  DAILY_SALES_DROP_PERCENTAGE = 'daily_sales_drop_percentage',
  MACHINE_OFFLINE_HOURS = 'machine_offline_hours',
  SPARE_PART_LOW_STOCK = 'spare_part_low_stock',
}

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
  EMERGENCY = 'emergency',
}

/**
 * Comparison operators for alert thresholds
 */
export enum AlertOperator {
  GREATER_THAN = '>',
  LESS_THAN = '<',
  GREATER_THAN_OR_EQUAL = '>=',
  LESS_THAN_OR_EQUAL = '<=',
  EQUAL = '==',
  NOT_EQUAL = '!=',
}

/**
 * Alert Rule Entity
 *
 * Defines the conditions under which alerts should be triggered.
 * Supports thresholds, operators, cooldown periods, and escalation.
 */
@Entity('alert_rules')
@Index(['metric'])
@Index(['severity'])
@Index(['is_enabled'])
@Index(['created_by_id'])
export class AlertRule extends BaseEntity {
  @ApiProperty({ example: 'Low Stock Alert' })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiPropertyOptional({
    example: 'Triggers when machine stock falls below threshold',
  })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({ enum: AlertMetric, example: AlertMetric.LOW_STOCK_PERCENTAGE })
  @Column({ type: 'enum', enum: AlertMetric })
  metric: AlertMetric;

  @ApiProperty({ enum: AlertOperator, example: AlertOperator.LESS_THAN })
  @Column({ type: 'enum', enum: AlertOperator })
  operator: AlertOperator;

  @ApiProperty({ example: 20, description: 'Threshold value for comparison' })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  threshold: number;

  @ApiProperty({ enum: AlertSeverity, example: AlertSeverity.WARNING })
  @Column({ type: 'enum', enum: AlertSeverity, default: AlertSeverity.WARNING })
  severity: AlertSeverity;

  @ApiProperty({ example: true })
  @Column({ type: 'boolean', default: true })
  is_enabled: boolean;

  @ApiProperty({
    example: 60,
    description: 'Cooldown period in minutes before re-alerting',
  })
  @Column({ type: 'integer', default: 60 })
  cooldown_minutes: number;

  @ApiPropertyOptional({
    example: { machine_ids: ['uuid1', 'uuid2'], location_ids: ['uuid3'] },
    description: 'Scope filters - which machines/locations this rule applies to',
  })
  @Column({ type: 'jsonb', nullable: true })
  scope_filters: {
    machine_ids?: string[];
    location_ids?: string[];
    machine_types?: string[];
  } | null;

  @ApiPropertyOptional({
    example: ['user-uuid-1', 'user-uuid-2'],
    description: 'User IDs to notify when alert triggers',
  })
  @Column({ type: 'jsonb', nullable: true })
  notify_user_ids: string[] | null;

  @ApiPropertyOptional({
    example: ['ADMIN', 'MANAGER'],
    description: 'Roles to notify when alert triggers',
  })
  @Column({ type: 'jsonb', nullable: true })
  notify_roles: string[] | null;

  @ApiPropertyOptional({
    example: ['telegram', 'email'],
    description: 'Notification channels to use',
  })
  @Column({ type: 'jsonb', nullable: true })
  notification_channels: string[] | null;

  @ApiPropertyOptional({
    example: 30,
    description: 'Minutes before escalation if not acknowledged',
  })
  @Column({ type: 'integer', nullable: true })
  escalation_minutes: number | null;

  @ApiPropertyOptional({
    example: { escalation_roles: ['ADMIN'], auto_create_task: true },
    description: 'Escalation configuration',
  })
  @Column({ type: 'jsonb', nullable: true })
  escalation_config: {
    escalation_roles?: string[];
    escalation_user_ids?: string[];
    auto_create_task?: boolean;
    task_type?: string;
  } | null;

  @ApiPropertyOptional({ description: 'Last time this rule triggered an alert' })
  @Column({ type: 'timestamp with time zone', nullable: true })
  last_triggered_at: Date | null;

  @ApiProperty({ example: 0, description: 'Total number of times this rule has triggered' })
  @Column({ type: 'integer', default: 0 })
  trigger_count: number;

  // Relations
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  created_by: User | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'updated_by_id' })
  updated_by: User | null;
}
