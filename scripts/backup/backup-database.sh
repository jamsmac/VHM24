#!/bin/bash

# ============================================================================
# VendHub Manager - PostgreSQL Database Backup Script
# ============================================================================
# This script creates a full backup of the PostgreSQL database with compression
#
# Usage: ./backup-database.sh [backup_dir]
#
# Environment variables:
#   DATABASE_NAME - Database name (default: vendhub)
#   DATABASE_USER - Database user (default: vendhub)
#   DATABASE_HOST - Database host (default: localhost)
#   DATABASE_PORT - Database port (default: 5432)
#   DATABASE_PASSWORD - Database password (required)
#   BACKUP_RETENTION_DAYS - Number of days to keep backups (default: 30)
# ============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="${1:-/var/backups/vendhub}"
DATABASE_NAME="${DATABASE_NAME:-vendhub}"
DATABASE_USER="${DATABASE_USER:-vendhub}"
DATABASE_HOST="${DATABASE_HOST:-localhost}"
DATABASE_PORT="${DATABASE_PORT:-5432}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/vendhub_db_${TIMESTAMP}.sql.gz"

echo "=========================================="
echo "VendHub Database Backup"
echo "=========================================="
echo "Database: ${DATABASE_NAME}"
echo "Host: ${DATABASE_HOST}:${DATABASE_PORT}"
echo "Backup file: ${BACKUP_FILE}"
echo "=========================================="

# Create backup with compression
echo "[1/4] Creating database backup..."
export PGPASSWORD="${DATABASE_PASSWORD}"

pg_dump \
  -h "${DATABASE_HOST}" \
  -p "${DATABASE_PORT}" \
  -U "${DATABASE_USER}" \
  -d "${DATABASE_NAME}" \
  --format=custom \
  --compress=9 \
  --verbose \
  --file="${BACKUP_FILE%.gz}"

# Compress with gzip
echo "[2/4] Compressing backup..."
gzip -9 "${BACKUP_FILE%.gz}"

# Verify backup
echo "[3/4] Verifying backup..."
if [ -f "${BACKUP_FILE}" ]; then
  BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
  echo "✅ Backup created successfully: ${BACKUP_FILE} (${BACKUP_SIZE})"
else
  echo "❌ Backup verification failed!"
  exit 1
fi

# Clean old backups
echo "[4/4] Cleaning old backups (keeping last ${BACKUP_RETENTION_DAYS} days)..."
find "${BACKUP_DIR}" \
  -name "vendhub_db_*.sql.gz" \
  -type f \
  -mtime +${BACKUP_RETENTION_DAYS} \
  -delete

echo ""
echo "✅ Backup completed successfully!"
echo ""
echo "To restore this backup, use:"
echo "  ./restore-database.sh ${BACKUP_FILE}"
echo ""

# Send notification (optional, requires additional setup)
# if command -v curl &> /dev/null && [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
#   curl -X POST -H 'Content-type: application/json' \
#     --data "{\"text\":\"✅ VendHub database backup completed: ${BACKUP_FILE} (${BACKUP_SIZE})\"}" \
#     "${SLACK_WEBHOOK_URL}"
# fi
