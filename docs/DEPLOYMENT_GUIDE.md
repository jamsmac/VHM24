# VendHub Manager - Production Deployment Guide

Complete guide for deploying VendHub Manager to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Server Requirements](#server-requirements)
- [Initial Setup](#initial-setup)
- [Configuration](#configuration)
- [Deployment](#deployment)
- [Post-Deployment](#post-deployment)
- [Monitoring](#monitoring)
- [Maintenance](#maintenance)

## Prerequisites

### Required Software

- **Docker** >= 24.0
- **Docker Compose** >= 2.20
- **Git** >= 2.30
- **Node.js** >= 18 (for local development only)

### Required Access

- Server SSH access with sudo privileges
- Domain name with DNS access
- SSL certificate (Let's Encrypt or commercial)
- GitHub repository access
- Docker registry access (if using private registry)

## Server Requirements

### Minimum Requirements

| Component | CPU | RAM | Disk | Notes |
|-----------|-----|-----|------|-------|
| Application Server | 4 cores | 8 GB | 100 GB SSD | For API + Frontend + Workers |
| Database Server | 2 cores | 4 GB | 200 GB SSD | PostgreSQL + Redis |
| Storage Server | 2 cores | 2 GB | 500 GB | MinIO S3 |

### Recommended for Production

| Component | CPU | RAM | Disk | Notes |
|-----------|-----|-----|------|-------|
| Application Server | 8 cores | 16 GB | 200 GB SSD | Better performance |
| Database Server | 4 cores | 8 GB | 500 GB SSD | Handles more connections |
| Storage Server | 4 cores | 4 GB | 1 TB | More concurrent uploads |

### Operating System

- **Ubuntu 22.04 LTS** (recommended)
- Ubuntu 20.04 LTS
- Debian 11/12
- Rocky Linux 9

## Initial Setup

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  git \
  htop \
  vim

# Configure firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 2. Install Docker

```bash
# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Enable Docker service
sudo systemctl enable docker
sudo systemctl start docker

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

### 3. Clone Repository

```bash
# Clone to /opt/vendhub
sudo mkdir -p /opt
cd /opt
sudo git clone https://github.com/your-org/vendhub.git vendhub
sudo chown -R $USER:$USER /opt/vendhub
cd /opt/vendhub
```

## Configuration

### 1. Environment Variables

```bash
# Create production environment file
cp .env.production.example .env.production

# Edit with your values
vim .env.production
```

**Required Variables:**

```bash
# Application
NODE_ENV=production
VERSION=1.0.0

# Database
DATABASE_NAME=vendhub
DATABASE_USER=vendhub
DATABASE_PASSWORD=CHANGE_ME_STRONG_PASSWORD_HERE
DATABASE_HOST=postgres
DATABASE_PORT=5432

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_ME_STRONG_PASSWORD_HERE

# JWT
JWT_SECRET=CHANGE_ME_STRONG_SECRET_KEY_AT_LEAST_32_CHARACTERS
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Storage
S3_ENDPOINT=http://minio:9000
S3_BUCKET=vendhub
S3_ACCESS_KEY=CHANGE_ME_ACCESS_KEY
S3_SECRET_KEY=CHANGE_ME_SECRET_KEY

# Telegram
TELEGRAM_BOT_TOKEN=CHANGE_ME_GET_FROM_BOTFATHER

# Frontend
NEXT_PUBLIC_API_URL=https://your-domain.com/api/v1
NEXT_PUBLIC_WS_URL=https://your-domain.com
FRONTEND_URL=https://your-domain.com

# Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=CHANGE_ME_STRONG_PASSWORD_HERE
GRAFANA_ROOT_URL=https://your-domain.com/grafana
```

### 2. SSL Certificates

#### Using Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot

# Obtain certificate
sudo certbot certonly --standalone \
  -d your-domain.com \
  -d www.your-domain.com \
  --email admin@your-domain.com \
  --agree-tos

# Copy certificates
sudo mkdir -p /opt/vendhub/nginx/ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/vendhub/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/vendhub/nginx/ssl/key.pem
sudo chown -R $USER:$USER /opt/vendhub/nginx/ssl

# Set up auto-renewal
sudo crontab -e
# Add: 0 3 * * * certbot renew --quiet && cp /etc/letsencrypt/live/your-domain.com/*.pem /opt/vendhub/nginx/ssl/
```

### 3. Nginx Configuration

Edit `/opt/vendhub/nginx/conf.d/vendhub.conf`:

```nginx
# Uncomment SSL configuration
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # ... rest of configuration
}
```

## Deployment

### 1. Build Images

```bash
cd /opt/vendhub

# Build backend image
docker build -t vendhub-backend:latest ./backend

# Build frontend image
docker build -t vendhub-frontend:latest \
  --build-arg NEXT_PUBLIC_API_URL=https://your-domain.com/api/v1 \
  --build-arg NEXT_PUBLIC_WS_URL=https://your-domain.com \
  ./frontend
```

### 2. Initialize Database

```bash
# Start only database services
docker compose -f docker-compose.prod.yml up -d postgres redis minio

# Wait for services to be healthy
docker compose -f docker-compose.prod.yml ps

# Run migrations
docker compose -f docker-compose.prod.yml run --rm backend npm run migration:run

# Seed initial data (if needed)
docker compose -f docker-compose.prod.yml run --rm backend npm run seed
```

### 3. Start All Services

```bash
# Start all services
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### 4. Verify Deployment

```bash
# Check health endpoints
curl https://your-domain.com/health
curl https://your-domain.com/health/ready
curl https://your-domain.com/health/queues

# Check API
curl https://your-domain.com/api/v1/health

# Check frontend
curl https://your-domain.com

# Check Grafana
curl https://your-domain.com/grafana
```

## Post-Deployment

### 1. Create Admin User

```bash
# Access backend container
docker compose -f docker-compose.prod.yml exec backend sh

# Run admin creation script
npm run create:admin -- \
  --email admin@vendhub.com \
  --password SecurePassword123 \
  --name "System Administrator"

# Exit container
exit
```

### 2. Configure Monitoring

Access Grafana at `https://your-domain.com/grafana`:

1. Login with admin credentials
2. Verify Prometheus datasource is working
3. Import VendHub dashboard
4. Set up alert notifications

### 3. Configure Backups

```bash
# Create backup configuration
sudo mkdir -p /etc/vendhub
sudo cp /opt/vendhub/.env.production /etc/vendhub/backup.env

# Make scripts executable
chmod +x /opt/vendhub/scripts/backup/*.sh

# Set up automated backups
sudo cp /opt/vendhub/scripts/backup/vendhub-backup.cron /etc/cron.d/vendhub-backup

# Verify cron
sudo service cron status
```

### 4. Test Backup/Restore

```bash
# Run manual backup
/opt/vendhub/scripts/backup/backup-all.sh

# Verify backup files
ls -lh /var/backups/vendhub/

# Test restore (to test database)
DATABASE_NAME=vendhub_test \
  /opt/vendhub/scripts/backup/restore-database.sh \
  /var/backups/vendhub/vendhub_db_*.sql.gz
```

## Monitoring

### Access Monitoring Tools

| Tool | URL | Purpose |
|------|-----|---------|
| Application | https://your-domain.com | Main application |
| API Docs | https://your-domain.com/api/v1/docs | Swagger API documentation |
| Grafana | https://your-domain.com/grafana | Metrics and dashboards |
| Prometheus | http://server-ip:9090 | Raw metrics (local only) |
| Bull Board | https://your-domain.com/admin/queues | Queue monitoring |

### Key Metrics to Monitor

1. **System Health**
   - All services running
   - No critical alerts in Prometheus
   - Queue depths normal

2. **Performance**
   - API response times < 500ms (p95)
   - Database connections < 50
   - Memory usage < 80%

3. **Queue Health**
   - Waiting jobs < 100
   - Failed jobs < 10/hour
   - Processing rate > 10/minute

## Maintenance

### Daily Tasks

```bash
# Check logs for errors
docker compose -f docker-compose.prod.yml logs --tail=100 backend

# Check queue health
curl https://your-domain.com/health/queues

# Check disk space
df -h
```

### Weekly Tasks

```bash
# Review Grafana dashboards
# Check backup integrity
# Review error logs
# Update security patches
sudo apt update && sudo apt upgrade -y
```

### Monthly Tasks

```bash
# Review performance metrics
# Optimize database
docker compose exec postgres vacuumdb -U vendhub -d vendhub --analyze

# Clean up old Docker images
docker system prune -a

# Test disaster recovery procedure
```

### Updating the Application

```bash
cd /opt/vendhub

# Pull latest changes
git pull origin main

# Rebuild images
docker compose -f docker-compose.prod.yml build

# Run migrations
docker compose -f docker-compose.prod.yml run --rm backend npm run migration:run

# Restart services with zero downtime
docker compose -f docker-compose.prod.yml up -d --no-deps --build backend
docker compose -f docker-compose.prod.yml up -d --no-deps --build frontend

# Verify update
curl https://your-domain.com/health
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs backend

# Check environment variables
docker compose -f docker-compose.prod.yml config

# Restart service
docker compose -f docker-compose.prod.yml restart backend
```

### Database Connection Issues

```bash
# Check database is running
docker compose -f docker-compose.prod.yml ps postgres

# Check database logs
docker compose -f docker-compose.prod.yml logs postgres

# Test connection
docker compose exec postgres psql -U vendhub -c "SELECT 1"
```

### High Memory Usage

```bash
# Check resource usage
docker stats

# Restart workers
docker compose -f docker-compose.prod.yml restart commission-worker job-scheduler

# If needed, adjust limits in docker-compose.prod.yml
```

### Queue Backlog

```bash
# Check queue status
curl https://your-domain.com/health/queues

# Scale workers
docker compose -f docker-compose.prod.yml up -d --scale commission-worker=4

# Clear failed jobs (if appropriate)
docker compose exec redis redis-cli KEYS "bull:commission-calculations:failed"
```

## Security Checklist

- [ ] All default passwords changed
- [ ] SSL/TLS certificates installed and valid
- [ ] Firewall configured properly
- [ ] Database backups automated
- [ ] Off-site backup configured
- [ ] Monitoring and alerting configured
- [ ] Log rotation configured
- [ ] Security updates automated
- [ ] Access logs reviewed regularly
- [ ] Secrets stored securely (not in git)

## Support

- **Documentation**: https://docs.vendhub.com
- **Issues**: https://github.com/your-org/vendhub/issues
- **Email**: support@vendhub.com
- **Emergency**: +998 XX XXX XX XX

---

Last Updated: 2025-01-15
Version: 1.0
