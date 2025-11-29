import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Nomenclature } from '../../nomenclature/entities/nomenclature.entity';
import { User } from '../../users/entities/user.entity';
import { Machine } from '../../machines/entities/machine.entity';

/**
 * Тип перемещения инвентаря
 */
export enum MovementType {
  // Поступления на склад
  WAREHOUSE_IN = 'warehouse_in', // Приход на склад (закупка)
  WAREHOUSE_OUT = 'warehouse_out', // Списание со склада

  // Перемещения: склад -> оператор
  WAREHOUSE_TO_OPERATOR = 'warehouse_to_operator', // Выдача оператору

  // Перемещения: оператор -> склад
  OPERATOR_TO_WAREHOUSE = 'operator_to_warehouse', // Возврат на склад

  // Перемещения: оператор -> аппарат
  OPERATOR_TO_MACHINE = 'operator_to_machine', // Пополнение аппарата

  // Перемещения: аппарат -> оператор
  MACHINE_TO_OPERATOR = 'machine_to_operator', // Изъятие из аппарата (просрочка, брак)

  // Продажи/использование
  MACHINE_SALE = 'machine_sale', // Продажа из аппарата (расход на продукцию)

  // Корректировки
  ADJUSTMENT = 'adjustment', // Инвентаризация, корректировка
  WRITE_OFF = 'write_off', // Списание (брак, просрочка)

  // Резервирование
  WAREHOUSE_RESERVATION = 'warehouse_reservation', // Резервирование на складе
  WAREHOUSE_RESERVATION_RELEASE = 'warehouse_reservation_release', // Освобождение резервирования
}

/**
 * Движение инвентаря
 * Отслеживает все перемещения товаров/ингредиентов между уровнями
 */
@Entity('inventory_movements')
@Index(['movement_type'])
@Index(['nomenclature_id'])
@Index(['task_id'])
@Index(['operator_id'])
@Index(['machine_id'])
@Index(['created_at'])
@Index(['operation_date']) // Для фильтрации по дате фактической операции
export class InventoryMovement extends BaseEntity {
  @ApiProperty({ enum: MovementType, example: MovementType.WAREHOUSE_TO_OPERATOR })
  @Column({ type: 'enum', enum: MovementType })
  movement_type: MovementType;

  @ApiProperty({ example: 'uuid', description: 'ID товара/ингредиента' })
  @Column({ type: 'uuid' })
  nomenclature_id: string;

  @ManyToOne(() => Nomenclature, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'nomenclature_id' })
  nomenclature: Nomenclature;

  @ApiProperty({ example: 10.5, description: 'Количество' })
  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity: number;

  @ApiProperty({ example: 'uuid', description: 'ID пользователя, выполнившего действие' })
  @Column({ type: 'uuid', nullable: true })
  performed_by_user_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', eager: false })
  @JoinColumn({ name: 'performed_by_user_id' })
  performed_by: User | null;

  // Опциональные связи в зависимости от типа движения

  @ApiProperty({
    example: 'uuid',
    description: 'ID оператора (для движений связанных с оператором)',
  })
  @Column({ type: 'uuid', nullable: true })
  operator_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'operator_id' })
  operator: User | null;

  @ApiProperty({
    example: 'uuid',
    description: 'ID аппарата (для движений связанных с аппаратом)',
  })
  @Column({ type: 'uuid', nullable: true })
  machine_id: string | null;

  @ManyToOne(() => Machine, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine | null;

  @ApiProperty({
    example: 'uuid',
    description: 'ID задачи (если движение связано с задачей)',
  })
  @Column({ type: 'uuid', nullable: true })
  task_id: string | null;

  @ApiProperty({
    example: '2025-11-15T14:30:00Z',
    description:
      'Дата фактического выполнения операции (может отличаться от created_at при вводе исторических данных)',
  })
  @Column({ type: 'timestamp with time zone', nullable: true })
  operation_date: Date | null;

  @ApiProperty({
    example: 'Пополнение аппарата M-001 по задаче #123',
    description: 'Описание движения',
  })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty({
    example: { purchase_price: 150.5, invoice_number: 'INV-2024-001' },
    description: 'Дополнительные метаданные',
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
