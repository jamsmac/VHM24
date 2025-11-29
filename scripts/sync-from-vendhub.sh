#!/bin/bash

# VH-M24 Synchronization Script
# Syncs code from VendHub Manager repository
# Usage: ./scripts/sync-from-vendhub.sh [--force]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
VENDHUB_REPO="https://github.com/jamsmac/VendHub.git"
FORCE_SYNC=${1:-""}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

# Change to repo directory
cd "$REPO_DIR"

log_info "Starting VendHub Manager synchronization..."
log_info "Repository: $REPO_DIR"

# Configure git if needed
if ! git config user.email > /dev/null; then
  log_info "Configuring git..."
  git config user.email "sync@vendhub.local"
  git config user.name "VendHub Sync"
fi

# Add VendHub remote if not exists
if ! git remote | grep -q vendhub; then
  log_info "Adding VendHub remote..."
  git remote add vendhub "$VENDHUB_REPO"
fi

# Fetch latest from VendHub
log_info "Fetching latest from VendHub Manager..."
git fetch vendhub main --quiet

# Check for updates
VENDHUB_HEAD=$(git rev-parse vendhub/main)
LOCAL_HEAD=$(git rev-parse HEAD)

if [ "$VENDHUB_HEAD" = "$LOCAL_HEAD" ] && [ "$FORCE_SYNC" != "--force" ]; then
  log_success "Already up to date with VendHub Manager"
  log_info "VendHub commit: $VENDHUB_HEAD"
  exit 0
fi

log_info "Updates available from VendHub Manager"
log_info "Local commit:   $LOCAL_HEAD"
log_info "VendHub commit: $VENDHUB_HEAD"

# Perform merge
log_info "Merging updates..."
if git merge --allow-unrelated-histories vendhub/main -m "Sync: Update from VendHub Manager ($VENDHUB_HEAD)" --no-edit 2>/dev/null; then
  log_success "Merge completed successfully"
  
  # Push changes
  log_info "Pushing changes to origin..."
  if git push origin main --quiet; then
    log_success "Changes pushed successfully"
    log_success "Synchronization complete!"
    
    # Summary
    echo ""
    echo "=== Sync Summary ==="
    echo "Timestamp: $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
    echo "Source:    VendHub Manager"
    echo "Target:    VH-M24"
    echo "Commit:    $VENDHUB_HEAD"
    echo ""
  else
    log_warning "Failed to push changes"
    exit 1
  fi
else
  log_warning "Merge completed with conflicts or no changes"
  log_info "Please resolve conflicts manually if needed"
  git status
fi

exit 0
