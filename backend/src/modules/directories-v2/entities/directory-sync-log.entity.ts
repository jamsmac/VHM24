import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DirectorySource, SyncStatus } from './directory-source.entity';
import { Directory } from './directory.entity';

/**
 * How the sync was triggered
 */
export enum SyncTrigger {
  /** Triggered by cron schedule */
  SCHEDULE = 'schedule',
  /** Triggered manually by user */
  MANUAL = 'manual',
  /** Triggered via API */
  API = 'api',
  /** Triggered by system (e.g., on source creation) */
  SYSTEM = 'system',
}

/**
 * Individual sync error details
 */
export interface SyncErrorDetail {
  /** Original source record that failed */
  sourceRecord?: any;
  /** Type of error */
  errorType: 'validation' | 'mapping' | 'duplicate' | 'system' | 'network';
  /** Error message */
  errorMessage: string;
  /** Field-specific errors */
  fieldErrors?: Record<string, string>;
  /** Row/index in source data */
  rowIndex?: number;
}

/**
 * DirectorySyncLog entity - sync history and logs
 *
 * Tracks every sync operation for external sources including
 * counts, errors, and timing information.
 */
@Entity('directory_sync_logs')
@Index(['source_id'])
@Index(['directory_id'])
@Index(['status'])
@Index(['started_at'])
@Index(['triggered_by'])
export class DirectorySyncLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Source that was synced
   */
  @Column({ type: 'uuid' })
  source_id: string;

  @ManyToOne(() => DirectorySource, (source) => source.sync_logs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'source_id' })
  source: DirectorySource;

  /**
   * Directory being synced (denormalized for faster queries)
   */
  @Column({ type: 'uuid' })
  directory_id: string;

  @ManyToOne(() => Directory, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'directory_id' })
  directory: Directory;

  /**
   * When the sync started
   */
  @Column({ type: 'timestamp with time zone' })
  started_at: Date;

  /**
   * When the sync completed (null if still running)
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  completed_at: Date | null;

  /**
   * Duration in milliseconds
   */
  @Column({ type: 'integer', nullable: true })
  duration_ms: number | null;

  /**
   * Sync status
   */
  @Column({
    type: 'enum',
    enum: SyncStatus,
    default: SyncStatus.SUCCESS,
  })
  status: SyncStatus;

  /**
   * Total records found in source
   */
  @Column({ type: 'integer', nullable: true })
  total_records: number | null;

  /**
   * New entries created
   */
  @Column({ type: 'integer', default: 0 })
  created_count: number;

  /**
   * Existing entries updated
   */
  @Column({ type: 'integer', default: 0 })
  updated_count: number;

  /**
   * Entries skipped (no changes)
   */
  @Column({ type: 'integer', default: 0 })
  skipped_count: number;

  /**
   * Entries archived (for full sync with archive_missing)
   */
  @Column({ type: 'integer', default: 0 })
  archived_count: number;

  /**
   * Entries with errors
   */
  @Column({ type: 'integer', default: 0 })
  error_count: number;

  /**
   * Error details array
   */
  @Column({ type: 'jsonb', nullable: true })
  errors: SyncErrorDetail[] | null;

  /**
   * General error message (if entire sync failed)
   */
  @Column({ type: 'text', nullable: true })
  error_message: string | null;

  /**
   * How the sync was triggered
   */
  @Column({
    type: 'enum',
    enum: SyncTrigger,
    default: SyncTrigger.MANUAL,
  })
  triggered_by: SyncTrigger;

  /**
   * User who triggered the sync (if manual)
   */
  @Column({ type: 'uuid', nullable: true })
  triggered_by_user_id: string | null;

  /**
   * Source data preview (first N records for debugging)
   */
  @Column({ type: 'jsonb', nullable: true })
  source_data_sample: any[] | null;

  /**
   * HTTP response code (for URL/API sources)
   */
  @Column({ type: 'integer', nullable: true })
  http_status: number | null;

  /**
   * Request/Response metadata for debugging
   */
  @Column({ type: 'jsonb', nullable: true })
  request_metadata: {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    responseSize?: number;
  } | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;
}
