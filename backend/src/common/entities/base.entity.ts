import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
} from 'typeorm';

/**
 * Base entity class that all entities should extend.
 *
 * Provides:
 * - UUID primary key
 * - Automatic timestamps (created_at, updated_at)
 * - Soft delete support (deleted_at)
 * - Audit fields (created_by_id, updated_by_id)
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @DeleteDateColumn({ type: 'timestamp with time zone', nullable: true })
  deleted_at: Date | null;

  /**
   * ID of the user who created this record.
   * Used for audit trails.
   */
  @Column({ type: 'uuid', nullable: true })
  created_by_id: string | null;

  /**
   * ID of the user who last updated this record.
   * Used for audit trails.
   */
  @Column({ type: 'uuid', nullable: true })
  updated_by_id: string | null;
}
