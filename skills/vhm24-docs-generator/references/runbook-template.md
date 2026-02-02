# Runbook Templates для VendHub

## Что такое Runbook

Runbook — пошаговая инструкция для выполнения операционных задач. Используется для:
- Deployment процедур
- Incident response
- Maintenance tasks
- Disaster recovery

## Структура Runbook

```markdown
# [Operation Name] Runbook

## Overview
Brief description of what this runbook covers.

## Prerequisites
- [ ] Access to production servers
- [ ] Database credentials
- [ ] Monitoring access

## Procedure

### Step 1: [Step Name]
Description of what to do.

```bash
# Commands to execute
command here
```

**Expected output:**
```
Expected output here
```

**Rollback:**
```bash
# If something goes wrong
rollback command
```

### Step 2: [Step Name]
...

## Verification
How to verify the operation was successful.

## Troubleshooting
Common issues and solutions.

## Contacts
Who to contact if issues occur.
```

---

## Runbook: Deploy to Production

```markdown
# Deploy to Production Runbook

## Overview
This runbook covers the deployment of VendHub to production environment.

## Prerequisites
- [ ] All tests passing on staging
- [ ] Code review approved
- [ ] Database migrations tested on staging
- [ ] Stakeholder approval (for major releases)
- [ ] Maintenance window scheduled (if needed)

## Pre-Deployment Checklist

- [ ] Notify team in #vendhub-deploys channel
- [ ] Check current production metrics (baseline)
- [ ] Verify backup completed today
- [ ] Review changelog for breaking changes

## Procedure

### Step 1: Create Release Tag

```bash
# Ensure on main branch with latest code
git checkout main
git pull origin main

# Create release tag
VERSION="v1.2.3"  # Update version
git tag -a $VERSION -m "Release $VERSION"
git push origin $VERSION
```

**Expected:** Tag created and pushed to GitHub.

### Step 2: Monitor CI/CD Pipeline

1. Go to GitHub Actions: https://github.com/vendhub/vendhub-os/actions
2. Find the workflow triggered by the tag
3. Monitor all jobs: lint → test → build → deploy

**Expected:** All jobs green, deployment initiated.

### Step 3: Verify Database Migrations

```bash
# Check migration status
railway run --environment production npm run migration:show

# If needed, run migrations manually
railway run --environment production npm run migration:run
```

**Expected:** All migrations applied, no pending migrations.

**Rollback:**
```bash
# Revert last migration
railway run --environment production npm run migration:revert
```

### Step 4: Health Check

```bash
# Run health check script
./skills/vhm24-devops/scripts/health-check.sh production
```

**Expected output:**
```
✓ API Health: OK (200)
✓ Frontend: OK (200)
✓ API Response Time: 0.15s (< 1s)
All critical checks passed!
```

### Step 5: Smoke Testing

Manually verify critical paths:

- [ ] Login via Telegram
- [ ] View dashboard
- [ ] Create a test task
- [ ] Upload a photo
- [ ] Complete the task
- [ ] Check real-time updates

### Step 6: Monitor for 30 Minutes

1. Watch Grafana dashboard: https://grafana.vendhub.uz
2. Monitor error rate (should be < 1%)
3. Check response times (should be < 200ms p95)
4. Watch Sentry for new errors

## Verification

- [ ] Health check passing
- [ ] Error rate normal
- [ ] Response times normal
- [ ] No new errors in Sentry
- [ ] Users can login and perform tasks

## Rollback Procedure

If issues detected:

```bash
# Quick rollback to previous version
./skills/vhm24-devops/scripts/rollback.sh production v1.2.2

# Verify rollback
./skills/vhm24-devops/scripts/health-check.sh production
```

## Post-Deployment

- [ ] Update CHANGELOG.md
- [ ] Notify team of successful deployment
- [ ] Close related tickets/issues
- [ ] Update documentation if needed

## Troubleshooting

### High Error Rate After Deploy

1. Check Sentry for specific errors
2. Check application logs: `railway logs --environment production`
3. If critical, rollback immediately
4. If minor, hotfix and redeploy

### Database Migration Failed

1. Check migration logs
2. DO NOT run migration:revert without understanding the failure
3. Fix migration and redeploy, or rollback entire release

### Frontend Not Loading

1. Check Vercel deployment status
2. Verify NEXT_PUBLIC_API_URL is correct
3. Check browser console for errors
4. Clear CDN cache if needed

## Contacts

| Role | Name | Contact |
|------|------|---------|
| Tech Lead | [Name] | @telegram |
| DevOps | [Name] | @telegram |
| Product Owner | [Name] | @telegram |
```

---

## Runbook: Database Backup & Restore

```markdown
# Database Backup & Restore Runbook

## Overview
Procedures for backing up and restoring VendHub PostgreSQL database.

## Prerequisites
- [ ] Database admin credentials
- [ ] Access to backup storage (S3/R2)
- [ ] pg_dump and pg_restore installed

## Backup Procedure

### Manual Backup

```bash
# Set variables
export PGHOST=your-db-host
export PGUSER=your-db-user
export PGPASSWORD=your-db-password
export PGDATABASE=vendhub_production

# Create backup
BACKUP_FILE="vendhub_$(date +%Y%m%d_%H%M%S).sql.gz"
pg_dump --format=custom --compress=9 > $BACKUP_FILE

# Upload to S3/R2
aws s3 cp $BACKUP_FILE s3://vendhub-backups/database/$BACKUP_FILE
```

### Verify Backup

```bash
# List tables in backup
pg_restore --list $BACKUP_FILE | head -50

# Check backup size
ls -lh $BACKUP_FILE
```

## Restore Procedure

### Full Restore (CAUTION!)

```bash
# Download backup
aws s3 cp s3://vendhub-backups/database/$BACKUP_FILE .

# Stop application
railway stop --environment production

# Restore
pg_restore --clean --if-exists --no-owner -d $PGDATABASE $BACKUP_FILE

# Start application
railway start --environment production

# Verify
./skills/vhm24-devops/scripts/health-check.sh production
```

### Partial Restore (Single Table)

```bash
# Extract specific table
pg_restore --table=tasks -d $PGDATABASE $BACKUP_FILE
```

## Automated Backups

Configured via cron on backup server:

```bash
# /etc/cron.d/vendhub-backup
0 2 * * * root /opt/vendhub/scripts/backup-database.sh >> /var/log/vendhub-backup.log 2>&1
```

## Retention Policy

| Type | Retention | Storage |
|------|-----------|---------|
| Daily | 7 days | S3/R2 |
| Weekly | 4 weeks | S3/R2 |
| Monthly | 12 months | S3/R2 Glacier |

## Troubleshooting

### Backup Failed

1. Check disk space on backup server
2. Verify database credentials
3. Check network connectivity to database

### Restore Failed

1. Check PostgreSQL version compatibility
2. Verify target database exists
3. Check for active connections blocking restore
```

---

## Runbook: Incident Response

```markdown
# Incident Response Runbook

## Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| P1 | Critical - System down | 15 min | API down, data loss |
| P2 | Major - Feature broken | 1 hour | Login failing, payments broken |
| P3 | Minor - Degraded | 4 hours | Slow performance, UI bugs |
| P4 | Low - Cosmetic | Next sprint | Typos, minor UI issues |

## P1 Incident Procedure

### Step 1: Acknowledge (within 5 minutes)

1. Acknowledge in #vendhub-incidents channel
2. Start incident timer
3. Assign Incident Commander (IC)

### Step 2: Assess

```bash
# Quick health check
./skills/vhm24-devops/scripts/health-check.sh production

# Check recent deployments
git log --oneline -10

# Check error logs
railway logs --environment production | tail -100
```

### Step 3: Communicate

Post to #vendhub-incidents:
```
🚨 INCIDENT: [Brief description]
Status: Investigating
Impact: [Who is affected]
IC: @[name]
Next update: 15 minutes
```

### Step 4: Mitigate

Options:
1. **Rollback**: If caused by recent deploy
2. **Scale**: If resource exhaustion
3. **Disable Feature**: If isolated to one feature
4. **Failover**: If infrastructure issue

### Step 5: Resolve

1. Confirm service restored
2. Verify with health checks
3. Update status page

### Step 6: Post-Incident

Within 48 hours:
1. Create post-mortem document
2. Identify root cause
3. Define action items
4. Share with team

## Post-Mortem Template

```markdown
# Incident Post-Mortem: [Title]

**Date:** YYYY-MM-DD
**Duration:** X hours Y minutes
**Severity:** P1/P2/P3
**IC:** [Name]

## Summary
One paragraph summary of what happened.

## Timeline
- HH:MM - First alert
- HH:MM - IC assigned
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Service restored

## Root Cause
What actually caused the incident.

## Impact
- Users affected: X
- Revenue impact: $Y
- Data loss: None/Description

## What Went Well
- Fast detection
- Clear communication

## What Went Wrong
- Slow rollback
- Missing monitoring

## Action Items
| Action | Owner | Due Date |
|--------|-------|----------|
| Add monitoring for X | @name | YYYY-MM-DD |
| Improve rollback script | @name | YYYY-MM-DD |
```

## Contacts

| Role | Primary | Backup |
|------|---------|--------|
| Incident Commander | @name | @name |
| Backend Engineer | @name | @name |
| DevOps | @name | @name |
| Product | @name | @name |
```

---

## Структура папки Runbooks

```
docs/runbooks/
├── README.md                    # Index of all runbooks
├── deployment/
│   ├── deploy-staging.md
│   └── deploy-production.md
├── database/
│   ├── backup-restore.md
│   └── migration.md
├── incidents/
│   ├── incident-response.md
│   └── post-mortem-template.md
└── maintenance/
    ├── ssl-renewal.md
    └── dependency-updates.md
```
