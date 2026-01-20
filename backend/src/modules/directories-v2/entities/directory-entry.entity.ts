import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Directory } from './directory.entity';
import { DirectorySource } from './directory-source.entity';
import { DirectoryEntryFile } from './directory-entry-file.entity';

/**
 * Entry origin - where the entry came from
 */
export enum EntryOrigin {
  /** Entry from official external source (read-only for users) */
  OFFICIAL = 'official',
  /** Entry added manually by users */
  LOCAL = 'local',
}

/**
 * Entry status
 */
export enum EntryStatus {
  /** Active and visible */
  ACTIVE = 'active',
  /** Archived - hidden from selection but preserved */
  ARCHIVED = 'archived',
  /** Pending approval before becoming active */
  PENDING_APPROVAL = 'pending_approval',
}

/**
 * Approval status for entries requiring approval
 */
export enum ApprovalStatus {
  /** Waiting for review */
  PENDING = 'pending',
  /** Approved and active */
  APPROVED = 'approved',
  /** Rejected */
  REJECTED = 'rejected',
}

/**
 * DirectoryEntry entity - actual data entries in directories
 *
 * Entries store the actual reference data values. Each entry belongs
 * to a directory and stores its field values in a flexible JSONB column.
 * Entries track their origin (official vs local) and support approval workflows.
 */
@Entity('directory_entries')
@Index(['directory_id', 'code'], { unique: true })
@Index(['directory_id', 'status'])
@Index(['directory_id', 'origin'])
@Index(['source_id'])
@Index(['external_id'])
@Index(['status'])
@Index(['origin'])
@Index(['approval_status'])
@Index(['parent_id'])
export class DirectoryEntry extends BaseEntity {
  /**
   * Parent directory
   */
  @Column({ type: 'uuid' })
  directory_id: string;

  @ManyToOne(() => Directory, (directory) => directory.entries, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'directory_id' })
  directory: Directory;

  /**
   * Parent entry for hierarchical directories
   */
  @Column({ type: 'uuid', nullable: true })
  parent_id: string | null;

  @ManyToOne(() => DirectoryEntry, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: DirectoryEntry | null;

  /**
   * Unique code within the directory (e.g., 'VM-001', 'IKPU-123')
   */
  @Column({ type: 'varchar', length: 200 })
  code: string;

  /**
   * Russian display name
   */
  @Column({ type: 'varchar', length: 500 })
  name_ru: string;

  /**
   * English display name
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  name_en: string | null;

  /**
   * Normalized name for search (lowercase, trimmed, no accents)
   * Auto-populated by database trigger
   */
  @Column({ type: 'text', nullable: true })
  normalized_name: string | null;

  /**
   * Entry origin - official (from source) or local (manual)
   */
  @Column({
    type: 'enum',
    enum: EntryOrigin,
    default: EntryOrigin.LOCAL,
  })
  origin: EntryOrigin;

  /**
   * Source that provided this entry (for official entries)
   */
  @Column({ type: 'uuid', nullable: true })
  source_id: string | null;

  @ManyToOne(() => DirectorySource, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'source_id' })
  source: DirectorySource | null;

  /**
   * External ID from the source system
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  external_id: string | null;

  /**
   * Field values stored as key-value pairs
   * Keys correspond to field codes from DirectoryField
   */
  @Column({ type: 'jsonb', default: {} })
  data: Record<string, any>;

  /**
   * Entry status
   */
  @Column({
    type: 'enum',
    enum: EntryStatus,
    default: EntryStatus.ACTIVE,
  })
  status: EntryStatus;

  /**
   * Approval status (if directory requires approval)
   */
  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    nullable: true,
  })
  approval_status: ApprovalStatus | null;

  /**
   * User who approved the entry
   */
  @Column({ type: 'uuid', nullable: true })
  approved_by_id: string | null;

  /**
   * When the entry was approved
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  approved_at: Date | null;

  /**
   * Rejection reason (if rejected)
   */
  @Column({ type: 'text', nullable: true })
  rejection_reason: string | null;

  /**
   * Display order
   */
  @Column({ type: 'integer', default: 0 })
  sort_order: number;

  /**
   * Full-text search vector (PostgreSQL tsvector)
   * Updated automatically via trigger
   */
  @Column({ type: 'tsvector', nullable: true, select: false })
  search_vector: string | null;

  /**
   * Last sync timestamp (for official entries)
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  last_synced_at: Date | null;

  /**
   * Hash of the source data (for change detection during sync)
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  source_data_hash: string | null;

  /**
   * Version for optimistic locking (auto-incremented on update)
   */
  @Column({ type: 'integer', default: 1 })
  version: number;

  /**
   * Entry validity start date
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  valid_from: Date | null;

  /**
   * Entry validity end date
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  valid_to: Date | null;

  /**
   * When entry was deprecated (for OFFICIAL entries from external sources)
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  deprecated_at: Date | null;

  /**
   * Recommended replacement entry for deprecated entries
   */
  @Column({ type: 'uuid', nullable: true })
  replacement_entry_id: string | null;

  @ManyToOne(() => DirectoryEntry, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'replacement_entry_id' })
  replacement_entry: DirectoryEntry | null;

  /**
   * Tags for filtering and categorization
   */
  @Column({ type: 'text', array: true, nullable: true })
  tags: string[] | null;

  /**
   * File attachments for this entry
   */
  @OneToMany(() => DirectoryEntryFile, (file) => file.entry)
  files: DirectoryEntryFile[];
}
