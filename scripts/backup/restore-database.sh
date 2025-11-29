#!/bin/bash

# ============================================================================
# VendHub Manager - PostgreSQL Database Restore Script
# ============================================================================
# This script restores a PostgreSQL database from a backup file
#
# Usage: ./restore-database.sh <backup_file>
#
# Environment variables:
#   DATABASE_NAME - Database name (default: vendhub)
#   DATABASE_USER - Database user (default: vendhub)
#   DATABASE_HOST - Database host (default: localhost)
#   DATABASE_PORT - Database port (default: 5432)
#   DATABASE_PASSWORD - Database password (required)
# ============================================================================

set -euo pipefail

# Check if backup file is provided
if [ $# -eq 0 ]; then
  echo "Error: No backup file specified"
  echo "Usage: $0 <backup_file>"
  exit 1
fi

BACKUP_FILE="$1"

# Configuration
DATABASE_NAME="${DATABASE_NAME:-vendhub}"
DATABASE_USER="${DATABASE_USER:-vendhub}"
DATABASE_HOST="${DATABASE_HOST:-localhost}"
DATABASE_PORT="${DATABASE_PORT:-5432}"

# Verify backup file exists
if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Error: Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

echo "=========================================="
echo "VendHub Database Restore"
echo "=========================================="
echo "⚠️  WARNING: This will REPLACE all data in the database!"
echo ""
echo "Database: ${DATABASE_NAME}"
echo "Host: ${DATABASE_HOST}:${DATABASE_PORT}"
echo "Backup file: ${BACKUP_FILE}"
echo "=========================================="
echo ""

# Ask for confirmation
read -p "Are you sure you want to continue? (yes/no): " CONFIRM
if [ "${CONFIRM}" != "yes" ]; then
  echo "Restore cancelled."
  exit 0
fi

export PGPASSWORD="${DATABASE_PASSWORD}"

# Decompress if needed
RESTORE_FILE="${BACKUP_FILE}"
if [[ "${BACKUP_FILE}" == *.gz ]]; then
  echo "[1/5] Decompressing backup..."
  RESTORE_FILE="${BACKUP_FILE%.gz}"
  gunzip -c "${BACKUP_FILE}" > "${RESTORE_FILE}"
fi

# Terminate active connections
echo "[2/5] Terminating active connections..."
psql \
  -h "${DATABASE_HOST}" \
  -p "${DATABASE_PORT}" \
  -U "${DATABASE_USER}" \
  -d postgres \
  -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DATABASE_NAME}' AND pid <> pg_backend_pid();" \
  2>/dev/null || true

# Drop and recreate database
echo "[3/5] Recreating database..."
psql \
  -h "${DATABASE_HOST}" \
  -p "${DATABASE_PORT}" \
  -U "${DATABASE_USER}" \
  -d postgres \
  -c "DROP DATABASE IF EXISTS ${DATABASE_NAME};"

psql \
  -h "${DATABASE_HOST}" \
  -p "${DATABASE_PORT}" \
  -U "${DATABASE_USER}" \
  -d postgres \
  -c "CREATE DATABASE ${DATABASE_NAME} WITH ENCODING='UTF8';"

# Restore backup
echo "[4/5] Restoring database from backup..."
pg_restore \
  -h "${DATABASE_HOST}" \
  -p "${DATABASE_PORT}" \
  -U "${DATABASE_USER}" \
  -d "${DATABASE_NAME}" \
  --verbose \
  --no-owner \
  --no-acl \
  "${RESTORE_FILE}"

# Clean up decompressed file
if [[ "${BACKUP_FILE}" == *.gz ]]; then
  echo "[5/5] Cleaning up temporary files..."
  rm -f "${RESTORE_FILE}"
fi

echo ""
echo "✅ Database restored successfully!"
echo ""
echo "You may need to:"
echo "  1. Restart your application services"
echo "  2. Run any pending migrations"
echo "  3. Clear application caches"
echo ""
