#!/bin/bash

# ============================================================================
# VendHub Manager - MinIO Backup Script
# ============================================================================
# This script creates a backup of MinIO S3 buckets
#
# Usage: ./backup-minio.sh [backup_dir]
#
# Environment variables:
#   S3_ENDPOINT - MinIO endpoint (default: http://localhost:9000)
#   S3_ACCESS_KEY - MinIO access key (required)
#   S3_SECRET_KEY - MinIO secret key (required)
#   S3_BUCKET - Bucket name (default: vendhub)
#   BACKUP_RETENTION_DAYS - Number of days to keep backups (default: 30)
# ============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="${1:-/var/backups/vendhub}"
S3_ENDPOINT="${S3_ENDPOINT:-http://localhost:9000}"
S3_BUCKET="${S3_BUCKET:-vendhub}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Check required variables
if [ -z "${S3_ACCESS_KEY:-}" ] || [ -z "${S3_SECRET_KEY:-}" ]; then
  echo "Error: S3_ACCESS_KEY and S3_SECRET_KEY are required"
  exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/vendhub_minio_${TIMESTAMP}.tar.gz"
TEMP_DIR="${BACKUP_DIR}/temp_${TIMESTAMP}"

echo "=========================================="
echo "VendHub MinIO Backup"
echo "=========================================="
echo "Endpoint: ${S3_ENDPOINT}"
echo "Bucket: ${S3_BUCKET}"
echo "Backup file: ${BACKUP_FILE}"
echo "=========================================="

# Install mc (MinIO Client) if not present
if ! command -v mc &> /dev/null; then
  echo "[Setup] Installing MinIO Client..."
  wget -q https://dl.min.io/client/mc/release/linux-amd64/mc -O /usr/local/bin/mc
  chmod +x /usr/local/bin/mc
fi

# Configure mc
echo "[1/4] Configuring MinIO client..."
mc alias set vendhub "${S3_ENDPOINT}" "${S3_ACCESS_KEY}" "${S3_SECRET_KEY}" --api S3v4

# Create temporary directory
mkdir -p "${TEMP_DIR}"

# Download all files from bucket
echo "[2/4] Downloading files from bucket..."
mc mirror --preserve "vendhub/${S3_BUCKET}" "${TEMP_DIR}/${S3_BUCKET}"

# Count files
FILE_COUNT=$(find "${TEMP_DIR}/${S3_BUCKET}" -type f | wc -l)
echo "Downloaded ${FILE_COUNT} files"

# Create compressed archive
echo "[3/4] Creating compressed archive..."
tar -czf "${BACKUP_FILE}" -C "${TEMP_DIR}" "${S3_BUCKET}"

# Clean up temporary directory
echo "[4/4] Cleaning up temporary files..."
rm -rf "${TEMP_DIR}"

# Verify backup
if [ -f "${BACKUP_FILE}" ]; then
  BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
  echo "✅ Backup created successfully: ${BACKUP_FILE} (${BACKUP_SIZE})"
else
  echo "❌ Backup verification failed!"
  exit 1
fi

# Clean old backups
echo "[5/5] Cleaning old backups (keeping last ${BACKUP_RETENTION_DAYS} days)..."
find "${BACKUP_DIR}" \
  -name "vendhub_minio_*.tar.gz" \
  -type f \
  -mtime +${BACKUP_RETENTION_DAYS} \
  -delete

echo ""
echo "✅ MinIO backup completed successfully!"
echo ""
echo "To restore this backup, use:"
echo "  ./restore-minio.sh ${BACKUP_FILE}"
echo ""
