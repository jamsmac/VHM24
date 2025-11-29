import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Nomenclature } from '../../nomenclature/entities/nomenclature.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Inventory Level Type
 * Определяет уровень учёта, на котором проводится инвентаризация
 */
export enum InventoryLevelType {
  WAREHOUSE = 'WAREHOUSE', // Склад
  OPERATOR = 'OPERATOR', // Оператор
  MACHINE = 'MACHINE', // Аппарат
}

/**
 * Inventory Actual Count Entity
 * Фактические остатки (инвентаризация)
 *
 * REQ-STK-CALC-02: Хранение фактических остатков по результатам инвентаризации
 *
 * Используется для:
 * - Записи фактически подсчитанных остатков
 * - Сравнения с расчётными остатками
 * - Выявления расхождений
 * - Корректировки учёта
 */
@Entity('inventory_actual_counts')
@Index(['nomenclature_id'])
@Index(['level_type', 'level_ref_id'])
@Index(['counted_at'])
@Index(['session_id'])
@Index(['nomenclature_id', 'level_type', 'level_ref_id', 'counted_at'])
export class InventoryActualCount extends BaseEntity {
  @ApiProperty({ example: 'uuid', description: 'ID товара/ингредиента' })
  @Column({ type: 'uuid' })
  nomenclature_id: string;

  @ManyToOne(() => Nomenclature, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'nomenclature_id' })
  nomenclature: Nomenclature;

  @ApiProperty({
    enum: InventoryLevelType,
    example: InventoryLevelType.WAREHOUSE,
    description: 'Уровень учёта',
  })
  @Column({ type: 'enum', enum: InventoryLevelType })
  level_type: InventoryLevelType;

  @ApiProperty({
    example: 'uuid',
    description: 'ID объекта (warehouse_id, operator_id или machine_id)',
  })
  @Column({ type: 'uuid' })
  level_ref_id: string;

  @ApiProperty({
    example: '2025-11-20T10:30:00Z',
    description: 'Дата и время фактического замера',
  })
  @Column({ type: 'timestamp with time zone' })
  counted_at: Date;

  @ApiProperty({ example: 'uuid', description: 'Пользователь, проводивший инвентаризацию' })
  @Column({ type: 'uuid' })
  counted_by_user_id: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'counted_by_user_id' })
  counted_by: User;

  @ApiProperty({ example: 150.5, description: 'Фактическое количество' })
  @Column({ type: 'decimal', precision: 15, scale: 3 })
  actual_quantity: number;

  @ApiProperty({ example: 'шт', description: 'Единица измерения', required: false })
  @Column({ type: 'varchar', length: 50, nullable: true })
  unit_of_measure: string | null;

  @ApiProperty({
    example: 'Проведена инвентаризация основного склада',
    description: 'Примечания к замеру',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty({
    example: 'uuid',
    description: 'ID сессии инвентаризации (для группировки)',
    required: false,
  })
  @Column({ type: 'uuid', nullable: true })
  session_id: string | null;

  @ApiProperty({
    example: { photos: ['photo1.jpg'], location: { lat: 41.2, lon: 69.2 } },
    description: 'Дополнительные метаданные',
    required: false,
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
