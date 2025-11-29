import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { ComponentType } from './equipment-component.entity';

// Re-export ComponentType for convenience
export { ComponentType };

@Entity('spare_parts')
@Index(['part_number'], { unique: true })
@Index(['component_type'])
export class SparePart extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  part_number: string; // Артикул/номер запчасти

  @Column({ type: 'varchar', length: 200 })
  name: string; // Название запчасти

  @Column({ type: 'text', nullable: true })
  description: string | null; // Описание

  @Column({ type: 'enum', enum: ComponentType })
  component_type: ComponentType; // Для какого типа компонента

  @Column({ type: 'varchar', length: 100, nullable: true })
  manufacturer: string | null; // Производитель

  @Column({ type: 'varchar', length: 100, nullable: true })
  model_compatibility: string | null; // Совместимость с моделями

  // Inventory
  @Column({ type: 'integer', default: 0 })
  quantity_in_stock: number; // Количество на складе

  @Column({ type: 'integer', default: 0 })
  min_stock_level: number; // Минимальный уровень запаса

  @Column({ type: 'integer', default: 0 })
  max_stock_level: number; // Максимальный уровень запаса

  @Column({ type: 'varchar', length: 50, default: 'pcs' })
  unit: string; // Единица измерения (шт, компл, л, кг)

  // Pricing
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  unit_price: number; // Цена за единицу (в UZS)

  @Column({ type: 'varchar', length: 10, default: 'UZS' })
  currency: string; // Валюта (UZS для Узбекистана)

  // Supplier info
  @Column({ type: 'varchar', length: 200, nullable: true })
  supplier_name: string | null; // Поставщик

  @Column({ type: 'varchar', length: 100, nullable: true })
  supplier_part_number: string | null; // Артикул у поставщика

  @Column({ type: 'varchar', length: 100, nullable: true })
  supplier_contact: string | null; // Контакт поставщика

  @Column({ type: 'integer', nullable: true })
  lead_time_days: number | null; // Срок поставки (дни)

  // Storage
  @Column({ type: 'varchar', length: 100, nullable: true })
  storage_location: string | null; // Место хранения на складе

  @Column({ type: 'varchar', length: 100, nullable: true })
  shelf_number: string | null; // Номер полки

  // Additional info
  @Column({ type: 'text', nullable: true })
  notes: string | null; // Примечания

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null; // Дополнительные данные

  // Images
  @Column({ type: 'simple-array', nullable: true })
  image_urls: string[] | null; // URL изображений

  // Status
  @Column({ type: 'boolean', default: true })
  is_active: boolean; // Активна ли запчасть (не снята с производства)

  @Column({ type: 'date', nullable: true })
  discontinued_date: Date | null; // Дата снятия с производства
}
