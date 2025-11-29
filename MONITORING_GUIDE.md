# VendHub Database Monitoring Guide

> **Version**: 1.0.0
> **Last Updated**: 2025-01-25
> **Status**: Production Ready

This guide provides comprehensive instructions for monitoring the VendHub PostgreSQL database in production.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Monitoring Components](#monitoring-components)
4. [Health Checks](#health-checks)
5. [Performance Monitoring](#performance-monitoring)
6. [Alert Configuration](#alert-configuration)
7. [Integration Guides](#integration-guides)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)

---

## 🎯 Overview

### What We Monitor

VendHub database monitoring covers:

- **Performance**: Cache hit ratio, query performance, index usage
- **Capacity**: Connections, disk usage, table sizes
- **Health**: Replication lag, locks, table bloat
- **Operations**: Backups, WAL archiving, vacuum status
- **Business**: Active users, machines, tasks, transactions

### Monitoring Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  PostgreSQL Database                         │
│  - pg_stat_statements (query tracking)                       │
│  - Performance monitoring views                              │
│  - Business metrics tables                                   │
└──────────────────┬──────────────────────────────────────────┘
                   │
    ┌──────────────┼──────────────┐
    ↓              ↓               ↓
┌─────────┐  ┌──────────┐  ┌──────────────┐
│ Scripts │  │ Grafana  │  │ DataDog/     │
│ /Cron   │  │ Dashboard│  │ New Relic    │
└─────────┘  └──────────┘  └──────────────┘
```

---

## ⚡ Quick Start

### 1. Run Health Check

```bash
# Standard health check
./backend/scripts/database/health-check.sh

# Detailed output
./backend/scripts/database/health-check.sh --verbose

# Only show issues
./backend/scripts/database/health-check.sh --alerts-only
```

### 2. View Monitoring Views

```sql
-- Connect to database
psql -U postgres -d vendhub

-- Check slow queries
SELECT * FROM v_slow_queries LIMIT 10;

-- Check table sizes
SELECT * FROM v_table_sizes LIMIT 20;

-- Check cache hit ratio
SELECT * FROM v_cache_hit_ratio;

-- Database summary
SELECT * FROM v_database_summary;
```

### 3. Setup Scheduled Monitoring

```bash
# Add to crontab
crontab -e

# Health check every hour
0 * * * * /opt/vendhub/backend/scripts/database/health-check.sh --alerts-only >> /var/log/vendhub/health-check.log 2>&1

# Daily maintenance
0 2 * * * /opt/vendhub/backend/scripts/database/maintenance.sh --vacuum --analyze

# Weekly comprehensive maintenance
0 3 * * 0 /opt/vendhub/backend/scripts/database/maintenance.sh --all
```

---

## 🔧 Monitoring Components

### 1. Performance Monitoring Extension

**Location**: `src/database/migrations/1732500000000-EnablePerformanceMonitoring.ts`

**What it provides**:
- `pg_stat_statements` extension for query tracking
- 10 monitoring views for common queries
- Performance baselines

**Key Views**:

```sql
-- Slow queries (>100ms)
SELECT * FROM v_slow_queries;

-- Table sizes with growth tracking
SELECT * FROM v_table_sizes;

-- Unused indexes (candidates for removal)
SELECT * FROM v_unused_indexes;

-- Index usage statistics
SELECT * FROM v_index_usage;

-- Cache hit ratio (should be >95%)
SELECT * FROM v_cache_hit_ratio;

-- Active database connections
SELECT * FROM v_active_connections;

-- Long running queries (>1 minute)
SELECT * FROM v_long_running_queries;

-- Table bloat (dead tuples %)
SELECT * FROM v_table_bloat;

-- Sequential scans (missing indexes?)
SELECT * FROM v_sequential_scans;

-- Overall database health summary
SELECT * FROM v_database_summary;
```

### 2. Monitoring Queries

**Location**: `backend/scripts/database/monitoring-queries.sql`

**Categories**:
1. Performance Metrics
2. Connection Monitoring
3. Query Performance
4. Table/Index Health
5. Replication Status
6. Backup Status
7. Disk Usage
8. Lock Monitoring
9. Business Metrics

**Usage**:
```bash
# Execute specific query
psql -U postgres -d vendhub -f backend/scripts/database/monitoring-queries.sql

# Extract specific section
sed -n '/PERFORMANCE METRICS/,/CONNECTION MONITORING/p' monitoring-queries.sql | psql -U postgres -d vendhub
```

### 3. Health Check Script

**Location**: `backend/scripts/database/health-check.sh`

**Features**:
- Automated health checks
- Threshold-based alerting
- Exit codes for CI/CD integration
- JSON output option

**Usage Examples**:

```bash
# Basic health check
./health-check.sh

# Detailed output
./health-check.sh --verbose

# JSON output (for monitoring tools)
./health-check.sh --json | jq

# Exit code handling
./health-check.sh
if [ $? -eq 2 ]; then
  echo "Critical issues found!"
  # Send alert
fi
```

### 4. Audit Script for FK Indexes

**Location**: `backend/scripts/database/audit-fk-indexes.sh`

**Purpose**: Verify all foreign keys have indexes

**Usage**:
```bash
# Audit current state
./audit-fk-indexes.sh

# Generate SQL to fix missing indexes
./audit-fk-indexes.sh --fix > fix-missing-indexes.sql

# Apply fixes
psql -U postgres -d vendhub -f fix-missing-indexes.sql
```

---

## 🏥 Health Checks

### Critical Metrics

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Cache Hit Ratio | <95% | <90% | Increase `shared_buffers` |
| Connection Usage | >50% | >80% | Check connection leaks, add PgBouncer |
| Table Bloat | >10% | >20% | Run VACUUM FULL |
| Replication Lag | >10MB | >100MB | Check network, increase `wal_keep_size` |
| Long Running Queries | >2 min | >5 min | Optimize query or kill |
| Blocking Queries | >10s | >30s | Investigate locks |
| Disk Usage | >70% | >85% | Archive old data, add storage |
| WAL Archiving Failures | >0 | >10 | Check archive destination |

### Health Check Automation

```bash
#!/bin/bash
# /opt/vendhub/monitoring/health-check-wrapper.sh

HEALTH_CHECK="/opt/vendhub/backend/scripts/database/health-check.sh"
ALERT_EMAIL="alerts@vendhub.com"
SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

# Run health check
$HEALTH_CHECK --alerts-only > /tmp/health-check-result.txt
EXIT_CODE=$?

if [ $EXIT_CODE -eq 2 ]; then
  # Critical issues
  SUBJECT="[CRITICAL] VendHub Database Health Check Failed"

  # Send email
  mail -s "$SUBJECT" "$ALERT_EMAIL" < /tmp/health-check-result.txt

  # Send Slack notification
  curl -X POST -H 'Content-type: application/json' \
    --data "{\"text\":\"$SUBJECT\n$(cat /tmp/health-check-result.txt)\"}" \
    "$SLACK_WEBHOOK"

elif [ $EXIT_CODE -eq 1 ]; then
  # Warnings
  SUBJECT="[WARNING] VendHub Database Health Check"
  mail -s "$SUBJECT" "$ALERT_EMAIL" < /tmp/health-check-result.txt
fi

# Cleanup
rm -f /tmp/health-check-result.txt
```

---

## 📊 Performance Monitoring

### Query Performance Analysis

```sql
-- Top 10 slowest queries by total time
SELECT
    substring(query, 1, 100) AS query_sample,
    calls,
    ROUND(total_exec_time::numeric, 2) AS total_time_ms,
    ROUND(mean_exec_time::numeric, 2) AS mean_time_ms,
    ROUND(max_exec_time::numeric, 2) AS max_time_ms
FROM pg_stat_statements
WHERE calls > 100
ORDER BY total_exec_time DESC
LIMIT 10;

-- Queries with high variance (unstable performance)
SELECT
    substring(query, 1, 100) AS query_sample,
    ROUND(mean_exec_time::numeric, 2) AS mean_ms,
    ROUND(stddev_exec_time::numeric, 2) AS stddev_ms,
    ROUND((stddev_exec_time / NULLIF(mean_exec_time, 0))::numeric, 2) AS cv
FROM pg_stat_statements
WHERE calls > 100
    AND stddev_exec_time > mean_exec_time * 0.5
ORDER BY cv DESC
LIMIT 10;
```

### Index Usage Analysis

```sql
-- Unused indexes (never scanned)
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan AS scans,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND idx_scan = 0
    AND indexname NOT LIKE '%_pkey'
    AND pg_relation_size(indexrelid) > 10485760  -- >10MB
ORDER BY pg_relation_size(indexrelid) DESC;

-- Tables with many sequential scans (missing indexes?)
SELECT
    schemaname,
    tablename,
    seq_scan,
    idx_scan,
    ROUND(seq_scan::numeric / NULLIF(idx_scan, 0)::numeric, 2) AS seq_to_idx_ratio,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND seq_scan > 1000
    AND (idx_scan = 0 OR seq_scan::numeric / idx_scan::numeric > 10)
ORDER BY seq_scan DESC
LIMIT 10;
```

### Connection Monitoring

```sql
-- Active connections by state
SELECT
    state,
    count(*) AS count,
    ROUND(100.0 * count(*) / (SELECT setting::int FROM pg_settings WHERE name = 'max_connections'), 2) AS pct
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state;

-- Idle in transaction (connection leaks?)
SELECT
    pid,
    usename,
    application_name,
    state,
    now() - state_change AS duration
FROM pg_stat_activity
WHERE state = 'idle in transaction'
    AND now() - state_change > interval '1 minute'
ORDER BY duration DESC;
```

---

## 🚨 Alert Configuration

### Alert Levels

**Critical** (Immediate action required):
- System is degraded or down
- Data integrity at risk
- Performance severely impacted

**Warning** (Action required soon):
- Performance degrading
- Resources approaching limits
- Non-critical issues

**Info** (Monitor):
- Trends and patterns
- Capacity planning metrics

### Alert Rules

```yaml
# Example alert configuration (Prometheus/AlertManager format)
groups:
  - name: vendhub_database
    interval: 60s
    rules:
      # Cache hit ratio
      - alert: LowCacheHitRatio
        expr: vendhub_cache_hit_ratio < 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Database cache hit ratio is low ({{ $value }}%)"
          description: "Consider increasing shared_buffers"

      # Connection pool
      - alert: HighConnectionUsage
        expr: (vendhub_connections_active / vendhub_connections_max) > 0.8
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Connection pool usage is high ({{ $value }}%)"
          description: "Check for connection leaks or add PgBouncer"

      # Table bloat
      - alert: HighTableBloat
        expr: vendhub_table_bloat_pct > 20
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Table {{ $labels.table }} has high bloat ({{ $value }}%)"
          description: "Run VACUUM FULL on affected tables"

      # Replication lag
      - alert: HighReplicationLag
        expr: vendhub_replication_lag_bytes > 100000000
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Replication lag is >100MB"
          description: "Check network and replication status"

      # Long running queries
      - alert: LongRunningQuery
        expr: vendhub_query_duration_seconds > 300
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Query running for >5 minutes"
          description: "Check query execution plan"
```

---

## 🔌 Integration Guides

### Grafana Dashboard

**Setup**:

1. **Install PostgreSQL datasource**:
   ```bash
   # Grafana → Configuration → Data Sources → Add PostgreSQL
   ```

2. **Configure connection**:
   ```yaml
   Host: localhost:5432
   Database: vendhub
   User: grafana_readonly
   SSL Mode: require
   ```

3. **Import dashboard**:
   - Use monitoring queries from `monitoring-queries.sql`
   - Create panels for each metric category

**Example Panel Configuration**:

```json
{
  "title": "Cache Hit Ratio",
  "targets": [
    {
      "rawSql": "SELECT * FROM v_cache_hit_ratio",
      "refId": "A"
    }
  ],
  "type": "gauge",
  "options": {
    "thresholds": {
      "mode": "absolute",
      "steps": [
        {"value": 0, "color": "red"},
        {"value": 90, "color": "yellow"},
        {"value": 95, "color": "green"}
      ]
    }
  }
}
```

### DataDog Integration

**Setup**:

1. **Install DataDog agent**:
   ```bash
   DD_API_KEY=<YOUR_KEY> bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_script.sh)"
   ```

2. **Configure PostgreSQL integration**:
   ```yaml
   # /etc/datadog-agent/conf.d/postgres.d/conf.yaml
   init_config:

   instances:
     - host: localhost
       port: 5432
       username: datadog
       password: <PASSWORD>
       dbname: vendhub
       tags:
         - env:production
         - service:vendhub
       relations:
         - relation_regex: .*
       custom_queries:
         - metric_prefix: vendhub
           query: SELECT * FROM v_database_summary
           columns:
             - name: metric
               type: tag
             - name: value
               type: gauge
   ```

3. **Restart agent**:
   ```bash
   sudo systemctl restart datadog-agent
   ```

### Prometheus + postgres_exporter

**Setup**:

1. **Install postgres_exporter**:
   ```bash
   docker run -d \
     --name postgres_exporter \
     -p 9187:9187 \
     -e DATA_SOURCE_NAME="postgresql://postgres:password@localhost:5432/vendhub?sslmode=disable" \
     prometheuscommunity/postgres-exporter
   ```

2. **Configure Prometheus**:
   ```yaml
   # prometheus.yml
   scrape_configs:
     - job_name: 'vendhub_postgres'
       static_configs:
         - targets: ['localhost:9187']
           labels:
             env: production
             service: vendhub
   ```

3. **Custom queries**:
   ```yaml
   # queries.yaml
   vendhub_cache_hit_ratio:
     query: "SELECT * FROM v_cache_hit_ratio"
     metrics:
       - cache_hit_pct:
           usage: "GAUGE"
           description: "Cache hit ratio percentage"

   vendhub_connections:
     query: "SELECT * FROM v_active_connections"
     metrics:
       - connection_count:
           usage: "GAUGE"
           description: "Active connections by state"
   ```

### New Relic Integration

**Setup**:

1. **Install infrastructure agent**:
   ```bash
   curl -Ls https://download.newrelic.com/infrastructure_agent/linux/apt/keys/newrelic.gpg | sudo apt-key add -
   echo "deb https://download.newrelic.com/infrastructure_agent/linux/apt focal main" | sudo tee /etc/apt/sources.list.d/newrelic.list
   sudo apt update && sudo apt install newrelic-infra
   ```

2. **Configure PostgreSQL integration**:
   ```yaml
   # /etc/newrelic-infra/integrations.d/postgresql-config.yml
   integration_name: com.newrelic.postgresql

   instances:
     - name: vendhub
       command: all_data
       arguments:
         hostname: localhost
         port: 5432
         username: newrelic
         password: <PASSWORD>
         database: vendhub
         custom_metrics_query: SELECT * FROM v_database_summary
   ```

---

## 🔧 Troubleshooting

### Low Cache Hit Ratio (<95%)

**Diagnosis**:
```sql
SELECT * FROM v_cache_hit_ratio;
```

**Solutions**:
1. Increase `shared_buffers` in `postgresql.conf`:
   ```ini
   shared_buffers = 4GB  # 25% of RAM
   ```
2. Increase `effective_cache_size`:
   ```ini
   effective_cache_size = 12GB  # 50-75% of RAM
   ```
3. Add missing indexes (check `v_sequential_scans`)

### High Connection Usage (>80%)

**Diagnosis**:
```sql
SELECT * FROM v_active_connections;
```

**Solutions**:
1. **Implement PgBouncer** (see `docker-compose.pgbouncer.yml`)
2. **Find connection leaks**:
   ```sql
   SELECT application_name, count(*)
   FROM pg_stat_activity
   GROUP BY application_name
   ORDER BY count(*) DESC;
   ```
3. **Set connection timeouts** in application
4. **Increase `max_connections`** (not recommended without pooling)

### Table Bloat (>20%)

**Diagnosis**:
```sql
SELECT * FROM v_table_bloat WHERE dead_pct > 20;
```

**Solutions**:
```sql
-- Regular VACUUM
VACUUM ANALYZE tablename;

-- VACUUM FULL (requires downtime)
VACUUM FULL tablename;

-- Enable autovacuum (should already be on)
ALTER TABLE tablename SET (autovacuum_enabled = true);
```

### Slow Queries

**Diagnosis**:
```sql
SELECT * FROM v_slow_queries LIMIT 10;
```

**Solutions**:
1. **Add missing indexes**:
   ```sql
   -- Check query plan
   EXPLAIN ANALYZE <slow_query>;

   -- Add index if needed
   CREATE INDEX CONCURRENTLY idx_name ON table(column);
   ```

2. **Optimize query**:
   - Remove unnecessary JOINs
   - Add WHERE clauses
   - Use LIMIT when appropriate
   - Consider materialized views for complex aggregations

3. **Increase work_mem** for sorting/aggregation:
   ```sql
   SET work_mem = '256MB';  -- Per query
   ```

### Replication Lag

**Diagnosis**:
```sql
SELECT
    application_name,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)) AS lag
FROM pg_stat_replication;
```

**Solutions**:
1. Check network latency between primary and standby
2. Increase `wal_keep_size`:
   ```ini
   wal_keep_size = 2GB
   ```
3. Check standby server resources (CPU, disk I/O)
4. Consider using streaming replication instead of WAL shipping

---

## ✅ Best Practices

### 1. Regular Maintenance Schedule

```bash
# crontab -e

# Daily
0 2 * * * /opt/vendhub/backend/scripts/database/maintenance.sh --vacuum --analyze
0 1 * * * /opt/vendhub/backend/scripts/database/backup.sh --type daily --upload-s3

# Weekly
0 3 * * 0 /opt/vendhub/backend/scripts/database/maintenance.sh --all
0 2 * * 0 /opt/vendhub/backend/scripts/database/backup.sh --type weekly --upload-s3

# Monthly
0 4 1 * * /opt/vendhub/backend/scripts/database/backup.sh --type monthly --upload-s3
0 5 1 * * /opt/vendhub/backend/scripts/database/audit-fk-indexes.sh

# Hourly health checks
0 * * * * /opt/vendhub/backend/scripts/database/health-check.sh --alerts-only
```

### 2. Monitoring Checklist

- [ ] Health check runs hourly
- [ ] Alerts configured for critical metrics
- [ ] Dashboard shows key metrics
- [ ] Backup verification automated
- [ ] Slow query log reviewed weekly
- [ ] Table bloat checked weekly
- [ ] Index usage audited monthly
- [ ] Connection pool sized appropriately
- [ ] Disk space monitored
- [ ] Replication lag monitored (if applicable)

### 3. Performance Baseline

Record baselines after optimization:

```sql
-- Record baseline metrics
CREATE TABLE monitoring.performance_baseline AS
SELECT
    now() AS recorded_at,
    (SELECT * FROM v_cache_hit_ratio) AS cache_hit_ratio,
    (SELECT count(*) FROM pg_stat_activity) AS active_connections,
    (SELECT pg_database_size(current_database())) AS db_size,
    (SELECT AVG(mean_exec_time) FROM pg_stat_statements) AS avg_query_time;
```

### 4. Capacity Planning

Track growth trends:

```sql
-- Create capacity tracking table
CREATE TABLE IF NOT EXISTS monitoring.capacity_tracking (
    recorded_at timestamp DEFAULT now(),
    db_size_bytes bigint,
    total_connections int,
    avg_query_time_ms numeric,
    top_table_sizes jsonb
);

-- Record weekly snapshots (add to cron)
INSERT INTO monitoring.capacity_tracking (
    db_size_bytes,
    total_connections,
    avg_query_time_ms,
    top_table_sizes
)
SELECT
    pg_database_size(current_database()),
    (SELECT count(*) FROM pg_stat_activity),
    (SELECT AVG(mean_exec_time) FROM pg_stat_statements),
    (SELECT jsonb_agg(row_to_json(t)) FROM (SELECT * FROM v_table_sizes LIMIT 10) t);
```

---

## 📚 Additional Resources

### Documentation
- [PostgreSQL Monitoring Documentation](https://www.postgresql.org/docs/current/monitoring.html)
- [pg_stat_statements Documentation](https://www.postgresql.org/docs/current/pgstatstatements.html)
- [VendHub Database Analysis Report](./DATABASE_ANALYSIS_REPORT.md)

### Tools
- [PgHero](https://github.com/ankane/pghero) - PostgreSQL insights
- [pgBadger](https://github.com/darold/pgbadger) - Log analyzer
- [pgCluu](https://pgcluu.darold.net/) - PostgreSQL auditing tool
- [Prometheus postgres_exporter](https://github.com/prometheus-community/postgres_exporter)

### Scripts
- `backend/scripts/database/health-check.sh` - Automated health checks
- `backend/scripts/database/maintenance.sh` - Routine maintenance
- `backend/scripts/database/backup.sh` - Automated backups
- `backend/scripts/database/audit-fk-indexes.sh` - Index auditing
- `backend/scripts/database/monitoring-queries.sql` - Monitoring queries

---

**Questions or Issues?**
See [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) or contact the VendHub DevOps team.

---

**Last Updated**: 2025-01-25
**Maintained By**: VendHub DevOps Team
