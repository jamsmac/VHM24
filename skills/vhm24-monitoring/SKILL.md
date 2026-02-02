---
name: vhm24-monitoring
description: |
  VendHub Monitoring & Observability - логирование, метрики, алерты, error tracking.
  Настраивает Prometheus, Grafana, Winston logging, Sentry, health checks.
  Использовать при настройке мониторинга, создании дашбордов, настройке алертов.
  Triggers: "monitoring", "logs", "metrics", "prometheus", "grafana", "sentry", "alerts", "health check", "observability"
---

# VendHub Monitoring & Observability

Скилл для настройки мониторинга, логирования и алертинга VendHub OS.

## Архитектура мониторинга

```
┌─────────────────────────────────────────────────────────────────┐
│                        VendHub Services                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Backend   │  │  Frontend   │  │   Mobile    │              │
│  │   NestJS    │  │   Next.js   │  │ React Native│              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
└─────────┼────────────────┼────────────────┼─────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Observability Stack                         │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Prometheus │  │   Grafana   │  │   Sentry    │              │
│  │  (Metrics)  │  │ (Dashboards)│  │  (Errors)   │              │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘              │
│         │                │                                       │
│         ▼                ▼                                       │
│  ┌─────────────┐  ┌─────────────┐                               │
│  │AlertManager │  │   Winston   │                               │
│  │  (Alerts)   │  │  (Logging)  │                               │
│  └──────┬──────┘  └─────────────┘                               │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────┐                                                │
│  │  Telegram   │  ← Уведомления об инцидентах                   │
│  └─────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
```

## Компоненты

| Компонент | Назначение | Файл конфигурации |
|-----------|------------|-------------------|
| Prometheus | Сбор метрик | prometheus.yml |
| Grafana | Визуализация | grafana/dashboards/*.json |
| AlertManager | Уведомления | alertmanager.yml |
| Winston | Логирование | logger.config.ts |
| Sentry | Error tracking | sentry.config.ts |

## Паттерны

### Метрики (Prometheus)

Для настройки метрик см. [references/prometheus-metrics.md](references/prometheus-metrics.md):
- HTTP метрики (requests, latency, errors)
- Business метрики (tasks, machines, sales)
- Custom метрики
- Endpoint /metrics

### Дашборды (Grafana)

Для создания дашбордов см. [references/grafana-dashboards.md](references/grafana-dashboards.md):
- VendHub Overview
- API Performance
- Database Health
- Business Metrics

Готовые дашборды: [assets/grafana/](assets/grafana/)

### Алерты (AlertManager)

Для настройки алертов см. [references/alertmanager-rules.md](references/alertmanager-rules.md):
- Critical: сервис недоступен, ошибки БД
- Warning: высокая нагрузка, медленные запросы
- Info: деплой, миграции

### Логирование (Winston)

Для настройки логов см. [references/logging-patterns.md](references/logging-patterns.md):
- Structured JSON logging
- Log levels (error, warn, info, debug)
- Request/Response logging
- Correlation IDs

### Error Tracking (Sentry)

Для настройки Sentry см. [references/sentry-setup.md](references/sentry-setup.md):
- Source maps
- Release tracking
- Performance monitoring
- User context

## Быстрый старт

### 1. Установка зависимостей

```bash
cd backend
npm install @willsoto/nestjs-prometheus prom-client
npm install winston winston-daily-rotate-file
npm install @sentry/node @sentry/tracing
```

### 2. Подключение метрик

```typescript
// app.module.ts
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: { enabled: true },
      path: '/metrics',
    }),
  ],
})
```

### 3. Запуск мониторинга

```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

### 4. Доступ к сервисам

| Сервис | URL | Credentials |
|--------|-----|-------------|
| Grafana | http://localhost:3002 | admin/admin |
| Prometheus | http://localhost:9090 | - |
| AlertManager | http://localhost:9093 | - |

## Ключевые метрики VendHub

### HTTP метрики
- `http_requests_total` - количество запросов
- `http_request_duration_seconds` - время ответа
- `http_requests_errors_total` - ошибки

### Business метрики
- `vendhub_tasks_total{status}` - задачи по статусам
- `vendhub_machines_total{status}` - машины по статусам
- `vendhub_sales_total` - продажи
- `vendhub_active_users` - активные пользователи

### Database метрики
- `db_query_duration_seconds` - время запросов
- `db_connections_active` - активные соединения
- `db_pool_size` - размер пула

## Health Checks

### Endpoint структура

```typescript
// GET /health
{
  "status": "ok",
  "timestamp": "2025-02-01T22:00:00.000Z",
  "services": {
    "database": { "status": "ok", "responseTime": 5 },
    "redis": { "status": "ok", "responseTime": 2 },
    "telegram": { "status": "ok" }
  },
  "version": "1.0.0",
  "uptime": 86400
}
```

## Troubleshooting

| Проблема | Проверить | Решение |
|----------|-----------|---------|
| Метрики не собираются | /metrics endpoint | Проверить PrometheusModule |
| Grafana не видит данные | prometheus datasource | Проверить URL prometheus |
| Алерты не приходят | AlertManager config | Проверить Telegram webhook |
| Логи не пишутся | winston config | Проверить LOG_LEVEL |
| Sentry не получает ошибки | SENTRY_DSN | Проверить DSN и source maps |
