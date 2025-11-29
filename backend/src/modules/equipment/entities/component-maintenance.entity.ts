import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { EquipmentComponent } from './equipment-component.entity';
import { User } from '../../users/entities/user.entity';

export enum MaintenanceType {
  CLEANING = 'cleaning', // Мойка/чистка
  INSPECTION = 'inspection', // Осмотр/проверка
  REPAIR = 'repair', // Ремонт
  REPLACEMENT = 'replacement', // Замена
  CALIBRATION = 'calibration', // Калибровка
  SOFTWARE_UPDATE = 'software_update', // Обновление ПО
  PREVENTIVE = 'preventive', // Профилактика
  OTHER = 'other',
}

@Entity('component_maintenance')
@Index(['component_id'])
@Index(['performed_at'])
@Index(['maintenance_type'])
export class ComponentMaintenance extends BaseEntity {
  @Column({ type: 'uuid' })
  component_id: string;

  @ManyToOne(() => EquipmentComponent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'component_id' })
  component: EquipmentComponent;

  @Column({ type: 'enum', enum: MaintenanceType })
  maintenance_type: MaintenanceType;

  @Column({ type: 'uuid' })
  performed_by_user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'performed_by_user_id' })
  performed_by: User;

  @Column({ type: 'timestamp with time zone' })
  performed_at: Date;

  @Column({ type: 'text' })
  description: string; // Описание выполненных работ

  // Spare parts used
  @Column({ type: 'jsonb', nullable: true })
  spare_parts_used: Array<{
    spare_part_id: string;
    quantity: number;
    part_number: string;
    name: string;
  }> | null;

  // Cost tracking
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  labor_cost: number; // Стоимость работ

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  parts_cost: number; // Стоимость запчастей

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_cost: number; // Общая стоимость

  // Duration
  @Column({ type: 'integer', nullable: true })
  duration_minutes: number | null; // Длительность работ (минуты)

  // Result and follow-up
  @Column({ type: 'text', nullable: true })
  result: string | null; // Результат обслуживания

  @Column({ type: 'boolean', default: true })
  is_successful: boolean; // Успешно ли выполнено

  @Column({ type: 'date', nullable: true })
  next_maintenance_date: Date | null; // Рекомендуемая дата следующего обслуживания

  // Documentation
  @Column({ type: 'simple-array', nullable: true })
  photo_urls: string[] | null; // Фотографии

  @Column({ type: 'simple-array', nullable: true })
  document_urls: string[] | null; // Документы (акты, чеки)

  // Related task
  @Column({ type: 'uuid', nullable: true })
  task_id: string | null; // Связанная задача

  // Additional info
  @Column({ type: 'text', nullable: true })
  notes: string | null; // Примечания

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null; // Дополнительные данные
}
