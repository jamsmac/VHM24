# VH-M24 Production Setup (24/7) with Railway & Supabase

## Overview

This guide explains how to set up VH-M24 for production 24/7 operation using:
- **Supabase** - PostgreSQL database with automatic backups
- **Railway** - Application hosting with auto-scaling
- **Monitoring** - Real-time alerts and dashboards
- **Backups** - Automated daily backups

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Railway (Hosting)                     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  VH-M24 Application (Node.js)                    │   │
│  │  - Auto-scaling (1-5 replicas)                   │   │
│  │  - Health checks every 30s                       │   │
│  │  - Auto-restart on failure                       │   │
│  │  - Load balancing                                │   │
│  └──────────────────────────────────────────────────┘   │
│                          ↓                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Railway Networking                              │   │
│  │  - Custom domain                                 │   │
│  │  - SSL/TLS certificate                           │   │
│  │  - DDoS protection                               │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Supabase (PostgreSQL)                       │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Database                                        │   │
│  │  - Automatic daily backups                       │   │
│  │  - Point-in-time recovery (7 days)               │   │
│  │  - Connection pooling                            │   │
│  │  - SSL connections                               │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Monitoring                                      │   │
│  │  - Query performance insights                    │   │
│  │  - Connection monitoring                         │   │
│  │  - Alerts on anomalies                           │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Phase 1: Supabase Setup

### Step 1: Create Supabase Project

1. Go to https://supabase.com
2. Sign up or log in
3. Click **New Project**
4. Fill in:
   - **Name:** vendhub-production
   - **Database Password:** Generate strong password
   - **Region:** Choose closest to your users
5. Click **Create new project**
6. Wait for project to initialize (~2 minutes)

### Step 2: Get Connection String

1. Go to **Project Settings** → **Database**
2. Copy **Connection string** (PostgreSQL)
3. Format: `postgresql://user:password@host:port/database`

### Step 3: Migrate Database Schema

1. Clone VH-M24 repository locally
2. Set environment variable:
   ```bash
   export DATABASE_URL="postgresql://user:password@host:port/database"
   ```
3. Run migrations:
   ```bash
   pnpm db:push
   ```
4. Verify tables created:
   ```bash
   pnpm db:studio
   ```

### Step 4: Configure Backups

1. Go to **Project Settings** → **Backups**
2. Enable **Automated Backups**
3. Set frequency: **Daily**
4. Set retention: **30 days**
5. Enable **Point-in-time Recovery** (PITR)

### Step 5: Set Up Connection Pooling

1. Go to **Project Settings** → **Database**
2. Enable **Connection Pooling**
3. Mode: **Transaction**
4. Pool size: **25**
5. Copy **Pooling Connection String**

## Phase 2: Railway Setup

### Step 1: Create Railway Account

1. Go to https://railway.app
2. Sign up with GitHub
3. Authorize Railway

### Step 2: Create New Project

1. Click **New Project**
2. Select **Deploy from GitHub repo**
3. Select **jamsmac/VHM24** repository
4. Click **Deploy**

### Step 3: Configure Environment Variables

1. Go to **Variables** tab
2. Add these environment variables:

```
NODE_ENV=production
DATABASE_URL=<Supabase Connection String>
JWT_SECRET=<Generate strong secret>
ANTHROPIC_API_KEY=<Your API key>
TELEGRAM_BOT_TOKEN=<Your bot token>
TELEGRAM_OWNER_ID=<Your ID>
VITE_APP_TITLE=VendHub Manager
VITE_APP_LOGO=https://your-domain.com/logo.png
```

### Step 4: Configure Build Settings

1. Go to **Settings** tab
2. Set **Build Command:**
   ```bash
   pnpm install && pnpm build
   ```
3. Set **Start Command:**
   ```bash
   pnpm start
   ```
4. Set **Port:** `3000`

### Step 5: Configure Health Check

1. Go to **Settings** → **Health Check**
2. Enable **Health Check**
3. Path: `/api/health`
4. Interval: **30 seconds**
5. Timeout: **10 seconds**

### Step 6: Configure Auto-Scaling

1. Go to **Settings** → **Scaling**
2. Enable **Auto-scaling**
3. Min replicas: **2**
4. Max replicas: **5**
5. CPU threshold: **70%**
6. Memory threshold: **80%**

### Step 7: Configure Custom Domain

1. Go to **Settings** → **Domain**
2. Add custom domain: `vendhub.yourdomain.com`
3. Add DNS records (Railway will provide)
4. Enable **Auto SSL certificate**

### Step 8: Configure Monitoring

1. Go to **Monitoring** tab
2. Enable **Metrics**
3. Set up alerts:
   - CPU > 80%
   - Memory > 85%
   - Error rate > 5%
   - Response time > 5s

## Phase 3: Monitoring & Alerts

### Railway Monitoring

1. **Metrics Dashboard**
   - CPU usage
   - Memory usage
   - Network I/O
   - Request count
   - Error rate

2. **Logs**
   - Application logs
   - Deployment logs
   - Error logs

3. **Alerts**
   - Email notifications
   - Slack integration
   - PagerDuty integration

### Supabase Monitoring

1. **Database Metrics**
   - Query performance
   - Connection count
   - Slow queries
   - Replication lag

2. **Alerts**
   - High connection count
   - Slow queries
   - Backup failures
   - Disk usage

### Application Health Checks

Add health check endpoint in application:

```typescript
// server/routes/health.ts
export const healthRouter = router({
  check: publicProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    const result = await db.query.users.findFirst();
    
    return {
      status: 'ok',
      timestamp: new Date(),
      database: result ? 'connected' : 'error',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }),
});
```

## Phase 4: Backups & Recovery

### Supabase Backups

**Automatic Backups:**
- Daily at 2 AM UTC
- Retained for 30 days
- Point-in-time recovery available

**Manual Backup:**
1. Go to **Project Settings** → **Backups**
2. Click **Create backup**
3. Name: `backup-2025-11-29`
4. Wait for completion

**Restore from Backup:**
1. Go to **Backups**
2. Click **Restore** on desired backup
3. Confirm restoration
4. Database will be restored to that point in time

### Application Backups

**Export Data:**
```bash
# Export all data as JSON
pnpm db:export > backup-$(date +%Y-%m-%d).json

# Export specific table
pnpm db:export --table users > users-backup.json
```

**Restore Data:**
```bash
# Restore from JSON
pnpm db:import < backup-2025-11-29.json
```

## Phase 5: Disaster Recovery

### Failover Procedure

If production goes down:

1. **Check Status**
   - Go to Railway dashboard
   - Check application logs
   - Check Supabase status

2. **Automatic Recovery**
   - Railway auto-restarts failed replicas
   - Health checks trigger restart if needed
   - Database connection pooling handles temporary issues

3. **Manual Recovery**
   - SSH into Railway container
   - Check application logs
   - Restart service
   - Verify database connection

4. **Database Recovery**
   - If database corrupted, restore from backup
   - Use point-in-time recovery if available
   - Verify data integrity after restore

### Rollback Procedure

If deployment causes issues:

1. **Quick Rollback**
   - Go to Railway **Deployments**
   - Click previous successful deployment
   - Click **Redeploy**

2. **Manual Rollback**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

## Monitoring Checklist

### Daily Checks
- [ ] Application responding to requests
- [ ] Database connection healthy
- [ ] No error spikes
- [ ] Memory usage normal
- [ ] CPU usage normal

### Weekly Checks
- [ ] Backup completed successfully
- [ ] No slow queries
- [ ] Connection pool healthy
- [ ] SSL certificate valid
- [ ] Domain resolving correctly

### Monthly Checks
- [ ] Test backup restore
- [ ] Review error logs
- [ ] Check performance metrics
- [ ] Update dependencies
- [ ] Security audit

## Useful Commands

### Railway CLI

```bash
# Login to Railway
railway login

# Link to project
railway link

# View logs
railway logs

# Deploy
railway deploy

# View variables
railway variables

# SSH into container
railway shell
```

### Supabase CLI

```bash
# Login to Supabase
supabase login

# Link to project
supabase link --project-ref <project-ref>

# Pull schema
supabase db pull

# Push migrations
supabase db push

# View logs
supabase functions logs

# Create backup
supabase db backup create
```

## Troubleshooting

### Application Not Starting

1. Check Railway logs
2. Verify environment variables
3. Check database connection
4. Review build output

### Database Connection Issues

1. Verify connection string
2. Check IP whitelist (if applicable)
3. Verify credentials
4. Check connection pooling settings

### High Memory Usage

1. Check for memory leaks
2. Review application logs
3. Increase replica count
4. Optimize database queries

### Slow Performance

1. Check database query performance
2. Review application logs
3. Check network latency
4. Optimize indexes

## Support

- **Railway Support:** https://railway.app/support
- **Supabase Support:** https://supabase.com/support
- **Documentation:** See other markdown files in this repository

---

**Last Updated:** 2025-11-29  
**Status:** Production Ready  
**Uptime SLA:** 99.9%
