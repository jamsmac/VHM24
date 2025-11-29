#!/bin/bash

#===============================================================================
# VendHub Foreign Key Index Audit Script
#===============================================================================
#
# This script audits all foreign key constraints to ensure they have
# corresponding indexes for optimal query performance.
#
# Why FK indexes are critical:
# - Improves JOIN query performance
# - Prevents lock escalation during parent table updates/deletes
# - Required for efficient CASCADE operations
# - Reduces deadlock risk in concurrent transactions
#
# Usage:
#   ./audit-fk-indexes.sh [--fix]
#
# Options:
#   --fix    Generate SQL to create missing indexes
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

GENERATE_FIX=false

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
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

check_connection() {
    log "Verifying database connection..."

    if ! PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" &>/dev/null; then
        error "Cannot connect to database"
        exit 1
    fi

    log "Database connection verified ✓"
}

audit_fk_indexes() {
    log "Auditing foreign key indexes..."
    log ""

    # Query to find foreign keys without indexes
    PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" <<'EOF'

-- ============================================================================
-- Find Foreign Keys Without Indexes
-- ============================================================================

WITH fk_constraints AS (
    SELECT
        tc.table_schema,
        tc.table_name,
        kcu.column_name,
        tc.constraint_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
),
existing_indexes AS (
    SELECT
        schemaname,
        tablename,
        indexname,
        indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
)
SELECT
    fk.table_name,
    fk.column_name,
    fk.constraint_name,
    fk.foreign_table_name,
    fk.foreign_column_name,
    CASE
        WHEN ei.indexname IS NULL THEN '❌ MISSING'
        ELSE '✅ EXISTS'
    END AS index_status,
    ei.indexname AS existing_index_name,
    CASE
        WHEN ei.indexname IS NULL THEN
            'CREATE INDEX IF NOT EXISTS idx_' || fk.table_name || '_' || fk.column_name ||
            ' ON ' || fk.table_name || ' (' || fk.column_name || ');'
        ELSE NULL
    END AS suggested_fix
FROM fk_constraints fk
LEFT JOIN existing_indexes ei
    ON ei.tablename = fk.table_name
    AND ei.indexdef LIKE '%(' || fk.column_name || ')%'
    AND ei.indexdef LIKE '%' || fk.table_name || '%'
ORDER BY
    CASE WHEN ei.indexname IS NULL THEN 0 ELSE 1 END,
    fk.table_name,
    fk.column_name;

EOF
}

generate_fix_sql() {
    log ""
    log "Generating SQL to create missing indexes..."
    log ""

    PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t <<'EOF' | grep -v "^$"

WITH fk_constraints AS (
    SELECT
        tc.table_name,
        kcu.column_name,
        tc.constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
),
existing_indexes AS (
    SELECT
        tablename,
        indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
)
SELECT DISTINCT
    'CREATE INDEX IF NOT EXISTS idx_' || fk.table_name || '_' || fk.column_name ||
    ' ON ' || fk.table_name || ' (' || fk.column_name || ');' AS create_statement
FROM fk_constraints fk
WHERE NOT EXISTS (
    SELECT 1
    FROM existing_indexes ei
    WHERE ei.tablename = fk.table_name
        AND ei.indexdef LIKE '%(' || fk.column_name || ')%'
)
ORDER BY create_statement;

EOF
}

generate_summary() {
    log ""
    log "════════════════════════════════════════════════════════════════"
    log "Foreign Key Index Audit Summary"
    log "════════════════════════════════════════════════════════════════"

    # Count total FKs
    local total_fks=$(PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
        "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public'")

    # Count FKs with indexes
    local fks_with_indexes=$(PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t <<'EOF'
WITH fk_constraints AS (
    SELECT
        tc.table_name,
        kcu.column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
),
existing_indexes AS (
    SELECT
        tablename,
        indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
)
SELECT COUNT(DISTINCT fk.table_name || '.' || fk.column_name)
FROM fk_constraints fk
WHERE EXISTS (
    SELECT 1
    FROM existing_indexes ei
    WHERE ei.tablename = fk.table_name
        AND ei.indexdef LIKE '%(' || fk.column_name || ')%'
);
EOF
)

    local missing_indexes=$((total_fks - fks_with_indexes))
    local coverage_pct=$(awk "BEGIN {printf \"%.1f\", ($fks_with_indexes / $total_fks) * 100}")

    log ""
    info "Total Foreign Keys:     $total_fks"
    info "With Indexes:           $fks_with_indexes"

    if [ "$missing_indexes" -gt 0 ]; then
        warning "Missing Indexes:        $missing_indexes ❌"
    else
        log "Missing Indexes:        $missing_indexes ✅"
    fi

    info "Index Coverage:         ${coverage_pct}%"
    log ""

    if [ "$missing_indexes" -gt 0 ]; then
        warning "⚠️  Action Required: Add indexes to improve query performance"
        log ""
        info "Run with --fix flag to generate SQL to create missing indexes"
        log ""
        log "Example:"
        log "  $0 --fix > fix-missing-fk-indexes.sql"
        log "  psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f fix-missing-fk-indexes.sql"
    else
        log "✅ All foreign keys have indexes!"
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
            --fix)
                GENERATE_FIX=true
                shift
                ;;
            --help)
                cat <<EOF
Usage: $0 [OPTIONS]

Options:
  --fix       Generate SQL to create missing indexes
  --help      Show this help message

Environment Variables:
  DATABASE_HOST      Database host (default: localhost)
  DATABASE_NAME      Database name (default: vendhub)
  DATABASE_USER      Database user (default: postgres)
  PGPASSWORD         Database password (required)

Examples:
  $0                                    # Audit only
  $0 --fix > create-missing-indexes.sql  # Generate fix SQL

EOF
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    log "════════════════════════════════════════════════════════════════"
    log "VendHub Foreign Key Index Audit"
    log "Database: $DB_NAME@$DB_HOST:$DB_PORT"
    log "════════════════════════════════════════════════════════════════"
    log ""

    check_connection

    if [ "$GENERATE_FIX" = true ]; then
        generate_fix_sql
    else
        audit_fk_indexes
        generate_summary
    fi
}

main "$@"
