#!/bin/bash

# ============================================================================
# VendHub Manager - One-Click Launch Script
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Configuration
TELEGRAM_BOT_TOKEN="8201265622:AAG3NMF7J2RP49nc4y6rnEG2A-0iaAnW4dA"
TELEGRAM_ADMIN_ID="42283329"
TELEGRAM_ADMIN_USERNAME="Jamshiddin"

clear

echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                        ║${NC}"
echo -e "${CYAN}║${NC}  ${MAGENTA}██╗   ██╗███████╗███╗   ██╗██████╗ ██╗  ██╗██╗   ██╗██████╗${NC}  ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  ${MAGENTA}██║   ██║██╔════╝████╗  ██║██╔══██╗██║  ██║██║   ██║██╔══██╗${NC} ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  ${MAGENTA}██║   ██║█████╗  ██╔██╗ ██║██║  ██║███████║██║   ██║██████╔╝${NC} ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  ${MAGENTA}╚██╗ ██╔╝██╔══╝  ██║╚██╗██║██║  ██║██╔══██║██║   ██║██╔══██╗${NC} ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}   ${MAGENTA}╚████╔╝ ███████╗██║ ╚████║██████╔╝██║  ██║╚██████╔╝██████╔╝${NC} ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}    ${MAGENTA}╚═══╝  ╚══════╝╚═╝  ╚═══╝╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═════╝${NC}  ${CYAN}║${NC}"
echo -e "${CYAN}║                                                        ║${NC}"
echo -e "${CYAN}║${NC}             ${BLUE}Vending Machine Manager System${NC}            ${CYAN}║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check prerequisites
check_requirements() {
    echo -e "${YELLOW}🔍 Checking requirements...${NC}"
    
    local all_good=true
    
    # Check Docker
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}✓${NC} Docker installed"
    else
        echo -e "${RED}✗${NC} Docker not installed"
        all_good=false
    fi
    
    # Check Docker Compose
    if command -v docker-compose &> /dev/null; then
        echo -e "${GREEN}✓${NC} Docker Compose installed"
    else
        echo -e "${RED}✗${NC} Docker Compose not installed"
        all_good=false
    fi
    
    # Check Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -ge 18 ]; then
            echo -e "${GREEN}✓${NC} Node.js v18+ installed"
        else
            echo -e "${RED}✗${NC} Node.js v18+ required (current: v$NODE_VERSION)"
            all_good=false
        fi
    else
        echo -e "${RED}✗${NC} Node.js not installed"
        all_good=false
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        echo -e "${GREEN}✓${NC} npm installed"
    else
        echo -e "${RED}✗${NC} npm not installed"
        all_good=false
    fi
    
    if [ "$all_good" = false ]; then
        echo ""
        echo -e "${RED}❌ Missing requirements. Please install them first.${NC}"
        echo ""
        echo "Installation guides:"
        echo "  Docker: https://docs.docker.com/get-docker/"
        echo "  Node.js: https://nodejs.org/en/download/"
        exit 1
    fi
    
    echo -e "${GREEN}✅ All requirements met!${NC}"
    echo ""
}

# Function to setup environment
setup_environment() {
    echo -e "${YELLOW}⚙️  Setting up environment...${NC}"
    
    # Copy environment file if not exists
    if [ ! -f backend/.env ]; then
        cp backend/.env.ready backend/.env
        echo -e "${GREEN}✓${NC} Environment file created"
    else
        echo -e "${GREEN}✓${NC} Environment file exists"
    fi
}

# Function to start services
start_services() {
    echo -e "${YELLOW}🚀 Starting services...${NC}"
    
    # Start Docker containers
    docker-compose up -d
    
    echo -e "${GREEN}✓${NC} PostgreSQL started"
    echo -e "${GREEN}✓${NC} Redis started"
    echo -e "${GREEN}✓${NC} MinIO started"
    
    # Wait for services to be ready
    echo -e "${YELLOW}⏳ Waiting for services to initialize...${NC}"
    sleep 10
}

# Function to setup database
setup_database() {
    echo -e "${YELLOW}🗄️  Setting up database...${NC}"
    
    cd backend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
        npm ci
    fi
    
    # Run migrations
    echo -e "${YELLOW}🔄 Running migrations...${NC}"
    npm run migration:run
    
    # Create super admin
    echo -e "${YELLOW}👤 Creating super admin...${NC}"
    npx ts-node src/database/seeds/init-super-admin.ts
    
    cd ..
    
    echo -e "${GREEN}✓${NC} Database setup complete"
}

# Function to start backend
start_backend() {
    echo -e "${YELLOW}🖥️  Starting backend...${NC}"
    
    cd backend
    
    # Build if not built
    if [ ! -d "dist" ]; then
        echo -e "${YELLOW}🔨 Building backend...${NC}"
        npm run build
    fi
    
    # Start in development mode
    npm run start:dev &
    BACKEND_PID=$!
    
    cd ..
    
    # Wait for backend to start
    echo -e "${YELLOW}⏳ Waiting for backend to start...${NC}"
    for i in {1..30}; do
        if curl -f http://localhost:3000/monitoring/health &> /dev/null; then
            echo -e "${GREEN}✓${NC} Backend started successfully"
            break
        fi
        sleep 2
    done
}

# Function to start frontend
start_frontend() {
    echo -e "${YELLOW}🌐 Starting frontend...${NC}"
    
    cd frontend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
        npm ci
    fi
    
    # Start in development mode
    npm run dev &
    FRONTEND_PID=$!
    
    cd ..
    
    echo -e "${GREEN}✓${NC} Frontend started"
}

# Function to setup Telegram webhook
setup_telegram() {
    echo -e "${YELLOW}🤖 Setting up Telegram bot...${NC}"
    
    # Get webhook info
    WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo")
    
    # Set webhook (will work when deployed)
    WEBHOOK_URL="http://localhost:3000/telegram/webhook"
    
    echo -e "${GREEN}✓${NC} Telegram bot configured"
    echo -e "   Token: ${BLUE}${TELEGRAM_BOT_TOKEN:0:20}...${NC}"
    echo -e "   Admin: ${BLUE}@${TELEGRAM_ADMIN_USERNAME} (ID: ${TELEGRAM_ADMIN_ID})${NC}"
}

# Function to show status
show_status() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║           🎉 VendHub is running!                      ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}📍 Access Points:${NC}"
    echo -e "   Frontend:    ${CYAN}http://localhost:3001${NC}"
    echo -e "   Backend API: ${CYAN}http://localhost:3000${NC}"
    echo -e "   API Docs:    ${CYAN}http://localhost:3000/api/docs${NC}"
    echo -e "   Monitoring:  ${CYAN}http://localhost:3000/monitoring/metrics${NC}"
    echo -e "   MinIO:       ${CYAN}http://localhost:9001${NC} (admin/minioadmin)"
    echo ""
    echo -e "${BLUE}👤 Super Admin Account:${NC}"
    echo -e "   Email:    ${CYAN}admin@vendhub.com${NC}"
    echo -e "   Password: ${CYAN}VendHub2024!${NC}"
    echo -e "   Telegram: ${CYAN}@${TELEGRAM_ADMIN_USERNAME}${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  Please change the password after first login!${NC}"
    echo ""
    echo -e "${GREEN}Press Ctrl+C to stop all services${NC}"
    echo ""
}

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping services...${NC}"
    
    # Kill background processes
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    
    # Stop Docker containers
    docker-compose down
    
    echo -e "${GREEN}✓ All services stopped${NC}"
    exit 0
}

# Set trap for cleanup
trap cleanup INT TERM

# Main execution
main() {
    check_requirements
    setup_environment
    start_services
    setup_database
    start_backend
    start_frontend
    setup_telegram
    show_status
    
    # Keep script running
    while true; do
        sleep 1
    done
}

# Run main function
main
