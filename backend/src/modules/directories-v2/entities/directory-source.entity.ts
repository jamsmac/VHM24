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
import { DirectorySyncLog } from './directory-sync-log.entity';

/**
 * Type of external data source
 */
export enum SourceType {
  /** Load from URL (JSON, CSV, XML) */
  URL = 'url',
  /** External API with authentication */
  API = 'api',
  /** Upload file manually */
  FILE = 'file',
  /** Paste text/data manually */
  MANUAL = 'manual',
}

/**
 * Sync mode for external sources
 */
export enum SyncMode {
  /** Replace all entries on each sync */
  FULL = 'full',
  /** Only add/update changed entries */
  INCREMENTAL = 'incremental',
}

/**
 * Last sync status
 */
export enum SyncStatus {
  /** Sync completed successfully */
  SUCCESS = 'success',
  /** Sync completed with some errors */
  PARTIAL = 'partial',
  /** Sync failed completely */
  FAILED = 'failed',
}

/**
 * Configuration for URL source
 */
export interface UrlSourceConfig {
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: string;
  responseFormat: 'json' | 'csv' | 'xml';
  /** JSONPath to the data array in response */
  dataPath?: string;
  /** Expected encoding */
  encoding?: string;
}

/**
 * Configuration for API source
 */
export interface ApiSourceConfig {
  baseUrl: string;
  endpoint: string;
  method: 'GET' | 'POST';
  authType: 'none' | 'basic' | 'bearer' | 'api_key';
  authConfig?: {
    username?: string;
    /** Encrypted password */
    password?: string;
    /** Encrypted token */
    token?: string;
    /** Encrypted API key */
    apiKey?: string;
    /** Header name for API key */
    apiKeyHeader?: string;
  };
  pagination?: {
    type: 'offset' | 'cursor' | 'page';
    pageSize: number;
    pageParam: string;
    offsetParam?: string;
    cursorParam?: string;
  };
  /** Additional request headers */
  headers?: Record<string, string>;
  /** Request body template for POST */
  bodyTemplate?: string;
  /** JSONPath to data array */
  dataPath?: string;
}

/**
 * Configuration for file source
 */
export interface FileSourceConfig {
  fileType: 'csv' | 'xlsx' | 'json';
  hasHeader: boolean;
  delimiter?: string;
  sheetName?: string;
  encoding?: string;
  /** Skip first N rows */
  skipRows?: number;
}

/**
 * Configuration for manual input source
 */
export interface ManualSourceConfig {
  inputFormat: 'text' | 'json' | 'csv';
  instructions?: string;
  /** Template for expected format */
  template?: string;
}

/**
 * Field mapping configuration
 */
export interface FieldMappingItem {
  /** Source field name */
  sourceField: string;
  /** Target directory field code */
  targetField: string;
  /** Transformation to apply */
  transform?: 'none' | 'uppercase' | 'lowercase' | 'trim' | 'custom';
  /** Custom transform function name */
  customTransform?: string;
  /** Default value if source is empty */
  defaultValue?: any;
  /** Whether to skip entry if this field is empty */
  skipIfEmpty?: boolean;
}

/**
 * DirectorySource entity - external data source configuration
 *
 * Defines how to fetch and sync data from external sources into
 * a directory. Supports various source types and mapping configurations.
 */
@Entity('directory_sources')
@Index(['directory_id'])
@Index(['is_active'])
@Index(['last_sync_at'])
export class DirectorySource extends BaseEntity {
  /**
   * Target directory
   */
  @Column({ type: 'uuid' })
  directory_id: string;

  @ManyToOne(() => Directory, (directory) => directory.sources, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'directory_id' })
  directory: Directory;

  /**
   * Human-readable source name
   */
  @Column({ type: 'varchar', length: 200 })
  name: string;

  /**
   * Source description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Type of data source
   */
  @Column({
    type: 'enum',
    enum: SourceType,
  })
  source_type: SourceType;

  /**
   * Source-specific configuration
   */
  @Column({ type: 'jsonb' })
  config: UrlSourceConfig | ApiSourceConfig | FileSourceConfig | ManualSourceConfig;

  /**
   * Field mapping from source to directory
   */
  @Column({ type: 'jsonb' })
  field_mapping: FieldMappingItem[];

  /**
   * Field used for unique identification during sync
   */
  @Column({ type: 'varchar', length: 100 })
  unique_key_field: string;

  /**
   * How to handle syncs
   */
  @Column({
    type: 'enum',
    enum: SyncMode,
    default: SyncMode.INCREMENTAL,
  })
  sync_mode: SyncMode;

  /**
   * Cron expression for scheduled sync (null = manual only)
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  schedule: string | null;

  /**
   * Whether this source is active
   */
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  /**
   * Last successful sync timestamp
   */
  @Column({ type: 'timestamp with time zone', nullable: true })
  last_sync_at: Date | null;

  /**
   * Status of last sync attempt
   */
  @Column({
    type: 'enum',
    enum: SyncStatus,
    nullable: true,
  })
  last_sync_status: SyncStatus | null;

  /**
   * Error message from last failed sync
   */
  @Column({ type: 'text', nullable: true })
  last_sync_error: string | null;

  /**
   * Number of entries from this source
   */
  @Column({ type: 'integer', default: 0 })
  entry_count: number;

  /**
   * Sync history logs
   */
  @OneToMany(() => DirectorySyncLog, (log) => log.source)
  sync_logs: DirectorySyncLog[];

  /**
   * Timeout for sync operations in seconds
   */
  @Column({ type: 'integer', default: 300 })
  sync_timeout: number;

  /**
   * Maximum number of entries to process per sync
   */
  @Column({ type: 'integer', nullable: true })
  max_entries: number | null;

  /**
   * Whether to archive entries not in source on full sync
   */
  @Column({ type: 'boolean', default: false })
  archive_missing: boolean;
}
