# VendHub Manager - Monitoring Setup Guide

> **Version:** 1.0.0
> **Last Updated:** 2025-12-24
> **Author:** VendHub DevOps Team

This guide covers the complete setup and configuration of the VendHub Manager monitoring stack, including Prometheus, Grafana, and Alertmanager.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Quick Start](#quick-start)
5. [Component Setup](#component-setup)
6. [Alert Configuration](#alert-configuration)
7. [Slack Integration](#slack-integration)
8. [Grafana Dashboards](#grafana-dashboards)
9. [Metrics Reference](#metrics-reference)
10. [Troubleshooting](#troubleshooting)
11. [Production Deployment](#production-deployment)

---

## Overview

The VendHub monitoring stack provides comprehensive observability for the application:

| Component | Purpose | Port |
|-----------|---------|------|
| **Prometheus** | Metrics collection & alerting | 9090 |
| **Grafana** | Visualization & dashboards | 3002 |
| **Alertmanager** | Alert routing & notifications | 9093 |
| **Node Exporter** | Host system metrics | 9100 |
| **Postgres Exporter** | Database metrics | 9187 |
| **Redis Exporter** | Cache metrics | 9121 |
| **cAdvisor** | Container metrics | 8080 |
| **Blackbox Exporter** | Endpoint probing | 9115 |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        VendHub Monitoring Stack                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐        │
│  │   Railway    │     │   Backend    │     │   Workers    │        │
│  │   Backend    │     │   (Local)    │     │              │        │
│  │  /metrics    │     │  /metrics    │     │  /metrics    │        │
│  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘        │
│         │                    │                    │                 │
│         └────────────────────┼────────────────────┘                 │
│                              ▼                                      │
│                    ┌──────────────────┐                            │
│                    │    Prometheus    │                            │
│                    │   (Scraping)     │                            │
│                    └────────┬─────────┘                            │
│                             │                                       │
│              ┌──────────────┼──────────────┐                       │
│              ▼              ▼              ▼                        │
│     ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│     │   Grafana    │ │ Alertmanager │ │    Alert     │            │
│     │ (Dashboards) │ │  (Routing)   │ │    Rules     │            │
│     └──────────────┘ └──────┬───────┘ └──────────────┘            │
│                             │                                       │
│                             ▼                                       │
│                    ┌──────────────────┐                            │
│                    │      Slack       │                            │
│                    │  #vendhub-alerts │                            │
│                    └──────────────────┘                            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Required Software

- Docker & Docker Compose
- Git
- curl (for testing)

### Network Requirements

| Service | Port | Access |
|---------|------|--------|
| Prometheus | 9090 | localhost only |
| Grafana | 3002 | localhost only |
| Alertmanager | 9093 | localhost only |

### Backend Requirements

The backend must expose a `/metrics` endpoint. This is already configured in VendHub:

```typescript
// backend/src/main.ts
app.setGlobalPrefix('api/v1', {
  exclude: ['health', 'health/ready', 'health/live', 'health/queues', 'metrics'],
});
```

---

## Quick Start

### 1. Start the Monitoring Stack

```bash
# Navigate to project root
cd VHM24-repo

# Create required network
docker network create vendhub-network 2>/dev/null || true

# Start core monitoring services
docker-compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d \
  prometheus grafana alertmanager node-exporter
```

### 2. Configure Alertmanager (Slack)

```bash
# Copy the template
cp monitoring/alertmanager/alertmanager.yml.example monitoring/alertmanager/alertmanager.yml

# Edit and add your Slack webhook URL
# Replace YOUR_SLACK_WEBHOOK_URL_HERE with your actual webhook
nano monitoring/alertmanager/alertmanager.yml

# Restart Alertmanager
docker restart vendhub-alertmanager
```

### 3. Access Services

| Service | URL | Credentials |
|---------|-----|-------------|
| Grafana | http://localhost:3002 | admin / vendhub_grafana_2024 |
| Prometheus | http://localhost:9090 | No auth |
| Alertmanager | http://localhost:9093 | No auth |

### 4. Verify Setup

```bash
# Check Prometheus targets
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'

# Check Alertmanager status
curl -s http://localhost:9093/api/v1/status | jq '.data.configJSON'

# Test metrics endpoint
curl -s http://localhost:3000/metrics | head -20
```

---

## Component Setup

### Prometheus Configuration

Location: `monitoring/prometheus/prometheus.yml`

#### Scrape Targets

```yaml
scrape_configs:
  # Local backend
  - job_name: 'vendhub-backend'
    static_configs:
      - targets: ['backend:3000']

  # Railway production backend
  - job_name: 'vendhub-backend-railway'
    scheme: https
    static_configs:
      - targets: ['vhm24-production.up.railway.app']

  # Database metrics
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  # Redis metrics
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

#### Reload Configuration

```bash
# Hot reload (if enabled)
curl -X POST http://localhost:9090/-/reload

# Or restart container
docker restart vendhub-prometheus
```

### Grafana Configuration

Location: `monitoring/grafana/`

#### Directory Structure

```
monitoring/grafana/
├── provisioning/
│   ├── datasources/
│   │   └── prometheus.yml      # Prometheus data source
│   └── dashboards/
│       └── dashboards.yml      # Dashboard provisioning
└── dashboards/
    ├── vendhub-operations.json # Main operations dashboard
    └── vendhub-infrastructure.json # Infrastructure dashboard
```

#### Data Source Configuration

```yaml
# provisioning/datasources/prometheus.yml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
```

### Alertmanager Configuration

Location: `monitoring/alertmanager/alertmanager.yml`

#### Routing Rules

```yaml
route:
  receiver: 'default-receiver'
  group_by: ['alertname', 'severity', 'component']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h

  routes:
    # Critical alerts - immediate
    - match:
        severity: critical
      receiver: 'critical-alerts'
      group_wait: 10s
      repeat_interval: 1h

    # Warning alerts
    - match:
        severity: warning
      receiver: 'warning-alerts'
      group_wait: 1m
      repeat_interval: 4h
```

---

## Alert Configuration

### Alert Rules Overview

Location: `monitoring/prometheus/alerts.yml`

| Group | Rules | Description |
|-------|-------|-------------|
| backend_api_alerts | 9 | API health, errors, latency |
| nodejs_runtime_alerts | 8 | Event loop, memory, restarts |
| database_alerts | 7 | PostgreSQL health & performance |
| redis_alerts | 5 | Redis health & memory |
| worker_alerts | 5 | Queue health & backlogs |
| security_alerts | 6 | Login failures, rate limiting |
| business_alerts | 5 | Task completion, machines |
| infrastructure_alerts | 4 | Host CPU, memory, disk |
| storage_alerts | 3 | MinIO health & space |
| sla_alerts | 3 | SLO violations |

**Total: 55 alert rules**

### Critical Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| BackendAPIDown | `up{job=~"vendhub-backend.*"} == 0` for 2m | Check backend logs, restart if needed |
| PostgreSQLDown | `up{job="postgres"} == 0` for 1m | Check database connectivity |
| RedisDown | `up{job="redis"} == 0` for 1m | Check Redis service |
| CriticalMemoryUsage | Memory > 1800MB for 5m | Investigate memory leak, restart |
| CriticalEventLoopLag | Lag > 500ms for 2m | Check for blocking operations |
| FrequentRestarts | > 3 restarts in 1h | Investigate crash cause |
| CriticalQueueBacklog | > 1000 waiting jobs | Scale workers, investigate |

### Warning Alerts

| Alert | Condition | Action |
|-------|-----------|--------|
| HighErrorRate | Error rate > 5% for 5m | Check error logs |
| HighResponseTime | P95 > 1s for 5m | Optimize slow endpoints |
| HighMemoryUsage | Memory > 1500MB for 10m | Monitor for leaks |
| QueueBacklog | > 500 waiting jobs | Monitor queue processing |
| HighLoginFailureRate | > 0.5/s for 5m | Check for attacks |

### Adding Custom Alerts

```yaml
# Add to monitoring/prometheus/alerts.yml
- alert: CustomAlert
  expr: your_metric > threshold
  for: 5m
  labels:
    severity: warning
    component: custom
  annotations:
    summary: "Custom alert fired"
    description: "Metric value is {{ $value }}"
```

---

## Slack Integration

### Step 1: Create Slack App

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name: `VendHub Alerts`
4. Select your workspace

### Step 2: Enable Incoming Webhooks

1. Click "Incoming Webhooks" in sidebar
2. Toggle "Activate Incoming Webhooks" to ON
3. Click "Add New Webhook to Workspace"
4. Select channel: `#vendhub-alerts`
5. Copy the webhook URL

### Step 3: Configure Alertmanager

```yaml
# monitoring/alertmanager/alertmanager.yml
global:
  slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'

receivers:
  - name: 'critical-alerts'
    slack_configs:
      - channel: '#vendhub-alerts'
        send_resolved: true
        color: '{{ if eq .Status "firing" }}danger{{ else }}good{{ end }}'
        title: ':rotating_light: CRITICAL: {{ .CommonLabels.alertname }}'
        text: |-
          *Severity:* CRITICAL
          *Component:* {{ .CommonLabels.component }}
          *Description:* {{ range .Alerts }}{{ .Annotations.description }}{{ end }}
```

### Step 4: Test Integration

```bash
# Send test alert
curl -X POST http://localhost:9093/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '[{
    "labels": {"alertname": "TestAlert", "severity": "info"},
    "annotations": {"summary": "Test alert", "description": "Testing Slack integration"}
  }]'
```

### Alert Message Format

```
🚨 CRITICAL: BackendAPIDown
Severity: CRITICAL
Component: api
Description: Backend API has been down for more than 2 minutes
Status: FIRING
─────────────────
VendHub Monitoring
```

---

## Grafana Dashboards

### VendHub Operations Dashboard

**Purpose:** Real-time application monitoring

**Panels:**
- Process CPU Usage (%)
- Memory Usage (MB)
- Event Loop Lag (ms)
- HTTP Request Rate
- Error Rate
- Response Time (P95)
- Active Database Connections
- Queue Status

**Key Queries:**
```promql
# CPU Usage
rate(vendhub_process_cpu_seconds_total[5m]) * 100

# Memory Usage
vendhub_process_resident_memory_bytes / 1024 / 1024

# Event Loop Lag
vendhub_nodejs_eventloop_lag_seconds * 1000

# Request Rate
sum(rate(vendhub_http_requests_total[5m]))
```

### VendHub Infrastructure Dashboard

**Purpose:** Infrastructure health monitoring

**Panels:**
- Host CPU Usage
- Host Memory Usage
- Disk Usage
- Network I/O
- Container CPU/Memory
- PostgreSQL Connections
- Redis Memory Usage
- Redis Commands/sec

### Creating Custom Dashboards

1. Go to Grafana → Dashboards → New Dashboard
2. Add Panel → Select Prometheus data source
3. Enter PromQL query
4. Configure visualization
5. Save dashboard

---

## Metrics Reference

### Application Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `vendhub_process_cpu_seconds_total` | Counter | Total CPU time |
| `vendhub_process_resident_memory_bytes` | Gauge | Memory usage |
| `vendhub_process_heap_bytes` | Gauge | Heap memory |
| `vendhub_nodejs_eventloop_lag_seconds` | Gauge | Event loop lag |
| `vendhub_process_uptime_seconds` | Gauge | Process uptime |
| `vendhub_process_open_fds` | Gauge | Open file descriptors |

### Business Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `vendhub_tasks_completed_total` | Counter | Completed tasks |
| `vendhub_task_duration_seconds` | Histogram | Task completion time |
| `vendhub_inventory_movements_total` | Counter | Inventory changes |
| `vendhub_machines_active` | Gauge | Active machines |
| `vendhub_machines_offline` | Gauge | Offline machines |

### Security Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `vendhub_login_attempts_total` | Counter | Login attempts |
| `vendhub_login_failures_total` | Counter | Failed logins |
| `vendhub_2fa_authentications_total` | Counter | 2FA attempts |
| `vendhub_sessions_created_total` | Counter | New sessions |

### Database Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `database_connections_active` | Gauge | Active DB connections |
| `vendhub_database_query_duration_seconds` | Histogram | Query duration |

### Queue Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `bullmq_queue_waiting` | Gauge | Jobs waiting |
| `bullmq_queue_active` | Gauge | Jobs processing |
| `bullmq_queue_completed` | Counter | Completed jobs |
| `bullmq_queue_failed` | Counter | Failed jobs |
| `bullmq_queue_delayed` | Gauge | Delayed jobs |

---

## Troubleshooting

### Prometheus Not Scraping Targets

```bash
# Check target status
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.health != "up")'

# Common issues:
# 1. Network connectivity - ensure containers are on same network
# 2. Firewall rules - check port access
# 3. Wrong target URL - verify endpoint accessibility
```

### Alertmanager Not Sending Notifications

```bash
# Check Alertmanager status
curl -s http://localhost:9093/api/v1/status

# Check active alerts
curl -s http://localhost:9093/api/v1/alerts

# Verify Slack webhook
curl -X POST YOUR_WEBHOOK_URL -d '{"text":"Test"}'

# Check logs
docker logs vendhub-alertmanager
```

### Grafana Dashboard Not Loading

```bash
# Check Grafana logs
docker logs vendhub-grafana

# Verify Prometheus data source
curl -s http://localhost:3002/api/datasources

# Test Prometheus connectivity from Grafana
docker exec vendhub-grafana wget -qO- http://prometheus:9090/api/v1/query?query=up
```

### High Memory Usage Alerts

```bash
# Check current memory
curl -s 'http://localhost:9090/api/v1/query?query=vendhub_process_resident_memory_bytes' | jq '.data.result[0].value[1]'

# Check for memory growth
curl -s 'http://localhost:9090/api/v1/query_range?query=vendhub_process_resident_memory_bytes&start='$(date -d '1 hour ago' +%s)'&end='$(date +%s)'&step=60'
```

### Container Resource Issues

```bash
# Check container stats
docker stats vendhub-prometheus vendhub-grafana vendhub-alertmanager

# Increase resource limits in docker-compose.monitoring.yml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
```

---

## Production Deployment

### Security Hardening

1. **Enable Authentication**
```yaml
# Grafana
GF_AUTH_ANONYMOUS_ENABLED: "false"
GF_AUTH_BASIC_ENABLED: "true"
```

2. **Use HTTPS**
```yaml
# Nginx reverse proxy with SSL
server {
    listen 443 ssl;
    server_name monitoring.vendhub.com;

    ssl_certificate /etc/ssl/certs/monitoring.crt;
    ssl_certificate_key /etc/ssl/private/monitoring.key;

    location / {
        proxy_pass http://grafana:3000;
    }
}
```

3. **Restrict Network Access**
```yaml
# Bind to localhost only
ports:
  - "127.0.0.1:9090:9090"
```

### High Availability

```yaml
# Prometheus with remote storage
remote_write:
  - url: "http://thanos-receive:19291/api/v1/receive"

# Alertmanager cluster
alertmanager:
  command:
    - '--cluster.listen-address=0.0.0.0:9094'
    - '--cluster.peer=alertmanager-1:9094'
    - '--cluster.peer=alertmanager-2:9094'
```

### Backup Strategy

```bash
# Backup Prometheus data
docker run --rm -v prometheus-data:/data -v $(pwd):/backup alpine tar czf /backup/prometheus-backup.tar.gz /data

# Backup Grafana dashboards
curl -s http://admin:password@localhost:3002/api/dashboards/db/vendhub-operations | jq > dashboards-backup.json
```

### Monitoring the Monitors

Add self-monitoring alerts:

```yaml
- alert: PrometheusDown
  expr: up{job="prometheus"} == 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Prometheus is down"

- alert: AlertmanagerDown
  expr: up{job="alertmanager"} == 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Alertmanager is down"
```

---

## Quick Reference

### Useful Commands

```bash
# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Stop monitoring stack
docker-compose -f docker-compose.monitoring.yml down

# View logs
docker logs -f vendhub-prometheus
docker logs -f vendhub-grafana
docker logs -f vendhub-alertmanager

# Reload Prometheus config
curl -X POST http://localhost:9090/-/reload

# Query metrics
curl -s 'http://localhost:9090/api/v1/query?query=up'

# Send test alert
curl -X POST http://localhost:9093/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '[{"labels":{"alertname":"Test"}}]'
```

### URLs

| Service | URL |
|---------|-----|
| Grafana | http://localhost:3002 |
| Prometheus | http://localhost:9090 |
| Alertmanager | http://localhost:9093 |
| Prometheus Targets | http://localhost:9090/targets |
| Prometheus Alerts | http://localhost:9090/alerts |
| Alertmanager Status | http://localhost:9093/#/status |

### Default Credentials

| Service | Username | Password |
|---------|----------|----------|
| Grafana | admin | vendhub_grafana_2024 |

---

## Support

For issues with the monitoring stack:

1. Check this guide's troubleshooting section
2. Review container logs
3. Open an issue at: https://github.com/jamsmac/VHM24/issues

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-24
