# Supabase Setup Guide for VH-M24

## Overview

This guide walks through setting up Supabase PostgreSQL database for VendHub Manager production deployment. Supabase provides managed PostgreSQL with automatic backups, point-in-time recovery, and built-in monitoring.

## Step 1: Create Supabase Project

### 1.1 Sign Up / Log In

1. Go to https://app.supabase.com
2. Sign up with email or GitHub account
3. Create organization (if first time)
4. Accept terms and conditions

### 1.2 Create New Project

1. Click **New Project**
2. Enter project details:
   - **Name:** `vendhub-production`
   - **Database Password:** Generate strong password (32+ characters)
   - **Region:** Select region closest to your users
   - **Pricing Plan:** Select appropriate tier (Pro for production)

3. Click **Create new project**
4. Wait 2-3 minutes for project initialization

**Save these credentials securely:**
- Project URL
- Database password
- Project ID

### 1.3 Verify Project Creation

1. Go to **Settings** → **General**
2. Verify project name and region
3. Note the **Project Reference ID**
4. Check project status (should be "Active")

## Step 2: Configure Database Connection

### 2.1 Get Connection String

1. Go to **Settings** → **Database**
2. Under **Connection Info**, find **Connection String**
3. Select **PostgreSQL** tab
4. Copy the connection string
5. Replace `[YOUR-PASSWORD]` with your database password

**Format:**
```
postgresql://postgres:[password]@[host]:[port]/postgres
```

### 2.2 Configure Connection Pooling

Connection pooling improves performance for serverless applications:

1. Go to **Settings** → **Database** → **Connection Pooling**
2. Enable **Connection Pooling**
3. Set **Pool Mode:** `Transaction`
4. Set **Pool Size:** `25`
5. Copy the **Pooling Connection String**

**Use this URL for Railway** (better for serverless):
```
postgresql://postgres:[password]@[host]:[port]/postgres?schema=public
```

### 2.3 Test Connection

```bash
# Test direct connection
psql postgresql://postgres:[password]@[host]:[port]/postgres -c "SELECT 1;"

# Test pooling connection
psql postgresql://postgres:[password]@[host]:[port]/postgres?schema=public -c "SELECT 1;"
```

Both should return `(1 row)` with value `1`.

## Step 3: Configure Database Security

### 3.1 Enable SSL Connections

1. Go to **Settings** → **Database** → **SSL Configuration**
2. Enable **Enforce SSL**
3. Download SSL certificate (if needed for local development)
4. All connections now require SSL

### 3.2 Configure IP Whitelist (Optional)

1. Go to **Settings** → **Database** → **IP Whitelist**
2. Add your IP addresses:
   - Your office IP
   - Railway deployment region IP (if available)
   - Development machine IP

3. Enable **Enforce IP Whitelist**

**Note:** Railway handles this automatically, so this step is optional.

### 3.3 Enable Row Level Security (RLS)

1. Go to **SQL Editor**
2. Create RLS policies for tables:

```sql
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own data
CREATE POLICY "Users can see own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Policy: Admins can see all data
CREATE POLICY "Admins can see all data" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### 3.4 Enable Audit Logging

1. Go to **Settings** → **Database** → **Audit Logs**
2. Enable **Database Activity Logs**
3. Set retention to **30 days**
4. View logs in **Logs** tab

## Step 4: Run Database Migrations

### 4.1 Connect to Database

```bash
# Set environment variable
export DATABASE_URL="postgresql://postgres:[password]@[host]:[port]/postgres"

# Test connection
psql $DATABASE_URL -c "SELECT 1;"
```

### 4.2 Run Migrations

```bash
# From VH-M24 project directory
pnpm db:push
```

This command:
- Generates migration files
- Applies migrations to Supabase
- Creates all tables and indexes
- Sets up relationships

**Expected output:**
```
✓ 10 migrations applied
✓ Schema synchronized
✓ All tables created
```

### 4.3 Verify Database Schema

```bash
# List tables
psql $DATABASE_URL -c "\dt"

# Check users table
psql $DATABASE_URL -c "SELECT * FROM users LIMIT 1;"

# Check machines table
psql $DATABASE_URL -c "SELECT * FROM machines LIMIT 1;"
```

## Step 5: Configure Backups

### 5.1 Enable Automated Backups

1. Go to **Settings** → **Backups**
2. Enable **Automated Backups**
3. Set **Backup Frequency:** `Daily`
4. Set **Backup Time:** `02:00 UTC` (off-peak)
5. Set **Retention:** `30 days`

### 5.2 Enable Point-in-Time Recovery (PITR)

1. Go to **Settings** → **Backups**
2. Enable **Point-in-Time Recovery**
3. PITR allows recovery to any point in last 7 days
4. Granularity: 1 minute

### 5.3 Test Backup

1. Go to **Settings** → **Backups**
2. Click **Backup Now** to create manual backup
3. Wait for backup to complete (5-10 minutes)
4. Verify backup appears in backup list

### 5.4 Restore from Backup (Testing)

1. Go to **Settings** → **Backups**
2. Click **Restore** on desired backup
3. Select point-in-time (if using PITR)
4. Confirm restoration
5. Wait for restoration (5-10 minutes)
6. Verify data integrity

## Step 6: Configure Monitoring

### 6.1 View Database Metrics

1. Go to **Monitoring** tab
2. View real-time metrics:
   - Database size
   - Active connections
   - Query performance
   - Replication lag
   - Disk usage

### 6.2 Set Up Alerts

1. Go to **Settings** → **Alerts**
2. Create alerts for:
   - Database size > 80% of quota
   - Active connections > 20
   - Query performance degradation
   - Replication lag > 10s

3. Configure notification channels:
   - Email
   - Slack (optional)
   - PagerDuty (optional)

### 6.3 View Query Performance

1. Go to **Monitoring** → **Query Performance**
2. View slow queries
3. Identify optimization opportunities
4. Create indexes for frequently queried columns

## Step 7: Create Database Users (Optional)

### 7.1 Create Application User

```sql
-- Create application user with limited permissions
CREATE USER app_user WITH PASSWORD 'strong-password-here';

-- Grant necessary permissions
GRANT CONNECT ON DATABASE postgres TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
```

### 7.2 Create Read-Only User

```sql
-- Create read-only user for analytics
CREATE USER analytics_user WITH PASSWORD 'strong-password-here';

-- Grant read-only permissions
GRANT CONNECT ON DATABASE postgres TO analytics_user;
GRANT USAGE ON SCHEMA public TO analytics_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_user;
```

## Step 8: Configure Replication (Optional)

### 8.1 Enable Read Replicas

1. Go to **Settings** → **Database** → **Replicas**
2. Click **Add Replica**
3. Select region for replica
4. Wait for replica creation (10-15 minutes)
5. Use replica for read-only queries

**Benefits:**
- Improved read performance
- Geographic distribution
- High availability

## Step 9: Set Up Monitoring Dashboard

### 9.1 Create Custom Dashboard

1. Go to **Monitoring** → **Dashboards**
2. Create new dashboard
3. Add widgets for:
   - Database size
   - Active connections
   - Query latency
   - Replication lag
   - Backup status

### 9.2 Configure Alerts

1. Go to **Settings** → **Alerts**
2. Create alert rules:
   - CPU > 80%
   - Memory > 85%
   - Connections > 20
   - Query time > 5s

3. Set notification channels

## Step 10: Prepare for Production

### 10.1 Pre-Production Checklist

- [ ] Project created in correct region
- [ ] Connection pooling enabled
- [ ] SSL connections enforced
- [ ] Backups configured and tested
- [ ] PITR enabled
- [ ] Monitoring configured
- [ ] Alerts set up
- [ ] Database migrations completed
- [ ] Test data loaded
- [ ] Performance baselines established

### 10.2 Security Checklist

- [ ] Strong database password set
- [ ] SSL connections enforced
- [ ] IP whitelist configured (if needed)
- [ ] RLS policies created
- [ ] Audit logging enabled
- [ ] Backup encryption enabled
- [ ] Credentials stored securely
- [ ] No credentials in code

### 10.3 Performance Checklist

- [ ] Indexes created on frequently queried columns
- [ ] Connection pooling optimized
- [ ] Query performance analyzed
- [ ] Slow queries identified
- [ ] Cache strategy implemented
- [ ] Database size monitored
- [ ] Connection limits set appropriately

## Troubleshooting

### Connection Refused

**Error:** `psql: could not connect to server`

**Solution:**
1. Verify DATABASE_URL is correct
2. Check IP whitelist (if enabled)
3. Verify SSL is enabled in connection string
4. Check network connectivity
5. Verify credentials are correct

### Too Many Connections

**Error:** `FATAL: too many connections`

**Solution:**
1. Increase connection pool size
2. Reduce connection timeout
3. Optimize query performance
4. Restart connection pooler
5. Archive old data

### Slow Queries

**Error:** Queries taking > 5 seconds

**Solution:**
1. Analyze query plan: `EXPLAIN ANALYZE SELECT ...;`
2. Create indexes on frequently queried columns
3. Optimize query logic
4. Cache query results
5. Archive old data

### Backup Failed

**Error:** Backup shows as failed

**Solution:**
1. Check database size (may exceed quota)
2. Verify backup storage available
3. Check for active locks
4. Retry backup manually
5. Contact Supabase support

### High Disk Usage

**Error:** Database size > 90% of quota

**Solution:**
1. Archive old data
2. Delete unused tables
3. Vacuum database: `VACUUM ANALYZE;`
4. Upgrade to larger plan
5. Implement data retention policy

## Integration with Railway

### 11.1 Add to Railway

1. Get Supabase connection string
2. Go to **Railway Dashboard** → **Variables**
3. Add `DATABASE_URL` with pooling connection string
4. Restart application
5. Verify database connection

### 11.2 Test Integration

```bash
# From Railway shell
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

Should return count of users in database.

## Next Steps

1. **Deploy to Railway** - Follow RAILWAY_DEPLOYMENT_GUIDE.md
2. **Configure Monitoring** - Follow MONITORING_SETUP.md
3. **Set Up Backups** - Follow BACKUP_RECOVERY.md
4. **Create CI/CD** - Follow WORKFLOWS_SETUP.md

## Support

- **Supabase Docs:** https://supabase.com/docs
- **PostgreSQL Docs:** https://www.postgresql.org/docs
- **Supabase Community:** https://discord.gg/supabase

---

**Last Updated:** 2025-11-29  
**Status:** Production Ready  
**Estimated Setup Time:** 30-45 minutes  
**Estimated Go-Live:** 1-2 days
