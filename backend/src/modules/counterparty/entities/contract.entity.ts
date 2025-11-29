import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Counterparty } from './counterparty.entity';
import { CommissionCalculation } from './commission-calculation.entity';

/**
 * Commission Type Enum
 */
export enum CommissionType {
  PERCENTAGE = 'percentage', // Процент от оборота: например, 15% от всех продаж
  FIXED = 'fixed', // Фиксированная сумма: например, 500,000 UZS в месяц
  TIERED = 'tiered', // Ступенчатая: разные проценты для разных объемов
  HYBRID = 'hybrid', // Гибридная: фиксированная часть + процент
}

/**
 * Contract Status Enum
 */
export enum ContractStatus {
  DRAFT = 'draft', // Черновик
  ACTIVE = 'active', // Действующий
  SUSPENDED = 'suspended', // Приостановлен
  EXPIRED = 'expired', // Истек
  TERMINATED = 'terminated', // Расторгнут
}

/**
 * Tiered Commission Configuration
 * Example:
 * [
 *   { from: 0, to: 10000000, rate: 10 },        // 0-10M UZS: 10%
 *   { from: 10000000, to: 50000000, rate: 12 }, // 10-50M UZS: 12%
 *   { from: 50000000, to: null, rate: 15 }      // >50M UZS: 15%
 * ]
 */
export interface TieredCommissionTier {
  from: number; // Начало диапазона (UZS)
  to: number | null; // Конец диапазона (UZS), null = бесконечность
  rate: number; // Ставка комиссии (%)
}

/**
 * Contract Entity (Договор)
 *
 * Manages contracts with counterparties including commission calculations
 * Supports multiple commission types for Uzbekistan market
 */
@Entity('contracts')
export class Contract extends BaseEntity {
  // Basic information
  @Column({ type: 'varchar', length: 50, unique: true })
  contract_number: string; // Номер договора

  @Column({ type: 'date' })
  start_date: Date; // Дата начала

  @Column({ type: 'date', nullable: true })
  end_date: Date | null; // Дата окончания (null = бессрочный)

  @Column({
    type: 'enum',
    enum: ContractStatus,
    default: ContractStatus.DRAFT,
  })
  status: ContractStatus; // Статус договора

  // Counterparty relation
  @Column({ type: 'uuid' })
  counterparty_id: string;

  @ManyToOne(() => Counterparty, (counterparty) => counterparty.contracts, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'counterparty_id' })
  counterparty: Counterparty;

  // Commission configuration
  @Column({
    type: 'enum',
    enum: CommissionType,
    default: CommissionType.PERCENTAGE,
  })
  commission_type: CommissionType; // Тип комиссии

  // For PERCENTAGE type
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commission_rate: number | null; // Процент комиссии (например, 15.00%)

  // For FIXED type
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  commission_fixed_amount: number | null; // Фиксированная сумма комиссии (UZS)

  @Column({ type: 'enum', enum: ['daily', 'weekly', 'monthly', 'quarterly'], nullable: true })
  commission_fixed_period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | null; // Период для фиксированной комиссии

  // For TIERED type
  @Column({ type: 'jsonb', nullable: true })
  commission_tiers: TieredCommissionTier[] | null; // Ступенчатая схема комиссии

  // For HYBRID type (combination of fixed + percentage)
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  commission_hybrid_fixed: number | null; // Фиксированная часть (UZS)

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  commission_hybrid_rate: number | null; // Процентная часть (%)

  // Currency (always UZS for Uzbekistan)
  @Column({ type: 'varchar', length: 3, default: 'UZS' })
  currency: string; // Валюта (UZS)

  // Payment terms
  @Column({ type: 'int', default: 30 })
  payment_term_days: number; // Срок оплаты (дней)

  @Column({
    type: 'enum',
    enum: ['prepayment', 'postpayment', 'on_delivery'],
    default: 'postpayment',
  })
  payment_type: 'prepayment' | 'postpayment' | 'on_delivery'; // Тип оплаты

  // Additional conditions
  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  minimum_monthly_revenue: number | null; // Минимальный месячный оборот (UZS)

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  penalty_rate: number | null; // Ставка пени за просрочку (% в день)

  @Column({ type: 'text', nullable: true })
  special_conditions: string | null; // Особые условия

  @Column({ type: 'text', nullable: true })
  notes: string | null; // Примечания

  // File attachment
  @Column({ type: 'uuid', nullable: true })
  contract_file_id: string | null; // ID файла скана договора

  // Relations
  @OneToMany(() => CommissionCalculation, (calc) => calc.contract)
  commission_calculations: CommissionCalculation[]; // История расчетов комиссии

  /**
   * Check if contract is currently active
   */
  isCurrentlyActive(): boolean {
    if (this.status !== ContractStatus.ACTIVE) {
      return false;
    }

    const now = new Date();
    const start = new Date(this.start_date);

    if (now < start) {
      return false;
    }

    if (this.end_date) {
      const end = new Date(this.end_date);
      if (now > end) {
        return false;
      }
    }

    return true;
  }
}
