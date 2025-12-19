import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Machine } from '../../machines/entities/machine.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Per-machine role types.
 * Coexists with existing assignment fields (assigned_operator_id, assigned_technician_id).
 */
export enum MachineAccessRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MANAGER = 'manager',
  OPERATOR = 'operator',
  TECHNICIAN = 'technician',
  VIEWER = 'viewer',
}

/**
 * Machine-level access control.
 * Many-to-many relationship between User and Machine with per-machine role.
 *
 * Key rule: This coexists with existing assignment fields (assigned_operator_id, assigned_technician_id).
 * DO NOT modify existing assignment behavior.
 */
@Entity('machine_access')
@Unique(['machine_id', 'user_id'])
@Index(['machine_id'])
@Index(['user_id'])
@Index(['role'])
export class MachineAccess {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  machine_id: string;

  @ManyToOne(() => Machine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: MachineAccessRole,
    default: MachineAccessRole.VIEWER,
  })
  role: MachineAccessRole;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @Column({ type: 'uuid', nullable: true })
  created_by_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  created_by: User | null;
}
