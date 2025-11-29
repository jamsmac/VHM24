import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Nomenclature } from '@/modules/nomenclature/entities/nomenclature.entity';
import { Counterparty } from '@/modules/counterparty/entities/counterparty.entity';
import { Warehouse } from '@/modules/warehouse/entities/warehouse.entity';
import { User } from '@/modules/users/entities/user.entity';

export enum PurchaseStatus {
  PENDING = 'pending',
  RECEIVED = 'received',
  PARTIAL = 'partial',
  CANCELLED = 'cancelled',
  RETURNED = 'returned',
}

/**
 * Purchase History Entity
 * История закупок товаров
 *
 * REQ-STK-04: История закупок с датой, поставщиком, ценой
 * REQ-STK-05: Связь закупок с номенклатурой
 */
@Entity('purchase_history')
@Index(['purchase_date'])
@Index(['supplier_id'])
@Index(['nomenclature_id'])
@Index(['invoice_number'])
export class PurchaseHistory extends BaseEntity {
  @Column({ type: 'date' })
  purchase_date: Date; // Дата закупки

  @Column({ type: 'varchar', length: 50, nullable: true })
  invoice_number: string | null; // Номер счета-фактуры

  @Column({ type: 'uuid' })
  supplier_id: string;

  @ManyToOne(() => Counterparty, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Counterparty; // Поставщик

  @Column({ type: 'uuid' })
  nomenclature_id: string;

  @ManyToOne(() => Nomenclature, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'nomenclature_id' })
  nomenclature: Nomenclature; // Товар

  @Column({ type: 'uuid', nullable: true })
  warehouse_id: string | null;

  @ManyToOne(() => Warehouse, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse?: Warehouse; // Склад назначения

  @Column({ type: 'decimal', precision: 15, scale: 3 })
  quantity: number; // Количество

  @Column({ type: 'varchar', length: 20, nullable: true })
  unit: string | null; // Единица измерения

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  unit_price: number; // Цена за единицу без НДС (UZS)

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 15.0 })
  vat_rate: number; // Ставка НДС (%)

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  vat_amount: number; // Сумма НДС

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  total_amount: number; // Общая сумма с НДС

  @Column({ type: 'varchar', length: 50, nullable: true })
  batch_number: string | null; // Номер партии

  @Column({ type: 'date', nullable: true })
  production_date: Date | null; // Дата производства

  @Column({ type: 'date', nullable: true })
  expiry_date: Date | null; // Срок годности

  @Column({
    type: 'enum',
    enum: PurchaseStatus,
    default: PurchaseStatus.RECEIVED,
  })
  status: PurchaseStatus;

  @Column({ type: 'date', nullable: true })
  delivery_date: Date | null; // Фактическая дата поставки

  @Column({ type: 'varchar', length: 50, nullable: true })
  delivery_note_number: string | null; // Номер накладной

  @Column({ type: 'varchar', length: 3, default: 'UZS' })
  currency: string; // Валюта

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  exchange_rate: number | null; // Курс валюты к UZS

  @Column({ type: 'varchar', length: 50, nullable: true })
  payment_method: string | null; // Способ оплаты

  @Column({ type: 'date', nullable: true })
  payment_date: Date | null; // Дата оплаты

  @Column({ type: 'uuid', nullable: true })
  created_by_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by_id' })
  created_by?: User;

  @Column({ type: 'varchar', length: 50, nullable: true })
  import_source: string | null; // Источник импорта (manual, csv, excel)

  @Column({ type: 'uuid', nullable: true })
  import_session_id: string | null; // ID сессии импорта

  @Column({ type: 'text', nullable: true })
  notes: string | null; // Примечания
}
