import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Threshold Type
 * Тип порога расхождений
 */
export enum ThresholdType {
  NOMENCLATURE = 'NOMENCLATURE', // По конкретному товару
  CATEGORY = 'CATEGORY', // По категории товаров
  LOCATION = 'LOCATION', // По локации
  MACHINE = 'MACHINE', // По конкретному аппарату
  OPERATOR = 'OPERATOR', // По оператору
  GLOBAL = 'GLOBAL', // Глобальный (по умолчанию)
}

/**
 * Severity Level
 * Уровень серьёзности расхождения
 */
export enum SeverityLevel {
  INFO = 'INFO', // Информационное
  WARNING = 'WARNING', // Предупреждение
  CRITICAL = 'CRITICAL', // Критическое
}

/**
 * Inventory Difference Threshold Entity
 * Пороги расхождений инвентаря
 *
 * REQ-STK-CALC-04, REQ-ANL-05: Настройка порогов для расхождений
 * REQ-ANL-06: Действия при превышении порогов
 *
 * Используется для:
 * - Определения допустимых расхождений
 * - Автоматической подсветки критических расхождений
 * - Триггеринга действий (создание инцидентов, задач, уведомлений)
 */
@Entity('inventory_difference_thresholds')
@Index(['threshold_type'])
@Index(['reference_id'])
@Index(['is_active'])
@Index(['priority', 'is_active'])
export class InventoryDifferenceThreshold extends BaseEntity {
  @ApiProperty({
    enum: ThresholdType,
    example: ThresholdType.NOMENCLATURE,
    description: 'Тип порога',
  })
  @Column({ type: 'enum', enum: ThresholdType })
  threshold_type: ThresholdType;

  @ApiProperty({
    example: 'uuid',
    description: 'ID объекта (nomenclature, location, machine, operator) или NULL для GLOBAL',
    required: false,
  })
  @Column({ type: 'uuid', nullable: true })
  reference_id: string | null;

  @ApiProperty({
    example: 'Критический порог для скоропортящихся товаров',
    description: 'Название правила',
  })
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @ApiProperty({
    example: 50.0,
    description: 'Абсолютное значение порога (если NULL - не применяется)',
    required: false,
  })
  @Column({ type: 'decimal', precision: 15, scale: 3, nullable: true })
  threshold_abs: number | null;

  @ApiProperty({
    example: 10.0,
    description: 'Относительное значение порога в процентах (если NULL - не применяется)',
    required: false,
  })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  threshold_rel: number | null;

  @ApiProperty({
    enum: SeverityLevel,
    example: SeverityLevel.WARNING,
    description: 'Уровень серьёзности при превышении',
  })
  @Column({ type: 'enum', enum: SeverityLevel, default: SeverityLevel.WARNING })
  severity_level: SeverityLevel;

  @ApiProperty({
    example: false,
    description: 'Создавать ли инцидент при превышении',
  })
  @Column({ type: 'boolean', default: false })
  create_incident: boolean;

  @ApiProperty({
    example: true,
    description: 'Создавать ли задачу на разбор при превышении',
  })
  @Column({ type: 'boolean', default: false })
  create_task: boolean;

  @ApiProperty({
    example: ['uuid1', 'uuid2'],
    description: 'Список user_id для уведомлений',
    required: false,
  })
  @Column({ type: 'jsonb', nullable: true })
  notify_users: string[] | null;

  @ApiProperty({
    example: ['ADMIN', 'MANAGER'],
    description: 'Список ролей для уведомлений',
    required: false,
  })
  @Column({ type: 'jsonb', nullable: true })
  notify_roles: string[] | null;

  @ApiProperty({ example: true, description: 'Активен ли порог' })
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @ApiProperty({
    example: 10,
    description: 'Приоритет применения (больше = выше приоритет)',
  })
  @Column({ type: 'integer', default: 0 })
  priority: number;

  @ApiProperty({
    example: 'Применяется к товарам с коротким сроком годности',
    description: 'Описание правила',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({
    example: 'uuid',
    description: 'Пользователь, создавший правило',
    required: false,
  })
  @Column({ type: 'uuid', nullable: true })
  created_by_user_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_user_id' })
  created_by: User | null;
}
