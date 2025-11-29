import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

/**
 * Типы бункеров (ингредиентов) для вендинговых автоматов (REQ-ASSET-BH-01)
 *
 * Классификация бункеров по типам ингредиентов:
 * - Сухое молоко
 * - Различные виды чая (фруктовый, лимонный, и т.п.)
 * - Сахар
 * - Горячий шоколад
 * - Растворимые смеси
 * - Молочные ингредиенты
 * - И другие
 */
@Entity('hopper_types')
@Index(['code'], { unique: true })
export class HopperType extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string; // Уникальный код (milk_powder, sugar, tea_fruit, etc.)

  @Column({ type: 'varchar', length: 200 })
  name: string; // Название на русском

  @Column({ type: 'varchar', length: 200, nullable: true })
  name_en: string | null; // Название на английском

  @Column({ type: 'text', nullable: true })
  description: string | null; // Описание

  // Категория для группировки (напитки, ингредиенты, и т.п.)
  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string | null;

  // Требования к хранению
  @Column({ type: 'boolean', default: false })
  requires_refrigeration: boolean; // Требует охлаждения

  @Column({ type: 'integer', nullable: true })
  shelf_life_days: number | null; // Срок годности в днях

  // Типичные характеристики
  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  typical_capacity_kg: number | null; // Типичная вместимость бункера в кг

  @Column({ type: 'varchar', length: 20, default: 'kg' })
  unit_of_measure: string; // Единица измерения (kg, g, l, ml)

  // Metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
