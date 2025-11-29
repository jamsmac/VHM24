# 🚀 VendHub Backend - Production Deployment Guide

**Version**: 1.0.0
**Market**: Uzbekistan
**Date**: 2025-11-15
**Status**: ✅ Production Ready

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Deployment](#database-deployment)
4. [Application Deployment](#application-deployment)
5. [Redis & BullMQ Setup](#redis--bullmq-setup)
6. [Scheduled Jobs Configuration](#scheduled-jobs-configuration)
7. [Health Checks & Monitoring](#health-checks--monitoring)
8. [Security Checklist](#security-checklist)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

**Server Specifications**:
- CPU: 4 cores (recommended 8 for production)
- RAM: 8 GB minimum (16 GB recommended)
- Storage: 100 GB SSD
- OS: Ubuntu 22.04 LTS or CentOS 8+

**Software Requirements**:
- Node.js: v18.x or v20.x LTS
- PostgreSQL: 14.x or 15.x
- Redis: 7.x
- Nginx: Latest stable (for reverse proxy)
- PM2: Latest (for process management)

### Access Requirements

- [x] SSH access to production server
- [x] Database administrator credentials
- [x] Domain name configured (e.g., api.vendhub.uz)
- [x] SSL certificate ready (Let's Encrypt or commercial)

---

## Environment Setup

### 1. Install Node.js

```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

### 2. Install PostgreSQL

```bash
# Add PostgreSQL repository
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt-get update

# Install PostgreSQL
sudo apt-get install -y postgresql-15 postgresql-contrib-15

# Start and enable
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify
sudo systemctl status postgresql
```

### 3. Install Redis

```bash
# Install Redis
sudo apt-get install -y redis-server

# Configure for production
sudo nano /etc/redis/redis.conf
# Set: maxmemory 2gb
# Set: maxmemory-policy allkeys-lru
# Set: requirepass YOUR_STRONG_PASSWORD

# Start and enable
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify
redis-cli ping  # Should return PONG
```

### 4. Install PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Setup PM2 startup script
pm2 startup systemd
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u vendhub --hp /home/vendhub

# Verify
pm2 --version
```

### 5. Install Nginx

```bash
# Install Nginx
sudo apt-get install -y nginx

# Start and enable
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify
sudo systemctl status nginx
```

---

## Database Deployment

### 1. Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE vendhub_prod;
CREATE USER vendhub_user WITH ENCRYPTED PASSWORD 'STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE vendhub_prod TO vendhub_user;
ALTER DATABASE vendhub_prod OWNER TO vendhub_user;

# Enable UUID extension
\c vendhub_prod
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\q
```

### 2. Configure Database Connection

Create `/opt/vendhub/backend/.env.production`:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=vendhub_user
DATABASE_PASSWORD=STRONG_PASSWORD_HERE
DATABASE_NAME=vendhub_prod
DATABASE_SSL=false

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=REDIS_STRONG_PASSWORD

# Application
NODE_ENV=production
PORT=3000
JWT_SECRET=GENERATE_RANDOM_64_CHAR_STRING
JWT_EXPIRATION=7d

# File Storage (Cloudflare R2 or S3)
S3_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
S3_BUCKET=vendhub-prod
S3_ACCESS_KEY_ID=YOUR_ACCESS_KEY
S3_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
S3_REGION=auto

# Telegram Bot (if using)
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
TELEGRAM_ADMIN_CHAT_ID=YOUR_CHAT_ID

# Logging
LOG_LEVEL=info
```

**Security Note**: Never commit `.env.production` to git!

### 3. Run Database Migrations

```bash
cd /opt/vendhub/backend

# Install dependencies
npm ci --production

# Run migrations
npm run migration:run

# Verify migrations
npm run migration:show
```

**Expected output**:
```
[X] ReplaceRubWithUzs1731700000001
[X] AddInventoryCheckConstraints1731700000002
[X] CreateCounterpartiesAndContracts1731710000001
[X] AddCommissionAutomation1731720000001
```

### 4. Verify Database Schema

```bash
# Connect to database
psql -U vendhub_user -d vendhub_prod

# Check tables
\dt

# Verify counterparty tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('counterparties', 'contracts', 'commission_calculations');

# Check indexes
SELECT indexname FROM pg_indexes
WHERE tablename IN ('transactions', 'contracts', 'commission_calculations');

# Verify view exists
SELECT * FROM v_pending_commissions LIMIT 1;

\q
```

---

## Application Deployment

### 1. Clone Repository

```bash
# Create application directory
sudo mkdir -p /opt/vendhub
sudo chown vendhub:vendhub /opt/vendhub

# Clone repository
cd /opt/vendhub
git clone https://github.com/YOUR_ORG/VendHub.git
cd VendHub/backend

# Checkout production branch
git checkout main  # or production branch
```

### 2. Build Application

```bash
# Install dependencies
npm ci --production

# Build TypeScript
npm run build

# Verify build
ls -lah dist/
```

### 3. Configure PM2 Ecosystem

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'vendhub-api',
      script: 'dist/main.js',
      instances: 4, // CPU cores
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/vendhub/api-error.log',
      out_file: '/var/log/vendhub/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=2048',
      wait_ready: true,
      listen_timeout: 10000,
    },
  ],
};
```

### 4. Start Application

```bash
# Create log directory
sudo mkdir -p /var/log/vendhub
sudo chown vendhub:vendhub /var/log/vendhub

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Verify running
pm2 status
pm2 logs vendhub-api --lines 50

# Check health
curl http://localhost:3000/health
```

**Expected response**:
```json
{
  "status": "ok",
  "timestamp": "2025-11-15T10:00:00.000Z",
  "database": "connected",
  "redis": "connected"
}
```

---

## Redis & BullMQ Setup

### 1. Verify Redis Configuration

```bash
# Test Redis connection
redis-cli -a REDIS_PASSWORD ping

# Check Redis info
redis-cli -a REDIS_PASSWORD info

# Monitor Redis commands (for testing)
redis-cli -a REDIS_PASSWORD monitor
```

### 2. Verify BullMQ Queues

```bash
# Check queue keys in Redis
redis-cli -a REDIS_PASSWORD KEYS "bull:*"

# Expected output should include:
# bull:commission-calculations:id
# bull:commission-calculations:wait
# bull:commission-calculations:active
# bull:commission-calculations:completed
# bull:commission-calculations:failed
```

### 3. Test Manual Job Trigger

```bash
# Trigger manual commission calculation
curl -X POST http://localhost:3000/commissions/calculate-now?period=daily

# Check job status (use job_id from response)
curl http://localhost:3000/commissions/jobs/12345
```

---

## Scheduled Jobs Configuration

### Option 1: PM2 Cron Jobs (Recommended)

Create `scripts/commission-cron.js`:

```javascript
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const queue = app.get('BullQueue_commission-calculations');

  const jobType = process.argv[2] || 'calculate-daily';
  await queue.add(jobType, {});

  console.log(`Job ${jobType} queued successfully`);
  await app.close();
  process.exit(0);
}

bootstrap().catch(err => {
  console.error(err);
  process.exit(1);
});
```

Update `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    // ... existing vendhub-api config ...
    {
      name: 'commission-daily',
      script: 'scripts/commission-cron.js',
      args: 'calculate-daily',
      cron_restart: '0 2 * * *', // 2 AM daily
      autorestart: false,
      env_production: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'commission-weekly',
      script: 'scripts/commission-cron.js',
      args: 'calculate-weekly',
      cron_restart: '0 3 * * 1', // 3 AM Monday
      autorestart: false,
      env_production: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'commission-monthly',
      script: 'scripts/commission-cron.js',
      args: 'calculate-monthly',
      cron_restart: '0 4 1 * *', // 4 AM 1st of month
      autorestart: false,
      env_production: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'commission-overdue',
      script: 'scripts/commission-cron.js',
      args: 'check-overdue',
      cron_restart: '0 6 * * *', // 6 AM daily
      autorestart: false,
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

**Deploy cron jobs**:

```bash
# Restart PM2 with new configuration
pm2 delete all
pm2 start ecosystem.config.js --env production
pm2 save

# Verify cron jobs scheduled
pm2 list
```

### Option 2: systemd Timers

See `docs/COMMISSION_SCHEDULED_JOBS.md` for systemd timer configuration.

---

## Nginx Reverse Proxy

### 1. Configure Nginx

Create `/etc/nginx/sites-available/vendhub`:

```nginx
upstream vendhub_backend {
    least_conn;
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
    keepalive 32;
}

server {
    listen 80;
    server_name api.vendhub.uz;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.vendhub.uz;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.vendhub.uz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.vendhub.uz/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Logging
    access_log /var/log/nginx/vendhub-access.log;
    error_log /var/log/nginx/vendhub-error.log;

    # Client body size limit (for file uploads)
    client_max_body_size 50M;

    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;

    # Proxy to Node.js application
    location / {
        proxy_pass http://vendhub_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API documentation
    location /api-docs {
        proxy_pass http://vendhub_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://vendhub_backend;
        access_log off;
    }
}
```

### 2. Enable Site and Restart Nginx

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/vendhub /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Verify
sudo systemctl status nginx
```

### 3. Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.vendhub.uz

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## Health Checks & Monitoring

### 1. Application Health Endpoint

```bash
# Check application health
curl https://api.vendhub.uz/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-11-15T10:00:00.000Z",
  "database": "connected",
  "redis": "connected",
  "uptime": 3600,
  "memory": {
    "used": 512000000,
    "total": 8000000000
  }
}
```

### 2. PM2 Monitoring

```bash
# Monitor in real-time
pm2 monit

# Check resource usage
pm2 status

# View logs
pm2 logs vendhub-api --lines 100

# Export metrics
pm2 web  # Opens web dashboard on port 9615
```

### 3. Database Monitoring

```bash
# Check active connections
psql -U vendhub_user -d vendhub_prod -c "SELECT count(*) FROM pg_stat_activity;"

# Check database size
psql -U vendhub_user -d vendhub_prod -c "SELECT pg_size_pretty(pg_database_size('vendhub_prod'));"

# Check slow queries
psql -U vendhub_user -d vendhub_prod -c "SELECT query, calls, total_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

### 4. Redis Monitoring

```bash
# Check memory usage
redis-cli -a REDIS_PASSWORD INFO memory

# Check connected clients
redis-cli -a REDIS_PASSWORD INFO clients

# Check queue sizes
redis-cli -a REDIS_PASSWORD LLEN bull:commission-calculations:wait
redis-cli -a REDIS_PASSWORD LLEN bull:commission-calculations:active
redis-cli -a REDIS_PASSWORD LLEN bull:commission-calculations:completed
redis-cli -a REDIS_PASSWORD LLEN bull:commission-calculations:failed
```

### 5. Set Up Monitoring Alerts

**Option A: Using PM2 Plus** (Recommended)

```bash
# Link PM2 to PM2 Plus
pm2 link SECRET_KEY PUBLIC_KEY

# Access monitoring at https://app.pm2.io
```

**Option B: Custom Health Check Script**

Create `/opt/vendhub/scripts/health-check.sh`:

```bash
#!/bin/bash

# Health check script
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://api.vendhub.uz/health)

if [ $RESPONSE -ne 200 ]; then
    echo "Health check failed with code $RESPONSE"
    # Send alert (email, Telegram, Slack, etc.)
    curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
        -d "chat_id=$TELEGRAM_ADMIN_CHAT_ID" \
        -d "text=🚨 VendHub API health check failed: HTTP $RESPONSE"
    exit 1
fi

echo "Health check passed"
exit 0
```

Add to crontab:

```bash
# Run health check every 5 minutes
*/5 * * * * /opt/vendhub/scripts/health-check.sh >> /var/log/vendhub/health-check.log 2>&1
```

---

## Security Checklist

### Application Security

- [x] **Environment variables**: Never commit `.env` files
- [x] **JWT secrets**: Generate strong random secrets (64+ characters)
- [x] **Database passwords**: Use strong passwords (16+ characters, mixed case, numbers, symbols)
- [x] **Redis password**: Configure `requirepass` in redis.conf
- [x] **CORS**: Configure allowed origins in production
- [x] **Rate limiting**: Implement rate limiting on API endpoints
- [x] **Helmet**: Enable security headers (already configured in Nginx)
- [x] **Input validation**: Use class-validator (already implemented)
- [x] **SQL injection**: Use TypeORM parameterized queries (already implemented)

### Network Security

- [x] **Firewall**: Configure UFW or iptables
  ```bash
  sudo ufw allow 22/tcp    # SSH
  sudo ufw allow 80/tcp    # HTTP
  sudo ufw allow 443/tcp   # HTTPS
  sudo ufw enable
  ```
- [x] **SSH**: Disable password authentication, use keys only
- [x] **Fail2Ban**: Install and configure for SSH protection
- [x] **SSL/TLS**: Use strong ciphers and TLS 1.2+

### Database Security

- [x] **PostgreSQL**: Bind to localhost only (not 0.0.0.0)
- [x] **Backups**: Set up automated database backups
- [x] **Replication**: Consider setting up read replicas
- [x] **Encryption**: Enable SSL for database connections (if remote)

### Regular Maintenance

- [x] **Updates**: `sudo apt-get update && sudo apt-get upgrade`
- [x] **Logs rotation**: Configure logrotate for application logs
- [x] **Disk space**: Monitor disk usage
- [x] **Security patches**: Subscribe to security mailing lists

---

## Backup Strategy

### 1. Database Backups

Create `/opt/vendhub/scripts/backup-database.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/backups/vendhub/database"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="vendhub_prod_$DATE.sql.gz"

mkdir -p $BACKUP_DIR

# Dump database
pg_dump -U vendhub_user -d vendhub_prod | gzip > $BACKUP_DIR/$FILENAME

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Database backup completed: $FILENAME"

# Upload to cloud storage (optional)
# aws s3 cp $BACKUP_DIR/$FILENAME s3://vendhub-backups/database/
```

Add to crontab:

```bash
# Daily database backup at 3 AM
0 3 * * * /opt/vendhub/scripts/backup-database.sh >> /var/log/vendhub/backup.log 2>&1
```

### 2. Application Files Backup

```bash
# Backup uploads and configuration
tar -czf /backups/vendhub/files_$(date +%Y%m%d).tar.gz \
    /opt/vendhub/backend/.env.production \
    /opt/vendhub/backend/uploads
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check PM2 logs
pm2 logs vendhub-api --lines 100 --err

# Common issues:
# 1. Database connection - Check .env.production
# 2. Port already in use - sudo lsof -i :3000
# 3. Missing dependencies - npm ci
# 4. Migration errors - npm run migration:show
```

### Database Connection Errors

```bash
# Test database connection
psql -U vendhub_user -h localhost -d vendhub_prod

# Check PostgreSQL is running
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# Check pg_hba.conf
sudo nano /etc/postgresql/15/main/pg_hba.conf
```

### Redis Connection Errors

```bash
# Test Redis
redis-cli -a REDIS_PASSWORD ping

# Check Redis is running
sudo systemctl status redis-server

# Check Redis logs
sudo tail -f /var/log/redis/redis-server.log

# Check Redis configuration
sudo nano /etc/redis/redis.conf
```

### High Memory Usage

```bash
# Check PM2 processes
pm2 status

# Restart application
pm2 restart vendhub-api

# Increase max memory if needed
# Edit ecosystem.config.js:
# max_memory_restart: '2G'
```

### Slow API Responses

```bash
# Check database query performance
psql -U vendhub_user -d vendhub_prod -c "
  SELECT query, calls, mean_time
  FROM pg_stat_statements
  ORDER BY mean_time DESC
  LIMIT 10;
"

# Check indexes are being used
psql -U vendhub_user -d vendhub_prod -c "
  SELECT schemaname, tablename, indexname, idx_scan
  FROM pg_stat_user_indexes
  ORDER BY idx_scan ASC;
"

# Rebuild indexes if needed
psql -U vendhub_user -d vendhub_prod -c "REINDEX DATABASE vendhub_prod;"
```

### Commission Jobs Not Running

```bash
# Check PM2 cron jobs
pm2 list

# Check Redis queue
redis-cli -a REDIS_PASSWORD LLEN bull:commission-calculations:failed

# Manually trigger job for testing
curl -X POST http://localhost:3000/commissions/calculate-now?period=daily

# Check job logs
pm2 logs commission-daily --lines 50
```

---

## Rollback Procedure

If issues occur after deployment:

### 1. Rollback Application Code

```bash
# Stop current version
pm2 stop vendhub-api

# Checkout previous version
cd /opt/vendhub/backend
git log --oneline -10  # Find previous commit
git checkout <previous-commit-hash>

# Rebuild
npm ci
npm run build

# Restart
pm2 restart vendhub-api
```

### 2. Rollback Database Migrations

```bash
# Revert last migration
npm run migration:revert

# Verify
npm run migration:show
```

### 3. Restore from Backup

```bash
# Stop application
pm2 stop vendhub-api

# Restore database
gunzip < /backups/vendhub/database/vendhub_prod_20251115.sql.gz | psql -U vendhub_user -d vendhub_prod

# Restart application
pm2 restart vendhub-api
```

---

## Post-Deployment Checklist

- [ ] Application started successfully
- [ ] Database migrations applied
- [ ] Redis connected and working
- [ ] Scheduled jobs configured and running
- [ ] Nginx reverse proxy working
- [ ] SSL certificate installed
- [ ] Health check endpoint responding
- [ ] Backups configured and tested
- [ ] Monitoring/alerts set up
- [ ] Security hardening complete
- [ ] Documentation updated
- [ ] Team notified of deployment

---

## Support & Maintenance

### Logs Locations

- **Application**: `/var/log/vendhub/api-*.log`
- **Nginx**: `/var/log/nginx/vendhub-*.log`
- **PostgreSQL**: `/var/log/postgresql/postgresql-15-main.log`
- **Redis**: `/var/log/redis/redis-server.log`
- **PM2**: `~/.pm2/logs/`

### Useful Commands

```bash
# Application status
pm2 status

# View real-time logs
pm2 logs --lines 100

# Restart application
pm2 restart vendhub-api

# Database shell
psql -U vendhub_user -d vendhub_prod

# Redis shell
redis-cli -a REDIS_PASSWORD

# Check disk space
df -h

# Check memory usage
free -h

# Check CPU usage
top

# Check network connections
netstat -tlnp
```

---

## Conclusion

This deployment guide covers all aspects of deploying VendHub backend to production. Follow each section carefully and complete all checklists before going live.

**For additional help**:
- Technical Documentation: `docs/` directory
- Commission Jobs: `docs/COMMISSION_SCHEDULED_JOBS.md`
- Testing Guide: `docs/TEST_EXECUTION_REPORT.md`
- Security: `docs/SECURITY_FIXES_COMPLETED.md`

**Status**: ✅ Production deployment ready!
