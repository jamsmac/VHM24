# Monitoring & Alerts Setup Guide for VH-M24

## Overview

This guide explains how to set up comprehensive monitoring and alerting for 24/7 production operation. Monitoring includes application metrics, database performance, uptime tracking, and automated alerts.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Monitoring Stack                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────┐    ┌──────────────────┐          │
│  │  Railway Metrics │    │ Supabase Metrics │          │
│  │  - CPU/Memory    │    │ - DB Size        │          │
│  │  - Response Time │    │ - Connections    │          │
│  │  - Error Rate    │    │ - Query Time     │          │
│  └──────────────────┘    └──────────────────┘          │
│           ↓                       ↓                     │
│  ┌────────────────────────────────────────┐            │
│  │    Alert Rules & Thresholds            │            │
│  │  - CPU > 80% → Scale Up                │            │
│  │  - Error Rate > 5% → Alert             │            │
│  │  - Response Time > 5s → Alert          │            │
│  └────────────────────────────────────────┘            │
│           ↓                                            │
│  ┌────────────────────────────────────────┐            │
│  │    Notification Channels                │            │
│  │  - Email                               │            │
│  │  - Slack                               │            │
│  │  - PagerDuty                           │            │
│  │  - Telegram                            │            │
│  └────────────────────────────────────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Part 1: Railway Monitoring

### 1.1 Enable Railway Metrics

1. Go to **Railway Dashboard** → **VH-M24 Project**
2. Click **Monitoring** tab
3. Verify **Metrics** is enabled
4. View real-time metrics:
   - CPU usage (%)
   - Memory usage (%)
   - Network I/O (bytes/sec)
   - Deployment status

### 1.2 Configure Railway Alerts

1. Go to **Railway Dashboard** → **Settings** → **Alerts**
2. Create alert for **High CPU**:
   - Metric: `CPU Usage`
   - Threshold: `80%`
   - Duration: `5 minutes`
   - Action: `Scale`
   - Notification: Email

3. Create alert for **High Memory**:
   - Metric: `Memory Usage`
   - Threshold: `85%`
   - Duration: `5 minutes`
   - Action: `Scale`
   - Notification: Email

4. Create alert for **Build Failure**:
   - Metric: `Build Status`
   - Condition: `Failed`
   - Action: `Notify`
   - Notification: Email

5. Create alert for **Deployment Failure**:
   - Metric: `Deployment Status`
   - Condition: `Failed`
   - Action: `Notify`
   - Notification: Email

### 1.3 View Railway Logs

1. Go to **Railway Dashboard** → **Logs**
2. Filter by severity:
   - **Error:** Application errors
   - **Warning:** Potential issues
   - **Info:** General information
3. Search for keywords
4. Export logs for analysis

### 1.4 Monitor Deployments

1. Go to **Railway Dashboard** → **Deployments**
2. View deployment history
3. Check build logs for errors
4. Monitor deployment progress
5. Rollback if needed

## Part 2: Supabase Monitoring

### 2.1 View Database Metrics

1. Go to **Supabase Dashboard** → **Monitoring**
2. View real-time metrics:
   - Database size (GB)
   - Active connections
   - Query performance (ms)
   - Replication lag (ms)
   - Disk usage (%)

### 2.2 Configure Supabase Alerts

1. Go to **Settings** → **Alerts**
2. Create alert for **High Database Size**:
   - Metric: `Database Size`
   - Threshold: `80% of quota`
   - Action: `Email`

3. Create alert for **Too Many Connections**:
   - Metric: `Active Connections`
   - Threshold: `20`
   - Action: `Email`

4. Create alert for **Slow Queries**:
   - Metric: `Query Performance`
   - Threshold: `5000ms`
   - Action: `Email`

5. Create alert for **Replication Lag**:
   - Metric: `Replication Lag`
   - Threshold: `10s`
   - Action: `Email`

### 2.3 Query Performance Analysis

1. Go to **Monitoring** → **Query Performance**
2. View slowest queries
3. Click query to see execution plan
4. Identify optimization opportunities
5. Create indexes for frequently queried columns

### 2.4 View Audit Logs

1. Go to **Settings** → **Audit Logs**
2. View database activity
3. Filter by action type
4. Search by user or table
5. Export for compliance

## Part 3: Health Check Monitoring

### 3.1 Configure Health Checks

The application provides three health check endpoints:

```bash
# Application health (basic check)
curl https://vendhub.yourdomain.com/api/health/check

# Readiness check (ready to accept traffic)
curl https://vendhub.yourdomain.com/api/health/ready

# Liveness check (still running)
curl https://vendhub.yourdomain.com/api/health/live
```

### 3.2 Expected Responses

**Success (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2025-11-29T12:00:00Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

**Degraded (503 Service Unavailable):**
```json
{
  "status": "degraded",
  "timestamp": "2025-11-29T12:00:00Z",
  "uptime": 3600,
  "checks": {
    "database": "failed",
    "memory": "ok"
  }
}
```

### 3.3 Configure External Uptime Monitoring

Use UptimeRobot for external monitoring:

1. Go to https://uptimerobot.com
2. Sign up or log in
3. Click **Add Monitor**
4. Configure monitor:
   - Type: `HTTP(s)`
   - URL: `https://vendhub.yourdomain.com/api/health/check`
   - Interval: `5 minutes`
   - Timeout: `30 seconds`

5. Configure alerts:
   - Email notification on down
   - SMS notification (optional)
   - Webhook notification (optional)

6. View uptime statistics
7. Get uptime badge for website

## Part 4: Application Monitoring

### 4.1 Error Tracking

Monitor application errors in real-time:

1. Go to **Railway Dashboard** → **Logs**
2. Filter by `ERROR` level
3. View error stack traces
4. Identify error patterns
5. Create alerts for specific errors

**Common errors to monitor:**
- Database connection errors
- Authentication failures
- API timeouts
- Memory errors
- File upload failures

### 4.2 Performance Monitoring

Monitor application performance:

1. Go to **Railway Dashboard** → **Metrics**
2. Track metrics:
   - Response time (p50, p95, p99)
   - Requests per second
   - Error rate (%)
   - Database query time

3. Identify performance bottlenecks
4. Optimize slow endpoints
5. Cache frequently accessed data

### 4.3 Resource Monitoring

Monitor resource usage:

1. Go to **Railway Dashboard** → **Metrics**
2. Track:
   - CPU usage (%)
   - Memory usage (%)
   - Disk usage (%)
   - Network I/O (bytes/sec)

3. Set resource limits
4. Configure auto-scaling
5. Monitor for resource exhaustion

## Part 5: Database Monitoring

### 5.1 Connection Monitoring

Monitor database connections:

```sql
-- View active connections
SELECT COUNT(*) FROM pg_stat_activity;

-- View connections by user
SELECT usename, COUNT(*) FROM pg_stat_activity GROUP BY usename;

-- View long-running queries
SELECT pid, usename, query, query_start 
FROM pg_stat_activity 
WHERE query_start < NOW() - INTERVAL '5 minutes';
```

### 5.2 Query Performance Monitoring

Monitor query performance:

```sql
-- View slowest queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC LIMIT 10;

-- Analyze query plan
EXPLAIN ANALYZE SELECT * FROM machines WHERE status = 'active';

-- View table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) 
FROM pg_tables 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 5.3 Index Monitoring

Monitor index usage:

```sql
-- View unused indexes
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
AND indexname NOT IN (
  SELECT indexrelname FROM pg_stat_user_indexes
);

-- View index sizes
SELECT schemaname, tablename, indexname, pg_size_pretty(pg_relation_size(indexrelid)) 
FROM pg_stat_user_indexes 
ORDER BY pg_relation_size(indexrelid) DESC;
```

## Part 6: Custom Dashboards

### 6.1 Create Monitoring Dashboard

Create a custom dashboard to visualize all metrics:

**Dashboard Components:**
1. **Status Overview**
   - Application status (green/red)
   - Database status (green/red)
   - Uptime percentage

2. **Performance Metrics**
   - Response time (graph)
   - Error rate (graph)
   - Requests per second (graph)

3. **Resource Metrics**
   - CPU usage (gauge)
   - Memory usage (gauge)
   - Disk usage (gauge)

4. **Database Metrics**
   - Active connections (gauge)
   - Query performance (graph)
   - Database size (gauge)

5. **Recent Events**
   - Deployments
   - Alerts
   - Errors
   - Scaling events

### 6.2 Tools for Custom Dashboards

**Option 1: Grafana** (Open source)
- Create custom dashboards
- Query multiple data sources
- Set up alerts
- Self-hosted or cloud

**Option 2: Datadog** (Commercial)
- Full-stack monitoring
- APM and log management
- Custom dashboards
- Advanced alerting

**Option 3: New Relic** (Commercial)
- Application performance monitoring
- Infrastructure monitoring
- Custom dashboards
- AI-powered insights

## Part 7: Alert Configuration

### 7.1 Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| CPU | 70% | 85% | Scale up |
| Memory | 75% | 90% | Scale up |
| Error Rate | 1% | 5% | Alert |
| Response Time | 1s | 5s | Alert |
| Database Size | 70% | 90% | Alert |
| Connections | 15 | 25 | Alert |
| Disk Usage | 70% | 90% | Alert |

### 7.2 Create Alert Rules

**Alert Rule Format:**
```
IF metric > threshold FOR duration
THEN action (scale/alert/notify)
NOTIFY channels (email/slack/pagerduty)
```

**Example Rules:**

1. **High CPU Alert**
   ```
   IF cpu > 80% FOR 5 minutes
   THEN scale up replicas
   NOTIFY ops@company.com
   ```

2. **High Error Rate Alert**
   ```
   IF error_rate > 5% FOR 1 minute
   THEN alert
   NOTIFY ops@company.com, #alerts-slack
   ```

3. **Database Connection Alert**
   ```
   IF connections > 20 FOR 5 minutes
   THEN alert
   NOTIFY dba@company.com
   ```

4. **Deployment Failure Alert**
   ```
   IF deployment_status = failed
   THEN alert immediately
   NOTIFY devops@company.com, #deployments-slack
   ```

### 7.3 Configure Notification Channels

**Email Notifications:**
1. Go to **Settings** → **Alerts** → **Email**
2. Add email addresses
3. Configure alert frequency
4. Test email delivery

**Slack Notifications:**
1. Go to **Settings** → **Integrations** → **Slack**
2. Click **Connect Slack**
3. Authorize Railway/Supabase
4. Select channel for alerts
5. Test notification

**PagerDuty Notifications:**
1. Create PagerDuty account
2. Create service for VH-M24
3. Get integration key
4. Add to Railway/Supabase
5. Test notification

**Telegram Notifications:**
1. Create Telegram bot
2. Get bot token
3. Add to monitoring system
4. Configure alert messages
5. Test notification

## Part 8: Monitoring Checklist

### Daily Tasks

- [ ] Check application status
- [ ] Review error logs
- [ ] Monitor CPU/Memory usage
- [ ] Verify backups completed
- [ ] Check database performance
- [ ] Review recent deployments

### Weekly Tasks

- [ ] Review performance metrics
- [ ] Analyze slow queries
- [ ] Check for resource exhaustion
- [ ] Review security logs
- [ ] Test alert notifications
- [ ] Plan optimization

### Monthly Tasks

- [ ] Review monitoring strategy
- [ ] Analyze trends
- [ ] Capacity planning
- [ ] Update alert thresholds
- [ ] Test disaster recovery
- [ ] Review SLAs

### Quarterly Tasks

- [ ] Security audit
- [ ] Performance optimization
- [ ] Dependency updates
- [ ] Capacity upgrade
- [ ] Disaster recovery drill
- [ ] Monitoring tool review

## Part 9: Incident Response

### 9.1 Alert Response Procedure

**When Alert Fires:**
1. Acknowledge alert
2. Check application status
3. View error logs
4. Identify root cause
5. Take action (scale/restart/rollback)
6. Monitor recovery
7. Document incident

### 9.2 Escalation Procedure

| Time | Action |
|------|--------|
| 0-5 min | Acknowledge alert, assess |
| 5-15 min | Attempt resolution |
| 15-30 min | Escalate to Level 2 |
| 30-60 min | Escalate to Level 3 |
| 60+ min | Escalate to management |

### 9.3 Post-Incident Review

1. Document incident timeline
2. Identify root cause
3. Plan preventive measures
4. Update runbook
5. Share learnings with team

## Part 10: SLA Targets

| Metric | Target | Consequence |
|--------|--------|-------------|
| Uptime | 99.9% | 43 minutes/month |
| Response Time (p95) | < 500ms | Performance credit |
| Error Rate | < 0.1% | Investigation |
| Recovery Time | < 15 min | Incident review |

## Support & Resources

- **Railway Monitoring:** https://docs.railway.app/monitoring
- **Supabase Monitoring:** https://supabase.com/docs/guides/database/monitoring
- **Grafana:** https://grafana.com/docs
- **Datadog:** https://docs.datadoghq.com
- **New Relic:** https://docs.newrelic.com

---

**Last Updated:** 2025-11-29  
**Status:** Production Ready  
**Review Frequency:** Monthly  
**Next Review:** 2025-12-29
