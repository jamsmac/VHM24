# AlertManager Rules для VendHub

## Конфигурация AlertManager

### alertmanager.yml

```yaml
# monitoring/alertmanager/alertmanager.yml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'telegram-critical'

  routes:
    # Critical alerts → Telegram immediately
    - match:
        severity: critical
      receiver: 'telegram-critical'
      group_wait: 0s

    # Warning alerts → Telegram with delay
    - match:
        severity: warning
      receiver: 'telegram-warning'
      group_wait: 5m

    # Info alerts → только логирование
    - match:
        severity: info
      receiver: 'null'

receivers:
  - name: 'telegram-critical'
    telegram_configs:
      - bot_token: '${TELEGRAM_BOT_TOKEN}'
        chat_id: ${TELEGRAM_ALERT_CHAT_ID}
        parse_mode: 'HTML'
        message: |
          🚨 <b>CRITICAL ALERT</b>

          <b>Alert:</b> {{ .GroupLabels.alertname }}
          <b>Severity:</b> {{ .CommonLabels.severity }}

          {{ range .Alerts }}
          <b>Summary:</b> {{ .Annotations.summary }}
          <b>Description:</b> {{ .Annotations.description }}
          {{ end }}

          <i>{{ .ExternalURL }}</i>

  - name: 'telegram-warning'
    telegram_configs:
      - bot_token: '${TELEGRAM_BOT_TOKEN}'
        chat_id: ${TELEGRAM_ALERT_CHAT_ID}
        parse_mode: 'HTML'
        message: |
          ⚠️ <b>WARNING</b>

          {{ .GroupLabels.alertname }}
          {{ range .Alerts }}
          {{ .Annotations.summary }}
          {{ end }}

  - name: 'null'
    # Пустой receiver для info alerts

inhibit_rules:
  # Если сервис недоступен, не шлём алерты о его метриках
  - source_match:
      alertname: 'ServiceDown'
    target_match_re:
      alertname: '.+'
    equal: ['instance']
```

## Prometheus Alert Rules

### alerts.yml

```yaml
# monitoring/prometheus/rules/alerts.yml
groups:
  # ==========================================
  # Service Availability
  # ==========================================
  - name: availability
    rules:
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "{{ $labels.instance }} has been down for more than 1 minute"

      - alert: HealthCheckFailed
        expr: vendhub_health_check_status == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Health check failed for {{ $labels.service }}"
          description: "Service {{ $labels.service }} health check is failing"

  # ==========================================
  # HTTP Errors
  # ==========================================
  - name: http_errors
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status=~"5.."}[5m]))
          / sum(rate(http_requests_total[5m])) * 100 > 5
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate: {{ $value | printf \"%.2f\" }}%"
          description: "Error rate is above 5% for the last 5 minutes"

      - alert: HighLatency
        expr: |
          histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency: {{ $value | printf \"%.2f\" }}s (p95)"
          description: "95th percentile latency is above 2 seconds"

      - alert: TooManyRequests
        expr: sum(rate(http_requests_total[1m])) > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High request rate: {{ $value | printf \"%.0f\" }} req/s"

  # ==========================================
  # Database
  # ==========================================
  - name: database
    rules:
      - alert: DatabaseConnectionFailure
        expr: vendhub_db_pool_connections{state="waiting"} > 10
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Too many waiting database connections"
          description: "{{ $value }} connections waiting for database"

      - alert: SlowQueries
        expr: |
          histogram_quantile(0.95, rate(vendhub_db_query_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow database queries detected"
          description: "95th percentile query time is {{ $value | printf \"%.2f\" }}s"

      - alert: DatabaseDiskSpace
        expr: pg_database_size_bytes > 10e9
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Database size is large"
          description: "Database size is {{ $value | humanize1024 }}B"

  # ==========================================
  # Redis
  # ==========================================
  - name: redis
    rules:
      - alert: RedisDown
        expr: redis_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis is down"

      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes * 100 > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis memory usage high: {{ $value | printf \"%.1f\" }}%"

  # ==========================================
  # VendHub Business
  # ==========================================
  - name: vendhub_business
    rules:
      - alert: NoSalesInHour
        expr: increase(vendhub_sales_count[1h]) == 0
        for: 2h
        labels:
          severity: warning
        annotations:
          summary: "No sales in the last 2 hours"
          description: "Check if machines are operational"

      - alert: MachineOffline
        expr: |
          vendhub_machines_total{status="offline"}
          / ignoring(status) sum(vendhub_machines_total) * 100 > 20
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "{{ $value | printf \"%.0f\" }}% machines are offline"

      - alert: TasksBacklog
        expr: vendhub_tasks_total{status="pending"} > 50
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Large task backlog: {{ $value }} pending tasks"

      - alert: TelegramBotSlow
        expr: |
          histogram_quantile(0.95, rate(vendhub_telegram_response_time_seconds_bucket[5m])) > 3
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Telegram bot is responding slowly"

  # ==========================================
  # System Resources
  # ==========================================
  - name: system
    rules:
      - alert: HighCPUUsage
        expr: |
          100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage: {{ $value | printf \"%.1f\" }}%"

      - alert: HighMemoryUsage
        expr: |
          (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100 > 85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage: {{ $value | printf \"%.1f\" }}%"

      - alert: DiskSpaceLow
        expr: |
          (1 - node_filesystem_avail_bytes / node_filesystem_size_bytes) * 100 > 85
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "Disk space low: {{ $value | printf \"%.1f\" }}% used"
```

## Тестирование алертов

```bash
# Проверить синтаксис правил
promtool check rules /etc/prometheus/rules/*.yml

# Тестовый запрос в Prometheus
curl -g 'http://localhost:9090/api/v1/query?query=up==0'

# Проверить состояние алертов
curl http://localhost:9090/api/v1/alerts

# Отправить тестовый алерт
curl -X POST http://localhost:9093/api/v1/alerts \
  -H "Content-Type: application/json" \
  -d '[{
    "labels": {
      "alertname": "TestAlert",
      "severity": "warning"
    },
    "annotations": {
      "summary": "This is a test alert"
    }
  }]'
```
