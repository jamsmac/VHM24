# Railway Deployment Guide for VH-M24

## Overview

This guide walks through deploying VendHub Manager to Railway with Supabase PostgreSQL for 24/7 production operation. The deployment includes auto-scaling, health checks, monitoring, and automatic backups.

## Prerequisites

Before starting, ensure you have:
- Railway account (https://railway.app)
- Supabase account (https://supabase.com)
- GitHub account with access to jamsmac/VHM24 repository
- Custom domain (optional but recommended)

## Step 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to https://app.supabase.com
2. Click **New Project**
3. Enter project name: `vendhub-production`
4. Select region closest to your users
5. Generate strong database password
6. Click **Create new project**
7. Wait 2-3 minutes for project initialization

### 1.2 Get Connection String

1. Go to **Settings** → **Database**
2. Copy the **Connection string** (PostgreSQL)
3. Replace `[YOUR-PASSWORD]` with your database password
4. This is your `DATABASE_URL` for Railway

**Format:** `postgresql://postgres:[password]@[host]:[port]/postgres`

### 1.3 Configure Connection Pooling

1. Go to **Settings** → **Database** → **Connection Pooling**
2. Enable **Connection Pooling**
3. Set mode to **Transaction**
4. Set pool size to **25**
5. Copy the **Pooling Connection String**
6. Use this as your `DATABASE_URL` in Railway (better for serverless)

### 1.4 Enable Backups

1. Go to **Settings** → **Backups**
2. Enable **Automated Backups**
3. Set frequency to **Daily**
4. Set retention to **30 days**
5. Enable **Point-in-Time Recovery (PITR)**

### 1.5 Run Database Migrations

Once Railway is deployed (see Step 2), connect to Supabase and run:

```bash
# From Railway shell
pnpm db:push
```

This creates all tables and indexes in Supabase.

## Step 2: Railway Deployment

### 2.1 Connect GitHub Repository

1. Go to https://railway.app/dashboard
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Click **Configure GitHub App** (if first time)
5. Authorize Railway to access your GitHub account
6. Select **jamsmac/VHM24** repository
7. Click **Deploy**

Railway will automatically:
- Detect Node.js project
- Build using Dockerfile
- Deploy to production
- Set up health checks

### 2.2 Configure Environment Variables

1. Go to **Railway Dashboard** → **VH-M24 Project**
2. Click **Variables** tab
3. Add the following variables:

| Variable | Value | Source |
|----------|-------|--------|
| `NODE_ENV` | `production` | Static |
| `DATABASE_URL` | Supabase pooling connection string | Supabase Settings |
| `JWT_SECRET` | Generate strong secret (32+ chars) | Generate |
| `ANTHROPIC_API_KEY` | Your Anthropic API key | Your account |
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token | Telegram BotFather |
| `TELEGRAM_OWNER_ID` | Your Telegram user ID | Your account |
| `VITE_APP_TITLE` | `VendHub Manager` | Static |
| `VITE_APP_LOGO` | Your logo URL | Your server |

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2.3 Monitor Initial Deployment

1. Go to **Railway Dashboard** → **Deployments**
2. Watch the build progress
3. Check logs for errors
4. Expected build time: 5-10 minutes

**Success indicators:**
- Build completes without errors
- Container starts successfully
- Health check passes (green checkmark)

### 2.4 Configure Custom Domain

1. Go to **Railway Dashboard** → **Settings** → **Domain**
2. Click **Add Custom Domain**
3. Enter your domain: `vendhub.yourdomain.com`
4. Railway provides DNS records to add
5. Add DNS records to your domain registrar
6. Wait for SSL certificate (5-10 minutes)
7. Test HTTPS: `https://vendhub.yourdomain.com`

## Step 3: Database Initialization

### 3.1 Connect to Railway Shell

1. Go to **Railway Dashboard** → **VH-M24 Project**
2. Click **Terminal** tab
3. You now have shell access to the running container

### 3.2 Run Migrations

```bash
# Inside Railway shell
pnpm db:push
```

This command:
- Generates database migrations
- Applies migrations to Supabase
- Creates all tables and indexes
- Sets up relationships

### 3.3 Verify Database

```bash
# Inside Railway shell
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

Should return `(1 row)` with count 0 (empty table).

## Step 4: Configure Monitoring

### 4.1 Enable Railway Monitoring

1. Go to **Railway Dashboard** → **Monitoring**
2. Enable **Metrics**
3. View real-time:
   - CPU usage
   - Memory usage
   - Network I/O
   - Deployment status

### 4.2 Set Up Alerts

1. Go to **Railway Dashboard** → **Settings** → **Alerts**
2. Create alerts for:
   - CPU > 80%
   - Memory > 85%
   - Build failures
   - Deployment failures

3. Configure notification channels:
   - Email
   - Slack (optional)
   - PagerDuty (optional)

### 4.3 Configure Auto-Scaling

1. Go to **Railway Dashboard** → **Settings** → **Scaling**
2. Set **Min Replicas:** 2
3. Set **Max Replicas:** 5
4. Set **CPU Threshold:** 70%
5. Set **Memory Threshold:** 80%

Railway will automatically scale based on load.

## Step 5: Health Checks

### 5.1 Verify Health Endpoints

Test the health check endpoints:

```bash
# Check application health
curl https://vendhub.yourdomain.com/api/health/check

# Check readiness
curl https://vendhub.yourdomain.com/api/health/ready

# Check liveness
curl https://vendhub.yourdomain.com/api/health/live
```

Expected responses:
```json
{
  "status": "ok",
  "timestamp": "2025-11-29T12:00:00Z",
  "uptime": 3600
}
```

### 5.2 Monitor Health Checks

1. Go to **Railway Dashboard** → **Monitoring** → **Health**
2. View health check history
3. Check for any failures
4. Verify checks run every 30 seconds

## Step 6: Testing

### 6.1 Test API Endpoints

```bash
# Test health endpoint
curl https://vendhub.yourdomain.com/api/health/check

# Test API (requires authentication)
curl -H "Authorization: Bearer $TOKEN" \
  https://vendhub.yourdomain.com/api/trpc/machines.list
```

### 6.2 Test Database Connection

```bash
# From Railway shell
psql $DATABASE_URL -c "SELECT * FROM machines LIMIT 1;"
```

### 6.3 Test Backups

1. Go to **Supabase Dashboard** → **Settings** → **Backups**
2. Verify daily backup is scheduled
3. Check last backup timestamp
4. Test restore procedure (see BACKUP_RECOVERY.md)

## Step 7: Monitoring & Alerts

### 7.1 Set Up Uptime Monitoring (Optional)

Use UptimeRobot for external monitoring:

1. Go to https://uptimerobot.com
2. Create new monitor
3. Set URL: `https://vendhub.yourdomain.com/api/health/check`
4. Set interval: 5 minutes
5. Configure alerts

### 7.2 View Logs

1. Go to **Railway Dashboard** → **Logs**
2. Filter by severity:
   - Error
   - Warning
   - Info
3. Search for specific keywords
4. Export logs for analysis

### 7.3 Performance Metrics

1. Go to **Railway Dashboard** → **Metrics**
2. Monitor:
   - Response time (p95, p99)
   - Error rate
   - Request count
   - Database queries

## Step 8: Deployment Verification

### 8.1 Pre-Launch Checklist

- [ ] Application deployed to Railway
- [ ] Database running on Supabase
- [ ] Environment variables configured
- [ ] Health checks passing
- [ ] Database migrations completed
- [ ] SSL certificate valid
- [ ] Custom domain resolving
- [ ] Monitoring configured
- [ ] Backups scheduled
- [ ] Alerts configured

### 8.2 Post-Launch Verification

- [ ] Application accessible from public internet
- [ ] All API endpoints working
- [ ] Database queries fast
- [ ] No error spikes
- [ ] Monitoring dashboards showing data
- [ ] Backups running automatically
- [ ] Alerts working correctly

## Troubleshooting

### Build Fails

**Error:** Build step fails with dependency errors

**Solution:**
1. Check `pnpm-lock.yaml` is committed
2. Verify Node.js version matches (22.x)
3. Check for missing environment variables during build
4. View full build logs in Railway

### Application Won't Start

**Error:** Container starts but application crashes

**Solution:**
1. Check logs: `Railway Dashboard` → **Logs**
2. Verify DATABASE_URL is correct
3. Verify all required environment variables set
4. Check database migrations completed
5. Restart deployment

### Health Check Fails

**Error:** Health check endpoint returns 500

**Solution:**
1. Check database connection: `psql $DATABASE_URL -c "SELECT 1;"`
2. Verify DATABASE_URL is correct
3. Check application logs for errors
4. Restart application

### High Memory Usage

**Error:** Memory usage > 90%

**Solution:**
1. Check for memory leaks in logs
2. Increase instance size
3. Enable auto-scaling
4. Optimize database queries
5. Clear cache

### Database Connection Issues

**Error:** Too many connections or connection timeout

**Solution:**
1. Increase connection pool size in Supabase
2. Reduce connection timeout
3. Optimize query performance
4. Restart connection pooler

## Next Steps

1. **Configure Monitoring** - Follow MONITORING_SETUP.md
2. **Set Up Backups** - Follow BACKUP_RECOVERY.md
3. **Create CI/CD Workflows** - Follow WORKFLOWS_SETUP.md
4. **Test Disaster Recovery** - Follow SETUP_CHECKLIST.md Phase 8
5. **Go Live** - Follow SETUP_CHECKLIST.md Phases 9-10

## Support

- **Railway Docs:** https://docs.railway.app
- **Supabase Docs:** https://supabase.com/docs
- **PostgreSQL Docs:** https://www.postgresql.org/docs
- **Node.js Docs:** https://nodejs.org/docs

---

**Last Updated:** 2025-11-29  
**Status:** Production Ready  
**Estimated Deployment Time:** 30-45 minutes  
**Estimated Go-Live:** 1-2 days
