import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DirectoryEntry } from './directory-entry.entity';

/**
 * Audit action type
 */
export enum AuditActionType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  ARCHIVE = 'ARCHIVE',
  RESTORE = 'RESTORE',
  SYNC = 'SYNC',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

/**
 * DirectoryEntryAudit entity - audit trail for directory entry changes
 *
 * Tracks all modifications to directory entries including who made the change,
 * when, and what was changed (old vs new values).
 */
@Entity('directory_entry_audit')
@Index(['entry_id'])
@Index(['entry_id', 'changed_at'])
@Index(['action'])
@Index(['changed_by_id'])
export class DirectoryEntryAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Entry that was changed
   */
  @Column({ type: 'uuid' })
  entry_id: string;

  @ManyToOne(() => DirectoryEntry, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'entry_id' })
  entry: DirectoryEntry;

  /**
   * Type of action performed
   */
  @Column({
    type: 'enum',
    enum: AuditActionType,
  })
  action: AuditActionType;

  /**
   * User who made the change
   */
  @Column({ type: 'uuid', nullable: true })
  changed_by_id: string | null;

  /**
   * When the change was made
   */
  @CreateDateColumn({ type: 'timestamp with time zone' })
  changed_at: Date;

  /**
   * Values before the change (null for CREATE)
   */
  @Column({ type: 'jsonb', nullable: true })
  old_values: Record<string, any> | null;

  /**
   * Values after the change (null for DELETE/ARCHIVE)
   */
  @Column({ type: 'jsonb', nullable: true })
  new_values: Record<string, any> | null;

  /**
   * Optional reason/comment for the change
   */
  @Column({ type: 'text', nullable: true })
  change_reason: string | null;

  /**
   * IP address of the client that made the change
   */
  @Column({ type: 'inet', nullable: true })
  ip_address: string | null;

  /**
   * User agent of the client
   */
  @Column({ type: 'text', nullable: true })
  user_agent: string | null;
}
