import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { EquipmentComponent, ComponentLocationType } from './equipment-component.entity';
import { Machine } from '../../machines/entities/machine.entity';
import { User } from '../../users/entities/user.entity';
import { Task } from '../../tasks/entities/task.entity';

export enum MovementType {
  INSTALL = 'install', // Установка в машину
  REMOVE = 'remove', // Снятие с машины
  SEND_TO_WASH = 'send_to_wash', // Отправка на мойку
  RETURN_FROM_WASH = 'return_from_wash', // Возврат с мойки
  SEND_TO_DRYING = 'send_to_drying', // Отправка на сушку
  RETURN_FROM_DRYING = 'return_from_drying', // Возврат с сушки
  MOVE_TO_WAREHOUSE = 'move_to_warehouse', // Перемещение на склад
  MOVE_TO_MACHINE = 'move_to_machine', // Перемещение к машине (для установки)
  SEND_TO_REPAIR = 'send_to_repair', // Отправка в ремонт
  RETURN_FROM_REPAIR = 'return_from_repair', // Возврат из ремонта
}

/**
 * История перемещений компонентов (REQ-ASSET-11)
 *
 * Отслеживает все перемещения компонентов между локациями:
 * - Машина → Склад/Мойка/Ремонт
 * - Склад → Машина
 * - Мойка → Сушка → Склад
 */
@Entity('component_movements')
@Index(['component_id'])
@Index(['moved_at'])
@Index(['movement_type'])
@Index(['related_machine_id'])
@Index(['task_id'])
export class ComponentMovement extends BaseEntity {
  @Column({ type: 'uuid' })
  component_id: string;

  @ManyToOne(() => EquipmentComponent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'component_id' })
  component: EquipmentComponent;

  // From location
  @Column({ type: 'enum', enum: ComponentLocationType })
  from_location_type: ComponentLocationType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  from_location_ref: string | null;

  // To location
  @Column({ type: 'enum', enum: ComponentLocationType })
  to_location_type: ComponentLocationType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  to_location_ref: string | null;

  // Movement type
  @Column({ type: 'enum', enum: MovementType })
  movement_type: MovementType;

  // Related machine (if movement involves a machine)
  @Column({ type: 'uuid', nullable: true })
  related_machine_id: string | null;

  @ManyToOne(() => Machine, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'related_machine_id' })
  related_machine: Machine | null;

  // Related task (if movement is part of a task)
  @Column({ type: 'uuid', nullable: true })
  task_id: string | null;

  @ManyToOne(() => Task, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'task_id' })
  task: Task | null;

  // Performed by
  @Column({ type: 'uuid', nullable: true })
  performed_by_user_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'performed_by_user_id' })
  performed_by: User | null;

  // When
  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  moved_at: Date;

  // Additional info
  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
