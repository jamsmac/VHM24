#!/bin/bash

#===============================================================================
# VendHub PgBouncer Setup Script
#===============================================================================
#
# This script installs and configures PgBouncer connection pooler for
# production PostgreSQL deployments.
#
# What PgBouncer does:
# - Reduces connection overhead (10MB per connection saved)
# - Handles 1000+ client connections with only 20-30 PostgreSQL connections
# - Improves performance and scalability
# - Prevents "too many connections" errors
#
# Usage:
#   sudo ./setup-pgbouncer.sh
#
# Prerequisites:
#   - PostgreSQL installed and running
#   - Root/sudo access
#   - Valid DATABASE credentials
#
# After installation:
#   - PgBouncer listens on port 6432
#   - Update app DATABASE_URL to use port 6432 instead of 5432
#
#===============================================================================

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Paths
PGBOUNCER_CONF_DIR="/etc/pgbouncer"
PGBOUNCER_CONF="${PGBOUNCER_CONF_DIR}/pgbouncer.ini"
PGBOUNCER_USERLIST="${PGBOUNCER_CONF_DIR}/userlist.txt"
PGBOUNCER_LOG_DIR="/var/log/postgresql"
PGBOUNCER_RUN_DIR="/var/run/postgresql"

# ============================================================================
# Functions
# ============================================================================

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

check_root() {
    if [ "$EUID" -ne 0 ]; then
        error "This script must be run as root (use sudo)"
        exit 1
    fi
}

detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
    else
        error "Cannot detect OS"
        exit 1
    fi

    log "Detected OS: $OS"
}

install_pgbouncer() {
    log "Installing PgBouncer..."

    case $OS in
        ubuntu|debian)
            apt update
            apt install -y pgbouncer
            ;;
        centos|rhel|fedora)
            yum install -y pgbouncer
            ;;
        *)
            error "Unsupported OS: $OS"
            exit 1
            ;;
    esac

    log "PgBouncer installed ✓"
}

create_directories() {
    log "Creating directories..."

    mkdir -p "$PGBOUNCER_CONF_DIR"
    mkdir -p "$PGBOUNCER_LOG_DIR"
    mkdir -p "$PGBOUNCER_RUN_DIR"

    # Set ownership
    chown -R postgres:postgres "$PGBOUNCER_CONF_DIR"
    chown -R postgres:postgres "$PGBOUNCER_LOG_DIR"
    chown -R postgres:postgres "$PGBOUNCER_RUN_DIR"

    log "Directories created ✓"
}

copy_config() {
    log "Copying PgBouncer configuration..."

    # Get script directory (where this script is located)
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    CONFIG_SOURCE="${SCRIPT_DIR}/../../config/pgbouncer.ini"

    if [ -f "$CONFIG_SOURCE" ]; then
        cp "$CONFIG_SOURCE" "$PGBOUNCER_CONF"
        log "Configuration copied from $CONFIG_SOURCE ✓"
    else
        error "Configuration file not found: $CONFIG_SOURCE"
        exit 1
    fi

    # Set permissions
    chmod 640 "$PGBOUNCER_CONF"
    chown postgres:postgres "$PGBOUNCER_CONF"

    log "Configuration installed ✓"
}

create_userlist() {
    log "Creating userlist.txt..."

    # Prompt for database credentials
    read -p "Enter PostgreSQL username [postgres]: " DB_USER
    DB_USER=${DB_USER:-postgres}

    read -sp "Enter PostgreSQL password: " DB_PASS
    echo ""

    if [ -z "$DB_PASS" ]; then
        error "Password cannot be empty"
        exit 1
    fi

    # Generate MD5 hash for userlist
    # Format: "username" "md5" + md5(password + username)
    MD5_HASH=$(echo -n "${DB_PASS}${DB_USER}" | md5sum | cut -d' ' -f1)

    # Create userlist.txt
    cat > "$PGBOUNCER_USERLIST" <<EOF
;; VendHub PgBouncer User List
;; Format: "username" "password"
;; Password can be in plaintext or MD5: md5<md5(password+username)>

"${DB_USER}" "md5${MD5_HASH}"
EOF

    # Set permissions (only postgres user can read)
    chmod 600 "$PGBOUNCER_USERLIST"
    chown postgres:postgres "$PGBOUNCER_USERLIST"

    log "Userlist created ✓"
}

create_systemd_service() {
    log "Creating systemd service..."

    cat > /etc/systemd/system/pgbouncer.service <<'EOF'
[Unit]
Description=PgBouncer PostgreSQL Connection Pooler
Documentation=man:pgbouncer(1)
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=forking
User=postgres
Group=postgres

# Configuration files
Environment=CONFFILE=/etc/pgbouncer/pgbouncer.ini

# Start command
ExecStart=/usr/bin/pgbouncer -d ${CONFFILE}

# Reload command
ExecReload=/bin/kill -HUP $MAINPID

# Stop command
KillSignal=SIGINT
KillMode=mixed

# Restart policy
Restart=on-failure
RestartSec=5s

# Security hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log/postgresql /var/run/postgresql

# Resource limits
LimitNOFILE=65536
LimitNPROC=65536

[Install]
WantedBy=multi-user.target
EOF

    # Reload systemd
    systemctl daemon-reload

    log "Systemd service created ✓"
}

test_configuration() {
    log "Testing PgBouncer configuration..."

    # Test config file syntax
    if sudo -u postgres pgbouncer -R "$PGBOUNCER_CONF"; then
        log "Configuration test passed ✓"
    else
        error "Configuration test failed"
        exit 1
    fi
}

start_pgbouncer() {
    log "Starting PgBouncer..."

    systemctl enable pgbouncer
    systemctl start pgbouncer

    # Wait a moment for startup
    sleep 2

    # Check status
    if systemctl is-active --quiet pgbouncer; then
        log "PgBouncer started successfully ✓"
    else
        error "PgBouncer failed to start"
        systemctl status pgbouncer
        exit 1
    fi
}

verify_connection() {
    log "Verifying PgBouncer connection..."

    # Test connection via PgBouncer
    if psql -h localhost -p 6432 -U postgres -c "SELECT 1" &>/dev/null; then
        log "Connection test passed ✓"
    else
        warning "Connection test failed - check credentials and PostgreSQL status"
    fi
}

print_summary() {
    log ""
    log "════════════════════════════════════════════════════════════════"
    log "PgBouncer Installation Complete!"
    log "════════════════════════════════════════════════════════════════"
    log ""
    info "Configuration:"
    info "  Config file:    $PGBOUNCER_CONF"
    info "  User list:      $PGBOUNCER_USERLIST"
    info "  Log file:       ${PGBOUNCER_LOG_DIR}/pgbouncer.log"
    log ""
    info "Service:"
    info "  Status:         systemctl status pgbouncer"
    info "  Start:          systemctl start pgbouncer"
    info "  Stop:           systemctl stop pgbouncer"
    info "  Restart:        systemctl restart pgbouncer"
    info "  Logs:           journalctl -u pgbouncer -f"
    log ""
    info "Connection:"
    info "  PgBouncer port: 6432"
    info "  PostgreSQL:     5432"
    log ""
    warning "Update your application DATABASE_URL:"
    info "  Before: postgresql://user:pass@localhost:5432/vendhub"
    info "  After:  postgresql://user:pass@localhost:6432/vendhub"
    log ""
    info "Admin commands (psql -p 6432 pgbouncer):"
    info "  SHOW POOLS;       # Show connection pools"
    info "  SHOW STATS;       # Show statistics"
    info "  SHOW CLIENTS;     # Show client connections"
    info "  SHOW SERVERS;     # Show server connections"
    info "  RELOAD;           # Reload configuration"
    log ""
    log "════════════════════════════════════════════════════════════════"
}

# ============================================================================
# Main Script
# ============================================================================

main() {
    log "════════════════════════════════════════════════════════════════"
    log "VendHub PgBouncer Setup"
    log "════════════════════════════════════════════════════════════════"
    log ""

    check_root
    detect_os

    # Check if PgBouncer is already installed
    if command -v pgbouncer &>/dev/null; then
        warning "PgBouncer is already installed"
        read -p "Continue with configuration? [y/N]: " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 0
        fi
    else
        install_pgbouncer
    fi

    create_directories
    copy_config
    create_userlist
    create_systemd_service
    test_configuration
    start_pgbouncer
    verify_connection
    print_summary
}

main "$@"
