import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Employee } from './employee.entity';

export enum PayrollStatus {
  DRAFT = 'draft',
  CALCULATED = 'calculated',
  APPROVED = 'approved',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

@Entity('payrolls')
export class Payroll extends BaseEntity {
  @Column({ type: 'uuid' })
  employee_id: string;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ type: 'varchar', length: 7 })
  period: string; // Format: YYYY-MM

  @Column({ type: 'date' })
  pay_date: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  base_salary: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  overtime_pay: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  bonuses: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  allowances: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deductions: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tax: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  net_salary: number;

  @Column({ type: 'enum', enum: PayrollStatus, default: PayrollStatus.DRAFT })
  status: PayrollStatus;

  @Column({ type: 'integer', default: 0 })
  working_days: number;

  @Column({ type: 'integer', default: 0 })
  absent_days: number;

  @Column({ type: 'integer', default: 0 })
  overtime_hours: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    breakdown?: {
      allowance_type?: string;
      amount?: number;
    }[];
    deduction_breakdown?: {
      deduction_type?: string;
      amount?: number;
    }[];
    [key: string]: unknown;
  };
}
