import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Machine } from './machine.entity';
import { Location } from '@/modules/locations/entities/location.entity';
import { User } from '@/modules/users/entities/user.entity';

/**
 * Machine Location History Entity
 * История перемещений аппаратов между локациями
 *
 * REQ-MD-MACH-02: Система должна поддерживать историю перемещений аппаратов между локациями
 */
@Entity('machine_location_history')
@Index(['machine_id'])
@Index(['moved_at'])
@Index(['to_location_id'])
export class MachineLocationHistory extends BaseEntity {
  @Column({ type: 'uuid' })
  machine_id: string;

  @ManyToOne(() => Machine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @Column({ type: 'uuid', nullable: true })
  from_location_id: string | null;

  @ManyToOne(() => Location, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'from_location_id' })
  from_location: Location | null;

  @Column({ type: 'uuid' })
  to_location_id: string;

  @ManyToOne(() => Location, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'to_location_id' })
  to_location: Location;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  moved_at: Date;

  @Column({ type: 'uuid' })
  moved_by_user_id: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'moved_by_user_id' })
  moved_by: User;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reason: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
