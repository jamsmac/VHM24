import {
  Entity,
  Column,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { DirectoryField } from './directory-field.entity';
import { DirectoryEntry } from './directory-entry.entity';
import { DirectorySource } from './directory-source.entity';

/**
 * Directory type defines how the directory is managed
 */
export enum DirectoryType {
  /** User-created and maintained directory */
  INTERNAL = 'internal',
  /** Populated from external sources (read-only) */
  EXTERNAL = 'external',
  /** External with local additions allowed */
  EXTERNAL_WITH_LOCAL = 'external_with_local',
  /** Simple value list for parameters */
  PARAMETRIC = 'parametric',
  /** Created from a predefined template */
  TEMPLATE = 'template',
}

/**
 * Directory scope defines visibility and access
 */
export enum DirectoryScope {
  /** Available across all organizations (HQ level) */
  GLOBAL = 'global',
  /** Available within a specific organization */
  ORGANIZATION = 'organization',
  /** Available only at a specific location */
  LOCATION = 'location',
}

/**
 * Directory settings stored as JSONB
 */
export interface DirectorySettings {
  /** Fields to show in table view */
  tableColumns?: string[];
  /** Card layout style */
  cardLayout?: 'default' | 'compact' | 'detailed';
  /** Show OFFICIAL/LOCAL origin badge */
  showOriginBadge?: boolean;
  /** Allow local additions for external directories */
  allowLocalAdditions?: boolean;
  /** Require approval for new entries */
  requireApproval?: boolean;
  /** Enable inline creation from dropdowns */
  allowInlineCreate?: boolean;
  /** Fields included in full-text search */
  searchableFields?: string[];
  /** Default sort configuration */
  defaultSort?: {
    field: string;
    order: 'asc' | 'desc';
  };
  /** Access control settings */
  permissions?: {
    viewRoles?: string[];
    editRoles?: string[];
    deleteRoles?: string[];
  };
}

/**
 * Directory entity - main directory definition
 *
 * Directories are the core of the reference data system in VHM24.
 * They define structure for storing lookup values, catalogs, and
 * other reference data used throughout the system.
 */
@Entity('directories_v2')
@Index(['code'], { unique: true })
@Index(['type'])
@Index(['scope'])
@Index(['organization_id'])
@Index(['is_active'])
export class Directory extends BaseEntity {
  /**
   * Unique code/slug for the directory (e.g., 'machine_types', 'products')
   * Used in API calls and as reference key
   */
  @Column({ type: 'varchar', length: 100, unique: true })
  code: string;

  /**
   * Russian display name
   */
  @Column({ type: 'varchar', length: 200 })
  name_ru: string;

  /**
   * English display name (optional)
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  name_en: string | null;

  /**
   * Detailed description of the directory purpose
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Directory type determines management approach
   */
  @Column({
    type: 'enum',
    enum: DirectoryType,
    default: DirectoryType.INTERNAL,
  })
  type: DirectoryType;

  /**
   * Scope determines visibility and access
   */
  @Column({
    type: 'enum',
    enum: DirectoryScope,
    default: DirectoryScope.GLOBAL,
  })
  scope: DirectoryScope;

  /**
   * Organization ID for organization-scoped directories
   */
  @Column({ type: 'uuid', nullable: true })
  organization_id: string | null;

  /**
   * Location ID for location-scoped directories
   */
  @Column({ type: 'uuid', nullable: true })
  location_id: string | null;

  /**
   * Template code if created from a template
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  template_code: string | null;

  /**
   * Icon identifier for UI display
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  icon: string | null;

  /**
   * Color code for UI display (hex or named)
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  color: string | null;

  /**
   * Flexible settings for UI and behavior
   */
  @Column({ type: 'jsonb', nullable: true })
  settings: DirectorySettings | null;

  /**
   * System directory flag - cannot be deleted
   */
  @Column({ type: 'boolean', default: false })
  is_system: boolean;

  /**
   * Active status - inactive directories are hidden from selection
   */
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  /**
   * Display order in lists
   */
  @Column({ type: 'integer', default: 0 })
  sort_order: number;

  /**
   * Field definitions for this directory
   */
  @OneToMany(() => DirectoryField, (field) => field.directory, {
    cascade: true,
  })
  fields: DirectoryField[];

  /**
   * Entries in this directory
   */
  @OneToMany(() => DirectoryEntry, (entry) => entry.directory)
  entries: DirectoryEntry[];

  /**
   * External data sources for this directory
   */
  @OneToMany(() => DirectorySource, (source) => source.directory)
  sources: DirectorySource[];
}
