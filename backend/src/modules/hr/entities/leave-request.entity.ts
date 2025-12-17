import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Employee } from './employee.entity';

export enum LeaveType {
  ANNUAL = 'annual',
  SICK = 'sick',
  MATERNITY = 'maternity',
  PATERNITY = 'paternity',
  UNPAID = 'unpaid',
  EMERGENCY = 'emergency',
  STUDY = 'study',
  COMPENSATORY = 'compensatory',
}

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

@Entity('leave_requests')
export class LeaveRequest extends BaseEntity {
  @Column({ type: 'uuid' })
  employee_id: string;

  @ManyToOne(() => Employee, (employee) => employee.leave_requests)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ type: 'enum', enum: LeaveType })
  leave_type: LeaveType;

  @Column({ type: 'date' })
  start_date: Date;

  @Column({ type: 'date' })
  end_date: Date;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  total_days: number;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'enum', enum: LeaveStatus, default: LeaveStatus.PENDING })
  status: LeaveStatus;

  @Column({ type: 'uuid', nullable: true })
  approved_by_id: string | null;

  @Column({ type: 'timestamp', nullable: true })
  approved_at: Date | null;

  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    attachments?: string[];
    handover_notes?: string;
    [key: string]: unknown;
  };
}
