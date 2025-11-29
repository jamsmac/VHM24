import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Task } from './task.entity';
import { EquipmentComponent } from '../../equipment/entities/equipment-component.entity';

export enum ComponentRole {
  OLD = 'old', // Старый компонент (который снимается)
  NEW = 'new', // Новый компонент (который устанавливается)
  TARGET = 'target', // Целевой компонент (для обслуживания/мойки)
}

/**
 * Связь задач с компонентами (REQ-TASK-21)
 *
 * Используется для задач типа REPLACE_*, CLEANING, REPAIR:
 * - REPLACE_*: указывается OLD (снимаемый) и NEW (устанавливаемый) компоненты
 * - CLEANING/REPAIR: указывается TARGET (обслуживаемый) компонент
 */
@Entity('task_components')
@Index(['task_id'])
@Index(['component_id'])
@Index(['role'])
export class TaskComponent extends BaseEntity {
  @Column({ type: 'uuid' })
  task_id: string;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ type: 'uuid' })
  component_id: string;

  @ManyToOne(() => EquipmentComponent, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'component_id' })
  component: EquipmentComponent;

  @Column({ type: 'enum', enum: ComponentRole })
  role: ComponentRole;

  // Additional info
  @Column({ type: 'text', nullable: true })
  notes: string | null; // Примечания (причина замены, состояние и т.п.)

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
