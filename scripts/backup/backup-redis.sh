#!/bin/bash

# ============================================================================
# VendHub Manager - Redis Backup Script
# ============================================================================
# This script creates a backup of Redis data
#
# Usage: ./backup-redis.sh [backup_dir]
#
# Environment variables:
#   REDIS_HOST - Redis host (default: localhost)
#   REDIS_PORT - Redis port (default: 6379)
#   REDIS_PASSWORD - Redis password (optional)
#   BACKUP_RETENTION_DAYS - Number of days to keep backups (default: 7)
# ============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="${1:-/var/backups/vendhub}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/vendhub_redis_${TIMESTAMP}.rdb"

echo "=========================================="
echo "VendHub Redis Backup"
echo "=========================================="
echo "Redis: ${REDIS_HOST}:${REDIS_PORT}"
echo "Backup file: ${BACKUP_FILE}"
echo "=========================================="

# Trigger Redis save
echo "[1/3] Triggering Redis BGSAVE..."
if [ -n "${REDIS_PASSWORD:-}" ]; then
  redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" -a "${REDIS_PASSWORD}" BGSAVE
else
  redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" BGSAVE
fi

# Wait for save to complete
echo "[2/3] Waiting for save to complete..."
sleep 5

# Copy dump file
echo "[3/3] Copying dump file..."
if command -v docker &> /dev/null; then
  # If running in Docker, copy from container
  REDIS_CONTAINER=$(docker ps --filter "name=redis" --format "{{.Names}}" | head -n1)
  if [ -n "${REDIS_CONTAINER}" ]; then
    docker cp "${REDIS_CONTAINER}:/data/dump.rdb" "${BACKUP_FILE}"
  else
    echo "⚠️  Warning: Redis container not found. Using local dump.rdb"
    cp /var/lib/redis/dump.rdb "${BACKUP_FILE}" 2>/dev/null || \
    cp /data/dump.rdb "${BACKUP_FILE}" 2>/dev/null || \
    echo "❌ Error: Cannot find Redis dump.rdb file"
  fi
else
  # Copy from local Redis data directory
  cp /var/lib/redis/dump.rdb "${BACKUP_FILE}" 2>/dev/null || \
  cp /data/dump.rdb "${BACKUP_FILE}" 2>/dev/null || \
  echo "❌ Error: Cannot find Redis dump.rdb file"
fi

# Verify backup
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
  -name "vendhub_redis_*.rdb" \
  -type f \
  -mtime +${BACKUP_RETENTION_DAYS} \
  -delete

echo ""
echo "✅ Redis backup completed successfully!"
echo ""
