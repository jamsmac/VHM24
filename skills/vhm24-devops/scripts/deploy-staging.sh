#!/bin/bash
# VendHub Deploy to Staging
# Usage: ./deploy-staging.sh

set -e

echo "=========================================="
echo "VendHub - Deploy to Staging"
echo "=========================================="
echo ""

# Configuration
PROJECT_ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
BRANCH="develop"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Pre-flight checks
log_info "Running pre-flight checks..."

# Check if on correct branch
CURRENT_BRANCH=$(git -C "$PROJECT_ROOT" rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
    log_warn "Not on $BRANCH branch (current: $CURRENT_BRANCH)"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check for uncommitted changes
if ! git -C "$PROJECT_ROOT" diff-index --quiet HEAD --; then
    log_error "Uncommitted changes detected. Please commit or stash them."
    exit 1
fi

# Pull latest changes
log_info "Pulling latest changes..."
git -C "$PROJECT_ROOT" pull origin "$BRANCH"

# Install dependencies
log_info "Installing backend dependencies..."
cd "$PROJECT_ROOT/backend"
npm ci

log_info "Installing frontend dependencies..."
cd "$PROJECT_ROOT/frontend"
npm ci

# Run tests
log_info "Running backend tests..."
cd "$PROJECT_ROOT/backend"
npm run test || {
    log_error "Backend tests failed!"
    exit 1
}

# Build
log_info "Building backend..."
cd "$PROJECT_ROOT/backend"
npm run build

log_info "Building frontend..."
cd "$PROJECT_ROOT/frontend"
npm run build

# Deploy (Railway example)
log_info "Deploying to Railway staging..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    log_error "Railway CLI not installed. Install with: npm install -g @railway/cli"
    exit 1
fi

# Deploy backend
cd "$PROJECT_ROOT/backend"
railway up --environment staging --detach

# Deploy frontend
cd "$PROJECT_ROOT/frontend"
railway up --environment staging --detach

# Health check
log_info "Waiting for deployment to complete..."
sleep 30

log_info "Running health checks..."
"$PROJECT_ROOT/skills/vhm24-devops/scripts/health-check.sh" staging || {
    log_warn "Health check failed. Deployment may still be in progress."
}

echo ""
echo "=========================================="
log_info "Staging deployment complete!"
echo "=========================================="
echo ""
echo "URLs:"
echo "  API: https://api-staging.vendhub.uz"
echo "  App: https://app-staging.vendhub.uz"
echo ""
