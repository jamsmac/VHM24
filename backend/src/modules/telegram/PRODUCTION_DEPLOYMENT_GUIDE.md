# VendHub Telegram Bot - Production Deployment Guide

> **Version:** 1.0.0
> **Last Updated:** 2025-11-18
> **Status:** Production Ready

This guide covers deploying the VendHub Telegram bot to production with all 9 phases implemented.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Infrastructure Setup](#infrastructure-setup)
4. [Application Deployment](#application-deployment)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Scaling Guidelines](#scaling-guidelines)
8. [Troubleshooting](#troubleshooting)

---

## ✅ Prerequisites

### Required Services

- **PostgreSQL 14+** - Main database
- **Redis 7+** - Session storage + BullMQ job queue
- **Object Storage** - Photo storage (AWS S3, Cloudflare R2, or MinIO)
- **Telegram Bot Token** - From @BotFather
- **OpenAI API Key** - For voice transcription (Whisper)
- **Node.js 18+** - Runtime environment

### Minimum Server Requirements

**For 100-200 operators:**
- **CPU:** 2 vCPUs
- **RAM:** 4 GB
- **Storage:** 50 GB SSD
- **Network:** 100 Mbps

**For 500+ operators:**
- **CPU:** 4 vCPUs
- **RAM:** 8 GB
- **Storage:** 100 GB SSD
- **Network:** 1 Gbps

---

## 🔧 Environment Configuration

### 1. Create Production `.env` File

```bash
cd backend
cp .env.example .env.production
```

### 2. Configure Environment Variables

```env
# ==========================================
# APPLICATION
# ==========================================
NODE_ENV=production
PORT=3000
API_PREFIX=api
ENABLE_SWAGGER=false  # Disable in production for security

# ==========================================
# DATABASE
# ==========================================
DB_HOST=your-postgres-host
DB_PORT=5432
DB_USERNAME=vendhub_user
DB_PASSWORD=your-secure-password-here
DB_DATABASE=vendhub_production
DB_SSL=true  # Enable SSL for production
DB_POOL_MIN=5
DB_POOL_MAX=20

# ==========================================
# REDIS
# ==========================================
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
REDIS_TLS=true  # Enable TLS for production

# ==========================================
# TELEGRAM BOT
# ==========================================
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
TELEGRAM_BOT_WEBHOOK_DOMAIN=https://api.yourdomain.com  # For webhooks (optional)
TELEGRAM_BOT_WEBHOOK_PATH=/api/telegram/webhook
TELEGRAM_BOT_POLLING=true  # Use polling or webhook
TELEGRAM_MAX_CONNECTIONS=50  # Max concurrent connections

# ==========================================
# OPENAI (Voice Commands)
# ==========================================
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_ORG_ID=org-your-org-id  # Optional

# ==========================================
# OBJECT STORAGE (S3-compatible)
# ==========================================
S3_ENDPOINT=https://s3.amazonaws.com  # Or Cloudflare R2 endpoint
S3_REGION=us-east-1
S3_BUCKET=vendhub-photos-production
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_USE_SSL=true
S3_FORCE_PATH_STYLE=false  # true for MinIO

# ==========================================
# SECURITY
# ==========================================
JWT_SECRET=your-jwt-secret-256-bits-minimum
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret-256-bits-minimum
JWT_REFRESH_EXPIRES_IN=30d

# ==========================================
# RATE LIMITING
# ==========================================
THROTTLE_TTL=60  # Time window in seconds
THROTTLE_LIMIT=100  # Max requests per window

# ==========================================
# SCHEDULED TASKS
# ==========================================
ENABLE_SCHEDULED_TASKS=true

# ==========================================
# LOGGING
# ==========================================
LOG_LEVEL=info  # debug, info, warn, error
LOG_FILE_ENABLED=true
LOG_FILE_PATH=/var/log/vendhub/app.log

# ==========================================
# MONITORING
# ==========================================
SENTRY_DSN=your-sentry-dsn  # Optional - for error tracking
SENTRY_ENVIRONMENT=production

# ==========================================
# PERFORMANCE
# ==========================================
PHOTO_COMPRESSION_ENABLED=true
PHOTO_MAX_SIZE_MB=10
PHOTO_QUALITY=80
CACHE_TTL_SECONDS=300  # 5 minutes
```

### 3. Generate Secure Secrets

```bash
# Generate JWT secrets (256-bit)
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For JWT_REFRESH_SECRET
```

---

## 🏗️ Infrastructure Setup

### Option 1: Docker Compose (Recommended for Small-Medium Scale)

```yaml
# docker-compose.production.yml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_USER: vendhub_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: vendhub_production
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vendhub_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.production
    environment:
      - NODE_ENV=production
    env_file:
      - ./backend/.env.production
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G

volumes:
  postgres-data:
  redis-data:
```

### Option 2: Kubernetes (For Large Scale)

See `k8s/` directory for Kubernetes manifests.

---

## 🚀 Application Deployment

### 1. Build Application

```bash
# Clone repository
git clone https://github.com/your-org/vendhub.git
cd vendhub/backend

# Install dependencies
npm ci --production

# Build TypeScript
npm run build

# Run database migrations
npm run migration:run
```

### 2. Create Dockerfile

```dockerfile
# backend/Dockerfile.production
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create log directory
RUN mkdir -p /var/log/vendhub && chown -R node:node /var/log/vendhub

# Use non-root user
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/main"]
```

### 3. Deploy with Docker Compose

```bash
# Build and start services
docker-compose -f docker-compose.production.yml up -d

# View logs
docker-compose -f docker-compose.production.yml logs -f backend

# Check health
curl http://localhost:3000/health
```

### 4. Run Database Migrations

```bash
# Inside container
docker-compose -f docker-compose.production.yml exec backend npm run migration:run
```

---

## ✅ Post-Deployment Verification

### 1. Health Checks

```bash
# Application health
curl http://your-domain.com/health

# Expected response:
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis": { "status": "up" },
    "memory_heap": { "status": "up" },
    "memory_rss": { "status": "up" }
  }
}
```

### 2. Telegram Bot Status

```bash
# Check bot info
curl -X GET "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe"

# Expected response:
{
  "ok": true,
  "result": {
    "id": 123456789,
    "is_bot": true,
    "first_name": "VendHub Manager",
    "username": "your_bot_username"
  }
}
```

### 3. Test Bot Commands

Send these messages to your bot:

1. `/start` - Should show welcome message
2. `/help` - Should show command list
3. `/language` - Should show language selection
4. Send voice message - Should transcribe (if OpenAI configured)
5. Send photo - Should handle gracefully

### 4. Database Verification

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U vendhub_user -d vendhub_production

# Check tables
\dt

# Check telegram_users table
SELECT COUNT(*) FROM telegram_users;

# Exit
\q
```

### 5. Redis Verification

```bash
# Connect to Redis
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD}

# Check keys
KEYS telegram:*

# Check BullMQ queues
KEYS bull:telegram-messages:*

# Exit
exit
```

---

## 📊 Monitoring & Maintenance

### Performance Metrics to Track

**Application Metrics:**
- Response time per endpoint
- Request rate (req/sec)
- Error rate
- Memory usage
- CPU usage

**Telegram Bot Metrics:**
- Messages processed per minute
- Voice commands processed
- Photos uploaded per day
- Failed message deliveries
- Queue depth (BullMQ)

**Database Metrics:**
- Query performance (slow queries > 1s)
- Connection pool usage
- Database size growth
- Index usage

### Monitoring Tools Setup

#### 1. Application Logs

```bash
# View real-time logs
docker-compose logs -f backend

# Filter errors only
docker-compose logs backend | grep ERROR

# Export logs for analysis
docker-compose logs --since 24h backend > logs_$(date +%Y%m%d).txt
```

#### 2. Sentry (Error Tracking)

Already configured if `SENTRY_DSN` is set in `.env`.

Errors automatically reported to Sentry dashboard.

#### 3. Custom Metrics Endpoint

```bash
# Get performance metrics
curl http://localhost:3000/api/metrics

# Response includes:
# - Bot performance stats
# - Queue statistics
# - Cache hit rates
# - Compression savings
```

### Automated Backups

#### Database Backup Script

```bash
#!/bin/bash
# backup-database.sh

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
DB_NAME="vendhub_production"

mkdir -p $BACKUP_DIR

# Create backup
docker-compose exec -T postgres pg_dump -U vendhub_user $DB_NAME | gzip > "$BACKUP_DIR/backup_$TIMESTAMP.sql.gz"

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: backup_$TIMESTAMP.sql.gz"
```

#### Schedule with Cron

```cron
# Daily backup at 2 AM
0 2 * * * /path/to/backup-database.sh >> /var/log/vendhub/backup.log 2>&1

# Weekly full backup (kept for 90 days)
0 3 * * 0 /path/to/backup-full.sh >> /var/log/vendhub/backup.log 2>&1
```

### Cleanup Tasks

```bash
# Clean up old failed jobs in BullMQ (run monthly)
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD} --scan --pattern "bull:telegram-messages:failed*" | xargs redis-cli -a ${REDIS_PASSWORD} del

# Clean up expired sessions (run weekly)
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD} --scan --pattern "telegram:session:*" | while read key; do
  ttl=$(redis-cli -a ${REDIS_PASSWORD} TTL "$key")
  if [ "$ttl" = "-1" ]; then
    redis-cli -a ${REDIS_PASSWORD} EXPIRE "$key" 86400
  fi
done
```

---

## 📈 Scaling Guidelines

### Vertical Scaling (Single Server)

**When to scale:**
- CPU usage consistently > 70%
- Memory usage > 80%
- Response time > 1 second
- Queue depth growing

**Recommended upgrades:**
- 2 vCPU → 4 vCPU
- 4 GB RAM → 8 GB RAM
- 100 Mbps → 1 Gbps network

### Horizontal Scaling (Multiple Servers)

**Architecture:**

```
              ┌─────────────┐
              │ Load Balancer│
              └──────┬───────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
    ┌────▼───┐  ┌───▼────┐  ┌───▼────┐
    │ App 1  │  │ App 2  │  │ App 3  │
    └────┬───┘  └───┬────┘  └───┬────┘
         │          │           │
         └──────────┼───────────┘
                    │
         ┌──────────▼──────────┐
         │ PostgreSQL (Primary)│
         └──────────┬──────────┘
                    │
         ┌──────────▼──────────┐
         │   Redis Cluster     │
         └─────────────────────┘
```

**Configuration:**

1. **Load Balancer** - Nginx or AWS ALB
2. **Multiple App Instances** - 3-5 identical containers
3. **Shared PostgreSQL** - Single primary (or replica set)
4. **Redis Cluster** - For distributed sessions

**Deployment:**

```bash
# Scale to 3 instances
docker-compose up -d --scale backend=3
```

### Performance Optimization Checklist

- [ ] Enable photo compression (`PHOTO_COMPRESSION_ENABLED=true`)
- [ ] Set appropriate cache TTL (`CACHE_TTL_SECONDS=300`)
- [ ] Configure connection pooling (DB_POOL_MAX=20)
- [ ] Enable Redis persistence (RDB + AOF)
- [ ] Use CDN for static assets
- [ ] Optimize database indexes
- [ ] Enable query result caching
- [ ] Use webhook instead of polling (for high traffic)

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Bot Not Responding

**Symptoms:** Bot doesn't reply to messages

**Check:**
```bash
# Verify bot is running
docker-compose ps

# Check bot logs
docker-compose logs backend | grep -i telegram

# Test bot API
curl https://api.telegram.org/bot<YOUR_TOKEN>/getMe
```

**Solutions:**
- Verify `TELEGRAM_BOT_TOKEN` is correct
- Check network connectivity
- Ensure bot is not banned (too many requests)
- Verify webhook/polling configuration

#### 2. Database Connection Errors

**Symptoms:** "Connection refused" or "Too many connections"

**Check:**
```bash
# Check PostgreSQL status
docker-compose exec postgres pg_isready

# Check connections
docker-compose exec postgres psql -U vendhub_user -c "SELECT count(*) FROM pg_stat_activity;"
```

**Solutions:**
- Increase `max_connections` in PostgreSQL
- Reduce `DB_POOL_MAX` in application
- Check firewall rules
- Verify credentials in `.env`

#### 3. Redis Connection Errors

**Symptoms:** Sessions not working, queue jobs failing

**Check:**
```bash
# Test Redis connection
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD} PING

# Check memory usage
docker-compose exec redis redis-cli -a ${REDIS_PASSWORD} INFO memory
```

**Solutions:**
- Verify `REDIS_PASSWORD` matches
- Increase Redis max memory
- Enable eviction policy
- Check network connectivity

#### 4. Photo Upload Failures

**Symptoms:** Users can't upload photos, errors in logs

**Check:**
```bash
# Check S3 credentials
aws s3 ls s3://${S3_BUCKET} --endpoint-url=${S3_ENDPOINT}

# Check disk space
df -h
```

**Solutions:**
- Verify S3 credentials and permissions
- Check bucket exists and is accessible
- Ensure sufficient disk space
- Verify network connectivity to S3

#### 5. High Memory Usage

**Symptoms:** Application crashes with OOM errors

**Check:**
```bash
# Check memory usage
docker stats backend

# Check Node.js heap
docker-compose exec backend node -e "console.log(process.memoryUsage())"
```

**Solutions:**
- Increase container memory limit
- Reduce cache TTL
- Clear old Redis keys
- Optimize database queries
- Enable photo compression

### Performance Tuning

**Slow Response Times:**

1. **Enable query logging:**
   ```env
   DB_LOGGING=true
   ```

2. **Check slow queries:**
   ```sql
   SELECT query, mean_exec_time
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

3. **Add missing indexes:**
   ```sql
   CREATE INDEX idx_tasks_user_status
   ON tasks(assigned_user_id, status)
   WHERE deleted_at IS NULL;
   ```

4. **Enable compression:**
   ```env
   PHOTO_COMPRESSION_ENABLED=true
   PHOTO_QUALITY=80
   ```

---

## 🎯 Production Checklist

Before going live, verify:

### Security
- [ ] All secrets rotated and strong (256-bit minimum)
- [ ] SSL/TLS enabled for all services
- [ ] Database backups configured and tested
- [ ] Firewall rules configured (only necessary ports open)
- [ ] Rate limiting enabled
- [ ] Swagger disabled in production
- [ ] Error messages don't expose sensitive info

### Performance
- [ ] Photo compression enabled
- [ ] Database indexes created
- [ ] Connection pooling configured
- [ ] Redis caching enabled
- [ ] CDN configured (if applicable)

### Monitoring
- [ ] Health checks configured
- [ ] Logging configured and tested
- [ ] Error tracking (Sentry) configured
- [ ] Backup scripts tested
- [ ] Alerts configured (CPU, memory, errors)

### Testing
- [ ] All bot commands work
- [ ] Voice commands work
- [ ] Photo upload works
- [ ] Location sharing works
- [ ] Manager tools work
- [ ] Load testing completed

### Documentation
- [ ] `.env` variables documented
- [ ] Runbook created for common issues
- [ ] Team trained on troubleshooting
- [ ] Escalation procedures defined

---

## 📞 Support

For issues or questions:

1. Check logs: `docker-compose logs -f backend`
2. Review this guide
3. Contact DevOps team
4. Open GitHub issue (if bug)

---

**Deployment completed successfully! 🎉**

Your VendHub Telegram bot is now production-ready with all 9 phases implemented.
