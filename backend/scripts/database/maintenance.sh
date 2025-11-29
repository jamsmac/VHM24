#!/bin/bash

#===============================================================================
# VendHub Database Maintenance Script
#===============================================================================
#
# Performs routine database maintenance tasks:
# - VACUUM: Reclaim storage and update statistics
# - ANALYZE: Update query planner statistics
# - REINDEX: Rebuild indexes to reduce bloat
# - Check for table bloat
# - Monitor database health
#
# Usage:
#   ./maintenance.sh [--vacuum] [--analyze] [--reindex] [--all]
#
# Recommended schedule:
#   - Daily: --vacuum --analyze (lightweight)
#   - Weekly: --all (comprehensive maintenance)
#   - Monthly: --reindex (heavyweight, requires downtime)
#
#===============================================================================

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_NAME="${DATABASE_NAME:-vendhub}"
DB_USER="${DATABASE_USER:-postgres}"

# Maintenance tasks
DO_VACUUM=false
DO_ANALYZE=false
DO_REINDEX=false
DO_BLOAT_CHECK=false
VERBOSE=false

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# ============================================================================
# Functions
# ============================================================================

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

run_vacuum() {
    log "Running VACUUM on all tables..."

    # VACUUM ANALYZE: Reclaims storage and updates statistics
    # Can be run without taking locks that prevent concurrent writes

    if [ "$VERBOSE" = true ]; then
        PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
            "VACUUM (VERBOSE, ANALYZE);"
    else
        PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
            "VACUUM ANALYZE;"
    fi

    log "VACUUM completed ✓"
}

run_analyze() {
    log "Running ANALYZE to update statistics..."

    # ANALYZE: Updates planner statistics without reclaiming storage
    # Very lightweight, can run frequently

    PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
        "ANALYZE;"

    log "ANALYZE completed ✓"
}

run_reindex() {
    warning "Running REINDEX - This may take significant time and lock tables"

    # REINDEX: Rebuilds all indexes
    # WARNING: Takes exclusive locks, can cause downtime
    # Only run during maintenance windows

    # Get list of tables
    tables=$(PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public'" | tr -d ' ')

    for table in $tables; do
        log "Reindexing table: $table"

        # REINDEX CONCURRENTLY: Doesn't lock table (PostgreSQL 12+)
        # Falls back to regular REINDEX if not supported
        if PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
            "REINDEX TABLE CONCURRENTLY $table" 2>&1 | grep -q "syntax error"; then

            warning "CONCURRENTLY not supported, using regular REINDEX"
            PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
                "REINDEX TABLE $table"
        fi
    done

    log "REINDEX completed ✓"
}

check_bloat() {
    log "Checking table bloat..."

    PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'EOF'
SELECT
    schemaname,
    tablename,
    n_live_tup AS live_tuples,
    n_dead_tup AS dead_tuples,
    CASE
        WHEN n_live_tup = 0 THEN 0
        ELSE ROUND(100.0 * n_dead_tup / (n_live_tup + n_dead_tup), 2)
    END AS dead_pct,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    last_vacuum,
    last_autovacuum,
    CASE
        WHEN n_live_tup = 0 THEN 'EMPTY'
        WHEN 100.0 * n_dead_tup / (n_live_tup + n_dead_tup) < 10 THEN 'GOOD'
        WHEN 100.0 * n_dead_tup / (n_live_tup + n_dead_tup) < 20 THEN 'OK'
        ELSE 'NEEDS_VACUUM'
    END AS status
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY dead_pct DESC NULLS LAST
LIMIT 20;
EOF

    log "Bloat check completed ✓"
}

check_index_usage() {
    log "Checking index usage..."

    PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'EOF'
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan AS scans,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size,
    CASE
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'LOW'
        WHEN idx_scan < 10000 THEN 'MEDIUM'
        ELSE 'HIGH'
    END AS usage
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND indexname NOT LIKE '%_pkey'
ORDER BY idx_scan ASC
LIMIT 20;
EOF

    log "Index usage check completed ✓"
}

check_database_size() {
    log "Database size report..."

    PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'EOF'
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(
        pg_total_relation_size(schemaname||'.'||tablename) -
        pg_relation_size(schemaname||'.'||tablename)
    ) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;
EOF

    # Overall database size
    log ""
    log "Overall database size:"
    PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
        "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));"
}

generate_health_report() {
    log ""
    log "════════════════════════════════════════════════════════════════"
    log "Database Health Report"
    log "════════════════════════════════════════════════════════════════"

    # Connection count
    log ""
    log "Active Connections:"
    PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
        "SELECT count(*), state FROM pg_stat_activity WHERE datname = '$DB_NAME' GROUP BY state;"

    # Cache hit ratio
    log ""
    log "Cache Hit Ratio (should be >95%):"
    PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'EOF'
SELECT
    ROUND(
        100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0),
        2
    ) AS cache_hit_pct
FROM pg_statio_user_tables;
EOF

    # Long running queries
    log ""
    log "Long Running Queries (>5 minutes):"
    PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'EOF'
SELECT
    pid,
    now() - pg_stat_activity.query_start AS duration,
    substring(query, 1, 100) AS query_sample,
    state
FROM pg_stat_activity
WHERE datname = current_database()
    AND state = 'active'
    AND (now() - pg_stat_activity.query_start) > interval '5 minutes'
ORDER BY duration DESC;
EOF

    log ""
    log "════════════════════════════════════════════════════════════════"
}

# ============================================================================
# Main Script
# ============================================================================

main() {
    # Parse arguments
    if [ $# -eq 0 ]; then
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --vacuum        Run VACUUM to reclaim storage"
        echo "  --analyze       Run ANALYZE to update statistics"
        echo "  --reindex       Run REINDEX to rebuild indexes (SLOW!)"
        echo "  --bloat         Check table bloat"
        echo "  --all           Run all maintenance tasks"
        echo "  --health        Show health report only"
        echo "  --verbose       Verbose output"
        echo ""
        echo "Examples:"
        echo "  $0 --vacuum --analyze     # Daily maintenance"
        echo "  $0 --all                  # Weekly full maintenance"
        echo "  $0 --health               # Health check only"
        exit 0
    fi

    while [[ $# -gt 0 ]]; do
        case $1 in
            --vacuum)
                DO_VACUUM=true
                shift
                ;;
            --analyze)
                DO_ANALYZE=true
                shift
                ;;
            --reindex)
                DO_REINDEX=true
                shift
                ;;
            --bloat)
                DO_BLOAT_CHECK=true
                shift
                ;;
            --all)
                DO_VACUUM=true
                DO_ANALYZE=true
                DO_BLOAT_CHECK=true
                shift
                ;;
            --health)
                generate_health_report
                exit 0
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            *)
                error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    log "════════════════════════════════════════════════════════════════"
    log "VendHub Database Maintenance"
    log "Database: $DB_NAME@$DB_HOST:$DB_PORT"
    log "════════════════════════════════════════════════════════════════"
    log ""

    START_TIME=$(date +%s)

    # Run requested maintenance tasks
    if [ "$DO_VACUUM" = true ]; then
        run_vacuum
    fi

    if [ "$DO_ANALYZE" = true ]; then
        run_analyze
    fi

    if [ "$DO_REINDEX" = true ]; then
        run_reindex
    fi

    if [ "$DO_BLOAT_CHECK" = true ]; then
        check_bloat
    fi

    # Always show size and index usage
    check_database_size
    check_index_usage

    # Generate health report
    generate_health_report

    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))

    log ""
    log "Maintenance completed in ${DURATION}s ✓"
}

main "$@"
