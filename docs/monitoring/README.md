# Monitoring Module

## Overview

The Monitoring module provides Prometheus-compatible metrics collection for VendHub Manager. It tracks request performance, business metrics, security events, and system health for observability and alerting.

## Key Features

- Prometheus metrics collection
- HTTP request duration and error tracking
- Business metrics (tasks, inventory, machines)
- Security metrics (login attempts, 2FA)
- Performance metrics (database, cache, queues)
- Performance interceptor for automatic request tracking

## Architecture

### Metrics Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     METRICS COLLECTION FLOW                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Application                                                     │
│      │                                                           │
│      ├── PerformanceInterceptor ──> Request metrics             │
│      │                                                           │
│      ├── Services ──> Business metrics                          │
│      │                                                           │
│      └── Guards ──> Security metrics                            │
│                                                                  │
│             │                                                    │
│             ▼                                                    │
│      MetricsService                                              │
│             │                                                    │
│             ▼                                                    │
│      prom-client (Prometheus client library)                    │
│             │                                                    │
│             ▼                                                    │
│      /metrics endpoint                                          │
│             │                                                    │
│             ▼                                                    │
│      Prometheus Server ──> Grafana Dashboards                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Metrics Categories

### Request Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `vendhub_http_request_duration_seconds` | Histogram | Duration of HTTP requests |
| `vendhub_http_requests_total` | Counter | Total HTTP requests |
| `vendhub_http_request_errors_total` | Counter | Total HTTP errors |

### Business Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `vendhub_tasks_created_total` | Counter | Total tasks created |
| `vendhub_tasks_completed_total` | Counter | Total tasks completed |
| `vendhub_task_duration_seconds` | Histogram | Task completion duration |
| `vendhub_inventory_movements_total` | Counter | Inventory movements |
| `vendhub_machines_active` | Gauge | Active machines count |
| `vendhub_machines_offline` | Gauge | Offline machines count |

### Security Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `vendhub_login_attempts_total` | Counter | Login attempts |
| `vendhub_login_failures_total` | Counter | Failed logins |
| `vendhub_2fa_authentications_total` | Counter | 2FA attempts |
| `vendhub_sessions_created_total` | Counter | Sessions created |
| `vendhub_audit_log_events_total` | Counter | Audit log entries |

### Performance Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `vendhub_database_query_duration_seconds` | Histogram | DB query duration |
| `vendhub_cache_hits_total` | Counter | Cache hits |
| `vendhub_cache_misses_total` | Counter | Cache misses |
| `vendhub_queue_jobs_processed_total` | Counter | Queue jobs processed |
| `vendhub_queue_jobs_failed_total` | Counter | Failed queue jobs |

## Service

**File**: `backend/src/modules/monitoring/services/metrics.service.ts`

```typescript
@Injectable()
export class MetricsService {
  // Request metrics
  private readonly httpRequestDuration: Histogram<string>;
  private readonly httpRequestTotal: Counter<string>;
  private readonly httpRequestErrors: Counter<string>;

  // Business metrics
  private readonly tasksTotal: Counter<string>;
  private readonly tasksCompleted: Counter<string>;
  private readonly tasksDuration: Histogram<string>;
  private readonly inventoryMovements: Counter<string>;
  private readonly machinesActive: Gauge<string>;
  private readonly machinesOffline: Gauge<string>;

  // Security metrics
  private readonly loginAttempts: Counter<string>;
  private readonly loginFailures: Counter<string>;
  private readonly twoFactorAuthentications: Counter<string>;

  // Performance metrics
  private readonly databaseQueryDuration: Histogram<string>;
  private readonly cacheHits: Counter<string>;
  private readonly cacheMisses: Counter<string>;
  private readonly queueJobsProcessed: Counter<string>;
  private readonly queueJobsFailed: Counter<string>;
}
```

## Metric Types

### Counter

Monotonically increasing value. Use for totals.

```typescript
private readonly httpRequestTotal = new Counter({
  name: 'vendhub_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
});

// Usage
this.httpRequestTotal.inc({ method: 'GET', route: '/api/machines', status: '200' });
```

### Histogram

Distribution of values. Use for durations.

```typescript
private readonly httpRequestDuration = new Histogram({
  name: 'vendhub_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5],  // 100ms, 500ms, 1s, 2s, 5s
});

// Usage
this.httpRequestDuration.observe(
  { method: 'GET', route: '/api/machines', status: '200' },
  0.254  // 254ms
);
```

### Gauge

Value that can go up and down. Use for current state.

```typescript
private readonly machinesActive = new Gauge({
  name: 'vendhub_machines_active',
  help: 'Number of active machines',
  labelNames: ['status'],
});

// Usage
this.machinesActive.set({ status: 'active' }, 42);
```

## Performance Interceptor

**File**: `backend/src/modules/monitoring/interceptors/performance.interceptor.ts`

Automatically tracks all HTTP request durations:

```typescript
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, route } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = (Date.now() - startTime) / 1000;
        const status = context.switchToHttp().getResponse().statusCode;
        this.metricsService.recordHttpRequest(method, route.path, status, duration);
      }),
    );
  }
}
```

## Service Methods

### Request Metrics

```typescript
recordHttpRequest(method: string, route: string, status: number, duration: number): void;
```

### Business Metrics

```typescript
recordTaskCreated(type: string, priority: string): void;
recordTaskCompleted(type: string, status: string, duration?: number): void;
recordInventoryMovement(type: string, direction: string): void;
updateMachineStatus(active: number, offline: number, offlineReasons: Record<string, number>): void;
```

### Security Metrics

```typescript
recordLoginAttempt(result: 'success' | 'failure'): void;
recordLoginFailure(reason: string): void;
record2FAAuthentication(method: string, result: 'success' | 'failure'): void;
recordSessionCreation(type: string): void;
recordAuditLogEvent(action: string, entityType: string): void;
```

### Performance Metrics

```typescript
recordDatabaseQuery(operation: string, table: string, duration: number): void;
recordCacheHit(cacheType: string): void;
recordCacheMiss(cacheType: string): void;
recordQueueJob(queue: string, jobType: string, status: 'completed' | 'failed', reason?: string): void;
```

## Usage Examples

### In AuthService

```typescript
@Injectable()
export class AuthService {
  constructor(private readonly metricsService: MetricsService) {}

  async login(credentials: LoginDto): Promise<TokenResponse> {
    try {
      const user = await this.validateUser(credentials);
      this.metricsService.recordLoginAttempt('success');
      this.metricsService.recordSessionCreation('jwt');
      return this.generateTokens(user);
    } catch (error) {
      this.metricsService.recordLoginAttempt('failure');
      this.metricsService.recordLoginFailure(error.message);
      throw error;
    }
  }
}
```

### In TasksService

```typescript
@Injectable()
export class TasksService {
  constructor(private readonly metricsService: MetricsService) {}

  async create(dto: CreateTaskDto): Promise<Task> {
    const task = await this.taskRepository.save(dto);
    this.metricsService.recordTaskCreated(task.type, task.priority);
    return task;
  }

  async complete(taskId: string): Promise<Task> {
    const task = await this.findOne(taskId);
    const duration = (Date.now() - task.started_at.getTime()) / 1000;

    task.status = TaskStatus.COMPLETED;
    await this.taskRepository.save(task);

    this.metricsService.recordTaskCompleted(task.type, 'completed', duration);
    return task;
  }
}
```

### In CacheService

```typescript
async get<T>(key: string): Promise<T | null> {
  const value = await this.redis.get(key);

  if (value) {
    this.metricsService.recordCacheHit('redis');
    return JSON.parse(value);
  } else {
    this.metricsService.recordCacheMiss('redis');
    return null;
  }
}
```

## Metrics Endpoint

### Controller

**File**: `backend/src/modules/monitoring/controllers/metrics.controller.ts`

```typescript
@Controller('metrics')
export class MetricsController {
  @Get()
  async getMetrics(): Promise<string> {
    return register.metrics();
  }
}
```

### Sample Output

```prometheus
# HELP vendhub_http_requests_total Total number of HTTP requests
# TYPE vendhub_http_requests_total counter
vendhub_http_requests_total{method="GET",route="/api/machines",status="200"} 1523
vendhub_http_requests_total{method="POST",route="/api/tasks",status="201"} 452

# HELP vendhub_http_request_duration_seconds Duration of HTTP requests in seconds
# TYPE vendhub_http_request_duration_seconds histogram
vendhub_http_request_duration_seconds_bucket{method="GET",route="/api/machines",status="200",le="0.1"} 1200
vendhub_http_request_duration_seconds_bucket{method="GET",route="/api/machines",status="200",le="0.5"} 1450
vendhub_http_request_duration_seconds_bucket{method="GET",route="/api/machines",status="200",le="1"} 1510
vendhub_http_request_duration_seconds_bucket{method="GET",route="/api/machines",status="200",le="+Inf"} 1523

# HELP vendhub_machines_active Number of active machines
# TYPE vendhub_machines_active gauge
vendhub_machines_active{status="active"} 42

# HELP vendhub_login_failures_total Total number of failed login attempts
# TYPE vendhub_login_failures_total counter
vendhub_login_failures_total{reason="invalid_password"} 15
vendhub_login_failures_total{reason="user_not_found"} 8
```

## Prometheus Configuration

### prometheus.yml

```yaml
scrape_configs:
  - job_name: 'vendhub'
    scrape_interval: 15s
    static_configs:
      - targets: ['backend:3000']
    metrics_path: '/metrics'
```

## Grafana Dashboards

### Request Performance Dashboard

```
┌────────────────────────────────────────────────────────────────┐
│  Request Rate                 │  Error Rate                    │
│  ┌─────────────────────────┐  │  ┌─────────────────────────┐  │
│  │    _____   _____        │  │  │          _____          │  │
│  │   /     \_/     \       │  │  │    _____/     \         │  │
│  │  /                \_    │  │  │   /             \_      │  │
│  │_/                        │  │  │__/                      │  │
│  └─────────────────────────┘  │  └─────────────────────────┘  │
├────────────────────────────────────────────────────────────────┤
│  P95 Latency (seconds)                                         │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  /api/machines: 0.254                                    │  │
│  │  /api/tasks: 0.189                                       │  │
│  │  /api/inventory: 0.312                                   │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### Business Metrics Dashboard

```
┌────────────────────────────────────────────────────────────────┐
│  Active Machines     │  Tasks Today    │  Inventory Movements  │
│       42             │      127        │         892           │
├────────────────────────────────────────────────────────────────┤
│  Task Completion Rate                                          │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  ████████████████████████████████████████░░░░░░░ 85%    │  │
│  └─────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

## Alerting Rules

### Example Prometheus Alert Rules

```yaml
groups:
  - name: vendhub
    rules:
      - alert: HighErrorRate
        expr: rate(vendhub_http_request_errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: High error rate detected

      - alert: SlowRequests
        expr: histogram_quantile(0.95, rate(vendhub_http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: P95 latency > 2 seconds

      - alert: LoginFailureSpike
        expr: rate(vendhub_login_failures_total[5m]) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: High rate of login failures
```

## Best Practices

1. **Use Labels Wisely**: Too many labels create cardinality explosion
2. **Meaningful Names**: Follow naming conventions (`vendhub_<component>_<metric>_<unit>`)
3. **Collect Strategically**: Don't collect everything, focus on useful metrics
4. **Set Appropriate Buckets**: Histogram buckets should match expected values
5. **Document Metrics**: Each metric should have a clear help string

## Related Modules

- [Health](../health/README.md) - Health checks
- [Alerts](../alerts/README.md) - System alerts
- [Audit Logs](../audit-logs/README.md) - Event tracking
- [Analytics](../analytics/README.md) - Business analytics
