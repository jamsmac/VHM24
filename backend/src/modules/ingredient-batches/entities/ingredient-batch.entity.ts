import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Nomenclature } from '@modules/nomenclature/entities/nomenclature.entity';
import { Counterparty } from '@modules/counterparty/entities/counterparty.entity';

/**
 * Ingredient batch status enumeration
 * Represents the current state of a batch
 */
export enum IngredientBatchStatus {
  IN_STOCK = 'in_stock',
  DEPLETED = 'depleted',
  EXPIRED = 'expired',
  RETURNED = 'returned',
}

/**
 * Ingredient Batch Entity (Партия ингредиентов)
 *
 * Tracks ingredient batches for FIFO (First In, First Out) inventory management.
 * Each batch represents a specific purchase/receipt of ingredients with
 * tracking of quantity, expiry dates, and supplier information.
 *
 * Part of VH24 Integration - Phase 4.1.3
 * @see COMPREHENSIVE_DEVELOPMENT_PLAN.md Section 4.1.3
 */
@Entity('ingredient_batches')
@Index(['nomenclature_id'])
@Index(['supplier_id'])
@Index(['status'])
@Index(['expiry_date'])
@Index(['received_date'])
@Unique(['nomenclature_id', 'batch_number'])
export class IngredientBatch extends BaseEntity {
  /**
   * Reference to the nomenclature (ingredient) this batch belongs to
   */
  @Column({ type: 'uuid' })
  nomenclature_id: string;

  @ManyToOne(() => Nomenclature, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'nomenclature_id' })
  nomenclature: Nomenclature;

  /**
   * Unique batch number/identifier
   * Must be unique per nomenclature
   */
  @Column({ type: 'varchar', length: 100 })
  batch_number: string;

  /**
   * Original quantity received in this batch
   */
  @Column({ type: 'decimal', precision: 10, scale: 3 })
  quantity: number;

  /**
   * Remaining quantity after deductions
   * Updated by FIFO deduction logic
   */
  @Column({ type: 'decimal', precision: 10, scale: 3 })
  remaining_quantity: number;

  /**
   * Purchase price per unit (in UZS)
   */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  purchase_price: number | null;

  /**
   * Reference to the supplier (counterparty)
   */
  @Column({ type: 'uuid', nullable: true })
  supplier_id: string | null;

  @ManyToOne(() => Counterparty, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Counterparty | null;

  /**
   * Date when the batch was manufactured
   */
  @Column({ type: 'date', nullable: true })
  manufacture_date: Date | null;

  /**
   * Expiry/Best before date
   */
  @Column({ type: 'date', nullable: true })
  expiry_date: Date | null;

  /**
   * Date when the batch was received/recorded in the system
   * Used for FIFO ordering
   */
  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  received_date: Date;

  /**
   * Current status of the batch
   */
  @Column({
    type: 'enum',
    enum: IngredientBatchStatus,
    default: IngredientBatchStatus.IN_STOCK,
  })
  status: IngredientBatchStatus;

  /**
   * Unit of measurement for this batch
   * E.g., 'kg', 'g', 'l', 'ml', 'pcs'
   */
  @Column({ type: 'varchar', length: 20 })
  unit: string;

  /**
   * Notes or additional information about the batch
   */
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /**
   * Additional metadata for the batch
   * Can store certificate info, quality data, etc.
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;
}
