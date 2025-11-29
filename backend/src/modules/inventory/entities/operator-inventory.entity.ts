import { Entity, Column, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Nomenclature } from '../../nomenclature/entities/nomenclature.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Инвентарь оператора (уровень 2)
 * Товары/ингредиенты, которые оператор взял со склада для пополнения аппаратов
 */
@Entity('operator_inventory')
@Unique(['operator_id', 'nomenclature_id'])
@Index(['operator_id'])
@Index(['nomenclature_id'])
export class OperatorInventory extends BaseEntity {
  @ApiProperty({ example: 'uuid', description: 'ID оператора' })
  @Column({ type: 'uuid' })
  operator_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'operator_id' })
  operator: User;

  @ApiProperty({ example: 'uuid', description: 'ID товара/ингредиента' })
  @Column({ type: 'uuid' })
  nomenclature_id: string;

  @ManyToOne(() => Nomenclature, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'nomenclature_id' })
  nomenclature: Nomenclature;

  @ApiProperty({
    example: 25.5,
    description: 'Текущее количество у оператора',
  })
  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  current_quantity: number;

  @ApiProperty({
    example: 5.5,
    description: 'Зарезервированное количество (для задач)',
  })
  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  reserved_quantity: number;

  @ApiProperty({
    example: '2025-11-14T10:00:00Z',
    description: 'Дата последнего получения со склада',
  })
  @Column({ type: 'timestamp with time zone', nullable: true })
  last_received_at: Date | null;

  @ApiProperty({
    example: 'uuid',
    description: 'ID последней задачи, в которой использовался товар',
  })
  @Column({ type: 'uuid', nullable: true })
  last_task_id: string | null;

  /**
   * Вычисляемое свойство: доступное количество для использования
   * (текущее количество минус зарезервированное)
   */
  @ApiProperty({
    example: 20,
    description: 'Доступное количество (current_quantity - reserved_quantity)',
  })
  get available_quantity(): number {
    return Number(this.current_quantity) - Number(this.reserved_quantity);
  }
}
