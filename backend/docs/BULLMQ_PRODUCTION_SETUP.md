# BullMQ Production Setup Guide

Complete guide for deploying BullMQ commission workers in production.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Redis Installation](#redis-installation)
- [Worker Deployment](#worker-deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Node.js 18+ installed
- PM2 installed globally: `npm install -g pm2`
- Redis 6+ installed and running
- PostgreSQL 14+ database configured
- `.env` file configured with proper credentials

---

## Redis Installation

### Ubuntu/Debian
```bash
# Install Redis
sudo apt update
sudo apt install redis-server

# Configure Redis for production
sudo nano /etc/redis/redis.conf

# Recommended settings:
# bind 127.0.0.1 ::1
# maxmemory 2gb
# maxmemory-policy allkeys-lru
# save 900 1
# save 300 10
# save 60 10000

# Start Redis
sudo systemctl start redis
sudo systemctl enable redis

# Verify
redis-cli ping
# Should return: PONG
```

### Docker (Alternative)
```bash
docker run -d \
  --name redis \
  -p 6379:6379 \
  -v redis-data:/data \
  redis:7-alpine redis-server --appendonly yes
```

---

## Worker Deployment

### 1. Build the Application

```bash
cd /path/to/VendHub/backend
npm install
npm run build
```

### 2. Configure Environment

Create or update `.env` file:
```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_password_here

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=vendhub
DATABASE_PASSWORD=your_db_password
DATABASE_NAME=vendhub_db

# Application
NODE_ENV=production
PORT=3000
```

### 3. Start Workers with PM2

```bash
# Start all workers (API + Workers + Scheduler)
pm2 start ecosystem.config.js --env production

# Or start specific workers:
pm2 start ecosystem.config.js --only commission-worker --env production
pm2 start ecosystem.config.js --only job-scheduler --env production
pm2 start ecosystem.config.js --only sales-import-worker --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
```

### 4. Verify Workers are Running

```bash
# List all processes
pm2 list

# Expected output:
# ┌──────────┬─────┬─────────┬─────────┐
# │   name   │ id  │  mode   │ status  │
# ├──────────┼─────┼─────────┼─────────┤
# │ vendhub-api           │ 0   │ cluster │ online  │
# │ commission-worker     │ 1   │ fork    │ online  │
# │ sales-import-worker   │ 2   │ fork    │ online  │
# │ job-scheduler         │ 3   │ fork    │ online  │
# └──────────┴─────┴─────────┴─────────┘

# View logs
pm2 logs commission-worker
pm2 logs job-scheduler

# Monitor in real-time
pm2 monit
```

---

## Scheduled Jobs Configuration

The job scheduler automatically sets up these cron jobs:

| Job | Schedule | Description |
|-----|----------|-------------|
| `calculate-daily` | `0 2 * * *` | Daily commissions at 2:00 AM (Tashkent) |
| `calculate-weekly` | `0 3 * * 1` | Weekly commissions at 3:00 AM Monday |
| `calculate-monthly` | `0 4 1 * *` | Monthly commissions at 4:00 AM on 1st |
| `check-overdue` | `0 6 * * *` | Overdue checks at 6:00 AM daily |

### Verify Scheduled Jobs

```bash
# Check scheduler logs
pm2 logs job-scheduler | grep "scheduled"

# You should see:
# ✓ Daily commission job scheduled: 2:00 AM (Asia/Tashkent)
# ✓ Weekly commission job scheduled: 3:00 AM Monday (Asia/Tashkent)
# ✓ Monthly commission job scheduled: 4:00 AM on 1st (Asia/Tashkent)
# ✓ Overdue check job scheduled: 6:00 AM daily (Asia/Tashkent)
```

---

## Monitoring

### 1. BullMQ Board (Web UI)

Access at: `http://your-server:3000/admin/queues`

**Note:** Requires admin JWT token authentication.

Features:
- View all queues in real-time
- Monitor job progress
- Retry failed jobs
- View job details and logs
- Clean completed/failed jobs

### 2. Health Checks

```bash
# Check overall health
curl http://localhost:3000/health

# Check queue statistics
curl http://localhost:3000/health/queues

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-11-15T10:00:00.000Z",
  "queues": {
    "commission-calculations": {
      "waiting": 0,
      "active": 0,
      "completed": 123,
      "failed": 2,
      "delayed": 0,
      "paused": 0
    },
    "sales-import": {
      "waiting": 0,
      "active": 0,
      "completed": 45,
      "failed": 0,
      "delayed": 0,
      "paused": 0
    }
  }
}
```

### 3. PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# View logs
pm2 logs --lines 100

# Check memory usage
pm2 info commission-worker

# View PM2 Plus (web dashboard)
pm2 plus
```

### 4. Redis Monitoring

```bash
# Check Redis stats
redis-cli info stats

# Monitor commands in real-time
redis-cli monitor

# Check memory usage
redis-cli info memory

# View connected clients
redis-cli client list
```

---

## Manual Job Triggering

### Via API (requires admin auth)

```bash
# Trigger manual calculation for all periods
curl -X POST http://localhost:3000/commissions/calculate-now \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response:
{
  "message": "Commission calculation job queued",
  "job_id": "12345",
  "period": "all",
  "status": "queued"
}

# Check job status
curl http://localhost:3000/commissions/jobs/12345 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Via Redis CLI (development only)

```bash
redis-cli

# List all queues
KEYS bull:commission-calculations:*

# View queue info
LLEN bull:commission-calculations:waiting
LLEN bull:commission-calculations:active
LLEN bull:commission-calculations:completed
LLEN bull:commission-calculations:failed
```

---

## Troubleshooting

### Workers Not Processing Jobs

**Check 1: Worker is running**
```bash
pm2 list | grep worker
pm2 logs commission-worker --lines 50
```

**Check 2: Redis connection**
```bash
pm2 logs commission-worker | grep "Redis"
# Should see: "Connected to Redis: localhost:6379"
```

**Check 3: Queue has jobs**
```bash
curl http://localhost:3000/health/queues
```

### Failed Jobs

**View failed jobs in BullMQ Board:**
1. Go to `http://localhost:3000/admin/queues`
2. Click on "commission-calculations" queue
3. Click "Failed" tab
4. Click on a failed job to see error details
5. Click "Retry" to reprocess

**Or via PM2 logs:**
```bash
pm2 logs commission-worker | grep "failed"
```

### High Memory Usage

**Check worker memory:**
```bash
pm2 info commission-worker | grep memory

# If > 512MB, restart worker:
pm2 restart commission-worker
```

**Configure automatic restarts on high memory:**
Already configured in `ecosystem.config.js`:
```javascript
max_memory_restart: '512M', // Auto-restart if exceeds 512MB
cron_restart: '0 0 * * *',  // Daily restart at midnight
```

### Jobs Stuck in "Active" State

This happens if a worker crashes while processing.

**Solution:**
```bash
# Restart the worker
pm2 restart commission-worker

# Jobs will move back to "waiting" queue automatically
```

### Repeatable Jobs Not Running

**Check scheduler is running:**
```bash
pm2 list | grep scheduler
pm2 logs job-scheduler
```

**Verify jobs are scheduled:**
```bash
curl http://localhost:3000/health/queues
# Look for "delayed" jobs count
```

**Restart scheduler to re-register jobs:**
```bash
pm2 restart job-scheduler
```

---

## Performance Tuning

### Redis Optimization

```bash
# /etc/redis/redis.conf
maxmemory 4gb                    # Increase if you have RAM
maxmemory-policy allkeys-lru     # Evict least recently used
save 900 1                       # Backup every 15 min if 1+ key changed
tcp-backlog 511                  # Increase connection queue
timeout 300                      # Close idle clients after 5 min
```

### Worker Scaling

```javascript
// ecosystem.config.js
{
  name: 'commission-worker',
  instances: 4, // Increase from 2 to 4 for more throughput
  // ...
}
```

Then restart:
```bash
pm2 restart commission-worker
```

### Database Connection Pool

```bash
# .env
DB_POOL_MAX=20  # Increase for high load
DB_POOL_MIN=5
```

---

## Backup & Recovery

### Backup Redis Data

```bash
# Manual backup
redis-cli BGSAVE

# Backup file location
ls -lh /var/lib/redis/dump.rdb

# Automated daily backups
crontab -e
# Add:
0 2 * * * redis-cli BGSAVE && cp /var/lib/redis/dump.rdb /backup/redis-$(date +\%Y\%m\%d).rdb
```

### Restore Redis Data

```bash
# Stop Redis
sudo systemctl stop redis

# Replace dump.rdb
sudo cp /backup/redis-20251115.rdb /var/lib/redis/dump.rdb
sudo chown redis:redis /var/lib/redis/dump.rdb

# Start Redis
sudo systemctl start redis
```

---

## Security Checklist

- [ ] Redis password set (REDIS_PASSWORD in .env)
- [ ] Redis only bound to localhost
- [ ] JWT_SECRET is random and secure (64+ characters)
- [ ] BullMQ Board protected by admin auth
- [ ] PM2 logs rotated (pm2 install pm2-logrotate)
- [ ] Firewall configured (Redis port 6379 not exposed externally)
- [ ] SSL/TLS enabled for production API
- [ ] Database credentials stored securely

---

## Additional Resources

- [BullMQ Documentation](https://docs.bullmq.io/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [VendHub Backend Docs](/backend/docs/)

---

## Support

For issues or questions:
1. Check PM2 logs: `pm2 logs`
2. Check Redis logs: `sudo journalctl -u redis`
3. Check health endpoints: `/health/queues`
4. View BullMQ Board: `/admin/queues`

**Emergency stop all workers:**
```bash
pm2 stop all
```

**Emergency restart:**
```bash
pm2 restart all
```
