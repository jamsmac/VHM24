import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Employee } from './employee.entity';

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  HALF_DAY = 'half_day',
  ON_LEAVE = 'on_leave',
}

@Entity('attendances')
export class Attendance extends BaseEntity {
  @Column({ type: 'uuid' })
  employee_id: string;

  @ManyToOne(() => Employee, (employee) => employee.attendances)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'timestamp', nullable: true })
  check_in: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  check_out: Date | null;

  @Column({ type: 'integer', default: 0 })
  total_hours: number; // in minutes

  @Column({ type: 'integer', default: 0 })
  overtime_hours: number; // in minutes

  @Column({ type: 'integer', default: 0 })
  break_duration: number; // in minutes

  @Column({ type: 'enum', enum: AttendanceStatus, default: AttendanceStatus.PRESENT })
  status: AttendanceStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  location: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    ip_address?: string;
    device?: string;
    geo_coordinates?: { lat: number; lng: number };
    [key: string]: unknown;
  };
}
