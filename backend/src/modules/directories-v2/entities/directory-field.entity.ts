import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';
import { Directory } from './directory.entity';

/**
 * Field types supported in directory entries
 */
export enum DirectoryFieldType {
  /** Single line text */
  TEXT = 'text',
  /** Multi-line text */
  TEXTAREA = 'textarea',
  /** Integer number */
  NUMBER = 'number',
  /** Decimal number with precision */
  DECIMAL = 'decimal',
  /** Boolean yes/no */
  BOOLEAN = 'boolean',
  /** Date only */
  DATE = 'date',
  /** Date and time */
  DATETIME = 'datetime',
  /** Single selection from fixed options */
  SELECT = 'select',
  /** Multiple selections from fixed options */
  MULTISELECT = 'multiselect',
  /** Reference to another directory entry */
  REFERENCE = 'reference',
  /** File attachment */
  FILE = 'file',
  /** Image file */
  IMAGE = 'image',
  /** URL/Link */
  URL = 'url',
  /** Email address */
  EMAIL = 'email',
  /** Phone number */
  PHONE = 'phone',
  /** Arbitrary JSON object */
  JSON = 'json',
}

/**
 * Validation rules for a field
 */
export interface FieldValidation {
  /** Minimum text length */
  minLength?: number;
  /** Maximum text length */
  maxLength?: number;
  /** Regex pattern for validation */
  pattern?: string;
  /** Pattern error message */
  patternMessage?: string;
  /** Minimum number value */
  min?: number;
  /** Maximum number value */
  max?: number;
  /** Decimal places precision */
  precision?: number;
  /** Allow values not in options list */
  allowCustom?: boolean;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Allowed MIME types for files */
  allowedTypes?: string[];
  /** Custom validator function name */
  customValidator?: string;
}

/**
 * Option for select/multiselect fields
 */
export interface SelectOption {
  /** Option value */
  value: string;
  /** Russian label */
  label_ru: string;
  /** English label */
  label_en?: string;
  /** Color for display */
  color?: string;
  /** Icon identifier */
  icon?: string;
  /** Is this the default option */
  isDefault?: boolean;
  /** Display order */
  sortOrder?: number;
}

/**
 * DirectoryField entity - field definition for directory entries
 *
 * Each directory can have multiple fields that define the structure
 * of its entries. Fields support various data types and can reference
 * other directories for lookup relationships.
 */
@Entity('directory_fields')
@Index(['directory_id', 'code'], { unique: true })
@Index(['directory_id', 'sort_order'])
@Index(['reference_directory_id'])
@Index(['is_active'])
export class DirectoryField extends BaseEntity {
  /**
   * Parent directory
   */
  @Column({ type: 'uuid' })
  directory_id: string;

  @ManyToOne(() => Directory, (directory) => directory.fields, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'directory_id' })
  directory: Directory;

  /**
   * Field code used as key in entry data JSONB
   */
  @Column({ type: 'varchar', length: 100 })
  code: string;

  /**
   * Russian field label
   */
  @Column({ type: 'varchar', length: 200 })
  name_ru: string;

  /**
   * English field label
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  name_en: string | null;

  /**
   * Help text / description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Data type of the field
   */
  @Column({
    type: 'enum',
    enum: DirectoryFieldType,
    default: DirectoryFieldType.TEXT,
  })
  field_type: DirectoryFieldType;

  /**
   * For REFERENCE type - which directory to reference
   */
  @Column({ type: 'uuid', nullable: true })
  reference_directory_id: string | null;

  @ManyToOne(() => Directory, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'reference_directory_id' })
  reference_directory: Directory | null;

  /**
   * For SELECT/MULTISELECT - list of options
   */
  @Column({ type: 'jsonb', nullable: true })
  options: SelectOption[] | null;

  /**
   * Validation rules
   */
  @Column({ type: 'jsonb', nullable: true })
  validation: FieldValidation | null;

  /**
   * Default value (type depends on field_type)
   */
  @Column({ type: 'jsonb', nullable: true })
  default_value: any | null;

  /**
   * Field is required
   */
  @Column({ type: 'boolean', default: false })
  is_required: boolean;

  /**
   * Field must be unique across entries
   */
  @Column({ type: 'boolean', default: false })
  is_unique: boolean;

  /**
   * Include in full-text search
   */
  @Column({ type: 'boolean', default: false })
  is_searchable: boolean;

  /**
   * Show in table/list view
   */
  @Column({ type: 'boolean', default: true })
  show_in_table: boolean;

  /**
   * Show in card/detail view
   */
  @Column({ type: 'boolean', default: true })
  show_in_card: boolean;

  /**
   * Display order
   */
  @Column({ type: 'integer', default: 0 })
  sort_order: number;

  /**
   * System field - cannot be deleted
   */
  @Column({ type: 'boolean', default: false })
  is_system: boolean;

  /**
   * Active status
   */
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  /**
   * Placeholder text for input
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  placeholder: string | null;

  /**
   * CSS/Tailwind classes for custom styling
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  css_class: string | null;

  /**
   * Width hint for table column (px, %, auto)
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  table_width: string | null;
}
