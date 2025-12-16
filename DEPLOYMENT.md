# VendHub Manager Deployment Guide

> **Last Updated**: 2025-12-14
> **Version**: 1.0.0
> **Target Environment**: Production

This document provides comprehensive deployment procedures for VendHub Manager.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Environment Configuration](#environment-configuration)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Manual Deployment](#manual-deployment)
6. [Docker Deployment](#docker-deployment)
7. [Database Management](#database-management)
8. [Monitoring Setup](#monitoring-setup)
9. [Rollback Procedures](#rollback-procedures)
10. [Health Checks](#health-checks)

---

## Prerequisites

### Infrastructure Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Storage | 50 GB SSD | 100 GB SSD |
| Node.js | 20.x | 22.x |
| PostgreSQL | 14 | 16 |
| Redis | 7.x | 7.x |

### Required Software

```bash
# On deployment server
node --version     # >= 20.0.0
npm --version      # >= 10.0.0
docker --version   # >= 24.0.0
docker-compose --version  # >= 2.20.0
psql --version     # >= 14
redis-cli --version # >= 7.0
```

### Network Requirements

| Port | Service | Access |
|------|---------|--------|
| 3000 | Backend API | Internal/Load Balancer |
| 3001 | Frontend | Internal/Load Balancer |
| 5432 | PostgreSQL | Internal only |
| 6379 | Redis | Internal only |
| 9090 | Prometheus | Internal only |
| 3000 | Grafana | Internal/VPN |
| 9000 | MinIO | Internal only |

---

## Architecture Overview

### Production Stack

```
                    ┌──────────────────┐
                    │   Load Balancer  │
                    │   (nginx/ALB)    │
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
      ┌───────▼───────┐            ┌────────▼────────┐
      │   Frontend    │            │    Backend      │
      │  (Next.js)    │            │   (NestJS)      │
      │   Port 3001   │            │   Port 3000     │
      └───────────────┘            └────────┬────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
            ┌───────▼───────┐      ┌────────▼────────┐     ┌────────▼────────┐
            │  PostgreSQL   │      │     Redis       │     │     MinIO       │
            │   Port 5432   │      │   Port 6379     │     │   Port 9000     │
            └───────────────┘      └─────────────────┘     └─────────────────┘
```

### Service Dependencies

```
Backend depends on:
├── PostgreSQL (required)
├── Redis (required for sessions/cache)
└── MinIO/S3 (required for file storage)

Frontend depends on:
└── Backend API (required)

Monitoring depends on:
├── Prometheus (metrics collection)
├── Grafana (visualization)
└── Backend /metrics endpoint
```

---

## Environment Configuration

### Backend Environment Variables

Create `backend/.env.production`:

```bash
# Application
NODE_ENV=production
PORT=3000
API_PREFIX=api
API_VERSION=v1

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=vendhub_prod
DATABASE_USERNAME=vendhub
DATABASE_PASSWORD=<strong-password>
DATABASE_SSL=true
DATABASE_POOL_SIZE=20

# JWT
JWT_SECRET=<64-char-random-string>
JWT_ACCESS_TOKEN_EXPIRATION=15m
JWT_REFRESH_TOKEN_EXPIRATION=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=<redis-password>

# File Storage (S3/MinIO)
S3_ENDPOINT=https://s3.your-domain.com
S3_BUCKET=vendhub-files
S3_ACCESS_KEY=<access-key>
S3_SECRET_KEY=<secret-key>
S3_REGION=us-east-1

# CORS
CORS_ORIGINS=https://app.vendhub.com

# Rate Limiting
RATE_LIMIT_TTL=60000
RATE_LIMIT_LIMIT=100

# Telegram Bot (optional)
TELEGRAM_BOT_TOKEN=<bot-token>

# Web Push (optional)
VAPID_PUBLIC_KEY=<public-key>
VAPID_PRIVATE_KEY=<private-key>
VAPID_EMAIL=admin@vendhub.com

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090

# Initial Admin Password (for seed)
INITIAL_ADMIN_PASSWORD=<strong-password>
```

### Frontend Environment Variables

Create `frontend/.env.production`:

```bash
NEXT_PUBLIC_API_URL=https://api.vendhub.com
NEXT_PUBLIC_WS_URL=wss://api.vendhub.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<vapid-public-key>
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

The CI/CD pipeline is configured in `.github/workflows/`:

#### CI Workflow (`ci.yml`)

Triggers: Push to main/develop, Pull Requests

```yaml
Jobs:
1. Lint & Type Check
   - npm run lint
   - npx tsc --noEmit

2. Test
   - npm run test
   - npm run test:cov
   - Upload coverage to Codecov

3. Build
   - npm run build
   - Build verification
```

#### CD Workflow (`deploy.yml`)

Triggers: Push to main branch (after CI passes)

```yaml
Jobs:
1. Deploy to Staging
   - SSH to staging server
   - Pull latest code
   - Install dependencies
   - Run migrations
   - Restart services
   - Run smoke tests

2. Deploy to Production (manual approval)
   - SSH to production server
   - Create backup
   - Pull latest code
   - Install dependencies
   - Run migrations
   - Restart services
   - Verify health
   - Rollback if failed
```

### Required GitHub Secrets

```
STAGING_DEPLOY_KEY         # SSH private key
STAGING_DEPLOY_HOST        # staging.vendhub.com
STAGING_DEPLOY_USER        # deploy
STAGING_DEPLOY_PATH        # /opt/vendhub

PROD_DEPLOY_KEY            # SSH private key
PROD_DEPLOY_HOST           # api.vendhub.com
PROD_DEPLOY_USER           # deploy
PROD_DEPLOY_PATH           # /opt/vendhub

TELEGRAM_BOT_TOKEN         # For notifications
TELEGRAM_CHAT_ID           # For notifications
```

---

## Manual Deployment

### First-Time Setup

```bash
# 1. Clone repository
git clone https://github.com/your-org/vendhub.git /opt/vendhub
cd /opt/vendhub

# 2. Install dependencies
cd backend
npm ci --production

# 3. Configure environment
cp .env.example .env.production
# Edit .env.production with production values

# 4. Run database migrations
NODE_ENV=production npm run migration:run

# 5. Seed initial data (optional)
NODE_ENV=production npm run seed:run

# 6. Build application
npm run build

# 7. Start with PM2
pm2 start dist/main.js --name vendhub-api
pm2 save
pm2 startup
```

### Update Deployment

```bash
# 1. Create backup
pg_dump -h localhost -U vendhub vendhub_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Pull latest code
cd /opt/vendhub
git pull origin main

# 3. Install dependencies
cd backend
npm ci --production

# 4. Run migrations
NODE_ENV=production npm run migration:run

# 5. Build
npm run build

# 6. Restart application
pm2 restart vendhub-api

# 7. Verify health
curl -f http://localhost:3000/health
```

---

## Docker Deployment

### Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  backend:
    image: vendhub/backend:${VERSION:-latest}
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    env_file:
      - ./backend/.env.production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    image: vendhub/frontend:${VERSION:-latest}
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    ports:
      - "3001:3000"
    env_file:
      - ./frontend/.env.production
    depends_on:
      - backend
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: vendhub_prod
      POSTGRES_USER: vendhub
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vendhub -d vendhub_prod"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:v2.48.0
    volumes:
      - ./monitoring/prometheus:/etc/prometheus
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
    ports:
      - "9090:9090"
    restart: unless-stopped

  grafana:
    image: grafana/grafana:10.2.0
    volumes:
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
      - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
      - GF_SERVER_ROOT_URL=https://grafana.vendhub.com
    ports:
      - "3000:3000"
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

### Docker Deployment Commands

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Update deployment
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Scale backend
docker-compose -f docker-compose.prod.yml up -d --scale backend=3
```

---

## Database Management

### Migrations

```bash
# Generate new migration
npm run migration:generate -- -n AddNewFeature

# Run pending migrations
NODE_ENV=production npm run migration:run

# Revert last migration
NODE_ENV=production npm run migration:revert

# Show migration status
NODE_ENV=production npm run migration:show
```

### Backup & Restore

```bash
# Create backup
pg_dump -h localhost -U vendhub -F c vendhub_prod > backup.dump

# Restore from backup
pg_restore -h localhost -U vendhub -d vendhub_prod backup.dump

# Automated backup script (add to cron)
#!/bin/bash
BACKUP_DIR=/opt/backups
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U vendhub -F c vendhub_prod > $BACKUP_DIR/vendhub_$DATE.dump
find $BACKUP_DIR -name "*.dump" -mtime +7 -delete  # Keep 7 days
```

### Database Maintenance

```bash
# Analyze and vacuum
psql -U vendhub -d vendhub_prod -c "VACUUM ANALYZE;"

# Check table sizes
psql -U vendhub -d vendhub_prod -c "
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

---

## Monitoring Setup

### Prometheus Configuration

`monitoring/prometheus/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - 'alerts.yml'

scrape_configs:
  - job_name: 'vendhub-backend'
    static_configs:
      - targets: ['backend:3000']
    metrics_path: '/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

### Grafana Dashboards

Import pre-configured dashboards from `monitoring/grafana/dashboards/`:
- `api-performance.json` - API response times, error rates
- `business-metrics.json` - Tasks, machines, inventory
- `security-metrics.json` - Login failures, rate limits

### Alert Notifications

Configure Grafana alerting:
1. Go to Alerting > Contact points
2. Add Telegram/Slack/Email notification channel
3. Create alert rules based on Prometheus metrics

---

## Rollback Procedures

### Application Rollback

```bash
# Using Git
git log --oneline -10  # Find previous working commit
git checkout <commit-hash>
npm ci --production
npm run build
pm2 restart vendhub-api

# Using Docker
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml pull vendhub/backend:previous-version
docker-compose -f docker-compose.prod.yml up -d
```

### Database Rollback

```bash
# Revert migration
NODE_ENV=production npm run migration:revert

# Restore from backup (if data loss)
pg_restore -h localhost -U vendhub -d vendhub_prod --clean backup.dump
```

### Automated Rollback (CD Pipeline)

The CD pipeline automatically rolls back if:
1. Health check fails after deployment
2. Smoke tests fail
3. Error rate exceeds threshold (>5%)

---

## Health Checks

### Endpoints

| Endpoint | Description | Expected Response |
|----------|-------------|-------------------|
| `/health` | Basic health check | `{ "status": "ok" }` |
| `/health/ready` | Readiness probe | `{ "status": "ok", "db": "ok", "redis": "ok" }` |
| `/health/live` | Liveness probe | `{ "status": "ok" }` |
| `/metrics` | Prometheus metrics | Prometheus format |

### Health Check Script

```bash
#!/bin/bash
# health-check.sh

API_URL=${1:-http://localhost:3000}

echo "Checking API health..."
response=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/health)

if [ "$response" == "200" ]; then
    echo "API is healthy"
    exit 0
else
    echo "API health check failed (HTTP $response)"
    exit 1
fi
```

### Monitoring Commands

```bash
# Check service status
pm2 status

# View logs
pm2 logs vendhub-api --lines 100

# Check database connections
psql -U vendhub -d vendhub_prod -c "SELECT count(*) FROM pg_stat_activity;"

# Check Redis
redis-cli -a $REDIS_PASSWORD ping

# Check disk space
df -h

# Check memory
free -m
```

---

## Troubleshooting

### Common Issues

#### Application won't start

```bash
# Check logs
pm2 logs vendhub-api --err --lines 50

# Verify environment
node -e "console.log(process.env.NODE_ENV)"

# Test database connection
psql -h $DATABASE_HOST -U $DATABASE_USERNAME -d $DATABASE_NAME -c "SELECT 1"
```

#### High memory usage

```bash
# Check Node.js memory
pm2 monit

# Increase memory limit
pm2 start dist/main.js --name vendhub-api --max-memory-restart 1G
```

#### Database connection errors

```bash
# Check connections
psql -U postgres -c "SELECT * FROM pg_stat_activity WHERE datname='vendhub_prod';"

# Increase pool size in .env
DATABASE_POOL_SIZE=30
```

---

## Quick Reference

### Deployment Commands

```bash
# Full deployment
git pull && npm ci && npm run build && pm2 restart vendhub-api

# Quick restart
pm2 restart vendhub-api

# Check status
pm2 status && curl http://localhost:3000/health

# View logs
pm2 logs --lines 100
```

### Emergency Contacts

| Role | Contact |
|------|---------|
| DevOps Lead | devops@vendhub.com |
| Backend Lead | backend@vendhub.com |
| On-Call | oncall@vendhub.com |

---

**Document Owner**: VendHub DevOps Team
**Review Cycle**: Monthly
**Classification**: Internal Use Only
