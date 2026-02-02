# Prometheus Metrics для VendHub

## Установка

```bash
npm install @willsoto/nestjs-prometheus prom-client
```

## Конфигурация NestJS

### PrometheusModule

```typescript
// backend/src/app.module.ts
import { PrometheusModule, makeCounterProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'vendhub_',
        },
      },
      path: '/metrics',
      defaultLabels: {
        app: 'vendhub-backend',
        env: process.env.NODE_ENV || 'development',
      },
    }),
  ],
  providers: [
    // HTTP метрики
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
    }),
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    }),
    // Business метрики
    makeCounterProvider({
      name: 'vendhub_tasks_created_total',
      help: 'Total tasks created',
      labelNames: ['type'],
    }),
    makeCounterProvider({
      name: 'vendhub_sales_total',
      help: 'Total sales amount',
      labelNames: ['machine_id', 'product_type'],
    }),
  ],
})
export class AppModule {}
```

### HTTP Interceptor для метрик

```typescript
// backend/src/common/interceptors/metrics.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_requests_total')
    private readonly requestsCounter: Counter<string>,
    @InjectMetric('http_request_duration_seconds')
    private readonly requestDuration: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, path } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const status = response.statusCode;
          const duration = (Date.now() - startTime) / 1000;

          this.requestsCounter.inc({ method, path, status: String(status) });
          this.requestDuration.observe({ method, path, status: String(status) }, duration);
        },
        error: (error) => {
          const status = error.status || 500;
          const duration = (Date.now() - startTime) / 1000;

          this.requestsCounter.inc({ method, path, status: String(status) });
          this.requestDuration.observe({ method, path, status: String(status) }, duration);
        },
      }),
    );
  }
}
```

### Business Metrics Service

```typescript
// backend/src/common/services/metrics.service.ts
import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric('vendhub_tasks_created_total')
    private readonly tasksCounter: Counter<string>,
    @InjectMetric('vendhub_sales_total')
    private readonly salesCounter: Counter<string>,
  ) {}

  incrementTasksCreated(type: string) {
    this.tasksCounter.inc({ type });
  }

  recordSale(machineId: string, productType: string, amount: number) {
    this.salesCounter.inc({ machine_id: machineId, product_type: productType }, amount);
  }
}
```

## Custom Metrics для VendHub

### Определение метрик

```typescript
// backend/src/common/metrics/vendhub.metrics.ts
import { makeGaugeProvider, makeCounterProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus';

export const VendHubMetricsProviders = [
  // ==========================================
  // Machine Metrics
  // ==========================================
  makeGaugeProvider({
    name: 'vendhub_machines_total',
    help: 'Total number of machines by status',
    labelNames: ['status'], // online, offline, maintenance
  }),
  makeGaugeProvider({
    name: 'vendhub_machine_ingredient_level',
    help: 'Current ingredient level in machine',
    labelNames: ['machine_id', 'ingredient'],
  }),

  // ==========================================
  // Task Metrics
  // ==========================================
  makeCounterProvider({
    name: 'vendhub_tasks_total',
    help: 'Total tasks by type and status',
    labelNames: ['type', 'status'], // refill, collection, maintenance / pending, completed
  }),
  makeHistogramProvider({
    name: 'vendhub_task_completion_time_seconds',
    help: 'Task completion time in seconds',
    labelNames: ['type'],
    buckets: [60, 300, 600, 1800, 3600], // 1m, 5m, 10m, 30m, 1h
  }),

  // ==========================================
  // Sales Metrics
  // ==========================================
  makeCounterProvider({
    name: 'vendhub_sales_count',
    help: 'Number of sales transactions',
    labelNames: ['machine_id', 'payment_method'],
  }),
  makeCounterProvider({
    name: 'vendhub_sales_revenue_uzs',
    help: 'Total revenue in UZS',
    labelNames: ['machine_id'],
  }),

  // ==========================================
  // User Metrics
  // ==========================================
  makeGaugeProvider({
    name: 'vendhub_active_users',
    help: 'Number of currently active users',
    labelNames: ['role'],
  }),
  makeCounterProvider({
    name: 'vendhub_logins_total',
    help: 'Total login attempts',
    labelNames: ['status', 'method'], // success/failure, telegram/password
  }),

  // ==========================================
  // Telegram Bot Metrics
  // ==========================================
  makeCounterProvider({
    name: 'vendhub_telegram_messages_total',
    help: 'Total Telegram messages processed',
    labelNames: ['type'], // command, callback, message
  }),
  makeHistogramProvider({
    name: 'vendhub_telegram_response_time_seconds',
    help: 'Telegram bot response time',
    buckets: [0.1, 0.5, 1, 2, 5],
  }),

  // ==========================================
  // Database Metrics
  // ==========================================
  makeHistogramProvider({
    name: 'vendhub_db_query_duration_seconds',
    help: 'Database query duration',
    labelNames: ['operation', 'table'],
    buckets: [0.001, 0.01, 0.1, 0.5, 1, 5],
  }),
  makeGaugeProvider({
    name: 'vendhub_db_pool_connections',
    help: 'Database connection pool status',
    labelNames: ['state'], // active, idle, waiting
  }),
];
```

## prometheus.yml

```yaml
# monitoring/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

rule_files:
  - /etc/prometheus/rules/*.yml

scrape_configs:
  # VendHub Backend
  - job_name: 'vendhub-backend'
    static_configs:
      - targets: ['backend:3000']
    metrics_path: /metrics
    scrape_interval: 10s

  # PostgreSQL (если используется postgres_exporter)
  - job_name: 'postgresql'
    static_configs:
      - targets: ['postgres-exporter:9187']

  # Redis (если используется redis_exporter)
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  # Node Exporter (системные метрики)
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
```

## Полезные PromQL запросы

```promql
# Request rate per second
rate(http_requests_total[5m])

# 95th percentile latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100

# Active machines
vendhub_machines_total{status="online"}

# Tasks completed per hour
increase(vendhub_tasks_total{status="completed"}[1h])

# Revenue per day
increase(vendhub_sales_revenue_uzs[24h])

# Average task completion time
rate(vendhub_task_completion_time_seconds_sum[1h]) / rate(vendhub_task_completion_time_seconds_count[1h])
```
