import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Location } from '../../locations/entities/location.entity';
import { Contract } from '../../counterparty/entities/contract.entity';
import { Organization } from '../../organizations/entities/organization.entity';

export enum MachineStatus {
  ACTIVE = 'active',
  LOW_STOCK = 'low_stock',
  ERROR = 'error',
  MAINTENANCE = 'maintenance',
  OFFLINE = 'offline',
  DISABLED = 'disabled',
}

@Entity('machines')
@Index(['location_id'])
@Index(['machine_number'], { unique: true })
@Index(['qr_code'], { unique: true })
@Index(['organization_id'])
export class Machine extends BaseEntity {
  @Column({ type: 'varchar', length: 50, unique: true })
  machine_number: string; // Уникальный номер аппарата (M-001, M-002, etc.)

  @Column({ type: 'varchar', length: 200 })
  name: string; // Название для UI

  @Column({ type: 'varchar', length: 50 })
  type_code: string; // from dictionaries: machine_types

  @Column({
    type: 'enum',
    enum: MachineStatus,
    default: MachineStatus.ACTIVE,
  })
  status: MachineStatus;

  @Column({ type: 'uuid' })
  location_id: string;

  @ManyToOne(() => Location, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  // Optional contract link for commission tracking (Phase 3)
  @Column({ type: 'uuid', nullable: true })
  contract_id: string | null;

  @ManyToOne(() => Contract, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contract_id' })
  contract: Contract | null;

  // Organization for multi-tenant franchise system
  @Column({ type: 'uuid', nullable: true })
  organization_id: string | null;

  @ManyToOne(() => Organization, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization | null;

  // Machine details
  @Column({ type: 'varchar', length: 100, nullable: true })
  manufacturer: string | null; // Производитель

  @Column({ type: 'varchar', length: 100, nullable: true })
  model: string | null; // Модель

  @Column({ type: 'varchar', length: 100, nullable: true })
  serial_number: string | null; // Серийный номер

  @Column({ type: 'integer', nullable: true })
  year_of_manufacture: number | null; // Год выпуска

  // Installation
  @Column({ type: 'date', nullable: true })
  installation_date: Date | null; // Дата установки

  @Column({ type: 'date', nullable: true })
  last_maintenance_date: Date | null; // Последнее ТО

  @Column({ type: 'date', nullable: true })
  next_maintenance_date: Date | null; // Следующее ТО

  // Capacity
  @Column({ type: 'integer', default: 0 })
  max_product_slots: number; // Максимум слотов для товаров

  @Column({ type: 'integer', default: 0 })
  current_product_count: number; // Текущее количество видов товара

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cash_capacity: number; // Вместимость купюроприемника

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  current_cash_amount: number; // Текущая сумма в аппарате (примерная)

  // Payment methods
  @Column({ type: 'boolean', default: true })
  accepts_cash: boolean;

  @Column({ type: 'boolean', default: false })
  accepts_card: boolean;

  @Column({ type: 'boolean', default: false })
  accepts_qr: boolean;

  @Column({ type: 'boolean', default: false })
  accepts_nfc: boolean;

  // QR Code for customer complaints
  @Column({ type: 'varchar', length: 100, unique: true })
  qr_code: string; // Уникальный QR-код для жалоб

  @Column({ type: 'text', nullable: true })
  qr_code_url: string | null; // URL для QR-кода

  // Assigned users
  @Column({ type: 'uuid', nullable: true })
  assigned_operator_id: string | null; // Закрепленный оператор

  @Column({ type: 'uuid', nullable: true })
  assigned_technician_id: string | null; // Закрепленный техник

  // Notes
  @Column({ type: 'text', nullable: true })
  notes: string | null; // Примечания

  // Settings and metadata
  @Column({ type: 'jsonb', nullable: true })
  settings: Record<string, any> | null; // Настройки аппарата

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null; // Дополнительные данные

  // Inventory alert thresholds
  @Column({ type: 'integer', default: 10 })
  low_stock_threshold_percent: number; // Порог для "мало товара" (%)

  // Statistics (cached, updated by tasks)
  @Column({ type: 'integer', default: 0 })
  total_sales_count: number; // Всего продаж

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_revenue: number; // Общая выручка

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_refill_date: Date | null; // Последнее пополнение

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_collection_date: Date | null; // Последняя инкассация

  // Connectivity tracking
  @Column({ type: 'timestamp with time zone', nullable: true })
  last_ping_at: Date | null; // Последний пинг/проверка связи

  @Column({ type: 'boolean', default: false })
  is_online: boolean; // Онлайн статус (автоматически из last_ping_at)

  @Column({ type: 'varchar', length: 50, nullable: true })
  connectivity_status: string | null; // online/offline/unknown

  // Financial tracking for depreciation
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  purchase_price: number | null; // Стоимость покупки аппарата

  @Column({ type: 'date', nullable: true })
  purchase_date: Date | null; // Дата покупки

  @Column({ type: 'integer', nullable: true })
  depreciation_years: number | null; // Срок амортизации в годах (например, 5 лет)

  @Column({ type: 'varchar', length: 20, default: 'linear' })
  depreciation_method: string; // Метод амортизации (linear = линейная)

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  accumulated_depreciation: number; // Накопленная амортизация

  @Column({ type: 'date', nullable: true })
  last_depreciation_date: Date | null; // Дата последнего начисления амортизации

  // Disposal tracking
  @Column({ type: 'boolean', default: false })
  is_disposed: boolean; // Списано (утилизировано)

  @Column({ type: 'date', nullable: true })
  disposal_date: Date | null; // Дата списания

  @Column({ type: 'text', nullable: true })
  disposal_reason: string | null; // Причина списания

  @Column({ type: 'uuid', nullable: true })
  disposal_transaction_id: string | null; // ID транзакции списания
}
