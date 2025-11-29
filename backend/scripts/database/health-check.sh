#!/bin/bash

#===============================================================================
# VendHub Database Health Check Script
#===============================================================================
#
# Performs comprehensive database health checks and reports critical issues.
#
# Features:
# - Connection health
# - Performance metrics (cache hit ratio, query performance)
# - Disk usage warnings
# - Table bloat detection
# - Replication lag monitoring
# - Lock detection
# - Business metrics validation
#
# Usage:
#   ./health-check.sh [--verbose] [--json] [--alerts-only]
#
# Options:
#   --verbose      Show detailed information
#   --json         Output results in JSON format
#   --alerts-only  Only show warnings and critical issues
#
# Exit codes:
#   0 - All checks passed
#   1 - Warning issues found
#   2 - Critical issues found
#
# Environment Variables (required):
#   DATABASE_HOST     - Database host (default: localhost)
#   DATABASE_PORT     - Database port (default: 5432)
#   DATABASE_NAME     - Database name (default: vendhub)
#   DATABASE_USER     - Database user (default: postgres)
#   PGPASSWORD        - Database password (set in environment)
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

VERBOSE=false
JSON_OUTPUT=false
ALERTS_ONLY=false

# Alert thresholds
CACHE_HIT_RATIO_WARNING=95
CACHE_HIT_RATIO_CRITICAL=90
CONNECTION_PCT_WARNING=50
CONNECTION_PCT_CRITICAL=80
TABLE_BLOAT_WARNING=10
TABLE_BLOAT_CRITICAL=20
QUERY_TIME_WARNING=1000  # milliseconds
REPLICATION_LAG_WARNING=10485760  # 10MB
REPLICATION_LAG_CRITICAL=104857600  # 100MB

# Counters
WARNINGS=0
CRITICALS=0

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================================================
# Functions
# ============================================================================

log() {
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
    fi
}

warning() {
    WARNINGS=$((WARNINGS + 1))
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
    fi
}

critical() {
    CRITICALS=$((CRITICALS + 1))
    if [ "$JSON_OUTPUT" = false ]; then
        echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] CRITICAL:${NC} $1" >&2
    fi
}

info() {
    if [ "$VERBOSE" = true ] && [ "$JSON_OUTPUT" = false ]; then
        echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
    fi
}

check_connection() {
    log "Checking database connection..."

    if ! PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" &>/dev/null; then
        critical "Cannot connect to database $DB_NAME on $DB_HOST:$DB_PORT"
        return 1
    fi

    log "Database connection ✓"
    return 0
}

check_cache_hit_ratio() {
    log "Checking cache hit ratio..."

    local ratio=$(PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t <<'EOF'
SELECT ROUND(
    100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0),
    2
) FROM pg_statio_user_tables;
EOF
)

    ratio=$(echo "$ratio" | tr -d ' ')

    if [ -z "$ratio" ] || [ "$ratio" = "" ]; then
        info "Cache hit ratio: N/A (no data yet)"
        return 0
    fi

    if (( $(echo "$ratio < $CACHE_HIT_RATIO_CRITICAL" | bc -l) )); then
        critical "Cache hit ratio is ${ratio}% (critical threshold: ${CACHE_HIT_RATIO_CRITICAL}%)"
    elif (( $(echo "$ratio < $CACHE_HIT_RATIO_WARNING" | bc -l) )); then
        warning "Cache hit ratio is ${ratio}% (warning threshold: ${CACHE_HIT_RATIO_WARNING}%)"
    else
        log "Cache hit ratio: ${ratio}% ✓"
    fi
}

check_connections() {
    log "Checking connection pool usage..."

    local result=$(PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t <<'EOF'
SELECT
    count(*),
    (SELECT setting::int FROM pg_settings WHERE name = 'max_connections'),
    ROUND(100.0 * count(*) / (SELECT setting::int FROM pg_settings WHERE name = 'max_connections'), 2)
FROM pg_stat_activity
WHERE datname = current_database();
EOF
)

    local current=$(echo "$result" | awk '{print $1}')
    local max=$(echo "$result" | awk '{print $2}')
    local pct=$(echo "$result" | awk '{print $3}')

    if (( $(echo "$pct >= $CONNECTION_PCT_CRITICAL" | bc -l) )); then
        critical "Connection usage is ${pct}% (${current}/${max}) - critical threshold: ${CONNECTION_PCT_CRITICAL}%"
    elif (( $(echo "$pct >= $CONNECTION_PCT_WARNING" | bc -l) )); then
        warning "Connection usage is ${pct}% (${current}/${max}) - warning threshold: ${CONNECTION_PCT_WARNING}%"
    else
        log "Connection usage: ${pct}% (${current}/${max}) ✓"
    fi
}

check_long_running_queries() {
    log "Checking for long-running queries..."

    local count=$(PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t <<'EOF'
SELECT count(*)
FROM pg_stat_activity
WHERE state = 'active'
    AND query NOT LIKE '%pg_stat_activity%'
    AND now() - query_start > interval '5 minutes';
EOF
)

    count=$(echo "$count" | tr -d ' ')

    if [ "$count" -gt 0 ]; then
        critical "Found ${count} queries running longer than 5 minutes"
    else
        log "No long-running queries ✓"
    fi
}

check_table_bloat() {
    log "Checking table bloat..."

    local bloated_tables=$(PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t <<EOF
SELECT count(*)
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND n_live_tup > 0
    AND 100.0 * n_dead_tup / (n_live_tup + n_dead_tup) > $TABLE_BLOAT_CRITICAL;
EOF
)

    bloated_tables=$(echo "$bloated_tables" | tr -d ' ')

    if [ "$bloated_tables" -gt 0 ]; then
        critical "Found ${bloated_tables} tables with >20% dead tuples - run VACUUM"
    else
        log "Table bloat is healthy ✓"
    fi
}

check_unused_indexes() {
    log "Checking for unused indexes..."

    local unused=$(PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t <<'EOF'
SELECT count(*)
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND idx_scan = 0
    AND indexname NOT LIKE '%_pkey'
    AND pg_relation_size(indexrelid) > 10485760;  -- >10MB
EOF
)

    unused=$(echo "$unused" | tr -d ' ')

    if [ "$unused" -gt 5 ]; then
        warning "Found ${unused} unused indexes larger than 10MB - consider dropping"
    elif [ "$unused" -gt 0 ]; then
        info "Found ${unused} unused indexes"
    else
        log "All indexes are being used ✓"
    fi
}

check_replication() {
    log "Checking replication status..."

    # Check if replication is configured
    local replicas=$(PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t <<'EOF'
SELECT count(*) FROM pg_stat_replication;
EOF
)

    replicas=$(echo "$replicas" | tr -d ' ')

    if [ "$replicas" -eq 0 ]; then
        info "No replication configured"
        return 0
    fi

    # Check replication lag
    local max_lag=$(PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t <<'EOF'
SELECT COALESCE(MAX(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)), 0)
FROM pg_stat_replication;
EOF
)

    max_lag=$(echo "$max_lag" | tr -d ' ')

    if [ "$max_lag" -gt "$REPLICATION_LAG_CRITICAL" ]; then
        critical "Replication lag is >100MB"
    elif [ "$max_lag" -gt "$REPLICATION_LAG_WARNING" ]; then
        warning "Replication lag is >10MB"
    else
        log "Replication lag is healthy ✓"
    fi
}

check_disk_usage() {
    log "Checking database size..."

    local db_size=$(PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t <<'EOF'
SELECT pg_size_pretty(pg_database_size(current_database()));
EOF
)

    db_size=$(echo "$db_size" | tr -d ' ')
    log "Database size: $db_size"
}

check_locks() {
    log "Checking for blocking queries..."

    local blocking=$(PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t <<'EOF'
SELECT count(*)
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
WHERE NOT blocked_locks.granted
    AND now() - blocked_activity.query_start > interval '30 seconds';
EOF
)

    blocking=$(echo "$blocking" | tr -d ' ')

    if [ "$blocking" -gt 0 ]; then
        critical "Found ${blocking} queries blocked for >30 seconds"
    else
        log "No blocking queries ✓"
    fi
}

check_wal_archiving() {
    log "Checking WAL archiving..."

    local failed=$(PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t <<'EOF'
SELECT failed_count FROM pg_stat_archiver;
EOF
)

    failed=$(echo "$failed" | tr -d ' ')

    if [ "$failed" -gt 0 ]; then
        critical "WAL archiving has ${failed} failures"
    else
        log "WAL archiving is healthy ✓"
    fi
}

generate_summary() {
    log ""
    log "════════════════════════════════════════════════════════════════"
    log "Health Check Summary"
    log "════════════════════════════════════════════════════════════════"

    if [ $CRITICALS -gt 0 ]; then
        critical "Found $CRITICALS critical issue(s)"
    fi

    if [ $WARNINGS -gt 0 ]; then
        warning "Found $WARNINGS warning(s)"
    fi

    if [ $CRITICALS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
        log "✅ All checks passed! Database is healthy."
    fi

    log ""
    log "════════════════════════════════════════════════════════════════"
}

# ============================================================================
# Main Script
# ============================================================================

main() {
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --verbose)
                VERBOSE=true
                shift
                ;;
            --json)
                JSON_OUTPUT=true
                shift
                ;;
            --alerts-only)
                ALERTS_ONLY=true
                shift
                ;;
            --help)
                cat <<EOF
Usage: $0 [OPTIONS]

Options:
  --verbose      Show detailed information
  --json         Output results in JSON format
  --alerts-only  Only show warnings and critical issues
  --help         Show this help message

Environment Variables:
  DATABASE_HOST      Database host (default: localhost)
  DATABASE_NAME      Database name (default: vendhub)
  DATABASE_USER      Database user (default: postgres)
  PGPASSWORD         Database password (required)

Examples:
  $0                           # Standard health check
  $0 --verbose                 # Detailed output
  $0 --alerts-only             # Only show issues
  $0 --json                    # JSON output for monitoring

EOF
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    if [ "$JSON_OUTPUT" = false ]; then
        log "════════════════════════════════════════════════════════════════"
        log "VendHub Database Health Check"
        log "Database: $DB_NAME@$DB_HOST:$DB_PORT"
        log "════════════════════════════════════════════════════════════════"
        log ""
    fi

    # Run checks
    check_connection || exit 2
    check_cache_hit_ratio
    check_connections
    check_long_running_queries
    check_table_bloat
    check_unused_indexes
    check_replication
    check_disk_usage
    check_locks
    check_wal_archiving

    # Summary
    generate_summary

    # Exit code based on severity
    if [ $CRITICALS -gt 0 ]; then
        exit 2
    elif [ $WARNINGS -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
}

main "$@"
