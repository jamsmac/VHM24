import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Enable Performance Monitoring
 *
 * Enables pg_stat_statements extension and creates monitoring views
 * for query performance analysis, table sizes, and index usage.
 *
 * Key features:
 * - pg_stat_statements extension for query tracking
 * - v_slow_queries: Identify slow queries (>100ms)
 * - v_table_sizes: Monitor database size growth
 * - v_unused_indexes: Find unused indexes
 * - v_index_usage: Track index effectiveness
 * - v_cache_hit_ratio: Monitor cache performance
 * - v_active_connections: Track connection pool usage
 */
export class EnablePerformanceMonitoring1732500000000 implements MigrationInterface {
  name = 'EnablePerformanceMonitoring1732500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================================
    // ENABLE pg_stat_statements EXTENSION
    // ============================================================================
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
    `);

    console.log('✅ pg_stat_statements extension enabled');

    // ============================================================================
    // VIEW 1: Slow Queries (>100ms average)
    // ============================================================================
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_slow_queries AS
      SELECT
        substring(query, 1, 150) AS query_sample,
        calls,
        ROUND(total_exec_time::numeric, 2) AS total_time_ms,
        ROUND(mean_exec_time::numeric, 2) AS avg_time_ms,
        ROUND(stddev_exec_time::numeric, 2) AS stddev_time_ms,
        ROUND(min_exec_time::numeric, 2) AS min_time_ms,
        ROUND(max_exec_time::numeric, 2) AS max_time_ms,
        rows,
        ROUND(100.0 * shared_blks_hit /
          NULLIF(shared_blks_hit + shared_blks_read, 0), 2) AS cache_hit_pct
      FROM pg_stat_statements
      WHERE mean_exec_time > 100  -- Queries slower than 100ms
      ORDER BY mean_exec_time DESC
      LIMIT 100;
    `);

    await queryRunner.query(`
      COMMENT ON VIEW v_slow_queries IS 'Identifies queries with average execution time >100ms';
    `);

    // ============================================================================
    // VIEW 2: Table Sizes
    // ============================================================================
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_table_sizes AS
      SELECT
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
        pg_size_pretty(
          pg_total_relation_size(schemaname||'.'||tablename) -
          pg_relation_size(schemaname||'.'||tablename)
        ) AS indexes_size,
        pg_total_relation_size(schemaname||'.'||tablename) AS total_bytes,
        pg_relation_size(schemaname||'.'||tablename) AS table_bytes
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY total_bytes DESC;
    `);

    await queryRunner.query(`
      COMMENT ON VIEW v_table_sizes IS 'Shows size of all tables and their indexes';
    `);

    // ============================================================================
    // VIEW 3: Unused Indexes
    // ============================================================================
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_unused_indexes AS
      SELECT
        schemaname,
        tablename,
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch,
        pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
        pg_relation_size(indexrelid) AS index_bytes
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
        AND idx_scan = 0
        AND indexname NOT LIKE '%_pkey'  -- Exclude primary keys
      ORDER BY index_bytes DESC;
    `);

    await queryRunner.query(`
      COMMENT ON VIEW v_unused_indexes IS 'Indexes that have never been scanned (candidates for removal)';
    `);

    // ============================================================================
    // VIEW 4: Index Usage Statistics
    // ============================================================================
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_index_usage AS
      SELECT
        schemaname,
        tablename,
        indexname,
        idx_scan AS scans,
        idx_tup_read AS tuples_read,
        idx_tup_fetch AS tuples_fetched,
        pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
        CASE
          WHEN idx_scan = 0 THEN 'UNUSED'
          WHEN idx_scan < 100 THEN 'LOW_USAGE'
          WHEN idx_scan < 10000 THEN 'MEDIUM_USAGE'
          ELSE 'HIGH_USAGE'
        END AS usage_category
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      ORDER BY idx_scan DESC;
    `);

    await queryRunner.query(`
      COMMENT ON VIEW v_index_usage IS 'Index usage statistics with usage categories';
    `);

    // ============================================================================
    // VIEW 5: Cache Hit Ratio (should be >95%)
    // ============================================================================
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_cache_hit_ratio AS
      SELECT
        schemaname,
        tablename,
        heap_blks_read,
        heap_blks_hit,
        CASE
          WHEN heap_blks_read + heap_blks_hit = 0 THEN NULL
          ELSE ROUND(
            100.0 * heap_blks_hit / (heap_blks_hit + heap_blks_read), 2
          )
        END AS cache_hit_pct,
        CASE
          WHEN heap_blks_read + heap_blks_hit = 0 THEN 'NO_DATA'
          WHEN 100.0 * heap_blks_hit / (heap_blks_hit + heap_blks_read) >= 95 THEN 'GOOD'
          WHEN 100.0 * heap_blks_hit / (heap_blks_hit + heap_blks_read) >= 90 THEN 'OK'
          ELSE 'POOR'
        END AS cache_status
      FROM pg_statio_user_tables
      WHERE schemaname = 'public'
      ORDER BY cache_hit_pct ASC NULLS LAST;
    `);

    await queryRunner.query(`
      COMMENT ON VIEW v_cache_hit_ratio IS 'Cache hit ratio by table (target: >95%)';
    `);

    // ============================================================================
    // VIEW 6: Active Connections
    // ============================================================================
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_active_connections AS
      SELECT
        count(*) AS connection_count,
        state,
        wait_event_type,
        wait_event,
        CASE
          WHEN state = 'active' THEN 'ACTIVE'
          WHEN state = 'idle' THEN 'IDLE'
          WHEN state = 'idle in transaction' THEN 'IDLE_IN_TRANSACTION'
          ELSE state
        END AS connection_status
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid != pg_backend_pid()
      GROUP BY state, wait_event_type, wait_event
      ORDER BY connection_count DESC;
    `);

    await queryRunner.query(`
      COMMENT ON VIEW v_active_connections IS 'Current active database connections';
    `);

    // ============================================================================
    // VIEW 7: Long Running Queries
    // ============================================================================
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_long_running_queries AS
      SELECT
        pid,
        now() - pg_stat_activity.query_start AS duration,
        substring(query, 1, 200) AS query_sample,
        state,
        wait_event_type,
        wait_event,
        usename,
        application_name,
        client_addr
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND state = 'active'
        AND (now() - pg_stat_activity.query_start) > interval '1 minute'
      ORDER BY duration DESC;
    `);

    await queryRunner.query(`
      COMMENT ON VIEW v_long_running_queries IS 'Queries running longer than 1 minute';
    `);

    // ============================================================================
    // VIEW 8: Table Bloat Estimation
    // ============================================================================
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_table_bloat AS
      SELECT
        schemaname,
        tablename,
        n_live_tup AS live_tuples,
        n_dead_tup AS dead_tuples,
        CASE
          WHEN n_live_tup = 0 THEN 0
          ELSE ROUND(100.0 * n_dead_tup / (n_live_tup + n_dead_tup), 2)
        END AS dead_pct,
        last_vacuum,
        last_autovacuum,
        last_analyze,
        last_autoanalyze,
        CASE
          WHEN n_live_tup = 0 THEN 'EMPTY'
          WHEN 100.0 * n_dead_tup / (n_live_tup + n_dead_tup) < 10 THEN 'GOOD'
          WHEN 100.0 * n_dead_tup / (n_live_tup + n_dead_tup) < 20 THEN 'OK'
          ELSE 'NEEDS_VACUUM'
        END AS bloat_status
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY dead_pct DESC NULLS LAST;
    `);

    await queryRunner.query(`
      COMMENT ON VIEW v_table_bloat IS 'Table bloat estimation (dead tuples percentage)';
    `);

    // ============================================================================
    // VIEW 9: Sequential Scans (potential missing indexes)
    // ============================================================================
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_sequential_scans AS
      SELECT
        schemaname,
        tablename,
        seq_scan,
        seq_tup_read,
        idx_scan,
        idx_tup_fetch,
        n_live_tup,
        CASE
          WHEN seq_scan = 0 THEN 0
          ELSE ROUND(seq_tup_read::numeric / NULLIF(seq_scan, 0), 0)
        END AS avg_seq_scan_rows,
        CASE
          WHEN seq_scan + idx_scan = 0 THEN 0
          ELSE ROUND(100.0 * seq_scan / (seq_scan + idx_scan), 2)
        END AS seq_scan_pct,
        pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
        AND seq_scan > 0
      ORDER BY seq_scan DESC;
    `);

    await queryRunner.query(`
      COMMENT ON VIEW v_sequential_scans IS 'Tables with sequential scans (may need indexes)';
    `);

    // ============================================================================
    // VIEW 10: Database Summary
    // ============================================================================
    await queryRunner.query(`
      CREATE OR REPLACE VIEW v_database_summary AS
      SELECT
        (SELECT count(*) FROM pg_stat_user_tables WHERE schemaname = 'public') AS table_count,
        (SELECT count(*) FROM pg_stat_user_indexes WHERE schemaname = 'public') AS index_count,
        (SELECT pg_size_pretty(pg_database_size(current_database()))) AS database_size,
        (SELECT count(*) FROM v_unused_indexes) AS unused_indexes,
        (SELECT count(*) FROM v_slow_queries) AS slow_queries,
        (SELECT count(*) FROM v_long_running_queries) AS long_running_queries,
        (SELECT ROUND(AVG(cache_hit_pct), 2)
         FROM v_cache_hit_ratio
         WHERE cache_hit_pct IS NOT NULL) AS avg_cache_hit_pct,
        (SELECT count(*) FROM v_table_bloat WHERE bloat_status = 'NEEDS_VACUUM') AS tables_need_vacuum,
        (SELECT sum(connection_count) FROM v_active_connections) AS total_connections;
    `);

    await queryRunner.query(`
      COMMENT ON VIEW v_database_summary IS 'High-level database health summary';
    `);

    console.log('✅ Performance monitoring views created successfully');

    // ============================================================================
    // GRANT PERMISSIONS
    // ============================================================================
    // Note: Adjust role name as needed
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'vendhub_app') THEN
          GRANT SELECT ON v_slow_queries TO vendhub_app;
          GRANT SELECT ON v_table_sizes TO vendhub_app;
          GRANT SELECT ON v_unused_indexes TO vendhub_app;
          GRANT SELECT ON v_index_usage TO vendhub_app;
          GRANT SELECT ON v_cache_hit_ratio TO vendhub_app;
          GRANT SELECT ON v_active_connections TO vendhub_app;
          GRANT SELECT ON v_long_running_queries TO vendhub_app;
          GRANT SELECT ON v_table_bloat TO vendhub_app;
          GRANT SELECT ON v_sequential_scans TO vendhub_app;
          GRANT SELECT ON v_database_summary TO vendhub_app;
        END IF;
      END $$;
    `);

    console.log('✅ Performance monitoring enabled successfully!');
    console.log('');
    console.log('📊 Available monitoring views:');
    console.log('  - v_slow_queries         : Queries >100ms');
    console.log('  - v_table_sizes          : Table and index sizes');
    console.log('  - v_unused_indexes       : Unused indexes');
    console.log('  - v_index_usage          : Index effectiveness');
    console.log('  - v_cache_hit_ratio      : Cache performance by table');
    console.log('  - v_active_connections   : Current connections');
    console.log('  - v_long_running_queries : Queries >1 minute');
    console.log('  - v_table_bloat          : Dead tuple percentage');
    console.log('  - v_sequential_scans     : Potential missing indexes');
    console.log('  - v_database_summary     : Overall health');
    console.log('');
    console.log('Usage: SELECT * FROM v_database_summary;');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop views in reverse order
    await queryRunner.query(`DROP VIEW IF EXISTS v_database_summary CASCADE;`);
    await queryRunner.query(`DROP VIEW IF EXISTS v_sequential_scans CASCADE;`);
    await queryRunner.query(`DROP VIEW IF EXISTS v_table_bloat CASCADE;`);
    await queryRunner.query(`DROP VIEW IF EXISTS v_long_running_queries CASCADE;`);
    await queryRunner.query(`DROP VIEW IF EXISTS v_active_connections CASCADE;`);
    await queryRunner.query(`DROP VIEW IF EXISTS v_cache_hit_ratio CASCADE;`);
    await queryRunner.query(`DROP VIEW IF EXISTS v_index_usage CASCADE;`);
    await queryRunner.query(`DROP VIEW IF EXISTS v_unused_indexes CASCADE;`);
    await queryRunner.query(`DROP VIEW IF EXISTS v_table_sizes CASCADE;`);
    await queryRunner.query(`DROP VIEW IF EXISTS v_slow_queries CASCADE;`);

    // Note: We don't drop pg_stat_statements extension as it might be used elsewhere
    // If you really want to drop it:
    // await queryRunner.query(`DROP EXTENSION IF EXISTS pg_stat_statements;`);

    console.log('✅ Performance monitoring views removed');
  }
}
