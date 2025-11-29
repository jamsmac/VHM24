#!/bin/bash

#===============================================================================
# VendHub Database Backup Script
#===============================================================================
#
# This script performs automated PostgreSQL backups with:
# - Compressed custom format backups
# - Integrity verification
# - Optional S3 upload
# - Automatic cleanup of old backups
# - Email notifications on failure
#
# Usage:
#   ./backup.sh [--type daily|weekly|monthly] [--upload-s3]
#
# Environment Variables (required):
#   DATABASE_HOST     - Database host (default: localhost)
#   DATABASE_PORT     - Database port (default: 5432)
#   DATABASE_NAME     - Database name (default: vendhub)
#   DATABASE_USER     - Database user (default: postgres)
#   PGPASSWORD        - Database password (set in environment)
#
# Optional Environment Variables:
#   BACKUP_S3_BUCKET  - S3 bucket for remote backups
#   BACKUP_DIR        - Local backup directory (default: /backups/postgresql)
#   RETENTION_DAYS    - Days to keep backups (default: 30)
#   NOTIFY_EMAIL      - Email for failure notifications
#
# Example crontab entries:
#   0 2 * * *   /opt/vendhub/scripts/database/backup.sh --type daily --upload-s3
#   0 3 * * 0   /opt/vendhub/scripts/database/backup.sh --type weekly --upload-s3
#
#===============================================================================

set -euo pipefail  # Exit on error, undefined variables, pipe failures

# ============================================================================
# Configuration
# ============================================================================

# Database configuration
DB_HOST="${DATABASE_HOST:-localhost}"
DB_PORT="${DATABASE_PORT:-5432}"
DB_NAME="${DATABASE_NAME:-vendhub}"
DB_USER="${DATABASE_USER:-postgres}"

# Backup configuration
BACKUP_DIR="${BACKUP_DIR:-/backups/postgresql}"
S3_BUCKET="${BACKUP_S3_BUCKET:-}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
NOTIFY_EMAIL="${NOTIFY_EMAIL:-}"

# Backup type (daily, weekly, monthly)
BACKUP_TYPE="daily"
UPLOAD_S3=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

send_notification() {
    local subject="$1"
    local message="$2"

    if [ -n "$NOTIFY_EMAIL" ]; then
        echo "$message" | mail -s "$subject" "$NOTIFY_EMAIL" 2>/dev/null || true
    fi
}

check_dependencies() {
    local missing_deps=()

    for cmd in pg_dump pg_restore; do
        if ! command -v "$cmd" &> /dev/null; then
            missing_deps+=("$cmd")
        fi
    done

    if [ "$UPLOAD_S3" = true ] && ! command -v aws &> /dev/null; then
        missing_deps+=("aws-cli")
    fi

    if [ ${#missing_deps[@]} -gt 0 ]; then
        error "Missing required dependencies: ${missing_deps[*]}"
        exit 1
    fi
}

verify_database_connection() {
    log "Verifying database connection..."

    if ! PGPASSWORD=$PGPASSWORD psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" &>/dev/null; then
        error "Cannot connect to database"
        send_notification "VendHub Backup Failed" "Cannot connect to database $DB_NAME on $DB_HOST"
        exit 1
    fi

    log "Database connection verified ✓"
}

create_backup() {
    local backup_file="$1"

    log "Creating backup: $backup_file"

    # Perform backup with custom format (compressed)
    # -F c: Custom format (binary, compressed)
    # -Z 9: Maximum compression
    # -v: Verbose
    # --no-owner: Don't dump ownership commands
    # --no-acl: Don't dump access privileges

    if ! PGPASSWORD=$PGPASSWORD pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -F c \
        -Z 9 \
        -v \
        --no-owner \
        --no-acl \
        -f "$backup_file" 2>&1 | tee "${backup_file}.log"; then

        error "Backup creation failed"
        send_notification "VendHub Backup Failed" "pg_dump failed. Check logs at ${backup_file}.log"
        return 1
    fi

    # Get backup file size
    local file_size=$(du -h "$backup_file" | cut -f1)
    log "Backup created successfully (${file_size}) ✓"

    return 0
}

verify_backup() {
    local backup_file="$1"

    log "Verifying backup integrity..."

    # Verify backup can be listed (validates format)
    if ! pg_restore --list "$backup_file" > /dev/null 2>&1; then
        error "Backup verification failed - file may be corrupted"
        send_notification "VendHub Backup Failed" "Backup verification failed for $backup_file"
        return 1
    fi

    log "Backup verification successful ✓"
    return 0
}

upload_to_s3() {
    local backup_file="$1"
    local s3_path="$2"

    if [ -z "$S3_BUCKET" ]; then
        warning "S3_BUCKET not configured, skipping upload"
        return 0
    fi

    log "Uploading to S3: $s3_path"

    # Upload with server-side encryption
    if ! aws s3 cp "$backup_file" "$s3_path" \
        --storage-class STANDARD_IA \
        --server-side-encryption AES256 \
        --metadata "backup-type=$BACKUP_TYPE,database=$DB_NAME,timestamp=$(date +%s)"; then

        error "S3 upload failed"
        send_notification "VendHub Backup Warning" "S3 upload failed for $backup_file"
        return 1
    fi

    log "S3 upload successful ✓"

    # Verify upload
    if ! aws s3 ls "$s3_path" > /dev/null 2>&1; then
        error "S3 upload verification failed"
        return 1
    fi

    log "S3 upload verified ✓"
    return 0
}

cleanup_old_backups() {
    log "Cleaning up backups older than $RETENTION_DAYS days..."

    # Local cleanup
    local deleted_count=0
    while IFS= read -r -d '' file; do
        rm -f "$file" "${file}.log" || true
        ((deleted_count++))
    done < <(find "$BACKUP_DIR" -name "vendhub_*.backup" -mtime +"$RETENTION_DAYS" -print0)

    if [ $deleted_count -gt 0 ]; then
        log "Deleted $deleted_count old local backup(s) ✓"
    else
        log "No old backups to delete"
    fi

    # S3 cleanup (if configured)
    if [ "$UPLOAD_S3" = true ] && [ -n "$S3_BUCKET" ]; then
        log "Cleaning up old S3 backups..."

        # Use S3 lifecycle policy instead of manual deletion
        # This is more efficient and reliable
        cat > /tmp/s3-lifecycle-policy.json <<EOF
{
  "Rules": [
    {
      "Id": "DeleteOldBackups",
      "Status": "Enabled",
      "Prefix": "",
      "Expiration": {
        "Days": $RETENTION_DAYS
      }
    }
  ]
}
EOF

        if aws s3api put-bucket-lifecycle-configuration \
            --bucket "${S3_BUCKET#s3://}" \
            --lifecycle-configuration file:///tmp/s3-lifecycle-policy.json 2>/dev/null; then
            log "S3 lifecycle policy updated ✓"
        else
            warning "Could not update S3 lifecycle policy (may not have permissions)"
        fi

        rm -f /tmp/s3-lifecycle-policy.json
    fi
}

generate_backup_report() {
    local backup_file="$1"
    local start_time="$2"
    local end_time="$3"

    local duration=$((end_time - start_time))
    local file_size=$(du -h "$backup_file" | cut -f1)

    cat <<EOF

════════════════════════════════════════════════════════════════
  VendHub Database Backup Report
════════════════════════════════════════════════════════════════

  Database:        $DB_NAME@$DB_HOST:$DB_PORT
  Backup Type:     $BACKUP_TYPE
  Timestamp:       $(date '+%Y-%m-%d %H:%M:%S')
  Duration:        ${duration}s

  Backup File:     $backup_file
  File Size:       $file_size
  S3 Upload:       $([ "$UPLOAD_S3" = true ] && echo "✓ Yes" || echo "✗ No")

  Status:          ✓ SUCCESS

════════════════════════════════════════════════════════════════

EOF
}

# ============================================================================
# Main Script
# ============================================================================

main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --type)
                BACKUP_TYPE="$2"
                shift 2
                ;;
            --upload-s3)
                UPLOAD_S3=true
                shift
                ;;
            --help)
                cat <<EOF
Usage: $0 [OPTIONS]

Options:
  --type TYPE        Backup type: daily, weekly, monthly (default: daily)
  --upload-s3        Upload backup to S3
  --help             Show this help message

Environment Variables:
  DATABASE_HOST      Database host (default: localhost)
  DATABASE_NAME      Database name (default: vendhub)
  DATABASE_USER      Database user (default: postgres)
  PGPASSWORD         Database password (required)
  BACKUP_S3_BUCKET   S3 bucket for backups
  RETENTION_DAYS     Days to keep backups (default: 30)

Examples:
  $0 --type daily
  $0 --type weekly --upload-s3
EOF
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    # Start timer
    START_TIME=$(date +%s)

    log "════════════════════════════════════════════════════════════════"
    log "VendHub Database Backup Started"
    log "Type: $BACKUP_TYPE | Upload S3: $UPLOAD_S3"
    log "════════════════════════════════════════════════════════════════"
    log ""

    # Checks
    check_dependencies
    verify_database_connection

    # Create backup directory
    mkdir -p "$BACKUP_DIR"

    # Generate backup filename
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/vendhub_${BACKUP_TYPE}_${TIMESTAMP}.backup"

    # Create backup
    if ! create_backup "$BACKUP_FILE"; then
        error "Backup process failed"
        exit 1
    fi

    # Verify backup
    if ! verify_backup "$BACKUP_FILE"; then
        error "Backup verification failed"
        rm -f "$BACKUP_FILE"
        exit 1
    fi

    # Upload to S3
    if [ "$UPLOAD_S3" = true ]; then
        S3_PATH="${S3_BUCKET}/backups/${BACKUP_TYPE}/$(basename "$BACKUP_FILE")"
        upload_to_s3 "$BACKUP_FILE" "$S3_PATH"
    fi

    # Cleanup old backups
    cleanup_old_backups

    # End timer
    END_TIME=$(date +%s)

    # Generate report
    generate_backup_report "$BACKUP_FILE" "$START_TIME" "$END_TIME"

    # Send success notification
    send_notification \
        "VendHub Backup Successful" \
        "Database backup completed successfully at $(date)"

    log "Backup process completed successfully ✓"
    exit 0
}

# Run main function
main "$@"
