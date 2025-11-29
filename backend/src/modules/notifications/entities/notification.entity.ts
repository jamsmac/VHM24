import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Тип уведомления (из справочника notification_types)
 */
export enum NotificationType {
  TASK_ASSIGNED = 'task_assigned',
  TASK_COMPLETED = 'task_completed',
  TASK_OVERDUE = 'task_overdue',
  LOW_STOCK_WAREHOUSE = 'low_stock_warehouse',
  LOW_STOCK_MACHINE = 'low_stock_machine',
  MACHINE_ERROR = 'machine_error',
  INCIDENT_CREATED = 'incident_created',
  COMPLAINT_RECEIVED = 'complaint_received',
  DAILY_REPORT = 'daily_report',
  SYSTEM_ALERT = 'system_alert',
  // Equipment notifications
  COMPONENT_NEEDS_MAINTENANCE = 'component_needs_maintenance',
  COMPONENT_NEARING_LIFETIME = 'component_nearing_lifetime',
  SPARE_PART_LOW_STOCK = 'spare_part_low_stock',
  WASHING_OVERDUE = 'washing_overdue',
  WASHING_UPCOMING = 'washing_upcoming',
  OTHER = 'other',
}

/**
 * Канал доставки уведомления
 */
export enum NotificationChannel {
  TELEGRAM = 'telegram',
  EMAIL = 'email',
  SMS = 'sms',
  WEB_PUSH = 'web_push',
  IN_APP = 'in_app',
}

/**
 * Статус доставки уведомления
 */
export enum NotificationStatus {
  PENDING = 'pending', // Ожидает отправки
  SENT = 'sent', // Отправлено
  DELIVERED = 'delivered', // Доставлено
  READ = 'read', // Прочитано
  FAILED = 'failed', // Ошибка доставки
}

/**
 * Приоритет уведомления
 */
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Уведомление
 */
@Entity('notifications')
@Index(['recipient_id'])
@Index(['type'])
@Index(['channel'])
@Index(['status'])
@Index(['created_at'])
export class Notification extends BaseEntity {
  @ApiProperty({ enum: NotificationType, example: NotificationType.TASK_ASSIGNED })
  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @ApiProperty({ enum: NotificationChannel, example: NotificationChannel.TELEGRAM })
  @Column({ type: 'enum', enum: NotificationChannel })
  channel: NotificationChannel;

  @ApiProperty({ enum: NotificationStatus, default: NotificationStatus.PENDING })
  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @ApiProperty({ enum: NotificationPriority, default: NotificationPriority.NORMAL })
  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  priority: NotificationPriority;

  @ApiProperty({ example: 'uuid', description: 'ID получателя' })
  @Column({ type: 'uuid' })
  recipient_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  @ApiProperty({ example: 'Новая задача назначена', description: 'Заголовок' })
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiProperty({
    example: 'Вам назначена задача пополнения для аппарата M-001',
    description: 'Текст уведомления',
  })
  @Column({ type: 'text' })
  message: string;

  @ApiProperty({
    example: { task_id: 'uuid', machine_id: 'uuid' },
    description: 'Дополнительные данные',
  })
  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, any> | null;

  @ApiProperty({
    example: '/tasks/uuid',
    description: 'Ссылка для перехода',
  })
  @Column({ type: 'varchar', length: 500, nullable: true })
  action_url: string | null;

  @ApiProperty({
    example: '2025-11-14T10:00:00Z',
    description: 'Дата отправки',
  })
  @Column({ type: 'timestamp with time zone', nullable: true })
  sent_at: Date | null;

  @ApiProperty({
    example: '2025-11-14T10:00:05Z',
    description: 'Дата доставки',
  })
  @Column({ type: 'timestamp with time zone', nullable: true })
  delivered_at: Date | null;

  @ApiProperty({
    example: '2025-11-14T10:05:00Z',
    description: 'Дата прочтения',
  })
  @Column({ type: 'timestamp with time zone', nullable: true })
  read_at: Date | null;

  @ApiProperty({
    example: 'Message sent successfully',
    description: 'Ответ от провайдера доставки',
  })
  @Column({ type: 'text', nullable: true })
  delivery_response: string | null;

  @ApiProperty({
    example: 'Network timeout',
    description: 'Сообщение об ошибке',
  })
  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  @ApiProperty({
    example: 3,
    description: 'Количество попыток отправки',
  })
  @Column({ type: 'integer', default: 0 })
  retry_count: number;

  @ApiProperty({
    example: '2025-11-14T10:30:00Z',
    description: 'Следующая попытка отправки (для failed)',
  })
  @Column({ type: 'timestamp with time zone', nullable: true })
  next_retry_at: Date | null;
}
