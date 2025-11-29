import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Nomenclature } from '../../nomenclature/entities/nomenclature.entity';
import { User } from '../../users/entities/user.entity';
import { InventoryActualCount, InventoryLevelType } from './inventory-actual-count.entity';

/**
 * Статусы корректировки остатков
 */
export enum AdjustmentStatus {
  PENDING = 'pending', // Ожидает рассмотрения
  APPROVED = 'approved', // Одобрено
  REJECTED = 'rejected', // Отклонено
  APPLIED = 'applied', // Применено к инвентарю
  CANCELLED = 'cancelled', // Отменено
}

/**
 * Причины корректировки
 */
export enum AdjustmentReason {
  INVENTORY_DIFFERENCE = 'inventory_difference', // Расхождение при инвентаризации
  DAMAGE = 'damage', // Повреждение товара
  THEFT = 'theft', // Кража
  EXPIRY = 'expiry', // Истечение срока годности
  RETURN = 'return', // Возврат
  CORRECTION = 'correction', // Исправление ошибки
  OTHER = 'other', // Другое
}

/**
 * InventoryAdjustment Entity
 *
 * Корректировки остатков товаров с workflow согласования
 * REQ-STK-ADJ-01: Создание корректировок на основе расхождений
 * REQ-STK-ADJ-02: Workflow согласования корректировок
 * REQ-STK-ADJ-03: Применение корректировок к остаткам
 */
@Entity('inventory_adjustments')
@Index(['status'])
@Index(['nomenclature_id'])
@Index(['level_type', 'level_ref_id'])
@Index(['created_by_user_id'])
@Index(['approved_by_user_id'])
export class InventoryAdjustment extends BaseEntity {
  // Связь с товаром
  @Column({ type: 'uuid' })
  nomenclature_id: string;

  @ManyToOne(() => Nomenclature, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'nomenclature_id' })
  nomenclature: Nomenclature;

  // Уровень учёта (WAREHOUSE, OPERATOR, MACHINE)
  @Column({
    type: 'enum',
    enum: InventoryLevelType,
  })
  level_type: InventoryLevelType;

  // ID объекта уровня (warehouse_id, operator_id, machine_id)
  @Column({ type: 'uuid' })
  level_ref_id: string;

  // Связь с замером (если корректировка на основе инвентаризации)
  @Column({ type: 'uuid', nullable: true })
  actual_count_id: string | null;

  @ManyToOne(() => InventoryActualCount, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actual_count_id' })
  actual_count: InventoryActualCount | null;

  // Старое количество (текущее в системе)
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  old_quantity: number;

  // Новое количество (после корректировки)
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  new_quantity: number;

  // Разница (new - old)
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  adjustment_quantity: number;

  // Причина корректировки
  @Column({
    type: 'enum',
    enum: AdjustmentReason,
  })
  reason: AdjustmentReason;

  // Комментарий/описание
  @Column({ type: 'text', nullable: true })
  comment: string | null;

  // Статус корректировки
  @Column({
    type: 'enum',
    enum: AdjustmentStatus,
    default: AdjustmentStatus.PENDING,
  })
  status: AdjustmentStatus;

  // Требует ли согласования
  @Column({ type: 'boolean', default: true })
  requires_approval: boolean;

  // Кто создал корректировку
  @Column({ type: 'uuid' })
  created_by_user_id: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_user_id' })
  created_by: User;

  // Кто одобрил/отклонил
  @Column({ type: 'uuid', nullable: true })
  approved_by_user_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by_user_id' })
  approved_by: User | null;

  // Дата одобрения/отклонения
  @Column({ type: 'timestamp', nullable: true })
  approved_at: Date | null;

  // Дата применения корректировки
  @Column({ type: 'timestamp', nullable: true })
  applied_at: Date | null;

  // Дополнительные метаданные
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
