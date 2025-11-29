import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Task } from './task.entity';
import { Nomenclature } from '../../nomenclature/entities/nomenclature.entity';

@Entity('task_items')
@Index(['task_id'])
@Index(['nomenclature_id'])
export class TaskItem extends BaseEntity {
  @Column({ type: 'uuid' })
  task_id: string;

  @ManyToOne(() => Task, (task) => task.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ type: 'uuid' })
  nomenclature_id: string;

  @ManyToOne(() => Nomenclature, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'nomenclature_id' })
  nomenclature: Nomenclature;

  // Planned quantity
  @Column({ type: 'decimal', precision: 10, scale: 3 })
  planned_quantity: number;

  // Actual quantity (filled during task execution)
  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  actual_quantity: number | null;

  @Column({ type: 'varchar', length: 50 })
  unit_of_measure_code: string; // from dictionaries

  // Notes for this specific item
  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
