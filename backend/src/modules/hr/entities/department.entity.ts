import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Employee } from './employee.entity';

@Entity('departments')
export class Department extends BaseEntity {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', nullable: true })
  manager_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  parent_department_id: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    cost_center?: string;
    location?: string;
    budget?: number;
    [key: string]: unknown;
  };

  @OneToMany(() => Employee, (employee) => employee.department)
  employees: Employee[];
}
