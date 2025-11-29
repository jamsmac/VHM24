import { Entity, Column, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Nomenclature } from '../../nomenclature/entities/nomenclature.entity';

/**
 * Инвентарь на складе (уровень 1)
 * Общий запас товаров/ингредиентов на центральном складе
 */
@Entity('warehouse_inventory')
@Unique(['nomenclature_id'])
@Index(['nomenclature_id'])
export class WarehouseInventory extends BaseEntity {
  @ApiProperty({ example: 'uuid', description: 'ID товара/ингредиента' })
  @Column({ type: 'uuid' })
  nomenclature_id: string;

  @ManyToOne(() => Nomenclature, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'nomenclature_id' })
  nomenclature: Nomenclature;

  @ApiProperty({ example: 150.5, description: 'Текущее количество на складе' })
  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  current_quantity: number;

  @ApiProperty({
    example: 10.5,
    description: 'Зарезервированное количество (для задач)',
  })
  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  reserved_quantity: number;

  @ApiProperty({
    example: 20,
    description: 'Минимальный уровень запаса (для уведомлений)',
  })
  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  min_stock_level: number;

  @ApiProperty({
    example: 200,
    description: 'Максимальный уровень запаса',
  })
  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  max_stock_level: number | null;

  @ApiProperty({
    example: '2025-01-15',
    description: 'Дата последнего поступления',
  })
  @Column({ type: 'timestamp with time zone', nullable: true })
  last_restocked_at: Date | null;

  @ApiProperty({ example: 'Основной склад, стеллаж A-12' })
  @Column({ type: 'varchar', length: 200, nullable: true })
  location_in_warehouse: string | null;

  /**
   * Вычисляемое свойство: доступное количество для использования
   * (текущее количество минус зарезервированное)
   */
  @ApiProperty({
    example: 140,
    description: 'Доступное количество (current_quantity - reserved_quantity)',
  })
  get available_quantity(): number {
    return Number(this.current_quantity) - Number(this.reserved_quantity);
  }
}
