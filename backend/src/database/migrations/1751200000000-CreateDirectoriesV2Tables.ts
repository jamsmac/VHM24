import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * Creates the comprehensive directories system tables:
 * - directories_v2: Main directory definitions
 * - directory_fields: Field definitions for entries
 * - directory_entries: Actual data entries
 * - directory_sources: External data sources
 * - directory_sync_logs: Sync history
 * - directory_entry_files: File attachments
 * - directory_templates: Predefined templates
 */
export class CreateDirectoriesV2Tables1751200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(`
      CREATE TYPE directory_type AS ENUM (
        'internal',
        'external',
        'external_with_local',
        'parametric',
        'template'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE directory_scope AS ENUM (
        'global',
        'organization',
        'location'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE directory_field_type AS ENUM (
        'text',
        'textarea',
        'number',
        'decimal',
        'boolean',
        'date',
        'datetime',
        'select',
        'multiselect',
        'reference',
        'file',
        'image',
        'url',
        'email',
        'phone',
        'json'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE entry_origin AS ENUM (
        'official',
        'local'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE entry_status AS ENUM (
        'active',
        'archived',
        'pending_approval'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE approval_status AS ENUM (
        'pending',
        'approved',
        'rejected'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE source_type AS ENUM (
        'url',
        'api',
        'file',
        'manual'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE sync_mode AS ENUM (
        'full',
        'incremental'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE sync_status AS ENUM (
        'success',
        'partial',
        'failed'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE sync_trigger AS ENUM (
        'schedule',
        'manual',
        'api',
        'system'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE template_category AS ENUM (
        'business',
        'reference',
        'configuration',
        'integration',
        'custom'
      )
    `);

    // 1. Create directories_v2 table
    await queryRunner.createTable(
      new Table({
        name: 'directories_v2',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '100',
            isUnique: true,
          },
          {
            name: 'name_ru',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'name_en',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'directory_type',
            default: "'internal'",
          },
          {
            name: 'scope',
            type: 'directory_scope',
            default: "'global'",
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'location_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'template_code',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'icon',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'color',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'settings',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'is_system',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'sort_order',
            type: 'integer',
            default: 0,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'deleted_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'created_by_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'updated_by_id',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Indexes for directories_v2
    await queryRunner.createIndex(
      'directories_v2',
      new TableIndex({
        name: 'IDX_directories_v2_code',
        columnNames: ['code'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'directories_v2',
      new TableIndex({
        name: 'IDX_directories_v2_type',
        columnNames: ['type'],
      }),
    );

    await queryRunner.createIndex(
      'directories_v2',
      new TableIndex({
        name: 'IDX_directories_v2_scope',
        columnNames: ['scope'],
      }),
    );

    await queryRunner.createIndex(
      'directories_v2',
      new TableIndex({
        name: 'IDX_directories_v2_organization_id',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'directories_v2',
      new TableIndex({
        name: 'IDX_directories_v2_is_active',
        columnNames: ['is_active'],
      }),
    );

    // 2. Create directory_fields table
    await queryRunner.createTable(
      new Table({
        name: 'directory_fields',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'directory_id',
            type: 'uuid',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'name_ru',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'name_en',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'field_type',
            type: 'directory_field_type',
            default: "'text'",
          },
          {
            name: 'reference_directory_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'options',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'validation',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'default_value',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'is_required',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_unique',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_searchable',
            type: 'boolean',
            default: false,
          },
          {
            name: 'show_in_table',
            type: 'boolean',
            default: true,
          },
          {
            name: 'show_in_card',
            type: 'boolean',
            default: true,
          },
          {
            name: 'sort_order',
            type: 'integer',
            default: 0,
          },
          {
            name: 'is_system',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'placeholder',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'css_class',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'table_width',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'created_by_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'updated_by_id',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Indexes for directory_fields
    await queryRunner.createIndex(
      'directory_fields',
      new TableIndex({
        name: 'IDX_directory_fields_directory_code',
        columnNames: ['directory_id', 'code'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'directory_fields',
      new TableIndex({
        name: 'IDX_directory_fields_sort',
        columnNames: ['directory_id', 'sort_order'],
      }),
    );

    await queryRunner.createIndex(
      'directory_fields',
      new TableIndex({
        name: 'IDX_directory_fields_reference',
        columnNames: ['reference_directory_id'],
      }),
    );

    await queryRunner.createIndex(
      'directory_fields',
      new TableIndex({
        name: 'IDX_directory_fields_is_active',
        columnNames: ['is_active'],
      }),
    );

    // Foreign keys for directory_fields
    await queryRunner.createForeignKey(
      'directory_fields',
      new TableForeignKey({
        name: 'FK_directory_fields_directory',
        columnNames: ['directory_id'],
        referencedTableName: 'directories_v2',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'directory_fields',
      new TableForeignKey({
        name: 'FK_directory_fields_reference_directory',
        columnNames: ['reference_directory_id'],
        referencedTableName: 'directories_v2',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // 3. Create directory_sources table
    await queryRunner.createTable(
      new Table({
        name: 'directory_sources',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'directory_id',
            type: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'source_type',
            type: 'source_type',
          },
          {
            name: 'config',
            type: 'jsonb',
          },
          {
            name: 'field_mapping',
            type: 'jsonb',
          },
          {
            name: 'unique_key_field',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'sync_mode',
            type: 'sync_mode',
            default: "'incremental'",
          },
          {
            name: 'schedule',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'last_sync_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'last_sync_status',
            type: 'sync_status',
            isNullable: true,
          },
          {
            name: 'last_sync_error',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'entry_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'sync_timeout',
            type: 'integer',
            default: 300,
          },
          {
            name: 'max_entries',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'archive_missing',
            type: 'boolean',
            default: false,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'created_by_id',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Indexes for directory_sources
    await queryRunner.createIndex(
      'directory_sources',
      new TableIndex({
        name: 'IDX_directory_sources_directory',
        columnNames: ['directory_id'],
      }),
    );

    await queryRunner.createIndex(
      'directory_sources',
      new TableIndex({
        name: 'IDX_directory_sources_is_active',
        columnNames: ['is_active'],
      }),
    );

    await queryRunner.createIndex(
      'directory_sources',
      new TableIndex({
        name: 'IDX_directory_sources_last_sync',
        columnNames: ['last_sync_at'],
      }),
    );

    // Foreign key for directory_sources
    await queryRunner.createForeignKey(
      'directory_sources',
      new TableForeignKey({
        name: 'FK_directory_sources_directory',
        columnNames: ['directory_id'],
        referencedTableName: 'directories_v2',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // 4. Create directory_entries table
    await queryRunner.createTable(
      new Table({
        name: 'directory_entries',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'directory_id',
            type: 'uuid',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'name_ru',
            type: 'varchar',
            length: '500',
          },
          {
            name: 'name_en',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'origin',
            type: 'entry_origin',
            default: "'local'",
          },
          {
            name: 'source_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'external_id',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'data',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'status',
            type: 'entry_status',
            default: "'active'",
          },
          {
            name: 'approval_status',
            type: 'approval_status',
            isNullable: true,
          },
          {
            name: 'approved_by_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'approved_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'rejection_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'sort_order',
            type: 'integer',
            default: 0,
          },
          {
            name: 'search_vector',
            type: 'tsvector',
            isNullable: true,
          },
          {
            name: 'last_synced_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'source_data_hash',
            type: 'varchar',
            length: '64',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'deleted_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'created_by_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'updated_by_id',
            type: 'uuid',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Indexes for directory_entries
    await queryRunner.createIndex(
      'directory_entries',
      new TableIndex({
        name: 'IDX_directory_entries_directory_code',
        columnNames: ['directory_id', 'code'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'directory_entries',
      new TableIndex({
        name: 'IDX_directory_entries_directory_status',
        columnNames: ['directory_id', 'status'],
      }),
    );

    await queryRunner.createIndex(
      'directory_entries',
      new TableIndex({
        name: 'IDX_directory_entries_directory_origin',
        columnNames: ['directory_id', 'origin'],
      }),
    );

    await queryRunner.createIndex(
      'directory_entries',
      new TableIndex({
        name: 'IDX_directory_entries_source',
        columnNames: ['source_id'],
      }),
    );

    await queryRunner.createIndex(
      'directory_entries',
      new TableIndex({
        name: 'IDX_directory_entries_external_id',
        columnNames: ['external_id'],
      }),
    );

    await queryRunner.createIndex(
      'directory_entries',
      new TableIndex({
        name: 'IDX_directory_entries_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'directory_entries',
      new TableIndex({
        name: 'IDX_directory_entries_origin',
        columnNames: ['origin'],
      }),
    );

    await queryRunner.createIndex(
      'directory_entries',
      new TableIndex({
        name: 'IDX_directory_entries_approval',
        columnNames: ['approval_status'],
      }),
    );

    // GIN index for full-text search
    await queryRunner.query(`
      CREATE INDEX "IDX_directory_entries_search_vector"
      ON "directory_entries" USING GIN ("search_vector")
    `);

    // GIN index for JSONB data queries
    await queryRunner.query(`
      CREATE INDEX "IDX_directory_entries_data"
      ON "directory_entries" USING GIN ("data")
    `);

    // Foreign keys for directory_entries
    await queryRunner.createForeignKey(
      'directory_entries',
      new TableForeignKey({
        name: 'FK_directory_entries_directory',
        columnNames: ['directory_id'],
        referencedTableName: 'directories_v2',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'directory_entries',
      new TableForeignKey({
        name: 'FK_directory_entries_source',
        columnNames: ['source_id'],
        referencedTableName: 'directory_sources',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // 5. Create directory_sync_logs table
    await queryRunner.createTable(
      new Table({
        name: 'directory_sync_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'source_id',
            type: 'uuid',
          },
          {
            name: 'directory_id',
            type: 'uuid',
          },
          {
            name: 'started_at',
            type: 'timestamp with time zone',
          },
          {
            name: 'completed_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'duration_ms',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'sync_status',
            default: "'success'",
          },
          {
            name: 'total_records',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'created_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'updated_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'skipped_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'archived_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'error_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'errors',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'error_message',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'triggered_by',
            type: 'sync_trigger',
            default: "'manual'",
          },
          {
            name: 'triggered_by_user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'source_data_sample',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'http_status',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'request_metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Indexes for directory_sync_logs
    await queryRunner.createIndex(
      'directory_sync_logs',
      new TableIndex({
        name: 'IDX_directory_sync_logs_source',
        columnNames: ['source_id'],
      }),
    );

    await queryRunner.createIndex(
      'directory_sync_logs',
      new TableIndex({
        name: 'IDX_directory_sync_logs_directory',
        columnNames: ['directory_id'],
      }),
    );

    await queryRunner.createIndex(
      'directory_sync_logs',
      new TableIndex({
        name: 'IDX_directory_sync_logs_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'directory_sync_logs',
      new TableIndex({
        name: 'IDX_directory_sync_logs_started_at',
        columnNames: ['started_at'],
      }),
    );

    await queryRunner.createIndex(
      'directory_sync_logs',
      new TableIndex({
        name: 'IDX_directory_sync_logs_triggered_by',
        columnNames: ['triggered_by'],
      }),
    );

    // Foreign keys for directory_sync_logs
    await queryRunner.createForeignKey(
      'directory_sync_logs',
      new TableForeignKey({
        name: 'FK_directory_sync_logs_source',
        columnNames: ['source_id'],
        referencedTableName: 'directory_sources',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'directory_sync_logs',
      new TableForeignKey({
        name: 'FK_directory_sync_logs_directory',
        columnNames: ['directory_id'],
        referencedTableName: 'directories_v2',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // 6. Create directory_entry_files table
    await queryRunner.createTable(
      new Table({
        name: 'directory_entry_files',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'entry_id',
            type: 'uuid',
          },
          {
            name: 'field_code',
            type: 'varchar',
            length: '100',
          },
          {
            name: 'file_id',
            type: 'uuid',
          },
          {
            name: 'sort_order',
            type: 'integer',
            default: 0,
          },
          {
            name: 'caption',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'is_primary',
            type: 'boolean',
            default: false,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Indexes for directory_entry_files
    await queryRunner.createIndex(
      'directory_entry_files',
      new TableIndex({
        name: 'IDX_directory_entry_files_entry',
        columnNames: ['entry_id'],
      }),
    );

    await queryRunner.createIndex(
      'directory_entry_files',
      new TableIndex({
        name: 'IDX_directory_entry_files_entry_field',
        columnNames: ['entry_id', 'field_code'],
      }),
    );

    await queryRunner.createIndex(
      'directory_entry_files',
      new TableIndex({
        name: 'IDX_directory_entry_files_file',
        columnNames: ['file_id'],
      }),
    );

    // Foreign key for directory_entry_files
    await queryRunner.createForeignKey(
      'directory_entry_files',
      new TableForeignKey({
        name: 'FK_directory_entry_files_entry',
        columnNames: ['entry_id'],
        referencedTableName: 'directory_entries',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // 7. Create directory_templates table
    await queryRunner.createTable(
      new Table({
        name: 'directory_templates',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '50',
            isUnique: true,
          },
          {
            name: 'name_ru',
            type: 'varchar',
            length: '200',
          },
          {
            name: 'name_en',
            type: 'varchar',
            length: '200',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'icon',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'color',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'category',
            type: 'template_category',
            default: "'reference'",
          },
          {
            name: 'default_type',
            type: 'directory_type',
            default: "'internal'",
          },
          {
            name: 'default_fields',
            type: 'jsonb',
          },
          {
            name: 'default_settings',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'is_system',
            type: 'boolean',
            default: false,
          },
          {
            name: 'sort_order',
            type: 'integer',
            default: 0,
          },
          {
            name: 'usage_count',
            type: 'integer',
            default: 0,
          },
          {
            name: 'example_data',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Indexes for directory_templates
    await queryRunner.createIndex(
      'directory_templates',
      new TableIndex({
        name: 'IDX_directory_templates_code',
        columnNames: ['code'],
        isUnique: true,
      }),
    );

    await queryRunner.createIndex(
      'directory_templates',
      new TableIndex({
        name: 'IDX_directory_templates_category',
        columnNames: ['category'],
      }),
    );

    await queryRunner.createIndex(
      'directory_templates',
      new TableIndex({
        name: 'IDX_directory_templates_is_active',
        columnNames: ['is_active'],
      }),
    );

    // Create trigger function for updating search_vector
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION directory_entries_search_vector_update()
      RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('russian', coalesce(NEW.code, '')), 'A') ||
          setweight(to_tsvector('russian', coalesce(NEW.name_ru, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(NEW.name_en, '')), 'B');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger
    await queryRunner.query(`
      CREATE TRIGGER directory_entries_search_vector_trigger
      BEFORE INSERT OR UPDATE ON directory_entries
      FOR EACH ROW
      EXECUTE FUNCTION directory_entries_search_vector_update();
    `);

    // Add comments
    await queryRunner.query(`
      COMMENT ON TABLE directories_v2 IS 'Main directory definitions for reference data management';
      COMMENT ON TABLE directory_fields IS 'Field definitions for directory entries';
      COMMENT ON TABLE directory_entries IS 'Actual data entries in directories';
      COMMENT ON TABLE directory_sources IS 'External data source configurations';
      COMMENT ON TABLE directory_sync_logs IS 'Sync history and logs';
      COMMENT ON TABLE directory_entry_files IS 'File attachments for entries';
      COMMENT ON TABLE directory_templates IS 'Predefined templates for directories';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger first
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS directory_entries_search_vector_trigger ON directory_entries;
    `);

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS directory_entries_search_vector_update();
    `);

    // Drop tables in reverse order (respecting foreign keys)
    await queryRunner.dropTable('directory_templates', true);
    await queryRunner.dropTable('directory_entry_files', true);
    await queryRunner.dropTable('directory_sync_logs', true);
    await queryRunner.dropTable('directory_entries', true);
    await queryRunner.dropTable('directory_sources', true);
    await queryRunner.dropTable('directory_fields', true);
    await queryRunner.dropTable('directories_v2', true);

    // Drop enums
    await queryRunner.query('DROP TYPE IF EXISTS template_category');
    await queryRunner.query('DROP TYPE IF EXISTS sync_trigger');
    await queryRunner.query('DROP TYPE IF EXISTS sync_status');
    await queryRunner.query('DROP TYPE IF EXISTS sync_mode');
    await queryRunner.query('DROP TYPE IF EXISTS source_type');
    await queryRunner.query('DROP TYPE IF EXISTS approval_status');
    await queryRunner.query('DROP TYPE IF EXISTS entry_status');
    await queryRunner.query('DROP TYPE IF EXISTS entry_origin');
    await queryRunner.query('DROP TYPE IF EXISTS directory_field_type');
    await queryRunner.query('DROP TYPE IF EXISTS directory_scope');
    await queryRunner.query('DROP TYPE IF EXISTS directory_type');
  }
}
