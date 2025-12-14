# VendHub Manager Operations Runbook

> **Last Updated**: 2025-12-14
> **Version**: 1.0.0
> **On-Call Rotation**: DevOps Team

This runbook provides step-by-step procedures for common operational tasks and incident response.

---

## Table of Contents

1. [Daily Operations](#daily-operations)
2. [Monitoring Procedures](#monitoring-procedures)
3. [Incident Response](#incident-response)
4. [Common Issues & Resolutions](#common-issues--resolutions)
5. [Maintenance Procedures](#maintenance-procedures)
6. [Escalation Paths](#escalation-paths)

---

## Daily Operations

### Morning Checklist

Run these checks at the start of each business day:

```bash
# 1. Check service status
pm2 status

# 2. Verify API health
curl -s http://localhost:3000/health | jq

# 3. Check disk space (alert if >80%)
df -h | grep -E '^/dev'

# 4. Check memory usage
free -m

# 5. Review error logs from last 24h
pm2 logs vendhub-api --err --lines 100 | grep -i error | tail -20

# 6. Check database connections
psql -U vendhub -d vendhub_prod -c "SELECT count(*) FROM pg_stat_activity WHERE state='active';"

# 7. Check Redis status
redis-cli -a $REDIS_PASSWORD ping
redis-cli -a $REDIS_PASSWORD info memory | grep used_memory_human
```

### Health Check Script

Save as `/opt/vendhub/scripts/daily-check.sh`:

```bash
#!/bin/bash
set -e

echo "=== VendHub Daily Health Check ==="
echo "Date: $(date)"
echo ""

# API Health
echo "--- API Health ---"
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ "$API_STATUS" == "200" ]; then
    echo "[OK] API is healthy"
else
    echo "[ALERT] API returned HTTP $API_STATUS"
fi

# Database
echo ""
echo "--- Database ---"
DB_CONN=$(psql -U vendhub -d vendhub_prod -t -c "SELECT count(*) FROM pg_stat_activity WHERE state='active';")
echo "Active connections: $DB_CONN"
if [ "$DB_CONN" -gt 50 ]; then
    echo "[WARN] High connection count"
fi

# Redis
echo ""
echo "--- Redis ---"
REDIS_MEM=$(redis-cli -a $REDIS_PASSWORD info memory | grep used_memory_human | cut -d: -f2)
echo "Memory usage: $REDIS_MEM"

# Disk
echo ""
echo "--- Disk Space ---"
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
echo "Root partition: ${DISK_USAGE}%"
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "[WARN] Disk usage above 80%"
fi

# PM2 Processes
echo ""
echo "--- PM2 Status ---"
pm2 jlist | jq '.[] | {name, status, memory: .monit.memory, cpu: .monit.cpu}'

echo ""
echo "=== Check Complete ==="
```

---

## Monitoring Procedures

### Key Dashboards

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| API Performance | `grafana.vendhub.com/d/vendhub-api-perf` | Response times, error rates |
| Business Metrics | `grafana.vendhub.com/d/vendhub-business` | Tasks, machines, inventory |
| Security Metrics | `grafana.vendhub.com/d/vendhub-security` | Login failures, rate limits |
| Infrastructure | `grafana.vendhub.com/d/vendhub-infra` | CPU, memory, disk |

### Critical Metrics to Watch

| Metric | Warning Threshold | Critical Threshold |
|--------|-------------------|-------------------|
| API Response Time (P95) | > 500ms | > 2s |
| Error Rate (5xx) | > 1% | > 5% |
| CPU Usage | > 70% | > 90% |
| Memory Usage | > 80% | > 95% |
| Disk Usage | > 80% | > 90% |
| DB Connections | > 50 | > 80 |
| Redis Memory | > 80% max | > 90% max |

### Setting Up Alerts

Prometheus alerts are configured in `monitoring/prometheus/alerts.yml`. Key alerts:

```yaml
# API Down
- alert: BackendAPIDown
  expr: up{job="vendhub-backend"} == 0
  for: 2m
  labels:
    severity: critical

# High Error Rate
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
  for: 5m
  labels:
    severity: warning

# High Login Failure Rate
- alert: HighLoginFailureRate
  expr: rate(vendhub_login_failures_total[5m]) > 0.5
  for: 5m
  labels:
    severity: warning
```

---

## Incident Response

### Severity Definitions

| Severity | Definition | Response Time | Examples |
|----------|------------|---------------|----------|
| P0 | Complete outage | Immediate | API down, database unreachable |
| P1 | Major degradation | 15 minutes | High error rate, slow responses |
| P2 | Minor degradation | 1 hour | Single feature broken |
| P3 | Low impact | 24 hours | UI glitch, minor bug |

### P0: Complete Outage

**Symptoms**: API not responding, 5xx errors for all requests

**Immediate Actions**:

```bash
# 1. Check if process is running
pm2 status

# 2. If process is down, restart
pm2 restart vendhub-api

# 3. Check logs for errors
pm2 logs vendhub-api --err --lines 100

# 4. Check database
psql -U vendhub -d vendhub_prod -c "SELECT 1;" || echo "DB UNREACHABLE"

# 5. Check Redis
redis-cli -a $REDIS_PASSWORD ping || echo "REDIS UNREACHABLE"

# 6. Check disk space
df -h

# 7. If out of memory, check and kill heavy processes
free -m
top -bn1 | head -20
```

**If restart doesn't work**:

```bash
# Check for port conflicts
lsof -i :3000

# Check system resources
dmesg | tail -50

# Rollback to previous version
cd /opt/vendhub
git checkout HEAD~1
npm ci --production
npm run build
pm2 restart vendhub-api
```

### P1: High Error Rate

**Symptoms**: Error rate > 5%, slow responses > 2s

**Investigation**:

```bash
# 1. Check error distribution
pm2 logs vendhub-api --err --lines 200 | grep -E 'Error|Exception' | sort | uniq -c | sort -rn

# 2. Check database query times
psql -U vendhub -d vendhub_prod -c "
SELECT query, calls, mean_time, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;"

# 3. Check Redis latency
redis-cli -a $REDIS_PASSWORD --latency

# 4. Check for slow queries in logs
pm2 logs vendhub-api | grep -E 'query.*ms' | sort -t' ' -k4 -rn | head -20
```

**Common Fixes**:

```bash
# High DB connections - restart connection pool
pm2 restart vendhub-api

# Redis memory full - flush non-critical cache
redis-cli -a $REDIS_PASSWORD FLUSHDB

# Slow queries - analyze and optimize
# Check EXPLAIN ANALYZE for problematic queries
```

### P2: High Login Failure Rate (Security)

**Symptoms**: Alert for high login failures, possible brute force

**Investigation**:

```bash
# 1. Check login failure pattern
pm2 logs vendhub-api | grep -i "login.*fail" | tail -100

# 2. Identify source IPs
pm2 logs vendhub-api | grep -E '"ip"' | sort | uniq -c | sort -rn | head -20

# 3. Check rate limiting effectiveness
curl -s http://localhost:9090/api/v1/query?query=vendhub_http_request_errors_total{status="429"} | jq
```

**Actions**:

```bash
# Block suspicious IP at firewall
sudo iptables -A INPUT -s <suspicious-ip> -j DROP

# Temporarily increase rate limiting strictness
# Edit .env: RATE_LIMIT_LIMIT=50
pm2 restart vendhub-api

# Notify affected users if credentials compromised
```

---

## Common Issues & Resolutions

### Issue: Application Crash Loop

**Symptoms**: PM2 shows rapid restarts

```bash
# Check crash reason
pm2 logs vendhub-api --err --lines 200

# Common causes:
# 1. Out of memory - increase limit
pm2 delete vendhub-api
pm2 start dist/main.js --name vendhub-api --max-memory-restart 2G

# 2. Missing environment variable
env | grep -E 'DATABASE|REDIS|JWT'

# 3. Database unreachable
psql -U vendhub -d vendhub_prod -c "SELECT 1;"
```

### Issue: Database Connection Exhaustion

**Symptoms**: "too many connections" errors

```bash
# 1. Check current connections
psql -U postgres -c "SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"

# 2. Kill idle connections
psql -U postgres -c "
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'vendhub_prod'
  AND state = 'idle'
  AND state_change < now() - interval '10 minutes';"

# 3. Increase max connections (requires restart)
# Edit postgresql.conf: max_connections = 200
sudo systemctl restart postgresql
```

### Issue: Redis Memory Full

**Symptoms**: Redis commands failing, OOM errors

```bash
# 1. Check memory usage
redis-cli -a $REDIS_PASSWORD info memory

# 2. Find large keys
redis-cli -a $REDIS_PASSWORD --bigkeys

# 3. Clear session cache if needed
redis-cli -a $REDIS_PASSWORD KEYS "sess:*" | xargs redis-cli -a $REDIS_PASSWORD DEL

# 4. Set memory policy
redis-cli -a $REDIS_PASSWORD CONFIG SET maxmemory-policy allkeys-lru
```

### Issue: Disk Space Full

**Symptoms**: Write failures, log rotation stopped

```bash
# 1. Find large files
du -h /opt/vendhub --max-depth=2 | sort -rh | head -20

# 2. Clean old logs
find /opt/vendhub/logs -name "*.log" -mtime +7 -delete

# 3. Clean PM2 logs
pm2 flush

# 4. Clean old backups
find /opt/backups -name "*.dump" -mtime +7 -delete

# 5. Clean Docker if used
docker system prune -af
```

### Issue: SSL Certificate Expiring

**Symptoms**: Certificate warnings, HTTPS errors

```bash
# 1. Check certificate expiry
echo | openssl s_client -servername api.vendhub.com -connect api.vendhub.com:443 2>/dev/null | openssl x509 -noout -dates

# 2. Renew certificate (Let's Encrypt)
sudo certbot renew

# 3. Reload nginx
sudo nginx -t && sudo systemctl reload nginx
```

---

## Maintenance Procedures

### Scheduled Maintenance Window

**Preparation** (1 day before):

```bash
# 1. Notify users
# Send announcement via Telegram bot and email

# 2. Create full backup
pg_dump -h localhost -U vendhub -F c vendhub_prod > backup_pre_maintenance.dump

# 3. Prepare rollback plan
git log --oneline -5  # Note current commit
```

**During Maintenance**:

```bash
# 1. Enable maintenance mode (if available)
# Or update nginx to show maintenance page

# 2. Stop application
pm2 stop vendhub-api

# 3. Perform maintenance tasks
# - Database vacuum
psql -U vendhub -d vendhub_prod -c "VACUUM ANALYZE;"

# - Run migrations
NODE_ENV=production npm run migration:run

# - Apply updates
git pull origin main
npm ci --production
npm run build

# 4. Start application
pm2 start vendhub-api

# 5. Verify health
curl http://localhost:3000/health

# 6. Disable maintenance mode
```

**Post-Maintenance**:

```bash
# 1. Monitor for 30 minutes
watch -n 10 'curl -s http://localhost:3000/health'

# 2. Check error logs
pm2 logs vendhub-api --err --lines 50

# 3. Verify key functionality
# - Test login
# - Test task creation
# - Test file upload

# 4. Notify users maintenance complete
```

### Database Maintenance

**Weekly**:

```bash
# Vacuum and analyze
psql -U vendhub -d vendhub_prod -c "VACUUM ANALYZE;"

# Check for bloat
psql -U vendhub -d vendhub_prod -c "
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
       pg_size_pretty(pg_table_size(schemaname||'.'||tablename)) as table_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;"
```

**Monthly**:

```bash
# Reindex
psql -U vendhub -d vendhub_prod -c "REINDEX DATABASE vendhub_prod;"

# Check for unused indexes
psql -U vendhub -d vendhub_prod -c "
SELECT indexname, tablename, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexname NOT LIKE 'pg_%';"
```

### Log Rotation

Configure in `/etc/logrotate.d/vendhub`:

```
/opt/vendhub/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0644 vendhub vendhub
    postrotate
        pm2 reloadLogs
    endscript
}
```

---

## Escalation Paths

### On-Call Rotation

| Week | Primary | Secondary |
|------|---------|-----------|
| 1 | DevOps Lead | Backend Lead |
| 2 | Backend Lead | DevOps Lead |
| 3 | DevOps Lead | Backend Lead |
| 4 | Backend Lead | DevOps Lead |

### Escalation Matrix

| Severity | Initial Response | 15 min | 30 min | 1 hour |
|----------|-----------------|--------|--------|--------|
| P0 | On-call | Secondary | Team Lead | CTO |
| P1 | On-call | Secondary | Team Lead | - |
| P2 | On-call | - | - | - |
| P3 | Next business day | - | - | - |

### Contact Information

| Role | Contact | Phone |
|------|---------|-------|
| DevOps Lead | devops@vendhub.com | +998-XX-XXX-XXXX |
| Backend Lead | backend@vendhub.com | +998-XX-XXX-XXXX |
| Team Lead | lead@vendhub.com | +998-XX-XXX-XXXX |
| CTO | cto@vendhub.com | +998-XX-XXX-XXXX |

### External Contacts

| Service | Support |
|---------|---------|
| Cloud Provider | support@provider.com |
| Domain/DNS | dns-support@provider.com |
| SSL Certificate | support@letsencrypt.org |

---

## Quick Reference Commands

```bash
# Service Management
pm2 status                    # Check all processes
pm2 restart vendhub-api       # Restart API
pm2 logs vendhub-api          # View logs
pm2 monit                     # Real-time monitoring

# Health Checks
curl http://localhost:3000/health
curl http://localhost:3000/health/ready

# Database
psql -U vendhub -d vendhub_prod
pg_dump -U vendhub vendhub_prod > backup.sql

# Redis
redis-cli -a $REDIS_PASSWORD ping
redis-cli -a $REDIS_PASSWORD info

# Logs
pm2 logs --lines 100
tail -f /opt/vendhub/logs/error.log

# System
df -h                         # Disk space
free -m                       # Memory
top                           # Process monitor
netstat -tlnp                 # Open ports
```

---

**Document Owner**: VendHub DevOps Team
**Review Cycle**: Monthly
**Classification**: Internal Use Only
