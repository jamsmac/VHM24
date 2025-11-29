import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('nomenclature')
@Index(['sku'], { unique: true })
@Index(['category_code'])
export class Nomenclature extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  sku: string; // Stock Keeping Unit - уникальный артикул

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  category_code: string; // from dictionaries: product_categories

  @Column({ type: 'varchar', length: 50 })
  unit_of_measure_code: string; // from dictionaries: units_of_measure

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Pricing
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  purchase_price: number | null; // Закупочная цена (в UZS)

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  selling_price: number | null; // Продажная цена (в UZS)

  @Column({ type: 'varchar', length: 3, default: 'UZS' })
  currency: string; // Валюта (UZS для Узбекистана)

  // Physical properties
  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  weight: number | null; // Вес единицы товара

  @Column({ type: 'varchar', length: 50, nullable: true })
  barcode: string | null;

  // Inventory
  @Column({ type: 'integer', default: 0 })
  min_stock_level: number; // Минимальный остаток для уведомления

  @Column({ type: 'integer', default: 0 })
  max_stock_level: number; // Максимальный остаток

  @Column({ type: 'integer', nullable: true })
  shelf_life_days: number | null; // Срок годности в днях

  // Supplier info
  @Column({ type: 'uuid', nullable: true })
  default_supplier_id: string | null; // Основной поставщик

  @Column({ type: 'varchar', length: 100, nullable: true })
  supplier_sku: string | null; // Артикул у поставщика

  // Flags
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'boolean', default: false })
  is_ingredient: boolean; // true = ингредиент, false = товар

  @Column({ type: 'boolean', default: false })
  requires_temperature_control: boolean;

  // Images and files
  @Column({ type: 'text', nullable: true })
  image_url: string | null;

  @Column({ type: 'jsonb', nullable: true })
  images: string[] | null; // Дополнительные изображения

  // Additional metadata
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  // Tags for search
  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];
}
