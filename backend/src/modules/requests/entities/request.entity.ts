import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { RequestItem } from './request-item.entity';

/**
 * Статусы заявки на материалы.
 */
export enum RequestStatus {
  NEW = 'new', // Новая заявка
  APPROVED = 'approved', // Одобрена менеджером
  REJECTED = 'rejected', // Отклонена
  SENT = 'sent', // Отправлена поставщику
  PARTIAL_DELIVERED = 'partial_delivered', // Частично доставлено
  COMPLETED = 'completed', // Выполнена (товар получен)
  CANCELLED = 'cancelled', // Отменена
}

/**
 * Приоритет заявки.
 */
export enum RequestPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Request entity - заявка на материалы.
 *
 * Создается операторами через Telegram бот или веб-интерфейс.
 * Проходит через workflow: NEW → APPROVED → SENT → COMPLETED
 */
@Entity('material_requests')
@Index(['status'])
@Index(['created_by_user_id'])
@Index(['approved_by_user_id'])
@Index(['priority'])
@Index(['request_number'], { unique: true })
export class Request extends BaseEntity {
  /**
   * Номер заявки (генерируется автоматически).
   * Формат: REQ-YYYY-NNNNNN
   */
  @Column({ type: 'varchar', length: 50, unique: true })
  request_number: string;

  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.NEW,
  })
  status: RequestStatus;

  @Column({
    type: 'enum',
    enum: RequestPriority,
    default: RequestPriority.NORMAL,
  })
  priority: RequestPriority;

  // Creator
  @Column({ type: 'uuid' })
  created_by_user_id: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  created_by: User;

  // Approval
  @Column({ type: 'uuid', nullable: true })
  approved_by_user_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by_user_id' })
  approved_by: User | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  approved_at: Date | null;

  // Rejection
  @Column({ type: 'uuid', nullable: true })
  rejected_by_user_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rejected_by_user_id' })
  rejected_by: User | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  rejected_at: Date | null;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  // Sent to supplier
  @Column({ type: 'timestamp with time zone', nullable: true })
  sent_at: Date | null;

  /**
   * Telegram message ID при отправке поставщику.
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  sent_message_id: string | null;

  // Completion
  @Column({ type: 'timestamp with time zone', nullable: true })
  completed_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  completed_by_user_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'completed_by_user_id' })
  completed_by: User | null;

  // Comments and notes
  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'text', nullable: true })
  admin_notes: string | null;

  @Column({ type: 'text', nullable: true })
  completion_notes: string | null;

  /**
   * Желаемая дата доставки.
   */
  @Column({ type: 'date', nullable: true })
  desired_delivery_date: Date | null;

  /**
   * Фактическая дата доставки.
   */
  @Column({ type: 'date', nullable: true })
  actual_delivery_date: Date | null;

  /**
   * Общая сумма заявки (расчётная).
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  total_amount: number | null;

  // Relations
  @OneToMany(() => RequestItem, (item) => item.request, { cascade: true })
  items: RequestItem[];

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
