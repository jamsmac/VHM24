# VH-M24 24/7 Operations Runbook

## Quick Reference

### Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| On-Call Engineer | - | - | oncall@vendhub.local |
| Database Admin | - | - | dba@vendhub.local |
| DevOps Lead | - | - | devops@vendhub.local |

### Important Links

- **Railway Dashboard:** https://railway.app/dashboard
- **Supabase Dashboard:** https://app.supabase.com
- **Monitoring Dashboard:** https://monitoring.vendhub.local
- **Status Page:** https://status.vendhub.local

### Critical Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| CPU Usage | > 70% | > 85% |
| Memory Usage | > 75% | > 90% |
| Error Rate | > 1% | > 5% |
| Response Time | > 1s | > 5s |
| Database Connections | > 20 | > 30 |

## 1. Daily Operations

### Morning Checklist (9 AM UTC)

```bash
#!/bin/bash
# morning-checklist.sh

echo "=== VH-M24 Morning Checklist ==="

# Check application status
echo "1. Checking application status..."
curl -s https://vendhub.yourdomain.com/api/health/check | jq .

# Check database
echo "2. Checking database..."
curl -s https://vendhub.yourdomain.com/api/health/ready | jq .

# Check backup
echo "3. Checking last backup..."
# Add backup check logic

# Check metrics
echo "4. Checking metrics..."
# Add metrics check logic

echo "=== Checklist Complete ==="
```

### Evening Checklist (6 PM UTC)

- [ ] Review error logs
- [ ] Check performance metrics
- [ ] Verify backup completed
- [ ] Review pending deployments
- [ ] Check for security alerts

## 2. Common Issues & Solutions

### Issue: High CPU Usage

**Symptoms:**
- CPU > 80%
- Slow response times
- Timeout errors

**Diagnosis:**
```bash
# Check top processes
railway shell
top

# Check database queries
psql $DATABASE_URL
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;
```

**Solutions:**
1. Increase replica count (auto-scaling)
2. Optimize slow queries
3. Add database indexes
4. Clear cache
5. Restart application

**Resolution Time:** 5-15 minutes

### Issue: High Memory Usage

**Symptoms:**
- Memory > 85%
- OOM errors
- Application crashes

**Diagnosis:**
```bash
# Check memory usage
railway shell
free -h
ps aux --sort=-%mem | head -10

# Check Node.js memory
node -e "console.log(process.memoryUsage())"
```

**Solutions:**
1. Increase replica count
2. Reduce cache size
3. Optimize data structures
4. Restart application
5. Upgrade instance size

**Resolution Time:** 5-10 minutes

### Issue: Database Connection Issues

**Symptoms:**
- Connection refused
- Connection timeout
- Too many connections

**Diagnosis:**
```bash
# Check connection count
psql $DATABASE_URL
SELECT count(*) FROM pg_stat_activity;

# Check connection limits
SHOW max_connections;
```

**Solutions:**
1. Increase connection pool size
2. Close idle connections
3. Restart connection pooler
4. Increase database max_connections
5. Optimize query performance

**Resolution Time:** 5-20 minutes

### Issue: Slow Queries

**Symptoms:**
- Response time > 5s
- Database CPU high
- Timeout errors

**Diagnosis:**
```bash
# Find slow queries
psql $DATABASE_URL
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC LIMIT 10;

# Analyze query plan
EXPLAIN ANALYZE SELECT ...;
```

**Solutions:**
1. Add database indexes
2. Optimize query logic
3. Cache query results
4. Increase database resources
5. Archive old data

**Resolution Time:** 15-60 minutes

### Issue: Deployment Failed

**Symptoms:**
- Deployment shows error
- Application not updating
- Old version still running

**Diagnosis:**
1. Check Railway logs
2. Review build output
3. Check environment variables
4. Verify database migrations

**Solutions:**
1. Fix error in code
2. Redeploy
3. Rollback to previous version
4. Check database migrations

**Resolution Time:** 10-30 minutes

## 3. Incident Response

### Incident Severity Levels

| Level | Impact | Response Time |
|-------|--------|----------------|
| P1 | Complete outage | 5 minutes |
| P2 | Partial outage | 15 minutes |
| P3 | Degraded performance | 1 hour |
| P4 | Minor issue | 4 hours |

### P1 Incident Response

**Step 1: Acknowledge (0-2 min)**
- Acknowledge alert
- Notify on-call team
- Create incident ticket

**Step 2: Assess (2-5 min)**
- Check application status
- Check database status
- Identify scope of impact

**Step 3: Mitigate (5-15 min)**
- Restart application
- Failover to backup
- Rollback deployment
- Scale up resources

**Step 4: Communicate (ongoing)**
- Update status page
- Notify customers
- Provide ETA

**Step 5: Resolve (15-60 min)**
- Fix root cause
- Verify fix
- Deploy fix
- Monitor for issues

**Step 6: Post-Mortem (24 hours)**
- Document incident
- Identify root cause
- Plan improvements
- Update runbook

### P2 Incident Response

**Step 1: Acknowledge (0-5 min)**
- Acknowledge alert
- Notify team
- Create ticket

**Step 2: Assess (5-15 min)**
- Identify affected users
- Check error rate
- Determine scope

**Step 3: Mitigate (15-30 min)**
- Implement workaround
- Scale resources
- Optimize queries

**Step 4: Resolve (30-60 min)**
- Fix root cause
- Deploy fix
- Verify resolution

## 4. Maintenance Windows

### Scheduled Maintenance

**Frequency:** Monthly, first Sunday 2-4 AM UTC

**Activities:**
- Database maintenance
- Security patches
- Dependency updates
- Performance optimization

**Notification:**
- Email 1 week before
- Email 24 hours before
- Status page update
- In-app notification

### Emergency Maintenance

**Frequency:** As needed

**Activities:**
- Security patches
- Critical bug fixes
- Emergency rollback

**Notification:**
- Immediate email
- Status page update
- Slack notification

## 5. Scaling Procedures

### Manual Scaling

**Increase Replicas:**
```bash
railway scale --replicas 3
```

**Increase Instance Size:**
1. Go to Railway Dashboard
2. **Settings** → **Instance Size**
3. Select larger instance
4. Confirm scaling

**Expected Downtime:** 2-5 minutes

### Auto-Scaling

**Current Settings:**
- Min replicas: 2
- Max replicas: 5
- CPU threshold: 70%
- Memory threshold: 80%

**Adjust Settings:**
1. Go to Railway **Settings** → **Scaling**
2. Update thresholds
3. Save changes

## 6. Performance Optimization

### Database Optimization

```bash
# Analyze tables
ANALYZE;

# Reindex tables
REINDEX DATABASE vendhub;

# Vacuum tables
VACUUM ANALYZE;

# Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) 
FROM pg_tables 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Application Optimization

```bash
# Clear cache
redis-cli FLUSHALL

# Restart application
railway redeploy

# Check memory leaks
node --inspect app.js
```

### Query Optimization

```bash
# Find slow queries
SELECT query, mean_exec_time 
FROM pg_stat_statements 
WHERE mean_exec_time > 1000 
ORDER BY mean_exec_time DESC;

# Create index
CREATE INDEX idx_users_email ON users(email);

# Analyze query plan
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@example.com';
```

## 7. Monitoring & Alerting

### Key Metrics to Monitor

- **Uptime:** Target 99.9%
- **Response Time (p95):** Target < 500ms
- **Error Rate:** Target < 0.1%
- **CPU Usage:** Target < 50%
- **Memory Usage:** Target < 60%
- **Database Connections:** Target < 20

### Alert Response

| Alert | Action | Time |
|-------|--------|------|
| High CPU | Check processes, scale up | 5 min |
| High Memory | Check memory leaks, restart | 5 min |
| High Error Rate | Check logs, rollback | 10 min |
| Database Down | Failover, restore | 15 min |
| Deployment Failed | Check logs, fix, redeploy | 20 min |

## 8. Communication Templates

### Status Page Update

```
🔴 INCIDENT: Service Degradation

We are experiencing performance issues affecting some users.
Our team is investigating.

Status: Investigating
Impact: Partial
Started: 2025-11-29 12:00 UTC
```

### Customer Notification

```
Subject: Service Incident - VH-M24

We experienced a brief service interruption from 12:00-12:15 UTC.
Service has been restored and is operating normally.

We apologize for the inconvenience.
```

### Team Notification

```
@oncall-team

P1 Incident: Database connection pool exhausted
Started: 2025-11-29 12:00 UTC
Impact: 50% of requests failing
Status: Mitigating

Actions:
- Increased connection pool size
- Restarting connection pooler
- Monitoring recovery

ETA: 12:15 UTC
```

## 9. Escalation Procedures

### Level 1: On-Call Engineer
- Acknowledge alert
- Perform initial diagnosis
- Attempt resolution

### Level 2: DevOps Lead
- If Level 1 cannot resolve in 15 minutes
- Escalate incident
- Coordinate response

### Level 3: Engineering Manager
- If Level 2 cannot resolve in 30 minutes
- Escalate to management
- Activate war room

### Level 4: Executive
- If service down > 1 hour
- Notify executives
- Activate crisis management

## 10. On-Call Rotation

### Schedule

```
Week 1: Engineer A
Week 2: Engineer B
Week 3: Engineer C
Week 4: Engineer D
```

### On-Call Responsibilities

- Monitor alerts 24/7
- Respond to incidents within SLA
- Maintain runbook
- Participate in post-mortems
- Update team on issues

### Handoff Procedure

1. Review incidents from previous week
2. Check pending tasks
3. Verify monitoring is working
4. Review recent changes
5. Confirm contact information

## 11. Backup & Recovery

### Backup Verification

```bash
# Check backup status
supabase db backup list --project-ref <ref>

# Test restore
supabase db backup restore --project-ref <ref> --backup-id <id> --dry-run
```

### Recovery Procedure

1. Identify issue
2. Stop application
3. Restore from backup
4. Verify data
5. Restart application
6. Monitor recovery

## 12. Security Procedures

### Access Control

- SSH keys for Railway
- Database credentials in secrets
- API keys in environment
- Regular credential rotation

### Security Incidents

1. Isolate affected system
2. Revoke compromised credentials
3. Restore from backup
4. Investigate incident
5. Implement fixes
6. Resume operation

## 13. Documentation

### Keep Updated

- [ ] Runbook (monthly)
- [ ] Incident logs (weekly)
- [ ] Performance metrics (daily)
- [ ] Security audit (quarterly)
- [ ] Disaster recovery plan (annually)

### Version Control

```
OPERATIONS_RUNBOOK.md
├── v1.0 - Initial version
├── v1.1 - Added scaling procedures
├── v1.2 - Updated alert thresholds
└── v2.0 - Complete revision
```

---

**Last Updated:** 2025-11-29  
**Version:** 1.0  
**Status:** Production Ready  
**Next Review:** 2025-12-29
