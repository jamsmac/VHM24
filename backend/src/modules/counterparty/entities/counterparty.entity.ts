import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Contract } from './contract.entity';
import { Location } from '@/modules/locations/entities/location.entity';

/**
 * Counterparty Entity (Контрагент)
 *
 * Adapted for Uzbekistan market:
 * - INN: 9 digits (vs 10-12 in Russia)
 * - MFO: 5 digits (bank code)
 * - OKED: economic activity codes
 * - All currency operations in UZS
 */
@Entity('counterparties')
export class Counterparty extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string; // Название организации

  @Column({ type: 'varchar', length: 50, nullable: true })
  short_name: string | null; // Краткое название

  @Column({ type: 'enum', enum: ['client', 'supplier', 'partner', 'location_owner'] })
  type: 'client' | 'supplier' | 'partner' | 'location_owner'; // Тип контрагента

  // Uzbekistan tax identifiers
  @Column({ type: 'varchar', length: 9, unique: true })
  inn: string; // ИНН: 9 цифр (Узбекистан)

  @Column({ type: 'varchar', length: 20, nullable: true })
  oked: string | null; // ОКЭД: код вида экономической деятельности

  // Banking details (Uzbekistan)
  @Column({ type: 'varchar', length: 5, nullable: true })
  mfo: string | null; // МФО: 5 цифр (код банка в Узбекистане)

  @Column({ type: 'varchar', length: 50, nullable: true })
  bank_account: string | null; // Расчетный счет

  @Column({ type: 'varchar', length: 255, nullable: true })
  bank_name: string | null; // Название банка

  // Addresses
  @Column({ type: 'text', nullable: true })
  legal_address: string | null; // Юридический адрес

  @Column({ type: 'text', nullable: true })
  actual_address: string | null; // Фактический адрес

  // Contact information
  @Column({ type: 'varchar', length: 100, nullable: true })
  contact_person: string | null; // Контактное лицо

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null; // Телефон

  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string | null; // Email

  // Director information
  @Column({ type: 'varchar', length: 255, nullable: true })
  director_name: string | null; // ФИО директора

  @Column({ type: 'varchar', length: 255, nullable: true })
  director_position: string | null; // Должность (Генеральный директор, и.т.д.)

  // VAT registration (НДС в Узбекистане - 15%)
  @Column({ type: 'boolean', default: true })
  is_vat_payer: boolean; // Плательщик НДС

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 15.0 })
  vat_rate: number; // Ставка НДС (обычно 15% в Узбекистане)

  // Payment terms
  @Column({ type: 'int', nullable: true })
  payment_term_days: number | null; // Срок оплаты (дней)

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  credit_limit: number | null; // Кредитный лимит (UZS)

  // Status
  @Column({ type: 'boolean', default: true })
  is_active: boolean; // Активен

  @Column({ type: 'text', nullable: true })
  notes: string | null; // Примечания

  // Relations
  @OneToMany(() => Contract, (contract) => contract.counterparty, { cascade: true })
  contracts: Contract[]; // Договоры с контрагентом

  @OneToMany(() => Location, (location) => location.counterparty)
  locations: Location[]; // Локации (точки), принадлежащие контрагенту
}
