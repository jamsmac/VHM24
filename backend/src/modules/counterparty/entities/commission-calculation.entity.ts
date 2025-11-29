import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Contract } from './contract.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

/**
 * Commission Calculation Entity
 *
 * Stores history of commission calculations for contracts
 * Useful for auditing and reconciliation
 */
@Entity('commission_calculations')
export class CommissionCalculation extends BaseEntity {
  // Contract relation
  @Column({ type: 'uuid' })
  contract_id: string;

  @ManyToOne(() => Contract, (contract) => contract.commission_calculations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;

  // Calculation period
  @Column({ type: 'date' })
  period_start: Date; // Начало периода

  @Column({ type: 'date' })
  period_end: Date; // Конец периода

  // Revenue data (in UZS)
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  total_revenue: number; // Общий оборот за период (UZS)

  @Column({ type: 'int', default: 0 })
  transaction_count: number; // Количество транзакций

  // Commission calculation
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  commission_amount: number; // Рассчитанная комиссия (UZS)

  @Column({ type: 'varchar', length: 20 })
  commission_type: string; // Тип комиссии на момент расчета

  @Column({ type: 'jsonb', nullable: true })
  calculation_details: Record<string, any> | null; // Детали расчета (JSON)

  // Payment status
  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  payment_status: PaymentStatus;

  @Column({ type: 'date', nullable: true })
  payment_due_date: Date | null; // Срок оплаты

  @Column({ type: 'date', nullable: true })
  payment_date: Date | null; // Дата фактической оплаты

  @Column({ type: 'uuid', nullable: true })
  payment_transaction_id: string | null; // ID транзакции оплаты

  // Additional info
  @Column({ type: 'text', nullable: true })
  notes: string | null; // Примечания

  @Column({ type: 'uuid', nullable: true })
  calculated_by_user_id: string | null; // Кто провел расчет

  /**
   * Check if payment is overdue
   */
  isOverdue(): boolean {
    if (this.payment_status === PaymentStatus.PAID || !this.payment_due_date) {
      return false;
    }

    const now = new Date();
    const dueDate = new Date(this.payment_due_date);
    return now > dueDate;
  }

  /**
   * Get days until payment is due (negative if overdue)
   */
  getDaysUntilDue(): number | null {
    if (!this.payment_due_date) {
      return null;
    }

    const now = new Date();
    const dueDate = new Date(this.payment_due_date);
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }
}
