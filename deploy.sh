#!/bin/bash

# ============================================================================
# VendHub Manager - Production Deployment Script
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_TYPE=${1:-"docker"} # docker, railway, vercel, render

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   VendHub Manager - Production Deploy${NC}"
echo -e "${BLUE}============================================${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to generate secure random string
generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-40
}

# Function to check environment
check_environment() {
    echo -e "${YELLOW}Checking environment...${NC}"
    
    # Check required tools
    local required_tools=("git" "node" "npm" "docker")
    for tool in "${required_tools[@]}"; do
        if command_exists "$tool"; then
            echo -e "${GREEN}✓${NC} $tool is installed"
        else
            echo -e "${RED}✗${NC} $tool is not installed"
            exit 1
        fi
    done
    
    # Check Node version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        echo -e "${GREEN}✓${NC} Node.js version is 18+"
    else
        echo -e "${RED}✗${NC} Node.js version must be 18+"
        exit 1
    fi
}

# Function to setup environment variables
setup_environment() {
    echo -e "${YELLOW}Setting up environment variables...${NC}"
    
    if [ ! -f .env.production ]; then
        echo -e "${YELLOW}Creating .env.production file...${NC}"
        
        # Generate secrets
        JWT_SECRET=$(generate_secret)
        SESSION_SECRET=$(generate_secret)
        DB_PASSWORD=$(generate_secret)
        REDIS_PASSWORD=$(generate_secret)
        MINIO_PASSWORD=$(generate_secret)
        
        cat > .env.production << EOL
# Auto-generated secrets (CHANGE IN PRODUCTION!)
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET
DB_PASSWORD=$DB_PASSWORD
REDIS_PASSWORD=$REDIS_PASSWORD
MINIO_ROOT_USER=vendhub
MINIO_ROOT_PASSWORD=$MINIO_PASSWORD
GRAFANA_USER=admin
GRAFANA_PASSWORD=$MINIO_PASSWORD

# Add your configuration here
DATABASE_URL=postgresql://vendhub:$DB_PASSWORD@localhost:5432/vendhub
REDIS_URL=redis://default:$REDIS_PASSWORD@localhost:6379
FRONTEND_URL=https://vendhub.com
EOL
        
        echo -e "${GREEN}✓${NC} Environment file created"
        echo -e "${YELLOW}⚠${NC} Please update .env.production with your actual values"
    else
        echo -e "${GREEN}✓${NC} Environment file exists"
    fi
}

# Function to build backend
build_backend() {
    echo -e "${YELLOW}Building backend...${NC}"
    cd backend
    
    # Install dependencies
    npm ci
    
    # Run migrations
    echo -e "${YELLOW}Running database migrations...${NC}"
    npm run migration:run
    
    # Build application
    npm run build
    
    cd ..
    echo -e "${GREEN}✓${NC} Backend built successfully"
}

# Function to build frontend
build_frontend() {
    echo -e "${YELLOW}Building frontend...${NC}"
    cd frontend
    
    # Install dependencies
    npm ci
    
    # Build application
    npm run build
    
    cd ..
    echo -e "${GREEN}✓${NC} Frontend built successfully"
}

# Function to deploy with Docker
deploy_docker() {
    echo -e "${BLUE}Deploying with Docker...${NC}"
    
    # Build images
    docker-compose -f docker-compose.production.yml build
    
    # Start services
    docker-compose -f docker-compose.production.yml up -d
    
    echo -e "${GREEN}✓${NC} Docker deployment complete"
    echo -e "${BLUE}Services available at:${NC}"
    echo "  - API: http://localhost:3000"
    echo "  - Frontend: http://localhost:3001"
    echo "  - MinIO Console: http://localhost:9001"
    echo "  - Prometheus: http://localhost:9090"
    echo "  - Grafana: http://localhost:3002"
}

# Function to deploy to Railway
deploy_railway() {
    echo -e "${BLUE}Deploying to Railway...${NC}"
    
    if ! command_exists "railway"; then
        echo -e "${YELLOW}Installing Railway CLI...${NC}"
        npm i -g @railway/cli
    fi
    
    # Login to Railway
    railway login
    
    # Deploy backend
    cd backend
    railway up
    cd ..
    
    echo -e "${GREEN}✓${NC} Railway deployment complete"
}

# Function to deploy to Vercel
deploy_vercel() {
    echo -e "${BLUE}Deploying frontend to Vercel...${NC}"
    
    if ! command_exists "vercel"; then
        echo -e "${YELLOW}Installing Vercel CLI...${NC}"
        npm i -g vercel
    fi
    
    # Deploy frontend
    cd frontend
    vercel --prod
    cd ..
    
    echo -e "${GREEN}✓${NC} Vercel deployment complete"
}

# Function to deploy to Render
deploy_render() {
    echo -e "${BLUE}Deploying to Render...${NC}"
    
    # Create render.yaml if it doesn't exist
    if [ ! -f render.yaml ]; then
        cat > render.yaml << 'YAML'
services:
  - type: web
    name: vendhub-backend
    env: node
    buildCommand: cd backend && npm ci && npm run build
    startCommand: cd backend && npm run start:prod
    healthCheckPath: /monitoring/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: vendhub-db
          property: connectionString

  - type: web
    name: vendhub-frontend
    env: node
    buildCommand: cd frontend && npm ci && npm run build
    startCommand: cd frontend && npm start
    
databases:
  - name: vendhub-db
    databaseName: vendhub
    user: vendhub
YAML
    fi
    
    echo -e "${YELLOW}Please push to GitHub and connect to Render.com${NC}"
    echo "Visit: https://render.com/deploy"
}

# Function to run health checks
health_check() {
    echo -e "${YELLOW}Running health checks...${NC}"
    
    # Wait for services to start
    sleep 10
    
    # Check backend health
    if curl -f http://localhost:3000/monitoring/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Backend is healthy"
    else
        echo -e "${RED}✗${NC} Backend health check failed"
    fi
    
    # Check frontend
    if curl -f http://localhost:3001 > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Frontend is accessible"
    else
        echo -e "${RED}✗${NC} Frontend check failed"
    fi
}

# Main deployment flow
main() {
    check_environment
    setup_environment
    
    # Build applications
    build_backend
    build_frontend
    
    # Deploy based on type
    case "$DEPLOYMENT_TYPE" in
        docker)
            deploy_docker
            health_check
            ;;
        railway)
            deploy_railway
            ;;
        vercel)
            deploy_vercel
            ;;
        render)
            deploy_render
            ;;
        *)
            echo -e "${RED}Unknown deployment type: $DEPLOYMENT_TYPE${NC}"
            echo "Usage: ./deploy.sh [docker|railway|vercel|render]"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}   Deployment Complete!${NC}"
    echo -e "${GREEN}============================================${NC}"
    
    # Show next steps
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Update environment variables in .env.production"
    echo "2. Configure your domain DNS"
    echo "3. Setup SSL certificates"
    echo "4. Configure monitoring alerts"
    echo "5. Setup backup strategy"
}

# Run main function
main
