# VH-M24 Backup & Recovery Procedures

## Overview

Complete backup and disaster recovery system for 24/7 production:
- Automatic daily backups
- Point-in-time recovery
- Application state backups
- Disaster recovery procedures
- Data validation

## 1. Supabase Automatic Backups

### Backup Schedule

**Daily Backups:**
- Time: 2:00 AM UTC
- Frequency: Every 24 hours
- Retention: 30 days
- Backup Type: Full database snapshot

**Backup Verification:**
1. Go to Supabase Dashboard
2. **Settings** → **Backups**
3. View backup history
4. Check "Last Backup" timestamp

### Point-in-Time Recovery (PITR)

**Available for:** Last 7 days  
**Granularity:** 1 minute

**How to Use:**
1. Go to **Settings** → **Backups**
2. Click **Restore**
3. Select date and time
4. Confirm restoration
5. Database restored to that point

## 2. Application State Backups

### Export Database

**Export All Data:**
```bash
# Export as JSON
pnpm db:export > backup-$(date +%Y-%m-%d-%H%M%S).json

# Export as SQL
pg_dump $DATABASE_URL > backup-$(date +%Y-%m-%d-%H%M%S).sql
```

**Export Specific Tables:**
```bash
# Export users table
pnpm db:export --table users > users-backup.json

# Export products table
pnpm db:export --table products > products-backup.json
```

**Schedule Automated Exports:**
```bash
# Add to crontab (daily at 3 AM)
0 3 * * * cd /path/to/app && pnpm db:export > backups/daily-$(date +\%Y-\%m-\%d).json
```

### Export Files & Uploads

**Backup S3 Files:**
```bash
# Sync S3 to local
aws s3 sync s3://vendhub-uploads ./backups/s3-backup/

# Or use Supabase Storage
supabase storage download --project-ref <ref> vendhub-uploads ./backups/
```

### Configuration Backup

**Backup Environment Variables:**
```bash
# Create encrypted backup
openssl enc -aes-256-cbc -salt -in .env.production -out .env.production.enc

# Restore
openssl enc -d -aes-256-cbc -in .env.production.enc -out .env.production
```

## 3. Restore Procedures

### Restore from Supabase Backup

**Option 1: Automatic PITR**
1. Go to Supabase **Backups**
2. Click **Restore** on desired backup
3. Select point-in-time
4. Confirm
5. Wait for restoration (5-10 minutes)

**Option 2: Manual Restore**
```bash
# Connect to Supabase
psql postgresql://user:password@host:port/database

# Restore from backup
\i backup-2025-11-29.sql
```

### Restore from JSON Export

```bash
# Restore all data
pnpm db:import < backup-2025-11-29.json

# Restore specific table
pnpm db:import --table users < users-backup.json
```

### Restore Application

**From Railway:**
1. Go to **Deployments**
2. Select previous successful deployment
3. Click **Redeploy**
4. Wait for deployment (2-5 minutes)

**From Git:**
```bash
# Rollback to previous commit
git revert <commit-hash>
git push origin main

# Railway will auto-deploy
```

## 4. Disaster Recovery Plan

### Scenario 1: Database Corruption

**Detection:**
- Health check fails
- Error rate spikes
- Slow queries

**Recovery Steps:**
1. Check Supabase dashboard for backup status
2. Restore from latest backup using PITR
3. Verify data integrity
4. Restart application
5. Monitor for issues

**Time to Recovery:** 10-15 minutes

### Scenario 2: Application Crash

**Detection:**
- Health check fails
- Railway shows error
- No response from API

**Recovery Steps:**
1. Check Railway logs
2. Identify error cause
3. Restart application (automatic)
4. If persistent, rollback deployment
5. Monitor recovery

**Time to Recovery:** 1-5 minutes (automatic)

### Scenario 3: Data Loss

**Detection:**
- Missing records
- Inconsistent data
- User reports

**Recovery Steps:**
1. Stop application (pause deployments)
2. Restore from backup using PITR
3. Verify restored data
4. Resume application
5. Notify users

**Time to Recovery:** 15-30 minutes

### Scenario 4: Security Breach

**Detection:**
- Unauthorized access
- Suspicious activity
- Security alert

**Recovery Steps:**
1. Isolate database (disable public access)
2. Restore from pre-breach backup
3. Rotate credentials
4. Update security rules
5. Resume application

**Time to Recovery:** 30-60 minutes

## 5. Backup Validation

### Daily Validation

```bash
#!/bin/bash
# backup-validation.sh

echo "Validating backups..."

# Check Supabase backup
BACKUP_STATUS=$(curl -s https://api.supabase.com/v1/projects/$(PROJECT_ID)/backups \
  -H "Authorization: Bearer $SUPABASE_API_KEY" | jq '.[] | select(.status=="COMPLETED") | .created_at')

if [ -z "$BACKUP_STATUS" ]; then
  echo "ERROR: No recent backup found"
  exit 1
fi

echo "Last backup: $BACKUP_STATUS"

# Check database connectivity
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;" > /dev/null 2>&1

if [ $? -ne 0 ]; then
  echo "ERROR: Database connection failed"
  exit 1
fi

echo "Backup validation passed"
exit 0
```

### Weekly Restore Test

```bash
#!/bin/bash
# test-restore.sh

echo "Testing restore procedure..."

# Create test database
TEST_DB="vendhub_restore_test_$(date +%s)"

# Restore from backup
# ... restore logic ...

# Validate data
RECORD_COUNT=$(psql postgresql://user:pass@host:port/$TEST_DB -c "SELECT COUNT(*) FROM users;" | tail -1)

if [ "$RECORD_COUNT" -lt 100 ]; then
  echo "ERROR: Restored data incomplete"
  exit 1
fi

# Cleanup
dropdb $TEST_DB

echo "Restore test passed"
exit 0
```

## 6. Backup Storage

### Supabase Backups

- **Location:** Supabase managed storage
- **Retention:** 30 days
- **Encryption:** AES-256
- **Redundancy:** Multi-region

### Local Backups

**Storage Location:**
```
/backups/
├── daily/
│   ├── backup-2025-11-29.json
│   ├── backup-2025-11-28.json
│   └── ...
├── weekly/
│   ├── backup-2025-11-22.json
│   └── ...
└── monthly/
    ├── backup-2025-11-01.json
    └── ...
```

**Backup Rotation:**
- Daily: Keep last 30 days
- Weekly: Keep last 12 weeks
- Monthly: Keep last 12 months

## 7. Backup Monitoring

### Backup Checklist

**Daily:**
- [ ] Backup completed successfully
- [ ] Backup size reasonable
- [ ] No backup errors

**Weekly:**
- [ ] Test restore procedure
- [ ] Verify data integrity
- [ ] Check backup storage

**Monthly:**
- [ ] Full disaster recovery test
- [ ] Review backup retention
- [ ] Update recovery procedures

### Backup Alerts

**Email Alert on Backup Failure:**
```
To: admin@vendhub.local
Subject: Backup Failed - VH-M24 Production

Backup failed at 2025-11-29 02:00 UTC
Error: Connection timeout

Action Required:
1. Check Supabase status
2. Verify network connectivity
3. Retry backup manually
```

## 8. Recovery Time Objectives (RTO)

| Scenario | RTO | RPO |
|----------|-----|-----|
| Database corruption | 15 min | 1 min |
| Application crash | 5 min | 0 min |
| Data loss | 30 min | 1 min |
| Security breach | 60 min | 1 min |
| Complete failure | 2 hours | 1 hour |

**RTO** = Recovery Time Objective (how long to restore)  
**RPO** = Recovery Point Objective (how much data loss acceptable)

## 9. Disaster Recovery Drill

### Monthly DR Drill

**Schedule:** First Monday of each month, 2 PM UTC

**Procedure:**
1. Announce drill to team
2. Simulate database failure
3. Execute recovery procedure
4. Verify application functionality
5. Document results
6. Review and improve

**Success Criteria:**
- Recovery completed within RTO
- All data restored correctly
- Application fully functional
- No data loss

## 10. Backup Checklist

### Before Going to Production

- [ ] Supabase backups configured
- [ ] Daily backup schedule set
- [ ] PITR enabled
- [ ] Backup validation script created
- [ ] Restore procedure tested
- [ ] Recovery plan documented
- [ ] Team trained on recovery
- [ ] Monitoring configured
- [ ] Alerts configured
- [ ] DR drill scheduled

### Ongoing Maintenance

- [ ] Daily backup verification
- [ ] Weekly restore tests
- [ ] Monthly DR drills
- [ ] Quarterly security audit
- [ ] Annual recovery plan review

## Support

- **Supabase Backup Docs:** https://supabase.com/docs/guides/database/backups
- **PostgreSQL Docs:** https://www.postgresql.org/docs/current/backup.html
- **Railway Docs:** https://docs.railway.app

---

**Last Updated:** 2025-11-29  
**Status:** Production Ready  
**RTO:** 15 minutes  
**RPO:** 1 minute
