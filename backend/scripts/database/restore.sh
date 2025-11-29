#!/bin/bash

#===============================================================================
# VendHub Database Restore Script
#===============================================================================
#
# This script restores PostgreSQL backups with safety checks:
# - Creates restoration database
# - Verifies backup integrity before restore
# - Optional Point-in-Time Recovery (PITR)
# - Data validation after restore
# - Safe swap mechanism
#
# Usage:
#   ./restore.sh <backup_file> [--target-db DATABASE_NAME] [--pitr TIMESTAMP]
#
# WARNING: This script can be destructive. Always verify the backup
#          and understand the implications before running in production!
#
# Environment Variables (required):
#   DATABASE_HOST     - Database host (default: localhost)
#   DATABASE_PORT     - Database port (default: 5432)
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
DB_USER="${DATABASE_USER:-postgres}"
PRODUCTION_DB="${DATABASE_NAME:-vendhub}"

# Restore target (default: create new database)
TARGET_DB=""
BACKUP_FILE=""
PITR_TIMESTAMP=""
FORCE_RESTORE=false
SWAP_DATABASE=false

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ============================================================================
# Functions
# ============================================================================

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

confirm() {
    local prompt="$1"
    local response

    echo -en "${YELLOW}$prompt [yes/no]: ${NC}"
    read -r response

    if [ "$response" != "yes" ]; then
        error "Operation cancelled by user"
        exit 1
    fi
}

check_backup_file() {
    local file="$1"

    if [ ! -f "$file" ]; then
        error "Backup file does not exist: $file"
        exit 1
    fi

    log "Backup file found: $file ($(du -h "$file" | cut -f1))"
}

verify_backup_integrity() {
    local backup_file="$1"

    log "Verifying backup integrity..."

    if ! pg_restore --list "$backup_file" > /dev/null 2>&1; then
        error "Backup file is corrupted or invalid"
        exit 1
    fi

    local table_count=$(pg_restore --list "$backup_file" 2>/dev/null | grep -c "TABLE" || true)
    log "Backup verified ✓ (${table_count} tables)"
}

create_restore_database() {
    local db_name="$1"

    log "Creating restore database: $db_name"

    # Drop if exists (with confirmation if production)
    if PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$db_name"; then
        warning "Database $db_name already exists"

        if [ "$FORCE_RESTORE" = false ]; then
            confirm "Drop existing database $db_name and recreate?"
        fi

        PGPASSWORD=$PGPASSWORD dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$db_name"
        log "Existing database dropped"
    fi

    # Create database
    PGPASSWORD=$PGPASSWORD createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$db_name"
    log "Database created ✓"
}

restore_backup() {
    local backup_file="$1"
    local target_db="$2"

    log "Restoring backup to database: $target_db"
    log "This may take several minutes..."

    # Restore with verbose output
    # --no-owner: Don't set ownership
    # --no-acl: Don't restore access privileges
    # -v: Verbose
    # -d: Target database
    # -1: Single transaction (atomic restore)

    if ! PGPASSWORD=$PGPASSWORD pg_restore \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$target_db" \
        --no-owner \
        --no-acl \
        --verbose \
        --single-transaction \
        "$backup_file" 2>&1 | tee "/tmp/restore_${target_db}.log"; then

        error "Restore failed. Check logs at /tmp/restore_${target_db}.log"
        exit 1
    fi

    log "Restore completed ✓"
}

validate_restored_data() {
    local db_name="$1"

    log "Validating restored data..."

    # Count tables
    local table_count=$(PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$db_name" -t -c \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")

    if [ "$table_count" -lt 10 ]; then
        error "Data validation failed: Only $table_count tables found"
        return 1
    fi

    log "Found $table_count tables ✓"

    # Check critical tables
    local critical_tables=("users" "machines" "tasks" "nomenclature" "warehouse_inventory")
    for table in "${critical_tables[@]}"; do
        if ! PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$db_name" -t -c \
            "SELECT 1 FROM information_schema.tables WHERE table_name = '$table'" | grep -q 1; then
            error "Critical table missing: $table"
            return 1
        fi
    done

    log "Critical tables present ✓"

    # Sample data count
    local user_count=$(PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$db_name" -t -c \
        "SELECT COUNT(*) FROM users" 2>/dev/null || echo "0")

    log "Sample record count - Users: $user_count"

    log "Data validation successful ✓"
    return 0
}

apply_pitr() {
    local target_db="$1"
    local timestamp="$2"

    log "Applying Point-in-Time Recovery to: $timestamp"

    # This requires WAL archiving to be enabled
    # Create recovery configuration
    cat > "/tmp/recovery.conf" <<EOF
restore_command = 'cp /mnt/archive/%f %p'
recovery_target_time = '$timestamp'
EOF

    warning "PITR requires manual setup. Recovery configuration saved to /tmp/recovery.conf"
    info "To apply PITR:"
    info "1. Stop PostgreSQL"
    info "2. Copy recovery.conf to data directory"
    info "3. Start PostgreSQL"
    info "4. Database will recover to specified time"
}

swap_databases() {
    local old_db="$PRODUCTION_DB"
    local new_db="$TARGET_DB"
    local backup_db="${old_db}_backup_$(date +%Y%m%d_%H%M%S)"

    warning "Swapping databases: $new_db will become $old_db"
    confirm "This will rename the current production database. Continue?"

    log "Step 1: Terminating active connections to $old_db..."

    PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$old_db' AND pid != pg_backend_pid();" \
        > /dev/null 2>&1 || true

    log "Step 2: Renaming $old_db to $backup_db..."
    PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
        "ALTER DATABASE \"$old_db\" RENAME TO \"$backup_db\";"

    log "Step 3: Renaming $new_db to $old_db..."
    PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c \
        "ALTER DATABASE \"$new_db\" RENAME TO \"$old_db\";"

    log "Database swap completed ✓"
    info "Old database backed up as: $backup_db"
    info "You can drop it later with: dropdb $backup_db"
}

# ============================================================================
# Main Script
# ============================================================================

main() {
    # Parse arguments
    if [ $# -eq 0 ]; then
        error "No backup file specified"
        echo ""
        echo "Usage: $0 <backup_file> [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --target-db NAME     Target database name (default: ${PRODUCTION_DB}_restore_TIMESTAMP)"
        echo "  --pitr TIMESTAMP     Point-in-Time Recovery timestamp"
        echo "  --force              Skip confirmations"
        echo "  --swap               Swap restored database with production"
        echo ""
        echo "Examples:"
        echo "  $0 /backups/vendhub_20250125.backup"
        echo "  $0 /backups/vendhub_20250125.backup --target-db vendhub_test"
        echo "  $0 /backups/vendhub_20250125.backup --swap"
        exit 1
    fi

    BACKUP_FILE="$1"
    shift

    while [[ $# -gt 0 ]]; do
        case $1 in
            --target-db)
                TARGET_DB="$2"
                shift 2
                ;;
            --pitr)
                PITR_TIMESTAMP="$2"
                shift 2
                ;;
            --force)
                FORCE_RESTORE=true
                shift
                ;;
            --swap)
                SWAP_DATABASE=true
                shift
                ;;
            *)
                error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    # Set default target database if not specified
    if [ -z "$TARGET_DB" ]; then
        TARGET_DB="${PRODUCTION_DB}_restore_$(date +%Y%m%d_%H%M%S)"
    fi

    log "════════════════════════════════════════════════════════════════"
    log "VendHub Database Restore"
    log "════════════════════════════════════════════════════════════════"
    log ""
    log "Backup File:    $BACKUP_FILE"
    log "Target DB:      $TARGET_DB"
    log "Production DB:  $PRODUCTION_DB"
    log "Swap DB:        $SWAP_DATABASE"
    log ""

    # Safety checks
    check_backup_file "$BACKUP_FILE"
    verify_backup_integrity "$BACKUP_FILE"

    # Warning for production restore
    if [ "$TARGET_DB" = "$PRODUCTION_DB" ] || [ "$SWAP_DATABASE" = true ]; then
        warning "═══════════════════════════════════════════════════════"
        warning "  DANGER: This will affect the PRODUCTION database!"
        warning "═══════════════════════════════════════════════════════"
        confirm "Are you ABSOLUTELY SURE you want to continue?"
    fi

    # Create restore database
    create_restore_database "$TARGET_DB"

    # Restore backup
    restore_backup "$BACKUP_FILE" "$TARGET_DB"

    # Apply PITR if requested
    if [ -n "$PITR_TIMESTAMP" ]; then
        apply_pitr "$TARGET_DB" "$PITR_TIMESTAMP"
    fi

    # Validate data
    if ! validate_restored_data "$TARGET_DB"; then
        error "Data validation failed"
        warning "Database $TARGET_DB may be incomplete"
        confirm "Continue anyway?"
    fi

    # Swap databases if requested
    if [ "$SWAP_DATABASE" = true ]; then
        swap_databases
    fi

    log ""
    log "════════════════════════════════════════════════════════════════"
    log "✓ Restore Completed Successfully"
    log "════════════════════════════════════════════════════════════════"
    log ""
    info "Restored database: $TARGET_DB"

    if [ "$SWAP_DATABASE" = false ]; then
        info "To use this database:"
        info "  1. Update DATABASE_NAME environment variable to: $TARGET_DB"
        info "  2. Restart application"
        info ""
        info "Or swap with production:"
        info "  $0 $BACKUP_FILE --swap"
    else
        info "Production database has been updated"
        info "Please restart your application"
    fi

    log ""
}

main "$@"
