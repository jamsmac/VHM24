import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AccessTemplateRow } from './access-template-row.entity';

/**
 * Access template for bulk assignment of users to machines.
 * Templates can be applied to multiple machines at once.
 */
@Entity('access_templates')
export class AccessTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @Column({ type: 'uuid', nullable: true })
  created_by_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  created_by: User | null;

  @OneToMany(() => AccessTemplateRow, (row) => row.template, { cascade: true })
  rows: AccessTemplateRow[];
}
