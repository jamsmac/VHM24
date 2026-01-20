import { MigrationInterface, QueryRunner, TableColumn, TableIndex, TableForeignKey, Table } from 'typeorm';

/**
 * Enhances directories-v2 with features from MDM specification:
 * - Hierarchical entries (parent_id)
 * - Entry versioning (version, valid_from, valid_to)
 * - Deprecation flow (deprecated_at, replacement_entry_id)
 * - Normalized names for better search
 * - Trigram indexes for fuzzy search
 * - Tags support
 * - Audit trail table
 * - Statistics table
 */
export class EnhanceDirectoriesV2WithMDM1751200001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================================
    // PART 1: EXTENSIONS
    // ============================================================================

    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "unaccent"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);

    // ============================================================================
    // PART 2: HELPER FUNCTIONS
    // ============================================================================

    // Function to normalize entry names (lowercase, trim, remove accents)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION normalize_entry_name(p_name text)
      RETURNS text AS $$
      BEGIN
        RETURN lower(trim(unaccent(coalesce(p_name, ''))));
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);

    await queryRunner.query(`
      COMMENT ON FUNCTION normalize_entry_name IS 'Normalizes name: lower + trim + unaccent';
    `);

    // Function to check hierarchy cycles
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION check_hierarchy_cycle(
        p_entry_id uuid,
        p_new_parent_id uuid
      ) RETURNS boolean AS $$
      DECLARE
        v_current_id uuid := p_new_parent_id;
        v_depth int := 0;
        v_max_depth int := 100;
      BEGIN
        IF p_new_parent_id IS NULL THEN
          RETURN false;
        END IF;

        IF p_entry_id = p_new_parent_id THEN
          RETURN true;
        END IF;

        WHILE v_current_id IS NOT NULL AND v_depth < v_max_depth LOOP
          SELECT parent_id INTO v_current_id
          FROM directory_entries
          WHERE id = v_current_id;

          IF v_current_id = p_entry_id THEN
            RETURN true;
          END IF;

          v_depth := v_depth + 1;
        END LOOP;

        RETURN false;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      COMMENT ON FUNCTION check_hierarchy_cycle IS 'Checks for cycle when setting parent_id';
    `);

    // ============================================================================
    // PART 3: ADD COLUMNS TO directories_v2
    // ============================================================================

    await queryRunner.addColumn(
      'directories_v2',
      new TableColumn({
        name: 'is_hierarchical',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );

    // ============================================================================
    // PART 4: ADD COLUMNS TO directory_entries
    // ============================================================================

    // Hierarchy support
    await queryRunner.addColumn(
      'directory_entries',
      new TableColumn({
        name: 'parent_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Normalized name for search
    await queryRunner.addColumn(
      'directory_entries',
      new TableColumn({
        name: 'normalized_name',
        type: 'text',
        isNullable: true,
      }),
    );

    // Version for optimistic locking
    await queryRunner.addColumn(
      'directory_entries',
      new TableColumn({
        name: 'version',
        type: 'integer',
        default: 1,
        isNullable: false,
      }),
    );

    // Validity period
    await queryRunner.addColumn(
      'directory_entries',
      new TableColumn({
        name: 'valid_from',
        type: 'timestamp with time zone',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'directory_entries',
      new TableColumn({
        name: 'valid_to',
        type: 'timestamp with time zone',
        isNullable: true,
      }),
    );

    // Deprecation support
    await queryRunner.addColumn(
      'directory_entries',
      new TableColumn({
        name: 'deprecated_at',
        type: 'timestamp with time zone',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'directory_entries',
      new TableColumn({
        name: 'replacement_entry_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Tags array
    await queryRunner.addColumn(
      'directory_entries',
      new TableColumn({
        name: 'tags',
        type: 'text[]',
        isNullable: true,
      }),
    );

    // ============================================================================
    // PART 5: ADD COLUMNS TO directory_fields
    // ============================================================================

    await queryRunner.addColumn(
      'directory_fields',
      new TableColumn({
        name: 'allow_free_text',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );

    await queryRunner.addColumn(
      'directory_fields',
      new TableColumn({
        name: 'is_unique_per_org',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );

    await queryRunner.addColumn(
      'directory_fields',
      new TableColumn({
        name: 'translations',
        type: 'jsonb',
        isNullable: true,
      }),
    );

    // ============================================================================
    // PART 6: CREATE AUDIT TABLE
    // ============================================================================

    // Create audit action enum
    await queryRunner.query(`
      CREATE TYPE audit_action_type AS ENUM (
        'CREATE',
        'UPDATE',
        'ARCHIVE',
        'RESTORE',
        'SYNC',
        'APPROVE',
        'REJECT'
      )
    `);

    await queryRunner.createTable(
      new Table({
        name: 'directory_entry_audit',
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
            isNullable: false,
          },
          {
            name: 'action',
            type: 'audit_action_type',
            isNullable: false,
          },
          {
            name: 'changed_by_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'changed_at',
            type: 'timestamp with time zone',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'old_values',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'new_values',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'change_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'ip_address',
            type: 'inet',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // ============================================================================
    // PART 7: CREATE STATISTICS TABLE
    // ============================================================================

    await queryRunner.createTable(
      new Table({
        name: 'directory_stats',
        columns: [
          {
            name: 'directory_id',
            type: 'uuid',
            isPrimary: true,
          },
          {
            name: 'total_entries',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'active_entries',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'official_entries',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'local_entries',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'last_sync_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'last_import_at',
            type: 'timestamp with time zone',
            isNullable: true,
          },
          {
            name: 'avg_search_time_ms',
            type: 'numeric',
            isNullable: true,
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'now()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // ============================================================================
    // PART 8: FOREIGN KEYS
    // ============================================================================

    // Self-reference for hierarchy
    await queryRunner.createForeignKey(
      'directory_entries',
      new TableForeignKey({
        name: 'FK_directory_entries_parent',
        columnNames: ['parent_id'],
        referencedTableName: 'directory_entries',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Self-reference for replacement
    await queryRunner.createForeignKey(
      'directory_entries',
      new TableForeignKey({
        name: 'FK_directory_entries_replacement',
        columnNames: ['replacement_entry_id'],
        referencedTableName: 'directory_entries',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Audit entry reference
    await queryRunner.createForeignKey(
      'directory_entry_audit',
      new TableForeignKey({
        name: 'FK_directory_entry_audit_entry',
        columnNames: ['entry_id'],
        referencedTableName: 'directory_entries',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Stats directory reference
    await queryRunner.createForeignKey(
      'directory_stats',
      new TableForeignKey({
        name: 'FK_directory_stats_directory',
        columnNames: ['directory_id'],
        referencedTableName: 'directories_v2',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // ============================================================================
    // PART 9: INDEXES
    // ============================================================================

    // Hierarchy index
    await queryRunner.createIndex(
      'directory_entries',
      new TableIndex({
        name: 'IDX_directory_entries_parent',
        columnNames: ['parent_id'],
      }),
    );

    // Normalized name unique (per directory + origin)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_directory_entries_normalized_unique"
      ON "directory_entries" (directory_id, normalized_name, origin)
      WHERE deleted_at IS NULL
    `);

    // Trigram index for fuzzy search
    await queryRunner.query(`
      CREATE INDEX "IDX_directory_entries_normalized_trgm"
      ON "directory_entries" USING GIN (normalized_name gin_trgm_ops)
    `);

    // Tags GIN index
    await queryRunner.query(`
      CREATE INDEX "IDX_directory_entries_tags"
      ON "directory_entries" USING GIN (tags)
    `);

    // Audit indexes
    await queryRunner.createIndex(
      'directory_entry_audit',
      new TableIndex({
        name: 'IDX_audit_entry',
        columnNames: ['entry_id'],
      }),
    );

    await queryRunner.createIndex(
      'directory_entry_audit',
      new TableIndex({
        name: 'IDX_audit_entry_time',
        columnNames: ['entry_id', 'changed_at'],
      }),
    );

    await queryRunner.createIndex(
      'directory_entry_audit',
      new TableIndex({
        name: 'IDX_audit_action',
        columnNames: ['action'],
      }),
    );

    // ============================================================================
    // PART 10: TRIGGERS
    // ============================================================================

    // Trigger to update normalized_name
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_update_normalized_name()
      RETURNS trigger AS $$
      BEGIN
        NEW.normalized_name := normalize_entry_name(NEW.name_ru);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_entry_normalized_name
      BEFORE INSERT OR UPDATE OF name_ru
      ON directory_entries
      FOR EACH ROW EXECUTE FUNCTION trg_update_normalized_name();
    `);

    // Trigger to check hierarchy cycle
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_check_hierarchy_cycle()
      RETURNS trigger AS $$
      BEGIN
        IF NEW.parent_id IS NOT NULL THEN
          IF check_hierarchy_cycle(NEW.id, NEW.parent_id) THEN
            RAISE EXCEPTION 'Cycle detected in hierarchy: entry % cannot have parent %',
              NEW.id, NEW.parent_id
              USING ERRCODE = 'integrity_constraint_violation';
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_entry_hierarchy_cycle
      BEFORE INSERT OR UPDATE OF parent_id
      ON directory_entries
      FOR EACH ROW EXECUTE FUNCTION trg_check_hierarchy_cycle();
    `);

    // Trigger to update directory stats
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_update_directory_stats()
      RETURNS trigger AS $$
      DECLARE
        v_directory_id uuid;
      BEGIN
        v_directory_id := COALESCE(NEW.directory_id, OLD.directory_id);

        INSERT INTO directory_stats (
          directory_id,
          total_entries,
          active_entries,
          official_entries,
          local_entries,
          updated_at
        )
        SELECT
          v_directory_id,
          COUNT(*),
          COUNT(*) FILTER (WHERE status = 'active'),
          COUNT(*) FILTER (WHERE origin = 'official'),
          COUNT(*) FILTER (WHERE origin = 'local'),
          NOW()
        FROM directory_entries
        WHERE directory_id = v_directory_id
          AND deleted_at IS NULL
        ON CONFLICT (directory_id) DO UPDATE SET
          total_entries = EXCLUDED.total_entries,
          active_entries = EXCLUDED.active_entries,
          official_entries = EXCLUDED.official_entries,
          local_entries = EXCLUDED.local_entries,
          updated_at = EXCLUDED.updated_at;

        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_entries_update_stats
      AFTER INSERT OR UPDATE OR DELETE ON directory_entries
      FOR EACH ROW EXECUTE FUNCTION trg_update_directory_stats();
    `);

    // Trigger to increment version on update
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION trg_increment_entry_version()
      RETURNS trigger AS $$
      BEGIN
        NEW.version := OLD.version + 1;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_entry_version
      BEFORE UPDATE ON directory_entries
      FOR EACH ROW
      WHEN (OLD.* IS DISTINCT FROM NEW.*)
      EXECUTE FUNCTION trg_increment_entry_version();
    `);

    // ============================================================================
    // PART 11: IMPROVED SEARCH FUNCTION
    // ============================================================================

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION search_directory_entries(
        p_directory_id uuid,
        p_query text,
        p_status text DEFAULT 'active',
        p_limit int DEFAULT 50
      )
      RETURNS TABLE (
        id uuid,
        name text,
        code text,
        origin entry_origin,
        rank real
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT
          e.id,
          e.name_ru AS name,
          e.code,
          e.origin,
          ts_rank(e.search_vector, plainto_tsquery('russian', p_query)) AS rank
        FROM directory_entries e
        WHERE e.directory_id = p_directory_id
          AND e.status::text = p_status
          AND e.deleted_at IS NULL
          AND (
            e.search_vector @@ plainto_tsquery('russian', p_query)
            OR e.normalized_name ILIKE '%' || lower(p_query) || '%'
            OR e.code ILIKE p_query || '%'
          )
        ORDER BY
          CASE WHEN e.code ILIKE p_query || '%' THEN 0 ELSE 1 END,
          rank DESC,
          e.name_ru
        LIMIT p_limit;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      COMMENT ON FUNCTION search_directory_entries IS 'Search entries with combined ranking (FTS + trigram + prefix)';
    `);

    // ============================================================================
    // PART 12: UPDATE EXISTING DATA
    // ============================================================================

    // Populate normalized_name for existing entries
    await queryRunner.query(`
      UPDATE directory_entries
      SET normalized_name = normalize_entry_name(name_ru)
      WHERE normalized_name IS NULL
    `);

    // Add comments
    await queryRunner.query(`
      COMMENT ON TABLE directory_entry_audit IS 'Audit trail for directory entry changes';
      COMMENT ON TABLE directory_stats IS 'Aggregated statistics per directory';
      COMMENT ON COLUMN directory_entries.parent_id IS 'Parent entry for hierarchical directories';
      COMMENT ON COLUMN directory_entries.normalized_name IS 'Normalized name: lower(trim(unaccent(name_ru)))';
      COMMENT ON COLUMN directory_entries.version IS 'Version for optimistic locking';
      COMMENT ON COLUMN directory_entries.valid_from IS 'Entry validity start date';
      COMMENT ON COLUMN directory_entries.valid_to IS 'Entry validity end date';
      COMMENT ON COLUMN directory_entries.deprecated_at IS 'When entry was deprecated';
      COMMENT ON COLUMN directory_entries.replacement_entry_id IS 'Recommended replacement for deprecated entries';
      COMMENT ON COLUMN directory_entries.tags IS 'Array of tags for filtering';
      COMMENT ON COLUMN directories_v2.is_hierarchical IS 'Whether directory supports parent-child entries';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_entry_version ON directory_entries`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_entries_update_stats ON directory_entries`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_entry_hierarchy_cycle ON directory_entries`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_entry_normalized_name ON directory_entries`);

    // Drop functions
    await queryRunner.query(`DROP FUNCTION IF EXISTS trg_increment_entry_version()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS trg_update_directory_stats()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS trg_check_hierarchy_cycle()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS trg_update_normalized_name()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS search_directory_entries(uuid, text, text, int)`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS check_hierarchy_cycle(uuid, uuid)`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS normalize_entry_name(text)`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_directory_entries_tags"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_directory_entries_normalized_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_directory_entries_normalized_unique"`);
    await queryRunner.dropIndex('directory_entry_audit', 'IDX_audit_action');
    await queryRunner.dropIndex('directory_entry_audit', 'IDX_audit_entry_time');
    await queryRunner.dropIndex('directory_entry_audit', 'IDX_audit_entry');
    await queryRunner.dropIndex('directory_entries', 'IDX_directory_entries_parent');

    // Drop foreign keys
    await queryRunner.dropForeignKey('directory_stats', 'FK_directory_stats_directory');
    await queryRunner.dropForeignKey('directory_entry_audit', 'FK_directory_entry_audit_entry');
    await queryRunner.dropForeignKey('directory_entries', 'FK_directory_entries_replacement');
    await queryRunner.dropForeignKey('directory_entries', 'FK_directory_entries_parent');

    // Drop tables
    await queryRunner.dropTable('directory_stats', true);
    await queryRunner.dropTable('directory_entry_audit', true);

    // Drop enum
    await queryRunner.query(`DROP TYPE IF EXISTS audit_action_type`);

    // Drop columns from directory_fields
    await queryRunner.dropColumn('directory_fields', 'translations');
    await queryRunner.dropColumn('directory_fields', 'is_unique_per_org');
    await queryRunner.dropColumn('directory_fields', 'allow_free_text');

    // Drop columns from directory_entries
    await queryRunner.dropColumn('directory_entries', 'tags');
    await queryRunner.dropColumn('directory_entries', 'replacement_entry_id');
    await queryRunner.dropColumn('directory_entries', 'deprecated_at');
    await queryRunner.dropColumn('directory_entries', 'valid_to');
    await queryRunner.dropColumn('directory_entries', 'valid_from');
    await queryRunner.dropColumn('directory_entries', 'version');
    await queryRunner.dropColumn('directory_entries', 'normalized_name');
    await queryRunner.dropColumn('directory_entries', 'parent_id');

    // Drop column from directories_v2
    await queryRunner.dropColumn('directories_v2', 'is_hierarchical');

    // Note: Extensions are not dropped as they may be used elsewhere
  }
}
