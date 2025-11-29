import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Machine } from '../../machines/entities/machine.entity';
import { User } from '../../users/entities/user.entity';
import { TaskItem } from './task-item.entity';
import { TaskComment } from './task-comment.entity';
import { TaskComponent } from './task-component.entity';

export enum TaskType {
  REFILL = 'refill', // Пополнение
  COLLECTION = 'collection', // Инкассация
  CLEANING = 'cleaning', // Мойка
  REPAIR = 'repair', // Ремонт
  INSTALL = 'install', // Установка
  REMOVAL = 'removal', // Снятие
  AUDIT = 'audit', // Ревизия
  INSPECTION = 'inspection', // Осмотр
  REPLACE_HOPPER = 'replace_hopper', // Замена бункера
  REPLACE_GRINDER = 'replace_grinder', // Замена гриндера
  REPLACE_BREW_UNIT = 'replace_brew_unit', // Замена варочного блока
  REPLACE_MIXER = 'replace_mixer', // Замена миксера
}

export enum TaskStatus {
  PENDING = 'pending', // Ожидает
  ASSIGNED = 'assigned', // Назначена
  IN_PROGRESS = 'in_progress', // Выполняется
  COMPLETED = 'completed', // Завершена
  REJECTED = 'rejected', // Отклонена админом
  POSTPONED = 'postponed', // Отложена
  CANCELLED = 'cancelled', // Отменена
}

export enum TaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('tasks')
@Index(['machine_id'])
@Index(['assigned_to_user_id'])
@Index(['created_by_user_id'])
@Index(['type_code', 'status'])
@Index(['due_date'])
@Index(['pending_photos']) // Для поиска задач с незагруженными фото
export class Task extends BaseEntity {
  @Column({
    type: 'enum',
    enum: TaskType,
  })
  type_code: TaskType;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.PENDING,
  })
  status: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriority,
    default: TaskPriority.NORMAL,
  })
  priority: TaskPriority;

  @Column({ type: 'uuid' })
  machine_id: string;

  @ManyToOne(() => Machine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @Column({ type: 'uuid', nullable: true })
  assigned_to_user_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to_user_id' })
  assigned_to: User | null;

  @Column({ type: 'uuid' })
  created_by_user_id: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  created_by: User;

  // Scheduling
  @Column({ type: 'timestamp with time zone', nullable: true })
  scheduled_date: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  due_date: Date | null;

  // Execution tracking
  @Column({ type: 'timestamp with time zone', nullable: true })
  started_at: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completed_at: Date | null;

  // Offline support: когда операция фактически выполнена (может отличаться от completed_at)
  @Column({ type: 'timestamp with time zone', nullable: true })
  operation_date: Date | null;

  // Description and notes
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'text', nullable: true })
  completion_notes: string | null;

  @Column({ type: 'text', nullable: true })
  postpone_reason: string | null;

  // Checklists (JSONB)
  @Column({ type: 'jsonb', nullable: true })
  checklist: Array<{
    item: string;
    completed: boolean;
  }> | null;

  // For COLLECTION tasks: денежные суммы
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  expected_cash_amount: number | null;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  actual_cash_amount: number | null;

  // Photo validation flags (updated by FilesService)
  @Column({ type: 'boolean', default: false })
  has_photo_before: boolean;

  @Column({ type: 'boolean', default: false })
  has_photo_after: boolean;

  // Offline mode support
  @Column({ type: 'boolean', default: false })
  pending_photos: boolean; // Задача завершена, но фото еще не загружены

  @Column({ type: 'boolean', default: false })
  offline_completed: boolean; // Задача выполнена в офлайн-режиме

  // Rejection tracking
  @Column({ type: 'uuid', nullable: true })
  rejected_by_user_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'rejected_by_user_id' })
  rejected_by: User | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  rejected_at: Date | null;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  // Relations
  @OneToMany(() => TaskItem, (item) => item.task, {
    cascade: true,
  })
  items: TaskItem[];

  @OneToMany(() => TaskComment, (comment) => comment.task, {
    cascade: true,
  })
  comments: TaskComment[];

  @OneToMany(() => TaskComponent, (tc) => tc.task, {
    cascade: true,
  })
  components: TaskComponent[];

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
