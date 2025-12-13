import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Request } from './request.entity';
import { Material } from './material.entity';
import { Supplier } from './supplier.entity';

/**
 * RequestItem entity - позиция в заявке на материалы.
 *
 * Связывает заявку с конкретными материалами и количествами.
 */
@Entity('material_request_items')
@Index(['request_id'])
@Index(['material_id'])
@Index(['supplier_id'])
export class RequestItem extends BaseEntity {
  @Column({ type: 'uuid' })
  request_id: string;

  @ManyToOne(() => Request, (request) => request.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request: Request;

  @Column({ type: 'uuid' })
  material_id: string;

  @ManyToOne(() => Material, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'material_id' })
  material: Material;

  /**
   * Поставщик для этой позиции (может отличаться от материала).
   */
  @Column({ type: 'uuid', nullable: true })
  supplier_id: string | null;

  @ManyToOne(() => Supplier, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier | null;

  /**
   * Запрошенное количество.
   */
  @Column({ type: 'int' })
  quantity: number;

  /**
   * Фактически полученное количество.
   */
  @Column({ type: 'int', nullable: true })
  received_quantity: number | null;

  /**
   * Единица измерения (копируется из материала).
   */
  @Column({ type: 'varchar', length: 50, default: 'шт' })
  unit: string;

  /**
   * Цена за единицу на момент заявки.
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  unit_price: number | null;

  /**
   * Сумма позиции (quantity * unit_price).
   */
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  total_price: number | null;

  /**
   * Примечание к позиции.
   */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /**
   * Позиция доставлена полностью.
   */
  @Column({ type: 'boolean', default: false })
  is_fulfilled: boolean;
}
