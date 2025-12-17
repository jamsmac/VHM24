import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Department } from './department.entity';
import { Position } from './position.entity';
import { Attendance } from './attendance.entity';
import { LeaveRequest } from './leave-request.entity';

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  INTERN = 'intern',
  TEMPORARY = 'temporary',
}

export enum EmploymentStatus {
  ACTIVE = 'active',
  ON_LEAVE = 'on_leave',
  SUSPENDED = 'suspended',
  TERMINATED = 'terminated',
  RESIGNED = 'resigned',
}

@Entity('employees')
export class Employee extends BaseEntity {
  @Column({ type: 'uuid', unique: true })
  user_id: string; // Link to users table

  @Column({ type: 'varchar', length: 50, unique: true })
  employee_number: string;

  @Column({ type: 'varchar', length: 100 })
  first_name: string;

  @Column({ type: 'varchar', length: 100 })
  last_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  middle_name: string | null;

  @Column({ type: 'varchar', length: 200, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'date' })
  date_of_birth: Date;

  @Column({ type: 'varchar', length: 10, nullable: true })
  gender: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'uuid' })
  department_id: string;

  @ManyToOne(() => Department, (department) => department.employees)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ type: 'uuid' })
  position_id: string;

  @ManyToOne(() => Position, (position) => position.employees)
  @JoinColumn({ name: 'position_id' })
  position: Position;

  @Column({ type: 'uuid', nullable: true })
  manager_id: string | null;

  @Column({ type: 'enum', enum: EmploymentType })
  employment_type: EmploymentType;

  @Column({ type: 'enum', enum: EmploymentStatus, default: EmploymentStatus.ACTIVE })
  employment_status: EmploymentStatus;

  @Column({ type: 'date' })
  hire_date: Date;

  @Column({ type: 'date', nullable: true })
  termination_date: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  base_salary: number;

  @Column({ type: 'varchar', length: 20, default: 'monthly' })
  salary_period: string; // monthly, hourly, daily

  @Column({ type: 'varchar', length: 100, nullable: true })
  bank_account: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tax_id: string | null;

  @Column({ type: 'jsonb', default: {} })
  emergency_contact: {
    name?: string;
    relationship?: string;
    phone?: string;
    [key: string]: unknown;
  };

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    education?: string;
    certifications?: string[];
    skills?: string[];
    languages?: string[];
    [key: string]: unknown;
  };

  @OneToMany(() => Attendance, (attendance) => attendance.employee)
  attendances: Attendance[];

  @OneToMany(() => LeaveRequest, (leave) => leave.employee)
  leave_requests: LeaveRequest[];
}
