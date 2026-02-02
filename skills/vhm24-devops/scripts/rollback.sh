#!/bin/bash
# VendHub Rollback Script
# Usage: ./rollback.sh [environment] [version]
# Example: ./rollback.sh staging v1.2.3

set -e

ENV=${1:-staging}
VERSION=$2

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "=========================================="
echo "VendHub - Rollback"
echo "Environment: $ENV"
echo "=========================================="
echo ""

# Validate environment
case $ENV in
  staging|production)
    ;;
  *)
    log_error "Invalid environment: $ENV"
    echo "Usage: $0 [staging|production] [version]"
    exit 1
    ;;
esac

# Production requires confirmation
if [ "$ENV" == "production" ]; then
    log_warn "You are about to rollback PRODUCTION!"
    read -p "Type 'rollback' to confirm: " CONFIRM
    if [ "$CONFIRM" != "rollback" ]; then
        log_error "Rollback cancelled."
        exit 1
    fi
fi

# Get available versions
log_info "Fetching available versions..."

if [ -z "$VERSION" ]; then
    echo ""
    echo "Recent deployments:"
    # Railway example - list recent deployments
    railway deployments --environment "$ENV" 2>/dev/null | head -10 || {
        # Git tags fallback
        git tag -l "v*" --sort=-version:refname | head -10
    }
    echo ""
    read -p "Enter version to rollback to: " VERSION
fi

if [ -z "$VERSION" ]; then
    log_error "No version specified."
    exit 1
fi

log_info "Rolling back to version: $VERSION"

# Create backup of current state
BACKUP_TAG="backup-$(date +%Y%m%d-%H%M%S)-pre-rollback"
log_info "Creating backup tag: $BACKUP_TAG"
git tag "$BACKUP_TAG" || true

# Checkout version
log_info "Checking out version $VERSION..."
git checkout "$VERSION"

# Deploy
log_info "Deploying rollback version..."

if command -v railway &> /dev/null; then
    # Railway deployment
    cd backend && railway up --environment "$ENV" --detach
    cd ../frontend && railway up --environment "$ENV" --detach
else
    log_warn "Railway CLI not found. Manual deployment required."
    echo ""
    echo "Manual steps:"
    echo "1. Deploy backend from: $(pwd)/backend"
    echo "2. Deploy frontend from: $(pwd)/frontend"
    echo "3. Run database migrations if needed"
fi

# Wait and health check
log_info "Waiting for deployment..."
sleep 30

log_info "Running health check..."
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
"$SCRIPT_DIR/health-check.sh" "$ENV" || {
    log_error "Health check failed after rollback!"
    echo ""
    echo "Recovery options:"
    echo "1. Check logs: railway logs --environment $ENV"
    echo "2. Restore from backup: git checkout $BACKUP_TAG"
    exit 1
}

# Return to original branch
git checkout -

echo ""
echo "=========================================="
log_info "Rollback complete!"
echo "=========================================="
echo ""
echo "Rolled back to: $VERSION"
echo "Backup tag: $BACKUP_TAG"
echo ""
echo "If issues persist, restore with:"
echo "  git checkout $BACKUP_TAG && ./deploy-staging.sh"
echo ""
