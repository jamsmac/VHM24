import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Machine } from '@modules/machines/entities/machine.entity';
import { Nomenclature } from '@modules/nomenclature/entities/nomenclature.entity';

/**
 * Container status enumeration
 * Represents the current state of a container (hopper/bunker)
 */
export enum ContainerStatus {
  ACTIVE = 'active',
  EMPTY = 'empty',
  MAINTENANCE = 'maintenance',
}

/**
 * Container Entity (Бункер/Hopper)
 *
 * Represents a storage container within a vending machine that holds
 * ingredients (coffee beans, sugar, milk powder, etc.)
 *
 * Part of VH24 Integration - Phase 4.1.1
 * @see COMPREHENSIVE_DEVELOPMENT_PLAN.md Section 4.1.1
 */
@Entity('containers')
@Index(['machine_id'])
@Index(['nomenclature_id'])
@Index(['status'])
@Unique(['machine_id', 'slot_number'])
export class Container extends BaseEntity {
  /**
   * Reference to the machine this container belongs to
   */
  @Column({ type: 'uuid' })
  machine_id: string;

  @ManyToOne(() => Machine, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  /**
   * Reference to the nomenclature (ingredient) stored in this container
   * Nullable - container can be empty or not yet assigned
   */
  @Column({ type: 'uuid', nullable: true })
  nomenclature_id: string | null;

  @ManyToOne(() => Nomenclature, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'nomenclature_id' })
  nomenclature: Nomenclature | null;

  /**
   * Slot number within the machine (1, 2, 3, etc.)
   * Unique per machine
   */
  @Column({ type: 'int' })
  slot_number: number;

  /**
   * Human-readable name for the container
   * E.g., "Кофе в зернах", "Сахар", "Молоко"
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string | null;

  /**
   * Maximum capacity of the container
   * Measured in the unit specified by 'unit' field
   */
  @Column({ type: 'decimal', precision: 10, scale: 3 })
  capacity: number;

  /**
   * Current quantity of ingredient in the container
   * Updated after refills and sales
   */
  @Column({ type: 'decimal', precision: 10, scale: 3, default: 0 })
  current_quantity: number;

  /**
   * Unit of measurement for capacity and quantity
   * Default is grams ('g'), but can be 'ml', 'pcs', etc.
   */
  @Column({ type: 'varchar', length: 20, default: 'g' })
  unit: string;

  /**
   * Minimum level threshold for low stock alerts
   * When current_quantity falls below this, trigger alert
   */
  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  min_level: number | null;

  /**
   * Timestamp of the last refill operation
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  last_refill_date: Date | null;

  /**
   * Current status of the container
   */
  @Column({
    type: 'enum',
    enum: ContainerStatus,
    default: ContainerStatus.ACTIVE,
  })
  status: ContainerStatus;

  /**
   * Additional metadata for the container
   * Can store calibration data, sensor readings, etc.
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  /**
   * Notes or comments about the container
   */
  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
