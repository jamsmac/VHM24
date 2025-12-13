import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Supplier } from './supplier.entity';

/**
 * Категории материалов.
 */
export enum MaterialCategory {
  INGREDIENTS = 'ingredients', // Ингредиенты (кофе, молоко, сахар)
  CONSUMABLES = 'consumables', // Расходники (стаканы, крышки, палочки)
  CLEANING = 'cleaning', // Чистящие средства
  SPARE_PARTS = 'spare_parts', // Запчасти
  PACKAGING = 'packaging', // Упаковка
  OTHER = 'other', // Прочее
}

/**
 * Material entity - материал для заказа.
 *
 * Материалы группируются по категориям и привязываются к поставщикам.
 * Используется в Telegram боте для каталога и корзины.
 */
@Entity('materials')
@Index(['category'])
@Index(['supplier_id'])
@Index(['is_active'])
@Index(['name'])
export class Material extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: MaterialCategory,
    default: MaterialCategory.OTHER,
  })
  category: MaterialCategory;

  /**
   * Единица измерения (шт, кг, л, уп и т.д.).
   */
  @Column({ type: 'varchar', length: 50, default: 'шт' })
  unit: string;

  /**
   * SKU / Артикул.
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  sku: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Цена за единицу (справочная, для расчётов).
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  unit_price: number | null;

  /**
   * Минимальное количество для заказа.
   */
  @Column({ type: 'int', default: 1 })
  min_order_quantity: number;

  @Column({ type: 'uuid', nullable: true })
  supplier_id: string | null;

  @ManyToOne(() => Supplier, (supplier) => supplier.materials, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  /**
   * URL изображения материала.
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  image_url: string | null;

  /**
   * Порядок сортировки в каталоге.
   */
  @Column({ type: 'int', default: 0 })
  sort_order: number;
}
