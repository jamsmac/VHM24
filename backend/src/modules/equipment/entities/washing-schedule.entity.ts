import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Machine } from '../../machines/entities/machine.entity';
import { ComponentType } from './equipment-component.entity';

export enum WashingFrequency {
  DAILY = 'daily', // Ежедневно
  WEEKLY = 'weekly', // Еженедельно
  BIWEEKLY = 'biweekly', // Раз в 2 недели
  MONTHLY = 'monthly', // Ежемесячно
  CUSTOM = 'custom', // Настраиваемый интервал
}

export enum WashingStatus {
  SCHEDULED = 'scheduled', // Запланирована
  OVERDUE = 'overdue', // Просрочена
  COMPLETED = 'completed', // Выполнена
  SKIPPED = 'skipped', // Пропущена
}

@Entity('washing_schedules')
@Index(['machine_id'])
@Index(['next_wash_date'])
export class WashingSchedule extends BaseEntity {
  @Column({ type: 'uuid' })
  machine_id: string;

  @ManyToOne(() => Machine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @Column({ type: 'varchar', length: 200 })
  name: string; // Название графика (напр. "Ежедневная мойка бункера")

  @Column({ type: 'enum', enum: WashingFrequency })
  frequency: WashingFrequency;

  @Column({ type: 'integer', nullable: true })
  interval_days: number | null; // Интервал в днях (для CUSTOM)

  @Column({ type: 'simple-array' })
  component_types: ComponentType[]; // Какие компоненты мыть

  @Column({ type: 'text', nullable: true })
  instructions: string | null; // Инструкция по мойке

  // Schedule tracking
  @Column({ type: 'date', nullable: true })
  last_wash_date: Date | null; // Дата последней мойки

  @Column({ type: 'date' })
  next_wash_date: Date; // Дата следующей мойки

  @Column({ type: 'uuid', nullable: true })
  last_washed_by_user_id: string | null; // Кто выполнил последнюю мойку

  @Column({ type: 'uuid', nullable: true })
  last_wash_task_id: string | null; // ID задачи последней мойки

  // Status and settings
  @Column({ type: 'boolean', default: true })
  is_active: boolean; // Активен ли график

  @Column({ type: 'boolean', default: false })
  auto_create_tasks: boolean; // Автоматически создавать задачи

  @Column({ type: 'integer', default: 1 })
  notification_days_before: number; // За сколько дней уведомлять

  // Cleaning materials
  @Column({ type: 'simple-array', nullable: true })
  required_materials: string[] | null; // Необходимые материалы (моющие средства)

  @Column({ type: 'integer', nullable: true })
  estimated_duration_minutes: number | null; // Ожидаемая длительность (минуты)

  // Additional info
  @Column({ type: 'text', nullable: true })
  notes: string | null; // Примечания

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null; // Дополнительные данные
}
