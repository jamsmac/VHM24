#!/bin/bash

# ============================================================================
# VendHub Manager - Full System Backup Script
# ============================================================================
# This script creates a complete backup of all VendHub components:
# - PostgreSQL database
# - Redis data
# - MinIO S3 buckets
#
# Usage: ./backup-all.sh [backup_dir]
#
# This script requires all environment variables from individual backup scripts
# ============================================================================

set -euo pipefail

# Configuration
BACKUP_DIR="${1:-/var/backups/vendhub}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Logging function
log() {
  echo -e "$1" | tee -a "${LOG_FILE}"
}

log "${GREEN}=========================================="
log "VendHub Full System Backup"
log "==========================================${NC}"
log "Timestamp: ${TIMESTAMP}"
log "Backup directory: ${BACKUP_DIR}"
log "${GREEN}==========================================${NC}"
log ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Counters
SUCCESSFUL=0
FAILED=0

# Backup Database
log "${YELLOW}[1/3] Backing up PostgreSQL database...${NC}"
if "${SCRIPT_DIR}/backup-database.sh" "${BACKUP_DIR}" >> "${LOG_FILE}" 2>&1; then
  log "${GREEN}✅ Database backup completed${NC}"
  ((SUCCESSFUL++))
else
  log "${RED}❌ Database backup failed${NC}"
  ((FAILED++))
fi
log ""

# Backup Redis
log "${YELLOW}[2/3] Backing up Redis data...${NC}"
if "${SCRIPT_DIR}/backup-redis.sh" "${BACKUP_DIR}" >> "${LOG_FILE}" 2>&1; then
  log "${GREEN}✅ Redis backup completed${NC}"
  ((SUCCESSFUL++))
else
  log "${RED}❌ Redis backup failed${NC}"
  ((FAILED++))
fi
log ""

# Backup MinIO
log "${YELLOW}[3/3] Backing up MinIO S3 buckets...${NC}"
if "${SCRIPT_DIR}/backup-minio.sh" "${BACKUP_DIR}" >> "${LOG_FILE}" 2>&1; then
  log "${GREEN}✅ MinIO backup completed${NC}"
  ((SUCCESSFUL++))
else
  log "${RED}❌ MinIO backup failed${NC}"
  ((FAILED++))
fi
log ""

# Summary
log "${GREEN}=========================================="
log "Backup Summary"
log "==========================================${NC}"
log "Successful: ${GREEN}${SUCCESSFUL}${NC}"
log "Failed: ${RED}${FAILED}${NC}"
log "Log file: ${LOG_FILE}"
log "${GREEN}==========================================${NC}"

# Calculate total backup size
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
log ""
log "Total backup size: ${TOTAL_SIZE}"
log ""

# Send notification (optional)
if [ ${FAILED} -eq 0 ]; then
  log "${GREEN}✅ Full system backup completed successfully!${NC}"
  EXIT_CODE=0
else
  log "${RED}⚠️  Backup completed with ${FAILED} failures${NC}"
  EXIT_CODE=1
fi

log ""
log "Backup files in: ${BACKUP_DIR}"
log ""

# Optional: Send notification to monitoring system
# if command -v curl &> /dev/null && [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
#   STATUS=$([ ${FAILED} -eq 0 ] && echo "✅ Success" || echo "⚠️ Partial failure")
#   curl -X POST -H 'Content-type: application/json' \
#     --data "{\"text\":\"${STATUS}: VendHub backup completed (${SUCCESSFUL}/${TOTAL} successful, ${TOTAL_SIZE})\"}" \
#     "${SLACK_WEBHOOK_URL}"
# fi

exit ${EXIT_CODE}
