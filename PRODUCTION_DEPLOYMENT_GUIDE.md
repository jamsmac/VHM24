# VendHub Manager - Production Deployment Guide

> **Date**: 2025-11-16
> **Version**: 1.0.0
> **Target**: Production deployment for 31+ vending machines

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Infrastructure Setup](#infrastructure-setup)
3. [Database Migration](#database-migration)
4. [Application Deployment](#application-deployment)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Monitoring Setup](#monitoring-setup)
7. [Backup Configuration](#backup-configuration)
8. [Troubleshooting](#troubleshooting)

---

## 🔍 Pre-Deployment Checklist

### Code Readiness

- [x] All Phase 3 features complete
- [x] All TODOs resolved
- [x] Reservation system implemented
- [x] Telegram bot using real data
- [x] Performance optimizations applied
- [ ] All critical unit tests passing
- [ ] Load testing completed
- [ ] Security audit performed

### Environment Preparation

```bash
# Required Infrastructure
□ PostgreSQL 14+ database
□ Redis 7+ cache server
□ S3-compatible object storage (AWS S3, Cloudflare R2, MinIO)
□ Node.js 18+ runtime
□ PM2 process manager
□ Nginx reverse proxy
□ SSL certificates (Let's Encrypt or commercial)

# Optional but Recommended
□ Monitoring service (Sentry, New Relic, Datadog)
□ Log aggregation (ELK stack, CloudWatch)
□ CDN for static assets
□ Backup storage (separate from primary)
```

---

## 🏗️ Infrastructure Setup

### 1. Server Specifications

**Minimum Requirements** (31 machines, ~10-20 users):
```yaml
Backend Server:
  CPU: 2 vCPUs
  RAM: 4 GB
  Storage: 50 GB SSD
  OS: Ubuntu 22.04 LTS

Database Server:
  CPU: 2 vCPUs
  RAM: 4 GB
  Storage: 100 GB SSD (with auto-scaling)
  OS: Ubuntu 22.04 LTS

Redis Cache:
  CPU: 1 vCPU
  RAM: 2 GB
  Storage: 10 GB

Frontend Server (if separate):
  CPU: 1 vCPU
  RAM: 2 GB
  Storage: 20 GB
```

**Recommended for Production** (100+ machines, 50+ users):
```yaml
Backend Server:
  CPU: 4 vCPUs
  RAM: 8 GB
  Storage: 100 GB SSD

Database Server:
  CPU: 4 vCPUs
  RAM: 16 GB
  Storage: 500 GB SSD

Redis Cache:
  CPU: 2 vCPUs
  RAM: 4 GB
  Storage: 20 GB
```

### 2. PostgreSQL Setup

```bash
# Install PostgreSQL 14
sudo apt update
sudo apt install -y postgresql-14 postgresql-contrib-14

# Configure PostgreSQL
sudo nano /etc/postgresql/14/main/postgresql.conf

# Recommended settings
max_connections = 100
shared_buffers = 2GB
effective_cache_size = 6GB
maintenance_work_mem = 512MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 10MB
min_wal_size = 1GB
max_wal_size = 4GB

# Create database and user
sudo -u postgres psql
```

```sql
-- Create database
CREATE DATABASE vendhub_production;

-- Create user
CREATE USER vendhub_user WITH PASSWORD 'STRONG_PASSWORD_HERE';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE vendhub_production TO vendhub_user;

-- Enable required extensions
\c vendhub_production
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Exit
\q
```

```bash
# Restart PostgreSQL
sudo systemctl restart postgresql
sudo systemctl enable postgresql
```

### 3. Redis Setup

```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf

# Important settings
maxmemory 2gb
maxmemory-policy allkeys-lru
appendonly yes
appendfsync everysec

# Set password
requirepass YOUR_REDIS_PASSWORD

# Restart Redis
sudo systemctl restart redis
sudo systemctl enable redis

# Test connection
redis-cli
> AUTH YOUR_REDIS_PASSWORD
> PING
PONG
> exit
```

### 4. Nginx Setup

```bash
# Install Nginx
sudo apt install -y nginx

# Create server block
sudo nano /etc/nginx/sites-available/vendhub
```

```nginx
# Backend API
server {
    listen 80;
    server_name api.vendhub.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;

        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }

    # File uploads
    client_max_body_size 10M;
}

# Frontend
server {
    listen 80;
    server_name vendhub.example.com;

    root /var/www/vendhub/frontend/out;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static assets caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}

# Rate limiting zone
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/vendhub /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 5. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificates
sudo certbot --nginx -d api.vendhub.example.com -d vendhub.example.com

# Auto-renewal test
sudo certbot renew --dry-run

# Certificates will auto-renew via cron
```

---

## 💾 Database Migration

### 1. Backup Current Data (if migrating)

```bash
# Dump existing database (if any)
pg_dump -U vendhub_user -h localhost vendhub_production > backup_before_migration.sql

# Copy to safe location
cp backup_before_migration.sql /backups/$(date +%Y%m%d)_before_migration.sql
```

### 2. Run Migrations

```bash
# Navigate to backend directory
cd /var/www/vendhub/backend

# Set production environment
export NODE_ENV=production
export DATABASE_URL="postgresql://vendhub_user:PASSWORD@localhost:5432/vendhub_production"

# Install dependencies (production only)
npm ci --production=false

# Run migrations
npm run migration:run

# Verify migrations
npm run migration:show

# Expected output:
# [X] InitialSchema1234567890123
# [X] AddUserRoles1234567890124
# [X] AddInventoryTables1234567890125
# ... (all migrations should show [X])
```

### 3. Seed System Data

```bash
# Seed system dictionaries
npm run seed:dictionaries

# Verify data
psql $DATABASE_URL -c "SELECT COUNT(*) FROM nomenclature;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM locations;"
```

### 4. Create Initial Admin User

```bash
# Run seed script or manual SQL
psql $DATABASE_URL
```

```sql
-- Create admin user (password will be hashed by application)
INSERT INTO users (
  id,
  email,
  full_name,
  role,
  is_active,
  password_hash,
  created_at,
  updated_at
) VALUES (
  uuid_generate_v4(),
  'admin@vendhub.com',
  'System Administrator',
  'admin',
  true,
  '$2b$10$YOUR_HASHED_PASSWORD', -- Hash with bcrypt
  NOW(),
  NOW()
);

-- Verify
SELECT id, email, full_name, role FROM users WHERE role = 'admin';
```

---

## 🚀 Application Deployment

### 1. Application Setup

```bash
# Create application directory
sudo mkdir -p /var/www/vendhub
sudo chown -R $USER:$USER /var/www/vendhub

# Clone repository
cd /var/www/vendhub
git clone <repository-url> .
git checkout main

# Backend setup
cd backend
npm ci --production

# Build application
npm run build

# Frontend setup (if deploying separately)
cd ../frontend
npm ci
npm run build

# Static export for Nginx
npm run export
```

### 2. Environment Configuration

```bash
# Backend environment
cd /var/www/vendhub/backend
nano .env.production
```

```env
# Application
NODE_ENV=production
PORT=3000
API_PREFIX=api

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=vendhub_user
DATABASE_PASSWORD=STRONG_PASSWORD_HERE
DATABASE_NAME=vendhub_production
DATABASE_SSL=false  # true if using SSL
DATABASE_LOGGING=false
DATABASE_SYNCHRONIZE=false  # NEVER true in production

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=YOUR_REDIS_PASSWORD
REDIS_DB=0

# Security
JWT_SECRET=GENERATE_STRONG_SECRET_HERE_64_CHARS
JWT_EXPIRATION=15m
REFRESH_TOKEN_SECRET=ANOTHER_STRONG_SECRET_HERE
REFRESH_TOKEN_EXPIRATION=7d

# Rate Limiting
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# File Storage (Cloudflare R2 example)
S3_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
S3_BUCKET=vendhub-production
S3_REGION=auto
S3_ACCESS_KEY_ID=YOUR_ACCESS_KEY
S3_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
S3_PUBLIC_URL=https://files.vendhub.example.com

# Telegram Bot
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_FROM_BOTFATHER
TELEGRAM_WEBHOOK_URL=https://api.vendhub.example.com/api/telegram/webhook

# Scheduled Tasks
ENABLE_SCHEDULED_TASKS=true

# Monitoring (optional)
SENTRY_DSN=YOUR_SENTRY_DSN
NEW_RELIC_LICENSE_KEY=YOUR_NEW_RELIC_KEY

# CORS
CORS_ORIGIN=https://vendhub.example.com,https://www.vendhub.example.com

# Logging
LOG_LEVEL=info
```

### 3. PM2 Process Manager

```bash
# Install PM2 globally
sudo npm install -g pm2

# Create ecosystem file
cd /var/www/vendhub/backend
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'vendhub-api',
      script: 'dist/main.js',
      instances: 'max', // Use all CPU cores
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/log/vendhub/api-error.log',
      out_file: '/var/log/vendhub/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',

      // Auto-restart on crash
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // Cron restart (optional - restart daily at 3 AM)
      cron_restart: '0 3 * * *',
    },
  ],
};
```

```bash
# Create log directory
sudo mkdir -p /var/log/vendhub
sudo chown -R $USER:$USER /var/log/vendhub

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
# Follow the instructions output by the command

# Verify application is running
pm2 status
pm2 logs vendhub-api --lines 50
```

### 4. Frontend Deployment (Static)

```bash
# Copy built files to Nginx directory
sudo mkdir -p /var/www/vendhub/frontend/out
sudo cp -r /var/www/vendhub/frontend/.next/standalone/* /var/www/vendhub/frontend/out/
sudo cp -r /var/www/vendhub/frontend/.next/static /var/www/vendhub/frontend/out/_next/
sudo cp -r /var/www/vendhub/frontend/public /var/www/vendhub/frontend/out/

# Set permissions
sudo chown -R www-data:www-data /var/www/vendhub/frontend/out
sudo chmod -R 755 /var/www/vendhub/frontend/out
```

---

## ✅ Post-Deployment Verification

### 1. Health Checks

```bash
# Check API health
curl https://api.vendhub.example.com/api/health

# Expected response:
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" }
  }
}

# Check API documentation
curl https://api.vendhub.example.com/api/docs
# Should return Swagger UI HTML

# Check frontend
curl https://vendhub.example.com
# Should return HTML
```

### 2. Database Verification

```bash
# Connect to database
psql $DATABASE_URL

-- Check tables
\dt

-- Verify migrations
SELECT * FROM migrations ORDER BY id DESC LIMIT 10;

-- Check critical data
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM machines;
SELECT COUNT(*) FROM nomenclature;
SELECT COUNT(*) FROM locations;

-- Verify indexes (should show 36+ performance indexes)
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Check database size
SELECT pg_size_pretty(pg_database_size('vendhub_production'));

\q
```

### 3. Functionality Tests

```bash
# Test authentication
curl -X POST https://api.vendhub.example.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vendhub.com","password":"your_password"}'

# Should return JWT token

# Test authenticated endpoint
curl https://api.vendhub.example.com/api/machines \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Should return machines list
```

### 4. Telegram Bot Verification

```bash
# Set webhook
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -d "url=https://api.vendhub.example.com/api/telegram/webhook"

# Verify webhook
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"

# Test bot
# Send /start command to your bot in Telegram
# Should receive welcome message
```

### 5. Scheduled Jobs Verification

```bash
# Check PM2 logs for cron job execution
pm2 logs vendhub-api | grep "CRON"

# Should see logs like:
# "Checking for overdue tasks..."
# "Checking for expired inventory reservations..."
# "Calculating operator ratings..."

# Verify in database
psql $DATABASE_URL -c "SELECT * FROM operator_ratings ORDER BY created_at DESC LIMIT 5;"
```

---

## 📊 Monitoring Setup

### 1. Application Monitoring

**Option A: Sentry (Error Tracking)**

```bash
# Already configured in .env
# Verify Sentry is receiving events
# Check: https://sentry.io/organizations/YOUR_ORG/issues/

# Test error reporting
curl -X POST https://api.vendhub.example.com/api/test/error
```

**Option B: New Relic (APM)**

```bash
# Install New Relic agent
npm install newrelic

# Configure
nano newrelic.js

# Add to application
// In main.ts (first line)
require('newrelic');
```

### 2. Database Monitoring

```sql
-- Enable pg_stat_statements
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.track = all;

-- Restart PostgreSQL
-- sudo systemctl restart postgresql

-- Create extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Query slow queries
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;
```

### 3. Server Monitoring

```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Monitor processes
htop

# Monitor disk I/O
sudo iotop

# Monitor network
sudo nethogs

# Disk space monitoring
df -h
du -sh /var/www/vendhub/*
du -sh /var/lib/postgresql/14/main
```

### 4. Log Rotation

```bash
# Configure logrotate
sudo nano /etc/logrotate.d/vendhub
```

```
/var/log/vendhub/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0644 vendhub vendhub
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

---

## 💾 Backup Configuration

### 1. Database Backup

```bash
# Create backup script
sudo nano /usr/local/bin/backup-vendhub-db.sh
```

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/backups/vendhub/database"
DB_NAME="vendhub_production"
DB_USER="vendhub_user"
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Generate filename with timestamp
FILENAME="vendhub_db_$(date +%Y%m%d_%H%M%S).sql"
FILEPATH="$BACKUP_DIR/$FILENAME"

# Perform backup
pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > "$FILEPATH.gz"

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "✅ Database backup successful: $FILEPATH.gz"

    # Remove old backups (older than retention period)
    find $BACKUP_DIR -name "vendhub_db_*.sql.gz" -mtime +$RETENTION_DAYS -delete

    # Upload to cloud storage (optional)
    # aws s3 cp "$FILEPATH.gz" s3://your-backup-bucket/database/
else
    echo "❌ Database backup failed!"
    exit 1
fi
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-vendhub-db.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
```

```cron
0 2 * * * /usr/local/bin/backup-vendhub-db.sh >> /var/log/vendhub/backup.log 2>&1
```

### 2. File Storage Backup

```bash
# If using S3/R2, configure versioning in bucket settings
# If using local storage:

# Create backup script
sudo nano /usr/local/bin/backup-vendhub-files.sh
```

```bash
#!/bin/bash

BACKUP_DIR="/backups/vendhub/files"
SOURCE_DIR="/var/www/vendhub/uploads"
RETENTION_DAYS=90

mkdir -p $BACKUP_DIR

FILENAME="vendhub_files_$(date +%Y%m%d_%H%M%S).tar.gz"
tar -czf "$BACKUP_DIR/$FILENAME" -C $SOURCE_DIR .

if [ $? -eq 0 ]; then
    echo "✅ Files backup successful: $FILENAME"
    find $BACKUP_DIR -name "vendhub_files_*.tar.gz" -mtime +$RETENTION_DAYS -delete
else
    echo "❌ Files backup failed!"
    exit 1
fi
```

### 3. Restore Procedure

**Database Restore:**
```bash
# Stop application
pm2 stop vendhub-api

# Restore database
gunzip < /backups/vendhub/database/vendhub_db_20251116_020000.sql.gz | \
  psql -U vendhub_user -h localhost vendhub_production

# Restart application
pm2 start vendhub-api
```

**Files Restore:**
```bash
# Extract files
tar -xzf /backups/vendhub/files/vendhub_files_20251116_020000.tar.gz \
  -C /var/www/vendhub/uploads
```

---

## 🔧 Troubleshooting

### Common Issues

**1. Application Won't Start**

```bash
# Check PM2 logs
pm2 logs vendhub-api --lines 100

# Check environment variables
pm2 env 0

# Verify database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check port availability
sudo lsof -i :3000
```

**2. Database Connection Errors**

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# Verify credentials
psql -U vendhub_user -h localhost -d vendhub_production

# Check max connections
psql $DATABASE_URL -c "SHOW max_connections;"
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
```

**3. High Memory Usage**

```bash
# Check process memory
pm2 monit

# Restart with lower memory limit
pm2 delete vendhub-api
pm2 start ecosystem.config.js

# Check for memory leaks
pm2 logs vendhub-api | grep "memory"

# Analyze Node.js heap
node --inspect dist/main.js
```

**4. Slow API Responses**

```bash
# Check database slow queries
psql $DATABASE_URL

SELECT query, calls, mean_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 10;

# Check cache hit rate
redis-cli INFO stats | grep hit_rate

# Monitor API response times
# Check monitoring dashboard (Sentry/New Relic)
```

**5. Telegram Bot Not Responding**

```bash
# Check webhook status
curl "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"

# Check application logs
pm2 logs vendhub-api | grep telegram

# Test webhook manually
curl -X POST https://api.vendhub.example.com/api/telegram/webhook \
  -H "Content-Type: application/json" \
  -d '{"message":{"chat":{"id":123},"text":"test"}}'
```

---

## 📞 Support Contacts

**Emergency Contacts:**
- Backend Lead: [email/phone]
- Database Admin: [email/phone]
- DevOps: [email/phone]
- On-Call: [phone]

**Escalation Path:**
1. Check logs and this guide
2. Contact Backend Lead
3. Contact DevOps
4. Emergency on-call

---

## ✅ Deployment Success Criteria

- [ ] Application starts without errors
- [ ] Health check endpoint returns 200 OK
- [ ] Database migrations completed successfully
- [ ] All cron jobs executing on schedule
- [ ] Telegram bot responding to commands
- [ ] API response time < 200ms (p95)
- [ ] No errors in Sentry for 1 hour
- [ ] Backup jobs configured and tested
- [ ] Monitoring alerts configured
- [ ] SSL certificates valid
- [ ] Load testing passed (100 concurrent users)

---

## 🎉 Congratulations!

If all checks pass, your VendHub Manager system is **LIVE IN PRODUCTION**! 🚀

**Next Steps:**
1. Monitor for 24-48 hours
2. Conduct user acceptance testing
3. Train operators on Telegram bot
4. Review analytics and dashboards
5. Plan for Phase 4 (machine integration)

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-16
**Maintained By**: VendHub DevOps Team
