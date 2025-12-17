import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Employee } from './employee.entity';

export enum PositionLevel {
  ENTRY = 'entry',
  JUNIOR = 'junior',
  MIDDLE = 'middle',
  SENIOR = 'senior',
  LEAD = 'lead',
  MANAGER = 'manager',
  DIRECTOR = 'director',
  EXECUTIVE = 'executive',
}

@Entity('positions')
export class Position extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'enum', enum: PositionLevel })
  level: PositionLevel;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  min_salary: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  max_salary: number | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    requirements?: string[];
    responsibilities?: string[];
    [key: string]: unknown;
  };

  @OneToMany(() => Employee, (employee) => employee.position)
  employees: Employee[];
}
