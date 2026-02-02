# Grafana Dashboards для VendHub

## Настройка Grafana

### docker-compose.monitoring.yml

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:v2.47.0
    volumes:
      - ./monitoring/prometheus:/etc/prometheus
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.enable-lifecycle'
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:10.2.0
    volumes:
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
      - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin}
      - GF_USERS_ALLOW_SIGN_UP=false
    ports:
      - "3002:3000"
    depends_on:
      - prometheus

  alertmanager:
    image: prom/alertmanager:v0.26.0
    volumes:
      - ./monitoring/alertmanager:/etc/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
    ports:
      - "9093:9093"

volumes:
  prometheus_data:
  grafana_data:
```

### Provisioning Datasources

```yaml
# monitoring/grafana/provisioning/datasources/datasources.yml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false

  - name: PostgreSQL
    type: postgres
    url: ${DATABASE_HOST}:5432
    database: vendhub
    user: ${DATABASE_USER}
    secureJsonData:
      password: ${DATABASE_PASSWORD}
    jsonData:
      sslmode: disable
      maxOpenConns: 5
```

### Provisioning Dashboards

```yaml
# monitoring/grafana/provisioning/dashboards/dashboards.yml
apiVersion: 1

providers:
  - name: 'VendHub Dashboards'
    orgId: 1
    folder: 'VendHub'
    type: file
    disableDeletion: false
    editable: true
    options:
      path: /var/lib/grafana/dashboards
```

## Dashboard: VendHub Overview

```json
{
  "title": "VendHub Overview",
  "uid": "vendhub-overview",
  "panels": [
    {
      "title": "Request Rate",
      "type": "stat",
      "gridPos": { "x": 0, "y": 0, "w": 6, "h": 4 },
      "targets": [{
        "expr": "sum(rate(http_requests_total[5m]))",
        "legendFormat": "req/s"
      }]
    },
    {
      "title": "Error Rate",
      "type": "stat",
      "gridPos": { "x": 6, "y": 0, "w": 6, "h": 4 },
      "targets": [{
        "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m])) * 100",
        "legendFormat": "%"
      }],
      "fieldConfig": {
        "defaults": {
          "thresholds": {
            "steps": [
              { "color": "green", "value": null },
              { "color": "yellow", "value": 1 },
              { "color": "red", "value": 5 }
            ]
          },
          "unit": "percent"
        }
      }
    },
    {
      "title": "Active Machines",
      "type": "stat",
      "gridPos": { "x": 12, "y": 0, "w": 6, "h": 4 },
      "targets": [{
        "expr": "vendhub_machines_total{status=\"online\"}",
        "legendFormat": "Online"
      }]
    },
    {
      "title": "Tasks Today",
      "type": "stat",
      "gridPos": { "x": 18, "y": 0, "w": 6, "h": 4 },
      "targets": [{
        "expr": "increase(vendhub_tasks_total{status=\"completed\"}[24h])",
        "legendFormat": "Completed"
      }]
    },
    {
      "title": "Response Time (p95)",
      "type": "timeseries",
      "gridPos": { "x": 0, "y": 4, "w": 12, "h": 8 },
      "targets": [{
        "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
        "legendFormat": "p95"
      }],
      "fieldConfig": {
        "defaults": {
          "unit": "s"
        }
      }
    },
    {
      "title": "Request Rate by Status",
      "type": "timeseries",
      "gridPos": { "x": 12, "y": 4, "w": 12, "h": 8 },
      "targets": [{
        "expr": "sum by(status) (rate(http_requests_total[5m]))",
        "legendFormat": "{{status}}"
      }]
    }
  ]
}
```

## Dashboard: Business Metrics

```json
{
  "title": "VendHub Business",
  "uid": "vendhub-business",
  "panels": [
    {
      "title": "Daily Revenue (UZS)",
      "type": "stat",
      "gridPos": { "x": 0, "y": 0, "w": 8, "h": 4 },
      "targets": [{
        "expr": "increase(vendhub_sales_revenue_uzs[24h])",
        "legendFormat": "Revenue"
      }],
      "fieldConfig": {
        "defaults": {
          "unit": "currencyUZS"
        }
      }
    },
    {
      "title": "Sales Count Today",
      "type": "stat",
      "gridPos": { "x": 8, "y": 0, "w": 8, "h": 4 },
      "targets": [{
        "expr": "increase(vendhub_sales_count[24h])"
      }]
    },
    {
      "title": "Active Users",
      "type": "stat",
      "gridPos": { "x": 16, "y": 0, "w": 8, "h": 4 },
      "targets": [{
        "expr": "sum(vendhub_active_users)"
      }]
    },
    {
      "title": "Machine Status",
      "type": "piechart",
      "gridPos": { "x": 0, "y": 4, "w": 8, "h": 8 },
      "targets": [{
        "expr": "vendhub_machines_total",
        "legendFormat": "{{status}}"
      }]
    },
    {
      "title": "Tasks by Type",
      "type": "barchart",
      "gridPos": { "x": 8, "y": 4, "w": 8, "h": 8 },
      "targets": [{
        "expr": "increase(vendhub_tasks_total[24h])",
        "legendFormat": "{{type}} - {{status}}"
      }]
    },
    {
      "title": "Sales by Machine",
      "type": "table",
      "gridPos": { "x": 16, "y": 4, "w": 8, "h": 8 },
      "targets": [{
        "expr": "topk(10, increase(vendhub_sales_revenue_uzs[24h]))",
        "format": "table"
      }]
    }
  ]
}
```

## Dashboard: API Performance

```json
{
  "title": "VendHub API Performance",
  "uid": "vendhub-api",
  "panels": [
    {
      "title": "Endpoints by Latency",
      "type": "table",
      "gridPos": { "x": 0, "y": 0, "w": 24, "h": 8 },
      "targets": [{
        "expr": "topk(20, histogram_quantile(0.95, sum by(path) (rate(http_request_duration_seconds_bucket[5m]))))",
        "format": "table"
      }]
    },
    {
      "title": "Slowest Endpoints",
      "type": "timeseries",
      "gridPos": { "x": 0, "y": 8, "w": 12, "h": 8 },
      "targets": [{
        "expr": "topk(5, histogram_quantile(0.95, sum by(path) (rate(http_request_duration_seconds_bucket[5m]))))",
        "legendFormat": "{{path}}"
      }]
    },
    {
      "title": "Error Rate by Endpoint",
      "type": "timeseries",
      "gridPos": { "x": 12, "y": 8, "w": 12, "h": 8 },
      "targets": [{
        "expr": "topk(5, sum by(path) (rate(http_requests_total{status=~\"5..\"}[5m])))",
        "legendFormat": "{{path}}"
      }]
    }
  ]
}
```

## Полезные переменные

```yaml
# Добавить в dashboard для фильтрации
variables:
  - name: machine_id
    type: query
    query: label_values(vendhub_machines_total, machine_id)

  - name: task_type
    type: custom
    options:
      - refill
      - collection
      - maintenance
      - inspection

  - name: time_range
    type: interval
    options:
      - 5m
      - 15m
      - 1h
      - 6h
      - 24h
```
