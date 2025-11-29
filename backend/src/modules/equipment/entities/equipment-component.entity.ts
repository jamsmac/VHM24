import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Machine } from '../../machines/entities/machine.entity';

export enum ComponentType {
  HOPPER = 'hopper', // Бункер
  GRINDER = 'grinder', // Гриндер
  BREWER = 'brewer', // Варочная группа
  MIXER = 'mixer', // Миксер
  COOLING_UNIT = 'cooling_unit', // Холодильник
  PAYMENT_TERMINAL = 'payment_terminal', // Платежный терминал
  DISPENSER = 'dispenser', // Дозатор
  PUMP = 'pump', // Помпа
  WATER_FILTER = 'water_filter', // Фильтр воды
  COIN_ACCEPTOR = 'coin_acceptor', // Монетоприемник
  BILL_ACCEPTOR = 'bill_acceptor', // Купюроприемник
  DISPLAY = 'display', // Дисплей
  OTHER = 'other',
}

export enum ComponentStatus {
  ACTIVE = 'active', // Работает нормально
  IN_STOCK = 'in_stock', // На складе, готов к установке
  NEEDS_MAINTENANCE = 'needs_maintenance', // Требует обслуживания
  NEEDS_REPLACEMENT = 'needs_replacement', // Требует замены
  IN_REPAIR = 'in_repair', // В ремонте
  REPLACED = 'replaced', // Заменен
  RETIRED = 'retired', // Списан
  BROKEN = 'broken', // Сломан
}

export enum ComponentLocationType {
  MACHINE = 'machine', // Установлен в машине
  WAREHOUSE = 'warehouse', // На складе
  WASHING = 'washing', // На мойке
  DRYING = 'drying', // На сушке
  REPAIR = 'repair', // В ремонте
}

@Entity('equipment_components')
@Index(['machine_id'])
@Index(['component_type'])
@Index(['status'])
@Index(['current_location_type'])
export class EquipmentComponent extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  machine_id: string | null;

  @ManyToOne(() => Machine, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine | null;

  @Column({ type: 'enum', enum: ComponentType })
  component_type: ComponentType;

  @Column({ type: 'varchar', length: 200 })
  name: string; // Название компонента

  @Column({ type: 'varchar', length: 100, nullable: true })
  model: string | null; // Модель

  @Column({ type: 'varchar', length: 100, nullable: true })
  serial_number: string | null; // Серийный номер

  @Column({ type: 'varchar', length: 100, nullable: true })
  manufacturer: string | null; // Производитель

  @Column({
    type: 'enum',
    enum: ComponentStatus,
    default: ComponentStatus.ACTIVE,
  })
  status: ComponentStatus;

  // Location tracking (REQ-ASSET-10)
  @Column({
    type: 'enum',
    enum: ComponentLocationType,
    default: ComponentLocationType.WAREHOUSE,
  })
  current_location_type: ComponentLocationType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  current_location_ref: string | null; // UUID или название локации (склад, мойка и т.п.)

  // Installation and lifecycle
  @Column({ type: 'date', nullable: true })
  installation_date: Date | null; // Дата установки

  @Column({ type: 'date', nullable: true })
  last_maintenance_date: Date | null; // Последнее обслуживание

  @Column({ type: 'date', nullable: true })
  next_maintenance_date: Date | null; // Следующее обслуживание

  @Column({ type: 'integer', nullable: true })
  maintenance_interval_days: number | null; // Интервал обслуживания (дни)

  @Column({ type: 'integer', default: 0 })
  working_hours: number; // Часы работы (если измеряется)

  @Column({ type: 'integer', nullable: true })
  expected_lifetime_hours: number | null; // Ожидаемый срок службы (часы)

  // Replacement tracking
  @Column({ type: 'date', nullable: true })
  replacement_date: Date | null; // Дата замены

  @Column({ type: 'uuid', nullable: true })
  replaced_by_component_id: string | null; // ID компонента-замены

  @Column({ type: 'uuid', nullable: true })
  replaces_component_id: string | null; // ID заменяемого компонента

  // Additional info
  @Column({ type: 'text', nullable: true })
  notes: string | null; // Примечания

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null; // Дополнительные данные

  // Warranty
  @Column({ type: 'date', nullable: true })
  warranty_expiration_date: Date | null; // Дата окончания гарантии
}
