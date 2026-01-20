/**
 * Directory System Types
 *
 * TypeScript types matching the backend entities for the directories-v2 module.
 */

// ============================================================================
// Enums
// ============================================================================

export enum DirectoryType {
  INTERNAL = 'internal',
  EXTERNAL = 'external',
  EXTERNAL_WITH_LOCAL = 'external_with_local',
  PARAMETRIC = 'parametric',
  TEMPLATE = 'template',
}

export enum DirectoryScope {
  GLOBAL = 'global',
  ORGANIZATION = 'organization',
  LOCATION = 'location',
}

export enum EntryOrigin {
  OFFICIAL = 'official',
  LOCAL = 'local',
}

export enum EntryStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  PENDING_APPROVAL = 'pending_approval',
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum DirectoryFieldType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  NUMBER = 'number',
  DECIMAL = 'decimal',
  BOOLEAN = 'boolean',
  DATE = 'date',
  DATETIME = 'datetime',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
  REFERENCE = 'reference',
  FILE = 'file',
  IMAGE = 'image',
  URL = 'url',
  EMAIL = 'email',
  PHONE = 'phone',
  JSON = 'json',
}

export enum AuditActionType {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  ARCHIVE = 'ARCHIVE',
  RESTORE = 'RESTORE',
  SYNC = 'SYNC',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Directory settings
 */
export interface DirectorySettings {
  allow_inline_create: boolean;
  allow_local_overlay: boolean;
  requires_approval: boolean;
  prefetch: boolean;
  offline_enabled: boolean;
  offline_max_entries: number;
}

/**
 * Field validation rules
 */
export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
  min?: number;
  max?: number;
  precision?: number;
  allowCustom?: boolean;
  maxSize?: number;
  allowedTypes?: string[];
  customValidator?: string;
}

/**
 * Select option for SELECT/MULTISELECT fields
 */
export interface SelectOption {
  value: string;
  label_ru: string;
  label_en?: string;
  color?: string;
  icon?: string;
  isDefault?: boolean;
  sortOrder?: number;
}

/**
 * Directory field definition
 */
export interface DirectoryField {
  id: string;
  directory_id: string;
  code: string;
  name_ru: string;
  name_en: string | null;
  description: string | null;
  field_type: DirectoryFieldType;
  reference_directory_id: string | null;
  options: SelectOption[] | null;
  validation: FieldValidation | null;
  default_value: any;
  is_required: boolean;
  is_unique: boolean;
  is_unique_per_org: boolean;
  allow_free_text: boolean;
  is_searchable: boolean;
  show_in_table: boolean;
  show_in_card: boolean;
  sort_order: number;
  is_system: boolean;
  is_active: boolean;
  placeholder: string | null;
  css_class: string | null;
  table_width: string | null;
  translations: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Directory entity
 */
export interface Directory {
  id: string;
  slug: string;
  name_ru: string;
  name_en: string | null;
  description: string | null;
  type: DirectoryType;
  scope: DirectoryScope;
  organization_id: string | null;
  is_hierarchical: boolean;
  is_system: boolean;
  is_active: boolean;
  icon: string | null;
  settings: DirectorySettings;
  fields: DirectoryField[];
  created_at: string;
  updated_at: string;
}

/**
 * Directory entry
 */
export interface DirectoryEntry {
  id: string;
  directory_id: string;
  parent_id: string | null;
  code: string;
  name_ru: string;
  name_en: string | null;
  normalized_name: string | null;
  origin: EntryOrigin;
  source_id: string | null;
  external_id: string | null;
  data: Record<string, any>;
  status: EntryStatus;
  approval_status: ApprovalStatus | null;
  approved_by_id: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  sort_order: number;
  last_synced_at: string | null;
  source_data_hash: string | null;
  version: number;
  valid_from: string | null;
  valid_to: string | null;
  deprecated_at: string | null;
  replacement_entry_id: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  // Relations (optional, loaded on demand)
  parent?: DirectoryEntry | null;
  children?: DirectoryEntry[];
  replacement_entry?: DirectoryEntry | null;
}

/**
 * Directory statistics
 */
export interface DirectoryStats {
  directory_id: string;
  total_entries: number;
  active_entries: number;
  official_entries: number;
  local_entries: number;
  last_sync_at: string | null;
  last_import_at: string | null;
  avg_search_time_ms: number | null;
  updated_at: string;
}

/**
 * Audit log entry
 */
export interface DirectoryEntryAudit {
  id: string;
  entry_id: string;
  action: AuditActionType;
  changed_by_id: string | null;
  changed_at: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  change_reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
}

// ============================================================================
// API Types
// ============================================================================

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  data: T;
}

/**
 * Search result with optional recent selections
 */
export interface SearchResult {
  data: DirectoryEntry[];
  recent?: DirectoryEntry[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

/**
 * Bulk import result
 */
export interface BulkImportResult {
  inserted: number;
  updated: number;
  errors: Array<{
    row: number;
    code: string;
    errors: Array<{ message: string }>;
  }>;
}

// ============================================================================
// DTO Types (for creating/updating)
// ============================================================================

/**
 * Create directory DTO
 */
export interface CreateDirectoryDto {
  slug: string;
  name_ru: string;
  name_en?: string;
  description?: string;
  type: DirectoryType;
  scope?: DirectoryScope;
  organization_id?: string;
  is_hierarchical?: boolean;
  icon?: string;
  settings?: Partial<DirectorySettings>;
  fields?: CreateFieldDto[];
}

/**
 * Update directory DTO
 */
export interface UpdateDirectoryDto {
  name_ru?: string;
  name_en?: string;
  description?: string;
  scope?: DirectoryScope;
  organization_id?: string;
  is_hierarchical?: boolean;
  icon?: string;
  settings?: Partial<DirectorySettings>;
}

/**
 * Create field DTO
 */
export interface CreateFieldDto {
  code: string;
  name_ru: string;
  name_en?: string;
  description?: string;
  field_type: DirectoryFieldType;
  reference_directory_id?: string;
  allow_free_text?: boolean;
  is_required?: boolean;
  is_unique?: boolean;
  is_searchable?: boolean;
  show_in_table?: boolean;
  show_in_card?: boolean;
  sort_order?: number;
  default_value?: any;
  validation?: FieldValidation;
  options?: SelectOption[];
}

/**
 * Create entry DTO
 */
export interface CreateEntryDto {
  code: string;
  name_ru: string;
  name_en?: string;
  parent_id?: string;
  origin?: EntryOrigin;
  external_id?: string;
  status?: EntryStatus;
  tags?: string[];
  sort_order?: number;
  data?: Record<string, any>;
  valid_from?: string;
  valid_to?: string;
}

/**
 * Update entry DTO
 */
export interface UpdateEntryDto {
  name_ru?: string;
  name_en?: string;
  parent_id?: string;
  status?: EntryStatus;
  tags?: string[];
  sort_order?: number;
  data?: Record<string, any>;
  valid_from?: string;
  valid_to?: string;
  replacement_entry_id?: string;
  rejection_reason?: string;
}

/**
 * Search query parameters
 */
export interface SearchQueryParams {
  q?: string;
  status?: EntryStatus;
  origin?: EntryOrigin;
  parent_id?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  include_recent?: boolean;
  sort?: string;
  roots_only?: boolean;
}
