import {
  Entity,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DirectoryFieldType, FieldValidation, SelectOption } from './directory-field.entity';
import { DirectorySettings, DirectoryType } from './directory.entity';

/**
 * Template field definition
 */
export interface TemplateFieldDefinition {
  code: string;
  name_ru: string;
  name_en?: string;
  description?: string;
  field_type: DirectoryFieldType;
  /** For REFERENCE - directory code to reference */
  reference_directory_code?: string;
  options?: SelectOption[];
  validation?: FieldValidation;
  default_value?: any;
  is_required: boolean;
  is_unique?: boolean;
  is_searchable?: boolean;
  show_in_table: boolean;
  show_in_card: boolean;
  sort_order: number;
  is_system?: boolean;
  placeholder?: string;
  table_width?: string;
}

/**
 * Template category
 */
export enum TemplateCategory {
  /** Core business entities */
  BUSINESS = 'business',
  /** Reference/lookup data */
  REFERENCE = 'reference',
  /** Configuration/settings */
  CONFIGURATION = 'configuration',
  /** External integrations */
  INTEGRATION = 'integration',
  /** Custom/other */
  CUSTOM = 'custom',
}

/**
 * DirectoryTemplate entity - predefined templates for directories
 *
 * Templates provide ready-made structures for common directory types.
 * Users can create new directories from templates with pre-configured
 * fields and settings.
 */
@Entity('directory_templates')
@Index(['code'], { unique: true })
@Index(['category'])
@Index(['is_active'])
export class DirectoryTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Unique template code
   */
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  /**
   * Russian name
   */
  @Column({ type: 'varchar', length: 200 })
  name_ru: string;

  /**
   * English name
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  name_en: string | null;

  /**
   * Template description
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Icon identifier
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  icon: string | null;

  /**
   * Color code
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  color: string | null;

  /**
   * Template category
   */
  @Column({
    type: 'enum',
    enum: TemplateCategory,
    default: TemplateCategory.REFERENCE,
  })
  category: TemplateCategory;

  /**
   * Default directory type when created from this template
   */
  @Column({
    type: 'enum',
    enum: DirectoryType,
    default: DirectoryType.INTERNAL,
  })
  default_type: DirectoryType;

  /**
   * Field definitions
   */
  @Column({ type: 'jsonb' })
  default_fields: TemplateFieldDefinition[];

  /**
   * Default settings for directories created from this template
   */
  @Column({ type: 'jsonb', nullable: true })
  default_settings: DirectorySettings | null;

  /**
   * Whether the template is active
   */
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  /**
   * System template - cannot be deleted
   */
  @Column({ type: 'boolean', default: false })
  is_system: boolean;

  /**
   * Display order
   */
  @Column({ type: 'integer', default: 0 })
  sort_order: number;

  /**
   * Usage count (how many directories created from this template)
   */
  @Column({ type: 'integer', default: 0 })
  usage_count: number;

  /**
   * Example data preview (for UI demonstration)
   */
  @Column({ type: 'jsonb', nullable: true })
  example_data: Record<string, any>[] | null;

  /**
   * Tags for search/filtering
   */
  @Column({ type: 'simple-array', nullable: true })
  tags: string[] | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
