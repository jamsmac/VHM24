#!/bin/bash
# ============================================================================
# VendHub Manager - Deployment Rollback Script
# ============================================================================
# Rolls back to a previous deployment version.
#
# Usage:
#   ./rollback.sh [VERSION]
#
# Examples:
#   ./rollback.sh                    # Rollback to previous version
#   ./rollback.sh sha-abc1234        # Rollback to specific version
#   ./rollback.sh v1.2.3             # Rollback to specific tag
# ============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Configuration
DEPLOY_PATH="${DEPLOY_PATH:-/opt/vendhub}"
DOCKER_REGISTRY="${DOCKER_REGISTRY:-}"
ROLLBACK_HISTORY_FILE="${DEPLOY_PATH}/.rollback_history"
MAX_HISTORY=10

# Get the current version
get_current_version() {
    docker inspect vendhub-backend:latest 2>/dev/null | jq -r '.[0].Config.Labels["org.opencontainers.image.version"]' || echo "unknown"
}

# Get previous versions from history
get_previous_version() {
    if [ -f "$ROLLBACK_HISTORY_FILE" ]; then
        tail -n 2 "$ROLLBACK_HISTORY_FILE" | head -n 1
    else
        echo ""
    fi
}

# Save version to history
save_to_history() {
    local version="$1"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    echo "$timestamp $version" >> "$ROLLBACK_HISTORY_FILE"

    # Keep only last N entries
    if [ -f "$ROLLBACK_HISTORY_FILE" ]; then
        tail -n "$MAX_HISTORY" "$ROLLBACK_HISTORY_FILE" > "${ROLLBACK_HISTORY_FILE}.tmp"
        mv "${ROLLBACK_HISTORY_FILE}.tmp" "$ROLLBACK_HISTORY_FILE"
    fi
}

# Show deployment history
show_history() {
    echo "============================================================================"
    echo "Deployment History"
    echo "============================================================================"

    if [ -f "$ROLLBACK_HISTORY_FILE" ]; then
        echo "Recent deployments:"
        cat "$ROLLBACK_HISTORY_FILE" | while read line; do
            echo "  $line"
        done
    else
        echo "No deployment history found."
    fi

    echo ""
    echo "Current version: $(get_current_version)"
    echo "============================================================================"
}

# Rollback to specific version
rollback() {
    local target_version="$1"

    log_info "Starting rollback to version: $target_version"
    log_info "Current version: $(get_current_version)"

    # Confirm rollback
    if [ -t 0 ]; then
        read -p "Are you sure you want to rollback to $target_version? (y/N) " confirm
        if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
            log_info "Rollback cancelled"
            exit 0
        fi
    fi

    cd "$DEPLOY_PATH"

    # Save current version to history before rollback
    save_to_history "$(get_current_version)"

    log_info "Step 1: Pulling target version images..."
    if [ -n "$DOCKER_REGISTRY" ]; then
        docker pull "${DOCKER_REGISTRY}/vendhub-backend:${target_version}" || {
            log_error "Failed to pull backend image for version $target_version"
            exit 1
        }
        docker pull "${DOCKER_REGISTRY}/vendhub-frontend:${target_version}" || {
            log_error "Failed to pull frontend image for version $target_version"
            exit 1
        }

        # Tag as latest for docker-compose
        docker tag "${DOCKER_REGISTRY}/vendhub-backend:${target_version}" vendhub-backend:latest
        docker tag "${DOCKER_REGISTRY}/vendhub-frontend:${target_version}" vendhub-frontend:latest
    fi

    log_info "Step 2: Stopping current services..."
    docker-compose stop backend frontend

    log_info "Step 3: Running database migration rollback (if needed)..."
    # Note: Only run if rolling back involves schema changes
    # docker-compose run --rm backend npm run migration:revert

    log_info "Step 4: Starting services with target version..."
    docker-compose up -d backend frontend

    log_info "Step 5: Waiting for services to start..."
    sleep 30

    log_info "Step 6: Running health check..."
    local health_check=$(curl -sf http://localhost:3000/health || echo "failed")

    if [ "$health_check" == "failed" ]; then
        log_error "Health check failed after rollback!"
        log_error "Services may be in an inconsistent state."
        log_error "Please investigate manually."
        exit 1
    fi

    log_info "Step 7: Verifying database status..."
    local db_status=$(curl -sf http://localhost:3000/health | jq -r '.info.database.status' || echo "unknown")

    if [ "$db_status" != "up" ]; then
        log_warn "Database status: $db_status (expected: up)"
    fi

    log_info "============================================================================"
    log_info "Rollback completed successfully!"
    log_info "Rolled back to version: $target_version"
    log_info "============================================================================"

    # Record rollback event
    save_to_history "$target_version (rollback)"
}

# Automatic rollback on deployment failure
auto_rollback() {
    local previous_version
    previous_version=$(get_previous_version)

    if [ -z "$previous_version" ]; then
        log_error "No previous version found in history. Cannot auto-rollback."
        exit 1
    fi

    log_warn "Initiating automatic rollback to: $previous_version"
    rollback "$previous_version"
}

# Main
main() {
    case "${1:-}" in
        --history|-h)
            show_history
            ;;
        --auto)
            auto_rollback
            ;;
        --help)
            echo "Usage: $0 [VERSION|--history|--auto|--help]"
            echo ""
            echo "Options:"
            echo "  VERSION     Rollback to specific version (e.g., sha-abc1234, v1.2.3)"
            echo "  --history   Show deployment history"
            echo "  --auto      Auto-rollback to previous version"
            echo "  --help      Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                    # Rollback to previous version"
            echo "  $0 sha-abc1234        # Rollback to specific version"
            echo "  $0 v1.2.3             # Rollback to specific tag"
            echo "  $0 --history          # Show deployment history"
            ;;
        "")
            # No version specified, rollback to previous
            local previous_version
            previous_version=$(get_previous_version)

            if [ -z "$previous_version" ]; then
                log_error "No previous version found. Please specify a version."
                exit 1
            fi

            rollback "$previous_version"
            ;;
        *)
            # Version specified
            rollback "$1"
            ;;
    esac
}

main "$@"
