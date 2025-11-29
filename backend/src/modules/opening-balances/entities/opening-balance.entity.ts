import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Nomenclature } from '@/modules/nomenclature/entities/nomenclature.entity';
import { Warehouse } from '@/modules/warehouse/entities/warehouse.entity';
import { User } from '@/modules/users/entities/user.entity';

/**
 * Stock Opening Balance Entity
 * Начальные остатки на складе
 *
 * REQ-STK-01: Начальные остатки для каждой номенклатуры
 * REQ-STK-02: Количество, себестоимость единицы, общая стоимость
 * REQ-STK-03: Связь с датой начала учета
 */
@Entity('stock_opening_balances')
@Index(['nomenclature_id', 'warehouse_id', 'balance_date'], { unique: true })
@Index(['balance_date'])
@Index(['is_applied'])
export class StockOpeningBalance extends BaseEntity {
  @Column({ type: 'uuid' })
  nomenclature_id: string;

  @ManyToOne(() => Nomenclature, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'nomenclature_id' })
  nomenclature: Nomenclature;

  @Column({ type: 'uuid', nullable: true })
  warehouse_id: string | null;

  @ManyToOne(() => Warehouse, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse?: Warehouse;

  @Column({ type: 'date' })
  balance_date: Date; // Дата начала учета

  @Column({ type: 'decimal', precision: 15, scale: 3 })
  quantity: number; // Количество

  @Column({ type: 'varchar', length: 20, nullable: true })
  unit: string | null; // Единица измерения (шт, кг, л)

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  unit_cost: number; // Себестоимость за единицу (UZS)

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  total_cost: number; // Общая стоимость (quantity * unit_cost)

  @Column({ type: 'varchar', length: 50, nullable: true })
  batch_number: string | null; // Номер партии

  @Column({ type: 'date', nullable: true })
  expiry_date: Date | null; // Срок годности

  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string | null; // Место хранения на складе

  @Column({ type: 'boolean', default: false })
  is_applied: boolean; // Применен ли остаток к текущему инвентарю

  @Column({ type: 'timestamp', nullable: true })
  applied_at: Date | null; // Когда был применен

  @Column({ type: 'uuid', nullable: true })
  applied_by_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'applied_by_id' })
  applied_by?: User;

  @Column({ type: 'varchar', length: 50, nullable: true })
  import_source: string | null; // Источник импорта (manual, csv, excel)

  @Column({ type: 'uuid', nullable: true })
  import_session_id: string | null; // ID сессии импорта

  @Column({ type: 'text', nullable: true })
  notes: string | null; // Примечания
}
